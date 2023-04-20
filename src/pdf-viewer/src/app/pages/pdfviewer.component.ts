import { Component } from '@angular/core';

@Component({
    selector: 'lib-pdfviewer',
    templateUrl: 'pdfviewer.component.html',
    styleUrls: ['pdfviewer.component.scss'],
})
export class pdfViewerComponent
{
    private readonly _annotationStorageKey = 'storedAnnotations';
    private readonly delay = (ms: number) => { return new Promise( resolve => setTimeout(resolve, ms) ); }
}
