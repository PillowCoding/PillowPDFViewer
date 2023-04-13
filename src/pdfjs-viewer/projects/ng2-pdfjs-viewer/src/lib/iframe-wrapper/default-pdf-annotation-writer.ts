import { pdfAnnotationWriter } from "ng2-pdfjs-viewer/pdf-annotation-writer";
import { pdfBehaviour } from "ng2-pdfjs-viewer/pdf-behaviour";
import { pdfAnnotation, textSelection } from "../../public-api";

export class defaultPdfAnnotationWriter implements pdfAnnotationWriter
{
    private readonly _iframeDocumentNotLoadedError = 'PDF viewer document is not loaded.';
    private readonly _textSelectionInvalid = 'The current selection is not valid.';

    private _enableDebugLogging = false;
    public set enableDebugLogging(val: boolean) { this._enableDebugLogging = val; }

    constructor(
        private readonly _pdfBehaviour: pdfBehaviour)
    {
    }

    focusAnnotation(annotation: pdfAnnotation, color: string)
    {
        if (!this._pdfBehaviour.iframeDocument) {
            throw new Error(this._iframeDocumentNotLoadedError);
        }

        const pdfAttributes = this._pdfBehaviour.iframeDocument.querySelectorAll(`[data-annotation="${annotation.id}"]`);
        if (pdfAttributes.length < 1) {
            throw new Error('Could not find annotation in the pdf.');
        }

        pdfAttributes.forEach(x => (x as HTMLElement).style.backgroundColor = color);
    }

    unfocusAnnotation(annotation: pdfAnnotation, color: string)
    {
        if (!this._pdfBehaviour.iframeDocument) {
            throw new Error(this._iframeDocumentNotLoadedError);
        }

        const pdfAttributes = this._pdfBehaviour.iframeDocument.querySelectorAll(`[data-annotation="${annotation.id}"]`);
        if (pdfAttributes.length < 1) {
            throw new Error('Could not find annotation in the pdf.');
        }

        pdfAttributes.forEach(x => (x as HTMLElement).style.backgroundColor = color);
    }

    containsExistingAnnotation(selection: Selection): boolean
    {
        // There is an existing annotation when any node contains children, indicating it has been modified with annotation colors.

        let startElement = selection.anchorNode?.parentElement;
        let endElement = selection.focusNode?.parentElement;

        if (!selection.anchorNode || !selection.focusNode) {
            throw new Error(this._textSelectionInvalid);
        }

        // We need to make sure what node comes earlier in the DOM tree. If we select backwards, we need to switch the nodes around.
        const anchorNodePosition = selection.anchorNode.compareDocumentPosition(selection.focusNode);
        if (anchorNodePosition & Node.DOCUMENT_POSITION_PRECEDING)
        {
            startElement = selection.focusNode?.parentElement;
            endElement = selection.anchorNode?.parentElement;
        }

        if (!startElement || !endElement) {
            throw new Error(this._textSelectionInvalid);
        }

        let currentElement: Element | null | undefined = startElement;
        while(currentElement)
        {
            // Check if we preceded the focused element, indicating we are passing the selected text.
            const currentElementPositionToFocus = currentElement.compareDocumentPosition(endElement);
            if (currentElementPositionToFocus & Node.DOCUMENT_POSITION_PRECEDING)
            {
                this.sendDebugMessage('Annotation exist check. Element precedes end tag and is valid.');
                break;
            }

            // Check if the tag is a font. Fonts are used to color the text.
            if (currentElement.tagName.toLowerCase() == 'font')
            {
                this.sendDebugMessage('Annotation exist check. Font was encountered.');
                return true;
            }

            // Check for siblings
            if (currentElement.childNodes.length > 1)
            {
                this.sendDebugMessage('Annotation exist check. Siblings were found.');
                return true;
            }

            // Structured PDFs have "markedContent" wrappers.
            // If these are encountered, we must get the next sibling with an extra step.
            if (currentElement.parentElement?.classList.contains('markedContent')) {

                // Marked content can have multiple spans
                if (currentElement.nextSibling) {
                    currentElement = currentElement.nextElementSibling;
                    continue;
                }
                
                let nextNode: Element | null = null;
                let lastCheckedElement: Element = currentElement.parentElement;
                while(!nextNode) {
                    if (!lastCheckedElement.nextElementSibling) {
                        break;
                    }

                    nextNode = (Array.from(lastCheckedElement.nextElementSibling.children).filter(x => Array.from(x.children).some(y => y.nodeName === 'FONT')))[0];
                    if (!nextNode) {
                        lastCheckedElement = lastCheckedElement.nextElementSibling;
                    }
                }
                
                currentElement = nextNode as Element | null;
                continue;
            }

            currentElement = currentElement.nextElementSibling;
        }

        return false;
    }

