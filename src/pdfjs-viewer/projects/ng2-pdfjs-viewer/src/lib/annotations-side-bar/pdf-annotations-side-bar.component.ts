import { animate, state, style, transition, trigger } from '@angular/animations';
import { ChangeDetectorRef, Component, EventEmitter, Input, Output, TemplateRef } from '@angular/core';
import { pdfAnnotationCommentSubmission } from 'ng2-pdfjs-viewer/article/pdf-annotation.component';
import { pdfAnnotation } from 'ng2-pdfjs-viewer/pdf-annotation';

@Component({
  selector: 'lib-ng2-pdfjs-viewer-annotations-sidebar',
  template: `
    <div class="annotation-container full-height" [@expandInOut]="sidebarExpanded ? 'expand' : 'collapse'">
      <div class="header">
        <a
          *ngIf="sidebarExpanded"
          class="toolbar-button close close-annotations" [title]="'sidebar.collapse' | translate"
          (click)="collapseAnnotations()">
        </a>
        <button
        *ngIf="!sidebarExpanded"
          class="toolbar-button expand" [title]="'sidebar.expand' | translate"
          (click)="expandAnnotations()">
        </button>

        <span class="count font-bold" *ngIf="sidebarExpanded && shownAnnotations.length == 1">{{'annotations.singular' | translate: shownAnnotations.length.toString()}}</span>
        <span class="count font-bold" *ngIf="sidebarExpanded && shownAnnotations.length != 1">{{'annotations.plural' | translate: shownAnnotations.length.toString()}}</span>
      </div>
      <ol class="annotations" *ngIf="sidebarExpanded">
        <p class="warning no-annotations" *ngIf="shownAnnotations.length == 0 && !pendingAnnotation">{{'annotations.nonePage' | translate}}</p>

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
  styleUrls: ['pdf-annotations-side-bar.component.scss'],
  animations: [
    trigger('expandInOut', [
      state('expand', style({
        width: '30rem'
      })),
      state('collapse', style({
        width: '28px'
      })),
      transition('expand => collapse', animate('100ms ease-out')),
      transition('collapse => expand', animate('100ms ease-out'))
    ])
  ]
})
export class PdfAnnotationsSideBarComponent
{
  @Input() enableDebugMessages!: boolean;
  @Input() pendingAnnotation?: pdfAnnotation;

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
    return this.annotations.filter(x => x.page == this.currentPage).reverse();
  }

  constructor(
    private changeDetector: ChangeDetectorRef)
  {
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

  public setAnnotationLoading(annotation: pdfAnnotation)
  {
    const annotationContainer = document.querySelectorAll(`[data-annotation="${annotation.id}"]`);

    if (annotationContainer.length != 1)
    {
      throw new Error('Could not find the annotation to mark as loading.');
    }

    annotationContainer[0].classList.add('loading');
  }

  public setAnnotationNotLoading(annotation: pdfAnnotation)
  {
    const annotationContainer = document.querySelectorAll(`[data-annotation="${annotation.id}"]`);

    if (annotationContainer.length != 1)
    {
      throw new Error('Could not find the annotation to mark as loading.');
    }

    annotationContainer[0].classList.remove('loading');
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