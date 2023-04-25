import { ChangeDetectorRef, Component, ElementRef, Input, OnInit, ViewChild } from "@angular/core";
import PdfjsContext, { annotateDrawId, annotateTextId, toolType } from "ngx-pillow-pdf-viewer/pdfjsContext";
import pdfjsContext from "ngx-pillow-pdf-viewer/pdfjsContext";
import DefaultLoggingProvider from "ngx-pillow-pdf-viewer/utils/logging/defaultLoggingProvider";
import LoggingProvider from "ngx-pillow-pdf-viewer/utils/logging/loggingProvider";
import { AnnotationCommentSubmitEventType, AnnotationEditorModeChangedEventType, AnnotationEditorType, PageChangingEventType, PageRenderedEventType } from "../types/eventBus";
import { AnnotationType } from "ngx-pillow-pdf-viewer/annotation/annotationTypes";
import Annotation, { AnnotationComment } from "ngx-pillow-pdf-viewer/annotation/annotation";
import { PdfSidebarComponent, annotationsProviderDelegate } from "ngx-pillow-pdf-viewer/sidebar/pdf-sidebar.component";
import TextAnnotator from "ngx-pillow-pdf-viewer/annotator/textAnnotator";
import LayerManager from "ngx-pillow-pdf-viewer/annotator/layerManager";
import DeferredPromise from "ngx-pillow-pdf-viewer/utils/deferredPromise";

export type annotationsSaveProviderDelegate = (annotation: Annotation) => void | Promise<void>;
export type annotationsCommentSaveProviderDelegate = (annotation: Annotation, comment: AnnotationComment) => void | Promise<void>;

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
    private _disabledTools: toolType[] = [];
    private _annotations: Annotation[] = [];
    private _annotationMode: AnnotationType | 'none' = 'none';

    private readonly _defaultAnnotateColor = '#00800040';

    // Keeps track of pages that have had their annotations fetched.
    private readonly _fetchedAnnotationPages: number[] = [];

    // Keeps track of pages that are having their annotations fetched.
    private _fetchingAnnotationPages: number[] = [];

    // Keeps an array of promises that can be awaited to wait for annotations to be fetched.
    private _annotationPagePromises?: DeferredPromise[];

    constructor(
        private changeDetector: ChangeDetectorRef
    ) {
        this.fetchSidebarAnnotationsForPage = this.fetchSidebarAnnotationsForPage.bind(this);
    }

    ngOnInit(): void {
        if (!this._relativeViewerPath) {
            this._relativeViewerPath = 'assets/pdfjs/web/viewer.html';
        }
        if (!this._loggingProvider) {
            this._loggingProvider = new DefaultLoggingProvider([/*'EventBus', 'PdfViewerComponent', 'PdfjsContext', 'TextAnnotator', 'DrawAnnotator', 'LayerManager', 'PdfSidebarComponent'*/], 50);
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
        this.pdfjsContext.subscribeEventBus('pagechanging', (e) => this.onPageChanging(e));
        this.pdfjsContext.subscribeEventBus('pagesdestroy', () => this.loggingProvider.sendDebug('Document has been unloaded.', this._defaultLogSource));
        this.pdfjsContext.subscribeEventBus('documentloaded', () => this.onDocumentLoaded());
        this.pdfjsContext.subscribeEventBus('pagesinit', () => this.loggingProvider.sendDebug('Pages are loading...', this._defaultLogSource));
        this.pdfjsContext.subscribeEventBus('annotationCommentSubmit', (e) => this.onAnnotationCommentSubmit(e));

        // this.pdfjsContext.subscribeEventBus('resetlayers', (e) => console.log('resetlayers', e));
        // this.pdfjsContext.subscribeEventBus('textlayerrendered', (e) => console.log('textlayerrendered', e));
        // this.pdfjsContext.subscribeEventBus('layersloaded', (e) => console.log('layersloaded', e));
        // this.pdfjsContext.subscribeEventBus('pagerender', (e) => console.log('pagerender', e));

        // Watch iframe resize
        // TODO: maybe store this observer is we plan on destroying it at some point.
        const observer = new ResizeObserver(() => this.iframeResize());
        observer.observe(this._iframeWrapper.nativeElement);

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
        
        // Ensure the pages match sao we avoid selections on a different page.
        if (this.uncompletedAnnotation.page !== selectionContext.page) {
            this.loggingProvider.sendDebug(`Text annotation selection, pages do not match (${this.uncompletedAnnotation.page} !== ${selectionContext.page}).`, this._defaultLogSource);
            return;
        }

        // Set the annotation reference. This also marks it as "complete", making it a regular array.
        annotation.setAnnotationReference({
            ...selectionContext
        });

        this.textAnnotator.annotateSelection(selectionContext, annotation.id);
        this.textAnnotator.colorById(this._defaultAnnotateColor, annotation.id);

        this.stopAnnotating();
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

        this.setAnnotationMode(type);
        const newAnnotation = new Annotation(type, 1);
        this._annotations.push(newAnnotation);
        this.pdfjsContext.dispatchEventBus('annotationStarted', {
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
        if (this.annotationMode === 'none') {
            this.loggingProvider.sendWarning(`Tried to stop the annotating, but it is already stopped.`, this._defaultLogSource);
        }

        // Make sure to delete pending annotations if they exist.
        if (this.uncompletedAnnotation) {
            this.deleteAnnotation(this.uncompletedAnnotation);
        }

        this._annotationMode = 'none';
    }

    private deleteAnnotation(annotation: Annotation) {
        this.loggingProvider.sendDebug(`Deleting ${annotation.state} annotation: ${annotation.id}`, this._defaultLogSource);
        this.assertPdfjsContextExists();
        this.pdfjsContext.dispatchEventBus('annotationDeleted', {
            source: this,
            annotation,
        });
        this._annotations = this._annotations.filter(x => x.id !== annotation.id);
    }

    private async onPagesLoaded() {

        this.assertPdfjsContextExists();

        // Enable the annotation buttons
        this.pdfjsContext.setToolDisabled(annotateDrawId, false);
        this.pdfjsContext.setToolDisabled(annotateTextId, false);

        await this.fetchAnnotationsForPage(this.pdfjsContext.page);
        this.loggingProvider.sendDebug('Pages have been loaded.', this._defaultLogSource)
    }

    private onPageRendered(event: PageRenderedEventType) {
        this.assertFileLoaded();
        this.textAnnotator.renderLayer(event.pageNumber);
    }

    private iframeResize() {
        // Set annotate info width.
        this._annotateInfo.nativeElement.style.width = `${this._iframeWrapper.nativeElement.offsetWidth}px`;

        // Set the y position of the info to the iframe.
        this._annotateInfo.nativeElement.style.top = `${this._iframeWrapper.nativeElement.getBoundingClientRect().top + 32}px`;
    }

    private onDocumentLoaded() {

        this.assertPdfjsContextExists();

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

    public async onPageChanging(event: PageChangingEventType) {

        // Remove the pending annotation if it exists.
        if (this.uncompletedAnnotation) {
            this.deleteAnnotation(this.uncompletedAnnotation);
        }

        await this.fetchAnnotationsForPage(event.pageNumber);
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
        const annotations = await this.annotationsProvider(page);

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