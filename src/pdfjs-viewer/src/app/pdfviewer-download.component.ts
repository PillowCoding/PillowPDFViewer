import { Component } from '@angular/core';
import { pdfContext } from 'ng2-pdfjs-viewer';

@Component({
    selector: 'lib-pdfviewer-simple',
    template: `
        <lib-ng2-pdfjs-viewer
            [fileSource]="'/assets/compressed.tracemonkey-pldi-09.pdf'"

            [enableFileSelect]="false"
            [enableTextAnnotating]="false"
            [enableDrawAnnotating]="false"
            [enablePrinting]="false"
            [enableTextEditing]="false"
            [enableDrawEditing]="false"

            [page]="1"
            [zoom]="'auto'"
            [pagemode]="'none'"
            [scrollMode]="'vertical'"
            [spreadMode]="'none'"

            [behaviourOnDownload]="this.onDownload">
        </lib-ng2-pdfjs-viewer>
    `,
})
export class pdfViewerDownloadComponent
{
    onDownload(context: pdfContext)
    {
        console.log("Downloading the file in 3 seconds...");
        console.log(context);

        setTimeout(() => {
            const a = document.createElement("a");
            a.href = context.blobUrl;
            a.target = '_parent';
            a.download = `${context.title}.pdf`;
            (document.body || document.documentElement).append(a);
            a.click();
            a.remove();
        }, 3000);
    }
}
