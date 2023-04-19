import { trigger, state, style, transition, animate } from "@angular/animations";
import { Component } from "@angular/core";

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
export class PdfSidebarComponent {

    private readonly _minExpandedSidebarWidth = 325;
    private readonly _maxExpandedSidebarWidth = 800;

    private _expandedSidebarWidth = 480;
    private _expanded = false;

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

    public expandAnnotations()
    {
        if (this.expanded)
        {
            console.warn('Sidebar is already expanded.')
            return;
        }

        this._expanded = true;
    }

    public collapseAnnotations()
    {
        if (!this.expanded)
        {
            console.warn('Sidebar is already collapsed.')
            return;
        }

        this._expanded = false;
    }

    public sidebarWidthShouldResize(difference: number) {
        return this._expandedSidebarWidth + difference > this._minExpandedSidebarWidth && this._expandedSidebarWidth + difference < this._maxExpandedSidebarWidth;
    }

    public onSidebarWidthChanged(difference: number) {
        this._expandedSidebarWidth += difference;
    }
}