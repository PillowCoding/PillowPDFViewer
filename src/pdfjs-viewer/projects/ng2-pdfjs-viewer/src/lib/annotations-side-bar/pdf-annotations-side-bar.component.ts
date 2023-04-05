import { animate, state, style, transition, trigger } from '@angular/animations';
import { ChangeDetectorRef, Component, EventEmitter, Input, Output, QueryList, TemplateRef, ViewChildren } from '@angular/core';
import { PdfAnnotationComponent, pdfAnnotationCommentSubmission } from 'ng2-pdfjs-viewer/article/pdf-annotation.component';
import { pdfAnnotation } from 'ng2-pdfjs-viewer/pdf-annotation';

export type shownAnnotationsFetcherType = () => Array<pdfAnnotation>;

@Component({
selector: 'lib-ng2-pdfjs-viewer-annotations-sidebar',
template: `
    <div
        class="annotation-container full-height" [@expandInOut]="isSidebarExpanded ? 'expand' : 'collapse'">

        <div *ngIf="isSidebarExpanded && isLoading"
            class="loading-indicator">

            <lib-ng2-pdfjs-viewer-loading-ring></lib-ng2-pdfjs-viewer-loading-ring>
        </div>

        <div class="header">
            <div *ngIf="isSidebarExpanded"
                (click)="collapseAnnotations()"
                class="toolbar-button close"
                [title]="'sidebar.collapse' | translate">

                <svg type="button"
                    aria-label="Close"
                    xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z" />
                </svg>
            </div>
            
            <button *ngIf="!isSidebarExpanded"
                class="toolbar-button expand"
                [title]="'sidebar.expand' | translate"
                (click)="expandAnnotations()">
            </button>

            <span class="count" *ngIf="isSidebarExpanded && isLoading">{{'annotations.loading' | translate}}</span>
            <span class="count" *ngIf="isSidebarExpanded && shownAnnotations && shownAnnotations.length === 1">{{'annotations.singular' | translate: shownAnnotations.length.toString()}}</span>
            <span class="count" *ngIf="isSidebarExpanded && shownAnnotations && shownAnnotations.length !== 1">{{'annotations.plural' | translate: shownAnnotations.length.toString()}}</span>
        </div>
        <ol class="annotations" *ngIf="isSidebarExpanded && !isLoading">
            <p class="warning no-annotations" *ngIf="shownAnnotations?.length === 0 && !pendingAnnotation">{{'annotations.nonePage' | translate}}</p>

            <li *ngIf="pendingAnnotation" class="annotation">
                <lib-ng2-pdfjs-viewer-annotation
                    [annotation]="pendingAnnotation"
                    (commentPosted)="submitInitialAnnotationComment($event)">
                </lib-ng2-pdfjs-viewer-annotation>
            </li>

            <li *ngFor="let annotation of shownAnnotations" class="annotation">
                <lib-ng2-pdfjs-viewer-annotation #annotation
                    [annotation]="annotation"
                    [metaDataHeaderTemplate]="annotationMetaDataHeaderTemplate"
                    [commentTemplate]="annotationCommentTemplate"

                    (clicked)="clickAnnotation($event)"
                    (commentPosted)="submitAnnotationComment($event)">
                </lib-ng2-pdfjs-viewer-annotation>
            </li>
        </ol>
    </div>
`,
styleUrls: ['pdf-annotations-side-bar.component.scss'],
animations: [
    trigger('expandInOut', [
        state('expand', style({
            width: '30rem'
        })),
        state('collapse', style({
            width: '28px'
        })),
        transition('expand => collapse', animate('100ms ease-out')),
        transition('collapse => expand', animate('100ms ease-out'))
    ])
]
})
export class PdfAnnotationsSideBarComponent
{
    @ViewChildren('annotation') annotationComponents!: QueryList<PdfAnnotationComponent>;

    @Input() enableDebugMessages!: boolean;
    @Input() pendingAnnotation?: pdfAnnotation;

    @Input() annotationMetaDataHeaderTemplate?: TemplateRef<unknown>;
    @Input() annotationCommentTemplate?: TemplateRef<unknown>;

    @Input() shownAnnotationsFetcher!: shownAnnotationsFetcherType;

    @Output() sidebarExpand = new EventEmitter();
    @Output() sidebarExpanded = new EventEmitter();
    @Output() sidebarCollapse = new EventEmitter();
    @Output() sidebarCollapsed = new EventEmitter();
    @Output() clicked = new EventEmitter<pdfAnnotation>();
    @Output() initialCommentPosted = new EventEmitter<pdfAnnotationCommentSubmission>();
    @Output() commentPosted = new EventEmitter<pdfAnnotationCommentSubmission>();

    // A number representing if the sidebar is loading. Multiple things may load at the same time, and each concurrent loading page can add to it.
    private _loadingCount = 0;

    /** Represents the current focussed annotation, if any are focused on. */
    private _currentAnnotationFocus?: pdfAnnotation;
    
    private _isSidebarExpanded = false;

    public get shownAnnotations()
    {
        return this.shownAnnotationsFetcher()
            ?.slice()
            ?.sort((a: pdfAnnotation, b: pdfAnnotation) => new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime())
            ?.reverse();
    }