    colorAnnotation(annotation: pdfAnnotation, color: string)
    {
        if (annotation.type !== 'text') {
            console.warn('Tried to color an annotation with no xpath.');
            return;
        }

        if (!this._pdfBehaviour.iframeDocument) {
            throw new Error(this._iframeDocumentNotLoadedError);
        }

        const { xpath, selectedText, selectedTextOffset } = <textSelection>annotation.reference;
        const nodeReference = this.getNodeReferenceByXpath(this._pdfBehaviour.iframeDocument, xpath);

        // Very fast scrolling makes it possible for this to fail.
        if (!nodeReference) {
            //throw new Error(`Node reference was not found for '${xpath}'.`);
            return;
        }

        this.colorAnnotationText(nodeReference, selectedText, selectedTextOffset, color, annotation.id);
    }

    removeColorsFromAnnotation(annotation: pdfAnnotation)
    {
        // Using the xpath of the annotation, find the starting node of the annotation.
        // Whilst a reference exists and whilst we have text remaining that should be reverted:
        //  - Get the children of the node. This should be three tags.
        //  - Get the content of each. The middle one should be the colored text.
        //  - Remove the font tags and put the text back into the actual node.
        //  - Check if we have anything left. The remaining text length should be above zero (after removing what the middle element had), and the next sibling should exist.

        if (annotation.type !== 'text')
        {
            console.warn('Tried to remove colors from an annotation with no xpath.');
            return;
        }

        if (!this._pdfBehaviour.iframeDocument) {
            throw new Error(this._iframeDocumentNotLoadedError);
        }

        // Ignore if there is no reference to work with.
        // This is possible if the annotate button was pressed twice.
        if (!annotation.reference) {
            return;
        }

        const { xpath, selectedText } = <textSelection>annotation.reference;
        let nodeReference = this.getNodeReferenceByXpath(this._pdfBehaviour.iframeDocument, xpath);
        let remainingTextLength = selectedText.length;

        this.sendDebugMessage('Annotations remove color: removing colors from initial reference.', nodeReference);

        // Continue coloring until we break out of no references are left.
        while(nodeReference)
        {
            // Remove the font tags and put the inner text of them back.
            const fontTagChildren = nodeReference.childNodes;
            const leftElement = fontTagChildren[0];
            const middleElement = fontTagChildren[1];
            const rightElement = fontTagChildren[2];

            this.sendDebugMessage('Annotations remove color: using child elements.', [ leftElement, middleElement, rightElement ]);

            // Reduce the amount of text that has been reverted.
            // The middle element will always have the text that was supposed to be colored.
            remainingTextLength -= middleElement.textContent?.length || 0;

            nodeReference.removeChild(leftElement);
            nodeReference.removeChild(middleElement);
            nodeReference.removeChild(rightElement);

            nodeReference.textContent = leftElement.textContent || '' + middleElement.textContent || '' + rightElement.textContent || '';

            this.sendDebugMessage('Annotations remove color: remaining text length', remainingTextLength);
            if (remainingTextLength == 0)
            {
                break;
            }

            // Structured PDFs have "markedContent" wrappers.
            // If these are encountered, we must get the next sibling with an extra step.
            if (nodeReference.parentElement?.classList.contains('markedContent')) {

                // Marked content can have multiple spans
                if (nodeReference.nextSibling) {
                    nodeReference = nodeReference.nextSibling;
                    continue;
                }

                if (!nodeReference.parentElement.nextSibling) {
                    nodeReference = null;
                    continue;
                }
                
                let nextNode: ChildNode | null = null;
                let lastCheckedNode = nodeReference;
                while(!nextNode) {
                    if (!lastCheckedNode.parentElement?.nextSibling) {
                        break;
                    }

                    nextNode = (Array.from(lastCheckedNode.parentElement.nextSibling.childNodes).filter(x => x.nodeName === 'SPAN'))[0];
                    if (!nextNode) {
                        lastCheckedNode = lastCheckedNode.parentElement.nextSibling;
                    }
                }
                
                nodeReference = nextNode as ChildNode | null;
                continue;
            }

            // Proceed with next sibling
            nodeReference = nodeReference.nextSibling;
            this.sendDebugMessage('Annotations remove color: node reference', nodeReference);
        }
    }

    getPdfPageXpathBySelection(selection: Selection, page: number)
    {
        const xpathBase = this.getXpathBySelection(selection);

        // Validate the xpath starts at a valid expected id.
        if (!xpathBase.startsWith('//*[@id="viewer"]') && !xpathBase.startsWith('//*[@id="page'))
        {
            return null;
        }

        // Generate the actual xpath. We manually create the actual xpath since the page element and text layer element need to be manually set to avoid bad behaviour.
        const parts = xpathBase.split("/");
        if (parts.length == 6)
        {
            parts[3] = `div[contains(@data-page-number, "${page}")]`;
            parts[4] = 'div[contains(@class, "textLayer")]';
        }

        if (parts.length != 4 && parts.length != 6) {
            throw Error(`Expected part length of 2/6, but received ${parts.length}.`);
        }

        return parts.join('/');
    }

