import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { Ng2PdfjsViewerComponent } from './ng2-pdfjs-viewer.component';
import { PdfAnnotationComponent } from '../article/pdf-annotation.component'
import { PdfAnnotationsSideBarComponent } from 'ng2-pdfjs-viewer/annotations-side-bar/pdf-annotations-side-bar.component';
import { PdfIframeWrapperComponent } from 'ng2-pdfjs-viewer/iframe-wrapper/pdf-iframe-wrapper.component';
import { LocalisationConfiguration } from 'ng2-pdfjs-viewer/localisation/localisationConfiguration';
import { LocalisationService } from 'ng2-pdfjs-viewer/localisation/localisation.service';
import { TranslatePipe } from "../localisation/translate.pipe";
import { RingLoadingComponent } from "../loading-icons/ring-loading/ring-loading.component";

@NgModule({
    declarations: [
        Ng2PdfjsViewerComponent,
        PdfAnnotationComponent,
        PdfAnnotationsSideBarComponent,
        PdfIframeWrapperComponent,
    ],
    exports: [
        Ng2PdfjsViewerComponent,
    ],
    imports: [
        CommonModule,
        TranslatePipe,
        RingLoadingComponent
    ]
})
export class Ng2PdfjsViewerModule
{
  static forRoot(configuration: LocalisationConfiguration): ModuleWithProviders<Ng2PdfjsViewerModule>
  {
    return {
      ngModule: Ng2PdfjsViewerModule,
      providers: [
        LocalisationService, {
          provide: 'configuration',
          useValue: configuration
        }]
    };
  }
}
