import { Subject } from "rxjs";
import LoggingProvider, { pdfViewerLogSourceType } from "./utils/logging/loggingProvider";
import { PdfjsWindow } from "../types/pdfjsWindow";
import { EventBusEventType, EventBusPayloadType } from "../types/eventBus";

export default class PdfjsContext
{
    public readonly iframeLoaded = new Subject<void>();
    public readonly viewerLoaded = new Subject<void>();

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

    public subscribeEventBusDispatch<K extends EventBusEventType>(eventKey: K, dispatch: (payload: EventBusPayloadType<K>) => void) {
        // This small check will tell Typescript that the eventKey is always a string.
        if (typeof eventKey !== 'string') {
            throw new Error('The eventKey must be a string.');
        }

        this.pdfViewerApplication.eventBus.on(
            eventKey,

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (e: any) => {
                this.sendLogMessage(`Dispatching ${eventKey}...`, 'EventBus');
                dispatch(e);
            });
    }

    private async onIframeLoaded() {
        this.sendLogMessage('Iframe has been loaded.');
        this.iframeLoaded.next();

        // Wait for the pdfjs viewer to initialize
        await this.pdfViewerApplication.initializedPromise;
        this.sendLogMessage('Viewer has been loaded.');
        this.viewerLoaded.next();

        // Resolve the loading
        if (!this._loadViewerResolver) {
            throw new Error('Expected the load viewer resolved to exist.');
        }
        this._loadViewerResolver();
    }

    private sendLogMessage(message: unknown, source?: pdfViewerLogSourceType, ...args: unknown[]) {
        this._loggingProvider.send(message, source || 'PdfjsContext', ...args);
    }
}
