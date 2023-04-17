import LoggingProvider from "./utils/logging/loggingProvider";

export default class PdfjsContext
{
    constructor(
        private readonly _loggingProvider: LoggingProvider,
        private readonly _viewerRelativePath: string,
        private readonly _iframeElement: HTMLIFrameElement
    ) {
        this._iframeElement.onload = () => this.iframeLoaded();
        this._iframeElement.src = this._viewerRelativePath + '?file=';
    }

    private iframeLoaded() {
        this.sendLogMessage('Iframe has been loaded.');
    }

    private sendLogMessage(message: unknown) {
        this._loggingProvider.send(PdfjsContext.name, message);
    }
}