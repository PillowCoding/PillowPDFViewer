import { ReplaySubject } from 'rxjs';
import LoggingProvider, { logSeverity, logSourceType } from './loggingProvider';

export default class DefaultLoggingProvider extends LoggingProvider {
    
    public readonly excludedLogSourceTypes: readonly logSourceType[];
    messages: ReplaySubject<unknown>;

    constructor(excludedLogSourceTypes: logSourceType[] = [], bufferedMessageCount = 50) {
        super();
        this.excludedLogSourceTypes = excludedLogSourceTypes;
        this.messages = new ReplaySubject(bufferedMessageCount);
    }

    send(message: unknown, severity: logSeverity, source: logSourceType, ...args: unknown[]): void {

        // Check if the source should be logged.
        if (this.excludedLogSourceTypes.includes(source)) {
            return;
        }

        source = `[${severity}] ${source} -`;
        const logMethod: (message: unknown, ...args: unknown[]) => void = severity === 'error' ? console.error :
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
}