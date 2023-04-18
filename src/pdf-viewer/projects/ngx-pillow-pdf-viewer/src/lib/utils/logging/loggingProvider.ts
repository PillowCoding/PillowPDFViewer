import { ReplaySubject } from "rxjs";

export type pdfViewerLogSourceType = 'PdfjsContext' | 'EventBus';
export type logSourceType = pdfViewerLogSourceType | Omit<string, pdfViewerLogSourceType>

export default interface LoggingProvider {
    messages: ReplaySubject<unknown>;
    send(message: unknown, source: logSourceType, ...args: unknown[]): void;
}