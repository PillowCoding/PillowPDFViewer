import { ChangeDetectorRef, Component, ElementRef, Input, OnInit, ViewChild } from "@angular/core";
import PdfjsContext, { annotateDrawId, annotateIconId, annotateTextId, toolType } from "ngx-pillow-pdf-viewer/pdfjsContext";
import pdfjsContext from "ngx-pillow-pdf-viewer/pdfjsContext";
import DefaultLoggingProvider from "ngx-pillow-pdf-viewer/utils/logging/defaultLoggingProvider";
import LoggingProvider from "ngx-pillow-pdf-viewer/utils/logging/loggingProvider";
import { AnnotationCommentSubmitEventType, AnnotationDeleteEventType, AnnotationEditorModeChangedEventType, AnnotationEditorType, AnnotationFocusEventType, AnnotationUnfocusEventType, PageRenderedEventType, TextLayerRenderedEventType } from "../types/eventBus";
import { AnnotationType, boundingBox } from "ngx-pillow-pdf-viewer/annotation/annotationTypes";
import { Annotation, AnnotationComment } from "ngx-pillow-pdf-viewer/annotation/annotation";
import { PdfSidebarComponent, annotationsProviderDelegate } from "ngx-pillow-pdf-viewer/sidebar/pdf-sidebar.component";
import TextAnnotator from "ngx-pillow-pdf-viewer/annotator/textAnnotator";
import LayerManager from "ngx-pillow-pdf-viewer/annotator/layerManager";
import DeferredPromise from "ngx-pillow-pdf-viewer/utils/deferredPromise";
import { LocalisationService } from "ngx-pillow-pdf-viewer/utils/localisation/localisation.service";
import DrawAnnotator, { canvasMouseType, drawData } from "ngx-pillow-pdf-viewer/annotator/drawAnnotator";
import groupByKey from "ngx-pillow-pdf-viewer/utils/groupBy";

export type annotationsSaveProviderDelegate = (annotation: Annotation) => void | Promise<void>;
export type annotationsDeleteProviderDelegate = (annotation: Annotation) => void | Promise<void>;
export type annotationsCommentSaveProviderDelegate = (annotation: Annotation, comment: AnnotationComment) => void | Promise<void>;

/**
 * Represents what annotations are shown.
 * All equals all annotations, focused and unfocused.
 * OnlyFocused will only show annotations when they are focused.
 * OnlyFocusedElseUnfocused will only show focused annotations if there are any.
 */
export type showAnnotationsType = 'all' | 'onlyFocused' | 'onlyFocusedElseUnfocused'

@Component({
    selector: 'lib-pdf-viewer',
    templateUrl: 'pdf-viewer.component.html',
    styleUrls: ['pdf-viewer.component.scss', './../common.scss']
})
export class PdfViewerComponent implements OnInit {
    /** The iframe wrapper used to display the pdfjs viewer. */
    @ViewChild('iframeWrapper', { static: true }) private _iframeWrapper!: ElementRef<HTMLIFrameElement>;

    /** Annotation info that is displayed when annotating. */
    @ViewChild('annotateInfo', { static: true }) private _annotateInfo!: ElementRef<HTMLDivElement>;

    /** The sidebar of the viewer. Will be undefined if `sidebarEnabled` is false. */
    @ViewChild('sidebar') private _sidebar?: PdfSidebarComponent;

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

    /** Represents tools to hide in the viewer. */
    @Input()
    public set hiddenTools(tools: toolType | toolType[]) {
        this._hiddenTools = Array.isArray(tools) ? tools : [tools];
    }

    /** If the annotations are retrieved synchronously, this input can be used to give them before the pdf has loaded.
     * Note that any asynchronous fetches should be done using the `annotationProvider` input.
     */
    @Input()
    public set annotations(annotations: Annotation[]) {

        // It is too late to load annotations this way.
        if (this.pdfjsContext?.fileState === 'loaded') {
            this.loggingProvider.sendWarning('It is not possible to pass annotations through the input after the document is loaded. If the annotations are fetched asynchronously, or at a later state, it is possible to pass them through the `annotationProvider` input.', this._defaultLogSource);
            return;
        }

        this._annotations = annotations;
    }

    public get annotations() {
        return this._annotations;
    }

    public get completedAnnotations() {
        return this._annotations.filter(x => x.state === 'completed');
    }

    public get uncompletedAnnotation() {
        return this._annotations.find(x => x.state !== 'completed');
    }

    @Input() public sidebarEnabled = true;

    @Input() public defaultTextAnnotationColor = '#FFA50040';
    @Input() public defaultDrawAnnotationColor = '#FFA500';
    @Input() public defaultTextAnnotationFocusColor = '#FF450040';
    @Input() public defaultDrawAnnotationFocusColor = '#FF4500';

    // Default color matches Windows Chrome's background color when selecting text.
    // (Specifically Chrome 26.0.1410.64 m Windows 8+)
    @Input() public defaultPendingDrawAnnotationColor = '#3297FD';

    /** The provider that will fetch annotations asynchronously. */
    @Input() public annotationsProvider?: annotationsProviderDelegate;

    /** The provider that will save annotations. */
    @Input() public annotationsSaveProvider?: annotationsSaveProviderDelegate;

    /** The provider that will save annotations. */
    @Input() public annotationsDeleteProvider?: annotationsDeleteProviderDelegate;

    /** The provider that will save annotation comments. */
    @Input() public annotationsCommentSaveProvider?: annotationsCommentSaveProviderDelegate;

    public get pdfjsContext() {
        return this._pdfjsContext;
    }

