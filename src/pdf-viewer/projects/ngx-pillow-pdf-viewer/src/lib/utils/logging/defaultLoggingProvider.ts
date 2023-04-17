import { ReplaySubject } from 'rxjs';
import LoggingProvider from './loggingProvider';

export default class DefaultLoggingProvider implements LoggingProvider {
    messages: ReplaySubject<unknown>;

    constructor(bufferedMessageCount: number) {
        this.messages = new ReplaySubject(bufferedMessageCount);
    }

    send(source: string, message: unknown): void {
        if (typeof message === 'string') {
            console.log(`${source}: ${message}`);
        }
        else {
            console.log(source, message);
        }
        
        this.messages.next(message);
    }
}