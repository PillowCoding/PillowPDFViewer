import { Subject } from "rxjs";
import { PdfJsWindow } from "../types/PDFJSWindow";

export type pageChangingEventType = { pageNumber: number, pageLabel: unknown };

export class pdfBehaviour
{
    // Event outputs not related to the EventBus, called manually.
    onIframeLoading = new Subject<void>();
    onIframeLoaded = new Subject<void>();
    onPdfApplicationLoaded = new Subject<void>();
    onPdfInitializing = new Subject<void>();
    onPdfInitialized = new Subject<void>();

    // General events
    onIframeClicked = new Subject<MouseEvent>();
    onIframeMouseMove = new Subject<MouseEvent>();

    // EventBus events.
    // TODO: properly implement the generic, instead of passing `object`.
    onEventBusDispatch = new Subject<object>();
    onNextPage = new Subject<object>();
    onPreviousPage = new Subject<object>();
    onFirstPage = new Subject<object>();
    onLastPage = new Subject<object>();
    onBeforePrint = new Subject<object>();
    onAfterPrint = new Subject<object>();
    onPrint = new Subject<object>();
    onDownload = new Subject<object>();
    onZoomIn = new Subject<object>();
    onZoomOut = new Subject<object>();
    onZoomReset = new Subject<object>();
    onPageNumberChanged = new Subject<object>();
    onScaleChanging = new Subject<object>();
    onScaleChanged = new Subject<object>();
    onResize = new Subject<object>();
    onHashChange = new Subject<object>();
    onPageRender = new Subject<object>();
    onPageRendered = new Subject<{args: object, first: boolean}>();
    onPagesdestroy = new Subject<object>();
    onUpdateViewArea = new Subject<object>();
    onPageChanging = new Subject<pageChangingEventType>();
    onRotationChanging = new Subject<object>();
    onSidebarViewChanged = new Subject<object>();
    onPageMode = new Subject<object>();
    onNamedAction = new Subject<object>();
    onPresentationModeChanged = new Subject<object>();
    onPresentationMode = new Subject<object>();
    onSwitchAnnotationEditorMode = new Subject<object>();
    onSwitchAnnotationEditorParams = new Subject<object>();
    onRotateClockWise = new Subject<object>();
    onRotateCounterClockWise = new Subject<object>();
    onOptionalContentConfig = new Subject<object>();
    onSwitchScrollMode = new Subject<object>();
    onScrollModeChanged = new Subject<object>();
    onSwitchSpreadMode = new Subject<object>();
    onSpreadModeChanged = new Subject<object>();
    onDocumentProperties = new Subject<object>();
    onFindFromUrlHash = new Subject<object>();
    onUpdateFindMatchesCount = new Subject<object>();
    onUpdateFindControlState = new Subject<object>();
    onFileInputChange = new Subject<object>();
    onOpenFile = new Subject<object>();
    onTextLayerRendered = new Subject<object>();

    public enableDebugConsoleLogging = false;
    public enableEventBusDebugConsoleLogging = false;

    public readonly pageParentPageAttribute = 'data-page-number';

    public get iframeReference()
    {
        if (!this._iframeReference) {
            throw new Error('The iframe has not yet been assigned.');
        }

        return this._iframeReference;
    }

    /** Gets the PDF viewer application. */
    public get pdfViewerApplication()
    {
        const application = this.pdfViewerApplicationOrNone;
        if (!application) {
            throw new Error('PDF application is not yet loaded.');
        }
        return application;
    }

    /** Gets the PDF viewer application or undefined. */
    public get pdfViewerApplicationOrNone()
    {
        return this.iframeWindow?.PDFViewerApplication;
    }

    /** Gets the iframe native element. */
    public get iframeElement() { return this.iframeReference; }

    /** Gets the iframe window. */
    public get iframeWindow(): PdfJsWindow | null { return this.iframeElement.contentWindow as PdfJsWindow; }

    /** Gets the iframe document. */
    public get iframeDocument() {
        const doc = this.iframeDocumentOrNone;
        if (!doc) {
            throw new Error('PDF document is not yet loaded.');
        }
        
        return doc;
    }

    /** Gets the iframe document. */
    public get iframeDocumentOrNone() {
        'PDF document is not yet loaded.'
        return this.iframeElement.contentDocument || this.iframeElement.contentWindow?.document;
    }

