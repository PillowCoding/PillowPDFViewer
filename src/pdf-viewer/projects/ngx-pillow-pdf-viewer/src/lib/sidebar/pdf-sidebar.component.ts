import { trigger, state, style, transition, animate } from "@angular/animations";
import { ChangeDetectorRef, Component, Input, OnInit, QueryList, ViewChildren } from "@angular/core";
import { Annotation } from "../annotation/annotation";
import { PdfAnnotationComponent } from "../annotation/pdf-annotation.component";
import PdfjsContext from "../pdfjsContext";
import { AnnotationDeletedEventType, PendingAnnotationDeletedEventType, PendingAnnotationStartedEventType } from "../types/eventBus";
import LoggingProvider from "../utils/logging/loggingProvider";

export type annotationsProviderDelegate = (page: number) => Promise<Annotation[]>;

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
    private readonly _maxExpandedSidebarWidth = 1000;

    private readonly _defaultLogSource = PdfSidebarComponent.name;

    private _expandedSidebarWidth = 480;
    private _expanded = false;

    public annotations: Annotation[] = [];

    // The completed annotations and its provider.
    @Input() public annotationsProvider?: annotationsProviderDelegate;

    @Input() public pdfjsContext?: PdfjsContext;
    @Input() public loggingProvider?: LoggingProvider;

    // If loadingCount is higher than 0, the sidebar is loading.
    private _loadingPages: number[] = [];

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

    public get canShowAnnotations() {
        this.assertParametersSet();
        return this.pdfjsContext.fileState === 'loaded';
    }

    public get currentShownPage() {
        this.assertParametersSet();
        return this.pdfjsContext.page;
    }

    public get hasFocusedAnnotations() {
        this.assertParametersSet();
        return this.annotations.some(x => x.focused);
    }

    constructor(
        private changeDetector: ChangeDetectorRef
    ) {
        this.sidebarWidthShouldResize = this.sidebarWidthShouldResize.bind(this);
    }

    async ngOnInit() {
        this.assertParametersSet();

        await this.pdfjsContext.loadViewerPromise;
        this.pdfjsContext.subscribeEventBus('pagesloaded', () => this.fetchAnnotations());
        this.pdfjsContext.subscribeEventBus('pagechanging', () => this.onPageChanging());
        this.pdfjsContext.subscribeEventBus('pendingAnnotationStarted', (e) => this.onPendingAnnotationStarted(e));
        this.pdfjsContext.subscribeEventBus('pendingAnnotationDeleted', (e) => this.onAnnotationDeleted(e));
        this.pdfjsContext.subscribeEventBus('annotationDeleted', (e) => this.onAnnotationDeleted(e));
    }

    private async fetchAnnotations() {
        this.assertParametersSet();

        const targetPage = this.currentShownPage;
        this.loggingProvider.sendDebug(`Fetching page ${targetPage}...`, this._defaultLogSource);
        this.annotations = [];

        // Fetch the annotations. After fetching make sure we are still on the same page.
        // If we scroll quickly and fetch annotations of a previous page, we don't want to show the wrong annotations.
        this._loadingPages.push(targetPage);
        this.stateHasChanged();
        const annotations = await this.annotationsProvider(targetPage);
        this._loadingPages = this._loadingPages.filter(x => x !== targetPage);

        if (this.currentShownPage !== targetPage) {
            this.loggingProvider.sendDebug(`Aborting annotation fetch. Page ${targetPage} is no longer in focus.`, this._defaultLogSource);
            this.stateHasChanged();
            return;
        }

        this.annotations = annotations
            .sort((a: Annotation, b: Annotation) => new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime())
            .reverse();
        this.stateHasChanged();
    }

    private onPageChanging() {
        this.unfocusAll();
        this.fetchAnnotations();
    }

    private onPendingAnnotationStarted(event: PendingAnnotationStartedEventType) {
        this.annotations.unshift(event.annotation);
        this.stateHasChanged();
    }
    
    private onAnnotationDeleted(event: PendingAnnotationDeletedEventType | AnnotationDeletedEventType) {
        this.annotations = this.annotations.filter(x => x.id !== event.annotation.id);
        this.stateHasChanged();
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

    public unfocusAll() {
        for (const annotation of this.annotationComponents) {
            annotation.unFocus();
        }
    }

    public sidebarWidthShouldResize(difference: number) {
        return this._expandedSidebarWidth + difference > this._minExpandedSidebarWidth && this._expandedSidebarWidth + difference < this._maxExpandedSidebarWidth;
    }

    public onSidebarWidthChanged(difference: number) {
        this._expandedSidebarWidth += difference;
    }

    public isLoading(page: number) {
        return this._loadingPages.includes(page);
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

    public stateHasChanged() {
        this.changeDetector.detectChanges();
    }
}