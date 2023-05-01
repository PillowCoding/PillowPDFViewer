import generateGuid from "ngx-pillow-pdf-viewer/utils/generateGuid";
import { AnnotationState, AnnotationType, PartialReferenceType, ReferenceType, boundingBox } from "./annotationTypes";
import { PickPartial, PickRequired } from "ngx-pillow-pdf-viewer/utils/typings";

export type annotationCommentObjectParameters = Readonly<

    // Required parameters
    PickRequired<AnnotationComment,
        'content' | 'dateCreated'>
    
    // Optional parameters
    & PickPartial<Annotation,
        'creator' | 'creatorUrl'>
>;

export type annotationCommentCreateObjectParameters = annotationCommentObjectParameters;

export type annotationObjectParameters = Readonly<

    // Required parameters
    PickRequired<Annotation,
        'type' | 'page' | 'id' | 'dateCreated'>
    
    // Optional parameters
    & PickPartial<Annotation,
        'creator' | 'creatorUrl'>
    
    // Adjusted type reference to be required.
    // Adjusted type comment to satisfy custom type.
    & {
        reference: ReferenceType,
        comments: annotationCommentObjectParameters[],
    }
>;

export type annotationCreateObjectParameters = Readonly<

    // Inherited parameters
    annotationObjectParameters

    // Optional parameters
    & PickPartial<Annotation,
        'canDelete'>
>;

export class AnnotationComment {

    private _dateCreated: Date;
    private _content: string;

    /** Optional creator of the comment. */
    public creator?: string;

    /** Optional url to the profile picture of the comment. */
    public creatorUrl?: string;

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

    public toObject(): annotationCommentObjectParameters {
        return {
            content: this.content,
            creator: this.creator,
            creatorUrl: this.creatorUrl,
            dateCreated: this.dateCreated,
        }
    }

    // TODO: Validate object
    public static fromObject(commentObject: annotationCommentCreateObjectParameters) {

        const comment = new AnnotationComment(commentObject.content);
        comment._dateCreated = commentObject.dateCreated;

        comment.creator = commentObject.creator;
        comment.creatorUrl = commentObject.creatorUrl;
        return comment;
    }
}

export class Annotation {
    private _type: AnnotationType;
    private _id: string;
    private _dateCreated: Date;
    private _comments: Array<AnnotationComment>;
    private _page: number;

    /** The reference of the annotation. This represents a partial or full reference on the PDF page. */
    public reference: PartialReferenceType | null;

    /** If true, the annotation is being focused by the application. */
    public focused = false;

    /** Optional creator of the annotation. */
    public creator?: string;

    /** Optional url to the profile picture of the creator. */
    public creatorUrl?: string;

    /** Boolean that determines if the annotation can be deleted.
     * Modify this value if a user is not allowed to delete the annotation.
     * Note that this is purely clientside and there should be secured serverside checks to prevent deletion.
     */
    public canDelete = true;

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

    public toObject(): annotationObjectParameters {

        // Validate state.
        // This will validate that the reference is set.
        if (this.state !== 'completed') {
            throw new Error('Only completed annotations can be translated to an object.');
        }

        const reference = this.reference as ReferenceType;
        const comments = this.comments.map(x => x.toObject());

        return {
            type: this.type,
            id: this.id,
            creator: this.creator,
            creatorUrl: this.creatorUrl,
            dateCreated: this.dateCreated,
            comments,
            page: this.page,
            reference,
        }
    }

    // TODO: Validate object
    public static fromObject(annotationObject: annotationCreateObjectParameters) {

        const annotation = new Annotation(annotationObject.type, annotationObject.page);
        annotation._id = annotationObject.id;
        annotation._dateCreated = annotationObject.dateCreated;
        
        annotation._comments = annotationObject.comments.map(x => AnnotationComment.fromObject(x));
        annotation.reference = annotationObject.reference;

        annotation.creator = annotationObject.creator;
        annotation.creatorUrl = annotationObject.creatorUrl;

        annotation.canDelete = annotationObject.canDelete || true;
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