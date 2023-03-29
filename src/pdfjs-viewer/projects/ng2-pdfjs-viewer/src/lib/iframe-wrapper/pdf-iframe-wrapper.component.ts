import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { LocalisationService } from 'ng2-pdfjs-viewer/localisation/localisation.service';
import { boundingBox, pdfAnnotation, textSelection, vector2 } from 'ng2-pdfjs-viewer/pdf-annotation';
import { pdfAnnotationDrawer } from 'ng2-pdfjs-viewer/pdf-annotation-drawer';
import { pdfAnnotationWriter } from 'ng2-pdfjs-viewer/pdf-annotation-writer';
import { pdfBehaviour } from 'ng2-pdfjs-viewer/pdf-behaviour';
import { defaultPdfAnnotationDrawer } from './default-pdf-annotation-drawer';
import { defaultPdfAnnotationWriter } from './default-pdf-annotation-writer';

export type toolbarButtonType = 'textAnnotate' | 'drawAnnotate' | 'openFile' | 'printing' | 'downloadPdf' | 'textEditor' | 'drawEditor';
export type zoomType = { zoom: number; leftOffset: number; topOffset: number; } | 'page-width' | 'page-height' | 'page-fit' | 'auto';
export type pageModeType = 'none' | 'thumbs' | 'outline' | 'attachments' | 'layers';
export type scrollModeType = 'vertical' | 'horizontal' | 'wrapped' | 'page';
export type spreadModeType = 'none' | 'odd' | 'even';

@Component({
  selector: 'lib-ng2-pdfjs-viewer-iframe-wrapper',
  template: `
    <iframe #iframe title="ng2-pdfjs-viewer" width="100%" height="100%">
    </iframe>
  `,
  styleUrls: ['pdf-iframe-wrapper.component.scss']
})
export class PdfIframeWrapperComponent implements OnInit
{
  @ViewChild('iframe', {static: true}) private _iframe!: ElementRef<HTMLIFrameElement>;

  @Input() enableDebugMessages!: boolean;

  // The pending annotation the parent can bind to.
  @Input()  pendingAnnotation?: pdfAnnotation;
  @Output() pendingAnnotationChange = new EventEmitter<pdfAnnotation>();

  @Input() pdfBehaviour!: pdfBehaviour;

  // Event emitters for events happening related to the iframe wrapper.
  @Output() onInitialized = new EventEmitter<void>();
  @Output() onStartNewAnnotation = new EventEmitter<void>();
  @Output() onPendingAnnotationTextSelected = new EventEmitter<void>();
  @Output() onPendingAnnotationBoundingBoxCreated = new EventEmitter<void>();
  @Output() onAnnotationClick = new EventEmitter<pdfAnnotation>();
  @Output() onIframeClick = new EventEmitter<void>();

  /** The translations for the tool bar button types. A key will return one or more button ids that can be used to enable/disable the button(s). */
  private toolBarTranslation: { [key in toolbarButtonType] : string[]; } = {
    'textAnnotate': [ 'text-annotate' ],
    'drawAnnotate': [ 'draw-annotate' ],
    'openFile': [ 'openFile', 'secondaryOpenFile' ],
    'printing': [ 'print', 'secondaryPrint' ],
    'downloadPdf': [ 'download', 'secondaryDownload' ],
    'textEditor': [ 'editorFreeText' ],
    'drawEditor': [ 'editorInk' ],
  };

  private _pdfAnnotationWriter?: pdfAnnotationWriter;
  public get pdfAnnotationWriter()
  {
    if (!this._pdfAnnotationWriter)
    {
      throw new Error('Writer is not yet initialized.');
    }

    return this._pdfAnnotationWriter;
  }

  private _pdfAnnotationDrawer?: pdfAnnotationDrawer;
  public get pdfAnnotationDrawer()
  {
    if (!this._pdfAnnotationDrawer)
    {
      throw new Error('Drawer is not yet initialized.');
    }

    return this._pdfAnnotationDrawer;
  }

  constructor(
    private localisationService: LocalisationService)
  {
  }

  ngOnInit()
  {
    this._pdfAnnotationWriter = new defaultPdfAnnotationWriter(this.pdfBehaviour);
    this.pdfAnnotationWriter.enableDebugLogging = this.enableDebugMessages;

    this._pdfAnnotationDrawer = new defaultPdfAnnotationDrawer(this.pdfBehaviour);
    this.pdfAnnotationDrawer.boundingBoxCreated.subscribe(({ bounds, page }) => this.onBoundingBoxCreated(bounds, page));
    this.pdfAnnotationDrawer.enableDebugLogging = this.enableDebugMessages;

    this.pdfBehaviour.onIframeLoaded.subscribe(() => this.iframeLoaded());
  }