    public get sidebarComponent() {
        this.assertPdfjsContextExists();
        if (this.pdfjsContext.viewerState !== 'loaded') {
            throw new Error('The sidebar has not been loaded yet.');
        }

        return this._sidebar;
    }

    public get annotationMode() {
        return this._annotationMode;
    }

    public get layerManager() {
        return this._layerManager;
    }

    public get textAnnotator() {
        return this._textAnnotator;
    }

    public get drawAnnotator() {
        return this._drawAnnotator;
    }

    public get annotationPagePromises() {
        return this._annotationPagePromises;
    }

    private readonly _defaultLogSource = PdfViewerComponent.name;

    private _relativeViewerPath?: string;
    private _fileSource?: string | Blob | Uint8Array;
    private _loggingProvider?: LoggingProvider;
    private _pdfjsContext?: pdfjsContext;
    private _layerManager?: LayerManager;
    private _textAnnotator?: TextAnnotator;
    private _drawAnnotator?: DrawAnnotator;
    private _disabledTools: toolType[] = [];
    private _hiddenTools: toolType[] = [];
    private _annotations: Annotation[] = [];
    private _annotationMode: AnnotationType | 'none' = 'none';

    // Keeps track of pages that have had their annotations fetched.
    private readonly _fetchedAnnotationPages: number[] = [];

    // Keeps track of pages that are having their annotations fetched.
    private _fetchingAnnotationPages: number[] = [];

    // Keeps an array of promises that can be awaited to wait for annotations to be fetched.
    private _annotationPagePromises?: DeferredPromise[];

    // TODO: Maybe improve this.
    /** Represents an easy way to determine the translation key of the various build in toolbar buttons, when setting the title. */
    private readonly toolTypeTranslationMap: { [key in toolType]: { enabled: string, disabled: string }; } = {
        'openFile': { enabled: 'openFile.enabled', disabled: 'openFile.disabled'},
        'printing': { enabled: 'printing.enabled', disabled: 'printing.disabled'},
        'downloadPdf': { enabled: 'downloadPdf.enabled', disabled: 'downloadPdf.disabled'},
        'textEditor': { enabled: 'textEditor.enabled', disabled: 'textEditor.disabled'},
        'drawEditor': { enabled: 'drawEditor.enabled', disabled: 'drawEditor.disabled'},
        'textAnnotator': { enabled: 'textAnnotator.enabled', disabled: 'textAnnotator.disabled'},
        'drawAnnotator': { enabled: 'drawAnnotator.enabled', disabled: 'drawAnnotator.disabled'},
        'iconAnnotator': { enabled: 'iconAnnotator.enabled', disabled: 'iconAnnotator.disabled'},
    };

    constructor(
        private readonly changeDetector: ChangeDetectorRef,
        private readonly _localisationService: LocalisationService,
    ) {
        this.fetchSidebarAnnotationsForPage = this.fetchSidebarAnnotationsForPage.bind(this);
    }

    ngOnInit(): void {
        if (!this._relativeViewerPath) {
            this._relativeViewerPath = 'assets/pdfjs/web/viewer.html';
        }
        if (!this._loggingProvider) {
            this._loggingProvider = new DefaultLoggingProvider('warning', ['EventBus', 'PdfViewerComponent', 'PdfjsContext', 'TextAnnotator', 'DrawAnnotator', 'LayerManager', 'PdfSidebarComponent'], 50);
        }

        this._pdfjsContext = new PdfjsContext(this._loggingProvider, this._relativeViewerPath, this._iframeWrapper.nativeElement);
        this._pdfjsContext.viewerLoaded.subscribe(() => this.onViewerLoaded());
        this._pdfjsContext.fileLoaded.subscribe(() => this.onFileLoaded());

        if (!this._fileSource) {
            return;
        }

        // Typescript is unaware the context deifnitely exists at this point.
        this.assertPdfjsContextExists();

        this.pdfjsContext.load(this._fileSource);
    }

