import { Component, Input } from "@angular/core";
import annotation from "ngx-pillow-pdf-viewer/annotation/annotation";
import LoggingProvider, { pdfViewerLogSourceType } from "ngx-pillow-pdf-viewer/utils/logging/loggingProvider";

export type annotationsProviderDelegate = (page: number) => Promise<annotation[]>;

@Component({
    selector: 'lib-pdf-annotation',
    templateUrl: 'pdf-annotation.component.html',
    styleUrls: ['pdf-annotation.component.scss', './../common.scss'],
})
export class PdfAnnotationComponent {

    @Input() public loggingProvider?: LoggingProvider;

    private assertParametersSet(): asserts this is this & {
        loggingProvider: LoggingProvider;
    } {
        const missingParameters = [];
        if (!this.loggingProvider) { missingParameters.push('loggingProvider'); }
        if (missingParameters.length > 0) {
            throw new Error(`Please provide a value for the parameters ${missingParameters.join(', ')}`);
        }
    }

    private sendLogMessage(message: unknown, source?: pdfViewerLogSourceType, ...args: unknown[]) {
        this.assertParametersSet();
        this.loggingProvider.send(message, source || PdfAnnotationComponent.name, ...args);
    }
}