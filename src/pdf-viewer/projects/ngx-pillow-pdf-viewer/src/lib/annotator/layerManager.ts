import PdfjsContext from "ngx-pillow-pdf-viewer/pdfjsContext";
import LoggingProvider from "ngx-pillow-pdf-viewer/utils/logging/loggingProvider";

export default class LayerManager {
    private readonly _defaultLogSource = LayerManager.name;

    constructor(
        private readonly _loggingProvider: LoggingProvider,
        private readonly _pdfjsContext: PdfjsContext)
        {
            if (this._pdfjsContext.fileState !== 'loaded') {
                throw new Error('Expected a file to be loaded.')
            }
        }

    public getOrSetLayerByIdOnPage(id: string, page: number) {
        this._loggingProvider.sendDebug(`Getting or setting layer by id ${id} on page ${page}...`, this._defaultLogSource);
    }
}