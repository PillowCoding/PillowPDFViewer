import { pdfAnnotation } from 'ng2-pdfjs-viewer/pdf-annotation';

export interface pdfAnnotationWriter
{
    set enableDebugLogging(val: boolean);

    focusAnnotation(annotation: pdfAnnotation, color: string): any;
    unfocusAnnotation(annotation: pdfAnnotation, color: string): any;

    containsExistingAnnotation(selection: Selection): boolean;

    colorAnnotation(annotation: pdfAnnotation, color: string): void;
    removeColorsFromAnnotation(annotation: pdfAnnotation): void;

    getPdfPageXpathBySelection(selection: Selection, page: number): string | null;
}