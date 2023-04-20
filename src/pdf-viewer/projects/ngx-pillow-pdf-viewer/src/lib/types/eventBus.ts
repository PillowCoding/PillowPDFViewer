import annotation from "ngx-pillow-pdf-viewer/annotation/annotation";
import { PdfViewerComponent } from "../../public-api";
import PDFPageView from "./pdfPageView";
import PDFPresentationMode from "./pdfPresentationMode";
import { PDFViewer, scrollModeType, spreadModeType } from "./pdfViewer";
import { PdfjsWindow } from "./pdfjsWindow";
import { SecondaryToolbar, Toolbar } from "./toolbar";

export default interface EventBus {
    on: (name: string, listener: (e: object) => void, options?: object) => void;
    off: (name: string, listener: (e: object) => void, options?: object) => void;
    dispatch: (name: string, payload: object) => void;
}

export interface EventBusEventTypePayloadMap {
    "annotationeditormodechanged": AnnotationEditorModeChangedEventType;
    "attachmentsloaded": AttachmentsLoadedEventType;
    "nextpage": NextPageEventType;
    "previouspage": PreviousPageEventType;
    "lastpage": LastPageEventType;
    "firstpage": FirstPageEventType;
    "find": FindEventType;
    "findbarclose": FindBarCloseEventType;
    "beforeprint": BeforePrintEventType;
    "afterprint": AfterPrintEventType;
    "print": PrintEventType;
    "download": DownloadEventType;
    "zoomin": ZoomInEventType;
    "zoomout": ZoomOutEventType;
    "zoomreset": object;
    "pagenumberchanged": PageNumberChangedEventType;
    "scalechanging": ScaleChangingEventType;
    "scalechanged": ScaleChangedEventType;
    "resize": ResizeEventType;
    "hashchange": object;
    "pagerender": PageRenderEventType;
    "pagerendered": PageRenderedEventType;
    "pagesinit": object;
    "pagesdestroy": PageDestroyEventType;
    "pagesloaded": object;
    "updateviewarea": UpdateViewAreaEventType;
    "pagechanging": PageChangingEventType;
    "rotationchanging": object;
    "sidebarviewchanged": object;
    "pagemode": object;
    "namedaction": object;
    "presentationmodechanged": PresentationModeChangedEventType;
    "presentationmode": PresentationModeEventType;
    "switchannotationeditormode": SwitchAnnotationEditorModeEventType;
    "switchannotationeditorparams": SwitchAnnotationEditorParamsEventType;
    "rotatecw": RotateClockwiseEventType;
    "rotateccw": RotateCounterClockwiseEventType;
    "optionalcontentconfig": object;
    "outlineloaded": object;
    "switchscrollmode": SwitchScrollModeEventType;
    "scrollmodechanged": ScrollModeChangedEventType;
    "switchspreadmode": SwitchSpreadModeEventType;
    "spreadmodechanged": SpreadModeChangedEventType;
    "documentproperties": DocumentPropertiesEventType;
    "layersloaded": LayersLoadedEventType;
    "resetlayers": object;
    "findfromurlhash": object;
    "updatefindmatchescount": UpdateFindMatchesCountEventType;
    "updatefindcontrolstate": UpdateFindControlStateEventType;
    "updatetextlayermatches": UpdateTextLayerMatchesEventType;
    "fileinputchange": FileInputChangeEventType;
    "openfile": OpenFileEventType;
    "textlayerrendered": TextLayerRenderedEventType;
    "sandboxcreated": object;
    "toggleoutlinetree": object;
    "currentoutlineitem": object;
    "annotationlayerrendered": object;
    "annotationeditorlayerrendered": object;
    "xfalayerrendered": object;
    "secondarytoolbarreset": object;
    "localized": object;
    "documenterror": object;
    "documentloaded": object;
    "documentinit": object;
    "metadataloaded": object;
    "updatefromsandbox": object;
    "cursortoolchanged": object;

