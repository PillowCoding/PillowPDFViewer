import { CommonModule } from '@angular/common';
import { AppRoutingModule } from './app-routing.module';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { Ng2PdfjsViewerModule, templateRefDirective } from 'ng2-pdfjs-viewer'
import { pdfViewerComponent } from './pages/pdfviewer.component';

import { AppComponent } from './app.component';
import { LocalisationConfiguration } from 'projects/ng2-pdfjs-viewer/src/services/localisation/localisationConfiguration';

@NgModule({
  declarations: [
    AppComponent,
    pdfViewerComponent,
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
