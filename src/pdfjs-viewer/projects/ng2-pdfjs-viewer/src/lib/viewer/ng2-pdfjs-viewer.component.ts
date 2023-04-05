import { AfterViewInit, ChangeDetectorRef, Component, ContentChildren, EventEmitter, Input, OnInit, Output, QueryList, TemplateRef, ViewChild } from '@angular/core';
import { PdfAnnotationsSideBarComponent } from 'ng2-pdfjs-viewer/annotations-side-bar/pdf-annotations-side-bar.component';
import { pdfAnnotationCommentSubmission } from 'ng2-pdfjs-viewer/article/pdf-annotation.component';
import { PdfIframeWrapperComponent } from 'ng2-pdfjs-viewer/iframe-wrapper/pdf-iframe-wrapper.component';
import { LocalisationService } from 'ng2-pdfjs-viewer/localisation/localisation.service';
import { pageChangingEventType, pdfBehaviour } from 'ng2-pdfjs-viewer/pdf-behaviour';
import { templateRefDirective } from 'ng2-pdfjs-viewer/templateRef.directive';
import { boundingBox, pdfAnnotation, pdfAnnotationComment } from './../pdf-annotation';
import { pdfContext } from './../pdf-context';
import { scrollModeTranslation, scrollModeType, spreadModeTranslation, spreadModeType, zoomType } from '../../types/PDFViewer';
import { pageModeTranslations, pageModeType } from '../../types/PDFSidebar';

export type annotationProviderRequest = { page: number };
export type annotationProviderResponse = { annotations: Array<pdfAnnotation>, totalPage: number, total: number; };

export type behaviourOnDownloadDelegateType = (context: pdfContext) => void;
export type annotationProviderDelegateType = (request: annotationProviderRequest) => Promise<annotationProviderResponse>;

export type behaviourOnAnnotationPostedDelegateType = (annotation: pdfAnnotation) => Promise<void>;
export type behaviourOnCommentPostedDelegateType = (submission: pdfAnnotationCommentSubmission) => Promise<void>;

export type annotationFilterReference = annotationProviderRequest & { annotations: Array<pdfAnnotation> };

@Component({
    selector: 'lib-ng2-pdfjs-viewer',
    templateUrl: 'ng2-pdfjs-viewer.component.html',
    styleUrls: ['ng2-pdfjs-viewer.component.scss']
})
export class Ng2PdfjsViewerComponent implements OnInit, AfterViewInit {
    private readonly _sidebarDisabledButCalledError = 'Tried to use the sidebar despite it being disabled.';
    private readonly _annotationHasNoPageError = 'Expected the annotation to contain a page.';

    @ViewChild('iframeWrapper') private _iframeWrapper!: PdfIframeWrapperComponent;
    @ViewChild('annotationsSidebar') private _annotationsSidebar?: PdfAnnotationsSideBarComponent;

    @ContentChildren(templateRefDirective)
    set setTemplate(value: QueryList<templateRefDirective>)
    {
        const templates: {[key: string]: (val: TemplateRef<unknown>) => void} = {
            'metaDataHeader': (val) => { this._annotationMetaDataHeaderTemplate = val },
            'comment':        (val) => { this._annotationCommentTemplate = val }
        }

        value.forEach(x =>
        {
            if (!x.type) {
                throw new Error('Template is missing a type.');
            }

            if (!templates[x.type]) {
                throw new Error(`Template ${x.type} is not valid.`);
            }

            templates[x.type](x.template);
        });
    }

    private _annotationMetaDataHeaderTemplate?: TemplateRef<unknown>;
    public get annotationMetaDataHeaderTemplate()
    {
        return this._annotationMetaDataHeaderTemplate
    }

    private _annotationCommentTemplate?: TemplateRef<unknown>;
    public get annotationCommentTemplate()
    {
        return this._annotationCommentTemplate
    }

    // General inputs.
    @Input() fileSource?: string | Blob | Uint8Array;
    @Input() viewerRelativePath?: string;
    @Input() annotationsProvider?: annotationProviderDelegateType;
    @Input() enableDebugMessages = false;
    @Input() enableEventBusDebugMessages = false;
    @Input() defaultPendingAnnotationDrawColor = '#00FF00';
    @Input() defaultAnnotationDrawColor = '#FFA500';
    @Input() defaultAnnotationDrawFocusColor = '#ff4500';
    @Input() defaultPendingAnnotationTextColor = '#00FF00';
    @Input() defaultAnnotationTextColor = '#FFA500';
    @Input() defaultAnnotationTextFocusColor = '#ff4500';

