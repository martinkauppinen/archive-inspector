import * as vscode from 'vscode';
import { ArchiveInspector } from '../inspectors';
import * as log from '../log';
import * as constants from '../constants';

export abstract class AbstractFsProvider<T extends ArchiveInspector> implements vscode.FileSystemProvider {
    public static readonly scheme: string;
    public static readonly mountCommand: string;
    protected inspectorMap: Map<string, T> = new Map();

    /**
     * Should simply be set to return a new instance of the derived class.
     */
    protected static readonly constructorWrapper: () => AbstractFsProvider<any>; // Would prefer to use a good return type, but `any` will do for now.
    protected abstract newInspector(): T;

    protected abstract extractNested(archive: vscode.Uri, nested: vscode.Uri): vscode.Uri | Thenable<vscode.Uri>;

    protected _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    public onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

    public stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
        log.trace(`stat: ${uri.toString()}`);
        if (!this.inspectorMap.has(uri.query)) {
            this.inspectorMap.set(uri.query, this.newInspector());
        }
        return this.inspectorMap.get(uri.query)!.stat(vscode.Uri.file(uri.query), vscode.Uri.file(uri.path));
    }

    public readDirectory(uri: vscode.Uri): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
        log.trace(`readDirectory: ${uri.toString()}`);
        if (!this.inspectorMap.has(uri.query)) {
            this.inspectorMap.set(uri.query, this.newInspector());
        }
        return this.inspectorMap.get(uri.query)!.readDirectory(vscode.Uri.file(uri.query), vscode.Uri.file(uri.path));
    }

    public readFile(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array> {
        log.trace(`readFile: ${uri.toString()}`);
        if (!this.inspectorMap.has(uri.query)) {
            this.inspectorMap.set(uri.query, this.newInspector());
        }
        return this.inspectorMap.get(uri.query)!.readFile(vscode.Uri.file(uri.query), vscode.Uri.file(uri.path));
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

        // TODO: figure out if this can be achieved directly in the tree of the mounted archive,
        // making nested archives completely transparent. Will most likely have to sacrifice performance to achieve.
        if (archive.scheme.startsWith(constants.extensionName)) {
            vscode.commands.executeCommand<vscode.Uri | Thenable<vscode.Uri>>(this.extractionCommand(archive.scheme), vscode.Uri.file(archive.query), vscode.Uri.file(archive.fsPath))
                .then(async (extractedUri) => {
                    try {
                        const extractedUri2 = await extractedUri;
                        vscode.window.showInformationMessage(`Nested archive extracted to ${extractedUri2.fsPath}`);
                        this.mountArchive(extractedUri2);
                    } catch (e) {
                        vscode.window.showErrorMessage(`Failed to extract nested archive.`);
                        log.error(e);
                    }
                });
            return;
        }

        const uri = vscode.Uri.parse(`${this.scheme}:?${archive.fsPath}`);
        if (vscode.workspace.getWorkspaceFolder(uri) === undefined) {
            const name = vscode.workspace.asRelativePath(archive.fsPath, true);
            const index = vscode.workspace.workspaceFolders?.length ?? 0;
            const wpFolder: vscode.WorkspaceFolder = { uri, name, index };
            WorkspaceFolderUriStore.getInstance().insert(uri);
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

        context.subscriptions.push(vscode.commands.registerCommand(`${this.extractionCommand(this.scheme)}`, (archive: vscode.Uri, nested: vscode.Uri): vscode.Uri | Thenable<vscode.Uri> => {
            return this.constructorWrapper().extractNested(archive, nested);
        }));
    }

    protected static buildScheme(scheme: string): string {
        return `${constants.extensionName}-${scheme}`;
    }

    protected static buildMountCommand(filetype: string): string {
        return `${constants.extensionName}.mount.${filetype}`;
    }

    private static extractionCommand(scheme: string): string {
        return `${constants.extensionName}.extract.${scheme}`;
    }
}

export class WorkspaceFolderUriStore {
    private static instance: WorkspaceFolderUriStore;
    private workspaceFolderUris: vscode.Uri[] = [];

    private constructor() { }

    public static getInstance(): WorkspaceFolderUriStore {
        if (!WorkspaceFolderUriStore.instance) {
            WorkspaceFolderUriStore.instance = new WorkspaceFolderUriStore();
        }
        return WorkspaceFolderUriStore.instance;
    }

    public insert(folderUri: vscode.Uri): void {
        this.workspaceFolderUris.push(folderUri);
    }

    public clean(): void {
        this.workspaceFolderUris.forEach((folderUri) => {
            const wpFolder = vscode.workspace.getWorkspaceFolder(folderUri);
            if (wpFolder === undefined) {
                return;
            }
            vscode.workspace.updateWorkspaceFolders(wpFolder.index, 1);
        });
    }
}
