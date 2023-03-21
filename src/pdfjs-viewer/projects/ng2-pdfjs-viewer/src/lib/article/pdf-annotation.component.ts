import { Component, ContentChild, ElementRef, EventEmitter, Input, Output, TemplateRef, ViewChild } from '@angular/core';
import { templateRefDirective } from '../../public-api';
import { pdfAnnotation, pdfAnnotationComment } from '../pdf-annotation';

export type pdfAnnotationCommentSubmission = {annotation: pdfAnnotation, comment: pdfAnnotationComment};

@Component({
  selector: 'lib-ng2-pdfjs-viewer-annotation',
  template: `
    <article (click)="clickAnnotation($event)" attr.data-annotation="{{annotation.id}}">
      <header>
        <ng-container *ngTemplateOutlet="metaDataHeaderTemplate || defaultMetaDataHeaderTemplate; context: { annotation: annotation }"></ng-container>
      </header>
      <div class="annotation-content">
        <ng-container *ngIf="annotation.type === 'text'">
          <blockquote *ngIf="$any(annotation.reference)?.selectedText">
            <p>{{$any(annotation.reference).selectedText}}</p>
          </blockquote>
          <blockquote *ngIf="!$any(annotation.reference)?.selectedText">
            <p>...</p>
          </blockquote>
        </ng-container>
        <div class="input-group input-group-sm mb-3" *ngIf="annotation.reference">
          <input #annotationComment type="text" class="form-control" aria-label="Annotation input" aria-describedby="inputGroup-sizing-sm" attr.data-annotation-input="{{annotation.id}}">

          <button class="btn px-3 btn-primary" (click)="onSubmitAnnotationComment()">Post</button>
        </div>

        <div *ngFor="let comment of annotation.comments">
          <ng-container *ngTemplateOutlet="commentTemplate || defaultCommentTemplate; context: { comment: comment }"></ng-container>
        </div>
      </div>
    </article>

    <ng-template #defaultMetaDataHeaderTemplate let-annotation="annotation">
      <p>{{annotation.dateCreated | date: 'h:mm:ss'}}</p>
    </ng-template>

    <ng-template #defaultCommentTemplate let-comment="comment">
      <span class="me-2 fw-bold">{{comment.dateCreated | date: 'h:mm:ss'}}:</span> {{comment.text}}
    </ng-template>
  `,
  styleUrls: ['pdf-annotation.component.scss']
})
export class PdfAnnotationComponent
{
  @ViewChild('annotationComment') private _annotationComment?: ElementRef;

  @Input() annotation!: pdfAnnotation;

  @Input() metaDataHeaderTemplate?: TemplateRef<any>;
  @Input() commentTemplate?: TemplateRef<any>;

  @Output() onCommentPosted = new EventEmitter<pdfAnnotationCommentSubmission>();
  @Output() onClick = new EventEmitter<pdfAnnotation>();

  public clickAnnotation(event: any)
  {
    this.onClick.emit(this.annotation);
  }

  /**
   * Called when an annotation was submitted.
   */
  protected onSubmitAnnotationComment()
  {
    const annotationCommentValue = this._annotationComment!.nativeElement.value;
    this._annotationComment!.nativeElement.value = '';
    const annotationComment = new pdfAnnotationComment(annotationCommentValue);
    this.onCommentPosted.emit({annotation: this.annotation, comment: annotationComment});
  }
}