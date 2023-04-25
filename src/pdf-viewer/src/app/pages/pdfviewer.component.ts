import { Component, ViewChild } from '@angular/core';
import { PdfViewerComponent } from 'ngx-pillow-pdf-viewer';
import Annotation from 'ngx-pillow-pdf-viewer/annotation/annotation';
import annotation from 'ngx-pillow-pdf-viewer/annotation/annotation';

type storedAnnotations = { fileName: string, baseUrl: string, annotations: Array<object> };

@Component({
    selector: 'lib-pdfviewer',
    templateUrl: 'pdfviewer.component.html',
    styleUrls: ['pdfviewer.component.scss'],
})
export class pdfViewerComponent
{
    @ViewChild('pdfViewer') private _pdfViewer!: PdfViewerComponent;

    // Fake delay can imitate I/O operations.
    // Adjust the value to change the time it takes.
    private readonly delay = () => { return new Promise<void>(resolve => setTimeout(resolve, 0)); }

    private readonly _storedAnnotationKey = 'storedAnnotations';

    private _annotations?: Array<annotation>;

    constructor() {
        this.fetchAnnotationsForPage = this.fetchAnnotationsForPage.bind(this);
        this.saveAnnotation = this.saveAnnotation.bind(this);
        this.saveAnnotationComment = this.saveAnnotationComment.bind(this);
    }

    public async fetchAnnotationsForPage(page: number)
    {
        if (!this._annotations) {
            this._annotations = this.getLocallyStoredAnnotations();
        }

        await this.delay();
        return this._annotations.filter(x => x.page === page);
    }

    public async saveAnnotation(annotation: annotation)
    {
        if (!this._annotations) {
            throw new Error('Expected annotations to exist.');
        }

        await this.delay();
        this._annotations.push(annotation);
        this.setLocallyStoredAnnotations(this._annotations);
    }

    public async saveAnnotationComment(/*annotation: annotation, comment: AnnotationComment*/)
    {
        if (!this._annotations) {
            throw new Error('Expected annotations to exist.');
        }

        await this.delay();
        this.setLocallyStoredAnnotations(this._annotations);
    }

    private async setLocallyStoredAnnotations(annotations: annotation[]) {
        if (!this._pdfViewer.pdfjsContext?.pdfViewerApplication) {
            throw new Error('PDF application could not be found.');
        }

        const fileName = this._pdfViewer.pdfjsContext.pdfViewerApplication._title;
        const baseUrl = this._pdfViewer.pdfjsContext.pdfViewerApplication.baseUrl;

        // Get existing annotations
        const storedAnnotationsUnparsed = localStorage.getItem(this._storedAnnotationKey);
        let storedAnnotations: Array<storedAnnotations> = storedAnnotationsUnparsed ? 
            JSON.parse(storedAnnotationsUnparsed) :
            [];
        
        // Filter out annotations from file.
        storedAnnotations = storedAnnotations.filter(x => x.baseUrl !== baseUrl);

        const serializableAnnotations = annotations.map(x => x.toObject());

        // Insert new
        storedAnnotations.push({
            fileName,
            baseUrl,
            annotations: serializableAnnotations
        });
        localStorage.setItem(this._storedAnnotationKey, JSON.stringify(storedAnnotations));
    }

    private getLocallyStoredAnnotations() {
        const storedAnnotationsUnparsed = localStorage.getItem(this._storedAnnotationKey);
        if (!storedAnnotationsUnparsed)
        {
            return [];
        }
        else
        {
            if (!this._pdfViewer.pdfjsContext?.pdfViewerApplication) {
                throw new Error('PDF application could not be found.');
            }

            const baseUrl = this._pdfViewer.pdfjsContext.pdfViewerApplication.baseUrl;

            const storedAnnotations: Array<storedAnnotations> = JSON.parse(storedAnnotationsUnparsed);
            const annotations =  storedAnnotations
                .find(x => x.baseUrl == baseUrl)?.annotations || [];

            return annotations.map(x => Annotation.fromObject(x));
        }
    }
}
