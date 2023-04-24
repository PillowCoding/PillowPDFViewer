import { trigger, state, style, transition, animate } from "@angular/animations";
import { ChangeDetectorRef, Component, Input, OnInit, QueryList, ViewChildren } from "@angular/core";
import annotation from "ngx-pillow-pdf-viewer/annotation/annotation";
import { PdfAnnotationComponent } from "ngx-pillow-pdf-viewer/annotation/pdf-annotation.component";
import PdfjsContext from "ngx-pillow-pdf-viewer/pdfjsContext";
import { StartAnnotationEventType, DeleteAnnotationEventType } from "ngx-pillow-pdf-viewer/types/eventBus";
import LoggingProvider from "ngx-pillow-pdf-viewer/utils/logging/loggingProvider";

export type annotationsProviderDelegate = (page: number) => Promise<annotation[]>;

@Component({
    selector: 'lib-pdf-sidebar',
    templateUrl: 'pdf-sidebar.component.html',
    styleUrls: ['pdf-sidebar.component.scss', './../common.scss'],
    animations: [
        trigger('expandCollapse', [
            state('expand', style({
                width: '{{expandedWidth}}px'
            }), { params: { expandedWidth: 480 } }),
            state('collapse', style({
                width: '32px'
            })),
            transition('expand => collapse', animate('100ms ease-out')),
            transition('collapse => expand', animate('100ms ease-out'))
        ])
    ]
})
export class PdfSidebarComponent implements OnInit {

    @ViewChildren('annotation') private _annotationComponents!: QueryList<PdfAnnotationComponent>;
    
    private readonly _minExpandedSidebarWidth = 325;
    private readonly _maxExpandedSidebarWidth = 800;

    private readonly _defaultLogSource = PdfSidebarComponent.name;

    private _expandedSidebarWidth = 480;
    private _expanded = false;

    public annotations: annotation[] = [];

    // The completed annotations and its provider.
    @Input() public annotationsProvider?: annotationsProviderDelegate;

    @Input() public pdfjsContext?: PdfjsContext;
    @Input() public loggingProvider?: LoggingProvider;

    // If loadingCount is higher than 0, the sidebar is loading.
    private _loadingCount = 0;

    public get annotationComponents() {
        return Array.from(this._annotationComponents);
    }

    public get expandedSidebarWidth()
    {
        return this._expandedSidebarWidth;
    }

    public get expanded()
    {
        return this._expanded;
    }

    @Input()
    public set loading(loading: boolean) {
        this.assertParametersSet();

        this._loadingCount += loading ? 1 : -1;
        if (this._loadingCount < 0) {
            this.loggingProvider.sendWarning('The loading count went below 0 which should not happen.', this._defaultLogSource);
            this._loadingCount = 0;
        }
    }

    public get loading() {
        return this._loadingCount > 0;
    }

    constructor(
        private changeDetector: ChangeDetectorRef
    ) {
        this.sidebarWidthShouldResize = this.sidebarWidthShouldResize.bind(this);
    }

    async ngOnInit() {
        this.assertParametersSet();

        await this.pdfjsContext.loadViewerPromise;
        this.pdfjsContext.subscribeEventBus('pagechanging', () => this.fetchAnnotations());
        this.pdfjsContext.subscribeEventBus('annotationStarted', (e) => this.onAnnotationStarted(e));
        this.pdfjsContext.subscribeEventBus('annotationDeleted', (e) => this.onAnnotationDeleted(e));

        await this.pdfjsContext.loadFilePromise;
        await this.fetchAnnotations();
        this.stateHasChanged();
    }

    private async fetchAnnotations() {
        this.assertParametersSet();

        const targetPage = this.pdfjsContext.page;
        this.loggingProvider.sendDebug(`Fetching page ${targetPage}...`, this._defaultLogSource);
        this.annotations = [];

        // Fetch the annotations. After fetching make sure we are still on the same page.
        // If we scroll quickly and fetch annotations of a previous page, we don't want to show the wrong annotations.
        this.loading = true;
        this.stateHasChanged();
        const annotations = await this.annotationsProvider(targetPage);
        this.loading = false;

        if (this.pdfjsContext.page !== targetPage) {
            this.loggingProvider.sendWarning(`Aborting annotation fetch. Page ${targetPage} is no longer in focus.`, this._defaultLogSource);
            this.stateHasChanged();
            return;
        }

        this.annotations = annotations
            .sort((a: annotation, b: annotation) => new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime())
            .reverse();
        this.stateHasChanged();
    }

    private onAnnotationStarted(event: StartAnnotationEventType) {
        this.annotations.unshift(event.annotation);
    }
    private onAnnotationDeleted(event: DeleteAnnotationEventType) {
        this.annotations = this.annotations.filter(x => x.id !== event.annotation.id);
    }

    public expand()
    {
        this.assertParametersSet();

        if (this.expanded)
        {
            return;
        }

        this.loggingProvider.sendDebug('Expanding sidebar...', this._defaultLogSource);
        this._expanded = true;
        this.stateHasChanged();
    }

    public collapse()
    {
        this.assertParametersSet();

        if (!this.expanded)
        {
            return;
        }

        this.loggingProvider.sendDebug('Collapsing sidebar...', this._defaultLogSource);
        this._expanded = false;
        this.stateHasChanged();
    }

    public sidebarWidthShouldResize(difference: number) {
        return this._expandedSidebarWidth + difference > this._minExpandedSidebarWidth && this._expandedSidebarWidth + difference < this._maxExpandedSidebarWidth;
    }

    public onSidebarWidthChanged(difference: number) {
        this._expandedSidebarWidth += difference;
    }

    private assertParametersSet(): asserts this is this & {
        annotationsProvider: annotationsProviderDelegate;
        pdfjsContext: PdfjsContext;
        loggingProvider: LoggingProvider;
    } {
        const missingParameters = [];
        if (!this.annotationsProvider) { missingParameters.push('annotationsProvider'); }
        if (!this.pdfjsContext) { missingParameters.push('pdfjsContext'); }
        if (!this.loggingProvider) { missingParameters.push('loggingProvider'); }
        if (missingParameters.length > 0) {
            throw new Error(`Please provide a value for the parameters: ${missingParameters.join(', ')}`);
        }
    }

    private stateHasChanged() {
        this.changeDetector.detectChanges();
    }
}