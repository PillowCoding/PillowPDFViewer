import { Component } from "@angular/core";

@Component({
    selector: 'lib-pdf-sidebar',
    templateUrl: 'pdf-sidebar.component.html',
    styleUrls: ['pdf-sidebar.component.scss', './../common.scss']
})
export class PdfSidebarComponent {
    private _sidebarWidth = 32;

    public get sidebarWidth()
    {
        return this._sidebarWidth;
    }

    public onSidebarWidthChanged(difference: number) {
        this._sidebarWidth += difference;
    }
}