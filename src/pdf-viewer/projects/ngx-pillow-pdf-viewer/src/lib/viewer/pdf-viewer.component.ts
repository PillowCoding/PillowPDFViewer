import { ChangeDetectorRef, Component, ElementRef, Input, OnInit, ViewChild } from "@angular/core";
import PdfjsContext, { toolType } from "ngx-pillow-pdf-viewer/pdfjsContext";
import pdfjsContext from "ngx-pillow-pdf-viewer/pdfjsContext";
import DefaultLoggingProvider from "ngx-pillow-pdf-viewer/utils/logging/defaultLoggingProvider";
import LoggingProvider from "ngx-pillow-pdf-viewer/utils/logging/loggingProvider";
import { AnnotationEditorModeChangedEventType, AnnotationEditorType, PageRenderedEventType } from "../types/eventBus";
import { AnnotationType } from "ngx-pillow-pdf-viewer/annotation/annotationTypes";
import annotation from "ngx-pillow-pdf-viewer/annotation/annotation";
import { PdfSidebarComponent, annotationsProviderDelegate } from "ngx-pillow-pdf-viewer/sidebar/pdf-sidebar.component";
import TextAnnotator from "ngx-pillow-pdf-viewer/annotator/textAnnotator";
import LayerManager from "ngx-pillow-pdf-viewer/annotator/layerManager";

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

    private readonly _annotateTextId = 'annotate-text';
    private readonly _annotateDrawId = 'annotate-draw';
    private readonly _defaultLogSource = PdfViewerComponent.name;

    private _relativeViewerPath?: string;
    private _fileSource?: string | Blob | Uint8Array;
    private _loggingProvider?: LoggingProvider;
    private _pdfjsContext?: pdfjsContext;
    private _layerManager?: LayerManager;
    private _textAnnotator?: TextAnnotator;
    private _disabledTools?: toolType[];
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

        // this.pdfjsContext.subscribeEventBus('resetlayers', (e) => console.log('resetlayers', e));
        // this.pdfjsContext.subscribeEventBus('textlayerrendered', (e) => console.log('textlayerrendered', e));
        // this.pdfjsContext.subscribeEventBus('layersloaded', (e) => console.log('layersloaded', e));
        // this.pdfjsContext.subscribeEventBus('pagerender', (e) => console.log('pagerender', e));

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

    private onFileLoaded() {
        this.assertPdfjsContextExists();

        // Hook annotation classes
        this._layerManager = new LayerManager(this.loggingProvider, this.pdfjsContext);
        this._textAnnotator = new TextAnnotator(this.loggingProvider, this.pdfjsContext, this._layerManager);

        // Hook document-specific events.
        this.pdfjsContext.documentMouseUp.subscribe(() => this.onDocumentMouseUp());
    }

    private onDocumentMouseUp() {
        this.assertFileLoaded();

        // Proceed if we are working on a text annotation.
        if (this._annotationMode !== 'text') {
            return;
        }

        // Proceed if we have an uncompleted annotation with no reference.
        if (!this.uncompletedAnnotation || this.uncompletedAnnotation.state !== 'pending') {
            return;
        }

        const selectionContext = this.pdfjsContext.getSelectedTextContext();
        
        if (selectionContext == null) {
            return;
        }

        this.uncompletedAnnotation.setAnnotationReference({
            ...selectionContext
        });

        this.textAnnotator.annotateSelection(selectionContext, this.uncompletedAnnotation.id);
        this.textAnnotator.colorById(this.uncompletedAnnotation.id, this._pendingAnnotateColor);

        this.sidebarComponent.expand();
        this.stateHasChanged();

        const uncompletedAnnotationComponent = this.sidebarComponent.annotationComponents.find(x => x.annotation == this.uncompletedAnnotation);
        if (!uncompletedAnnotationComponent) {
            throw new Error(`Expected the annotation component for ${this.uncompletedAnnotation.id} to exist.`);
        }
        
        uncompletedAnnotationComponent.expand();
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
        this.pdfjsContext.setToolDisabled(this._annotateDrawId, false);
        this.pdfjsContext.setToolDisabled(this._annotateTextId, false);

        this.loggingProvider.sendDebug('Pages have been loaded.', this._defaultLogSource)
    }

    private onPageRendered(event: PageRenderedEventType) {
        this.assertFileLoaded();
        this.textAnnotator.onPageRendered(event);
    }

    private onAnnotationEditorModeChanged(event: AnnotationEditorModeChangedEventType) {

        this.assertPdfjsContextExists();

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

    public async fetchAnnotationsForPage(page: number)
    {
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