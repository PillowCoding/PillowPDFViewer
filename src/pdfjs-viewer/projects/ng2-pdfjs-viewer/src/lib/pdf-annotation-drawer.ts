import { Subject } from "rxjs";
import { boundingBox } from "./pdf-annotation";

export interface pdfAnnotationDrawer
{
    onClickDrawLayer: Subject<MouseEvent>;
    boundingBoxCreated: Subject<{ bounds: boundingBox, page: number }>;

    set enableDebugLogging(val: boolean);

    enableLayer(): void;
    disableLayer(): void;
    clearCanvas(page: number, pending: boolean): void;
    canvasRendered(page: number): boolean;
    drawRectangle(bounds: boundingBox, page: number, color: string, borderWidth: number, pending: boolean): void;
}