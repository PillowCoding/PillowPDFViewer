import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { Ng2PdfjsViewerComponent } from './ng2-pdfjs-viewer.component';
import { PdfAnnotationComponent } from '../article/pdf-annotation.component'
import { PdfAnnotationsSideBarComponent } from 'ng2-pdfjs-viewer/annotations-side-bar/pdf-annotations-side-bar.component';
import { PdfIframeWrapperComponent } from 'ng2-pdfjs-viewer/iframe-wrapper/pdf-iframe-wrapper.component';

@NgModule({
  declarations: [
    Ng2PdfjsViewerComponent,
    PdfAnnotationComponent,
    PdfAnnotationsSideBarComponent,
    PdfIframeWrapperComponent,
  ],
  imports: [
    CommonModule,
  ],
  exports: [
    Ng2PdfjsViewerComponent,
  ]
})
export class Ng2PdfjsViewerModule { }
