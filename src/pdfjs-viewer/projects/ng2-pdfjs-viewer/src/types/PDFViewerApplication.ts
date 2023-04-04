import { EventBus } from "./EventBus";
import { PDFViewer } from "./PdfViewer";
import { DownloadManager } from "./DownloadManager";
import { PDFDocument } from "./PDFDocument";
import { PDFSidebar } from "./PDFSidebar";

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