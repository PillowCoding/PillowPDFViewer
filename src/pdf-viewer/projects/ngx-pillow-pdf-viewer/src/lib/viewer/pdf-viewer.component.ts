import { ChangeDetectorRef, Component, ElementRef, Input, OnInit, ViewChild } from "@angular/core";
import PdfjsContext, { annotateDrawId, annotateTextId, toolType } from "ngx-pillow-pdf-viewer/pdfjsContext";
import pdfjsContext from "ngx-pillow-pdf-viewer/pdfjsContext";
import DefaultLoggingProvider from "ngx-pillow-pdf-viewer/utils/logging/defaultLoggingProvider";
import LoggingProvider from "ngx-pillow-pdf-viewer/utils/logging/loggingProvider";
import { AnnotationCommentSubmitEventType, AnnotationEditorModeChangedEventType, AnnotationEditorType, PageRenderedEventType } from "../types/eventBus";
import { AnnotationType } from "ngx-pillow-pdf-viewer/annotation/annotationTypes";
import annotation, { AnnotationComment } from "ngx-pillow-pdf-viewer/annotation/annotation";
import { PdfSidebarComponent, annotationsProviderDelegate } from "ngx-pillow-pdf-viewer/sidebar/pdf-sidebar.component";
import TextAnnotator from "ngx-pillow-pdf-viewer/annotator/textAnnotator";
import LayerManager from "ngx-pillow-pdf-viewer/annotator/layerManager";

export type annotationsSaveProviderDelegate = (annotation: annotation) => void | Promise<void>;
export type annotationsCommentSaveProviderDelegate = (annotation: annotation, comment: AnnotationComment) => void | Promise<void>;

@Component({
    selector: 'lib-pdf-viewer',
    templateUrl: 'pdf-viewer.component.html',
    styleUrls: ['pdf-viewer.component.scss', './../common.scss']
})
export class PdfViewerComponent implements OnInit {
    /** The iframe wrapper used to display the pdfjs viewer. */
    @ViewChild('iframeWrapper', { static: true }) private _iframeWrapper!: ElementRef<HTMLIFrameElement>;

    /** The sidebar of the viewer */
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

    /** If the annotations are retrieved synchronously, this input can be used to give them before the pdf has loaded.
     * Note that any asynchronous fetches should be done using the `annotationProvider` input.
     */
    @Input()
    public set annotations(annotations: annotation[]) {

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
        return this._annotations.filter(x => x.state !== 'completed')[0];
    }

    /** The provider that will fetch annotations asynchronously. */
    @Input() public annotationsProvider?: annotationsProviderDelegate;

    /** The provider that will save annotations. */
    @Input() public annotationsSaveProvider?: annotationsSaveProviderDelegate;

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

