import { exec, execSync } from 'child_process';
import * as vscode from 'vscode';
import * as util from 'util';
import * as log from '../log';
import * as constants from '../constants';
import { AbstractInspector } from './abstract';

const execPromise = util.promisify(exec);

export class TarInspector extends AbstractInspector {
    protected populateStatCache(archive: vscode.Uri, ctime: number, uri: vscode.Uri) {
        log.debug(`Populating stat cache: ${archive.path}`);
        const result = execSync(`${tar()} --list --verbose --auto-compress --file=${archive.fsPath} ${uri.path.slice(1)}`, { encoding: 'utf-8' });

        const lines = result
            .split(/\n/)
            .filter((line) => line.length > 0)
            .filter((line) => line.startsWith('-') || line.startsWith('d'));

        for (const line of lines) {
            const type = line.startsWith('-') ? vscode.FileType.File : vscode.FileType.Directory;
            const fields = line.split(/\s+/);
            const filePath = '/' + fields[5].replace(/\/$/, ''); // strip trailing slash if exists
            const mtimeString = `${fields[3]}T${fields[4]}`;
            const mtime = new Date(mtimeString).getTime();
            const size = parseInt(fields[2]);
            const stat = { type, ctime, mtime, size };
            this.statCache.set(filePath, stat);
        }

        log.debug(`Finished populating stat cache: ${archive.path}`);
    }

    protected getArchiveListing(archive: vscode.Uri): string[] | Promise<string[]> {
        const result = execSync(`${tar()} --list --auto-compress --file=${archive.fsPath}`, { encoding: 'utf-8' });
        return result.split('\n').filter((line) => line.length > 0);
    }

    public async readFile(archive: vscode.Uri, uri: vscode.Uri): Promise<Uint8Array> {
        const result = await execPromise(`${tar()} --extract --to-stdout --auto-compress --file=${archive.fsPath} ${uri.path.slice(1)}`, { maxBuffer: maxBuffer() });
        return Buffer.from(result.stdout);
    }
}

function tar(): string {
    return vscode.workspace.getConfiguration(constants.extensionName).get<string>('pathToTar') ?? 'tar';
}

function maxBuffer(): number {
    return vscode.workspace.getConfiguration(constants.extensionName).get<number>('maxStdoutBufferSize') ?? constants.defaultStdoutBufferSize;
}