  public loadIframe()
  {
    this.pdfBehaviour.loadIframe(this._iframe.nativeElement);
  }

  /**
   * Sets a button as disabled.
   * @param buttonType The type of button to set as disabled.
   * @param disabled If true, set the button as disabled.
   */
  public disableButton(buttonType: toolbarButtonType, disabled: boolean)
  {
    const buttonids = this.toolBarTranslation[buttonType];
    buttonids.forEach(x => {
      const element = this.pdfBehaviour.iframeDocument.getElementById(x)!;
      element.toggleAttribute('disabled', disabled);
      element.ariaDisabled = String(disabled);
    });
  }

  /**
   * Checks if the given button is disabled.
   * @param buttonType The button type to check.
   * @returns True if disabled.
   */
  public buttonDisabled(buttonType: toolbarButtonType)
  {
    const buttonids = this.toolBarTranslation[buttonType];
    return buttonids.map(x => {
      const element = this.pdfBehaviour.iframeDocument.getElementById(x)!;
      return element.ariaDisabled === 'true';
    }).every(x => x == true);
  }

  public deletePendingAnnotation()
  {
    if (!this.pendingAnnotation)
    {
      return;
    }

    // Remove draw layer when the pending annotation is a pending draw annotation.
    if (this.pendingAnnotation.type === 'draw')
    {
      // Clear the canvas if the page is known.
      // This will remove any pending annotations that _might_ exist.
      if (this.pendingAnnotation.page)
      {
        this.pdfAnnotationDrawer.clearCanvas(this.pendingAnnotation.page, true);
      }
      
      this.pdfAnnotationDrawer.disableLayer();
    }

    // Remove color when the pending annotation is a pending text annotation.
    if (this.pendingAnnotation.type === 'text')
    {
      this.pdfAnnotationWriter.removeColorsFromAnnotation(this.pendingAnnotation);
    }

    delete(this.pendingAnnotation);

    this.pendingAnnotationChange.emit(this.pendingAnnotation);
  }

  public enableAnnotationColor(annotation: pdfAnnotation, color: string)
  {
    this._pdfAnnotationWriter!.colorAnnotation(annotation, color);
    this.pdfBehaviour.iframeDocument.querySelectorAll(`[data-annotation="${annotation.id}"]`)
      .forEach(x => x.addEventListener('click', () => {
        this.onAnnotationClick.emit(annotation);
      }))
  }

  private iframeLoaded()
  {
    // Inject the annotate button
    const leftVerticalToolbarSeperator = this.pdfBehaviour.rightToolbarContainer.getElementsByClassName('verticalToolbarSeparator')[0];

    // Insert custom css
    const styleContainer = this.pdfBehaviour.iframeDocument.createElement("style");
    styleContainer.textContent = `
      #draw-annotate::before
      {
        -webkit-mask-image: var(--toolbarButton-editorInk-icon);
      }
      #text-annotate::before
      {
        -webkit-mask-image: var(--toolbarButton-editorFreeText-icon);
      }
      #draw-annotate::after, #text-annotate::after
      {
        content: 'A';
        font-size: 8px;
        position: absolute;
        left: 4px;
        top: 4px;

        color: var(--main-color);
        opacity: var(--toolbar-icon-opacity);
      }
      #draw-annotate::before, #text-annotate::before
      {
        color: var(--main-color);
        opacity: var(--toolbar-icon-opacity);
      }
    `;
    this.pdfBehaviour.iframeDocument.head.appendChild(styleContainer);

    // Create the annotate by text and draw buttons.
    const annotateButtonBase = document.createElement('button');
    annotateButtonBase.classList.add('toolbarButton');
    (<any>annotateButtonBase).role = 'radio';
    annotateButtonBase.setAttribute('aria-checked', 'false');

    // Insert draw button.
    const annotateDrawButton = annotateButtonBase.cloneNode(true) as HTMLButtonElement;
    annotateDrawButton.title = this.localisationService.Translate('annotation.drawButton');
    annotateDrawButton.id = 'draw-annotate';
    annotateDrawButton.onclick = () => this.onAnnotationDrawButtonClicked();
    leftVerticalToolbarSeperator.insertAdjacentElement('afterend', annotateDrawButton);

    const annotateTextButton = annotateButtonBase.cloneNode(true) as HTMLButtonElement;
      annotateTextButton.title = this.localisationService.Translate('annotation.textButton');
      annotateTextButton.id = 'text-annotate';
      annotateTextButton.onclick = () => this.onAnnotationTextButtonClicked();
      leftVerticalToolbarSeperator.insertAdjacentElement('afterend', annotateTextButton);

    // Disable the buttons by default.
    this.disableButton('textAnnotate', true);
    this.disableButton('drawAnnotate', true);

    this.pdfBehaviour.iframeDocument.addEventListener('mouseup', () => this.onIframeClicked());
    this.onInitialized.emit();
  }

