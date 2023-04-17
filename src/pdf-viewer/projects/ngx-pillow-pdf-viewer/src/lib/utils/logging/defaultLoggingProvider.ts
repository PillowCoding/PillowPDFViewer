import { ReplaySubject } from 'rxjs';
import LoggingProvider from './loggingProvider';

export default class DefaultLoggingProvider implements LoggingProvider {
    messages: ReplaySubject<unknown>;

    constructor(bufferedMessageCount: number) {
        this.messages = new ReplaySubject(bufferedMessageCount);
    }

    send(source: string, message: unknown, ...args: unknown[]): void {
        if (typeof message === 'string') {
            console.log(`${source}: ${message}`, ...args);
        }
        else {
            console.log(source, message, ...args);
        }
        
        this.messages.next(message);
    }
}