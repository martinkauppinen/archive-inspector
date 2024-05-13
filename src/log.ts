import * as vscode from 'vscode';

let logger: vscode.LogOutputChannel | undefined;

export function init(context: vscode.ExtensionContext) {
    logger = vscode.window.createOutputChannel('Archive Inspector', {
        log: true
    });
    context.subscriptions.push(logger);
}

export function trace(message?: any, ...optionalParams: any[]) {
    logger?.trace(message, ...optionalParams);
}

export function debug(message?: any, ...optionalParams: any[]) {
    logger?.debug(message, ...optionalParams);
}

export function info(message?: any, ...optionalParams: any[]) {
    logger?.info(message, ...optionalParams);
}

export function warn(message?: any, ...optionalParams: any[]) {
    logger?.warn(message, ...optionalParams);
}

export function error(message?: any, ...optionalParams: any[]) {
    logger?.error(message, ...optionalParams);
}
