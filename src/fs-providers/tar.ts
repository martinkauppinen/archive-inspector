import { TarInspector } from '../inspectors';
import { AbstractFsProvider } from '.';

export class TarFsProvider extends AbstractFsProvider<TarInspector> {
    protected inspector: TarInspector = new TarInspector();
    protected static readonly constructorWrapper = () => new TarFsProvider();
    public static readonly scheme = this.buildScheme('tarfs');
    public static readonly mountCommand = this.buildMountCommand('tar');
}
