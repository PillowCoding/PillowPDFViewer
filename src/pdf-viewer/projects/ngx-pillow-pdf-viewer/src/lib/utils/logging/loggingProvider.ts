import { ReplaySubject } from "rxjs";

export type pdfViewerLogSourceType = 'PdfjsContext' | 'EventBus';
export type logSourceType = pdfViewerLogSourceType | Omit<string, pdfViewerLogSourceType>

export default interface LoggingProvider {
    messages: ReplaySubject<unknown>;
    send(source: logSourceType, message: unknown, ...args: unknown[]): void;
}