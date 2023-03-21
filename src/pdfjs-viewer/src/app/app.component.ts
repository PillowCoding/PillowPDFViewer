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
  styles: [`
    *
    {
      font-family: "Segoe UI", Arial, sans-serif;
    }

    .main-container {
      height: 100vh;
      overflow-y: hidden;
    }

    .pdf-toolbar {
      background-color: rgba(249, 249, 250, 1);
      padding: .5rem;

      .button
      {
        text-decoration: none;
        color: black;
        font-size: 12px;
        padding: .4rem 1rem .5rem 1rem;
        border: none;
        background-color: rgba(0, 0, 0, 0.2);
        cursor: pointer;
        line-height: 1.4rem;

        &:hover
        {
          background-color: rgba(0, 0, 0, 0.3);
        }

        &.small
        {
          padding: .15rem .8rem 0 .8rem;
        }
      }
    }

    .margin-right-small
    {
      margin-right: .5rem;
    }
  `]
})
export class AppComponent
{
}
