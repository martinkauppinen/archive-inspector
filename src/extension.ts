import * as log from './log';
import * as vscode from 'vscode';
import { TarFsProvider } from './fs-providers';

export function activate(context: vscode.ExtensionContext) {
    log.init(context);
    TarFsProvider.register(context);
}

export function deactivate() {}
