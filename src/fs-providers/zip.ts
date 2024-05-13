import { ZipInspector } from '../inspectors';
import { AbstractFsProvider } from '.';

export class ZipFsProvider extends AbstractFsProvider<ZipInspector> {
    protected inspector: ZipInspector = new ZipInspector();
    protected static readonly constructorWrapper = () => new ZipFsProvider();
    public static readonly scheme = this.buildScheme('zipfs');
    public static readonly mountCommand = this.buildMountCommand('zip');
}