    /** A boolean to define if the annotations bar is expanded. */
    public get isSidebarExpanded()
    {
        return this._isSidebarExpanded;
    }

    /** If true, the sidebar is loading. */
    public get isLoading()
    {
        return this._loadingCount > 0;
    }

    constructor(
        private changeDetector: ChangeDetectorRef)
    {
    }

    public ensureExpanded()
    {
        if (!this._isSidebarExpanded)
        {
            this.expandAnnotations();
        }
    }

    public focusAnnotation(annotation: pdfAnnotation)
    {
        this.ensureExpanded();
        this.sendDebugMessage(`Start focus on annotation ${annotation.id}...`);

        const attributeArticle = document.querySelectorAll(`[data-annotation="${annotation.id}"]`);

        if (attributeArticle.length > 1)
        {
            throw new Error(`Multiple annotations found matching predicate [data-annotation="${annotation.id}"].`);
        }

        // It is possible that the annotation no longer exists because the page is out of focus.
        if (attributeArticle[0])
        {
            //throw new Error('Could not find the annotation comments.');
            attributeArticle[0].classList.add('focus');
        }
        
        const annotationComponent = this.annotationComponents.filter(x => x.annotation == annotation)[0];
        annotationComponent.expand();
        
        this._currentAnnotationFocus = annotation;
    }

    public unfocusAnnotation()
    {
        this.sendDebugMessage(`Start unfocus...`);

        if (!this._currentAnnotationFocus)
        {
            throw new Error('Expected a focussed annotation.');
        }

        const attributeArticle = document.querySelectorAll(`[data-annotation="${this._currentAnnotationFocus.id}"]`);

        if (attributeArticle.length > 1)
        {
            throw new Error(`Multiple annotations found matching predicate [data-annotation="${this._currentAnnotationFocus.id}"].`);
        }

        // It is possible that the annotation no longer exists because the page is out of focus.
        if (attributeArticle[0])
        {
            //throw new Error('Could not find the annotation comments.');
            attributeArticle[0].classList.remove('focus');
        }

        const annotationComponent = this.annotationComponents.filter(x => x.annotation == this._currentAnnotationFocus)[0];

        // It is possible the annotation no longer exists due to scrolling.
        if (annotationComponent) {
            annotationComponent.collapse();
        }

        delete(this._currentAnnotationFocus);
    }

    public focusAnnotationInput(annotation: pdfAnnotation)
    {
        this.ensureExpanded();
        this.sendDebugMessage(`Start focus on annotation input for ${annotation.id}...`);

        const attributeArticle = document.querySelectorAll(`[data-annotation-input="${annotation.id}"]`);

        if (attributeArticle.length != 1)
        {
            throw new Error('Could not find the annotation comment input to focus.');
        }

        (attributeArticle[0] as HTMLElement).focus();
        this.sendDebugMessage('Input focus changed', attributeArticle[0]);
    }

    public setLoading()
    {
        this._loadingCount++;
    }

    public setNotLoading()
    {
        this._loadingCount--;
    }

    public setAnnotationLoading(annotation: pdfAnnotation)
    {
        const annotationContainer = document.querySelectorAll(`[data-annotation="${annotation.id}"]`);

        if (annotationContainer.length != 1)
        {
            throw new Error('Could not find the annotation to mark as loading.');
        }

        annotationContainer[0].classList.add('loading');
    }

    public setAnnotationNotLoading(annotation: pdfAnnotation)
    {
        const annotationContainer = document.querySelectorAll(`[data-annotation="${annotation.id}"]`);

        if (annotationContainer.length != 1)
        {
            throw new Error('Could not find the annotation to mark as loading.');
        }

        annotationContainer[0].classList.remove('loading');
    }

    protected expandAnnotations()
    {
        if (this._isSidebarExpanded)
        {
            throw new Error('Tried to expand the annotations whilst expanded.');
        }

        this.sidebarExpand.emit();
        this._isSidebarExpanded = true;
        this.changeDetector.detectChanges();
        this.sidebarExpanded.emit();
    }

    protected collapseAnnotations()
    {
        if (!this._isSidebarExpanded)
        {
            throw new Error('Tried to collapse the annotations whilst collapsed.');
        }

        this.sidebarCollapse.emit();
        this._isSidebarExpanded = false;
        this.changeDetector.detectChanges();
        this.sidebarCollapsed.emit();
    }

    protected clickAnnotation(annotation: pdfAnnotation)
    {
        this.clicked.emit(annotation);
    }

    protected submitInitialAnnotationComment(event: pdfAnnotationCommentSubmission)
    {
        this.sendDebugMessage('Submitting initial comment', event);
        this.initialCommentPosted.emit(event);
    }

    protected submitAnnotationComment(event: pdfAnnotationCommentSubmission)
    {
        const { annotation, comment } = event;
        annotation.comments.push(comment);

        this.sendDebugMessage('Submitting comment', event);
        this.commentPosted.emit(event);
        this.changeDetector.detectChanges();
    }

    /**
     * Sends the given message when debug messages are enabled.
     * @param message The message to send.
     * @param optionalParams Optional parameters to send with the message.
     */
    private sendDebugMessage(message?: unknown, ...optionalParams: unknown[])
    {
        if (!this.enableDebugMessages)
        {
        return;
        }

        console.log(`Side bar - ${message}`, ...optionalParams);
    }
}