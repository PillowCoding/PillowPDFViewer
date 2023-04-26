import { ChangeDetectorRef, Component, ElementRef, Input, OnInit, ViewChild } from "@angular/core";
import annotation, { AnnotationComment } from "ngx-pillow-pdf-viewer/annotation/annotation";
import PdfjsContext from "ngx-pillow-pdf-viewer/pdfjsContext";
import { EventBusEventType } from "ngx-pillow-pdf-viewer/types/eventBus";
import LoggingProvider from "ngx-pillow-pdf-viewer/utils/logging/loggingProvider";

export type annotationsProviderDelegate = (page: number) => Promise<annotation[]>;

@Component({
    selector: 'lib-pdf-annotation',
    templateUrl: 'pdf-annotation.component.html',
    styleUrls: ['pdf-annotation.component.scss', './../common.scss'],
})
export class PdfAnnotationComponent implements OnInit {

    @ViewChild('annotationCommentInput') private _annotationCommentInput!: ElementRef<HTMLInputElement>;
    
    @Input() public loggingProvider?: LoggingProvider;
    @Input() public pdfjsContext?: PdfjsContext;
    @Input() public annotation?: annotation;
    @Input() public expanded = false;

    @Input()
    public set loading(loading: boolean) {
        this.assertParametersSet();

        this._loadingCount += loading ? 1 : -1;
        if (this._loadingCount < 0) {
            this.loggingProvider.sendWarning('The loading count went below 0 which should not happen.', this._defaultLogSource);
            this._loadingCount = 0;
        }

        // Also set the input loading.
        this.inputLoading = loading;
    }

    public get loading() {
        return this._loadingCount > 0;
    }

    @Input()
    public set inputLoading(loading: boolean) {
        this.assertParametersSet();

        this._inputLoadingCount += loading ? 1 : -1;
        if (this._inputLoadingCount < 0) {
            this.loggingProvider.sendWarning('The input loading count went below 0 which should not happen.', this._defaultLogSource);
            this._inputLoadingCount = 0;
        }
    }

    public get inputLoading() {
        return this._inputLoadingCount > 0;
    }

    @Input() focused = false;

    // If loadingCount is higher than 0, the component is loading.
    private _loadingCount = 0;

    // If loadingCount is higher than 0, the component is loading.
    private _inputLoadingCount = 0;

    private readonly _defaultLogSource = PdfAnnotationComponent.name;

    constructor(
        private changeDetector: ChangeDetectorRef
    ) {
    }

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
        this.stateHasChanged();
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
        this.stateHasChanged();
    }

    /**
     * Called when a comment is being submitted
     */
    public onCommentSubmit()
    {
        this.assertParametersSet();

        const annotationComment = this._annotationCommentInput.nativeElement.value.trim();

        // Ignore empty.
        if (!annotationComment) {
            return;
        }

        this.loggingProvider.sendDebug('Submitting comment...', this._defaultLogSource);

        const comment = new AnnotationComment(annotationComment);
        this._annotationCommentInput.nativeElement.value = '';

        this.pdfjsContext.dispatchEventBus('annotationCommentSubmit', {
            source: this,
            annotation: this.annotation,
            comment,
        })
    }

    public toggleFocus() {
        this.assertParametersSet();
        this.focused = !this.focused;

        const event: EventBusEventType = this.focused ? 'annotationFocus' : 'annotationUnfocus';
        this.pdfjsContext.dispatchEventBus(event, {
            source: this,
            annotation: this.annotation,
        });
        this.stateHasChanged();
    }

    private assertParametersSet(): asserts this is this & {
        loggingProvider: LoggingProvider;
        pdfjsContext: PdfjsContext;
        annotation: annotation;
    } {
        const missingParameters = [];
        if (!this.loggingProvider) { missingParameters.push('loggingProvider'); }
        if (!this.pdfjsContext) { missingParameters.push('pdfjsContext'); }
        if (!this.annotation) { missingParameters.push('annotation'); }
        if (missingParameters.length > 0) {
            throw new Error(`Please provide a value for the parameters: ${missingParameters.join(', ')}`);
        }
    }

    public stateHasChanged() {
        this.changeDetector.detectChanges();
    }
}