import { PDFViewerApplication } from "./pdfViewerApplication";

export interface PdfJsWindow extends Window {
  PDFViewerApplication: PDFViewerApplication;
}