import { Component } from '@angular/core';

@Component({
    selector: 'app-pdfviewer-simple',
    template: `
        <lib-ng2-pdfjs-viewer
         [enableDebugMessages]="true"
         [enableEventBusDebugMessages]="false">
        </lib-ng2-pdfjs-viewer>
    `,
})
export class appPdfViewerSimpleComponent
{
}
