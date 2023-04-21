export interface PdfjsPageContext
{
    page: number;
    pageContainer: HTMLDivElement;
    loaded: () => boolean;
}

export interface SelectedTextContext extends PdfjsPageContext
{
    selectedText: string;
    selectedTextOffset: number;
    startElement: HTMLElement;
    endElement: HTMLElement;
    xpath: string;
}