    private onViewerLoaded() {

        this.assertPdfjsContextExists();

        // Subscribe to event bus events.
        this.pdfjsContext.subscribeEventBus('annotationeditormodechanged', (e) => this.onAnnotationEditorModeChanged(e));
        this.pdfjsContext.subscribeEventBus('pagesloaded', () => this.onPagesLoaded());
        this.pdfjsContext.subscribeEventBus('pagerendered', (e) => this.onPageRendered(e));
        this.pdfjsContext.subscribeEventBus('textlayerrendered', (e) => this.textLayerRendered(e));
        this.pdfjsContext.subscribeEventBus('pagechanging', () => this.onPageChanging());
        this.pdfjsContext.subscribeEventBus('pagesdestroy', () => this.loggingProvider.sendDebug('Document has been unloaded.', this._defaultLogSource));
        this.pdfjsContext.subscribeEventBus('documentloaded', () => this.onDocumentLoaded());
        this.pdfjsContext.subscribeEventBus('pagesinit', () => this.loggingProvider.sendDebug('Pages are loading...', this._defaultLogSource));
        this.pdfjsContext.subscribeEventBus('annotationCommentSubmit', (e) => this.onAnnotationCommentSubmit(e));
        this.pdfjsContext.subscribeEventBus('annotationDelete', (e) => this.onAnnotationDelete(e));
        this.pdfjsContext.subscribeEventBus('annotationFocus', (e) => this.onAnnotationFocus(e));
        this.pdfjsContext.subscribeEventBus('annotationUnfocus', (e) => this.onAnnotationUnfocus(e));

        // Watch iframe resize
        // TODO: maybe store this observer is we plan on destroying it at some point.
        const observer = new ResizeObserver(() => this.iframeResize());
        observer.observe(this._iframeWrapper.nativeElement);

        // Inject the text and draw annotation tool buttons.
        const textAnnotateStyle = `
            #${annotateTextId}::before
            {
                -webkit-mask-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGRlZnM+PHN0eWxlPi5jbHMtMXtmaWxsOiM4YzhjOGM7fTwvc3R5bGU+PC9kZWZzPjx0aXRsZT5pY29uIC0gbGluZSAtIHRvb2wgLSBoaWdobGlnaHQ8L3RpdGxlPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTkuOTEsMTMuMDdoMy44NkwxMS44NCw4LjQ2Wm01LjQ2LDMuNjhMMTQuNjIsMTVIOS4wNUw3Ljc3LDE4SDUuNjNMMTAuNDUsNi42NGExLDEsMCwwLDEsMS0uNjRoMWExLjIzLDEuMjMsMCwwLDEsMSwuNjRsMiw0LjkxVjRINS44NUEyLjIyLDIuMjIsMCwwLDAsMy42Myw2LjIyVjE3Ljc4QTIuMjIsMi4yMiwwLDAsMCw1Ljg1LDIwaDkuNTJaIj48L3BhdGg+PHBhdGggZmlsbD0iZGVmYXVsdCIgY2xhc3M9ImNscy0xIiBkPSJNMjAuMzcsMlYyMmgtMlYyWiI+PC9wYXRoPjwvc3ZnPg==");
            }
        `;
        const drawAnnotateStyle = `
            #${annotateDrawId}::before
            {
                -webkit-mask-image: url("data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIGlkPSJpY29uIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCIgdmlld0JveD0iMCAwIDI0IDI0IiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCAyNCAyNDsiIHhtbDpzcGFjZT0icHJlc2VydmUiPjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+IC5zdDB7ZmlsbDojODY4RTk2O30gPC9zdHlsZT48cGF0aCBjbGFzcz0ic3QwIiBkPSJNMTkuMywzLjhINC43Yy0xLDAtMS44LDAuOC0xLjgsMS44djEyLjhjMCwxLDAuOCwxLjgsMS44LDEuOGgxNC43YzEsMCwxLjgtMC44LDEuOC0xLjhWNS42IEMyMS4yLDQuNiwyMC4zLDMuNywxOS4zLDMuOHogTTUuMSwxOFY2aDEzLjh2MTJINS4xeiI+PC9wYXRoPjxyZWN0IGZpbGw9Im5vbmUiIHg9IjUuMSIgeT0iNiIgd2lkdGg9IjEzLjgiIGhlaWdodD0iMTIiPjwvcmVjdD48L3N2Zz4=");
            }
        `;
        const iconAnnotateStyle = `
            #${annotateIconId}::before
            {
                -webkit-mask-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGRlZnM+PHN0eWxlPi5jbHMtMXtmaWxsOiNhYmIwYzQ7fTwvc3R5bGU+PC9kZWZzPjx0aXRsZT5pY29uIC0gdG9vbCAtIGNvbW1lbnQgLSBsaW5lPC90aXRsZT48cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik0yMCwyLjQ2SDRhMiwyLDAsMCwwLTIsMnYxMGEyLDIsMCwwLDAsMiwySDd2NS4wOGw2LjM1LTUuMDhIMjBhMiwyLDAsMCwwLDItMnYtMTBBMiwyLDAsMCwwLDIwLDIuNDZabTAsMTJIMTIuNjVMOSwxNy4zOFYxNC40Nkg0di0xMEgyMFoiPjwvcGF0aD48cGF0aCBmaWxsPSJkZWZhdWx0IiBjbGFzcz0iY2xzLTEiIGQ9Ik0xOCw4LjQ2SDZ2LTJIMThabS0yLjUsNEg2di0yaDkuNVoiPjwvcGF0aD48L3N2Zz4=");
            }
        `;

        // Insert the new buttons. Start disabled by default as they are only used with loaded files.
        const annotateIconButton = this.pdfjsContext.insertToolButton(annotateIconId, 'beforebegin', 'textEditor', true);
        const annotateTextButton = this.pdfjsContext.insertToolButton(annotateTextId, 'beforebegin', annotateIconId, true);
        const annotateDrawButton = this.pdfjsContext.insertToolButton(annotateDrawId, 'beforebegin', annotateTextId, true);

        const drawTranslation = this._localisationService.Translate(this.toolTypeTranslationMap['drawAnnotator'].disabled);
        this.pdfjsContext.setToolTitle('drawAnnotator', drawTranslation);

        const textTranslation = this._localisationService.Translate(this.toolTypeTranslationMap['textAnnotator'].disabled);
        this.pdfjsContext.setToolTitle('textAnnotator', textTranslation);

        const iconTranslation = this._localisationService.Translate(this.toolTypeTranslationMap['iconAnnotator'].disabled);
        this.pdfjsContext.setToolTitle('iconAnnotator', iconTranslation);

        this.pdfjsContext.injectStyle(textAnnotateStyle + drawAnnotateStyle + iconAnnotateStyle);

        annotateDrawButton.onclick = () => this.beginNewAnnotation('draw');
        annotateTextButton.onclick = () => this.beginNewAnnotation('text');
        annotateIconButton.onclick = () => { throw new Error('Currently not implemented.'); }

        // Collect the tools to disable.
        // The text and draw editor/annotator are disabled after the initial render.
        // This is due to the fact that the editor buttons are manually disabled by the viewer, and the annotator buttons can only be used with loaded files.
        // The editor buttons are enabled with a different EventBus event, and the annotator buttons are enabled when a file is loaded.
        const toolsToDisable = this._disabledTools.filter(x => x !== 'textEditor' && x !== 'drawEditor' && x !== 'textAnnotator' && x !== 'drawAnnotator');
        for (const toolId of toolsToDisable) {

            const translation = this._localisationService.Translate(this.toolTypeTranslationMap[toolId].disabled);
            this.pdfjsContext.setToolDisabled(toolId);
            this.pdfjsContext.setToolTitle(toolId, translation);
        }

        // Hide the tools that have been requested to be hidden.
        for (const toolId of this._hiddenTools) {
            this.pdfjsContext.setToolHidden(toolId);
        }
    }

