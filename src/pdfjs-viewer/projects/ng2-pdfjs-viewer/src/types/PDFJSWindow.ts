import { PDFViewerApplication } from "./PDFViewerApplication";

export interface PdfJsWindow extends Window {
  PDFViewerApplication: PDFViewerApplication;
}