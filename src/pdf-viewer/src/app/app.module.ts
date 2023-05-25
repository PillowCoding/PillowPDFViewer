import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';


import { pdfViewerComponent } from './pages/pdfviewer.component';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SidebarComponent } from './components/sidebar.component';
import { MainComponent } from './components/main.component';

import { templateRefDirective, PdfViewerModule, LocalisationConfiguration } from 'ngx-pillow-pdf-viewer';


@NgModule({
  declarations: [
    AppComponent,
    pdfViewerComponent,
    MainComponent,
    SidebarComponent,
    templateRefDirective
  ],
  imports: [
    BrowserModule,
    CommonModule,
    AppRoutingModule,
    PdfViewerModule.forRoot(new LocalisationConfiguration({ localisationToUse: navigator.language })),
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