    private onFileLoaded() {
        this.assertPdfjsContextExists();

        // Hook annotation classes
        this._layerManager = new LayerManager(this.loggingProvider, this.pdfjsContext);
        this._textAnnotator = new TextAnnotator(this.loggingProvider, this.pdfjsContext, this._layerManager);
        this._drawAnnotator = new DrawAnnotator(this.loggingProvider, this.pdfjsContext, this._layerManager);

        // Hook document-specific events.
        this.pdfjsContext.documentMouseUp.subscribe(() => this.onDocumentMouseUp());
    }

    private async onDocumentMouseUp() {
        this.assertFileLoaded();

        // Proceed if we are working on a text annotation.
        if (this._annotationMode !== 'text') {
            return;
        }

        // Proceed if we have an uncompleted annotation with no reference.
        if (!this.uncompletedAnnotation) {
            return;
        }

        const annotation = this.uncompletedAnnotation;
        const selectionContext = this.pdfjsContext.getSelectedTextContext();
        
        if (selectionContext == null) {
            return;
        }
        
        // Ensure the pages match sao we avoid selections on a different page.
        if (this.uncompletedAnnotation.page !== selectionContext.page) {
            this.loggingProvider.sendDebug(`Text annotation selection, pages do not match (${this.uncompletedAnnotation.page} !== ${selectionContext.page}).`, this._defaultLogSource);
            return;
        }

        // Set the annotation reference. This also marks it as "complete", making it a regular array.
        annotation.reference = { ...selectionContext };

        this.textAnnotator.annotateSelection(selectionContext, annotation.id);
        this.stopAnnotating();

        // Check if the sidebar exists if enabled.
        if (!this.sidebarComponent && this.sidebarEnabled) {
            throw new Error('Expected the sidebar component to exist when enabled.');
        }

        this.sidebarComponent?.expand();
        this.stateHasChanged();

        // Color directly instead of rerendering the page.
        // This will show the resulting rectangle even when there are focussed annotations that are shown.
        // TODO: Rerender anyway and automatically focus the annotation in order to keep it rendered?
        this.textAnnotator.colorById(this.defaultTextAnnotationColor, annotation.id);
        this.saveAnnotation(annotation);
    }

    private beginNewAnnotation(type: AnnotationType) {
        this.loggingProvider.sendDebug(`Start new ${type} annotation...`, this._defaultLogSource);
        this.assertFileLoaded();

        if (this.annotationMode !== 'none') {
            this.stopAnnotating();
        }

        this.setAnnotationMode(type);

        const targetPage = this.pdfjsContext.page;
        const newAnnotation = new Annotation(type, targetPage);
        this._annotations.push(newAnnotation);

        // Draw annotations have their pending canvas enabled for drawing.
        // We listen for mouse input to allow drawing.
        if (type === 'draw') {
            this.drawAnnotator.enableDrawCanvas(targetPage, true);
        }

        this.pdfjsContext.dispatchEventBus('pendingAnnotationStarted', {
            source: this,
            annotation: newAnnotation,
        });
    }

    public setAnnotationMode(type: AnnotationType) {
        if (this.annotationMode !== 'none') {
            this.loggingProvider.sendWarning(`Tried to set the annotation mode to ${type}, but it is currently ${this.annotationMode}.`, this._defaultLogSource);
        }

        this._annotationMode = type;
    }

    public stopAnnotating() {
        this.assertFileLoaded();

        if (this.annotationMode === 'none') {
            this.loggingProvider.sendWarning(`Tried to stop the annotating, but it is already stopped.`, this._defaultLogSource);
        }

        // Make sure to delete pending annotations if they exist.
        if (this.uncompletedAnnotation) {

            // Make sure draw annotations have their pending canvas disabled.
            if (this.uncompletedAnnotation.type === 'draw') {
                this.drawAnnotator.disableDrawCanvas(this.uncompletedAnnotation.page, true);
                this.drawAnnotator.clearCanvas(this.uncompletedAnnotation.page, true);
            }

            this.deletePendingAnnotation(this.uncompletedAnnotation);
        }

        this._annotationMode = 'none';
    }

    private deletePendingAnnotation(annotation: Annotation) {

        if (annotation.state !== 'pending') {
            this.loggingProvider.sendWarning(`Tried to delete annotation ${annotation.id} which is not pending.`, this._defaultLogSource);
            return;
        }

        this.loggingProvider.sendDebug(`Deleting pending annotation: ${annotation.id}`, this._defaultLogSource);
        this.assertPdfjsContextExists();
        this.pdfjsContext.dispatchEventBus('pendingAnnotationDeleted', {
            source: this,
            annotation,
        });
        this._annotations = this._annotations.filter(x => x.id !== annotation.id);
    }

    private async onPagesLoaded() {

        this.assertPdfjsContextExists();
        this.loggingProvider.sendDebug('Pages have been loaded.', this._defaultLogSource)
    }

