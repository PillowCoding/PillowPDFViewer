import { CommonModule, DatePipe } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RingLoadingComponent } from './components/loading-icons/ring-loading/ring-loading.component';
import { WestResizeableComponent } from './components/resizeable/west-resizeable.component';
import { TranslatePipe } from './utils/localisation/translate.pipe';
import { LocalisationConfiguration } from './utils/localisation/localisationConfiguration';
import { LocalisationService } from './utils/localisation/localisation.service';
import { PdfViewerComponent } from './viewer/pdf-viewer.component';
import { PdfSidebarComponent } from './sidebar/pdf-sidebar.component';
import { CloseButtonComponent } from './components/close-button.component';
import { PdfAnnotationComponent } from './annotation/pdf-annotation.component';
import { ClickStopPropagationDirective } from './utils/stopPropagationDirective';
import { PdfAnnotationCommentComponent } from './annotation/pdf-annotation-comment.component';
import { InitialsAvatarComponent } from './components/initials-avatar';

@NgModule({
    declarations: [
        PdfViewerComponent,
        RingLoadingComponent,
        WestResizeableComponent,
        CloseButtonComponent,
        PdfAnnotationComponent,
        PdfAnnotationCommentComponent,
        PdfSidebarComponent,
        ClickStopPropagationDirective,
        InitialsAvatarComponent,
        TranslatePipe,
    ],
    exports: [
        PdfViewerComponent,
    ],
    imports: [
        FormsModule,
        CommonModule,
    ],
    providers: [
        DatePipe,
    ]
})
export class PdfViewerModule
{
    static forRoot(configuration: LocalisationConfiguration): ModuleWithProviders<PdfViewerModule>
    {
        return {
            ngModule: PdfViewerModule,
            providers: [
                LocalisationService, {
                    provide: 'configuration',
                    useValue: configuration
                }
            ]
        };
    }
}
