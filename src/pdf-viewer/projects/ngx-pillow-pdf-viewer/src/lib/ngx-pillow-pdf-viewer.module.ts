import { CommonModule } from '@angular/common';
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

@NgModule({
    declarations: [
        PdfViewerComponent,
        RingLoadingComponent,
        WestResizeableComponent,
        CloseButtonComponent,
        PdfAnnotationComponent,
        PdfSidebarComponent,
        ClickStopPropagationDirective,
        TranslatePipe,
    ],
    exports: [
        PdfViewerComponent,
    ],
    imports: [
        FormsModule,
        CommonModule,
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
