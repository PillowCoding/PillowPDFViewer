import { Component, EventEmitter, Input, Output } from "@angular/core";

export type shouldResizeDelegateType = (difference: number) => boolean;

@Component({
selector: 'lib-west-resizeable',
templateUrl: 'west-resizeable.component.html',
styleUrls: ['west-resizeable.component.scss']
})
export class WestResizeableComponent
{
    @Input()
    public set shouldResize(delegate: shouldResizeDelegateType) {
        this._shouldResize = delegate;
    }

    @Output()
    public get widthChanged() {
        return this._widthChanged;
    }

    public get lastMousePosition() {
        return this._lastMousePosition;
    }

    @Input() public enabled = true;
    private _shouldResize?: shouldResizeDelegateType;
    private _widthChanged = new EventEmitter<number>();
    private _lastMousePosition: number | null = null;

    public onMouseDown(event: MouseEvent) {
        this._lastMousePosition = event.pageX;
    }

    public onMouseUp() {
        if (!this._lastMousePosition) {
            return;
        }

        this._lastMousePosition = null;
    }

    public onMouseMove(event: MouseEvent) {
        if (!this._lastMousePosition) {
            return;
        }

        const difference = this._lastMousePosition - event.pageX;

        if (this._shouldResize && !this._shouldResize(difference)) {
            return;
        }

        this._lastMousePosition = event.pageX;
        this.widthChanged.emit(difference);
    }
}