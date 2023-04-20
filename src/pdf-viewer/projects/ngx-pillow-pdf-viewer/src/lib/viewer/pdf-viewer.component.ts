import { Component, ElementRef, Input, OnInit, ViewChild } from "@angular/core";
import PdfjsContext, { toolType } from "ngx-pillow-pdf-viewer/pdfjsContext";
import pdfjsContext from "ngx-pillow-pdf-viewer/pdfjsContext";
import DefaultLoggingProvider from "ngx-pillow-pdf-viewer/utils/logging/defaultLoggingProvider";
import LoggingProvider, { pdfViewerLogSourceType } from "ngx-pillow-pdf-viewer/utils/logging/loggingProvider";
import { AnnotationEditorModeChangedEventType, AnnotationEditorType } from "../types/eventBus";
import { AnnotationType } from "ngx-pillow-pdf-viewer/annotation/annotationTypes";
import annotation from "ngx-pillow-pdf-viewer/annotation/annotation";
import { PdfSidebarComponent, annotationsProviderDelegate } from "ngx-pillow-pdf-viewer/sidebar/pdf-sidebar.component";

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
        if (this.pdfjsContext?.documentState === 'loaded') {
            console.warn('It is not possible to pass annotations through the input after the document is loaded. If the annotations are fetched asynchronously, or at a later state, it is possible to pass them through the `annotationProvider` input.');
            return;
        }

        this._annotations = annotations;
    }

    /** The provider that will fetch annotations asynchronously. */
    @Input() public annotationsProvider?: annotationsProviderDelegate;

    public get pdfjsContext() {
        return this._pdfjsContext;
    }

    public get uncompletedAnnotation() {
        return this._annotations.filter(x => x.state !== 'completed')[0];
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

    private readonly _annotateTextId = 'annotate-text';
    private readonly _annotateDrawId = 'annotate-draw';

    private _relativeViewerPath?: string;
    private _fileSource?: string | Blob | Uint8Array;
    private _loggingProvider?: LoggingProvider;
    private _pdfjsContext?: pdfjsContext;
    private _disabledTools?: toolType[];
    private _annotations: annotation[] = [];

    // Keeps track of pages that have had their annotations fetched.
    private readonly _fetchedAnnotationPages: number[] = [];

    constructor() {
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
        this.pdfjsContext.subscribeEventBus('documentloaded', () => this.sendLogMessage('Document has been loaded.'));
        this.pdfjsContext.subscribeEventBus('pagesinit', () => this.sendLogMessage('Pages are loading...'));

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
        this.sendLogMessage(`Start new ${type} annotation...`);
        this.assertPdfjsContextExists();

        const uncompletedAnnotation = this.uncompletedAnnotation;
        if (uncompletedAnnotation) {
            this.sendLogMessage('Removing uncompleted annotation...');
            this._annotations = this._annotations.filter(x => x.id !== uncompletedAnnotation.id);
        }

        const newAnnotation = new annotation({ type, page: 1 });
        this._annotations.push(newAnnotation);
        this.pdfjsContext.dispatchEventBus('startAnnotation', {
            source: this,
            annotation: newAnnotation,
        });
    }

    private onPagesLoaded() {

        this.assertPdfjsContextExists();

        // Enable the annotation buttons
        this.pdfjsContext.setToolDisabled(this._annotateDrawId, false);
        this.pdfjsContext.setToolDisabled(this._annotateTextId, false);

        this.sendLogMessage('Pages have been loaded.')
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

    public async fetchAnnotationsForPage(page: number) {

        // Previously fetched.
        if (this._fetchedAnnotationPages.some(x => x === page)) {
            return this._annotations.filter(x => x.page === page);
        }

        this._fetchedAnnotationPages.push(page);

        // Check if the provider is set.
        if (!this.annotationsProvider) {
            console.warn(`Please provide a value for \`annotationsProvider\` in order to asynchronously fetch annotations for page ${page}.`);
            return [];
        }

        this.sendLogMessage(`Fetching annotations for page ${page}...`);
        return await this.annotationsProvider(page);
    }

    private assertPdfjsContextExists(): asserts this is this & {
        pdfjsContext: PdfjsContext;
    } {
        if (!this.pdfjsContext) {
            throw new Error('The PDFJS context could not be found.');
        }
    }

    private sendLogMessage(message: unknown, source?: pdfViewerLogSourceType, ...args: unknown[]) {
        this.loggingProvider.send(message, source || PdfViewerComponent.name, ...args);
    }
}