import { Component, ViewChild } from '@angular/core';
@Component({
  selector: 'app-root',
  template: `
    <div class="main-container">
      <div class="pdf-toolbar">
        <a class="button margin-right-small" routerLink="/simple">Simple</a>
        <a class="button margin-right-small" routerLink="/download">Download</a>
        <a class="button margin-right-small" routerLink="/annotate">Annotate</a>
        <a class="button margin-right-small" routerLink="/events">Events</a>
        <a class="button" routerLink="/modified">Modified</a>
      </div>
      <router-outlet></router-outlet>
    </div>
  `,
  styleUrls: ['app.component.scss']
})
export class AppComponent
{
}
