export type vector2 = { x: number, y: number }
export type boundingBox = { start: vector2, end: vector2 }
export type textSelection = { xpath: string, selectedText: string, selectedTextOffset: number; }
export type drawOrTextType = 'draw' | 'text';

export class pdfAnnotationComment
{
    public readonly dateCreated: Date;

    constructor(
        public readonly text: string)
    {
        this.dateCreated = new Date();
    }
}

export class pdfAnnotation
{
    public type: drawOrTextType;
    public id: string;
    public dateCreated: Date;
    public comments: pdfAnnotationComment[];

    // Reference to the annotation.
    public reference?: textSelection | boundingBox;
    public page?: number;

    constructor(
        type: drawOrTextType,
        id?: string,
        dateCreated?: Date,
        comments?: Array<pdfAnnotationComment>)
    {
        this.type = type;
        this.id = id ?? this.generateGuid();
        this.dateCreated = dateCreated ?? new Date();
        this.comments = comments ?? [];
    }

    public setReference(reference: textSelection | boundingBox, page: number)
    {
        this.reference = reference;
        this.page = page;
    }

    private generateGuid()
    {
        const generateNext = () => {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }

        // Return id of format 'aaaaaaaa'-'aaaa'-'aaaa'-'aaaa'-'aaaaaaaaaaaa'.
        return generateNext() + generateNext() + '-' + generateNext() + '-' + generateNext() + '-' + generateNext() + '-' + generateNext() + generateNext() + generateNext();
    }
}