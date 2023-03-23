import { AfterViewInit, ChangeDetectorRef, Component, ContentChild, ContentChildren, EventEmitter, Input, OnInit, Output, QueryList, TemplateRef, ViewChild } from '@angular/core';
import { PdfAnnotationsSideBarComponent } from 'ng2-pdfjs-viewer/annotations-side-bar/pdf-annotations-side-bar.component';
import { pdfAnnotationCommentSubmission } from 'ng2-pdfjs-viewer/article/pdf-annotation.component';
import { pageModeType, PdfIframeWrapperComponent, scrollModeType, spreadModeType, zoomType } from 'ng2-pdfjs-viewer/iframe-wrapper/pdf-iframe-wrapper.component';
import { pageChangingEventType, pdfBehaviour } from 'ng2-pdfjs-viewer/pdf-behaviour';
import { templateRefDirective } from 'ng2-pdfjs-viewer/templateRef.directive';
import { boundingBox, pdfAnnotation, pdfAnnotationComment } from './../pdf-annotation';
import { pdfContext } from './../pdf-context';

export type annotationProviderRequest = { page: number, skip: number, take: number };
export type annotationProviderResponse = { annotations: Array<pdfAnnotation>, totalPage: number, total: number; };

export type behaviourOnDownloadDelegateType = (context: pdfContext) => void;
export type annotationProviderDelegateType = (request: annotationProviderRequest) => Promise<annotationProviderResponse>;

export type behaviourOnAnnotationPostedDelegateType = (annotation: pdfAnnotation) => Promise<void>;
export type behaviourOnCommentPostedDelegateType = (submission: pdfAnnotationCommentSubmission) => Promise<void>;

@Component({
  selector: 'lib-ng2-pdfjs-viewer',
  templateUrl: 'ng2-pdfjs-viewer.component.html',
  styleUrls: ['ng2-pdfjs-viewer.component.scss']
})
export class Ng2PdfjsViewerComponent implements OnInit, AfterViewInit {
  @ViewChild('iframeWrapper') private _iframeWrapper!: PdfIframeWrapperComponent;
  @ViewChild('annotationsSidebar') private _annotationsSidebar?: PdfAnnotationsSideBarComponent;
  
