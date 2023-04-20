import EventBus from "./eventBus";
import { PDFViewer } from "./pdfViewer";

export default interface PDFPresentationMode {
    container: HTMLDivElement;
    eventBus: EventBus;
    mouseScrollDelta: number;
    mouseScrollTimeStamp: number;
    pdfViewer: PDFViewer;
    contextMenuOpen: boolean;
}