import { Component, EventEmitter, Input, Output } from "@angular/core";

@Component({
selector: 'lib-west-resizeable',
template: `
    <div class="main-container">
       <ng-content></ng-content> 
        <span *ngIf="enabled">
            <div class="draggableAnchor east" (mousedown)="onMouseDown($event)">
                <div class="handle">
                    <span></span>
                </div>
            </div>
        </span>
    </div>

    <div *ngIf="lastMousePosition !== null"
        (document:mouseup)="onMouseUp()"
        (document:mousemove)="onMouseMove($event)"
        class="overlay">
    </div>
`,
styleUrls: ['west-resizeable.component.scss']
})
export class WestResizeableComponent
{
    @Input() enabled = true;
    @Input() shouldResize?: (difference: number) => boolean;
    @Output() widthChanged = new EventEmitter<number>();

    lastMousePosition: number | null = null;

    onMouseDown(event: MouseEvent) {
        if (this.lastMousePosition) {
            throw new Error('The last mouse position is already set.');
        }

        this.lastMousePosition = event.pageX;
    }

    onMouseUp() {
        if (!this.lastMousePosition) {
            return;
        }

        this.lastMousePosition = null;
    }

    onMouseMove(event: MouseEvent) {
        if (!this.lastMousePosition) {
            return;
        }

        const difference = this.lastMousePosition - event.pageX;

        if (this.shouldResize && !this.shouldResize(difference)) {
            return;
        }

        this.lastMousePosition = event.pageX;
        this.widthChanged.emit(difference);
    }
}