    /** Gets the container of the right toolbar. */
    public get rightToolbarContainer() { return this.iframeDocument?.getElementById('toolbarViewerRight') as HTMLDivElement;  }

    /** Returns true if the PDF has been initialized. */
    public get initialized() { return this.pdfViewerApplication?.initialized === true; }

    /** The reference to the iframe containing the pdf context. If null, nothing is loaded. */
    private _iframeReference?: HTMLIFrameElement;
    private _emittedEvents: Array<string> = [];

    private readonly _viewerUrlBase;

    constructor(
        viewerRelativePath?: string
    )
    {
        this._viewerUrlBase = viewerRelativePath ?? 'assets/pdfjs/web/viewer.html';
    }

    public loadIframe(iframeReference: HTMLIFrameElement)
    {
        if (this._iframeReference)
        {
            throw new Error('Iframe reference already exists.');
        }

        this._iframeReference = iframeReference;
        this.iframeElement.onload = () => this.iframeLoaded();

        this.onIframeLoading.next();
        this.iframeElement.src = this._viewerUrlBase + '?file=';
    }

    public async loadFile(source: string | Blob | Uint8Array)
    {
        this.sendDebugMessage('Opening file...', source);

        this.onPdfInitializing.next();

        const args = { url: source };
        await this.pdfViewerApplication.open(args);

        this.sendDebugMessage('Pdf Initialized.');
        this.onPdfInitialized.next();
    }

    public pdfApplicationLoaded()
    {
        this.attachEventBusEvents();
        this.sendDebugMessage('Eventbus attached.');
        this.onPdfApplicationLoaded.next();
    }

    public getPageNumberOfElement(element: Element)
    {
        const pageNumberAttribute = element.closest('.page')?.getAttribute('data-page-number');
        if (!pageNumberAttribute)
        {
            const error = 'Page number could not be found for element.';
            console.error(error, element)
            throw new Error(error);
        }
        return Number(pageNumberAttribute);
    }

    public getPageParent(page: number)
    {
        return this.iframeDocument.querySelector(`.page[${this.pageParentPageAttribute}="${page}"]`) as HTMLDivElement;
    }

    public isPageRendered(page: number)
    {
        const pageParent = this.getPageParent(page);
        return pageParent.querySelector('.loadingIcon') == null;
    }

    public getRenderedPages()
    {
        const pageElements = Array.from(this.iframeDocument.querySelectorAll('.page')) as HTMLDivElement[];
        return pageElements.filter(x => {
            const page = this.getPageNumberFromParent(x);
            return this.isPageRendered(page);
        });
    }

    public getRenderedPageNumbers()
    {
        const pageElements = Array.from(this.iframeDocument.querySelectorAll('.page')) as HTMLDivElement[];
        const pageNumbers = pageElements.map(x => {
            return this.getPageNumberFromParent(x);
        });

        return pageNumbers.filter(x => {
            return this.isPageRendered(x);
        })
    }

    public getPageNumberFromParent(parent: HTMLDivElement)
    {
        const attributeValue = parent.getAttribute(this.pageParentPageAttribute);
        if (!attributeValue)
        {
            throw new Error(`Attribute "${this.pageParentPageAttribute}" not found in parent.`);
        }

        return Number(attributeValue);
    }

    private async iframeLoaded()
    {
        this.iframeDocument.addEventListener('click', (e) => this.onIframeClicked.next(e));
        this.iframeDocument.addEventListener('mousemove', (e) => this.onIframeMouseMove.next(e));
        this.onIframeLoaded.next();

        // Wait for the internal application to be initialized.
        await this.pdfViewerApplication.initializedPromise;
        this.pdfApplicationLoaded();
    }

