import * as vscode from 'vscode';
import * as log from '../log';
import * as unzipper from 'unzipper';
import { AbstractInspector } from './abstract';

export class ZipInspector extends AbstractInspector {
    protected async populateStatCache(archive: vscode.Uri, ctime: number, _uri: vscode.Uri) {
        log.debug(`Populating stat cache: ${archive.path}`);
        return unzipper.Open.file(archive.fsPath).then((zip) => {
            for (const file of zip.files) {
                const type = file.type === 'File' ? vscode.FileType.File : vscode.FileType.Directory;
                const filePath = '/' + file.path.replace(/\/$/, ''); // strip trailing slash if exists
                const mtime = file.lastModifiedTime;
                const size = file.uncompressedSize;
                const stat = { type, ctime, mtime, size };
                this.statCache.set(filePath, stat);
            }

            log.debug(`Finished populating stat cache: ${archive.path}`);
        });
    }

    protected getArchiveListing(archive: vscode.Uri): Promise<string[]> {
        return unzipper.Open.file(archive.fsPath).then((zip) => {
            return zip.files.map((file) => file.path);
        });
    }

    public async readFile(archive: vscode.Uri, uri: vscode.Uri): Promise<Uint8Array> {
        return unzipper.Open.file(archive.fsPath)
            .then((zip) => {
                const file = zip.files.find((file) => file.path === uri.path.slice(1));
                if (file === undefined) {
                    return Promise.reject();
                }

                // TODO: password-protected archives
                return file.buffer();
            });
    }
}
