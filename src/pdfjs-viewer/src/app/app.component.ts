import { Component, ViewChild } from '@angular/core';
@Component({
  selector: 'app-root',
  template: `
    <div class="main-container">
      <div class="w-100 pdf-toolbar px-2 py-1 d-flex">
        <a class="button me-2" routerLink="/simple">Simple</a>
        <a class="button me-2" routerLink="/download">Download</a>
        <a class="button me-2" routerLink="/annotate">Annotate</a>
        <a class="button me-2" routerLink="/events">Events</a>
        <a class="button" routerLink="/modified">Modified</a>
      </div>
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .main-container {
      height: 100vh;
      overflow-y: hidden;
    }

    .pdf-toolbar {
      background-color: rgba(249, 249, 250, 1);
      > a {
        text-decoration: inherit;
        color: inherit;
        height: 31px;
        font-size: 12px;
        margin: 0;
        padding: .25rem 1rem 0 1rem;
        border: none;
        background-color: rgba(0, 0, 0, 0.2);
        cursor: pointer;
        line-height: 1.4rem;
      }
    }
  `]
})
export class AppComponent
{
}
