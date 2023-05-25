import EventBus from "./eventBus";

export type zoomType = { zoom: number; leftOffset: number; topOffset: number; } | 'page-width' | 'page-height' | 'page-fit' | 'auto';
export type scrollModeType = 'unknown' | 'vertical' | 'horizontal' | 'wrapped' | 'page';
export type spreadModeType = 'unknown' | 'none' | 'odd' | 'even';

export const scrollModeTranslation: { [key in scrollModeType] : number; } = {
    'unknown': -1,
    'vertical': 0,
    'horizontal': 1,
    'wrapped': 2,
    'page': 3
};
export const spreadModeTranslation: { [key in spreadModeType] : number; } = {
    'unknown': -1,
    'none': 0,
    'odd': 1,
    'even': 2
};

export interface PDFViewer {
    scrollMode: number;
    spreadMode: number;

    currentPageNumber: number;
    currentScaleValue: zoomType;
    pagesRotation: number;
    currentScale: number;

    viewer: HTMLDivElement;
    eventBus: EventBus;
}