import { Subject } from "rxjs";
import LoggingProvider from "./utils/logging/loggingProvider";
import { PdfjsWindow } from "./types/pdfjsWindow";
import { EventBusEventType, EventBusPayloadType } from "./types/eventBus";
import { PDFViewerApplication } from "./types/pdfViewerApplication";
import DeferredPromise from "./utils/deferredPromise";
import { PdfjsPageContext, SelectedTextContext } from "./pdfjsContextTypes";
import { getElementXpath } from "./utils/xpath";

export type toolType = 'openFile' | 'printing' | 'downloadPdf' | 'textEditor' | 'drawEditor' | 'textAnnotator' | 'drawAnnotator';
export const annotateTextId = 'annotate-text';
export const annotateDrawId = 'annotate-draw';

export default class PdfjsContext
{
    public readonly iframeLoaded = new Subject<void>();
    public readonly viewerLoaded = new Subject<void>();
    public readonly fileLoaded = new Subject<void>();
    public readonly documentMouseDown = new Subject<MouseEvent>();
    public readonly documentMouseUp = new Subject<MouseEvent>();

    private readonly _loadViewerPromise = new DeferredPromise<void>();
    private readonly _loadFilePromise = new DeferredPromise<void>();

    private readonly _defaultLogSource = PdfjsContext.name;
    private readonly _pageNumberAttribute = 'data-page-number';
    private readonly _pageLoadedAttribute = 'data-loaded';
    private readonly _viewerContainerId = 'viewer';

    private _viewerState: 'unloaded' | 'loading' | 'loaded' = 'unloaded';
    private _fileState: 'unloaded' | 'loading' | 'loaded' = 'unloaded';
    private _pages?: PdfjsPageContext[];

    // TODO: Replace hotkeys that fall under certain tool types.
    /** Represents the ids of the html elements representing the tool type. */
    private readonly toolTypeIdMap: { [key in toolType]: readonly string[]; } = {
        'openFile': [ 'openFile', 'secondaryOpenFile' ],
        'printing': [ 'print', 'secondaryPrint' ],
        'downloadPdf': [ 'download', 'secondaryDownload' ],
        'textEditor': [ 'editorFreeText' ],
        'drawEditor': [ 'editorInk' ],
        'textAnnotator': [ annotateTextId ],
        'drawAnnotator': [ annotateDrawId ],
    };

    /** Gets the iframe document. */
    public get pdfjsDocument() {
        return this._iframeElement.contentDocument || this.pdfjsWindow?.document;
    }

    /** Gets the iframe window. */
    public get pdfjsWindow() {
        return this._iframeElement.contentWindow as PdfjsWindow | null;
    }

    /** Gets the PDF viewer application. */
    public get pdfViewerApplication()
    {
        return this.pdfjsWindow?.PDFViewerApplication;
    }

    /** Gets the current state of the viewer. */
    public get viewerState()
    {
        return this._viewerState;
    }

    /** Gets the current state of the file. */
    public get fileState()
    {
        return this._fileState;
    }

    /** Represents the promise and resolver responsible for providing a promise until the viewer is loaded. */
    public get loadViewerPromise()
    {
        return this._loadViewerPromise as Promise<void>;
    }

    /** Represents the promise and resolver responsible for providing a promise until the file is loaded. */
    public get loadFilePromise()
    {
        return this._loadFilePromise as Promise<void>;
    }

    /** Gets the currently focused page */
    public get page()
    {
        this.assertfileLoaded();
        return this.pdfViewerApplication.pdfViewer.currentPageNumber;
    }

    public get pages()
    {
        return this._pages;
    }
    
    constructor(
        private readonly _loggingProvider: LoggingProvider,
        private readonly _viewerRelativePath: string,
        private readonly _iframeElement: HTMLIFrameElement,
    ) {
        this._iframeElement.onload = () => this.onIframeLoaded();
        this._iframeElement.src = this._viewerRelativePath + '?file=';
        this._viewerState = 'loading';
    }

    public async load(source: string | Blob | Uint8Array)
    {
        await this._loadViewerPromise;
        this._loggingProvider.sendDebug('Loading source...', this._defaultLogSource, source);
        this.assertViewerLoaded();
        this._fileState = 'loading';

        const args = { url: source };
        await this.pdfViewerApplication.open(args);
    }

    public subscribeEventBus<K extends EventBusEventType>(eventKey: K, dispatch: (payload: EventBusPayloadType<K>) => void) {
        this.assertViewerLoaded();
        this.pdfViewerApplication.eventBus.on(
            eventKey as string,
            dispatch as (e: object) => void);
    }

