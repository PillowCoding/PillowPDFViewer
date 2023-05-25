export interface PDFPage {
    destroyed: boolean;
    pendingCleanup: boolean;
    pageNumber: number;
    rotate: number;
    view: number[];
}