        if (!this._sidebar) {
            throw new Error('The sidebar component could not be found.');
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

    private readonly _defaultLogSource = PdfViewerComponent.name;

    private _relativeViewerPath?: string;
    private _fileSource?: string | Blob | Uint8Array;
    private _loggingProvider?: LoggingProvider;
    private _pdfjsContext?: pdfjsContext;
    private _layerManager?: LayerManager;
    private _textAnnotator?: TextAnnotator;
    private _disabledTools: toolType[] = [];
    private _annotations: annotation[] = [];
    private _annotationMode: AnnotationType | 'none' = 'none';

    private readonly _pendingAnnotateColor = '#00800040';

    // Keeps track of pages that have had their annotations fetched.
    private readonly _fetchedAnnotationPages: number[] = [];

    constructor(
        private changeDetector: ChangeDetectorRef
    ) {
        this.fetchAnnotationsForPage = this.fetchAnnotationsForPage.bind(this);
    }

    ngOnInit(): void {
        if (!this._relativeViewerPath) {
            this._relativeViewerPath = 'assets/pdfjs/web/viewer.html';
        }
        if (!this._loggingProvider) {
            this._loggingProvider = new DefaultLoggingProvider([], 50);
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
        this.pdfjsContext.subscribeEventBus('documentloaded', () => this.loggingProvider.sendDebug('Document has been loaded.', this._defaultLogSource));
        this.pdfjsContext.subscribeEventBus('pagesinit', () => this.loggingProvider.sendDebug('Pages are loading...', this._defaultLogSource));
        this.pdfjsContext.subscribeEventBus('annotationCommentSubmit', (e) => this.onAnnotationCommentSubmit(e));

        // this.pdfjsContext.subscribeEventBus('resetlayers', (e) => console.log('resetlayers', e));
        // this.pdfjsContext.subscribeEventBus('textlayerrendered', (e) => console.log('textlayerrendered', e));
        // this.pdfjsContext.subscribeEventBus('layersloaded', (e) => console.log('layersloaded', e));
        // this.pdfjsContext.subscribeEventBus('pagerender', (e) => console.log('pagerender', e));

        // Inject the text and draw annotation tool buttons.
        const textAnnotateStyle = `
            #${annotateTextId}::before
            {
                -webkit-mask-image: var(--toolbarButton-editorFreeText-icon);
            }
        `;
        const drawAnnotateStyle = `
            #${annotateDrawId}::before
            {
                -webkit-mask-image: var(--toolbarButton-editorInk-icon);
            }
        `;

        const sharedStyle = `
            #${annotateDrawId}::after, #${annotateTextId}::after
            {
                content: 'A';
                font-size: 8px;
                position: absolute;
                left: 4px;
                top: 4px;

                color: var(--main-color);
                opacity: var(--toolbar-icon-opacity);
            }
            #${annotateDrawId}::before, #${annotateTextId}::before
            {
                color: var(--main-color);
                opacity: var(--toolbar-icon-opacity);
            }
        `;

        const annotateDrawButton = this.pdfjsContext.insertToolButton(annotateDrawId, 'beforebegin', 'textEditor', true);
        const annotateTextButton = this.pdfjsContext.insertToolButton(annotateTextId, 'beforebegin', annotateDrawId, true);
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

    private onFileLoaded() {
        this.assertPdfjsContextExists();

        // Hook annotation classes
        this._layerManager = new LayerManager(this.loggingProvider, this.pdfjsContext);
        this._textAnnotator = new TextAnnotator(this.loggingProvider, this.pdfjsContext, this._layerManager);

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
        if (!this.uncompletedAnnotation || this.uncompletedAnnotation.state !== 'pending') {
            return;
        }

        const annotation = this.uncompletedAnnotation;
        const selectionContext = this.pdfjsContext.getSelectedTextContext();
        
        if (selectionContext == null) {
            return;
        }

        // Set the annotation reference. This also marks it as "complete", making it a regular array.
        annotation.setAnnotationReference({
            ...selectionContext
        });

        this.textAnnotator.annotateSelection(selectionContext, annotation.id);
        this.textAnnotator.colorById(annotation.id, this._pendingAnnotateColor);

        this.sidebarComponent.expand();
        this.stateHasChanged();

        const uncompletedAnnotationComponent = this.sidebarComponent.annotationComponents.find(x => x.annotation == annotation);
        if (!uncompletedAnnotationComponent) {
            throw new Error(`Expected the annotation component for ${annotation.id} to exist.`);
        }

        if (!this.annotationsSaveProvider) {
            this.loggingProvider.sendWarning(`Please provide a value for \`annotationsSaveProvider\` in order to save annotations.`, this._defaultLogSource);
        }
        else {
            uncompletedAnnotationComponent.loading = true;
            this.stateHasChanged();

            await this.annotationsSaveProvider(annotation);
            uncompletedAnnotationComponent.loading = false;
        }

        this.stateHasChanged();
    }

    private beginNewAnnotation(type: AnnotationType) {
        this.loggingProvider.sendDebug(`Start new ${type} annotation...`, this._defaultLogSource);
        this.assertPdfjsContextExists();

        const uncompletedAnnotation = this.uncompletedAnnotation;
        if (uncompletedAnnotation) {
            this.deleteAnnotation(uncompletedAnnotation);
        }

        this._annotationMode = type;
        const newAnnotation = new annotation({ type, page: 1 });
        this._annotations.push(newAnnotation);
        this.pdfjsContext.dispatchEventBus('annotationStarted', {
            source: this,
            annotation: newAnnotation,
        });
    }

    private deleteAnnotation(annotation: annotation) {
        this.loggingProvider.sendDebug(`Deleting ${annotation.state} annotation: ${annotation.id}`, this._defaultLogSource);
        this.assertPdfjsContextExists();
        this.pdfjsContext.dispatchEventBus('annotationDeleted', {
            source: this,
            annotation,
        });
        this._annotations = this._annotations.filter(x => x.id !== annotation.id);
    }

    private onPagesLoaded() {

        this.assertPdfjsContextExists();

        // Enable the annotation buttons
        this.pdfjsContext.setToolDisabled(annotateDrawId, false);
        this.pdfjsContext.setToolDisabled(annotateTextId, false);

        this.loggingProvider.sendDebug('Pages have been loaded.', this._defaultLogSource)
    }

    private onPageRendered(event: PageRenderedEventType) {
        this.assertFileLoaded();
        this.textAnnotator.onPageRendered(event);
    }

    private async onAnnotationCommentSubmit(event: AnnotationCommentSubmitEventType) {

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

    private onAnnotationEditorModeChanged(event: AnnotationEditorModeChangedEventType) {

        this.assertPdfjsContextExists();

        // Check if the mode is an action that is not disabled.
        if (event.mode === AnnotationEditorType.disable) {
            return;
        }

        // If the text editor or draw editor must be disabled, disable them if the annotation mode changed to not disabled.
        const toolsToDisable = this._disabledTools.filter(x => x === 'textEditor' || x === 'drawEditor');
        for (const toolId of toolsToDisable) {
            this.pdfjsContext.setToolDisabled(toolId);
        }
    }

    public async fetchAnnotationsForPage(page: number)
    {
        this.assertPdfjsContextExists();

        // Previously fetched.
        if (this._fetchedAnnotationPages.some(x => x === page)) {
            return this._annotations.filter(x => x.page === page);
        }

        this._fetchedAnnotationPages.push(page);

        // Check if the provider is set.
        if (!this.annotationsProvider) {
            this.loggingProvider.sendWarning(`Please provide a value for \`annotationsProvider\` in order to asynchronously fetch annotations for page ${page}.`, this._defaultLogSource);
            return [];
        }

        this.loggingProvider.sendDebug(`Fetching annotations for page ${page}...`, this._defaultLogSource);
        return await this.annotationsProvider(page);
    }

    private assertPdfjsContextExists(): asserts this is this & {
        pdfjsContext: PdfjsContext;
    } {
        if (!this.pdfjsContext) {
            throw new Error('The PDFJS context could not be found.');
        }
    }

    private assertFileLoaded(): asserts this is this & {
        pdfjsContext: PdfjsContext;
        layerManager: LayerManager;
        textAnnotator: TextAnnotator;
    } {
        this.assertPdfjsContextExists();
        if (this.pdfjsContext.fileState !== 'loaded') {
            throw new Error('No file is currently loaded.');
        }
    }

    private stateHasChanged() {
        this.changeDetector.detectChanges();
    }
}