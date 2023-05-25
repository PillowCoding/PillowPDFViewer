import PdfjsContext from "../pdfjsContext";
import { SelectedTextContext } from "../pdfjsContextTypes";
import LoggingProvider from "../utils/logging/loggingProvider";
import LayerManager from "./layerManager";

export type textContextElement = {
    parent: HTMLElement;
    left: string;
    top: string;
}

export default class TextAnnotator {
    private readonly _defaultLogSource = TextAnnotator.name;
    private readonly _annotatedTextAttribute = 'Text-annotated';
    private readonly _layerClassName = 'textAnnotateLayer';
    private _annotatedIds: string[] = [];
    private _coloredIds: string[] = [];

    public get annotatedIds() {
        return this._annotatedIds;
    }

    public get coloredIds() {
        return this._coloredIds;
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

    public async renderLayer(page: number) {
        const layerId = this.getLayerId(page);
        let layer = this._layerManager.getLayerById(layerId);
        if (!layer) {
            layer = await this._layerManager.createLayer(layerId, page, this._layerClassName);
        }

        this._layerManager.applyLayer(layer);
    }

    public annotateXpath(xpath: string, selectedText: string, page: number, id: string) {
        this._pdfjsContext.assertfileLoaded();

        const relevantNode = this._pdfjsContext.pdfjsDocument.evaluate(xpath, this._pdfjsContext.pdfjsDocument, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        if (!relevantNode) {
            this._loggingProvider.sendWarning(`Annotation ${id} could not be annotated due to a missing start node.`, this._defaultLogSource);
            return;
        }
        
        this.annotate(relevantNode as HTMLDivElement, selectedText, page, id);
    }
    
    public annotateSelection(selection: SelectedTextContext, id: string) {
        this.annotate(selection.startElement, selection.selectedText, selection.page, id);
    }

    public annotate(startElement: HTMLElement, selectedText: string, page: number, id: string) {
        const selectionContextElements = Array.from(this.getTextContextElements(startElement, selectedText));
        this._loggingProvider.sendDebug('Selection elements:', this._defaultLogSource, selectionContextElements);

        const layerId = this.getLayerId(page);
        const layer = this._layerManager.getLayerById(layerId);
        if (!layer) {
            this._loggingProvider.sendWarning(`Annotation aborted: Layer ${layerId} was not found`, this._defaultLogSource);
            return;
        }
        
        // For each element, copy the element and move the copy to the layer.
        for (const element of selectionContextElements) {
            const elementCopy = element.parent.cloneNode(true) as HTMLElement;
            elementCopy.setAttribute(this._annotatedTextAttribute, id);
            layer.element.insertAdjacentElement('beforeend', elementCopy);
        }

        this._annotatedIds.push(id);
    }

    public colorById(color: string, ...ids: string[]) {
        this._pdfjsContext.assertPdfViewerApplicationExists();
        
        for (const id of ids) {
            const elements = Array.from(this._pdfjsContext.pdfjsDocument.querySelectorAll(`[${this._annotatedTextAttribute}="${id}"]`));
            this._loggingProvider.sendDebug(`Coloring ${id} ${color} (elements: ${elements.length})...`, this._defaultLogSource);

            if (elements.length === 0) {
                this._loggingProvider.sendWarning(`Could not color ${id}: no elements found.`, this._defaultLogSource);
                return;
            }

            for (const element of elements) {
                (element as HTMLElement).style.backgroundColor = color;
            }

            this._coloredIds.push(id);
        }
    }

    public removeAnnotationById(...ids: string[]) {
        this._pdfjsContext.assertPdfViewerApplicationExists();

        for (const id of ids) {
            const elements = Array.from(this._pdfjsContext.pdfjsDocument.querySelectorAll(`[${this._annotatedTextAttribute}="${id}"]`));
            this._loggingProvider.sendDebug(`Removing ${id} (elements: ${elements.length})...`, this._defaultLogSource);
            if (elements.length === 0) {
                this._loggingProvider.sendWarning(`Could not remove ${id}: no elements found.`, this._defaultLogSource);
                return;
            }

            for (const element of elements) {
                element.remove();
            }

            this._annotatedIds = this._annotatedIds.filter(x => x !== id);
            this._coloredIds = this._coloredIds.filter(x => x !== id);
        }
    }

    public removeColorById(...ids: string[]) {
        this._pdfjsContext.assertPdfViewerApplicationExists();

        for (const id of ids) {
            const elements = Array.from(this._pdfjsContext.pdfjsDocument.querySelectorAll(`[${this._annotatedTextAttribute}="${id}"]`));
            this._loggingProvider.sendDebug(`Removing color from ${id}...`, this._defaultLogSource);
            if (elements.length === 0) {
                this._loggingProvider.sendWarning(`Could not remove color from ${id}: no elements found.`, this._defaultLogSource);
                return;
            }

            for (const element of elements) {
                (element as HTMLElement).style.backgroundColor = 'transparent';
            }

            this._coloredIds = this._coloredIds.filter(x => x !== id);
        }
    }

    private getLayerId(page: number) {
        return `${this._annotatedTextAttribute}-${page}`;
    }

    private *getTextContextElements(startElement: HTMLElement, text: string): Iterable<textContextElement>
    {
        let currentElement: HTMLElement | null = startElement;
        let textLengthLeft = text.length;
        while (currentElement && textLengthLeft > 0) {
            const text = currentElement.textContent;
            if (!text) {
                currentElement = currentElement.nextElementSibling as HTMLElement | null;
                continue;
            }

            textLengthLeft -= text.length;
            yield {
                parent: currentElement as HTMLElement,
                left: currentElement.style.left,
                top: currentElement.style.top
            };
            currentElement = currentElement.nextElementSibling as HTMLElement | null;
        }
    }

    private injectLayerStyle() {
        const layerStyle = `
            .${this._layerClassName} {
            }

            .${this._layerClassName} span {
                color: transparent;
                position: absolute;
                white-space: pre;
                cursor: text;
                transform-origin: 0% 0%;
            }
        `;

        this._pdfjsContext.injectStyle(layerStyle);
    }
}