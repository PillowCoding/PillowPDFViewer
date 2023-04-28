import generateGuid from "ngx-pillow-pdf-viewer/utils/generateGuid";
import { AnnotationState, AnnotationType, PartialReferenceType, boundingBox } from "./annotationTypes";

export class AnnotationComment {

    private _dateCreated: Date;
    private _content: string;
    
    public get dateCreated() { return this._dateCreated; }
    public get content() { return this._content; }

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

    public reference: PartialReferenceType | null;
    public focused = false;

    public get type() { return this._type; }
    public get id() { return this._id; }
    public get dateCreated() { return this._dateCreated; }
    public get comments() { return this._comments; }
    public get page() { return this._page; }

    // The state is determined by the reference, and if that reference has valid parameters.
    public get state(): AnnotationState {
        return (this.type === 'text' && this.tryGetTextSelection()) ||
            (this.type === 'draw' && this.tryGetCompletedBoundingBox()) ?
                'completed' :
                'pending';
    }

    constructor(
        type: AnnotationType,
        page: number)
    {
        this._type = type;
        this._page = page;
        this._id = generateGuid();
        this._dateCreated = new Date();
        this._comments = [];
        this.reference = null;
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
        annotation.reference = annotationObject.reference;
        return annotation;
    }

    public tryGetTextSelection() {
        if (this.type !== 'text' || !this.reference || !('xpath' in this.reference)) {
            return null;
        }

        return this.reference;
    }

    public tryGetBoundingBox() {
        if (this.type !== 'draw' || !this.reference || !('start' in this.reference)) {
            return null;
        }

        return this.reference;
    }

    public tryGetCompletedBoundingBox() {
        const boundingBox = this.tryGetBoundingBox();
        if (!boundingBox?.start || !boundingBox.end) {
            return null
        }

        return boundingBox as boundingBox;
    }
}