    private getXpathBySelection(selection: Selection)
    {
        if (!selection.anchorNode || !selection.focusNode) {
            throw new Error(this._textSelectionInvalid);
        }

        let selectedElement = selection.anchorNode.parentNode;

        // We need to make sure what node comes earlier in the DOM tree. If we select backwards, we need to switch the nodes around.
        const anchorNodePosition = selection.anchorNode.compareDocumentPosition(selection.focusNode);
        if (anchorNodePosition & Node.DOCUMENT_POSITION_PRECEDING)
        {
            selectedElement = selection.focusNode.parentNode;
        }

        if (!selectedElement) {
            throw new Error(this._textSelectionInvalid);
        }
        
        return this.getXpathByNode(selectedElement);
    }

    private getXpathByNode(node: Node)
    {
        let xpath = '';
        let count = 0;
        let selectedElement: Node | null = node;
        while (selectedElement) {
            count = 0;

            // If the selected element contains an id, we can use it as a bade.
            if((selectedElement as HTMLElement)?.hasAttribute('id'))
            {
                const id = (selectedElement as HTMLElement).id;
                xpath = `//*[@id="${id}"]${xpath}`;
                break;
            }

            // While there is a valid sibling of the same tagname, add to the count to ensure we get the correct sibling.
            let sibling = selectedElement.previousSibling;
            while (sibling) {
                if (sibling.nodeType === 1 && sibling.nodeName === selectedElement.nodeName) {
                    count++;
                }
                sibling = sibling.previousSibling;
            }

            const tagName = selectedElement.nodeName.toLowerCase();
            xpath = `/${tagName}[${count + 1}]${xpath}`;
            selectedElement = selectedElement.parentNode;
        }

        // The document as the root is invalid. If it exists, it must be replaced.
        return xpath.replace("/#document[1]", "");
    }

    private colorAnnotationText(startNode: Node, selectedText: string, offset: number, color: string, id: string)
    {
        this.sendDebugMessage(`Annotations: start coloring ${id}...`);

        let currentNode: Node | null = startNode;
        let remainingTextLength = selectedText.length;

        // Continue coloring until we break out of no references are left.
        while(currentNode)
        {
            const innerText = currentNode.textContent || '';

            const textLengthToColor = Math.min(innerText.length - offset, remainingTextLength);
            const textStartOffset = offset;
            const textEndOffset = textLengthToColor + offset;

            // Get left part, middle part, right part.
            const textParts = [
                innerText.slice(0, textStartOffset),
                innerText.slice(textStartOffset, textStartOffset + textLengthToColor),
                innerText.slice(textEndOffset, innerText.length),
            ];

            const leftElement = document.createElement('font');
            const middleElement = document.createElement('font');
            const rightElement = document.createElement('font');
            
            leftElement.innerHTML = textParts[0];
            middleElement.innerHTML = textParts[1];
            rightElement.innerHTML = textParts[2];

            // Set unique style of the actual annotation part.
            // This part also sets the unique id used to set focus behaviour.
            middleElement.style.backgroundColor = color;
            middleElement.style.cursor = 'pointer';
            middleElement.setAttribute('data-annotation', id);

            currentNode.textContent = null;
            currentNode.appendChild(leftElement);
            currentNode.appendChild(middleElement);
            currentNode.appendChild(rightElement);

            // offset is 0 after the first one.
            offset = 0;

            // Check if everything is colored.
            remainingTextLength -= textLengthToColor;

            if (remainingTextLength == 0)
            {
                break;
            }

            // Structured PDFs have "markedContent" wrappers.
            // If these are encountered, we must get the next sibling with an extra step.
            if (currentNode.parentElement?.classList.contains('markedContent')) {

                // Marked content can have multiple spans
                if (currentNode.nextSibling) {
                    currentNode = currentNode.nextSibling;
                    continue;
                }

                if (!currentNode.parentElement.nextSibling) {
                    currentNode = null;
                    continue;
                }
                
                let nextNode: ChildNode | null = null;
                let lastCheckedNode = currentNode;
                while(!nextNode) {
                    if (!lastCheckedNode.parentElement?.nextSibling) {
                        break;
                    }

                    nextNode = (Array.from(lastCheckedNode.parentElement.nextSibling.childNodes).filter(x => x.nodeName === 'SPAN'))[0];
                    if (!nextNode) {
                        lastCheckedNode = lastCheckedNode.parentElement.nextSibling;
                    }
                }
                
                currentNode = nextNode as ChildNode | null;
                continue;
            }

            // Proceed with next sibling
            currentNode = currentNode.nextSibling;
        }

        this.sendDebugMessage(`Colored ${id}.`);
    }

    private getNodeReferenceByXpath(documentContext: Document, xpath: string)
    {
        return documentContext.evaluate(xpath, documentContext, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        /*|| new XPathEvaluator()
            .createExpression(xpath)
            .evaluate(documentContext, XPathResult.FIRST_ORDERED_NODE_TYPE)
            .singleNodeValue;*/
    }
    
    private sendDebugMessage(message?: unknown, ...optionalParams: unknown[])
    {
        if (!this._enableDebugLogging)
        {
            return;
        }

        console.log(`Annotation text writer - ${message}`, ...optionalParams);
    }
}