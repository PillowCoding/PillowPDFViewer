import { Component } from '@angular/core';
import { annotationProviderRequest, annotationProviderResponse, pdfAnnotation, pdfContext } from 'ng2-pdfjs-viewer';

@Component({
    selector: 'lib-pdfviewer-simple',
    template: `
        <lib-ng2-pdfjs-viewer
            [fileSource]="'/assets/compressed.tracemonkey-pldi-09.pdf'"
            [enableDebugMessages]="true"
            [enableEventBusDebugMessages]="true"

            [enableFileSelect]="false"
            [enablePrinting]="false"
            [enableTextEditing]="false"
            [enableDrawEditing]="false"

            [page]="1"
            [zoom]="'auto'"
            [pagemode]="'none'"
            [scrollMode]="'vertical'"
            [spreadMode]="'none'"

            [annotationsProvider]="annotationsProvider"
            [behaviourOnDownload]="onDownloadBehaviour"
            (annotationPosted)="onAnnotationPosted($event)"
            (annotationDeleted)="onAnnotationDeleted($event)">
        </lib-ng2-pdfjs-viewer>
    `,
})
export class pdfViewerAnnotateComponent
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
            const annotations: Array<pdfAnnotation> = JSON.parse(localStorage.getItem('pdfAnnotations') || '[]');
            this._annotations = annotations;
        }

        const annotations = this._annotations.filter(x => x.page == request.page);
        return {
            annotations,
            totalPage: annotations.length,
            total: this._annotations.length
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
        if (!this._annotations)
        {
            throw new Error("Expected a list of annotations to push to.")
        }

        this._annotations.push(annotation);
        console.log("PDF annotation was posted.", annotation);
    }

    onAnnotationDeleted(annotation: pdfAnnotation)
    {
        if (!this._annotations)
        {
            throw new Error("Expected a list of annotations to delete from.")
        }

        this._annotations = this._annotations.filter(x => x.id != annotation.id);
        console.log("PDF annotation was deleted.", annotation);
    }
}
