import { Subject } from "rxjs";

export type pageChangingEventType = { pageNumber: number, pageLabel: any };

export class pdfBehaviour
{
    // Event outputs not related to the EventBus, called manually.
    onIframeLoading = new Subject<void>();
    onIframeLoaded = new Subject<void>();
    onPdfInitializing = new Subject<void>();
    onPdfInitialized = new Subject<void>();

    // General events
    onIframeClicked = new Subject<MouseEvent>();
    onIframeMouseMove = new Subject<MouseEvent>();

    // EventBus events.
    // TODO: properly implement the generic, instead of passing `Object`.
    onEventBusDispatch = new Subject<Object>();
    onNextPage = new Subject<Object>();
    onPreviousPage = new Subject<Object>();
    onFirstPage = new Subject<Object>();
    onLastPage = new Subject<Object>();
    onBeforePrint = new Subject<Object>();
    onAfterPrint = new Subject<Object>();
    onPrint = new Subject<Object>();
    onDownload = new Subject<Object>();
    onZoomIn = new Subject<Object>();
    onZoomOut = new Subject<Object>();
    onZoomReset = new Subject<Object>();
    onPageNumberChanged = new Subject<Object>();
    onScaleChanging = new Subject<Object>();
    onScaleChanged = new Subject<Object>();
    onResize = new Subject<Object>();
    onHashChange = new Subject<Object>();
    onPageRender = new Subject<Object>();
    onPageRendered = new Subject<{args: Object, first: boolean}>();
    onPagesdestroy = new Subject<Object>();
    onUpdateViewArea = new Subject<Object>();
    onPageChanging = new Subject<pageChangingEventType>();
    onRotationChanging = new Subject<Object>();
    onSidebarViewChanged = new Subject<Object>();
    onPageMode = new Subject<Object>();
    onNamedAction = new Subject<Object>();
    onPresentationModeChanged = new Subject<Object>();
    onPresentationMode = new Subject<Object>();
    onSwitchAnnotationEditorMode = new Subject<Object>();
    onSwitchAnnotationEditorParams = new Subject<Object>();
    onRotateClockWise = new Subject<Object>();
    onRotateCounterClockWise = new Subject<Object>();
    onOptionalContentConfig = new Subject<Object>();
    onSwitchScrollMode = new Subject<Object>();
    onScrollModeChanged = new Subject<Object>();
    onSwitchSpreadMode = new Subject<Object>();
    onSpreadModeChanged = new Subject<Object>();
    onDocumentProperties = new Subject<Object>();
    onFindFromUrlHash = new Subject<Object>();
    onUpdateFindMatchesCount = new Subject<Object>();
    onUpdateFindControlState = new Subject<Object>();
    onFileInputChange = new Subject<Object>();
    onOpenFile = new Subject<Object>();
    onTextLayerRendered = new Subject<Object>();

    public enableDebugConsoleLogging = false;
    public enableEventBusDebugConsoleLogging = false;

    public readonly pageParentPageAttribute = 'data-page-number';

    public get iframeReference()
    {
        this.throwIfIframeMissing();
        return this._iframeReference!;
    }

    /** Gets the PDF viewer application. */
    public get pdfViewerApplication()
    {
        return (this.iframeWindow as any).PDFViewerApplication;
    }

    /** Gets the PDF viewer application options. */
    public get pdfViewerApplicationOptions()
    {
        return (this.iframeWindow as any).PDFViewerApplicationOptions;
    }

    /** Gets the iframe native element. */
    public get iframeElement() { return this.iframeReference; }

    /** Gets the iframe window. */
    public get iframeWindow() { return this.iframeElement.contentWindow!; }

    /** Gets the iframe document. */
    public get iframeDocument() { return this.iframeElement.contentDocument || this.iframeElement.contentWindow!.document; }

    /** Gets the container of the right toolbar. */
    public get rightToolbarContainer() { return this.iframeDocument.getElementById('toolbarViewerRight') as HTMLDivElement;  }

    /** Returns true if the PDF has been initialized. */
    public get initialized() { return this.pdfViewerApplication.initialized === true; }

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

        this.attachEventBusEvents();

