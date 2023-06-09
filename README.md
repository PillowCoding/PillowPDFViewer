



<!-- Anchor for the "back to top" links -->
<a id="readme-top"></a>

<!-- Project logo -->
<br />
<div align="center">
  <a href="#">
    (Insert a fancy logo here)
  </a>
  <h1>Pillow PDF viewer</h1>
</div>

This is a PDF viewer for Angular. The project internally uses [PDF.JS](https://github.com/mozilla/pdf.js) for the rendering of the page, and introduces many features including custom annotations support, which extends the base PDF.JS viewer.

> This project is a work in progress. The latest finished features are found on the "dev" branch.

<!-- Table of contents -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#getting-started">Getting Started</a>
    </li>
    <li>
      <a href="#project-overview">Project overview</a>
    </li>
    <li>
      <a href="#frequently-asked-questions">Frequently asked questions</a>
    </li>
    <li>
      <a href="#issues">Issues</a>
    </li>
	<li>
      <a href="#todo">Todo</a>
    </li>
  </ol>
</details>



<!-- Getting started -->
## Getting Started

### Requirements
- Angular 13 or higher.
- Downloaded PDF.JS (see below).

### Note before usage
This project uses [PDF.JS](https://github.com/mozilla/pdf.js) as a base and wraps around its features. Be sure to have PDF.JS as part of your project before using this package.
1. Download the latest version of pdf.js (this project has been created with [`v3.3.122`](https://github.com/mozilla/pdf.js/releases/tag/v3.3.122)). The project requires [pdfjs-3.3.122-dist.zip](https://github.com/mozilla/pdf.js/releases/download/v3.3.122/pdfjs-3.3.122-dist.zip).
2. Place the content of the zip file inside your `assets/` folder.
	- Note that by default the viewer is assumed to be in `assets/pdfjs/web/viewer.html`. If this is different, then you can modify the `[viewerRelativePath]` parameter of the component.

### Installation

Install with NPM: `npm i ngx-pillow-pdf-viewer`.


### Contributing to the repository
Clone the repository: `git clone https://github.com/PillowCoding/PillowPDFViewer.git`
- If you want to clone just the dev repository: `git clone -b dev --single-branch https://github.com/PillowCoding/PillowPDFViewer.git`

<!-- Project overview -->
## Project overview

### Features
- PDF.JS, a [project](https://github.com/mozilla/pdf.js) by Mozilla for parsing and rendering of PDF files.
- Custom annotations support for rendering annotations on the file.
- A sidebar to view the annotations.
- The ability to disable certain buttons on the PDF.JS viewer.
- Dark mode depending on browser configuration.
- Localisation.
- Extended logging with severity and sources, fully customizable.
- Extended support for PDF.JS, including but not limited to:
	- Type support for common types that are used in the project.
	- Extended access to the Eventbus, allowing help with registering common events using autocomplete, but also allowing custom events to be registered.
	- Access to many lifecycle methods used in the project.

### Folder structure
- `projects/ngx-pillow-pdf-viewer`: The main project containing all the functionalities for using the PDF viewer.
- `src/`: The example project that implements the main project and showcases its usage.

<!-- Frequently asked questions -->
## Frequently asked questions
#### How do I fix "Error: The PDFViewerApplication could not be found."?
- Follow the installation of the project. You are required to manually install and add PDF.JS due to its size. After inserting PDF.JS into the `assets` folder of your project, the error will be gone.

<!-- Issues -->
## Issues
- There is currently no support for properly closing a document, and opening a new one. The way around this is to reload the component completely with a new url.

<!-- TODO -->
## Todo
- Add the ability to remove comments on the "modified" page.
- The text annotator does not color the text that has been selected in specific, but the whole block.
- Certain shortcut keys still work even though their corresponding button is disabled.
- Support for more annotation types.
- Support for images in comments.
- More documentation on using this viewer.
- More localisation.

<p align="right">(<a href="#readme-top">back to top</a>)</p>