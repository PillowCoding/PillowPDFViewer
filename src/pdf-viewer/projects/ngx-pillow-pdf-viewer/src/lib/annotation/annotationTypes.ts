export type AnnotationState = 'pending' | 'referenced' | 'completed';
export type AnnotationType = 'text';
export type textSelection = { xpath: string, selectedText: string, selectedTextOffset: number; }