    // Document state.
    // https://github.com/mozilla/pdf.js/wiki/Viewer-options
    // https://github.com/mozilla/pdf.js/wiki/Debugging-PDF.js#url-parameters
    // https://github.com/mozilla/pdf.js/tree/master/l10n
    @Input()  page = 1;
    @Output() pageChange = new EventEmitter<number>();

    @Input() enableTextAnnotating = true;
    @Input() enableDrawAnnotating = true;
    @Input() enableFileSelect = true;
    @Input() enablePrinting = true;
    @Input() enableDownloading = true;
    @Input() enableTextEditing = true;
    @Input() enableDrawEditing = true;

    @Input() scrollMode?: scrollModeType;
    @Input() spreadMode?: spreadModeType;
    @Input() rotation?: number;
    @Input() zoom?: zoomType;
    @Input() pagemode?: pageModeType;
    @Input() scale?: number;

    /** This value will replace the default download behaviour if set. */
    @Input() behaviourOnDownload?: behaviourOnDownloadDelegateType;

    /** This value represents the behaviour when a new annotation is posted. */
    @Input() behaviourOnAnnotationPosted?: behaviourOnAnnotationPostedDelegateType;

    /** This value represents the behaviour when a new comment is posted. */
    @Input() behaviourOnCommentPosted?: behaviourOnCommentPostedDelegateType;

    // Outputs
    @Output() initialized = new EventEmitter<void>();
    @Output() annotationPosted = new EventEmitter<pdfAnnotation>();
    @Output() commentPosted = new EventEmitter<pdfAnnotationCommentSubmission>();
    @Output() annotationDeleted = new EventEmitter<pdfAnnotation>();

    /** Represents the current focussed annotation, if any are focused on. */
    private _currentAnnotationFocus?: pdfAnnotation;

    /** If something is in the process of being annotated, this annotation specifies the pending data. */
    protected _pendingAnnotation?: pdfAnnotation;

    /** Represents an array of annotations that are fetched and stored into memory, so be used in the application. Each array of annotations have their filtered reference with them. */
    protected _storedAnnotations: Array<annotationFilterReference> = [];

    private _initialized = false;

    /** The pdf behaviour of the current context that is used to hook onto pdf events that can occur. */
    protected _pdfBehaviour?: pdfBehaviour;
    public get pdfBehaviour()
    {
        if (!this._pdfBehaviour)
        {
            throw new Error('No pdf behaviour found!');
        }

        return this._pdfBehaviour;
    }

    /** Gets the fileName of the current file that has been opened. */
    public get fileName()
    {
        return this.pdfBehaviour.pdfViewerApplication._title;
    }

    /** Gets the base url of the current file that has been opened. */
    public get baseUrl()
    {
        return this.pdfBehaviour.pdfViewerApplication.baseUrl;
    }

    public get markInfo()
    {
        return this.pdfBehaviour.pdfViewerApplication.pdfDocument.getMarkInfo();
    }

    constructor(
        private readonly localisationService: LocalisationService,
        private readonly changeDetector: ChangeDetectorRef)
    {
        this.getShownAnnotations = this.getShownAnnotations.bind(this);
    }

    ngOnInit()
    {
        this._pdfBehaviour = new pdfBehaviour(this.viewerRelativePath);
        this.pdfBehaviour.enableDebugConsoleLogging = this.enableDebugMessages;
        this.pdfBehaviour.enableEventBusDebugConsoleLogging = this.enableEventBusDebugMessages;
    }

    ngAfterViewInit()
    {
        // This has been moved from `ngOnInit` to `ngAfterViewInit` because the text layer had a bug where drawn annotations would disappear.
        // The cause is the drawer which changes the width of the canvas, which causes the annotation to disappear if they were already drawn.
        // By subscribing later, we change the order of execution.
        this.pdfBehaviour.onPageChanging.subscribe((e) => this.onPageChange(e));
        this.pdfBehaviour.onTextLayerRendered.subscribe(() => this.onPdfTextLayerRendered());
        this.pdfBehaviour.onPageRendered.subscribe(({ first }) => this.onPageRendered(first));

        this._iframeWrapper.initialized.subscribe(() => this.onWrapperLoaded());
        this._iframeWrapper.loadIframe();
    }

    public setPage(pageNumber: number)
    {
        this.pdfBehaviour.pdfViewerApplication.pdfViewer.currentPageNumber = pageNumber;
    }

