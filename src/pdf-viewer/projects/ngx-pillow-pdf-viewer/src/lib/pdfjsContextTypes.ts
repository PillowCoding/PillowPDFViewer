export interface PdfjsPageContext
{
    page: number;
    pageContainer: HTMLDivElement;
}

export interface SelectedTextContext extends PdfjsPageContext
{
    selectedText: string;
    startElement: HTMLElement;
    endElement: HTMLElement;
    xpath: string;
}
