import { PDFViewerApplication } from "./pdfViewerApplication";

export interface PdfjsWindow extends Window {
    PDFViewerApplication: PDFViewerApplication;
}