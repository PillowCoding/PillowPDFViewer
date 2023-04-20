import { Component } from '@angular/core';

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
    }

    public async fetchAnnotationsForPage(page: number)
    {
        await this.delay(1000);
        return [];
    }
}
