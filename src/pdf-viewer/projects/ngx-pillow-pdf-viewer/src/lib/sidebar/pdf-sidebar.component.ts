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
        await this.pdfjsContext.loadDocumentPromise;
        this.documentLoaded();
    }

    private documentLoaded() {
        this.assertParametersSet();
        this.sendLogMessage('doc state', undefined, this.pdfjsContext.documentState, this.pdfjsContext.page);
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