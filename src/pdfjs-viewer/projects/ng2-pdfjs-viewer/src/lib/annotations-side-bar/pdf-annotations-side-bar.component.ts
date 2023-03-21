import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, TemplateRef, ViewChild } from '@angular/core';
import { pdfAnnotationCommentSubmission, PdfAnnotationComponent } from 'ng2-pdfjs-viewer/article/pdf-annotation.component';
import { pdfAnnotation } from 'ng2-pdfjs-viewer/pdf-annotation';

const containerWidthLocalStorageKey = 'ng2-pdfjs-viewer-annotations-container-width';
const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

@Component({
  selector: 'lib-ng2-pdfjs-viewer-annotations-sidebar',
  template: `
    <div class="annotation-container full-height" [style.width.rem]="sidebarExpanded ? baseAnnotationContainerWidth : 2">
      <div class="header">
        <a
          *ngIf="sidebarExpanded"
          class="toolbar-button close close-annotations" title="Collapse"
          (click)="collapseAnnotations()">
        </a>
        <button
        *ngIf="!sidebarExpanded"
          class="toolbar-button expand" title="Expand"
          (click)="expandAnnotations()">
        </button>

        <span class="count font-bold" *ngIf="sidebarExpanded">Annotations ({{shownAnnotations.length}})</span>

        <div class="scaling-buttons" *ngIf="sidebarExpanded">
          <div role="group">
            <button type="button" class="button small"
              (click)="increaseContainerWidth()">
              <
            </button>
            <button type="button" class="button small"
              (click)="decreaseContainerWidth()">
              >
            </button>
          </div>
        </div>
      </div>
      <ol class="annotations" *ngIf="sidebarExpanded">
        <p class="warning no-annotations" *ngIf="shownAnnotations.length == 0 && !pendingAnnotation">There are no annotations on this page.</p>

        <li *ngIf="pendingAnnotation" class="annotation">
          <lib-ng2-pdfjs-viewer-annotation
            [annotation]="pendingAnnotation"
            (onCommentPosted)="submitInitialAnnotationComment($event)">
          </lib-ng2-pdfjs-viewer-annotation>
        </li>

        <li *ngFor="let annotation of shownAnnotations" class="annotation">
          <lib-ng2-pdfjs-viewer-annotation
            [annotation]="annotation"
            [metaDataHeaderTemplate]="annotationMetaDataHeaderTemplate"
            [commentTemplate]="annotationCommentTemplate"

            (onClick)="clickAnnotation($event)"
            (onCommentPosted)="submitAnnotationComment($event)">
          </lib-ng2-pdfjs-viewer-annotation>
        </li>
      </ol>
    </div>
  `,
  styleUrls: ['pdf-annotations-side-bar.component.scss']
})
export class PdfAnnotationsSideBarComponent implements OnInit
{
  @Input() enableDebugMessages!: boolean;
  @Input() pendingAnnotation?: pdfAnnotation;
  @Input() baseAnnotationContainerWidth!: number;

  @Input() annotationMetaDataHeaderTemplate?: TemplateRef<any>;
  @Input() annotationCommentTemplate?: TemplateRef<any>;

  // Used for the shown annotations.
  @Input() currentPage!: number;
  @Input() annotations!: Array<pdfAnnotation>;

  @Output() onSidebarExpand = new EventEmitter();
  @Output() onSidebarExpanded = new EventEmitter();
  @Output() onSidebarCollapse = new EventEmitter();
  @Output() onSidebarCollapsed = new EventEmitter();
  @Output() onClick = new EventEmitter<pdfAnnotation>();
  @Output() onInitialCommentPosted = new EventEmitter<pdfAnnotationCommentSubmission>();
  @Output() onCommentPosted = new EventEmitter<pdfAnnotationCommentSubmission>();

  /** Represents the current focussed annotation, if any are focused on. */
  private _currentAnnotationFocus?: pdfAnnotation;
  
  private _sidebarExpanded = false;

  /** A boolean to define if the annotations bar is expanded. */
  public get sidebarExpanded()
  {
    return this._sidebarExpanded;
  }

