import { Subject } from "rxjs";
import LoggingProvider from "./utils/logging/loggingProvider";
import { PdfjsWindow } from "../types/pdfjsWindow";

export default class PdfjsContext
{
    public readonly iframeLoaded = new Subject<void>();
    public readonly viewerLoaded = new Subject<void>();

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

    public load(source: string | Blob | Uint8Array)
    {
        this.sendLogMessage('Loading source...', source);

        const args = { url: source };
        this.pdfViewerApplication.open(args);
    }

    private async onIframeLoaded() {
        this.sendLogMessage('Iframe has been loaded.');
        this.iframeLoaded.next();

        // Wait for the pdfjs viewer to initialize
        await this.pdfViewerApplication.initializedPromise;
        this.sendLogMessage('Viewer has been loaded.');
        this.viewerLoaded.next();
    }

    private sendLogMessage(message: unknown, ...args: unknown[]) {
        this._loggingProvider.send(PdfjsContext.name, message, ...args);
    }
}