    // Custom events
    "startAnnotation": StartAnnotationEventType;
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

export enum AnnotationEditorType {
    disable = -1,
    none = 0,
    freeText = 3,
    ink = 15
}

export type AnnotationEditorModeChangedEventType = {
    source: PDFViewer;
    mode: AnnotationEditorType;
}

export type AttachmentsLoadedEventType = {
    source: unknown;
    attachmentsCount: number;
}

export type NextPageEventType = {
    source: Toolbar;
}

export type PreviousPageEventType = NextPageEventType;

export type LastPageEventType = {
    source: SecondaryToolbar;
}

export type FirstPageEventType = LastPageEventType;

export type FindEventType = {
    source: unknown;
    type: string;
    query: string;
    phraseSearch: boolean;
    caseSensitive: boolean;
    entireWord: boolean;
    highlightAll: boolean;
    findPrevious: boolean;
    matchDiacritics: boolean;
}

export type FindBarCloseEventType = {
    source: unknown;
}

export type BeforePrintEventType = {
    source: PdfjsWindow;
}

export type AfterPrintEventType = {
    source: PdfjsWindow;
}

export type PrintEventType = {
    source: Toolbar;
}

export type DownloadEventType = {
    source: Toolbar;
}

export type ZoomInEventType = {
    source: Toolbar;
}

export type ZoomOutEventType = {
    source: Toolbar;
}

export type PageNumberChangedEventType = {
    source: Toolbar;
    value: string;
}

export type ScaleChangingEventType = {
    presetValue: unknown;
    scale: number;
    source: PDFViewer;
};

export type ScaleChangedEventType = {
    value: number;
    source: PDFViewer;
};

export type ResizeEventType = {
    source: PdfjsWindow;
};

export type PageRenderEventType = {
    pageNumber: number;
    source: PDFPageView;
}

export type PageRenderedEventType = {
    pageNumber: number;
    cssTransform: boolean;
    timestamp: number;
    source: PDFPageView;
}

export type PageDestroyEventType = {
    source: PDFViewer;
}

export type UpdateViewAreaEventType = {
    location: {
        left: number;
        pageNumber: number;
        pdfOpenParams: string;
        rotation: number;
        scale: number;
        top: number;
    };
    source: PDFViewer;
};

export enum PresentationModeState {
    unknown,
    normal,
    changing,
    fullscreen,
}

export type PresentationModeChangedEventType = {
    state: PresentationModeState;
    source: PDFPresentationMode
}

export type PresentationModeEventType = {
    source: SecondaryToolbar;
}

export type SwitchAnnotationEditorModeEventType = {
    source: Toolbar;
    mode: AnnotationEditorType;
}

export enum AnnotationEditorParamsType {
    freeTextSize = 1,
    freeTextColor = 2,
    freeTextOpacity = 3,
    inkColor = 11,
    inkThickness = 12,
    inkOpacity = 13
}

export type SwitchAnnotationEditorParamsEventType = {
    type: AnnotationEditorParamsType;
    value: number | string;
}

export type RotateClockwiseEventType = {
    source: SecondaryToolbar;
}

export type RotateCounterClockwiseEventType = {
    source: SecondaryToolbar;
}

export type SwitchScrollModeEventType = {
    source: SecondaryToolbar;
    mode: scrollModeType;
}

export type ScrollModeChangedEventType = SwitchScrollModeEventType;

export type SwitchSpreadModeEventType = {
    source: SecondaryToolbar;
    mode: spreadModeType;
}

export type SpreadModeChangedEventType = SwitchScrollModeEventType;

export type DocumentPropertiesEventType = {
    source: SecondaryToolbar;
}

export type LayersLoadedEventType = {
    source: unknown;
    layersCount: number;
}

export type FindQueryMatchesCount = {
    current: number;
    total: number;
}

export type UpdateFindMatchesCountEventType = {
    matchesCount: FindQueryMatchesCount;
    source: unknown;
}

export enum FindState {
    found,
    notFound,
    wrapped,
    pending,
}

export type UpdateFindControlStateEventType = {
    matchesCount: FindQueryMatchesCount;
    previous: boolean;
    rawQuery: string;
    state: FindState;
    source: unknown;
}

export type UpdateTextLayerMatchesEventType = {
    source: unknown;
    pageIndex: number;
}

export type PageChangingEventType = {
    pageLabel: unknown;
    pageNumber: number;
    previous: number;
    source: PDFViewer;
}

export type FileInputChangeEventType = {
    fileInput: HTMLInputElement;
    source: HTMLInputElement;
}

export type OpenFileEventType = {
    source: Toolbar;
}

export type TextLayerRenderedEventType = {
    numTextDivs: number;
    pageNumber: number;
    source: PDFPageView;
}

export type StartAnnotationEventType = {
    annotation: annotation;
    source: PdfViewerComponent;
}