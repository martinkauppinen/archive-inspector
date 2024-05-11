import * as log from './log';
import * as vscode from 'vscode';
import { TarFsProvider, ZipFsProvider } from './fs-providers';

export function activate(context: vscode.ExtensionContext) {
    log.init(context);
    TarFsProvider.register(context);
    ZipFsProvider.register(context);
}

export function deactivate() {}
