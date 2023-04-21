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

    constructor(
        private readonly _loggingProvider: LoggingProvider,
        private readonly _pdfjsContext: PdfjsContext,
        private readonly _layerManager: LayerManager)
        {
            if (this._pdfjsContext.fileState !== 'loaded') {
                throw new Error('Expected a file to be loaded.')
            }
        }

    public onPageRendered(event: PageRenderedEventType) {
        this._layerManager.getOrSetLayerByIdOnPage(`${this._annotatedTextAttribute}-${event.pageNumber}`, event.pageNumber);
    }
    
    public annotateSelection(selection: SelectedTextContext, id: string) {
        const selectionContextElements = Array.from(this.getTextContextElements(selection.startElement, selection.selectedText));
        this._loggingProvider.sendDebug('Selection elements:', this._defaultLogSource, selectionContextElements);

        // Ensure the selection does not contain elements that have an existing annotation
        // if (selectionContextElements.some(x => x.getAttribute(this._annotatedTextAttribute) !== null)) {
        //     this._loggingProvider.sendDebug('Selection contains existing selection', this._defaultLogSource);
        //     return;
        // }

        // for (const element of selectionContextElements) {
        //     element.setAttribute(this._annotatedTextAttribute, id);
        // }
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
}