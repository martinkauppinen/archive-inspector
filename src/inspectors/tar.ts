import { exec, execSync } from 'child_process';
import * as vscode from 'vscode';
import * as util from 'util';
import * as log from '../log';
import * as fs from 'fs';
import * as constants from '../constants';
import { ArchiveInspector } from '.';

const execPromise = util.promisify(exec);

export class TarInspector implements ArchiveInspector {
    private currentArchive?: vscode.Uri;
    private statCache = new Map<string, vscode.FileStat>();
    private directoryCache = new Map<string, [string, vscode.FileType][]>();

    public stat(archive: vscode.Uri, uri: vscode.Uri): vscode.FileStat {
        if (this.currentArchive !== undefined && this.currentArchive.path === archive.path && this.statCache.size > 0) {
            log.trace('Using cached stat: ' + archive.path);
            const stat = this.statCache.get(uri.path);
            if (stat === undefined) {
                throw vscode.FileSystemError.FileNotFound(uri);
            }
            return stat;
        }

        this.currentArchive = archive;
        this.refreshCaches(archive, uri);

        const stat = this.statCache.get(uri.path);
        if (stat === undefined) {
            throw vscode.FileSystemError.FileNotFound(uri);
        }
        return stat;
    }

    private refreshCaches(archive: vscode.Uri, uri: vscode.Uri) {
        this.statCache.clear();
        this.directoryCache.clear();

        // tar does not save ctime of files, only mtime. Use ctime of archive as ctime of files.
        const ctime = fs.statSync(archive.fsPath).ctime.getTime();

        this.populateStatCache(archive, ctime, uri);
        this.populateDirectoryCache(archive);
        this.populateStatCacheFromDirectoryCache();
    }

    private populateStatCache(archive: vscode.Uri, ctime: number, uri: vscode.Uri) {
        log.debug(`Populating stat cache: ${archive.path}`);
        const result = execSync(`${tar()} --list --verbose --auto-compress --file=${archive.fsPath} ${uri.path.slice(1)}`, { encoding: 'utf-8' });

        const lines = result
            .split(/\n/)
            .filter(line => line.length > 0)
            .filter(line => line.startsWith('-') || line.startsWith('d'));

        for (const line of lines) {
            const type = line.startsWith('-') ? vscode.FileType.File : vscode.FileType.Directory;
            const fields = line.split(/\s+/);
            const fileUri = vscode.Uri.file('/' + fields[5].replace(/\/$/, '')); // strip trailing slash if exists
            const mtimeString = `${fields[3]}T${fields[4]}`;
            const mtime = new Date(mtimeString).getTime();
            const size = parseInt(fields[2]);
            const stat = { type, ctime, mtime, size };
            this.statCache.set(fileUri.path, stat);
        }

        if (uri.path === '/') {
            this.statCache.set(uri.path, { type: vscode.FileType.Directory, ctime, mtime: ctime, size: 0 });
        }

        log.debug(`Finished populating stat cache: ${archive.path}`);
    }

    public readDirectory(archive: vscode.Uri, uri: vscode.Uri): [string, vscode.FileType][] {

        if (this.currentArchive !== undefined && this.currentArchive.path === archive.path && this.directoryCache.size > 0) {
            log.trace('Using cached directories: ' + archive.path);
            const directory = this.directoryCache.get(uri.path);
            if (directory === undefined) {
                throw vscode.FileSystemError.FileNotFound(uri);
            }
            return directory;
        }

        this.currentArchive = archive;
        this.refreshCaches(archive, uri);

        const contents = this.directoryCache.get(uri.path.endsWith('/') ? uri.path : uri.path + '/');
        if (contents === undefined) {
            throw vscode.FileSystemError.FileNotFound(uri);
        }
        return contents;
    }

    private populateDirectoryCache(archive: vscode.Uri) {
        log.debug(`Populating directory cache: ${archive.path}`);
        const result = execSync(`${tar()} --list --auto-compress --file=${archive.fsPath}`, { encoding: 'utf-8' });

        const lines = result
            .split(/\n/)
            .filter(line => line.length > 0);
        const directories = new Set(lines.flatMap(line => {
            const components = line.split('/');
            const isFile = (components.length === 1 || components[components.length - 1] !== '');
            return components
                .slice(0, components.length - (isFile ? 1 : 0))
                .filter(part => part.length > 0)
                .map((value, index, array) => {
                    if (index === 0) {
                        return value;
                    }

                    return array.slice(0, index).join('/') + '/' + value;
                });
        }));
        const files = lines.filter(line => !line.endsWith('/'));
        const topLevelFiles = files.filter(line => line.split('/').length === 1);

        directories.forEach(directory => {
            if (directory.indexOf('/') === -1) {
                const rootCache = this.directoryCache.get('/') ?? [];
                rootCache.push([directory, vscode.FileType.Directory]);
                this.directoryCache.set('/', rootCache);
            }

            const contents: [string, vscode.FileType][] = [...directories].concat([...files])
                .filter(line => line.startsWith(directory + '/') && line !== directory)
                .filter(line => {
                    const subPath = line.slice(directory.length + 1);
                    const subComponents = subPath.split('/');

                    if (subComponents.length === 1) {
                        // this is a file immediately contained in the directory
                        return true;
                    }

                    if (subComponents.length === 2 && subComponents[1] === '') {
                        // this is a directory immediately contained in the directory
                        return true;
                    }

                    return false;
                })
                .map(line => {
                    if (directories.has(line.replace(/\/$/, ''))) {
                        return [line.slice(directory.length + 1).replace('/', ''), vscode.FileType.Directory];
                    } else {
                        return [line, vscode.FileType.File];
                    }
                });
            this.directoryCache.set('/' + directory, contents);
        });

        topLevelFiles.forEach(file => {
            const rootCache = this.directoryCache.get('/') ?? [];
            rootCache.push([file, vscode.FileType.File]);
            this.directoryCache.set('/', rootCache);
        });

        log.debug(`Finished populating directory cache: ${archive.path}`);
    }

    private populateStatCacheFromDirectoryCache() {
        for (const key of this.directoryCache.keys()) {
            if (this.statCache.get(key) === undefined) {
                // Dummy stats
                this.statCache.set(key, { type: vscode.FileType.Directory, ctime: 0, mtime: 0, size: 0 });
            }
        };
    }

    public async readFile(archive: vscode.Uri, uri: vscode.Uri): Promise<Uint8Array> {
        const result = await execPromise(`${tar()} --extract --to-stdout --auto-compress --file=${archive.fsPath} ${uri.path.slice(1)}`, { maxBuffer: maxBuffer() });
        return Buffer.from(result.stdout);
    }
}

function tar(): string {
    return vscode.workspace.getConfiguration(constants.extensionName).get<string>('pathToTar') ?? "tar";
}

function maxBuffer(): number {
    return vscode.workspace.getConfiguration(constants.extensionName).get<number>('maxStdoutBufferSize') ?? constants.defaultStdoutBufferSize;
}
