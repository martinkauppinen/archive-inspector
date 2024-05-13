import * as log from './log';
import * as vscode from 'vscode';
import { TarFsProvider, WorkspaceFolderStore, ZipFsProvider } from './fs-providers';
import { cleanTempDir } from './util';

export function activate(context: vscode.ExtensionContext) {
    log.init(context);
    TarFsProvider.register(context);
    ZipFsProvider.register(context);
}

export function deactivate() {
    cleanTempDir();
    WorkspaceFolderStore.getInstance().clean();
}
