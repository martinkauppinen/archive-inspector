import * as vscode from 'vscode';
import { ArchiveInspector } from '../inspectors';
import * as log from '../log';
import * as constants from '../constants';

export abstract class AbstractFsProvider<T extends ArchiveInspector> implements vscode.FileSystemProvider {
    public static readonly scheme: string;
    public static readonly mountCommand: string;
    protected abstract readonly inspector: T;

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

    public watch(uri: vscode.Uri, options: { readonly recursive: boolean; readonly excludes: readonly string[]; }): vscode.Disposable {
        return { dispose: () => {} };
    }

    // Methods below only throw, because the file system is read-only, so they will never be called anyway.
    public createDirectory(uri: vscode.Uri): void | Thenable<void> {
        throw new Error('Method not implemented - createDirectory.');
    }
    public writeFile(uri: vscode.Uri, content: Uint8Array, options: { readonly create: boolean; readonly overwrite: boolean; }): void | Thenable<void> {
        throw new Error('Method not implemented - writeFile.');
    }
    public delete(uri: vscode.Uri, options: { readonly recursive: boolean; }): void | Thenable<void> {
        throw new Error('Method not implemented - delete.');
    }
    public rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { readonly overwrite: boolean; }): void | Thenable<void> {
        throw new Error('Method not implemented - rename.');
    }
    public copy?(source: vscode.Uri, destination: vscode.Uri, options: { readonly overwrite: boolean; }): void | Thenable<void> {
        throw new Error('Method not implemented - copy.');
    }

    protected static mountArchive(archive: vscode.Uri | undefined) {
        if (archive === undefined ) {
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

    protected static buildScheme(scheme: string): string {
        return `${constants.extensionName}-${scheme}`;
    }

    protected static buildMountCommand(filetype: string): string {
        return `${constants.extensionName}.mount.${filetype}`;
    }
}

export * from './tar';
export * from './zip';