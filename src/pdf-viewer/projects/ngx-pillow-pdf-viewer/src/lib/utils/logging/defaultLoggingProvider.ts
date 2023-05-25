import { ReplaySubject } from 'rxjs';
import LoggingProvider, { logSeverity, logSeverityArray, logSourceType } from './loggingProvider';

export class DefaultLoggingProvider extends LoggingProvider {
    public override messages: ReplaySubject<unknown>;
    public override minimumLogSeverity: logSeverity;

    public readonly includedLogSourceTypes: readonly logSourceType[];

    constructor(minimumLogSeverity: logSeverity = 'debug', includedLogSourceTypes: logSourceType[] = [], bufferedMessageCount = 50) {
        super();
        
        this.messages = new ReplaySubject(bufferedMessageCount);
        this.minimumLogSeverity = minimumLogSeverity;
        this.includedLogSourceTypes = includedLogSourceTypes;
    }

    send(message: unknown, severity: logSeverity, source: logSourceType, ...args: unknown[]): void {

        // Check if the source should be logged.
        const minimum = logSeverityArray.indexOf(this.minimumLogSeverity);
        if (logSeverityArray.indexOf(severity) < minimum) {
            return;
        }

        if (!this.includedLogSourceTypes.includes(source)) {
            return;
        }

        // Log the message based on what has been provided.
        source = `[${severity}] ${source} -`;
        const logMethod: (message: unknown, ...args: unknown[]) => void =
            severity === 'error' ? console.error :
            severity === 'warning' ? console.warn : 
            console.log;

        if (typeof message === 'string') {
            logMethod(`${source} ${message}`, ...args);
        }
        else {
            logMethod(source, message, ...args);
        }
        
        this.messages.next(message);
    }

    public static CreateDefaultDebugAll() {
        return DefaultLoggingProvider.CreateDefaultAll('debug');
    }

    public static CreateDefaultWarnAll() {
        return DefaultLoggingProvider.CreateDefaultAll('warning');
    }

    public static CreateDefaultAll(severity: logSeverity) {
        return new DefaultLoggingProvider(severity, ['PdfViewerComponent', 'PdfjsContext', 'TextAnnotator', 'DrawAnnotator', 'LayerManager', 'PdfSidebarComponent'], 50);
    }
}