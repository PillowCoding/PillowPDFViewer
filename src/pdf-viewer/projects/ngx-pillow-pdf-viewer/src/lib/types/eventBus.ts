import { Annotation, AnnotationComment } from "ngx-pillow-pdf-viewer/annotation/annotation";
import { PdfViewerComponent } from "../../public-api";
import PDFPageView from "./pdfPageView";
import PDFPresentationMode from "./pdfPresentationMode";
import { PDFViewer, scrollModeType, spreadModeType } from "./pdfViewer";
import { PdfjsWindow } from "./pdfjsWindow";
import { SecondaryToolbar, Toolbar } from "./toolbar";
import { PdfAnnotationComponent } from "ngx-pillow-pdf-viewer/annotation/pdf-annotation.component";

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
    "pendingAnnotationStarted": PendingAnnotationStartedEventType;
    "pendingAnnotationDeleted": PendingAnnotationDeletedEventType;
    "annotationDelete": AnnotationDeleteEventType;
    "annotationDeleted": AnnotationDeletedEventType;
    "annotationCommentSubmit": AnnotationCommentSubmitEventType;
    "annotationFocus": AnnotationFocusEventType;
    "annotationUnfocus": AnnotationUnfocusEventType;
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

export type EventBusEvent<T = unknown> = {
    source: T;
}

export type NextPageEventType = EventBusEvent<Toolbar>;
export type PreviousPageEventType = NextPageEventType;
export type LastPageEventType = EventBusEvent<SecondaryToolbar>;
export type FirstPageEventType = LastPageEventType;
export type FindBarCloseEventType = EventBusEvent;
export type BeforePrintEventType = EventBusEvent<PdfjsWindow>;
export type AfterPrintEventType = EventBusEvent<PdfjsWindow>;
export type PrintEventType = EventBusEvent<Toolbar>;
export type DownloadEventType = EventBusEvent<Toolbar>;
export type ZoomInEventType = EventBusEvent<Toolbar>;
export type ZoomOutEventType = EventBusEvent<Toolbar>;
export type ResizeEventType = EventBusEvent<PdfjsWindow>;
export type PageDestroyEventType = EventBusEvent<PDFViewer>;
export type PresentationModeEventType = EventBusEvent<SecondaryToolbar>;
export type RotateClockwiseEventType = EventBusEvent<SecondaryToolbar>;
export type RotateCounterClockwiseEventType = EventBusEvent<SecondaryToolbar>;
export type DocumentPropertiesEventType = EventBusEvent<SecondaryToolbar>;
export type OpenFileEventType = EventBusEvent<Toolbar>;

export enum AnnotationEditorType {
    disable = -1,
    none = 0,
    freeText = 3,
    ink = 15
}

export type AnnotationEditorModeChangedEventType = EventBusEvent<PDFViewer> & {
    mode: AnnotationEditorType;
}

export type AttachmentsLoadedEventType = EventBusEvent & {
    attachmentsCount: number;
}

export type FindEventType = EventBusEvent & {
    type: string;
    query: string;
    phraseSearch: boolean;
    caseSensitive: boolean;
    entireWord: boolean;
    highlightAll: boolean;
    findPrevious: boolean;
    matchDiacritics: boolean;
};

export type PageNumberChangedEventType = EventBusEvent<Toolbar> & {
    value: string;
};

export type ScaleChangingEventType = EventBusEvent<PDFViewer> & {
    presetValue: unknown;
    scale: number;
};

export type ScaleChangedEventType = EventBusEvent<PDFViewer> & {
    value: number;
};

export type PageRenderEventType = EventBusEvent<PDFPageView> & {
    pageNumber: number;
}

export type PageRenderedEventType = EventBusEvent<PDFPageView> & {
    pageNumber: number;
    cssTransform: boolean;
    timestamp: number;
}

export type UpdateViewAreaEventType = EventBusEvent<PDFViewer> & {
    location: {
        left: number;
        pageNumber: number;
        pdfOpenParams: string;
        rotation: number;
        scale: number;
        top: number;
    };
};

export enum PresentationModeState {
    unknown,
    normal,
    changing,
    fullscreen,
}

export type PresentationModeChangedEventType = EventBusEvent<PDFPresentationMode> & {
    state: PresentationModeState;
}

export type SwitchAnnotationEditorModeEventType = EventBusEvent<Toolbar> & {
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

export type SwitchAnnotationEditorParamsEventType = EventBusEvent & {
    type: AnnotationEditorParamsType;
    value: number | string;
}

export type SwitchScrollModeEventType = EventBusEvent<SecondaryToolbar> & {
    mode: scrollModeType;
}

export type ScrollModeChangedEventType = SwitchScrollModeEventType;

export type SwitchSpreadModeEventType  = EventBusEvent<SecondaryToolbar> & {
    mode: spreadModeType;
}

export type SpreadModeChangedEventType = SwitchScrollModeEventType;

export type LayersLoadedEventType = EventBusEvent & {
    layersCount: number;
}

export type FindQueryMatchesCount = {
    current: number;
    total: number;
}

export type UpdateFindMatchesCountEventType = EventBusEvent & {
    matchesCount: FindQueryMatchesCount;
}

export enum FindState {
    found,
    notFound,
    wrapped,
    pending,
}

export type UpdateFindControlStateEventType = EventBusEvent & {
    matchesCount: FindQueryMatchesCount;
    previous: boolean;
    rawQuery: string;
    state: FindState;
}

export type UpdateTextLayerMatchesEventType = EventBusEvent & {
    pageIndex: number;
}

export type PageChangingEventType = EventBusEvent<PDFViewer> & {
    pageLabel: unknown;
    pageNumber: number;
    previous: number;
    source: PDFViewer;
}

export type FileInputChangeEventType = EventBusEvent<HTMLInputElement> & {
    fileInput: HTMLInputElement;
}

export type TextLayerRenderedEventType = EventBusEvent<PDFPageView> & {
    numTextDivs: number;
    pageNumber: number;
    source: PDFPageView;
}

export type PendingAnnotationStartedEventType = EventBusEvent<PdfViewerComponent> & {
    annotation: Annotation;
}

export type PendingAnnotationDeletedEventType = EventBusEvent<PdfViewerComponent> & {
    annotation: Annotation;
}

export type AnnotationDeleteEventType = EventBusEvent<PdfViewerComponent | PdfAnnotationComponent> & {
    annotation: Annotation;
}

export type AnnotationDeletedEventType = EventBusEvent<PdfViewerComponent | PdfAnnotationComponent> & {
    annotation: Annotation;
}

export type AnnotationCommentSubmitEventType = EventBusEvent<PdfAnnotationComponent> & {
    annotation: Annotation;
    comment: AnnotationComment;
}

export type AnnotationFocusEventType = EventBusEvent<PdfAnnotationComponent> & {
    annotation: Annotation;
}

export type AnnotationUnfocusEventType = AnnotationFocusEventType;