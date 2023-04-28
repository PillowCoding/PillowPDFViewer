import { Component, EventEmitter, Input, Output } from "@angular/core";

@Component({
    selector: 'lib-close-button',
    template: `
        <div
            [ngClass]="{'custom': useCustomColor}"
            (click)="onClose()"
            class="toolbar-button icon close"
            title="close">
        </div>
    `,
    styles: [`

        .close.custom {
            &:hover {
                background-color: rgba(0, 0, 0, .1);
            }
        }

        .close::before {
            mask-size: 12px 12px !important;
            mask-image: url("data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPHN2ZyB0eXBlPSJidXR0b24iIGFyaWEtbGFiZWw9IkNsb3NlIiB2aWV3Qm94PSIwIDAgMjAgMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHBhdGggZD0iTSAxOS4xNDQgMTkuMTk5IEMgMTguMTU2IDIwLjA4OSAxNi41NTYgMjAuMDg5IDE1LjU2OSAxOS4xOTkgTCA5Ljk4NSAxMy40NDEgTCA0LjM5OSAxOS4xOTYgQyAzLjAzNSAyMC40NDggMC42ODEgMTkuODk3IDAuMTYyIDE4LjIwNiBDIC0wLjA4MyAxNy40MDcgMC4xNzEgMTYuNTUyIDAuODI0IDE1Ljk3MSBMIDYuNjM1IDkuOTg1IEwgMC44MjMgMy45OTUgQyAtMC41NjQgMi43NjUgMC4wNDcgMC42NCAxLjkyMiAwLjE3MyBDIDIuODA2IC0wLjA0OCAzLjc1NSAwLjE4MSA0LjM5OCAwLjc3MSBMIDkuOTg1IDYuNTMxIEwgMTUuNTY5IDAuNzcxIEMgMTYuOTM0IC0wLjQ4IDE5LjI4OSAwLjA3IDE5LjgwNyAxLjc2MiBDIDIwLjA1MyAyLjU2MSAxOS43OTggMy40MTUgMTkuMTQ0IDMuOTk1IEwgMTMuMzMzIDkuOTg1IEwgMTkuMTQ0IDE1Ljk3MSBDIDIwLjEzMyAxNi44NjMgMjAuMTMzIDE4LjMwOCAxOS4xNDQgMTkuMTk5IFoiIHN0eWxlPSIiLz4KPC9zdmc+");
        }
    `],
    styleUrls: ['./../common.scss']
})
export class CloseButtonComponent {

    /** Overrides the default toolbar button style with more custom styles. */
    @Input() useCustomColor = false;

    @Output()
    public get closed() {
        return this._closed;
    }

    private _closed = new EventEmitter<void>();

    public onClose() {
        this._closed.emit();
    }
}