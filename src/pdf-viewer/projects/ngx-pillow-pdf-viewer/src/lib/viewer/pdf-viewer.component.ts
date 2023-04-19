import { Component, ElementRef, Input, OnInit, ViewChild } from "@angular/core";
import PdfjsContext, { toolType } from "ngx-pillow-pdf-viewer/pdfjsContext";
import pdfjsContext from "ngx-pillow-pdf-viewer/pdfjsContext";
import DefaultLoggingProvider from "ngx-pillow-pdf-viewer/utils/logging/defaultLoggingProvider";
import LoggingProvider, { pdfViewerLogSourceType } from "ngx-pillow-pdf-viewer/utils/logging/loggingProvider";
import { AnnotationEditorModeChangedEventType, AnnotationEditorType } from "../../types/eventBus";
import { AnnotationType } from "ngx-pillow-pdf-viewer/annotation/annotationTypes";
import annotation from "ngx-pillow-pdf-viewer/annotation/annotation";

export type AnnotationRequest = { page: number };
export type RequestedAnnotations = AnnotationRequest & { annotations: Array<annotation> };

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

    public get loggingProvider() {
        if (!this._loggingProvider) {
             throw new Error('The logging provider could not be found.');
        }

        return this._loggingProvider;
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

    private readonly _annotateTextId = 'annotate-text';
    private readonly _annotateDrawId = 'annotate-draw';

    private _relativeViewerPath?: string;
    private _fileSource?: string | Blob | Uint8Array;
    private _loggingProvider?: LoggingProvider;
    private _pdfjsContext?: pdfjsContext;
    private _disabledTools?: toolType[];
    private _annotations: RequestedAnnotations[] = [];

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
        this.pdfjsContext.subscribeEventBusDispatch('pagesloaded', () => this.onPagesLoaded());
        this.pdfjsContext.subscribeEventBusDispatch('documentloaded', () => this.sendLogMessage('Document has been loaded.'));
        this.pdfjsContext.subscribeEventBusDispatch('documentinit', () => this.sendLogMessage('Document is loading...'));
        this.pdfjsContext.subscribeEventBusDispatch('pagesinit', () => this.sendLogMessage('Pages are loading...'));

        if (!this._disabledTools) {
            return;
        }

        // Inject the text and draw annotation tool buttons.
        const textAnnotateStyle = `
            #${this._annotateTextId}::before
            {
                -webkit-mask-image: var(--toolbarButton-editorFreeText-icon);
            }
        `;
        const drawAnnotateStyle = `
            #${this._annotateDrawId}::before
            {
                -webkit-mask-image: var(--toolbarButton-editorInk-icon);
            }
        `;

        const sharedStyle = `
            #${this._annotateDrawId}::after, #${this._annotateTextId}::after
            {
                content: 'A';
                font-size: 8px;
                position: absolute;
                left: 4px;
                top: 4px;

                color: var(--main-color);
                opacity: var(--toolbar-icon-opacity);
            }
            #${this._annotateDrawId}::before, #${this._annotateTextId}::before
            {
                color: var(--main-color);
                opacity: var(--toolbar-icon-opacity);
            }
        `;

        const annotateDrawButton = this.pdfjsContext.insertToolButton(this._annotateDrawId, 'beforebegin', 'textEditor', true);
        const annotateTextButton = this.pdfjsContext.insertToolButton(this._annotateTextId, 'beforebegin', this._annotateDrawId, true);
        this.pdfjsContext.injectStyle(textAnnotateStyle + drawAnnotateStyle + sharedStyle);

        annotateDrawButton.onclick = () => { throw new Error('Not implemented.') };
        annotateTextButton.onclick = () => this.beginNewAnnotation('text');

        // Collect the tools to disable.
        // The text editor and draw editor are disabled after the initial render.
        // This is due to the fact that these are manually disabled by the viewer.
        const toolsToDisable = this._disabledTools.filter(x => x !== 'textEditor' && x !== 'drawEditor');

        for (const toolId of toolsToDisable) {
            this.pdfjsContext.setToolDisabled(toolId);
        }
    }

    private beginNewAnnotation(type: AnnotationType) {
        const newAnnotation = new annotation(type);
    }

    private onPagesLoaded() {
        // Enable the annotation buttons
        this.pdfjsContext.setToolDisabled(this._annotateDrawId, false);
        this.pdfjsContext.setToolDisabled(this._annotateTextId, false);

        this.sendLogMessage('Pages have been loaded.')
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

    private sendLogMessage(message: unknown, source?: pdfViewerLogSourceType, ...args: unknown[]) {
        this.loggingProvider.send(message, source || PdfViewerComponent.name, ...args);
    }
}