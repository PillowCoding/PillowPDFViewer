import { ReplaySubject } from "rxjs";

export default interface LoggingProvider {
    messages: ReplaySubject<unknown>;
    send(source: string, message: unknown, ...args: unknown[]): void;
}