    private onPageRendered({ pageNumber }: PageRenderedEventType) {
        this.assertFileLoaded();

        this.fetchAnnotationsForPage(pageNumber);
        this.textAnnotator.renderLayer(pageNumber);
        this.drawAnnotator.renderLayers(pageNumber, (e, type) => this.canvasOnMouse(e, type));
    }

    private async textLayerRendered({ pageNumber }: TextLayerRenderedEventType) {

        // Wait for the page fetch to finish.
        await this.waitForPageAnnotations(pageNumber);

        this.annotateTextPage(pageNumber);
        this.colorTextAnnotationPage(pageNumber, 'onlyFocusedElseUnfocused', true);
        this.colorDrawAnnotationPage(pageNumber, 'onlyFocusedElseUnfocused', true);
    }

    private canvasOnMouse(event: MouseEvent, type: canvasMouseType) {

        this.assertFileLoaded();

        const annotation = this.uncompletedAnnotation;
        if (!annotation || annotation.type !== 'draw') {
            this.loggingProvider.sendWarning('The uncompleted annotation was not found, or is not a draw annotation.', this._defaultLogSource);
            return;
        }

        // TODO: Check if we draw the right page, even if it's not possible.
        // TODO: Cache the pending canvas we draw on to make this faster?

        const annotationBounds = annotation.tryGetBoundingBox();

        // When the annotation has no start reference, and the mouse is pressed.
        if (!annotationBounds?.start && type === 'mousedown') {
            const relativePosition = this.drawAnnotator.getRelativePosition(annotation.page, true, event);
            if (!relativePosition) {
                this.loggingProvider.sendWarning('Relative position could not be determined for the mouse event.', this._defaultLogSource);
                return;
            }

            annotation.reference = {
                start: { ...relativePosition }
            }
        }

        // When the annotation has a start reference, and the mouse is being moved on the canvas.
        if (annotationBounds?.start && type === 'mousemove') {
            const relativePosition = this.drawAnnotator.getRelativePosition(annotation.page, true, event);
            if (!relativePosition) {
                this.loggingProvider.sendWarning('Relative position could not be determined for the mouse event.', this._defaultLogSource);
                return;
            }

            const boundingBox: boundingBox = {
                start: annotationBounds.start,
                end: relativePosition
            }

            const drawData: drawData = {
                id: annotation.id,
                color: this.defaultPendingDrawAnnotationColor,
                borderWidth: 1,
                bounds: boundingBox,
            }
            this.drawAnnotator.drawCanvasRectangle(annotation.page, true, true, drawData);
        }

        // When the annotation has a start reference, and the mouse button goes up.
        if (annotationBounds?.start && type === 'mouseup') {
            const relativePosition = this.drawAnnotator.getRelativePosition(annotation.page, true, event);
            if (!relativePosition) {
                this.loggingProvider.sendWarning('Relative position could not be determined for the mouse event.', this._defaultLogSource);
                return;
            }

            const boundingBox: boundingBox = {
                start: { ...annotationBounds.start },
                end: { ...relativePosition }
            }

            const drawData: drawData = {
                id: annotation.id,
                color: this.defaultDrawAnnotationColor,
                borderWidth: 1,
                bounds: boundingBox,
            }

            this.drawAnnotator.clearCanvas(annotation.page, true);
            this.drawAnnotator.disableDrawCanvas(annotation.page, true);

            annotation.reference = boundingBox;
            this.stopAnnotating();

            // Check if the sidebar exists if enabled.
            if (!this.sidebarComponent && this.sidebarEnabled) {
                throw new Error('Expected the sidebar component to exist when enabled.');
            }

            this.sidebarComponent?.expand();
            this.stateHasChanged();

            // Color directly instead of rerendering the page.
            // This will show the resulting rectangle even when there are focussed annotations that are shown.
            // TODO: Rerender anyway and automatically focus the annotation in order to keep it rendered?
            this.drawAnnotator.drawCanvasRectangle(annotation.page, false, false, drawData);
            this.saveAnnotation(annotation);
        }
    }

    private iframeResize() {
        // Set annotate info width.
        this._annotateInfo.nativeElement.style.width = `${this._iframeWrapper.nativeElement.offsetWidth}px`;

        // Set the y position of the info to the iframe.
        this._annotateInfo.nativeElement.style.top = `${this._iframeWrapper.nativeElement.getBoundingClientRect().top + 32}px`;
    }

    private onDocumentLoaded() {

        this.assertPdfjsContextExists();

        // Enable the text and draw annotator if not disabled.
        const disabledAnnotationButtons = this._disabledTools.filter(x => x === 'textAnnotator' || x === 'drawAnnotator');
        if (!disabledAnnotationButtons.includes('drawAnnotator')) {
            const enabledTranslation = this._localisationService.Translate(this.toolTypeTranslationMap["drawAnnotator"].enabled);
            this.pdfjsContext.setToolDisabled("drawAnnotator", false);
            this.pdfjsContext.setToolTitle("drawAnnotator", enabledTranslation);
        }
        if (!disabledAnnotationButtons.includes('textAnnotator')) {
            const enabledTranslation = this._localisationService.Translate(this.toolTypeTranslationMap["textAnnotator"].enabled);
            this.pdfjsContext.setToolDisabled("textAnnotator", false);
            this.pdfjsContext.setToolTitle("textAnnotator", enabledTranslation);
        }

        const pageCount = this.pdfjsContext.pages?.length;
        if (!pageCount) {
            throw new Error('Expected the page count to exist.');
        }

        // Fill the list of promises
        this._annotationPagePromises = Array.from({ length: pageCount }, () => {
            return new DeferredPromise();
        });

        this.loggingProvider.sendDebug('Document has been loaded.', this._defaultLogSource)
    }

