export default interface EventBus {
    on: (name: string, listener: (e: object) => void, options?: object) => void;
    off: (name: string, listener: (e: object) => void, options?: object) => void;
}

export interface EventBusEventTypePayloadMap {
    "nextpage": object;
    "previouspage": object;
    "lastpage": object;
    "firstpage": object;
    "beforeprint": object;
    "afterprint": object;
    "print": object;
    "download": object;
    "zoomin": object;
    "zoomout": object;
    "zoomreset": object;
    "pagenumberchanged": object;
    "scalechanging": object;
    "scalechanged": object;
    "resize": object;
    "hashchange": object;
    "pagerender": object;
    "pagerendered": object;
    "pagesdestroy": object;
    "updateviewarea": object;
    "pagechanging": object;
    "rotationchanging": object;
    "sidebarviewchanged": object;
    "pagemode": object;
    "namedaction": object;
    "presentationmodechanged": object;
    "presentationmode": object;
    "switchannotationeditormode": object;
    "switchannotationeditorparams": object;
    "rotatecw": object;
    "rotateccw": object;
    "optionalcontentconfig": object;
    "switchscrollmode": object;
    "scrollmodechanged": object;
    "switchspreadmode": object;
    "spreadmodechanged": object;
    "documentproperties": object;
    "findfromurlhash": object;
    "updatefindmatchescount": object;
    "updatefindcontrolstate": object;
    "fileinputchange": object;
    "openfile": object;
    "textlayerrendered": object;
}

/**
 * Represents a valid event bus event type. This is basically a string with subtle autocompletion for build in event bus event types.
 */
export type EventBusEventType = keyof EventBusEventTypePayloadMap | Omit<string, keyof EventBusEventTypePayloadMap>;

/**
 * Represents a type that determines if `K` falls under a valid index of `EventBusEventTypePayloadMap` or not.
 * If valid, the return type of that index is used. If not, an object is returned.
 */
export type EventBusPayloadType<K extends EventBusEventType> = K extends keyof EventBusEventTypePayloadMap ? EventBusEventTypePayloadMap[K] : object;