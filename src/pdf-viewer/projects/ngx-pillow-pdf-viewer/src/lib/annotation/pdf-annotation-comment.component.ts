import { DatePipe } from "@angular/common";
import { Component, Input, OnInit } from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";
import { Annotation, AnnotationComment } from "ngx-pillow-pdf-viewer/annotation/annotation";
import isBase64String from "ngx-pillow-pdf-viewer/utils/isBase64String";

export type annotationsProviderDelegate = (page: number) => Promise<Annotation[]>;

@Component({
    selector: 'lib-pdf-annotation-comment',
    templateUrl: 'pdf-annotation-comment.component.html',
    styleUrls: ['pdf-annotation-comment.component.scss', './../common.scss'],
})
export class PdfAnnotationCommentComponent implements OnInit {
    
    @Input() public annotationComment?: AnnotationComment;

    public get dateDisplay() {
        this.assertParametersSet();

        // If the date is today, display the time alongside it.
        const today = new Date(this.annotationComment.dateCreated).setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0);
        if (today) {
            return this.datePipe.transform(this.annotationComment.dateCreated, 'H:mm') || '';
        }

        return this.datePipe.transform(this.annotationComment.dateCreated, 'd MMMM, y H:mm') || '';
    }

    public get avatarUrl() {
        this.assertParametersSet();

        if (!this.annotationComment.creatorUrl) {
            return null;
        }

        if (typeof this.annotationComment.creatorUrl === 'string') {

            // Check if base 64.
            if (isBase64String(this.annotationComment.creatorUrl)) {
                return 'data:image/png;base64,' + this.annotationComment.creatorUrl;
            }
            
            return this.annotationComment.creatorUrl;
        }

        return 'data:image/png;base64,' + this.annotationComment.creatorUrl;
    }

    constructor(
        private readonly datePipe: DatePipe,
        private readonly sanitizer: DomSanitizer,
    ) {
    }

    ngOnInit(): void {
        this.assertParametersSet();
    }

    private assertParametersSet(): asserts this is this & {
        annotationComment: AnnotationComment;
    } {
        const missingParameters = [];
        if (!this.annotationComment) { missingParameters.push('annotationComment'); }
        if (missingParameters.length > 0) {
            throw new Error(`Please provide a value for the parameters: ${missingParameters.join(', ')}`);
        }
    }
}