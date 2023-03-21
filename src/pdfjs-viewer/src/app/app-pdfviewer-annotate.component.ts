import { Component, OnInit } from '@angular/core';
import { annotationProviderRequest, annotationProviderResponse, pdfAnnotation, pdfContext } from 'ng2-pdfjs-viewer';

@Component({
    selector: 'app-pdfviewer-simple',
    template: `
        <lib-ng2-pdfjs-viewer
            [fileSource]="'/assets/compressed.tracemonkey-pldi-09.pdf'"
            [enableDebugMessages]="true"
            [enableEventBusDebugMessages]="true"

            [UseToolbarFileSelector]="false"
            [openFileEnabled]="false"
            [printingEnabled]="false"
            [textEditorEnabled]="false"
            [drawingEnabled]="false"

            [page]="1"
            [zoom]="'auto'"
            [pagemode]="'none'"
            [scrollMode]="'vertical'"
            [spreadMode]="'none'"

            [annotationsProvider]="annotationsProvider"
            [behaviourOnDownload]="onDownloadBehaviour"
            (onAnnotationPosted)="onAnnotationPosted($event)"
            (onAnnotationDeleted)="onAnnotationDeleted($event)">
        </lib-ng2-pdfjs-viewer>
    `,
})
export class appPdfViewerAnnotateComponent
{
    private _annotations?: Array<pdfAnnotation>;

    constructor() {
        this.annotationsProvider = this.annotationsProvider.bind(this);
        this.onDownloadBehaviour = this.onDownloadBehaviour.bind(this);
        this.onDownload = this.onDownload.bind(this);
        this.onAnnotationPosted = this.onAnnotationPosted.bind(this);
        this.onAnnotationDeleted = this.onAnnotationDeleted.bind(this);
    }

    async annotationsProvider(request: annotationProviderRequest): Promise<annotationProviderResponse>
    {
        if (!this._annotations)
        {
            this._annotations = JSON.parse(localStorage.getItem('pdfAnnotations') ?? '[]');
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

        console.log('Saving...', context);
        localStorage.setItem('pdfAnnotations', JSON.stringify(this._annotations));
    }

    onDownload()
    {
        console.log("The annotations have been saved.");
    }

    onAnnotationPosted(annotation: pdfAnnotation)
    {
        this._annotations!.push(annotation);
        console.log("PDF annotation was posted.", annotation);
    }

    onAnnotationDeleted(annotation: pdfAnnotation)
    {
        this._annotations = this._annotations!.filter(x => x.id != annotation.id);
        console.log("PDF annotation was deleted.", annotation);
    }
}
