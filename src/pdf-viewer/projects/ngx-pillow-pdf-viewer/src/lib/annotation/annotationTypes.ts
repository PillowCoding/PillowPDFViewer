export type AnnotationState = 'pending' | 'completed';
export type AnnotationType = 'text' | 'draw';
export type ReferenceType = textSelection | boundingBox;

// Text types
export type textSelection = { xpath: string, selectedText: string, selectedTextOffset: number; }

// Draw types
export type vector2 = { x: number, y: number }
export type boundingBox = { start: vector2, end: vector2 }