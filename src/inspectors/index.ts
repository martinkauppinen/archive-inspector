import * as vscode from 'vscode';

export interface ArchiveInspector {
    stat(archive: vscode.Uri, uri: vscode.Uri): vscode.FileStat | Promise<vscode.FileStat>;
    readDirectory(archive: vscode.Uri, uri: vscode.Uri): [string, vscode.FileType][] | Promise<[string, vscode.FileType][]>;
    readFile(archive: vscode.Uri, uri: vscode.Uri): Uint8Array | Promise<Uint8Array>;
}

export * from './tar';
export * from './zip';