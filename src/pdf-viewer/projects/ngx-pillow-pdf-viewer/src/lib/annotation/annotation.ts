import { AnnotationState, AnnotationType, textSelection } from "./annotationTypes";

export class AnnotationComment {
    private _dateCreated: Date;
    private _content: string;

    public get dateCreated() {
        return this._dateCreated;
    }

    public get content() {
        return this._content;
    }

    constructor(content: string) {
        this._content = content;
        this._dateCreated = new Date();
    }

    public serialize() {
        return JSON.stringify(this.toObject());
    }

    public static deserialize(serializedContent: string) {
        return AnnotationComment.fromObject(JSON.parse(serializedContent));
    }

    public toObject() {
        return {
            content: this.content,
            dateCreated: this.dateCreated,
        }
    }

    // TODO: Validate object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public static fromObject(commentObject: any) {

        const comment = new AnnotationComment(commentObject.content);
        comment._dateCreated = commentObject.dateCreated;
        return comment;
    }
}

export default class Annotation {
    private _type: AnnotationType;
    private _id: string;
    private _dateCreated: Date;
    private _comments: Array<AnnotationComment>;
    private _page: number;

    private _reference: textSelection | null;

    public get type() {
        return this._type;
    }

    public get id() {
        return this._id;
    }

    public get dateCreated() {
        return this._dateCreated;
    }

    public get comments() {
        return this._comments;
    }

    public get page() {
        return this._page;
    }

    public get state(): AnnotationState {
        return this.reference ? 'completed' : 'pending';
    }

    public get reference() {
        return this._reference;
    }

    constructor(
        type: AnnotationType,
        page: number)
    {
        this._type = type;
        this._page = page;
        this._id = this.generateGuid();
        this._dateCreated = new Date();
        this._comments = [];
        this._reference = null;
    }

    public setAnnotationReference(reference: textSelection) {
        if (this.state != 'pending') {
            throw new Error('It is not possible to add a reference to an annotation that already has one.');
        }
        this._reference = reference;
    }

    public serialize() {
        return JSON.stringify(this.toObject());
    }

    public static deserialize(serializedContent: string) {
        return Annotation.fromObject(JSON.parse(serializedContent));
    }

    public toObject() {
        return {
            type: this.type,
            id: this.id,
            dateCreated: this.dateCreated,
            comments: this.comments.map(x => x.toObject()),
            page: this.page,
            reference: this.reference,
        }
    }

    // TODO: Validate object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public static fromObject(annotationObject: any) {

        const annotation = new Annotation(annotationObject.type, annotationObject.page);
        annotation._id = annotationObject.id;
        annotation._dateCreated = annotationObject.dateCreated;
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        annotation._comments = (annotationObject.comments as any[]).map(x => AnnotationComment.fromObject(x));
        annotation._reference = annotationObject.reference;
        return annotation;
    }

    public tryGetTextSelection() {
        if (this.type !== 'text' || !this.reference || !('xpath' in this.reference)) {
            return null;
        }

        return this.reference;
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