  @ContentChildren(templateRefDirective)
  set setTemplate(value: QueryList<templateRefDirective>)
  {
    const templates: {[key: string]: (val: TemplateRef<any>) => void} = {
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
    })
  };

  private _annotationMetaDataHeaderTemplate?: TemplateRef<any>;
  public get annotationMetaDataHeaderTemplate()
  {
    return this._annotationMetaDataHeaderTemplate
  }

  private _annotationCommentTemplate?: TemplateRef<any>;
  public get annotationCommentTemplate()
  {
    return this._annotationCommentTemplate
  }

  // General inputs.
  @Input() fileSource?: string | Blob | Uint8Array;
  @Input() viewerRelativePath?: string;
  @Input() annotationsProvider?: annotationProviderDelegateType;
  @Input() UseToolbarFileSelector = true;
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

  @Input() annotationsEnabled = true;
  @Input() openFileEnabled = true;
  @Input() printingEnabled = true;
  @Input() downloadEnabled = true;
  @Input() textEditorEnabled = true;
  @Input() drawingEnabled = true;
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
  @Output() onInitialized = new EventEmitter<void>();
  @Output() onAnnotationPosted = new EventEmitter<pdfAnnotation>();
  @Output() onCommentPosted = new EventEmitter<pdfAnnotationCommentSubmission>();
  @Output() onAnnotationDeleted = new EventEmitter<pdfAnnotation>();

  // These exist because the actual value is supposed to be an enum. Since enums in angular can be funky, we'll just translate the string.
  private scrollModeTranslation: { [key in scrollModeType] : number; } = {
    'vertical': 0,
    'horizontal': 1,
    'wrapped': 2,
    'page': 3
  };
  private spreadModeTranslation: { [key in spreadModeType] : number; } = {
    'none': 0,
    'odd': 1,
    'even': 2
  };
  private pageModeTranslations: { [key in pageModeType] : number; } = {
    'none': 0,
    'thumbs': 1,
    'outline': 2,
    'attachments': 3,
    'layers': 4
  };

  /** Represents the current focussed annotation, if any are focused on. */
  private _currentAnnotationFocus?: pdfAnnotation;

  /** If something is in the process of being annotated, this annotation specifies the pending data. */
  protected _pendingAnnotation?: pdfAnnotation;

  protected _annotations: Array<pdfAnnotation> = [];

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
  public get fileName(): string
  {
    return this.pdfBehaviour.pdfViewerApplication._title;
  }

  /** Gets the base url of the current file that has been opened. */
  public get baseUrl(): string
  {
    return this.pdfBehaviour.pdfViewerApplication.baseUrl;
  }

  constructor(
    private readonly changeDetector: ChangeDetectorRef)
  {
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
    this.pdfBehaviour.onIframeLoaded.subscribe(() => this.onIframeLoaded());
    this.pdfBehaviour.onPageChanging.subscribe((e) => this.onPageChange(e));
    this.pdfBehaviour.onTextLayerRendered.subscribe(() => this.onPdfTextLayerRendered());
    this.pdfBehaviour.onPageRendered.subscribe(({ first }) => this.onPageRendered(first));

    this._iframeWrapper.onInitialized.subscribe(() => this.onPdfAttached());
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
    const translation = this.pageModeTranslations[view];
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
    this._annotations = this._annotations.filter(x => x.id !== annotation.id);

    if (annotation.type === 'text')
    {
      this._iframeWrapper.pdfAnnotationWriter.removeColorsFromAnnotation(annotation);
    }

    if (annotation.type === 'draw')
    {
      this.drawAnnotationsOnPage(annotation.page!);
    }
    
    this.changeDetector.detectChanges();
    this.onAnnotationDeleted.emit(annotation);
  }

  private async onIframeLoaded()
  {
    if (!this.fileSource)
    {
      return;
    }

    await this.pdfBehaviour.loadFile(this.fileSource);
  }

  private onPdfAttached()
  {
    // Custom download behaviour
    if(this.behaviourOnDownload)
    {
      this.setDownloadBehaviour(this.behaviourOnDownload);
    }
    
    this._iframeWrapper.setButtonHidden('openFile', !this.openFileEnabled);
    this._iframeWrapper.setButtonHidden('printing', !this.printingEnabled);
    this._iframeWrapper.setButtonHidden('downloadPdf', !this.downloadEnabled);
    this._iframeWrapper.setButtonHidden('textEditor', !this.textEditorEnabled);
    this._iframeWrapper.setButtonHidden('drawEditor', !this.drawingEnabled);
    this._iframeWrapper.setButtonHidden('annotation', !this.annotationsEnabled);

    // Remove the left vertical toolbar seperator if all relevant buttons are hidden.
    const editButtonsHidden = this._iframeWrapper.getButtonHidden('textEditor') && this._iframeWrapper.getButtonHidden('drawEditor') && this._iframeWrapper.getButtonHidden('annotation');
    if (editButtonsHidden)
    {
      this.pdfBehaviour.rightToolbarContainer
        .getElementsByClassName('verticalToolbarSeparator')[0]
        .setAttribute('hidden', String(true));
    }

    document.addEventListener('mouseup', (e) => this.onMouseUp());
  }

  private onPdfTextLayerRendered()
  {
    const textAnnotations = this._annotations
      .filter(x => x.type === 'text');

    const drawAnnotations = this._annotations
      .filter(x => x.type === 'draw');

    textAnnotations.forEach(annotation =>
    {
      // Ensure the focussed annotation retains its focus color.
      const color = this._currentAnnotationFocus === annotation ?
        this.defaultAnnotationTextFocusColor :
        this.defaultAnnotationTextColor;
      
      this._iframeWrapper.enableAnnotationColor(
        annotation,
        color);
    });

    this.drawAnnotations(drawAnnotations);
    this.sendDebugMessage('Text layer rendered.');
  }

  private onPageRendered(first: boolean)
  {
    if (!first)
    {
      return;
    }

    this.sendDebugMessage('Window context.', this.pdfBehaviour.iframeWindow);

    // Set scroll, spread mode and page.
    if (this.scrollMode)
    {
      this.pdfBehaviour.pdfViewerApplication.pdfViewer.scrollMode = this.scrollModeTranslation[this.scrollMode];
    }
    if (this.spreadMode)
    {
      this.pdfBehaviour.pdfViewerApplication.pdfViewer.spreadMode = this.spreadModeTranslation[this.spreadMode];
    }
    
    this.setPage(this.page);

    if (this.zoom) { this.setZoom(this.zoom); }
    if (this.rotation) { this.setRotation(this.rotation); }
    if (this.scale) { this.setScale(this.scale); }
    if (this.pagemode) { this.switchView(this.pagemode, true); }

    this.fetchAnnotationsForPage(this.page);
    this._initialized = true;
    this.onInitialized.emit();
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
    if (!this.annotationsProvider)
    {
      return;
    }

    if (!this._annotations.some(x => x.page == this.page))
    {
      const skip = 0;
      const take = 999;
      this.sendDebugMessage(`Start fetch annotations. { page: ${page}, skip: ${skip}, take: ${take} }`);
      const response = await this.annotationsProvider({ page, skip, take });
      this._annotations.push(...response.annotations);

      this.sendDebugMessage('Response', response);

      // Render the annotations if the page is rendered.
      // Since this might happen after the textlayer has been rendered, this check ensures the annotations are still rendered.
      const canvasRendered = this._iframeWrapper.pdfAnnotationDrawer.canvasRendered(page);
      if (canvasRendered) {
        this.drawAnnotationsOnPage(page);
      }
    }
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
      (data: any, url: string, fileName: string) =>
      {
        const blobUrl = URL.createObjectURL(new Blob([data], {
          type: 'application/pdf'
        }));
        delegate(new pdfContext(fileName, url, blobUrl, data));
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
  protected onIframeClicked()
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
  private onMouseUp()
  {
    // Check for annotation focus.
    if (this._currentAnnotationFocus)
    {
      this.unFocusAnnotation(this._currentAnnotationFocus);
    }
  }

  protected onStartNewAnnotation()
  {
    // Make sure the annotations bar is expanded.
    this._annotationsSidebar!.ensureExpanded();
  }

  protected onPendingAnnotationTextSelected()
  {
    if (!this._pendingAnnotation || !(this._pendingAnnotation.type === 'text'))
    {
      throw new Error('Expected the pending annotation to be a text annotation.');
    }

    this._iframeWrapper.pdfAnnotationWriter.colorAnnotation(this._pendingAnnotation, this.defaultPendingAnnotationTextColor);
    this.changeDetector.detectChanges();
    this._annotationsSidebar!.focusAnnotationInput(this._pendingAnnotation!);
  }

  protected onPendingAnnotationBoundingBoxCreated()
  {
    if (!this._pendingAnnotation || !(this._pendingAnnotation.type === 'draw'))
    {
      throw new Error('Expected the pending annotation to be a draw annotation.');
    }

    this.changeDetector.detectChanges();
    this._iframeWrapper.drawRectangle(<boundingBox>this._pendingAnnotation.reference, this._pendingAnnotation.page!, this.defaultPendingAnnotationDrawColor, true);
    this._annotationsSidebar!.focusAnnotationInput(this._pendingAnnotation!);
  }

  /**
   * Posts a pending annotation.
   * @param initialComment The initial comment supplied with the annotation.
   */
  private async postAnnotation(initialComment: pdfAnnotationComment)
  {
    if (!this._pendingAnnotation)
    {
      throw new Error('Could not find the pending annotation.');
    }

    // Switch the pending annotation to a local variable.
    // This will remove any indication to the pending annotation.
    const annotation = this._pendingAnnotation;
    this._pendingAnnotation = undefined;

    annotation.comments.push(initialComment);
    this._annotations.push(annotation);

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
      this._iframeWrapper.pdfAnnotationDrawer.clearCanvas(annotation.page!, true);
      this.drawAnnotationsOnPage(annotation.page!);
    }

    if (this.behaviourOnAnnotationPosted)
    {
      this._annotationsSidebar!.setAnnotationLoading(annotation);
      await this.behaviourOnAnnotationPosted(annotation);
      this._annotationsSidebar!.setAnnotationNotLoading(annotation);
    }

    // Emit the addedannotation.
    this.sendDebugMessage('Annotation posted', annotation);
    this.onAnnotationPosted.emit(annotation);
    
    this.changeDetector.detectChanges();
  }

  private drawAnnotationsOnPage(page: number)
  {
    this._iframeWrapper.pdfAnnotationDrawer.clearCanvas(page!, false);

    this.drawAnnotations(
      this._annotations
        .filter(x => x.page === page && x.type === 'draw'));
  }

  private drawAnnotations(annotations: Array<pdfAnnotation>)
  {
    annotations.forEach(x => this.drawAnnotation(x));
  }

  private drawAnnotation(annotation: pdfAnnotation)
  {
    const color = this._currentAnnotationFocus === annotation ?
      this.defaultAnnotationDrawFocusColor :
      this.defaultAnnotationDrawColor;
    this._iframeWrapper.drawRectangle(<boundingBox>annotation.reference, annotation.page!, color);
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
    // Ignore if an annotation already has focus.
    if (this._currentAnnotationFocus)
    {
      return;
    }

    this._annotationsSidebar!.focusAnnotation(annotation);
    this._currentAnnotationFocus = annotation;

    if (annotation.type === 'text')
    {
      this._iframeWrapper.pdfAnnotationWriter.focusAnnotation(annotation, this.defaultAnnotationTextFocusColor)
    }

    if (annotation.type === 'draw')
    {
      this.drawAnnotationsOnPage(annotation.page!);
    }
  }

  private unFocusAnnotation(annotation: pdfAnnotation)
  {
    if (!this._currentAnnotationFocus)
    {
      throw new Error('Expected a focussed annotation.');
    }

    this._annotationsSidebar!.unfocusAnnotation();
    delete(this._currentAnnotationFocus);

    if (annotation.type === 'text')
    {
      this._iframeWrapper.pdfAnnotationWriter.unfocusAnnotation(annotation, this.defaultAnnotationTextColor);
    }

    if (annotation.type === 'draw')
    {
      this.drawAnnotationsOnPage(annotation.page!);
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
  protected async commentPosted(submission: pdfAnnotationCommentSubmission)
  {
    if (this.behaviourOnCommentPosted)
    {
      this._annotationsSidebar!.setAnnotationLoading(submission.annotation);
      await this.behaviourOnCommentPosted(submission);
      this._annotationsSidebar!.setAnnotationNotLoading(submission.annotation);
    }

    this.onCommentPosted.emit(submission);
  }

  /**
   * Called when a file was uploaded.
   * @param event The event context of the uploaded file.
   */
  protected onChangeSingleFile(event: Event) {
    this.pdfBehaviour.pdfViewerApplication.eventBus.dispatch("fileinputchange", {
      source: this,
      fileInput: event.target
    });
  }

  /**
   * Sends the given message when debug messages are enabled.
   * @param message The message to send.
   * @param optionalParams Optional parameters to send with the message.
   */
  private sendDebugMessage(message?: any, ...optionalParams: any[])
  {
    if (!this.enableDebugMessages)
    {
      return;
    }

    console.log(`Viewer - ${message}`, ...optionalParams);
  }
}

// interface PdfJsWindow extends Window {
//   PDFViewerApplication: {
//     eventBus: {
//       on: (name: string, event: (e: any) => void) => void
//     }
//   }
// }