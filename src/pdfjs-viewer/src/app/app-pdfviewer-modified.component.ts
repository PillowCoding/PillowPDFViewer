import { Component, ViewChild } from '@angular/core';
import { annotationProviderRequest, annotationProviderResponse, Ng2PdfjsViewerComponent, pdfAnnotation, pdfContext } from 'ng2-pdfjs-viewer';
import { pdfAnnotationCommentSubmission } from 'ng2-pdfjs-viewer/article/pdf-annotation.component';

@Component({
    selector: 'app-pdfviewer-simple',
    template: `
        <lib-ng2-pdfjs-viewer
            #pdfViewer

            [fileSource]="'/assets/compressed.tracemonkey-pldi-09.pdf'"
            [enableDebugMessages]="false"

            [UseToolbarFileSelector]="false"
            [openFileEnabled]="false"
            [printingEnabled]="false"
            [textEditorEnabled]="false"
            [drawingEnabled]="false"

            [annotationsProvider]="annotationsProvider"
            [behaviourOnDownload]="onDownloadBehaviour"
            [behaviourOnAnnotationPosted]="onAnnotationPost"
            [behaviourOnCommentPosted]="onCommentPost"
            (onAnnotationPosted)="onAnnotationPosted($event)"
            (onAnnotationDeleted)="onAnnotationDeleted($event)"
            (onCommentPosted)="onCommentPosted($event)">

            <ng-template let-annotation="annotation" templateRef="metaDataHeader">
                <div class="annotation-metadata">
                    <p><span class="font-bold margin-right-small">By:</span><span>{{annotation.creator}}</span></p>
                    <p class="font-bold">{{annotation.dateCreated | date: 'short'}}</p>
                </div>
                
                <!-- In your case you could add a check to this to ensure you can delete annotations, for example. -->
                <a type="button" class="close" aria-label="Close" (click)="this.clickDeleteAnnotation($event, annotation)"></a>
            </ng-template>

            <ng-template let-comment="comment" templateRef="comment">
                <span class="font-bold margin-right-small">{{comment.creator}}:</span> <span>{{comment.text}}</span>
            </ng-template>
        </lib-ng2-pdfjs-viewer>
    `,
    styles: [`

        $close-button-height: 40px;
        $close-button-width: 40px;

        .annotation-metadata
        {
            display: inline-flex;
            justify-content: space-between;
            width: calc(100% - $close-button-width);
            margin-right: .5rem;
        }

        .font-bold
        {
            font-weight: 700;
        }

        .close {
            width: $close-button-width;
            height: $close-button-height;
            opacity: 0.3;

            &:hover {
                opacity: 1;
            }

            &:before, &:after {
                position: absolute;
                content: ' ';
                height: calc($close-button-height / 2);
                width: 2px;
                background-color: #333;
            }

            &:before {
                transform: rotate(45deg) translateX(calc($close-button-width / 2));
            }
            &:after {
                transform: rotate(-45deg) translate(0, calc($close-button-width / 2));
            }
        }
    `]
})
export class appPdfViewerModifiedComponent
{
    @ViewChild('pdfViewer') private _pdfViewer?: Ng2PdfjsViewerComponent;
    
    private readonly _annotationStorageKey = 'annotations-modified';

    private _annotations?: Array<pdfAnnotation>;

    private delay = (ms: number) => { return new Promise( resolve => setTimeout(resolve, ms) ); }

    constructor() {
        this.annotationsProvider = this.annotationsProvider.bind(this);
        this.onDownloadBehaviour = this.onDownloadBehaviour.bind(this);
        this.onAnnotationPost = this.onAnnotationPost.bind(this);
        this.onCommentPost = this.onCommentPost.bind(this);
        this.onAnnotationPosted = this.onAnnotationPosted.bind(this);
        this.onAnnotationDeleted = this.onAnnotationDeleted.bind(this);
    }

    async annotationsProvider(request: annotationProviderRequest): Promise<annotationProviderResponse>
    {
        if (!this._annotations)
        {
            this._annotations = JSON.parse(localStorage.getItem(this._annotationStorageKey) ?? '[]');
        }

        const pageAnnotations = this._annotations!.filter(x => x.page == request.page);
        const annotations = pageAnnotations.slice(request.skip, request.skip + request.take);
        return {
            annotations,
            totalPage: pageAnnotations.length,
            total: this._annotations!.length
        }
    }

    onDownloadBehaviour(context: pdfContext)
    {
        if (!this._annotations)
        {
            return;
        }

        localStorage.setItem(this._annotationStorageKey, JSON.stringify(this._annotations));
        console.log("Annotations have been saved.");
    }

    async onAnnotationPost(annotation: pdfAnnotation)
    {
        // Delays simulate a database call in this case.
        await this.delay(1000);
        const comment = annotation.comments.pop()!;

        (<any>comment).creator = 'me';
        (<any>annotation).creator = 'me';

        annotation.comments.push(comment);
        await this.delay(1000);
        this._annotations!.push(annotation);
    }

    async onCommentPost(submission: pdfAnnotationCommentSubmission)
    {
        // Delays simulate a database call in this case.
        await this.delay(1000);
        (<any>submission.comment).creator = 'me';
        await this.delay(1000);
    }

    onAnnotationPosted(annotation: pdfAnnotation)
    {
        console.log("Annotation was posted.");
    }

    onCommentPosted(submission: pdfAnnotationCommentSubmission)
    {
        console.log("Comment was posted.");
    }

    protected clickDeleteAnnotation(event: any, annotation: pdfAnnotation)
    {
        event.stopPropagation();
        this._pdfViewer!.deleteAnnotation(annotation);
    }

    onAnnotationDeleted(annotation: pdfAnnotation)
    {
        this._annotations = this._annotations!.filter(x => x.id != annotation.id);
        console.log("Annotation was deleted.");
    }
}
