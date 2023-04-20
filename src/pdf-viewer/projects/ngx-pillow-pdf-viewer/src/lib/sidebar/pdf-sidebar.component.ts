import { trigger, state, style, transition, animate } from "@angular/animations";
import { Component, Input, OnInit } from "@angular/core";
import annotation from "ngx-pillow-pdf-viewer/annotation/annotation";
import PdfjsContext from "ngx-pillow-pdf-viewer/pdfjsContext";
import LoggingProvider, { pdfViewerLogSourceType } from "ngx-pillow-pdf-viewer/utils/logging/loggingProvider";

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

    private _expandedSidebarWidth = 480;
    private _expanded = false;

    // The completed annotations and its provider.
    @Input() public annotationsProvider?: annotationsProviderDelegate;
    private _annotations: annotation[] = [];
    private _fetchingPages: number[] = [];
    private _fetchedPage?: number;

    @Input() public pdfjsContext?: PdfjsContext;
    @Input() public loggingProvider?: LoggingProvider;

    public get expandedSidebarWidth()
    {
        return this._expandedSidebarWidth;
    }

    public get expanded()
    {
        return this._expanded;
    }

    constructor()
    {
        this.sidebarWidthShouldResize = this.sidebarWidthShouldResize.bind(this);
    }

    async ngOnInit() {
        this.assertParametersSet();
        
        await this.pdfjsContext.loadViewerPromise;
        this.pdfjsContext.subscribeEventBusDispatch('pagechanging', () => this.callFetchAnnotations());

        await this.pdfjsContext.loadDocumentPromise;
        this.documentLoaded();
    }

    private documentLoaded() {
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
        const annotations = await this.annotationsProvider(targetPage);
        this._fetchingPages = this._fetchingPages.filter(x => x !== targetPage);
        if (this.pdfjsContext.page !== targetPage) {
            console.warn(`Aborting annotation fetch. Page ${targetPage} is no longer in focus.`);
            return;
        }

        this._fetchedPage = targetPage;
        this._annotations = annotations;
    }

    public expandAnnotations()
    {
        if (this.expanded)
        {
            console.warn('Sidebar is already expanded.')
            return;
        }

        this.sendLogMessage('Expanding sidebar...');
        this._expanded = true;
    }

    public collapseAnnotations()
    {
        if (!this.expanded)
        {
            console.warn('Sidebar is already collapsed.')
            return;
        }

        this.sendLogMessage('Collapsing sidebar...');
        this._expanded = false;
    }

    public sidebarWidthShouldResize(difference: number) {
        return this._expandedSidebarWidth + difference > this._minExpandedSidebarWidth && this._expandedSidebarWidth + difference < this._maxExpandedSidebarWidth;
    }

    public onSidebarWidthChanged(difference: number) {
        this._expandedSidebarWidth += difference;
    }

    public assertParametersSet(): asserts this is this & {
        annotationsProvider: annotationsProviderDelegate;
        pdfjsContext: PdfjsContext;
        loggingProvider: LoggingProvider;
    } {
        const missingParameters = [];
        if (!this.annotationsProvider) { missingParameters.push('annotationsProvider'); }
        if (!this.pdfjsContext) { missingParameters.push('pdfjsContext'); }
        if (!this.loggingProvider) { missingParameters.push('loggingProvider'); }
        if (missingParameters.length > 0) {
            throw new Error(`Please provide a value for the parameters ${missingParameters.join(', ')}`);
        }
    }

    private sendLogMessage(message: unknown, source?: pdfViewerLogSourceType, ...args: unknown[]) {
        this.assertParametersSet();
        this.loggingProvider.send(message, source || PdfSidebarComponent.name, ...args);
    }
}