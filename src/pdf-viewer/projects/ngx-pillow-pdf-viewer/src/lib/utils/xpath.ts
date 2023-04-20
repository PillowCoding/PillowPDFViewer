export function getElementXpath(element: HTMLElement, expectId?: string) {
    let xpath = '';
    let selectedElement: HTMLElement | null = element;
    while (selectedElement) {
        let count = 0;

        // If the selected element contains an id, we can use it as a base for the xpath.
        if(selectedElement.hasAttribute('id'))
        {
            const id = selectedElement.id;

            // Skip if this is not the expected id.
            if (!expectId || id === expectId) {
                xpath = `//*[@id="${id}"]${xpath}`;
                break;
            }
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
        selectedElement = selectedElement.parentElement;
    }

    // The document as the root is invalid. If it exists, it must be replaced.
    return xpath.replace("/#document[1]", "");
}