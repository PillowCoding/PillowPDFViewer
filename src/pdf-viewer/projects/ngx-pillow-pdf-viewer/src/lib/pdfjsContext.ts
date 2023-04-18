import { Subject } from "rxjs";
import LoggingProvider, { pdfViewerLogSourceType } from "./utils/logging/loggingProvider";
import { PdfjsWindow } from "../types/pdfjsWindow";
import { EventBusEventType, EventBusPayloadType } from "../types/eventBus";
import { PDFViewerApplication } from "../types/pdfViewerApplication";

export type toolType = 'openFile' | 'printing' | 'downloadPdf';

export default class PdfjsContext
{
    public readonly iframeLoaded = new Subject<void>();
    public readonly viewerLoaded = new Subject<void>();

    private _loadViewerResolver!: () => void;
    private readonly _loadViewerPromise = new Promise<void>((resolve) => this._loadViewerResolver = resolve);

    private _viewerState: 'unloaded' | 'loading' | 'loaded' = 'unloaded';

    // TODO: Replace hotkeys that fall under certain tool types.
    /** Represents the ids of the html elements representing the tool type. */
    private readonly toolTypeIdMap: { [key in toolType]: readonly string[]; } = {
        'openFile': [ 'openFile', 'secondaryOpenFile' ],
        'printing': [ 'print', 'secondaryPrint' ],
        'downloadPdf': [ 'download', 'secondaryDownload' ],
    };

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
        this.sendLogMessage('Loading source...', undefined, source);
        this.assertViewerLoaded();

        const args = { url: source };
        await this.pdfViewerApplication.open(args);
    }

    public subscribeEventBusDispatch<K extends EventBusEventType>(eventKey: K, dispatch: (payload: EventBusPayloadType<K>) => void) {
        this.assertViewerLoaded();
        this.pdfViewerApplication.eventBus.on(
            eventKey as string,
            dispatch as (e: object) => void);
    }

    public disableTool(type: toolType) {
        this.sendLogMessage(`Disabling ${type}...`);
        this.assertViewerLoaded();
    }

    private async onIframeLoaded() {
        this.assertPdfViewerApplicationExists();

        this.sendLogMessage('Iframe has been loaded.');
        this.iframeLoaded.next();

        // Wait for the pdfjs viewer to initialize
        await this.pdfViewerApplication.initializedPromise;

        this._viewerState = 'loaded';
        this.sendLogMessage('Viewer has been loaded.');
        this.viewerLoaded.next();

        // Resolve the loading
        if (!this._loadViewerResolver) {
            throw new Error('Expected the load viewer resolved to exist.');
        }
        this._loadViewerResolver();
    }

    private assertPdfViewerApplicationExists(): asserts this is this & {
        pdfjsWindow: PdfjsWindow;
        pdfViewerApplication: PDFViewerApplication
    } {
        if (!this.pdfViewerApplication) {
            throw new Error('The PDFViewerApplication could not be found.');
        }
    }

    private assertViewerLoaded(): asserts this is this & {
        pdfjsWindow: PdfjsWindow;
        pdfViewerApplication: PDFViewerApplication
        viewerState: 'loaded';
    } {
        if (this._viewerState !== 'loaded') {
            throw new Error('The viewer has not been loaded.');
        }
    }

    private sendLogMessage(message: unknown, source?: pdfViewerLogSourceType, ...args: unknown[]) {
        this._loggingProvider.send(message, source || 'PdfjsContext', ...args);
    }
}