    private async onAnnotationCommentSubmit(event: AnnotationCommentSubmitEventType) {

        if (!this.sidebarComponent) {
            throw new Error('Unable to submit comment: sidebar component was not found.');
        }

        const annotationComponent = this.sidebarComponent.annotationComponents.find(x => x.annotation === event.annotation);
        if (!annotationComponent) {
            throw new Error(`Expected the annotation component for ${event.annotation.id} to exist.`);
        }

        event.annotation.comments.push(event.comment);

        if (!this.annotationsCommentSaveProvider) {
            this.loggingProvider.sendWarning(`Please provide a value for \`annotationsCommentSaveProvider\` in order to save annotation comments.`, this._defaultLogSource);
        }
        else {
            annotationComponent.inputLoading = true;
            this.stateHasChanged();

            await this.annotationsCommentSaveProvider(event.annotation, event.comment);
            annotationComponent.inputLoading = false;
        }

        this.stateHasChanged();
    }

    private async onAnnotationDelete({ annotation }: AnnotationDeleteEventType) {

        this.assertFileLoaded();

        // Get the annotation component. This should also exist if the sidebar is enabled.
        const uncompletedAnnotationComponent = this.sidebarComponent?.annotationComponents.find(x => x.annotation == annotation);
        if (this.sidebarEnabled && !uncompletedAnnotationComponent) {
            throw new Error(`Expected the annotation component for ${annotation.id} to exist.`);
        }

        if (!this.annotationsDeleteProvider) {
            this.loggingProvider.sendWarning(`Please provide a value for \`annotationsDeleteProvider\` in order to delete annotations.`, this._defaultLogSource);
        }

        this.loggingProvider.sendDebug(`Deleting annotaton ${annotation.id}...`, this._defaultLogSource);
        if (uncompletedAnnotationComponent) {
            uncompletedAnnotationComponent.loading = true;
            this.stateHasChanged();
        }

        await this.annotationsDeleteProvider?.(annotation);
        
        // This is not really needed since the component is removed, but let's do it anyway.
        if (uncompletedAnnotationComponent) {
            uncompletedAnnotationComponent.loading = false;
            this.stateHasChanged();
        }

        // Text annotations need to be explicitly removed.
        if (annotation.type === 'text') {
            this.textAnnotator.removeAnnotationById(annotation.id);
        }

        this._annotations = this._annotations.filter(x => x.id !== annotation.id);
        this.rerenderAnnotationsPage(annotation.page);

        this.pdfjsContext.dispatchEventBus('annotationDeleted', {
            source: this,
            annotation,
        });
    }

    private async saveAnnotation(annotation: Annotation) {

        // Get the annotation component. This should also exist if the sidebar is enabled.
        const uncompletedAnnotationComponent = this.sidebarComponent?.annotationComponents.find(x => x.annotation == annotation);
        if (this.sidebarEnabled && !uncompletedAnnotationComponent) {
            throw new Error(`Expected the annotation component for ${annotation.id} to exist.`);
        }

        if (!this.annotationsSaveProvider) {
            this.loggingProvider.sendWarning(`Please provide a value for \`annotationsSaveProvider\` in order to save annotations.`, this._defaultLogSource);
        }

        this.loggingProvider.sendDebug(`Saving annotaton ${annotation.id}...`, this._defaultLogSource);
        if (uncompletedAnnotationComponent) {
            uncompletedAnnotationComponent.loading = true;
            this.stateHasChanged();
        }

        await this.annotationsSaveProvider?.(annotation);
        
        if (uncompletedAnnotationComponent) {
            uncompletedAnnotationComponent.loading = false;
            this.stateHasChanged();
        }
    }

    private onAnnotationFocus({ annotation }: AnnotationFocusEventType) {
        this.assertFileLoaded();

        this.loggingProvider.sendDebug(`Focusing ${annotation.id}...`, this._defaultLogSource);
        this.rerenderAnnotationsPage(annotation.page);
        this.stateHasChanged();
    }

    private onAnnotationUnfocus({ annotation }: AnnotationUnfocusEventType) {
        this.assertFileLoaded();

        this.loggingProvider.sendDebug(`Unfocusing ${annotation.id}...`, this._defaultLogSource);
        this.rerenderAnnotationsPage(annotation.page);
        this.stateHasChanged();
    }

    private onAnnotationEditorModeChanged(event: AnnotationEditorModeChangedEventType) {

        this.assertPdfjsContextExists();

        // Check if the mode is an action that is not disabled.
        if (event.mode === AnnotationEditorType.disable) {
            return;
        }

        // If the text editor or draw editor must be disabled, disable them if the annotation mode changed to not disabled.
        const toolsToDisable = this._disabledTools.filter(x => x === 'textEditor' || x === 'drawEditor');
        for (const toolId of toolsToDisable) {
            
            const translation = this._localisationService.Translate(this.toolTypeTranslationMap[toolId].disabled);

            this.pdfjsContext.setToolDisabled(toolId);
            this.pdfjsContext.setToolTitle(toolId, translation);
        }
    }

    public async onPageChanging() {

        if (this.annotationMode !== 'none') {
            this.stopAnnotating();
            this.stateHasChanged();
        }
    }

    private rerenderAnnotationsPage(pageNumber: number) {
        this.assertFileLoaded();

        this.removeTextAnnotationColorPage(pageNumber);
        this.colorTextAnnotationPage(pageNumber, 'onlyFocusedElseUnfocused', true);

        this.drawAnnotator.clearCanvas(pageNumber, false);
        this.colorDrawAnnotationPage(pageNumber, 'onlyFocusedElseUnfocused', true);
    }

