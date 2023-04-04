import { Component, ElementRef, EventEmitter, Input, Output, TemplateRef, ViewChild } from '@angular/core';
import { pdfAnnotation, pdfAnnotationComment } from '../pdf-annotation';

export type pdfAnnotationCommentSubmission = {annotation: pdfAnnotation, comment: pdfAnnotationComment};

@Component({
    selector: 'lib-ng2-pdfjs-viewer-annotation',
    template: `
        <article (click)="clickAnnotation()" attr.data-annotation="{{annotation.id}}">
            <div class="loading-indicator">
                <lib-ng2-pdfjs-viewer-loading-ring></lib-ng2-pdfjs-viewer-loading-ring>
            </div>

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
                <div class="form" *ngIf="annotation.reference">
                <input #annotationComment type="text" aria-label="Annotation input" attr.data-annotation-input="{{annotation.id}}" />
                <input type="submit" role="button" (click)="onSubmitAnnotationComment()" [value]="'annotations.post' | translate" />
                </div>

                <div *ngFor="let comment of annotation.comments">
                <ng-container *ngTemplateOutlet="commentTemplate || defaultCommentTemplate; context: { comment: comment }"></ng-container>
                </div>
            </div>
        </article>

        <ng-template #defaultMetaDataHeaderTemplate let-annotation="annotation">
            <div class="annotation-header font-bold">
                <p>{{annotation.dateCreated | date: 'h:mm:ss'}}</p>
            </div>
        </ng-template>

        <ng-template #defaultCommentTemplate let-comment="comment">
            <span class="font-bold">{{comment.dateCreated | date: 'h:mm:ss'}}:</span> {{comment.content}}
        </ng-template>
    `,
    styleUrls: ['pdf-annotation.component.scss']
})
export class PdfAnnotationComponent
{
    @ViewChild('annotationComment') private _annotationComment?: ElementRef;

    @Input() annotation!: pdfAnnotation;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Input() metaDataHeaderTemplate?: TemplateRef<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Input() commentTemplate?: TemplateRef<any>;

    @Output() commentPosted = new EventEmitter<pdfAnnotationCommentSubmission>();
    @Output() clicked = new EventEmitter<pdfAnnotation>();

    public clickAnnotation()
    {
        this.clicked.emit(this.annotation);
    }

    /**
     * Called when an annotation was submitted.
     */
    protected onSubmitAnnotationComment()
    {
        if (!this._annotationComment) {
            throw new Error('Comment input was not found.')
        }

        const annotationCommentValue = <string>this._annotationComment.nativeElement.value;

        // Ignore if empty.
        if (!annotationCommentValue.trim()) {
            return;
        }

        this._annotationComment.nativeElement.value = '';
        const annotationComment = new pdfAnnotationComment(annotationCommentValue);
        this.commentPosted.emit({annotation: this.annotation, comment: annotationComment});
    }
}