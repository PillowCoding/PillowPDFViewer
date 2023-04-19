import { Subject } from "rxjs";
import LoggingProvider, { pdfViewerLogSourceType } from "./utils/logging/loggingProvider";
import { PdfjsWindow } from "../types/pdfjsWindow";
import { EventBusEventType, EventBusPayloadType } from "../types/eventBus";
import { PDFViewerApplication } from "../types/pdfViewerApplication";

export type toolType = 'openFile' | 'printing' | 'downloadPdf' | 'textEditor' | 'drawEditor';

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
        'textEditor': [ 'editorFreeText' ],
        'drawEditor': [ 'editorInk' ],
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

    public setToolDisabled(typeOrId: toolType | Omit<string, toolType>, disabled = true) {
        this.sendLogMessage(`${disabled ? 'Disabling' : 'Enabling'} ${typeOrId.toString()}...`);
        this.assertViewerLoaded();

        // Determine the relevant ids to disable/enable.
        const toolIds = this.getToolButtonIds(typeOrId);

        for (const toolId of toolIds) {
            const element = this.pdfjsDocument.getElementById(toolId);
            if (!element) {
                console.warn(`Tool element ${toolId} could not be found.`);
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
                console.warn(`Tool element ${toolId} could not be found. Assuming disabled.`);
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
    }

    public injectStyle(style: string) {
        this.assertViewerLoaded();

        // Inject the css in a style tag.
        const styleContainer = this.pdfjsDocument.createElement("style");
        styleContainer.textContent = style;
        this.pdfjsDocument.head.appendChild(styleContainer);
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
        pdfjsDocument: Document;
        pdfjsWindow: PdfjsWindow;
        pdfViewerApplication: PDFViewerApplication
    } {
        if (!this.pdfViewerApplication) {
            throw new Error('The PDFViewerApplication could not be found.');
        }
    }

    private assertViewerLoaded(): asserts this is this & {
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

    private sendLogMessage(message: unknown, source?: pdfViewerLogSourceType, ...args: unknown[]) {
        this._loggingProvider.send(message, source || PdfjsContext.name, ...args);
    }
}