        this.sendDebugMessage('Pdf Initialized.');
        this.onPdfInitialized.next();
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
    }

    /**
     * Hooks all possible EventBus events so that they can be passed through the service.
     */
    private attachEventBusEvents()
    {
        this.addEventBusListener("nextpage", (e: Object) => this.onNextPage.next(e));
        this.addEventBusListener("previouspage", (e: Object) => this.onPreviousPage.next(e));
        this.addEventBusListener("lastpage", (e: Object) => this.onLastPage.next(e));
        this.addEventBusListener("firstpage", (e: Object) => this.onFirstPage.next(e));
        this.addEventBusListener("beforeprint", (e: Object) => this.onBeforePrint.next(e));
        this.addEventBusListener("afterprint", (e: Object) => this.onAfterPrint.next(e));
        this.addEventBusListener("print", (e: Object) => this.onPrint.next(e));
        this.addEventBusListener("download", (e: Object) => this.onDownload.next(e));
        this.addEventBusListener("zoomin", (e: Object) => this.onZoomIn.next(e));
        this.addEventBusListener("zoomout", (e: Object) => this.onZoomOut.next(e));
        this.addEventBusListener("zoomreset", (e: Object) => this.onZoomReset.next(e));
        this.addEventBusListener("pagenumberchanged", (e: Object) => this.onPageNumberChanged.next(e));
        this.addEventBusListener("scalechanging", (e: Object) => this.onScaleChanging.next(e));
        this.addEventBusListener("scalechanged", (e: Object) => this.onScaleChanged.next(e));
        this.addEventBusListener("resize", (e: Object) => this.onResize.next(e));
        this.addEventBusListener("hashchange", (e: Object) => this.onHashChange.next(e));
        this.addEventBusListener("pagerender", (e: Object) => this.onPageRender.next(e));
        this.addEventBusListener("pagerendered", (args: Object, first: boolean) => this.onPageRendered.next({args, first}), true);
        this.addEventBusListener("pagesdestroy", (e: Object) => this.onPagesdestroy.next(e));
        this.addEventBusListener("updateviewarea", (e: Object) => this.onUpdateViewArea.next(e));
        this.addEventBusListener("pagechanging", (e: pageChangingEventType) => this.onPageChanging.next(e));
        this.addEventBusListener("rotationchanging", (e: Object) => this.onRotationChanging.next(e));
        this.addEventBusListener("sidebarviewchanged", (e: Object) => this.onSidebarViewChanged.next(e));
        this.addEventBusListener("pagemode", (e: Object) => this.onPageMode.next(e));
        this.addEventBusListener("namedaction", (e: Object) => this.onNamedAction.next(e));
        this.addEventBusListener("presentationmodechanged", (e: Object) => this.onPresentationModeChanged.next(e));
        this.addEventBusListener("presentationmode", (e: Object) => this.onPresentationMode.next(e));
        this.addEventBusListener("switchannotationeditormode", (e: Object) => this.onSwitchAnnotationEditorMode.next(e));
        this.addEventBusListener("switchannotationeditorparams", (e: Object) => this.onSwitchAnnotationEditorParams.next(e));
        this.addEventBusListener("rotatecw", (e: Object) => this.onRotateClockWise.next(e));
        this.addEventBusListener("rotateccw", (e: Object) => this.onRotateCounterClockWise.next(e));
        this.addEventBusListener("optionalcontentconfig", (e: Object) => this.onOptionalContentConfig.next(e));
        this.addEventBusListener("switchscrollmode", (e: Object) => this.onSwitchScrollMode.next(e));
        this.addEventBusListener("scrollmodechanged", (e: Object) => this.onScrollModeChanged.next(e));
        this.addEventBusListener("switchspreadmode", (e: Object) => this.onSwitchSpreadMode.next(e));
        this.addEventBusListener("spreadmodechanged", (e: Object) => this.onSpreadModeChanged.next(e));
        this.addEventBusListener("documentproperties", (e: Object) => this.onDocumentProperties.next(e));
        this.addEventBusListener("findfromurlhash", (e: Object) => this.onFindFromUrlHash.next(e));
        this.addEventBusListener("updatefindmatchescount", (e: Object) => this.onUpdateFindMatchesCount.next(e));
        this.addEventBusListener("updatefindcontrolstate", (e: Object) => this.onUpdateFindControlState.next(e));
        this.addEventBusListener("fileinputchange", (e: Object) => this.onFileInputChange.next(e));
        this.addEventBusListener("openfile", (e: Object) => this.onOpenFile.next(e));
        this.addEventBusListener("textlayerrendered", (e: Object) => this.onTextLayerRendered.next(e));
    }

    private addEventBusListener(event: string, listener: Function, checkFirst?: boolean)
    {
        (this.iframeWindow as any).PDFViewerApplication.eventBus.on(
        event,
        (e: Object) => {
            if (this.enableEventBusDebugConsoleLogging)
            {
                this.sendDebugMessage(`Dispatching event: ${event}...`);
            }

            if (checkFirst)
            {
                const first = !this._emittedEvents.some(x => x.toLowerCase() === event.toLowerCase());
                listener(e, first);

                if (first)
                {
                    this._emittedEvents.push(event);
                }
            }
            else
            {
                listener(e);
            }

            
            this.onEventBusDispatch.next(e);
        });
    }

    private throwIfIframeMissing()
    {
        if (this._iframeReference)
        {
            return;
        }

        throw new Error('The iframe has not yet been assigned.');
    }

    private sendDebugMessage(message?: any, ...optionalParams: any[])
    {
        if (!this.enableDebugConsoleLogging)
        {
            return;
        }

        console.log(`Behaviour - ${message}`, ...optionalParams);
    }
}