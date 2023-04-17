import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { Ng2PdfjsViewerComponent } from './viewer/ng2-pdfjs-viewer.component';
import { FormsModule } from '@angular/forms';
import { RingLoadingComponent } from './components/loading-icons/ring-loading/ring-loading.component';
import { WestResizeableComponent } from './components/resizeable/west-resizeable.component';
import { TranslatePipe } from './services/localisation/translate.pipe';
import { LocalisationConfiguration } from './services/localisation/localisationConfiguration';
import { LocalisationService } from './services/localisation/localisation.service';

@NgModule({
    declarations: [
        Ng2PdfjsViewerComponent,
        RingLoadingComponent,
        WestResizeableComponent,
        TranslatePipe,
    ],
    exports: [
        Ng2PdfjsViewerComponent,
    ],
    imports: [
        FormsModule,
        CommonModule,
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
                }
            ]
        };
    }
}
