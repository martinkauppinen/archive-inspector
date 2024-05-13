import * as vscode from 'vscode';
import * as log from '../log';
import * as fs from 'fs';
import { ArchiveInspector } from '.';

export abstract class AbstractInspector implements ArchiveInspector {
    protected currentArchive?: vscode.Uri;
    protected statCache = new Map<string, vscode.FileStat>();
    protected directoryCache = new Map<string, [string, vscode.FileType][]>();

    /**
     * This method's implementation shall open the archive, stat each file in the archive, and cache the results.
     *
     * @param archive The archive.
     * @param ctime The time of creation. Used because vscode.FileStat needs it. This will be the creation time of the archive.
     * @param uri The URI of the file VsCode has requested to stat.
     */
    protected abstract populateStatCache(archive: vscode.Uri, ctime: number, uri: vscode.Uri): void | Promise<void>;

    /**
     * This method should be implemented such that it returns the listing of files in the archive,
     * where directories have a trailing `/` and files don't.
     * @param archive The archive.
     */
    protected abstract getArchiveListing(archive: vscode.Uri): string[] | Promise<string[]>;

    /**
     * Reads a file from an archive.
     *
     * @param archive The archive.
     * @param uri The file in the archive that should be read.
     */
    abstract readFile(archive: vscode.Uri, uri: vscode.Uri): Uint8Array | Promise<Uint8Array>;

    public async stat(archive: vscode.Uri, uri: vscode.Uri): Promise<vscode.FileStat> {
        if (this.currentArchive !== undefined && this.currentArchive.path === archive.path && this.statCache.size > 0) {
            log.trace('Using cached stat: ' + archive.path);
            const stat = this.statCache.get(uri.path);
            if (stat === undefined) {
                throw vscode.FileSystemError.FileNotFound(uri);
            }
            return stat;
        }

        this.currentArchive = archive;
        await this.refreshCaches(archive, uri);

        const stat = this.statCache.get(uri.path);
        if (stat === undefined) {
            throw vscode.FileSystemError.FileNotFound(uri);
        }
        return stat;
    }

    private async refreshCaches(archive: vscode.Uri, uri: vscode.Uri) {
        this.statCache.clear();
        this.directoryCache.clear();

        // Use ctime of archive as ctime of files.
        const ctime = fs.statSync(archive.fsPath).ctime.getTime();

        // Root is always a directory
        this.statCache.set('/', { type: vscode.FileType.Directory, ctime, mtime: ctime, size: 0 });

        await this.populateStatCache(archive, ctime, uri);
        await this.populateDirectoryCache(archive);
        this.populateStatCacheFromDirectoryCache();
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

    private async populateDirectoryCache(archive: vscode.Uri) {
        log.debug(`Populating directory cache: ${archive.path}`);

        const listing = await this.getArchiveListing(archive);
        const directories = new Set(listing.flatMap((line) => {
            const components = line.split('/');
            const isFile = (components.length === 1 || components[components.length - 1] !== '');
            return components
                .slice(0, components.length - (isFile ? 1 : 0))
                .filter((part) => part.length > 0)
                .map((value, index, array) => {
                    if (index === 0) {
                        return value;
                    }

                    return array.slice(0, index).join('/') + '/' + value;
                });
        }));
        const files = listing.filter((line) => !line.endsWith('/'));
        const topLevelFiles = files.filter((line) => line.split('/').length === 1);

        directories.forEach((directory) => {
            if (directory.indexOf('/') === -1) {
                const rootCache = this.directoryCache.get('/') ?? [];
                rootCache.push([directory, vscode.FileType.Directory]);
                this.directoryCache.set('/', rootCache);
            }

            const contents: [string, vscode.FileType][] = [...directories].concat([...files])
                .filter((line) => line.startsWith(directory + '/') && line !== directory)
                .filter((line) => {
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
                .map((line) => {
                    if (directories.has(line.replace(/\/$/, ''))) {
                        return [line.slice(directory.length + 1).replace('/', ''), vscode.FileType.Directory];
                    } else {
                        return [line, vscode.FileType.File];
                    }
                });
            this.directoryCache.set('/' + directory, contents);
        });

        topLevelFiles.forEach((file) => {
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
}
