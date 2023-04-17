export interface EventBus {
    on: (name: string, listener: (e: object) => void, options?: object) => void;
    off: (name: string, listener: (e: object) => void, options?: object) => void;
}