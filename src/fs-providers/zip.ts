import { ZipInspector } from '../inspectors';
import { AbstractFsProvider } from '.';
import * as vscode from 'vscode';
import * as unzipper from 'unzipper';
import * as fs from 'fs';
import { makeTempDir } from '../util';
import * as log from '../log';
import * as path from 'path';

export class ZipFsProvider extends AbstractFsProvider<ZipInspector> {
    protected inspector: ZipInspector = new ZipInspector();
    protected static readonly constructorWrapper = () => new ZipFsProvider();
    public static readonly scheme = this.buildScheme('zipfs');
    public static readonly mountCommand = this.buildMountCommand('zip');

    protected extractNested(archive: vscode.Uri, nested: vscode.Uri): Promise<vscode.Uri> {
        const outputUri = vscode.Uri.joinPath(vscode.Uri.file(makeTempDir()), nested.path);
        const outputDirectory = path.parse(outputUri.fsPath).dir;

        // Ensure the path exists
        fs.mkdirSync(outputDirectory, { recursive: true });

        return new Promise((resolve, reject) => {
            fs.createReadStream(archive.path)
                .pipe(unzipper.ParseOne(new RegExp(nested.path.slice(1))))
                .on('error', (e) => {
                    log.error('ParseOne: ' + e);
                    reject(e);
                })
                .pipe(fs.createWriteStream(outputUri.fsPath))
                .on('error', (e) => {
                    log.error('WriteStream: ' + e);
                    reject(e);
                })
                .on('finish', () => resolve(outputUri));
        });
    }
}
