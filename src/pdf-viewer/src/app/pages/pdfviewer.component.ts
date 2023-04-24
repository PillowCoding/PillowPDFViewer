import { Component } from '@angular/core';
import annotation, { AnnotationComment } from 'ngx-pillow-pdf-viewer/annotation/annotation';

@Component({
    selector: 'lib-pdfviewer',
    templateUrl: 'pdfviewer.component.html',
    styleUrls: ['pdfviewer.component.scss'],
})
export class pdfViewerComponent
{
    private readonly delay = (ms: number) => { return new Promise( resolve => setTimeout(resolve, ms) ); }

    constructor() {
        this.fetchAnnotationsForPage = this.fetchAnnotationsForPage.bind(this);
        this.saveAnnotation = this.saveAnnotation.bind(this);
        this.saveAnnotationComment = this.saveAnnotationComment.bind(this);
    }

    public async fetchAnnotationsForPage(page: number)
    {
        await this.delay(1000);
        return [];
    }

    public async saveAnnotation(annotation: annotation)
    {
        await this.delay(1000);
    }

    public async saveAnnotationComment(annotation: annotation, comment: AnnotationComment)
    {
        await this.delay(1000);
    }
}
