import { PDFPage } from "./pdfPage";

export interface PDFDocument {
    getPage: (pageNumber: number) => Promise<PDFPage>;
}