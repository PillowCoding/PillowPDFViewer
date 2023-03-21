
<!-- Anchor for the "back to top" links -->
<a id="readme-top"></a>

<!-- Project logo -->
<br />
<div align="center">
  <a href="#">
    (Insert a fancy logo here)
  </a>
  <h1>PDFJS for Angular</h1>
</div>

> This project is a work in progress. The latest finished features are found on the "dev" branch.

<!-- Table of contents -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#getting-started">Getting Started</a>
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

### Installation
This is a step-by-step instruction on how to install the application.
1. Clone the repository.
> This operation requires valid credentials in order to clone.
2. Download the latest version of pdf.js (the package has been tested with [`v3.3.122`](https://github.com/mozilla/pdf.js/releases/tag/v3.3.122)).
3. Please the content of the release inside your `assets/` folder. By default the viewer is assumed to be in `assets/pdfjs/web/viewer.html`. If this is different, then you can modify the `[viewerRelativePath]` parameter.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- Issues -->
## Issues
- Text search will overwrite annotation colors if you search text that has been annotated. This does not throw any errors as far as has been tested. Due to the fact that this is partially caused by internal code, there will probably not be a fix for it.

## Todo
- Add types to commonly used things such as pdfViewerApplication to ease development.
- Implement pagination on annotations with a way to also disable it.