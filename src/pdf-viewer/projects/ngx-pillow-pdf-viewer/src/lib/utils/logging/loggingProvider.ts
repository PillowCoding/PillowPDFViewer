import { ReplaySubject } from "rxjs";

export type pdfViewerLogSourceType = 'PdfViewerComponent' | 'PdfjsContext' | 'LayerManager' | 'PdfSidebarComponent' | 'TextAnnotator' | 'DrawAnnotator' | 'EventBus';
export type logSourceType = pdfViewerLogSourceType | Omit<string, pdfViewerLogSourceType>

export const logSeverityArray = ['debug', 'info', 'warning', 'error'] as const;
export type logSeverity = typeof logSeverityArray[number];

export default abstract class LoggingProvider {
    public abstract messages: ReplaySubject<unknown>;
    public abstract minimumLogSeverity: logSeverity;
    public abstract send(message: unknown, severity: logSeverity, source: logSourceType, ...args: unknown[]): void;

    public sendDebug(message: unknown, source: logSourceType, ...args: unknown[]) { this.send(message, 'debug', source, ...args); }
    public sendInfo(message: unknown, source: logSourceType, ...args: unknown[]) { this.send(message, 'info', source, ...args); }
    public sendWarning(message: unknown, source: logSourceType, ...args: unknown[]) { this.send(message, 'warning', source, ...args); }
    public sendError(message: unknown, source: logSourceType, ...args: unknown[]) { this.send(message, 'error', source, ...args); }
}