    public setZoom(zoom: zoomType)
    {
        this.pdfBehaviour.pdfViewerApplication.pdfViewer.currentScaleValue = zoom;
    }

    public setRotation(rotation: number)
    {
        this.pdfBehaviour.pdfViewerApplication.pdfViewer.pagesRotation = rotation;
    }

    public setScale(scale: number)
    {
        this.pdfBehaviour.pdfViewerApplication.pdfViewer.currentScale = scale;
    }

    public switchView(view: pageModeType, forceOpen = false)
    {
        const translation = pageModeTranslations[view];
        this.pdfBehaviour.pdfViewerApplication.pdfSidebar.switchView(translation, forceOpen);
    }

    public openSideBar()
    {
        this.pdfBehaviour.pdfViewerApplication.pdfSidebar.open();
    }

    public closeSideBar()
    {
        this.pdfBehaviour.pdfViewerApplication.pdfSidebar.close();
    }

    public toggleSideBar()
    {
        this.pdfBehaviour.pdfViewerApplication.pdfSidebar.toggle();
    }

    public deleteAnnotation(annotation: pdfAnnotation)
    {
        const annotationsIndex = this._storedAnnotations.findIndex(x => x.page === annotation.page);
        const newAnnotations = this._storedAnnotations[annotationsIndex]
            .annotations
            .filter(x => x.id !== annotation.id);

        this._storedAnnotations[annotationsIndex]
            .annotations = newAnnotations;

        if (annotation.type === 'text')
        {
            this._iframeWrapper.pdfAnnotationWriter.removeColorsFromAnnotation(annotation);
        }

        if (annotation.type === 'draw')
        {
            if (!annotation.page) {
                throw new Error('Expected annotation to contain a page whilst deleting.');
            }
            this.addDrawAnnotationsToPage(annotation.page);
        }
        
        this.changeDetector.detectChanges();
        this.annotationDeleted.emit(annotation);
    }

    public getShownAnnotations()
    {
        const pageAnnotations = this._storedAnnotations.filter(x => x.page === this.page)[0]
        ?.annotations;
        return pageAnnotations;
    }

    private async onWrapperLoaded()
    {
        // Set button availability based on settings.
        this._iframeWrapper.disableButton('openFile', !this.enableFileSelect);
        this._iframeWrapper.disableButton('printing', true);
        this._iframeWrapper.disableButton('downloadPdf', true);

        document.addEventListener('mousedown', () => this.onMouseDown());
        this.pdfBehaviour.onIframeMouseDown.subscribe(() => this.onIframeMouseDown());

        if (!this.fileSource)
        {
            return;
        }

        await this.pdfBehaviour.loadFile(this.fileSource);
    }

    private async onPdfTextLayerRendered()
    {
        // Custom download behaviour
        if(this.behaviourOnDownload)
        {
            this.setDownloadBehaviour(this.behaviourOnDownload);
        }

        // Currently there is no support for "structured content" in PDFs.
        // These type of PDFs have a different structure on the textlayer.
        // The "Marked" value in the PDFs markinfo indicates if the PDF has this feature enabled.
        // Until this is supported, we disable the button on these.
        const markInfo = await this.markInfo;
        const marked = markInfo && 'Marked' in markInfo && markInfo.Marked === true;
        if (marked)
        {
            this._iframeWrapper.disableButton('textAnnotate', true);
            this._iframeWrapper.setButtonTitle('textAnnotate', this.localisationService.Translate('textAnnotate.disabledNotSupported'));
        }

        const renderedPages = this.pdfBehaviour.getRenderedPageNumbers();

        const allAnnotations = this._storedAnnotations
            .map(x => x.annotations)
            .reduce((accumulator, value) => accumulator.concat(value), [])
            .filter(x => renderedPages.some(y => y == x.page));

        const textAnnotations = allAnnotations
            .filter(x => x.type === 'text');

        const drawAnnotations = allAnnotations
            .filter(x => x.type === 'draw');

        this.addTextAnnotations(textAnnotations);
        this.addDrawAnnotations(drawAnnotations);
        this.sendDebugMessage('Text layer rendered.');
    }

