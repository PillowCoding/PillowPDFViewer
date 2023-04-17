import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { pdfViewerComponent } from "./pages/pdfviewer.component";

const routes: Routes =
[
	{ path: '', component: pdfViewerComponent },
	{ path: '**', component: pdfViewerComponent, pathMatch: 'full' },
];

@NgModule({
	imports: [
		RouterModule.forRoot(routes),
		BrowserAnimationsModule
	],
	exports: [RouterModule]
})
export class AppRoutingModule { }
