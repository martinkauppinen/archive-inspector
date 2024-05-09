import * as vscode from 'vscode';
import * as constants from '../constants';
import { TarInspector } from '../inspectors';
import { AbstractFsProvider } from '.';

export class TarFsProvider extends AbstractFsProvider<TarInspector> {
    protected inspector: TarInspector = new TarInspector();
    public static readonly scheme = this.buildScheme('tarfs');
    public static readonly mountCommand = this.buildMountCommand('tar');

    public static register(context: vscode.ExtensionContext): void {
        context.subscriptions.push(vscode.workspace.registerFileSystemProvider(this.scheme, new TarFsProvider(), {
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
                }).then(selection => this.mountArchive(selection?.at(0)));
            } else {
                this.mountArchive(uri);
            }
        }));
    }

    private static mountArchive(archive: vscode.Uri | undefined) {
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
}
