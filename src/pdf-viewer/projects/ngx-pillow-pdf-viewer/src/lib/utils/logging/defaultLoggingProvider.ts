import { ReplaySubject } from 'rxjs';
import LoggingProvider, { logSourceType } from './loggingProvider';

export default class DefaultLoggingProvider implements LoggingProvider {
    
    public readonly excludedLogSourceTypes: readonly logSourceType[];
    messages: ReplaySubject<unknown>;

    constructor(excludedLogSourceTypes: logSourceType[] = [], bufferedMessageCount = 50) {
        this.excludedLogSourceTypes = excludedLogSourceTypes;
        this.messages = new ReplaySubject(bufferedMessageCount);
    }

    send(source: logSourceType, message: unknown, ...args: unknown[]): void {

        // Check if the source should be logged.
        if (this.excludedLogSourceTypes.includes(source)) {
            return;
        }

        if (typeof message === 'string') {
            console.log(`${source}: ${message}`, ...args);
        }
        else {
            console.log(source, message, ...args);
        }
        
        this.messages.next(message);
    }
}