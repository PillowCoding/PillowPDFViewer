import { Component, ElementRef, EventEmitter, Input, Output, TemplateRef, ViewChild } from '@angular/core';
import { pdfAnnotation, pdfAnnotationComment } from '../pdf-annotation';

export type pdfAnnotationCommentSubmission = {annotation: pdfAnnotation, comment: pdfAnnotationComment};

@Component({
    selector: 'lib-ng2-pdfjs-viewer-annotation',
    template: `
        <article (click)="onAnnotationClicked()" attr.data-annotation="{{annotation.id}}" [class.expanded]="isExpanded">
            <div class="loading-indicator">
                <lib-ng2-pdfjs-viewer-loading-ring></lib-ng2-pdfjs-viewer-loading-ring>
            </div>

            <header>
                <ng-container *ngTemplateOutlet="metaDataHeaderTemplate || defaultMetaDataHeaderTemplate; context: { annotation: annotation }"></ng-container>
            </header>
            <div *ngIf="isExpanded"
                class="annotation-content">
                <ng-container *ngIf="annotation.type === 'text'">
                    <blockquote *ngIf="$any(annotation.reference)?.selectedText">
                        <p>{{$any(annotation.reference).selectedText}}</p>
                    </blockquote>
                    <blockquote *ngIf="!$any(annotation.reference)?.selectedText">
                        <p>...</p>
                    </blockquote>
                </ng-container>
                <form class="form" *ngIf="annotation.reference">
                    <input #annotationComment type="text" aria-label="Annotation input" attr.data-annotation-input="{{annotation.id}}" />
                    <input type="submit" role="button" (click)="onSubmitAnnotationComment()" [value]="'annotations.post' | translate" />
                </form>

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

    @Input() metaDataHeaderTemplate?: TemplateRef<unknown>;
    @Input() commentTemplate?: TemplateRef<unknown>;

    @Output() commentPosted = new EventEmitter<pdfAnnotationCommentSubmission>();
    @Output() clicked = new EventEmitter<pdfAnnotation>();

    private _isExpanded = false;
    public get isExpanded() {
        return this._isExpanded;
    }

    public expand()
    {
        if (this.isExpanded) {
            // Warning removed since the collapse warning can happen under normal behaviour.
            //console.warn(`Annotation ${this.annotation.id} is already expanded.`);
            return;
        }

        this._isExpanded = true;
    }

    public collapse()
    {
        // This can happen, when a rerender happends due to scrolling.
        if (!this.isExpanded) {
            //console.warn(`Annotation ${this.annotation.id} is already collapsed.`);
            return;
        }

        this._isExpanded = false;
    }

    protected onAnnotationClicked()
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