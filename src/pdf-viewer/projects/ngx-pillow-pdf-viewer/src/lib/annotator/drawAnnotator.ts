import PdfjsContext from "ngx-pillow-pdf-viewer/pdfjsContext";
import LoggingProvider from "ngx-pillow-pdf-viewer/utils/logging/loggingProvider";
import LayerManager from "./layerManager";


export default class DrawAnnotator {
    private readonly _defaultLogSource = DrawAnnotator.name;
    private readonly _pendingLayerClassName = 'drawAnnotateLayerPending';
    private readonly _actualLayerClassName = 'drawAnnotateLayerActual';
    private readonly _annotatedIds: string[] = [];

    public get annotatedIds() {
        return this._annotatedIds;
    }

    constructor(
        private readonly _loggingProvider: LoggingProvider,
        private readonly _pdfjsContext: PdfjsContext,
        private readonly _layerManager: LayerManager)
        {
            if (this._pdfjsContext.fileState !== 'loaded') {
                throw new Error('Expected a file to be loaded.')
            }
        }

    public async renderLayers(page: number) {
        const layerIds = this.getLayerIds(page);
        for (const layerIdKey of Object.keys(layerIds) as Array<keyof typeof layerIds>) {
            const layerId = layerIds[layerIdKey];
            let layer = this._layerManager.getLayerById(layerId);
            if (!layer) {
                layer = await this._layerManager.createLayer(layerId, page);
            }

            this._layerManager.applyLayer(layer);
        }
    }

    private getLayerIds(page: number) {
        return { pending: `${this._pendingLayerClassName}-${page}`, actual: `${this._actualLayerClassName}-${page}` };
    }
}