    private annotateTextPage(page: number) {
        this.assertFileLoaded();

        const annotations = this.annotations.filter(x => x.page === page);
        this.annotateText(annotations);
    }

    private annotateText(annotations: Annotation[]) {
        this.assertFileLoaded();

        // Group by page
        const pagesAnnotations = groupByKey(annotations, 'page');

        for (const entry of pagesAnnotations) {

            const page = entry[0]
            const annotations = entry[1];

            // Check if page loaded.
            const pageContext = this.pdfjsContext.pages?.find(x => x.page === page);
            if (!pageContext || !pageContext.loaded) {
                this.loggingProvider.sendWarning(`Tried to annotate text annotations on unknown or unloaded page ${page}`, this._defaultLogSource);
                return;
            }

            for (const annotation of annotations) {

                // Not a text annotation
                if (annotation.type !== 'text') {
                    continue;
                }
    
                // Already annotated.
                if (this.textAnnotator.annotatedIds.includes(annotation.id)) {
                    continue;
                }
    
                const textSelection = annotation.tryGetTextSelection();
                if (!textSelection) {
                    this.loggingProvider.sendWarning(`Unable to annotate ${annotation.id}: not a valid text annotation.`, this._defaultLogSource);
                    continue;
                }
    
                this.textAnnotator.annotateXpath(textSelection.xpath, textSelection.selectedText, page, annotation.id);
            }
        }
    }

    private removeTextAnnotationColorPage(page: number) {
        this.assertFileLoaded();

        const annotations = this.annotations.filter(x => x.page === page && x.type === 'text');
        for(const annotation of annotations) {
            this.textAnnotator.removeColorById(annotation.id);
        }
    }

    private colorTextAnnotationPage(page: number, showAnnotations: showAnnotationsType = 'all', showAsFocused = true) {
        this.assertFileLoaded();

        const annotations = this.annotations.filter(x => x.page === page);
        this.colorTextAnnotation(annotations, showAnnotations, showAsFocused);
    }

    private colorTextAnnotation(annotations: Annotation[], showAnnotations: showAnnotationsType = 'all', showAsFocused = true) {
        this.assertFileLoaded();

        // If we only want to show focused annotations, filter the given annotations by focused.
        if (showAnnotations !== 'all') {
            const focusedAnnotations = annotations.filter(x => x.focused);
            switch(showAnnotations) {

                // Assign even if empty.
                case "onlyFocused":
                    annotations = focusedAnnotations;
                    break;

                // Only assign if empty.
                case "onlyFocusedElseUnfocused":
                    if (focusedAnnotations.length > 0) {
                        annotations = focusedAnnotations;
                    }
                    break;

                // Fallback prevents unused types, should more be added.
                // These should be properly handled.
                default:
                    // eslint-disable-next-line no-case-declarations, @typescript-eslint/no-unused-vars
                    const defaultPreventUnusedType: never = showAnnotations;
            }
        }

        // Filter to text only, and then group them by page.
        annotations = annotations.filter(x => x.type === 'text');
        const pagesAnnotations = groupByKey(annotations, 'page');

        for (const entry of pagesAnnotations) {

            const page = entry[0]
            const annotations = entry[1];

            // Check if page loaded.
            const pageContext = this.pdfjsContext.pages?.find(x => x.page === page);
            if (!pageContext || !pageContext.loaded) {
                this.loggingProvider.sendWarning(`Tried to color text annotations on unknown or unloaded page ${page}`, this._defaultLogSource);
                return;
            }

            for (const annotation of annotations) {
    
                // Already colored.
                if (this.textAnnotator.coloredIds.includes(annotation.id)) {
                    continue;
                }
    
                const color = showAsFocused && annotation.focused ? this.defaultTextAnnotationFocusColor : this.defaultTextAnnotationColor;
                this.textAnnotator.colorById(color, annotation.id);
            }
        }
    }

    private colorDrawAnnotationPage(page: number, showAnnotations: showAnnotationsType = 'all', showAsFocused = true) {
        this.assertFileLoaded();

        const annotations = this.annotations.filter(x => x.page === page);
        this.colorDrawAnnotation(annotations, showAnnotations, showAsFocused);
    }

    private colorDrawAnnotation(annotations: Annotation[], showAnnotations: showAnnotationsType = 'all', showAsFocused = true) {
        this.assertFileLoaded();

        // If we only want to show focused annotations, filter the given annotations by focused.
        if (showAnnotations !== 'all') {
            const focusedAnnotations = annotations.filter(x => x.focused);
            switch(showAnnotations) {

                // Assign even if empty.
                case "onlyFocused":
                    annotations = focusedAnnotations;
                    break;

                // Only assign if empty.
                case "onlyFocusedElseUnfocused":
                    if (focusedAnnotations.length > 0) {
                        annotations = focusedAnnotations;
                    }
                    break;

                // Fallback prevents unused types, should more be added.
                // These should be properly handled.
                default:
                    // eslint-disable-next-line no-case-declarations, @typescript-eslint/no-unused-vars
                    const defaultPreventUnusedType: never = showAnnotations;
            }
        }

        // Filter to draw only, and then group them by page.
        annotations = annotations.filter(x => x.type === 'draw');
        const pagesAnnotations = groupByKey(annotations, 'page');

        for (const entry of pagesAnnotations) {

            const page = entry[0]
            const annotations = entry[1];

            // Check if page loaded.
            const pageContext = this.pdfjsContext.pages?.find(x => x.page === page);
            if (!pageContext || !pageContext.loaded) {
                this.loggingProvider.sendWarning(`Tried to color draw annotations on unknown or unloaded page ${page}`, this._defaultLogSource);
                return;
            }

            // Get the draw data.
            const drawDataCollection = annotations.map(x => this.getDrawData(x, showAsFocused));

            // Filter annotations already drawn, drawAnnotator is guaranteed to exist.
            const filteredDrawData = drawDataCollection.filter(x => !this.drawAnnotator?.coloredIds.includes(x.id));
            if (filteredDrawData.length === 0) {
                return;
            }

            this.drawAnnotator.drawCanvasRectangle(page, false, false, ...filteredDrawData);
        }
    }

