import * as log from './log';
import * as vscode from 'vscode';
import { WorkspaceFolderUriStore } from './fs-providers';
import { cleanTempDir } from './util';
import { TarFsProvider } from './fs-providers/tar';
import { ZipFsProvider } from './fs-providers/zip';

export function activate(context: vscode.ExtensionContext) {
    log.init(context);
    TarFsProvider.register(context);
    ZipFsProvider.register(context);
}

export function deactivate() {
    cleanTempDir();
    WorkspaceFolderUriStore.getInstance().clean();
}
