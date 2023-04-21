import { Component, Input, OnInit } from "@angular/core";
import annotation from "ngx-pillow-pdf-viewer/annotation/annotation";
import LoggingProvider from "ngx-pillow-pdf-viewer/utils/logging/loggingProvider";

export type annotationsProviderDelegate = (page: number) => Promise<annotation[]>;

@Component({
    selector: 'lib-pdf-annotation',
    templateUrl: 'pdf-annotation.component.html',
    styleUrls: ['pdf-annotation.component.scss', './../common.scss'],
})
export class PdfAnnotationComponent implements OnInit {

    @Input() public loggingProvider?: LoggingProvider;
    @Input() public annotation?: annotation;
    @Input() public expanded = false;

    private readonly _defaultLogSource = PdfAnnotationComponent.name;

    ngOnInit(): void {
        this.assertParametersSet();
    }

    public expand()
    {
        this.assertParametersSet();

        if (this.expanded)
        {
            return;
        }

        this.loggingProvider.sendDebug(`Expanding annotation ${this.annotation.id}...`, this._defaultLogSource);
        this.expanded = true;
    }

    public collapse()
    {
        this.assertParametersSet();

        if (!this.expanded)
        {
            return;
        }

        this.loggingProvider.sendDebug(`Collapsing annotation ${this.annotation.id}...`, this._defaultLogSource);
        this.expanded = false;
    }

    /**
     * Called when a comment is being submitted
     */
    public onSubmit()
    {
        this.assertParametersSet();
        this.loggingProvider.sendDebug('Submitting...', this._defaultLogSource);
    }

    private assertParametersSet(): asserts this is this & {
        loggingProvider: LoggingProvider;
        annotation: annotation;
    } {
        const missingParameters = [];
        if (!this.loggingProvider) { missingParameters.push('loggingProvider'); }
        if (!this.annotation) { missingParameters.push('annotation'); }
        if (missingParameters.length > 0) {
            throw new Error(`Please provide a value for the parameters: ${missingParameters.join(', ')}`);
        }
    }
}