  private onIframeClicked()
  {
    this.onIframeClick.emit();
    
    if (!this.pendingAnnotation || this.pendingAnnotation.type !== 'text')
    {
      return;
    }

    const selection = this.pdfBehaviour.iframeDocument.getSelection()!;
    const hasSelection = selection.toString() != '';

    if (!hasSelection || this.pendingAnnotation.reference)
    {
      return;
    }

    this.onStartNewAnnotation.emit();
    this.setPendingAnnotationTextSelection(selection);
  }

  private onAnnotationDrawButtonClicked()
  {
    // Properly delete the current pending annotation if one exists
    if (this.pendingAnnotation)
    {
      this.deletePendingAnnotation();
    }

    this.pendingAnnotation = new pdfAnnotation('draw');
    this.pendingAnnotationChange.emit(this.pendingAnnotation);

    this.pdfAnnotationDrawer.enableLayer();
    this.onStartNewAnnotation.emit();
  }

  private onAnnotationTextButtonClicked()
  {
    // Properly delete the current pending annotation if one exists
    if (this.pendingAnnotation)
    {
      this.deletePendingAnnotation();
    }

    this.pendingAnnotation = new pdfAnnotation('text');
    this.pendingAnnotationChange.emit(this.pendingAnnotation);

    const selection = this.pdfBehaviour.iframeDocument.getSelection()!;
    const hasSelection = selection.toString() != '';
    this.onStartNewAnnotation.emit();
    
    if (!hasSelection)
    {
      return;
    }

    this.setPendingAnnotationTextSelection(selection);
  }

  private setPendingAnnotationTextSelection(selection: Selection)
  {
    // Ensure the node type is 3, indicating it is text.
    if (selection.anchorNode!.nodeType !== 3)
    {
      return;
    }

    // Ensure we don't overwrite an existing annotation.
    if (this.pdfAnnotationWriter.containsExistingAnnotation(selection))
    {
      return;
    }

    // Determine the page of the selection.
    // Getting `this.page` or is unreliable. If you scroll far enough for it to change, you can still annotate other pages.
    // We can get the index of the page div using the xpath, but this is easier to implement.
    // This script gets the page parent, and then determines the page using the added `data-page-number` attribute that exists on this div element.
    const pageNumber = this.pdfBehaviour.getPageNumberOfElement(selection.anchorNode!.parentElement!);
    const xpath = this.pdfAnnotationWriter.getPdfPageXpathBySelection(selection, pageNumber);
    if (!xpath)
    {
      return;
    }

    // Remove any line break characters from the string to avoid selecting more than needed.
    let selectedText = selection.toString();
    selectedText = selectedText.replace(/[\n\r]/g, "");

    const textSelection: textSelection = {
      xpath,
      selectedText,
      selectedTextOffset: selection.anchorOffset
    }

    // Update the pending annotation.
    this.pendingAnnotation!.setReference(
      textSelection,
      pageNumber);
    this.pendingAnnotationChange.emit(this.pendingAnnotation);

    this.onPendingAnnotationTextSelected.emit();
    this.pdfBehaviour.iframeDocument.getSelection()!.removeAllRanges();
    this.sendDebugMessage('Start annotation flow for selection.', selection);
  }

  private onBoundingBoxCreated(bounds: boundingBox, page: number)
  {
    this.pendingAnnotation!.setReference(bounds, page);
    this.pendingAnnotationChange.emit(this.pendingAnnotation);

    this.onPendingAnnotationBoundingBoxCreated.emit();
  }

  public drawRectangle(bounds: boundingBox, page: number, color: string, pending = false)
  {
    this.pdfAnnotationDrawer.drawRectangle(bounds, page, color, 1, pending);
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

    console.log(`Iframe - ${message}`, ...optionalParams);
  }
}