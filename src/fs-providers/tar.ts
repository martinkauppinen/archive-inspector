import * as vscode from 'vscode';
import * as constants from '../constants';
import { TarInspector } from '../inspectors';
import { AbstractFsProvider } from '.';
import { execSync } from 'child_process';
import { makeTempDir, tar } from '../util';

export class TarFsProvider extends AbstractFsProvider<TarInspector> {
    protected static readonly constructorWrapper = () => new TarFsProvider();
    public static readonly scheme = this.buildScheme('tarfs');
    public static readonly mountCommand = this.buildMountCommand('tar');
    private hasGnuTar: boolean = false;

    protected newInspector(): TarInspector {
        return new TarInspector();
    }

    protected extractNested(archive: vscode.Uri, nested: vscode.Uri): vscode.Uri {
        const outputUri = vscode.Uri.file(makeTempDir());
        execSync(`${tar()} --extract --auto-compress --file=${archive.path} -C ${outputUri.fsPath} ${nested.path.slice(1)}`);
        return vscode.Uri.joinPath(outputUri, nested.path.slice(1));
    }

    public override stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
        this.assertGnuTar();

        if (!this.hasGnuTar) {
            return Promise.reject();
        }

        return super.stat(uri);
    }

    public override readDirectory(uri: vscode.Uri): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
        this.assertGnuTar();

        if (!this.hasGnuTar) {
            return Promise.reject();
        }

        return super.readDirectory(uri);
    }

    public override readFile(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array> {
        this.assertGnuTar();

        if (!this.hasGnuTar) {
            return Promise.reject();
        }

        return super.readFile(uri);
    }

    protected static override mountArchive(archive: vscode.Uri | undefined) {
        if (!checkGnuTar()) {
            return;
        }
        super.mountArchive(archive);
    }

    private assertGnuTar() {
        if (!this.hasGnuTar) {
            this.hasGnuTar = checkGnuTar();
        }
    }
}

function checkGnuTar(): boolean {
    const showWarningMessage = () => {
        vscode.window.showWarningMessage("GNU `tar` not found. Check `pathToTar` setting in the extension's settings.", 'Open settings', 'Dismiss')
            .then((selection) => {
                if (selection === 'Open settings') {
                    vscode.commands.executeCommand('workbench.action.openSettings', `${constants.extensionName}.pathToTar`);
                }
            });
    };

    try {
        const isGnuTar = execSync(`${tar()} --version`, { encoding: 'utf-8' }).includes('GNU tar');
        if (!isGnuTar) {
            showWarningMessage();
        }
        return isGnuTar;
    } catch (_) {
        showWarningMessage();
        return false;
    }
}
