import PdfjsContext from "ngx-pillow-pdf-viewer/pdfjsContext";
import LoggingProvider from "ngx-pillow-pdf-viewer/utils/logging/loggingProvider";

export default class TextAnnotator {
    private readonly _defaultLogSource = TextAnnotator.name;

    constructor(
        private readonly _loggingProvider: LoggingProvider,
        private readonly _pdfjsContext: PdfjsContext)
        {
            if (this._pdfjsContext.fileState !== 'loaded') {
                throw new Error('Expected a file to be loaded.')
            }
        }
}