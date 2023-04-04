import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { pdfViewerSimpleComponent } from "./pdfviewer-simple.component";
import { pdfViewerDownloadComponent } from "./pdfviewer-download.component";
import { pdfViewerAnnotateComponent } from "./pdfviewer-annotate.component";
import { pdfViewerModifiedComponent } from "./pdfviewer-modified.component";

const routes: Routes =
[
	{ path: '', component: pdfViewerSimpleComponent },
	{ path: 'simple', component: pdfViewerSimpleComponent },
	{ path: 'download', component: pdfViewerDownloadComponent },
	{ path: 'annotate', component: pdfViewerAnnotateComponent },
	{ path: 'modified', component: pdfViewerModifiedComponent },
	{ path: '**', component: pdfViewerSimpleComponent, pathMatch: 'full' },
];

@NgModule({
	imports: [
		RouterModule.forRoot(routes),
		BrowserAnimationsModule
	],
	exports: [RouterModule]
})
export class AppRoutingModule { }