    private onPageRendered(first: boolean)
    {
        // Set text and draw editing availability based on settings.
        // These are checked every render because the internal PDFJS code enables some at a later state than we can check.
        this._iframeWrapper.disableButton('textEditor', !this.enableTextEditing);
        this._iframeWrapper.disableButton('drawEditor', !this.enableDrawEditing);
        this._iframeWrapper.disableButton('textAnnotate', !this.enableTextAnnotating);
        this._iframeWrapper.disableButton('drawAnnotate', !this.enableDrawAnnotating);
        this._iframeWrapper.disableButton('printing', !this.enablePrinting);
        this._iframeWrapper.disableButton('downloadPdf', !this.enableDownloading);

        if (!first)
        {
            return;
        }

        this.sendDebugMessage('Window context.', this.pdfBehaviour.iframeWindow);

        // Set scroll, spread mode and page.
        if (this.scrollMode)
        {
            this.pdfBehaviour.pdfViewerApplication.pdfViewer.scrollMode = scrollModeTranslation[this.scrollMode];
        }
        if (this.spreadMode)
        {
            this.pdfBehaviour.pdfViewerApplication.pdfViewer.spreadMode = spreadModeTranslation[this.spreadMode];
        }
        
        this.setPage(this.page);

        if (this.zoom) { this.setZoom(this.zoom); }
        if (this.rotation) { this.setRotation(this.rotation); }
        if (this.scale) { this.setScale(this.scale); }
        if (this.pagemode) { this.switchView(this.pagemode, true); }

        this.fetchAnnotationsForPage(this.page);
        this._initialized = true;
        this.initialized.emit();
    }

    private onPageChange(event: pageChangingEventType)
    {
        // Make sure the pdf if initialized before setting new pages.
        if (!this._initialized)
        {
        return;
        }

        this.page = event.pageNumber;
        this.pageChange.emit(this.page);

        this.fetchAnnotationsForPage(this.page);
        this.changeDetector.detectChanges();
    }

    private async fetchAnnotationsForPage(page: number)
    {
        if (!this.annotationsProvider) {
            return;
        }

        if (!this._annotationsSidebar) {
            throw new Error(this._sidebarDisabledButCalledError);
        }

        // Do not fetch if we fetched the annotations for that page.
        if (this._storedAnnotations.some(x => x.page == this.page)) {
            return;
        }

        // Insert the base object into the list.
        // This avoids the provider triggering multiple times on different threads due to not being finished yet.
        const annotationsPage: annotationFilterReference = {
            page,
            annotations: []
        }
        this._storedAnnotations.push(annotationsPage);
        this.sendDebugMessage(`Start fetch annotations. { page: ${page} }`);

        this._annotationsSidebar.setLoading();
        const response = await this.annotationsProvider({ page });
        this._annotationsSidebar.setNotLoading();

        annotationsPage.annotations = response.annotations || [];
        this.sendDebugMessage('Response', response);

        // Render the annotations if the page is rendered.
        // Since this might happen after the textlayer has been rendered, this check ensures the annotations are still rendered.
        const canvasRendered = this._iframeWrapper.pdfAnnotationDrawer.canvasRendered(page);
        if (canvasRendered) {
            this.addDrawAnnotationsToPage(page);
            this.addTextAnnotationsToPage(page);
        }

        this.changeDetector.detectChanges();
    }

    private setDownloadBehaviour(delegate: behaviourOnDownloadDelegateType)
    {
        this.pdfBehaviour.pdfViewerApplication.downloadManager.download =
            (blob: Blob, url: string, fileName: string) =>
            {
                const blobUrl = URL.createObjectURL(blob);
                delegate(new pdfContext(fileName, url, blobUrl, blob));
            };

        this.pdfBehaviour.pdfViewerApplication.downloadManager.downloadData =
            (data: Uint8Array, url: string, fileName: string) =>
            {
                const blob = new Blob([data], {
                    type: 'application/pdf'
                });
                const blobUrl = URL.createObjectURL(blob);
                delegate(new pdfContext(fileName, url, blobUrl, blob));
            };

        this.pdfBehaviour.pdfViewerApplication.downloadManager.downloadUrl =
            (url: string, fileName: string) =>
            {
                delegate(new pdfContext(fileName, url, url, null));
            };
    }

    /**
     * The behaviour when the a mouse press was registered in the iframe.
     */
    protected onIframeMouseDown()
    {
        // Check for annotation focus.
        if (this._currentAnnotationFocus)
        {
            this.unFocusAnnotation(this._currentAnnotationFocus);
        }
    }

    /**
     * The behaviour when the a mouse press was registered in the main document.
     */
    private onMouseDown()
    {
        // Check for annotation focus.
        if (this._currentAnnotationFocus)
        {
            this.unFocusAnnotation(this._currentAnnotationFocus);
        }
    }