    private getDrawData(annotation: Annotation, showAsFocused: boolean): drawData {
        const boundingBox = annotation.tryGetCompletedBoundingBox();
        if (!boundingBox) {
            throw new Error(`Unable to annotate ${annotation.id}: not a valid draw annotation, or the bounding box is not complete.`);
        }

        const color = showAsFocused && annotation.focused ? this.defaultDrawAnnotationFocusColor : this.defaultDrawAnnotationColor;
        return {
            id: annotation.id,
            color,
            borderWidth: 1,
            bounds: boundingBox,
        }
    }

    public async fetchAnnotationsForPage(page: number)
    {
        this.assertPdfjsContextExists();

        // Already fetching
        if (this._fetchingAnnotationPages.find(x => x === page)) {
            this.loggingProvider.sendDebug(`Aborting fetch because page ${page} is already being fetched. Waiting for completion...`, this._defaultLogSource);
            await this.waitForPageAnnotations(page);
            return;
        }

        // Previously fetched.
        if (this._fetchedAnnotationPages.find(x => x === page)) {
            return;
        }

        this._fetchingAnnotationPages.push(page);

        // Check if the provider is set.
        if (!this.annotationsProvider) {
            this.loggingProvider.sendWarning(`Please provide a value for \`annotationsProvider\` in order to asynchronously fetch annotations for page ${page}.`, this._defaultLogSource);
            return;
        }

        this.loggingProvider.sendDebug(`Fetching annotations for page ${page}...`, this._defaultLogSource);

        // Disable the annotation buttons if not already disabled.
        const drawAnnotatorDisabled = this.pdfjsContext.getToolDisabled("drawAnnotator");
        const textAnnotatorDisabled = this.pdfjsContext.getToolDisabled("textAnnotator");
        if (!drawAnnotatorDisabled) {
            const disabledTranslation = this._localisationService.Translate(this.toolTypeTranslationMap["drawAnnotator"].disabled);
            this.pdfjsContext.setToolDisabled("drawAnnotator", true);
            this.pdfjsContext.setToolTitle("drawAnnotator", disabledTranslation);
        }
        if (!textAnnotatorDisabled) {
            const disabledTranslation = this._localisationService.Translate(this.toolTypeTranslationMap["textAnnotator"].disabled);
            this.pdfjsContext.setToolDisabled("textAnnotator", true);
            this.pdfjsContext.setToolTitle("textAnnotator", disabledTranslation);
        }
        
        const annotations = await this.annotationsProvider(page);

        // Enable the annotation buttons if not explicitly disabled through the settings, and if it wasn't already disabled.
        const disabledAnnotationButtons = this._disabledTools.filter(x => x === 'textAnnotator' || x === 'drawAnnotator');
        if (!drawAnnotatorDisabled && !disabledAnnotationButtons.includes('drawAnnotator')) {
            const enabledTranslation = this._localisationService.Translate(this.toolTypeTranslationMap["drawAnnotator"].enabled);
            this.pdfjsContext.setToolDisabled("drawAnnotator", false);
            this.pdfjsContext.setToolTitle("drawAnnotator", enabledTranslation);
        }
        if (!textAnnotatorDisabled && !disabledAnnotationButtons.includes('textAnnotator')) {
            const enabledTranslation = this._localisationService.Translate(this.toolTypeTranslationMap["textAnnotator"].enabled);
            this.pdfjsContext.setToolDisabled("textAnnotator", false);
            this.pdfjsContext.setToolTitle("textAnnotator", enabledTranslation);
        }

        this._fetchingAnnotationPages = this._fetchingAnnotationPages.filter(x => x !== page);
        this._fetchedAnnotationPages.push(page);

        this.annotations.push(...annotations);
        this.markPageAnnotationsFetched(page);
    }

    public async fetchSidebarAnnotationsForPage(page: number) {
        await this.waitForPageAnnotations(page);
        return this.annotations.filter(x => x.page === page);
    }

    public waitForPageAnnotations(page: number) {
        this.assertFileLoaded();
        return this.annotationPagePromises[page - 1] as Promise<void>;
    }

    public markPageAnnotationsFetched(page: number) {
        this.assertFileLoaded();
        this.annotationPagePromises[page - 1].resolve();
    }

    public assertPdfjsContextExists(): asserts this is this & {
        pdfjsContext: PdfjsContext;
    } {
        if (!this.pdfjsContext) {
            throw new Error('The PDFJS context could not be found.');
        }
    }

    public assertFileLoaded(): asserts this is this & {
        pdfjsContext: PdfjsContext;
        layerManager: LayerManager;
        textAnnotator: TextAnnotator;
        drawAnnotator: DrawAnnotator;
        annotationPagePromises: DeferredPromise[];
    } {
        this.assertPdfjsContextExists();
        if (this.pdfjsContext.fileState !== 'loaded') {
            throw new Error('No file is currently loaded.');
        }
    }

    public stateHasChanged() {
        this.changeDetector.detectChanges();
    }
}