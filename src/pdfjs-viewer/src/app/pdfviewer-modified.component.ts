import { Component, ViewChild } from '@angular/core';
import { annotationProviderRequest, annotationProviderResponse, Ng2PdfjsViewerComponent, pdfAnnotation } from 'ng2-pdfjs-viewer';
import { pdfAnnotationCommentSubmission } from 'ng2-pdfjs-viewer/article/pdf-annotation.component';

type storedFileAnnotations = { fileName: string, baseUrl: string, annotations: Array<pdfAnnotation> };

@Component({
    selector: 'lib-pdfviewer-simple',
    template: `
        <lib-ng2-pdfjs-viewer
            #pdfViewer

            [fileSource]="'/assets/compressed.tracemonkey-pldi-09.pdf'"

            [enableDebugMessages]="false"
            [enableEventBusDebugMessages]="false"

            [enableFileSelect]="false"
            [enablePrinting]="false"
            [enableTextEditing]="false"
            [enableDrawEditing]="false"
            [enableDownloading]="false"

            [page]="4"
            [zoom]="'page-fit'"
            [pagemode]="'thumbs'"
            [scrollMode]="'vertical'"
            [spreadMode]="'none'"

            [annotationsProvider]="annotationsProvider"
            [behaviourOnAnnotationPosted]="onAnnotationPost"
            [behaviourOnCommentPosted]="onCommentPost"
            (annotationDeleted)="onAnnotationDeleted($event)">

            <ng-template let-annotation="annotation" libTemplateRef="metaDataHeader">
                <div class="annotation-metadata">
                    <p><span class="font-bold">By:</span><span> {{annotation.creator}}</span></p>
                    <p class="font-bold">{{annotation.dateCreated | date: 'short'}}</p>
                </div>
                
                <!-- In your case you could add a check to this to ensure you can delete annotations, for example. -->
                <a type="button" class="close" aria-label="Close" (click)="this.clickDeleteAnnotation($event, annotation)"></a>
            </ng-template>

            <ng-template let-comment="comment" libTemplateRef="comment">
                <span class="font-bold">{{comment.creator}}:</span><span> {{comment.content}}</span>
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
            opacity: 0.6;

            &:hover {
                opacity: 1;
            }

            &:before, &:after {
                position: absolute;
                content: ' ';
                height: calc($close-button-height / 2);
                width: 2px;
                background-color: var(--icon-color);
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
export class pdfViewerModifiedComponent
{
    @ViewChild('pdfViewer') private _pdfViewer!: Ng2PdfjsViewerComponent;
    
    private readonly _annotationStorageKey = 'storedFileAnnotations';
    private readonly delay = (ms: number) => { return new Promise( resolve => setTimeout(resolve, ms) ); }

    private _annotations?: Array<pdfAnnotation>;

    constructor() {
        this.annotationsProvider = this.annotationsProvider.bind(this);
        this.onAnnotationPost = this.onAnnotationPost.bind(this);
        this.onCommentPost = this.onCommentPost.bind(this);
        this.onAnnotationDeleted = this.onAnnotationDeleted.bind(this);
        this.saveAnnotations = this.saveAnnotations.bind(this);
    }

    async annotationsProvider(request: annotationProviderRequest): Promise<annotationProviderResponse>
    {
        // Considering this is a test, we just fetch all stored annotations which is easier than filtering.
        if (!this._annotations)
        {
            const allStoredFileAnnotationsUnparsed = localStorage.getItem(this._annotationStorageKey);
            if (!allStoredFileAnnotationsUnparsed)
            {
                this._annotations = [];
            }
            else
            {
                const baseUrl = this._pdfViewer.baseUrl;
                const allStoredFileAnnotations: Array<storedFileAnnotations> = JSON.parse(allStoredFileAnnotationsUnparsed);

                this._annotations = allStoredFileAnnotations
                    .filter(x => x.baseUrl == baseUrl)[0]?.annotations || [];
            }
        }

        console.log(`Fetching annotations. Page: ${request.page}`);
        await this.delay(1000);

        // Determine the right annotations based on file source.
        const annotations = this._annotations
            .filter(x => x.page == request.page);
        return {
            annotations,
            totalPage: annotations.length,
            total: this._annotations.length
        }
    }

    async saveAnnotations()
    {
        if (!this._annotations)
        {
            return;
        }

        const fileName = this._pdfViewer.fileName;
        const baseUrl = this._pdfViewer.baseUrl;

        // Get existing annotations.
        // We will push a new entry to the array.
        // If no existing annotations exist, we will create a new array.
        const allStoredFileAnnotationsUnparsed = localStorage.getItem(this._annotationStorageKey);
        const allStoredFileAnnotations: Array<storedFileAnnotations> = allStoredFileAnnotationsUnparsed ? 
            JSON.parse(allStoredFileAnnotationsUnparsed) :
            [];

        const existingStoredAnnotations = allStoredFileAnnotations
            .filter(x => x.baseUrl == baseUrl)[0];

        if (!existingStoredAnnotations)
        {
            allStoredFileAnnotations.push({
                fileName,
                baseUrl,
                annotations: this._annotations
            });
        }
        else
        {
            existingStoredAnnotations.annotations = this._annotations
        }

        await this.delay(1000);
        localStorage.setItem(this._annotationStorageKey, JSON.stringify(allStoredFileAnnotations));
        console.log("Annotations have been saved.");
    }

    async onAnnotationPost(annotation: pdfAnnotation)
    {
        if (!this._annotations)
        {
            throw new Error('Expected annotations to exist.');
        }

        await this.delay(1000);
        const comment = annotation.comments.pop();

        if (!comment)
        {
            throw new Error('Expected a comment.');
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (<any>comment).creator = 'me';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (<any>annotation).creator = 'me';

        annotation.comments.push(comment);
        this._annotations.push(annotation);
        console.log("Annotation was posted.");

        await this.saveAnnotations();
    }

    async onCommentPost(submission: pdfAnnotationCommentSubmission)
    {
        // Delays simulate a database call in this case.
        await this.delay(1000);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (<any>submission.comment).creator = 'me';
        
        console.log("Comment was posted.", submission);
        await this.saveAnnotations();
    }

    protected clickDeleteAnnotation(event: MouseEvent, annotation: pdfAnnotation)
    {
        event.stopPropagation();
        this._pdfViewer.deleteAnnotation(annotation);
    }

    async onAnnotationDeleted(annotation: pdfAnnotation)
    {
        if (!this._annotations)
        {
            throw new Error('Expected annotations to exist.');
        }

        this._annotations = this._annotations.filter(x => x.id != annotation.id);
        console.log("Annotation was deleted.");
        await this.saveAnnotations();
    }
}
