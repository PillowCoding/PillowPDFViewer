import { AnnotationType, textSelection } from "./annotationTypes";

export type AnnotationCommentConstructType =
    string | {
        content: string;
        dateCreated: Date;
    };

export type AnnotationConstructType =
    AnnotationType | {
        type: AnnotationType;
        id: string;
        dateCreated: Date;
        comments: Array<AnnotationComment>;
        page: number;
        reference: textSelection;
    };

export class AnnotationComment {
    private _dateCreated: Date;
    private _content: string;

    public get dateCreated() {
        return this._dateCreated;
    }

    public get content() {
        return this._content;
    }

    constructor(
        args: AnnotationCommentConstructType) {
        
        if (typeof args === 'string') {
            this._content = args;
            this._dateCreated = new Date();
            return;
        }

        this._content = args.content;
        this._dateCreated = args.dateCreated;
    }
}

export default class annotation {
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

    public get reference() {
        return this._reference;
    }

    constructor(
        args: AnnotationConstructType) {
        
        if (typeof args === 'string') {
            this._type = args;
            this._id = this.generateGuid();
            this._dateCreated = new Date();
            this._comments = [];
            this._reference = null;
            return;
        }

        this._type = args.type;
        this._id = args.id;
        this._dateCreated = args.dateCreated;
        this._comments = args.comments;
        this._page = args.page;
        this._reference = args.reference;
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