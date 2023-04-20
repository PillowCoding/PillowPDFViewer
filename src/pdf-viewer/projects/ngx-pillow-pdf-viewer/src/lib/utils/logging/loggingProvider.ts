import { ReplaySubject } from "rxjs";

export type pdfViewerLogSourceType = 'PdfViewerComponent' | 'PdfjsContext' | 'EventBus';
export type logSourceType = pdfViewerLogSourceType | Omit<string, pdfViewerLogSourceType>
export type logSeverity = 'debug' | 'info' | 'warning' | 'error';

export default abstract class LoggingProvider {
    public abstract messages: ReplaySubject<unknown>;
    public abstract send(message: unknown, severity: logSeverity, source: logSourceType, ...args: unknown[]): void;

    public sendDebug(message: unknown, source: logSourceType, ...args: unknown[]) { this.send(message, 'debug', source, ...args); }
    public sendInfo(message: unknown, source: logSourceType, ...args: unknown[]) { this.send(message, 'info', source, ...args); }
    public sendWarning(message: unknown, source: logSourceType, ...args: unknown[]) { this.send(message, 'warning', source, ...args); }
    public sendError(message: unknown, source: logSourceType, ...args: unknown[]) { this.send(message, 'error', source, ...args); }
}