import * as vscode from 'vscode';
import { ZipInspector } from '../inspectors';
import { AbstractFsProvider } from '.';

export class ZipFsProvider extends AbstractFsProvider<ZipInspector> {
    protected inspector: ZipInspector = new ZipInspector();
    public static readonly scheme = this.buildScheme('zipfs');
    public static readonly mountCommand = this.buildMountCommand('zip');

    public static register(context: vscode.ExtensionContext): void {
        context.subscriptions.push(vscode.workspace.registerFileSystemProvider(this.scheme, new ZipFsProvider(), {
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
