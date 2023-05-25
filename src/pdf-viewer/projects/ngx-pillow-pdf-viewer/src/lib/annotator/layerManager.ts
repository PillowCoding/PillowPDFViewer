import PdfjsContext from "../pdfjsContext";
import LoggingProvider from "../utils/logging/loggingProvider";

export type pageLayers = {
    page: number;
    layers: layer[];
};

export type layer = {
    id: string;
    page: number;
    width: number;
    height: number;
    element: HTMLDivElement;
}

export default class LayerManager {

    private readonly _defaultLogSource = LayerManager.name;
    private readonly _layers: pageLayers[] = [];
    private readonly _scaleFactorVariableName = 'scale-factor';
    private readonly _layerClassName = 'pageLayer';

    constructor(
        private readonly _loggingProvider: LoggingProvider,
        private readonly _pdfjsContext: PdfjsContext)
        {
            if (this._pdfjsContext.fileState !== 'loaded') {
                throw new Error('Expected a file to be loaded.')
            }

            this.injectLayerStyle();
        }

    public async createLayer(id: string, page: number, ...classes: string[]) {
        this._pdfjsContext.assertfileLoaded();

        this._loggingProvider.sendDebug(`Creating layer with id ${id} for page ${page}...`, this._defaultLogSource);

        const pageInfo = await this._pdfjsContext.pdfViewerApplication.pdfDocument.getPage(page);
        const width = pageInfo.view[2];
        const height = pageInfo.view[3];
        
        const element = document.createElement('div');
        element.id = id;
        element.style.pointerEvents = 'none';
        element.style.width = `calc(var(--${this._scaleFactorVariableName}) * ${width}px)`;
        element.style.height = `calc(var(--${this._scaleFactorVariableName}) * ${height}px)`;

        classes.push(this._layerClassName);
        element.classList.add(...classes);

        let layerPage = this._layers.find(x => x.page === page);
        if (!layerPage) {
            layerPage = {
                page,
                layers: [],
            };
            this._layers.push(layerPage);
        }

        const layer: layer = {
            id,
            page,
            width,
            height,
            element
        }

        layerPage.layers.push(layer);
        return layer;
    }

    public getLayerById(id: string) {
        /*
        return this._layers.flatMap(x => x.layers)
            .find(x => x.id === id);
        */
        return this._layers
            .map(x => x.layers)
            .reduce((actual, value) => actual.concat(value), [])
            .find(x => x.id === id);
    }

    public applyLayer(layer: layer) {
        this._pdfjsContext.assertfileLoaded();
        const page = this._pdfjsContext.pages.find(x => x.page === layer.page);
        if (!page) {
            throw new Error(`Page ${layer.page} was not found.`);
        }
        if (!page.loaded()) {
            this._loggingProvider.sendWarning(`Apply layer aborted. Page ${layer.page} is not loaded.`, this._defaultLogSource);
            return;
        }

        page.pageContainer.insertAdjacentElement('beforeend', layer.element);
    }

    private injectLayerStyle() {
        const layerStyle = `
            .${this._layerClassName} {
                position: absolute;
                text-align: initial;
                left: 0;
                top: 0;
                right: 0;
                bottom: 0;
                overflow: hidden;
                z-index: 5;
            }
        `;

        this._pdfjsContext.injectStyle(layerStyle);
    }
}