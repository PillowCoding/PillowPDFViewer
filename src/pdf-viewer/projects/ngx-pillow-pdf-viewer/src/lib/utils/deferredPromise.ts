export default class DeferredPromise<T> implements Promise<T> {

    private _resolve?: (value: T | PromiseLike<T>) => void;
    private _reject?: (reason: unknown) => void;
    private promise: Promise<T>

    constructor() {
        this.promise = new Promise( (resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        })
    }

    finally(onfinally?: (() => void) | null | undefined): Promise<T> {
        return this.promise.finally(onfinally);
    }

    public then<TResult1 = T, TResult2 = never>(
        onfulfilled?: ((value: T) =>        TResult1 | PromiseLike<TResult1>) | undefined | null,
        onrejected?:  ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null
    ) {
        return this.promise.then(onfulfilled, onrejected);
    }

    public catch<TResult = never>(
        onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | undefined | null
    ) {
        return this.promise.catch(onrejected);
    }

    public resolve(val: T) {
        // This should never be falsy.
        this._resolve?.(val);
    }
    
    public reject(reason: unknown) {
        // This should never be falsy.
        this._reject?.(reason);
    }

    [Symbol.toStringTag] = 'Promise';
}