    public unsubscribeEventBus<K extends EventBusEventType>(eventKey: K, dispatch: (payload: EventBusPayloadType<K>) => void) {
        this.assertViewerLoaded();
        this.pdfViewerApplication.eventBus.off(
            eventKey as string,
            dispatch as (e: object) => void);
    }

    public dispatchEventBus<K extends EventBusEventType>(eventKey: K, payload: EventBusPayloadType<K>) {
        this.assertViewerLoaded();
        this.pdfViewerApplication.eventBus.dispatch(
            eventKey as string,
            payload as object);
    }

    public setToolDisabled(typeOrId: toolType | Omit<string, toolType>, disabled = true) {
        this._loggingProvider.sendDebug(`${disabled ? 'Disabling' : 'Enabling'} ${typeOrId.toString()}...`, this._defaultLogSource);
        this.assertViewerLoaded();

        // Determine the relevant ids to disable/enable.
        const toolIds = this.getToolButtonIds(typeOrId);

        for (const toolId of toolIds) {
            const element = this.pdfjsDocument.getElementById(toolId);
            if (!element) {
                this._loggingProvider.sendWarning(`Tool element ${toolId} could not be found.`, this._defaultLogSource);
                continue;
            }

            element.toggleAttribute('disabled', disabled);
            element.ariaDisabled = String(disabled);
        }
    }

    public getToolDisabled(typeOrId: toolType | Omit<string, toolType>) {
        // Determine the relevant ids to check.
        const toolIds = this.getToolButtonIds(typeOrId);

        return toolIds.every(toolId => {
            this.assertViewerLoaded();
            const element = this.pdfjsDocument.getElementById(toolId);
            if (!element) {
                this._loggingProvider.sendWarning(`Tool element ${toolId} could not be found. Assuming disabled.`, this._defaultLogSource);
                return true;
            }

            return element.ariaDisabled === String(true);
        });
    }

    public insertToolButton(id: string, where: InsertPosition, whereReference: toolType | Omit<string, toolType>, startDisabled = false) {
        this.assertViewerLoaded();
        
        const toolButton = document.createElement('button');
        toolButton.classList.add('toolbarButton');
        toolButton.id = id;

        // Determine the relevant ids to be used as a reference.
        const referenceToolButtons = this.getToolButtonIds(whereReference);

        // Get the first index of the array. This represents the button from the primary sidebar.
        const referenceToolButtonId = referenceToolButtons[0];
        const element = this.pdfjsDocument.getElementById(referenceToolButtonId);
        if (!element) {
            throw new Error(`Tool element ${referenceToolButtonId} could not be found.`);
        }

        element.insertAdjacentElement(where, toolButton);

        // Disable the button if the parameter is true.
        if (startDisabled) {
            this.setToolDisabled(id, true);
        }

        return toolButton;
    }

    public injectStyle(style: string) {
        this.assertViewerLoaded();

        // Inject the css in a style tag.
        const styleContainer = this.pdfjsDocument.createElement("style");
        styleContainer.textContent = style;
        this.pdfjsDocument.head.appendChild(styleContainer);
    }

    public getSelectedTextContext(): SelectedTextContext | null {
        this.assertfileLoaded();

        const selection = this.pdfjsDocument.getSelection();
        const selectedText = selection?.toString().replace(/[\n\r]/g, "").trim();
        if (!selection || !selectedText || selectedText === '') {
            return null;
        }

        // Ensure all data is set, and the node type is a text node.
        if (!selection.anchorNode || !selection.focusNode || selection.anchorNode.nodeType !== Node.TEXT_NODE  || selection.focusNode.nodeType !== Node.TEXT_NODE) {
            selection.removeAllRanges();
            return null;
        }

        let startNode = selection.anchorNode;
        let endNode = selection.focusNode;
        let selectedTextOffset = selection.anchorOffset;

        // We need to make sure what node comes earlier in the DOM tree. If we select backwards, we need to switch the nodes around.
        const anchorNodePosition = selection.anchorNode.compareDocumentPosition(selection.focusNode);
        if (anchorNodePosition & Node.DOCUMENT_POSITION_PRECEDING)
        {
            startNode = selection.focusNode;
            endNode = selection.anchorNode;
            selectedTextOffset = selection.focusOffset;
        }

        selection.removeAllRanges();

        const startElement = startNode.parentElement;
        const endElement = endNode.parentElement;

        if (!startElement || !endElement) {
            return null;
        }

        // Get the current page context and validate it can be found and both ends match the same page.
        const startPageContext = this.getPageContext(startElement);
        const endPageContext = this.getPageContext(endElement);
        if (!startPageContext || !endPageContext || startPageContext.page !== endPageContext.page) {
            return null;
        }

        const elementXpath = this.getElementXPathOnPage(startElement, 'viewer');
        if (!elementXpath) {
            return null;
        }

        return {
            ...startPageContext,
            selectedText,
            selectedTextOffset,
            startElement,
            endElement,
            xpath: elementXpath,
        }
    }

