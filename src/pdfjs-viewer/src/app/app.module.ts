import { CommonModule } from '@angular/common';
import { AppRoutingModule } from './app-routing.module';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { Ng2PdfjsViewerModule, templateRefDirective } from 'ng2-pdfjs-viewer'
import { appPdfViewerAnnotateComponent } from './app-pdfviewer-annotate.component';
import { appPdfViewerDownloadComponent } from './app-pdfviewer-download.component';
import { appPdfViewerSimpleComponent } from './app-pdfviewer-simple.component';

import { AppComponent } from './app.component';
import { appPdfViewerModifiedComponent } from './app-pdfviewer-modified.component';
import { LocalisationConfiguration } from 'ng2-pdfjs-viewer/localisation/localisationConfiguration';

@NgModule({
  declarations: [
    AppComponent,
    appPdfViewerSimpleComponent,
    appPdfViewerAnnotateComponent,
    appPdfViewerDownloadComponent,
    appPdfViewerModifiedComponent,
    templateRefDirective
  ],
  imports: [
    BrowserModule,
    CommonModule,
    AppRoutingModule,
    Ng2PdfjsViewerModule.forRoot(new LocalisationConfiguration({ localisationToUse: navigator.language })),
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
