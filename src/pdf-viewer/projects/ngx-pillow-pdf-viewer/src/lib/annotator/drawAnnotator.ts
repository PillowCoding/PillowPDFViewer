import PdfjsContext from "ngx-pillow-pdf-viewer/pdfjsContext";
import LoggingProvider from "ngx-pillow-pdf-viewer/utils/logging/loggingProvider";
import LayerManager, { layer } from "./layerManager";

export default class DrawAnnotator {
    private readonly _defaultLogSource = DrawAnnotator.name;
    private readonly _pendingLayerClassName = 'drawAnnotateLayerPending';
    private readonly _actualLayerClassName = 'drawAnnotateLayerActual';
    private readonly _drawCanvasClassName = 'drawCanvas';
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

            this.injectLayerStyle();
        }

    public async renderLayers(page: number, mouseListener: (e: MouseEvent, mouseDown: boolean) => void) {
        const layerIds = this.getLayerIds(page);
        for (const layerIdKey of Object.keys(layerIds) as Array<keyof typeof layerIds>) {
            const layerId = layerIds[layerIdKey];
            let layer = this._layerManager.getLayerById(layerId);
            if (!layer) {
                layer = await this._layerManager.createLayer(layerId, page);
                const canvas = this.insertCanvas(layer);
                canvas.addEventListener('mousedown', (e) => mouseListener(e, true));
                canvas.addEventListener('mouseup', (e) => mouseListener(e, false));
            }

            this._layerManager.applyLayer(layer);
        }
    }

    public enableDrawCanvas<T extends layer | string | number>(
        source: T,
        pending: T extends number ? boolean : never
    ) {
        const stringedSource = typeof source === 'object' ? source.id : source.toString();
        const canvas = this.getDrawCanvas(source, pending);
        if (!canvas) {
            this._loggingProvider.sendWarning(`The draw canvas could not be found. Using source ${stringedSource}.`, this._defaultLogSource);
            return;
        }

        this._loggingProvider.sendDebug(`Enabling draw canvas ${stringedSource}...`, this._defaultLogSource);
        canvas.style.pointerEvents = 'all';
    }

    public disableDrawCanvas<T extends layer | string | number>(
        source: T,
        pending: T extends number ? boolean : never
    ) {
        const stringedSource = typeof source === 'object' ? source.id : source.toString();
        const canvas = this.getDrawCanvas(source, pending);
        if (!canvas) {
            this._loggingProvider.sendWarning(`The draw canvas could not be found. Using source ${stringedSource}.`, this._defaultLogSource);
            return;
        }

        this._loggingProvider.sendDebug(`Disabling draw canvas ${stringedSource}...`, this._defaultLogSource);
        canvas.style.pointerEvents = 'none';
    }
    
    /**
     * 
     * @param source The source to retrieve the draw canvas from.
     * If layer, it gets the draw canvas from that layer.
     * If string, it gets the draw canvas from the layer with the given id.
     * If number, it gets the draw canvas from a layer on the given page. It will then receive the pending on actual layer depending on the `pending` parameter.
     * @param pending When fetching the draw canvas from a page, this argument determins if the code should fetch the pending canvas, or the actual canvas.
     * @returns The canvas element, or null if nothing could be found.
     */
    public getDrawCanvas<T extends layer | string | number>(
        source: T,
        pending: T extends number ? boolean : never
    ) {
        
        let layer: layer | undefined;
        switch (typeof source) {

            // Consider it the layer id.
            case 'string':
                layer = this._layerManager.getLayerById(source);
                break;

            // Consider it a page.
            case 'number':
                {
                    const ids = this.getLayerIds(source);
                    const id = pending ? ids.pending : ids.actual;
                    layer = this._layerManager.getLayerById(id);
                }
                break;

            // Default.
            default:
                layer = source;
        }

        return layer?.element.querySelector(`.${this._drawCanvasClassName}`) as HTMLCanvasElement | null;
    }

    private insertCanvas(layer: layer) {
        const canvasElement = document.createElement('canvas');
        layer.element.insertAdjacentElement('beforeend', canvasElement);

        canvasElement.classList.add(this._drawCanvasClassName);
        return canvasElement;
    }

    private getLayerIds(page: number) {
        return { pending: `${this._pendingLayerClassName}-${page}`, actual: `${this._actualLayerClassName}-${page}` };
    }

    private injectLayerStyle() {
        const layerStyle = `
            .${this._drawCanvasClassName} {
                width: 100%;
                height: 100%;
                cursor: crosshair;
            }
        `;

        this._pdfjsContext.injectStyle(layerStyle);
    }
}