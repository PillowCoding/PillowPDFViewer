export type zoomType = { zoom: number; leftOffset: number; topOffset: number; } | 'page-width' | 'page-height' | 'page-fit' | 'auto';
export type scrollModeType = /* 'unknown' | */'vertical' | 'horizontal' | 'wrapped' | 'page';
export type spreadModeType = /* 'unknown' | */'none' | 'odd' | 'even';

export const scrollModeTranslation: { [key in scrollModeType] : number; } = {
    'vertical': 0,
    'horizontal': 1,
    'wrapped': 2,
    'page': 3
};
export const spreadModeTranslation: { [key in spreadModeType] : number; } = {
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
}