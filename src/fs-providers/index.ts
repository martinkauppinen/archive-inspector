import * as vscode from 'vscode';
import { ArchiveInspector } from '../inspectors';
import * as log from '../log';
import * as constants from '../constants';

export abstract class AbstractFsProvider<T extends ArchiveInspector> implements vscode.FileSystemProvider {
    public static readonly scheme: string;
    public static readonly mountCommand: string;
    protected abstract readonly inspector: T;

    /**
     * Should simply be set to return a new instance of the derived class.
     */
    protected static readonly constructorWrapper: () => any; // Would prefer to use a good return type, but `any` will do for now.

    protected _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    public onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

    public stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
        log.trace(`stat: ${uri.toString()}`);
        return this.inspector.stat(vscode.Uri.file(uri.query), vscode.Uri.file(uri.path));
    }

    public readDirectory(uri: vscode.Uri): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
        log.trace(`readDirectory: ${uri.toString()}`);
        return this.inspector.readDirectory(vscode.Uri.file(uri.query), vscode.Uri.file(uri.path));
    }

    public readFile(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array> {
        log.trace(`readFile: ${uri.toString()}`);
        return this.inspector.readFile(vscode.Uri.file(uri.query), vscode.Uri.file(uri.path));
    }

    public watch(_uri: vscode.Uri, _options: { readonly recursive: boolean; readonly excludes: readonly string[]; }): vscode.Disposable {
        return { dispose: () => { } };
    }

    // Methods below only throw, because the file system is read-only, so they will never be called anyway.
    public createDirectory(_uri: vscode.Uri): void | Thenable<void> {
        throw new Error('Method not implemented - createDirectory.');
    }
    public writeFile(_uri: vscode.Uri, _content: Uint8Array, _options: { readonly create: boolean; readonly overwrite: boolean; }): void | Thenable<void> {
        throw new Error('Method not implemented - writeFile.');
    }
    public delete(_uri: vscode.Uri, _options: { readonly recursive: boolean; }): void | Thenable<void> {
        throw new Error('Method not implemented - delete.');
    }
    public rename(_oldUri: vscode.Uri, _newUri: vscode.Uri, _options: { readonly overwrite: boolean; }): void | Thenable<void> {
        throw new Error('Method not implemented - rename.');
    }
    public copy?(_source: vscode.Uri, _destination: vscode.Uri, _options: { readonly overwrite: boolean; }): void | Thenable<void> {
        throw new Error('Method not implemented - copy.');
    }

    protected static mountArchive(archive: vscode.Uri | undefined) {
        if (archive === undefined) {
            return;
        }

        const uri = vscode.Uri.parse(`${this.scheme}:?${archive.fsPath}`);
        if (vscode.workspace.getWorkspaceFolder(uri) === undefined) {
            const name = vscode.workspace.asRelativePath(archive.fsPath, true);
            const index = vscode.workspace.workspaceFolders?.length ?? 0;
            const wpFolder: vscode.WorkspaceFolder = { uri, name, index };
            vscode.workspace.updateWorkspaceFolders(index, 0, wpFolder);
        }
    }

    public static register(context: vscode.ExtensionContext): void {
        context.subscriptions.push(vscode.workspace.registerFileSystemProvider(this.scheme, this.constructorWrapper(), {
            isReadonly: true,
            isCaseSensitive: true
        }));

        context.subscriptions.push(vscode.commands.registerCommand(this.mountCommand, (uri: vscode.Uri | undefined) => {
            if (uri === undefined) {
                vscode.window.showOpenDialog({
                    canSelectFiles: true,
                    canSelectFolders: false,
                    canSelectMany: false,
                    openLabel: 'Mount'
                }).then((selection) => this.mountArchive(selection?.at(0)));
            } else {
                this.mountArchive(uri);
            }
        }));
    }

    protected static buildScheme(scheme: string): string {
        return `${constants.extensionName}-${scheme}`;
    }

    protected static buildMountCommand(filetype: string): string {
        return `${constants.extensionName}.mount.${filetype}`;
    }
}

export * from './tar';
export * from './zip';