    protected onStartNewAnnotation()
    {
        if (!this._annotationsSidebar) {
            throw new Error(this._sidebarDisabledButCalledError);
        }
        // Make sure the annotations bar is expanded.
        this._annotationsSidebar.ensureExpanded();
    }

    protected onPendingAnnotationTextSelected()
    {
        if (!this._annotationsSidebar) {
            throw new Error(this._sidebarDisabledButCalledError);
        }

        if (!this._pendingAnnotation || !(this._pendingAnnotation.type === 'text')) {
            throw new Error('Expected the pending annotation to be a text annotation.');
        }

        this._iframeWrapper.pdfAnnotationWriter.colorAnnotation(this._pendingAnnotation, this.defaultPendingAnnotationTextColor);
        this.changeDetector.detectChanges();
        this._annotationsSidebar.focusAnnotationInput(this._pendingAnnotation);
    }

    protected onPendingAnnotationBoundingBoxCreated()
    {
        if (!this._annotationsSidebar) {
            throw new Error(this._sidebarDisabledButCalledError);
        }

        if (!this._pendingAnnotation || !(this._pendingAnnotation.type === 'draw')) {
            throw new Error('Expected the pending annotation to be a draw annotation.');
        }

        if (!this._pendingAnnotation.page) {
            throw new Error(this._annotationHasNoPageError);
        }

        this.changeDetector.detectChanges();
        this._iframeWrapper.drawRectangle(<boundingBox>this._pendingAnnotation.reference, this._pendingAnnotation.page, this.defaultPendingAnnotationDrawColor, true);
        this._iframeWrapper.pdfAnnotationDrawer.disableLayer();
        this._annotationsSidebar.focusAnnotationInput(this._pendingAnnotation);
    }

    /**
     * Posts a pending annotation.
     * @param initialComment The initial comment supplied with the annotation.
     */
    private async postAnnotation(initialComment: pdfAnnotationComment)
    {
        if (!this._annotationsSidebar) {
            throw new Error(this._sidebarDisabledButCalledError);
        }

        if (!this._pendingAnnotation) {
            throw new Error('Could not find the pending annotation.');
        }

        // Switch the pending annotation to a local variable.
        // This will remove any indication to the pending annotation.
        const annotation = this._pendingAnnotation;

        if (!annotation.page) {
            throw new Error(this._annotationHasNoPageError);
        }

        this._pendingAnnotation = undefined;
        annotation.comments.push(initialComment);

        const annotationsIndex = this._storedAnnotations.findIndex(x => x.page === annotation.page);
        this._storedAnnotations[annotationsIndex].annotations.push(annotation);

        // Push a change so that the list of annotations is redrawn. This way the "loading" indication below works properly.
        this.changeDetector.detectChanges();

        // Color the annotation.
        if (annotation.type === 'text')
        {
            this._iframeWrapper.pdfAnnotationWriter.removeColorsFromAnnotation(
                annotation);

            this._iframeWrapper.enableAnnotationColor(
                annotation,
                this.defaultAnnotationTextColor);
        }

        // Draw the bounding box rectangle.
        if (annotation.type === 'draw')
        {
            this._iframeWrapper.pdfAnnotationDrawer.clearCanvas(annotation.page, true);
            this.addDrawAnnotationsToPage(annotation.page);
        }

        if (this.behaviourOnAnnotationPosted)
        {
            this._annotationsSidebar.setAnnotationLoading(annotation);
            await this.behaviourOnAnnotationPosted(annotation);
            this._annotationsSidebar.setAnnotationNotLoading(annotation);
        }

        // Emit the addedannotation.
        this.sendDebugMessage('Annotation posted', annotation);
        this.annotationPosted.emit(annotation);
        
        this.changeDetector.detectChanges();
    }

    private addTextAnnotationsToPage(page: number)
    {
        const annotationsIndex = this._storedAnnotations.findIndex(x => x.page === page);
        const annotations = this._storedAnnotations[annotationsIndex]
            .annotations
            .filter(x => x.page === page && x.type === 'text');
        this.addTextAnnotations(annotations);
    }

    private addTextAnnotations(annotations: Array<pdfAnnotation>)
    {
        annotations.forEach(x => this.addTextAnnotation(x));
    }

