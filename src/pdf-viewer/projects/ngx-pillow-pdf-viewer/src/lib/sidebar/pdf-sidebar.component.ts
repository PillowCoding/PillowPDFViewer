import { trigger, state, style, transition, animate } from "@angular/animations";
import { ChangeDetectorRef, Component, Input, OnInit } from "@angular/core";
import annotation from "ngx-pillow-pdf-viewer/annotation/annotation";
import PdfjsContext from "ngx-pillow-pdf-viewer/pdfjsContext";
import { DeleteAnnotationEventType, StartAnnotationEventType } from "ngx-pillow-pdf-viewer/types/eventBus";
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

    private readonly _minExpandedSidebarWidth = 325;
    private readonly _maxExpandedSidebarWidth = 800;

    private readonly _defaultLogSource = PdfSidebarComponent.name;

    private _expandedSidebarWidth = 480;
    private _expanded = false;

    // The completed annotations and its provider.
    @Input() public annotationsProvider?: annotationsProviderDelegate;
    private _annotations: annotation[] = [];
    private _fetchingPages: number[] = [];
    private _fetchedPage?: number;

    @Input() public pdfjsContext?: PdfjsContext;
    @Input() public loggingProvider?: LoggingProvider;

    // If loadingCount is higher than 0, the sidebar is loading.
    private _loadingCount = 0;

    public get expandedSidebarWidth()
    {
        return this._expandedSidebarWidth;
    }

    public get expanded()
    {
        return this._expanded;
    }

    public get completedAnnotations() {
        return this._annotations.filter(x => x.state === 'completed');
    }

    public get uncompletedAnnotation() {
        return this._annotations.filter(x => x.state !== 'completed')[0];
    }

    public get loading() {
        return this._loadingCount > 0;
    }

    constructor(
        private changeDetector: ChangeDetectorRef)
    {
        this.sidebarWidthShouldResize = this.sidebarWidthShouldResize.bind(this);
    }

    async ngOnInit() {
        this.assertParametersSet();

        await this.pdfjsContext.loadViewerPromise;
        this.pdfjsContext.subscribeEventBus('pagechanging', () => this.callFetchAnnotations());
        this.pdfjsContext.subscribeEventBus('annotationStarted', (e) => this.onAnnotationStarted(e));
        this.pdfjsContext.subscribeEventBus('annotationDeleted', (e) => this.onAnnotationDeleted(e));

        await this.pdfjsContext.loadFilePromise;
        this.fileLoaded();
    }

    private fileLoaded() {
        this.assertParametersSet();
        this.callFetchAnnotations();
    }

    private async callFetchAnnotations() {
        this.assertParametersSet();
        const targetPage = this.pdfjsContext.page;

        // Check if we fetched the current page already.
        if (this._fetchedPage == targetPage || this._fetchingPages.some(x => x == targetPage)) {
            return;
        }

        this._fetchingPages.push(targetPage);

        // Fetch the annotations. After fetching make sure we are still on the same page.
        // If we scroll quickly and fetch annotations of a previous page, we don't want to show the wrong annotations.
        this._loadingCount++;
        this.stateHasChanged();
        const annotations = await this.annotationsProvider(targetPage);
        this._loadingCount--;
        this.stateHasChanged();

        this._fetchingPages = this._fetchingPages.filter(x => x !== targetPage);
        if (this.pdfjsContext.page !== targetPage) {
            this.loggingProvider.sendWarning(`Aborting annotation fetch. Page ${targetPage} is no longer in focus.`, this._defaultLogSource);
            return;
        }

        this._fetchedPage = targetPage;
        this._annotations = annotations;
    }

    private onAnnotationStarted(event: StartAnnotationEventType) {
        this._annotations.push(event.annotation);
    }

    private onAnnotationDeleted(event: DeleteAnnotationEventType) {
        this._annotations = this._annotations.filter(x => x.id !== event.annotation.id);
    }

    public expandAnnotations()
    {
        this.assertParametersSet();

        if (this.expanded)
        {
            this.loggingProvider.sendWarning('Sidebar is already expanded.', this._defaultLogSource);
            return;
        }

        this.loggingProvider.sendDebug('Expanding sidebar...', this._defaultLogSource);
        this._expanded = true;
    }

    public collapseAnnotations()
    {
        this.assertParametersSet();

        if (!this.expanded)
        {
            this.loggingProvider.sendWarning('Sidebar is already collapsed.', this._defaultLogSource);
            return;
        }

        this.loggingProvider.sendDebug('Collapsing sidebar...', this._defaultLogSource);
        this._expanded = false;
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