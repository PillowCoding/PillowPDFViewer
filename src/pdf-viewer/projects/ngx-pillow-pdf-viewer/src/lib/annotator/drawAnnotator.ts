import PdfjsContext from "ngx-pillow-pdf-viewer/pdfjsContext";
import LoggingProvider from "ngx-pillow-pdf-viewer/utils/logging/loggingProvider";
import LayerManager, { layer } from "./layerManager";
import { boundingBox } from "ngx-pillow-pdf-viewer/annotation/annotationTypes";

export type canvasMouseType = 'mouseup' | 'mousedown' | 'mousemove'

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

    public async renderLayers(page: number, mouseListener: (e: MouseEvent, type: canvasMouseType) => void) {
        const layerIds = this.getLayerIds(page);
        for (const layerIdKey of Object.keys(layerIds) as Array<keyof typeof layerIds>) {
            const layerId = layerIds[layerIdKey];
            let layer = this._layerManager.getLayerById(layerId);
            if (!layer) {
                layer = await this._layerManager.createLayer(layerId, page);
                const canvas = this.insertCanvas(layer);
                canvas.addEventListener('mousedown', (e) => mouseListener(e, 'mousedown'));
                canvas.addEventListener('mouseup', (e) => mouseListener(e, 'mouseup'));
                canvas.addEventListener('mousemove', (e) => mouseListener(e, 'mousemove'));
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

    public getRelativePosition<T extends layer | string | number | HTMLCanvasElement>(
        source: T,
        pending: T extends number ? boolean : never,
        event: MouseEvent,
    ) {
        let canvas: HTMLCanvasElement | null;
        if (source instanceof HTMLCanvasElement) {
            canvas = source;
        }
        else {
            canvas = this.getDrawCanvas(source, pending);
        }

        if (!canvas) {
            return null;
        }

        const rect = canvas.getBoundingClientRect();
        return {
            x: (event.clientX - rect.left) / rect.width,
            y: (event.clientY - rect.top)  / rect.height
        };
    }

    public drawCanvasRectangle<T extends layer | string | number | HTMLCanvasElement>(
        source: T,
        pending: T extends number ? boolean : never,
        clearCanvas: boolean,
        color: string,
        borderWidth: number,
        ...bounds: boundingBox[]
    ) {
        const stringedSource = typeof source === 'object' ? source.id :
            source instanceof HTMLCanvasElement ? '[canvas element]' :
            source.toString();

        let canvas: HTMLCanvasElement | null;
        if (source instanceof HTMLCanvasElement) {
            canvas = source;
        }
        else {
            canvas = this.getDrawCanvas(source, pending);
        }

        if (!canvas) {
            this._loggingProvider.sendWarning(`Unable to draw: the canvas was not found. Using source ${stringedSource}`, this._defaultLogSource);
            return;
        }

        const canvasContext = canvas.getContext('2d');
        if (!canvasContext) {
            this._loggingProvider.sendWarning(`Unable to draw: the canvas 2d context was not found. Using source ${stringedSource}`, this._defaultLogSource);
            return;
        }

        // Clear before drawing.
        if (clearCanvas) {
            //this.clearCanvas(source, pending);
            canvasContext.clearRect(0, 0, canvas.width, canvas.height);
        }

        for (const boundingBox of bounds) {
            // Determine the proper bounds of the rectangle.
            // The initial boundingBox is the normalised relative position based on the size of the page.
            // We get the actual coordinates and draw using these.
            const x = boundingBox.start.x * canvas.width;
            const y = boundingBox.start.y * canvas.height;
            const width = (boundingBox.end.x - boundingBox.start.x) * canvas.width;
            const height = (boundingBox.end.y - boundingBox.start.y) * canvas.height;
            const borderColor = color;
            const fillColor = color + this.getOpacityHex(.1);

            canvasContext.fillStyle = fillColor;
            canvasContext.strokeStyle = borderColor;
            canvasContext.lineWidth = borderWidth;
            canvasContext.fillRect(x, y, width, height);
            canvasContext.strokeRect(x, y, width, height);
        }
    }

    public clearCanvas<T extends layer | string | number | HTMLCanvasElement>(
        source: T,
        pending: T extends number ? boolean : never
    ) {
        const stringedSource = typeof source === 'object' ? source.id :
            source instanceof HTMLCanvasElement ? '[canvas element]' :
            source.toString();

        let canvas: HTMLCanvasElement | null;
        let canvasContext: CanvasRenderingContext2D | null;
        if (source instanceof HTMLCanvasElement) {
            canvas = source;
            canvasContext = source.getContext('2d');
        }
        else {
            canvas = this.getDrawCanvas(source, pending);
            canvasContext = canvas?.getContext('2d') || null;
        }

        if (!canvas || !canvasContext) {
            this._loggingProvider.sendWarning(`Unable to clear canvas: the canvas context was not found. Using source ${stringedSource}`, this._defaultLogSource);
            return;
        }

        canvasContext.clearRect(0, 0, canvas.width, canvas.height);
    }

    private getOpacityHex(opacity: number)
    {
        const clamp = (val: number, min: number, max: number) => {
            return Math.min(Math.max(val, min), max);
        }

        return Math.round(clamp(opacity, 0, 1) * 255)
            .toString(16).toUpperCase();
    }

    private insertCanvas(layer: layer) {
        const canvasElement = document.createElement('canvas');
        layer.element.insertAdjacentElement('beforeend', canvasElement);

        canvasElement.classList.add(this._drawCanvasClassName);
        canvasElement.height = layer.height;
        canvasElement.width = layer.width;

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