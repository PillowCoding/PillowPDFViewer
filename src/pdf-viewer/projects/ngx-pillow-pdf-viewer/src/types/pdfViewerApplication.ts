import { DownloadManager } from "./downloadManager";
import { EventBus } from "./eventBus";
import { PDFDocument } from "./pdfDocument";
import { PDFSidebar } from "./pdfSidebar";
import { PDFViewer } from "./pdfViewer";

export interface PDFViewerApplication {
    pdfViewer: PDFViewer;
    pdfDocument: PDFDocument;
    pdfSidebar: PDFSidebar;

    _title: string;
    baseUrl: string;

    open: (args: object) => Promise<void>;
    initialized: boolean;
    initializedPromise: Promise<void>;
    eventBus: EventBus;
    downloadManager: DownloadManager;
}