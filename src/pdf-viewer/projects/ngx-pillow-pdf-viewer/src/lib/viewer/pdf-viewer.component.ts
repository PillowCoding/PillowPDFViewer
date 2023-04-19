import { Component, ElementRef, Input, OnInit, ViewChild } from "@angular/core";
import PdfjsContext, { toolType } from "ngx-pillow-pdf-viewer/pdfjsContext";
import pdfjsContext from "ngx-pillow-pdf-viewer/pdfjsContext";
import DefaultLoggingProvider from "ngx-pillow-pdf-viewer/utils/logging/defaultLoggingProvider";
import LoggingProvider from "ngx-pillow-pdf-viewer/utils/logging/loggingProvider";
import { AnnotationEditorModeChangedEventType, AnnotationEditorType } from "../../types/eventBus";

@Component({
    selector: 'lib-pdf-viewer',
    templateUrl: 'pdf-viewer.component.html',
    styleUrls: ['pdf-viewer.component.scss', './../common.scss']
})
export class PdfViewerComponent implements OnInit {
    /** The iframe wrapper used to display the pdfjs viewer. */
    @ViewChild('iframeWrapper', { static: true }) private _iframeWrapper!: ElementRef<HTMLIFrameElement>;

    /** The logging provider that will be used to send log messages. */
    @Input()
    public set loggingProvider(provider: LoggingProvider) {
        this._loggingProvider = provider;
    }

    /** The relative path that is used to access the viewer. */
    @Input()
    public set relativeViewerPath(relativePath: string) {
        this._relativeViewerPath = relativePath;
    }

    /** The source url of the file to use. If undefined, the PDF viewer will be empty until a file is loaded. */
    @Input()
    public set fileSource(source: string | Blob | Uint8Array) {
        this._fileSource = source;
    }

    /** Represents tools to disable in the viewer so they can not be used. */
    @Input()
    public set disabledTools(tools: toolType | toolType[]) {
        this._disabledTools = Array.isArray(tools) ? tools : [tools];
    }

    public get pdfjsContext() {
        if (!this._pdfjsContext) {
             throw new Error('The PDFJS context could not be found.');
        }

        return this._pdfjsContext;
    }

    private _relativeViewerPath?: string;
    private _fileSource?: string | Blob | Uint8Array;
    private _loggingProvider?: LoggingProvider;
    private _pdfjsContext?: pdfjsContext;
    private _disabledTools?: toolType[];

    ngOnInit(): void {
        if (!this._relativeViewerPath) {
            this._relativeViewerPath = 'assets/pdfjs/web/viewer.html';
        }
        if (!this._loggingProvider) {
            this._loggingProvider = new DefaultLoggingProvider([], 50);
        }

        this._pdfjsContext = new PdfjsContext(this._loggingProvider, this._relativeViewerPath, this._iframeWrapper.nativeElement);
        this._pdfjsContext.viewerLoaded.subscribe(() => this.onViewerLoaded());

        if (!this._fileSource) {
            return;
        }

        this.pdfjsContext.load(this._fileSource);
    }

    private onViewerLoaded() {

        // Subscribe to event bus events.
        this.pdfjsContext.subscribeEventBusDispatch('annotationeditormodechanged', (e) => this.onAnnotationEditorModeChanged(e));

        if (!this._disabledTools) {
            return;
        }

        // Collect the tools to disable.
        // The text editor and draw editor are disabled after the initial render.
        // This is due to the fact that these are manually disabled by the viewer.
        const toolsToDisable = this._disabledTools.filter(x => x !== 'textEditor' && x !== 'drawEditor');

        for (const toolId of toolsToDisable) {
            this.pdfjsContext.setToolDisabled(toolId);
        }
    }

    private onAnnotationEditorModeChanged(event: AnnotationEditorModeChangedEventType) {
        // Check if the mode is an action that is not disabled.
        if (event.mode === AnnotationEditorType.disable) {
            return;
        }

        if (!this._disabledTools) {
            return;
        }

        // If the text editor or draw editor must be disabled, disable them if the annotation mode changed to not disabled.
        const toolsToDisable = this._disabledTools.filter(x => x === 'textEditor' || x === 'drawEditor');
        for (const toolId of toolsToDisable) {
            this.pdfjsContext.setToolDisabled(toolId);
        }
    }
}