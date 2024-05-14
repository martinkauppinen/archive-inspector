import * as os from 'os';
import * as path from 'path';
import * as constants from './constants';
import * as fs from 'fs';
import * as vscode from 'vscode';

export function makeTempDir(): string {
    const tmpDir = os.tmpdir();
    const userInfo = os.userInfo();
    const prefix = tmpDir + path.sep + constants.extensionName + path.sep + userInfo.username + path.sep;
    fs.mkdirSync(prefix, { recursive: true });
    return fs.mkdtempSync(prefix);
}

export function cleanTempDir() {
    const tmpDir = os.tmpdir();
    const userInfo = os.userInfo();
    const prefix = tmpDir + path.sep + constants.extensionName + path.sep + userInfo.username + path.sep;
    try {
        fs.rmSync(prefix, { recursive: true });
    } catch (e) {
        // No-op. It's fine if the directory doesn't exist.
    }
}

export function tar(): string {
    const tar = vscode.workspace.getConfiguration(constants.extensionName).get<string>('pathToTar') ?? 'tar';

    if (tar.length === 0) {
        return 'tar';
    }

    return tar;
}

