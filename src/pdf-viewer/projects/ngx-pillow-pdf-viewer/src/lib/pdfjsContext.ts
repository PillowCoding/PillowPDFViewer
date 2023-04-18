import { Subject } from "rxjs";
import LoggingProvider, { pdfViewerLogSourceType } from "./utils/logging/loggingProvider";
import { PdfjsWindow } from "../types/pdfjsWindow";

export const EventBusEventTypeCollection = ["nextpage", "previouspage", "lastpage", "firstpage", "beforeprint", "afterprint", "print", "download", "zoomin", "zoomout", "zoomreset", "pagenumberchanged", "scalechanging", "scalechanged", "resize", "hashchange", "pagerender", "pagerendered", "pagesdestroy", "updateviewarea", "pagechanging", "rotationchanging", "sidebarviewchanged", "pagemode", "namedaction", "presentationmodechanged", "presentationmode", "switchannotationeditormode", "switchannotationeditorparams", "rotatecw", "rotateccw", "optionalcontentconfig", "switchscrollmode", "scrollmodechanged", "switchspreadmode", "spreadmodechanged", "documentproperties", "findfromurlhash", "updatefindmatchescount", "updatefindcontrolstate", "fileinputchange", "openfile", "textlayerrendered"] as const;
export type EventBusEventType = typeof EventBusEventTypeCollection[number];

export default class PdfjsContext
{
    public readonly iframeLoaded = new Subject<void>();
    public readonly viewerLoaded = new Subject<void>();
    public readonly eventBusDispatched = new Subject<{key: EventBusEventType, payload: object}>();

    private _loadViewerResolver!: () => void;
    private readonly _loadViewerPromise = new Promise<void>((resolve) => this._loadViewerResolver = resolve);

    /** Gets the iframe window. */
    public get pdfjsWindowOrNull() {
        return this._iframeElement.contentWindow as PdfjsWindow | null;
    }

    /** Gets the PDF viewer application. */
    public get pdfViewerApplication()
    {
        const application = this.pdfjsWindowOrNull?.PDFViewerApplication;
        if (!application) {
            throw new Error('The PDFViewerApplication object could not be found in the iframe.');
        }
        return application;
    }
    
    constructor(
        private readonly _loggingProvider: LoggingProvider,
        private readonly _viewerRelativePath: string,
        private readonly _iframeElement: HTMLIFrameElement,
    ) {
        this._iframeElement.onload = () => this.onIframeLoaded();
        this._iframeElement.src = this._viewerRelativePath + '?file=';
    }

    public async load(source: string | Blob | Uint8Array)
    {
        await this._loadViewerPromise;
        this.sendLogMessage('Loading source...', undefined, source);

        const args = { url: source };
        await this.pdfViewerApplication.open(args);
    }

    private async onIframeLoaded() {
        this.sendLogMessage('Iframe has been loaded.');
        this.iframeLoaded.next();

        // Wait for the pdfjs viewer to initialize
        await this.pdfViewerApplication.initializedPromise;
        this.sendLogMessage('Viewer has been loaded.');
        this.viewerLoaded.next();

        // Attach the event bus.
        this.attachEventBusEvents();
        this.sendLogMessage('Eventbus has been attached.');

        // Resolve the loading
        if (!this._loadViewerResolver) {
            throw new Error('Expected the load viewer resolved to exist.');
        }
        this._loadViewerResolver();
    }

    /**
     * Hooks all possible EventBus events so that they can be passed through the service.
     */
    private attachEventBusEvents()
    {
        for (const eventKey of EventBusEventTypeCollection) {
            this.pdfViewerApplication.eventBus.on(
                eventKey,
                (e: object) => {
                    this.sendLogMessage(`Dispatching ${eventKey}...`, 'EventBus');
                    this.eventBusDispatched.next({ key: eventKey, payload: e});
                });
        }
    }

    private sendLogMessage(message: unknown, source?: pdfViewerLogSourceType, ...args: unknown[]) {
        this._loggingProvider.send(message, source || 'PdfjsContext', ...args);
    }
}