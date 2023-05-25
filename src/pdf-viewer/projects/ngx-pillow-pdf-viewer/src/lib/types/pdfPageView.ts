import EventBus from "./eventBus";

export default interface PDFPageView {
    canvas: HTMLCanvasElement;
    div: HTMLDivElement;
    eventBus: EventBus;
    id: number;
}