    private addTextAnnotation(annotation: pdfAnnotation)
    {
        if (!annotation.page) {
            throw new Error(this._annotationHasNoPageError);
        }

        // Ensure the focussed annotation retains its focus color.
        const color = this._currentAnnotationFocus === annotation ?
        this.defaultAnnotationTextFocusColor :
        this.defaultAnnotationTextColor;
    
        this._iframeWrapper.enableAnnotationColor(
            annotation,
            color);
    }

    private addDrawAnnotationsToPage(page: number)
    {
        this._iframeWrapper.pdfAnnotationDrawer.clearCanvas(page, false);

        const annotationsIndex = this._storedAnnotations.findIndex(x => x.page === page);
        const annotations = this._storedAnnotations[annotationsIndex]
            .annotations
            .filter(x => x.page === page && x.type === 'draw');
        this.addDrawAnnotations(annotations);
    }

    private addDrawAnnotations(annotations: Array<pdfAnnotation>)
    {
        annotations.forEach(x => this.addDrawAnnotation(x));
    }

    private addDrawAnnotation(annotation: pdfAnnotation)
    {
        if (!annotation.page) {
            throw new Error(this._annotationHasNoPageError);
        }

        const color = this._currentAnnotationFocus === annotation ?
        this.defaultAnnotationDrawFocusColor :
        this.defaultAnnotationDrawColor;
        this._iframeWrapper.drawRectangle(<boundingBox>annotation.reference, annotation.page, color);
    }

    protected onSidebarCollapse()
    {
        // Check for a pending annotation when collapsing the sidebar.
        // Remove it if it exists.
        if (!this._pendingAnnotation)
        {
            return;
        }

        this._iframeWrapper.deletePendingAnnotation();
        this.changeDetector.detectChanges();
    }

    protected focusAnnotation(annotation: pdfAnnotation)
    {
        if (!this._annotationsSidebar) {
            throw new Error(this._sidebarDisabledButCalledError);
        }

        if (!annotation.page) {
            throw new Error(this._annotationHasNoPageError);
        }

        // Ignore if an annotation already has focus.
        if (this._currentAnnotationFocus)
        {
            return;
        }

        this._annotationsSidebar.focusAnnotation(annotation);
        this._currentAnnotationFocus = annotation;

        if (annotation.type === 'text')
        {
        this._iframeWrapper.pdfAnnotationWriter.focusAnnotation(annotation, this.defaultAnnotationTextFocusColor)
        }

        if (annotation.type === 'draw')
        {
            this.addDrawAnnotationsToPage(annotation.page);
        }
    }

    private unFocusAnnotation(annotation: pdfAnnotation)
    {
        if (!this._annotationsSidebar) {
            throw new Error(this._sidebarDisabledButCalledError);
        }

        if (!annotation.page) {
            throw new Error(this._annotationHasNoPageError);
        }

        if (!this._currentAnnotationFocus)
        {
            throw new Error('Expected a focussed annotation.');
        }

        this._annotationsSidebar.unfocusAnnotation();
        delete(this._currentAnnotationFocus);

        if (annotation.type === 'text')
        {
            this._iframeWrapper.pdfAnnotationWriter.unfocusAnnotation(annotation, this.defaultAnnotationTextColor);
        }

        if (annotation.type === 'draw')
        {
            this.addDrawAnnotationsToPage(annotation.page);
        }
    }

    /**
     * Called when an the initial annotation comment was submitted for a pending annotation.
     */
    protected async submitInitialAnnotationComment(event: pdfAnnotationCommentSubmission)
    {
        await this.postAnnotation(event.comment);
    }

    /**
     * Called when a new comment was posted on an annotation.
     */
    protected async onCommentPosted(submission: pdfAnnotationCommentSubmission)
    {
        if (!this._annotationsSidebar) {
            throw new Error(this._sidebarDisabledButCalledError);
        }

        if (this.behaviourOnCommentPosted)
        {
            this._annotationsSidebar.setAnnotationLoading(submission.annotation);
            await this.behaviourOnCommentPosted(submission);
            this._annotationsSidebar.setAnnotationNotLoading(submission.annotation);
        }

        this.commentPosted.emit(submission);
        this.changeDetector.detectChanges();
    }

    /**
     * Sends the given message when debug messages are enabled.
     * @param message The message to send.
     * @param optionalParams Optional parameters to send with the message.
     */
    private sendDebugMessage(message?: unknown, ...optionalParams: unknown[])
    {
        if (!this.enableDebugMessages)
        {
            return;
        }

        console.log(`Viewer - ${message}`, ...optionalParams);
    }
}