    /**
     * Hooks all possible EventBus events so that they can be passed through the service.
     */
    private attachEventBusEvents()
    {
        this.addEventBusListener("nextpage", (e: object) => this.onNextPage.next(e));
        this.addEventBusListener("previouspage", (e: object) => this.onPreviousPage.next(e));
        this.addEventBusListener("lastpage", (e: object) => this.onLastPage.next(e));
        this.addEventBusListener("firstpage", (e: object) => this.onFirstPage.next(e));
        this.addEventBusListener("beforeprint", (e: object) => this.onBeforePrint.next(e));
        this.addEventBusListener("afterprint", (e: object) => this.onAfterPrint.next(e));
        this.addEventBusListener("print", (e: object) => this.onPrint.next(e));
        this.addEventBusListener("download", (e: object) => this.onDownload.next(e));
        this.addEventBusListener("zoomin", (e: object) => this.onZoomIn.next(e));
        this.addEventBusListener("zoomout", (e: object) => this.onZoomOut.next(e));
        this.addEventBusListener("zoomreset", (e: object) => this.onZoomReset.next(e));
        this.addEventBusListener("pagenumberchanged", (e: object) => this.onPageNumberChanged.next(e));
        this.addEventBusListener("scalechanging", (e: object) => this.onScaleChanging.next(e));
        this.addEventBusListener("scalechanged", (e: object) => this.onScaleChanged.next(e));
        this.addEventBusListener("resize", (e: object) => this.onResize.next(e));
        this.addEventBusListener("hashchange", (e: object) => this.onHashChange.next(e));
        this.addEventBusListener("pagerender", (e: object) => this.onPageRender.next(e));
        this.addEventBusListener("pagerendered", (args: object, first: boolean) => this.onPageRendered.next({args, first}));
        this.addEventBusListener("pagesdestroy", (e: object) => this.onPagesdestroy.next(e));
        this.addEventBusListener("updateviewarea", (e: object) => this.onUpdateViewArea.next(e));
        this.addEventBusListener("pagechanging", (e: pageChangingEventType) => this.onPageChanging.next(e));
        this.addEventBusListener("rotationchanging", (e: object) => this.onRotationChanging.next(e));
        this.addEventBusListener("sidebarviewchanged", (e: object) => this.onSidebarViewChanged.next(e));
        this.addEventBusListener("pagemode", (e: object) => this.onPageMode.next(e));
        this.addEventBusListener("namedaction", (e: object) => this.onNamedAction.next(e));
        this.addEventBusListener("presentationmodechanged", (e: object) => this.onPresentationModeChanged.next(e));
        this.addEventBusListener("presentationmode", (e: object) => this.onPresentationMode.next(e));
        this.addEventBusListener("switchannotationeditormode", (e: object) => this.onSwitchAnnotationEditorMode.next(e));
        this.addEventBusListener("switchannotationeditorparams", (e: object) => this.onSwitchAnnotationEditorParams.next(e));
        this.addEventBusListener("rotatecw", (e: object) => this.onRotateClockWise.next(e));
        this.addEventBusListener("rotateccw", (e: object) => this.onRotateCounterClockWise.next(e));
        this.addEventBusListener("optionalcontentconfig", (e: object) => this.onOptionalContentConfig.next(e));
        this.addEventBusListener("switchscrollmode", (e: object) => this.onSwitchScrollMode.next(e));
        this.addEventBusListener("scrollmodechanged", (e: object) => this.onScrollModeChanged.next(e));
        this.addEventBusListener("switchspreadmode", (e: object) => this.onSwitchSpreadMode.next(e));
        this.addEventBusListener("spreadmodechanged", (e: object) => this.onSpreadModeChanged.next(e));
        this.addEventBusListener("documentproperties", (e: object) => this.onDocumentProperties.next(e));
        this.addEventBusListener("findfromurlhash", (e: object) => this.onFindFromUrlHash.next(e));
        this.addEventBusListener("updatefindmatchescount", (e: object) => this.onUpdateFindMatchesCount.next(e));
        this.addEventBusListener("updatefindcontrolstate", (e: object) => this.onUpdateFindControlState.next(e));
        this.addEventBusListener("fileinputchange", (e: object) => this.onFileInputChange.next(e));
        this.addEventBusListener("openfile", (e: object) => this.onOpenFile.next(e));
        this.addEventBusListener("textlayerrendered", (e: object) => this.onTextLayerRendered.next(e));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private addEventBusListener(event: string, listener: (e: any, first: boolean) => void)
    {
        this.pdfViewerApplication.eventBus.on(
        event,
        (e: object) => {
            if (this.enableEventBusDebugConsoleLogging)
            {
                this.sendDebugMessage(`Dispatching event: ${event}...`);
            }

            const first = !this._emittedEvents.some(x => x.toLowerCase() === event.toLowerCase());
            listener(e, first);

            if (first)
            {
                this._emittedEvents.push(event);
            }

            
            this.onEventBusDispatch.next(e);
        });
    }

    private sendDebugMessage(message?: unknown, ...optionalParams: unknown[])
    {
        if (!this.enableDebugConsoleLogging)
        {
            return;
        }

        console.log(`Behaviour - ${message}`, ...optionalParams);
    }
}