  /** The annotations shown in the sidebar. */
  public get shownAnnotations()
  {
    return this.annotations.filter(x => x.page == this.currentPage);
  }

  constructor(
    private changeDetector: ChangeDetectorRef)
  {
  }

  ngOnInit()
  {
    const savedContainerWidth = localStorage.getItem(containerWidthLocalStorageKey);
    if (!savedContainerWidth)
    {
      return;
    }

    this.baseAnnotationContainerWidth = Number(savedContainerWidth);
  }

  public ensureExpanded()
  {
    if (!this._sidebarExpanded)
    {
      this.expandAnnotations();
    }
  }

  public focusAnnotation(annotation: pdfAnnotation)
  {
    this.ensureExpanded();
    this.sendDebugMessage(`Start focus on annotation ${annotation.id}...`);

    const attributeArticle = document.querySelectorAll(`[data-annotation="${annotation.id}"]`);

    if (attributeArticle.length != 1)
    {
      throw new Error('Could not find the annotation comments.');
    }

    attributeArticle[0].classList.add('focus');
    this._currentAnnotationFocus = annotation;
  }

  public unfocusAnnotation()
  {
    this.sendDebugMessage(`Start unfocus...`);

    if (!this._currentAnnotationFocus)
    {
      throw new Error('Expected a focussed annotation.');
    }

    const attributeArticle = document.querySelectorAll(`[data-annotation="${this._currentAnnotationFocus.id}"]`);

    if (attributeArticle.length != 1)
    {
      throw new Error('Could not find the annotation comments.');
    }

    attributeArticle[0].classList.remove('focus');
    delete(this._currentAnnotationFocus);
  }

  public focusAnnotationInput(annotation: pdfAnnotation)
  {
    this.ensureExpanded();
    this.sendDebugMessage(`Start focus on annotation input for ${annotation.id}...`);

    const attributeArticle = document.querySelectorAll(`[data-annotation-input="${annotation.id}"]`);

    if (attributeArticle.length != 1)
    {
      throw new Error('Could not find the annotation comment input to focus.');
    }

    (attributeArticle[0] as HTMLElement).focus();
    this.sendDebugMessage('Input focus changed', attributeArticle[0]);
  }

  protected decreaseContainerWidth()
  {
    this.setContainerWidth(-5);
  }

  protected increaseContainerWidth()
  {
    this.setContainerWidth(5);
  }

  private setContainerWidth(change: number)
  {
    this.baseAnnotationContainerWidth += change;
    this.baseAnnotationContainerWidth = clamp(this.baseAnnotationContainerWidth, 20, 60);
    localStorage.setItem(containerWidthLocalStorageKey, this.baseAnnotationContainerWidth.toString());
  }

  protected expandAnnotations()
  {
    if (this._sidebarExpanded)
    {
      throw new Error('Tried to expand the annotations whilst expanded.');
    }

    this.onSidebarExpand.emit();
    this._sidebarExpanded = true;
    this.changeDetector.detectChanges();
    this.onSidebarExpanded.emit();
  }

  protected collapseAnnotations()
  {
    if (!this._sidebarExpanded)
    {
      throw new Error('Tried to collapse the annotations whilst collapsed.');
    }

    this.onSidebarCollapse.emit();
    this._sidebarExpanded = false;
    this.changeDetector.detectChanges();
    this.onSidebarCollapsed.emit();
  }

  protected clickAnnotation(annotation: pdfAnnotation)
  {
    this.onClick.emit(annotation);
  }

  protected submitInitialAnnotationComment(event: pdfAnnotationCommentSubmission)
  {
    this.sendDebugMessage('Submitting initial comment', event);
    this.onInitialCommentPosted.emit(event);
  }

  protected submitAnnotationComment(event: pdfAnnotationCommentSubmission)
  {
    const { annotation, comment } = event;
    annotation.comments.push(comment);

    this.sendDebugMessage('Submitting comment', event);
    this.onCommentPosted.emit(event);
    this.changeDetector.detectChanges();
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

    console.log(`Side bar - ${message}`, ...optionalParams);
  }
}