import PdfjsContext from "ngx-pillow-pdf-viewer/pdfjsContext";
import { SelectedTextContext } from "ngx-pillow-pdf-viewer/pdfjsContextTypes";
import LoggingProvider from "ngx-pillow-pdf-viewer/utils/logging/loggingProvider";
import LayerManager from "./layerManager";
import { PageRenderedEventType } from "ngx-pillow-pdf-viewer/types/eventBus";

export type textContextElement = {
    parent: HTMLElement;
    left: string;
    top: string;
}

export default class TextAnnotator {
    private readonly _defaultLogSource = TextAnnotator.name;
    private readonly _annotatedTextAttribute = 'Text-annotated';
    private readonly _layerClassName = 'textAnnotateLayer';

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

    public async onPageRendered(event: PageRenderedEventType) {
        const layerId = this.getLayerId(event.pageNumber);
        let layer = this._layerManager.getLayerById(layerId);
        if (!layer) {
            layer = await this._layerManager.createLayer(layerId, event.pageNumber, this._layerClassName);
        }

        this._layerManager.applyLayer(layer);
    }
    
    public annotateSelection(selection: SelectedTextContext, id: string) {
        const selectionContextElements = Array.from(this.getTextContextElements(selection.startElement, selection.selectedText));
        this._loggingProvider.sendDebug('Selection elements:', this._defaultLogSource, selectionContextElements);

        const layerId = this.getLayerId(selection.page);
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
    }

    public colorById(id: string, color: string) {
        this._pdfjsContext.assertPdfViewerApplicationExists();
        const elements = Array.from(this._pdfjsContext.pdfjsDocument.querySelectorAll(`[${this._annotatedTextAttribute}]`));

        this._loggingProvider.sendDebug(`Coloring ${id} ${color} (elements: ${elements.length})`, this._defaultLogSource);
        if (elements.length === 0) {
            this._loggingProvider.sendWarning(`Could not color by id ${id}: no elements found.`, this._defaultLogSource);
            return;
        }

        for (const element of elements) {
            (element as HTMLElement).style.backgroundColor = color;
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