    public getPageContext(source: Element | number): PdfjsPageContext | null {
        this.assertfileLoaded();

        const pageElement = typeof source === 'number' ?
            this.pdfjsDocument.querySelector(`[${this._pageNumberAttribute}="${source}"]`) :
            source.hasAttribute(this._pageNumberAttribute) ?
                source :
                source.closest(`[${this._pageNumberAttribute}]`);

        if (!pageElement) {
            return null;
        }

        const page = pageElement.getAttribute(this._pageNumberAttribute);
        if (!page) {
            return null;
        }

        return {
            pageContainer: pageElement as HTMLDivElement,
            page: Number(page),
            loaded: () => pageElement.hasAttribute(this._pageLoadedAttribute),
        }
    }

    private gatherPages() {
        this.assertfileLoaded();

        const pages = this.pdfjsDocument.querySelectorAll(`#${this._viewerContainerId} [${this._pageNumberAttribute}]`);
        return Array.from(pages)
            .map(x => this.getPageContext(x))
            .filter(x => x !== null) as PdfjsPageContext[];
    }

    private getElementXPathOnPage(element: HTMLElement, expectId: string) {
        const elementXpath = getElementXpath(element, expectId);
        const xpathParts = elementXpath.split('/');

        // Regular PDF has 6 parts and PDF's with marked content have 7.
        if (!elementXpath.startsWith(`//*[@id="${expectId}"]`) || (xpathParts.length !== 6 && xpathParts.length !== 7)) {
            return null;
        }

        // Replace some parts of the xpath with more accurate steps.
        const page = xpathParts[3].split('[')[1].replace(']', '');
        xpathParts[3] = `div[contains(@data-page-number, "${page}")]`;
        xpathParts[4] = 'div[contains(@class, "textLayer")]';

        return xpathParts.join('/');
    }

    private getToolButtonIds(typeOrId: toolType | Omit<string, toolType>) {
        // Determine the relevant ids.
        // If typeOrId represents a valid build in toolType, get the ids from that map.
        // Otherwise assume typeOrId is the id to use as reference
        return typeof typeOrId === 'string' && typeOrId in this.toolTypeIdMap ?
            this.toolTypeIdMap[typeOrId as toolType] :
            [typeOrId as string];
    }

    private async onIframeLoaded() {
        this.assertPdfViewerApplicationExists();

        // Hook events
        this.pdfjsDocument.addEventListener('mousedown', (e) => this.documentMouseDown.next(e));
        this.pdfjsDocument.addEventListener('mouseup', (e) => this.documentMouseUp.next(e));

        this._loggingProvider.sendDebug('Iframe has been loaded.', this._defaultLogSource);
        this.iframeLoaded.next();

        // Wait for the pdfjs viewer to initialize
        await this.pdfViewerApplication.initializedPromise;

        this._viewerState = 'loaded';
        this._loggingProvider.sendDebug('Viewer has been loaded.', this._defaultLogSource);

        // Inject event bus events.
        this.subscribeEventBus('documentloaded', () => {
            this._fileState = 'loaded';
            this._pages = this.gatherPages();
            this._loadFilePromise.resolve();
            this.fileLoaded.next();
        });

        this.viewerLoaded.next();
        this._loadViewerPromise.resolve();
    }

    public assertPdfViewerApplicationExists(): asserts this is this & {
        pdfjsDocument: Document;
        pdfjsWindow: PdfjsWindow;
        pdfViewerApplication: PDFViewerApplication
    } {
        if (!this.pdfViewerApplication) {
            throw new Error('The PDFViewerApplication could not be found.');
        }
    }

    public assertViewerLoaded(): asserts this is this & {
        pdfjsDocument: Document;
        pdfjsWindow: PdfjsWindow;
        pdfViewerApplication: PDFViewerApplication
        viewerState: 'loaded';
    } {
        this.assertPdfViewerApplicationExists();
        if (this._viewerState !== 'loaded') {
            throw new Error('The viewer has not been loaded.');
        }
    }

    public assertfileLoaded(): asserts this is this & {
        pdfjsDocument: Document;
        pdfjsWindow: PdfjsWindow;
        pdfViewerApplication: PDFViewerApplication
        viewerState: 'loaded';
        fileState: 'loaded';
        pages: PdfjsPageContext[];
    } {
        this.assertViewerLoaded();
        if (this._fileState !== 'loaded') {
            throw new Error('The file has not been loaded.');
        }
    }
}
