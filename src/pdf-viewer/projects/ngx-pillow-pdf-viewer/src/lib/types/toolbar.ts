import EventBus from "./eventBus";

export interface Toolbar {
    eventBus: EventBus;
    hasPageLabels: boolean;
    pageLabel: unknown;
    pageNumber: number;
    pageScale: number;
    pageScaleValue: string;
    pagesCount: 14;
    toolbar: HTMLDivElement;
}

export interface SecondaryToolbar {
    eventBus: EventBus;
    opened: boolean;
    pageNumber: number;
    pagesCount: 14;
    toggleButton: HTMLButtonElement;
    toolbar: HTMLDivElement;
}