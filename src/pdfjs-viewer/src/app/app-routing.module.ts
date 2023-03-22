import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { appPdfViewerAnnotateComponent } from "./app-pdfviewer-annotate.component";
import { appPdfViewerDownloadComponent } from "./app-pdfviewer-download.component";
import { appPdfViewerModifiedComponent } from "./app-pdfviewer-modified.component";
import { appPdfViewerSimpleComponent } from "./app-pdfviewer-simple.component";
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

const routes: Routes =
[
	{ path: '', component: appPdfViewerSimpleComponent },
	{ path: 'simple', component: appPdfViewerSimpleComponent },
	{ path: 'download', component: appPdfViewerDownloadComponent },
	{ path: 'annotate', component: appPdfViewerAnnotateComponent },
	{ path: 'modified', component: appPdfViewerModifiedComponent },
	{ path: '**', component: appPdfViewerSimpleComponent, pathMatch: 'full' },
];

@NgModule({
	imports: [
		RouterModule.forRoot(routes),
		BrowserAnimationsModule
	],
	exports: [RouterModule]
})
export class AppRoutingModule { }
