import * as vscode from 'vscode';
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
}
