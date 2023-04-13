import { boundingBox, vector2 } from "ng2-pdfjs-viewer/pdf-annotation";
import { pdfAnnotationDrawer } from "ng2-pdfjs-viewer/pdf-annotation-drawer";
import { pdfBehaviour } from "ng2-pdfjs-viewer/pdf-behaviour";
import { Subject } from "rxjs";

export class defaultPdfAnnotationDrawer implements pdfAnnotationDrawer
{
    private readonly _drawLayer2dContextNotFound = 'Draw layer 2d context was not found.';

    onClickDrawLayer = new Subject<MouseEvent>();
    boundingBoxCreated = new Subject<{ bounds: boundingBox, page: number }>();

    private _enableDebugLogging = false;
    public set enableDebugLogging(val: boolean) { this._enableDebugLogging = val; }

    private readonly _layerBaseClass = 'annotationDrawLayer';
    private readonly _canvasBaseClass = 'annotationDrawCanvas';
    private readonly _pendingCanvasBaseClass = 'pendingCanvas';
    private readonly _actualCanvasBaseClass = 'actualCanvas';
    private readonly _annotationDrawLayerInstances: { page: number, layerElement: HTMLDivElement }[] = [];
    private _layerEnabled = false;
    private _canvasElementBase?: HTMLCanvasElement;
    private _pendingAnnotationBoundingBoxStart?: vector2;
    private _pendingAnnotationPage?: number;

    constructor(
        private readonly _pdfBehaviour: pdfBehaviour)
    {
        this._pdfBehaviour.onIframeMouseMove.subscribe((e) => this.onMouseMove(e));
        this._pdfBehaviour.onTextLayerRendered.subscribe(() => this.onTextLayerRendered());
    }

    private onTextLayerRendered()
    {
        this.setDrawLayer();
        this.setDrawCanvasses();
    }

    enableLayer()
    {
        this._annotationDrawLayerInstances.forEach(x =>
        {
            x.layerElement.style.pointerEvents = '';
        });

        this._layerEnabled = true;
    }

    disableLayer()
    {
        this._annotationDrawLayerInstances.forEach(x => 
        {
            x.layerElement.style.pointerEvents = 'none';
        });

        // Fail safe to ensure there's no more pending annotations
        if (this._pendingAnnotationBoundingBoxStart || this._pendingAnnotationPage)
        {
            if (!this._pendingAnnotationBoundingBoxStart || !this._pendingAnnotationPage) {
                throw new Error('Expected pending annotation bounds and page to exist.');
            }

            this.clearCanvas(this._pendingAnnotationPage, true);
            delete(this._pendingAnnotationPage);
            delete(this._pendingAnnotationBoundingBoxStart);
        }

        this._layerEnabled = false;
    }

    drawRectangle(bounds: boundingBox, page: number, color: string, borderWidth: number, pending: boolean)
    {
        if (!color.startsWith('#'))
        {
            throw new Error('The color to draw a rectangle with must be a valid hex code.');
        }

        // Get the canvas. It is possible the page is not rendered, in which case the canvas does not exist.
        const canvas = this.getCanvasOrNull(page, pending);
        if (!canvas)
        {
            return;
        }

        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error(this._drawLayer2dContextNotFound);
        }

        // Determine x and y position, and the width and height of the rectangle.
        // The value is a percentage, and therefore we must multiply the result with the canvas resolution.
        // This way we can support any size.
        const x = bounds.start.x * canvas.width;
        const y = bounds.start.y * canvas.height;
        const width = (bounds.end.x - bounds.start.x) * canvas.width;
        const height = (bounds.end.y - bounds.start.y) * canvas.height;
        const borderColor = color;
        const fillColor = color + this.getOpacityHex(.1);

        // Draw the outline of the rectangle
        context.fillStyle = fillColor;
        context.strokeStyle = borderColor;
        context.lineWidth = borderWidth;

        context.fillRect(x, y, width, height);
        context.strokeRect(x, y, width, height);
    }

    clearCanvas(page: number, pending: boolean)
    {
        const canvas = this.getCanvas(page, pending);
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error(this._drawLayer2dContextNotFound);
        }

        context.clearRect(0, 0, canvas.width, canvas.height);
    }

    canvasRendered(page: number)
    {
        return this.getCanvasOrNull(page, false) != null && this.getCanvasOrNull(page, true) != null;
    }

    private getOpacityHex(opacity: number)
    {
        const clamp = (val: number, min: number, max: number) => { return Math.min(Math.max(val, min), max); }
        return Math.round(clamp(opacity, 0, 1) * 255)
            .toString(16).toUpperCase();
    }

    private getCanvas(page: number, pending: boolean)
    {
        const canvas = this.getCanvasOrNull(page, pending);

        if (!canvas)
        {
            throw new Error(`Canvas (pending: ${pending}) was not found for page ${page}.`);
        }

        return canvas;
    }

    private getCanvasOrNull(page: number, pending: boolean)
    {
        const pageElement = this._pdfBehaviour.getPageParent(page);
        const canvasClass = pending ? this._pendingCanvasBaseClass : this._actualCanvasBaseClass;
        const canvas = pageElement.querySelector(`.canvasWrapper > .${canvasClass}`) as HTMLCanvasElement;

        if (!canvas)
        {
            return null;
        }

        return canvas;
    }

    private onMouseMove(event: MouseEvent)
    {
        // Check if we have a pending coordinate.
        if (!this._pendingAnnotationBoundingBoxStart)
        {
            return;
        }

        // Check if we are on the correct page.
        const layer = event.target as HTMLDivElement;
        const pageAttribute = layer?.parentElement?.getAttribute(this._pdfBehaviour.pageParentPageAttribute);
        if (!pageAttribute)
        {
            return;
        }

        if (Number(pageAttribute) !== this._pendingAnnotationPage)
        {
            return;
        }

        this.clearCanvas(this._pendingAnnotationPage, true);
        const position = this.getPositionRelativeToDiv(event, layer);
        const bounds: boundingBox = { start: this._pendingAnnotationBoundingBoxStart, end: position };
        this.drawRectangle(bounds, this._pendingAnnotationPage, '#808080', 2, true);
    }

    private getPositionRelativeToDiv(event: MouseEvent, divElement: HTMLDivElement): vector2
    {
        const rect = divElement.getBoundingClientRect();
        return {
            x: (event.clientX - rect.left) / rect.width,
            y: (event.clientY - rect.top)  / rect.height
        };
    }

    private setDrawLayer()
    {
        // Add the annotation draw layers
        // TODO: Make this better.
        const annotateDrawLayerElement = document.createElement('div');
        annotateDrawLayerElement.classList.add('annotationDrawLayer');
        annotateDrawLayerElement.style.width = 'calc(var(--scale-factor) * 612px)';
        annotateDrawLayerElement.style.height = 'calc(var(--scale-factor) * 792px)';
        annotateDrawLayerElement.style.pointerEvents = this._layerEnabled ? '' : 'none';
        annotateDrawLayerElement.style.cursor = 'pointer';
        annotateDrawLayerElement.style.position = 'absolute';
        annotateDrawLayerElement.style.top = '0';
        annotateDrawLayerElement.style.left = '0';
        annotateDrawLayerElement.style.transformOrigin = '0 0';
        annotateDrawLayerElement.style.zIndex = '5';

        this._pdfBehaviour
            .getRenderedPages()
            .forEach(x =>
            {
                const page = this._pdfBehaviour.getPageNumberFromParent(x);

                // Verify there is not an existing layer.
                if (x.querySelector(`.${this._layerBaseClass}`))
                {
                    return;
                }

                this.sendDebugMessage(`Adding annotation draw layer for ${page}...`);

                // Check for existing layer instance.
                const layerInstance = this._annotationDrawLayerInstances.find(x => x.page == page);
                if (layerInstance)
                {
                    x.insertAdjacentElement('beforeend', layerInstance.layerElement);
                    return;
                }

                const layerElement = annotateDrawLayerElement.cloneNode(true) as HTMLDivElement;
                layerElement.onmousedown = (event: MouseEvent) => this.onClickDrawLayerEvent(true, event);
                layerElement.onmouseup = (event: MouseEvent) => this.onClickDrawLayerEvent(false, event);

                x.insertAdjacentElement('beforeend', layerElement);
                this._annotationDrawLayerInstances.push({ page, layerElement });
            });
    }

    /**
     * Invoked when a draw layer has been pressed.
     * @param mouseDown A boolean determing if the trigger event was mouseDown. If false, the click was triggered by mouseUp.
     * @param event The event data of the mouse.
     */
    private onClickDrawLayerEvent(mouseDown: boolean, event: MouseEvent)
    {
        const pageParent = (event.target as Element).closest('.page') as HTMLDivElement;
        const page = this._pdfBehaviour.getPageNumberFromParent(pageParent);

        // Ensure that bounds do not exceed to a different page
        if (this._pendingAnnotationPage && this._pendingAnnotationPage !== page)
        {
            return;
        }

        // Check if we draw the initial bounds point and not the end.
        const drawAsStart = !this._pendingAnnotationPage || !this._pendingAnnotationBoundingBoxStart;

        // Check if the start press is mouse down.
        if (drawAsStart && !mouseDown)
        {
            return;
        }

        const layer = pageParent.querySelector('.annotationDrawLayer');
        if (!layer) {
            throw new Error('layer not found.');
        }
        const position = this.getPositionRelativeToDiv(event, layer as HTMLDivElement);

        if (drawAsStart)
        {
            this.sendDebugMessage(`Drawing start position ${position.x}, ${position.y} for page ${page}.`);
            this._pendingAnnotationBoundingBoxStart = position;
            this._pendingAnnotationPage = page;
            return;
        }

        // Ensure the variables are set properly
        if (!this._pendingAnnotationPage || !this._pendingAnnotationBoundingBoxStart) {
            throw new Error('Expected pending annotation page and pending annotation start bounds to both be set.');
        }

        // Check if the end press is mouse up.
        if (mouseDown)
        {
            return;
        }

        const bounds: boundingBox = {
            start: this._pendingAnnotationBoundingBoxStart,
            end: position,
        }

        this.clearCanvas(this._pendingAnnotationPage, true);
        delete(this._pendingAnnotationPage);
        delete(this._pendingAnnotationBoundingBoxStart);

        this.sendDebugMessage('Bounding box created.', bounds);
        this.boundingBoxCreated.next({ bounds, page });
    }

    /**
     * Sets the canvasses that are used to draw placeholder, pending and actual annotations.
     */
    private setDrawCanvasses()
    {
        if (!this._canvasElementBase)
        {
            this.sendDebugMessage('Creating base draw canvas...');
            const canvasElementBase = document.createElement('canvas');

            // Set canvas role (must be `any` because role is not standard with a canvas, apparently.)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (<any>canvasElementBase).role = 'presentation';
            canvasElementBase.classList.add(this._canvasBaseClass);

            this._canvasElementBase = canvasElementBase;
        }

        this._pdfBehaviour.getRenderedPages()
            .forEach(x => {
                const wrapper = this.getCanvasParentFromPageParent(x);

                // Ensure we don't add another canvas.
                const existingCanvasses = x.querySelectorAll(`.${this._canvasBaseClass}`);
                if (existingCanvasses.length > 0)
                {
                    existingCanvasses.forEach(x => this.scalePageElement(x as HTMLCanvasElement));
                    return;
                }

                const pageNumber = this._pdfBehaviour.getPageNumberFromParent(x);
                this.sendDebugMessage(`Creating new draw canvasses for page ${pageNumber}...`);
                
                const createCanvasElement = (layerName: string, zIndex: number) => {

                    // Despite is being impossible, this check needs to exist _should_ the base somehow disappear again.
                    if (this._canvasElementBase == undefined) {
                        throw new Error('Espected the canvas base to exist.');
                    }

                    const element = wrapper.insertAdjacentElement('beforeend', this._canvasElementBase.cloneNode(true) as HTMLCanvasElement) as HTMLCanvasElement;
                    element.classList.add(layerName);
                    element.style.position = 'absolute';
                    element.style.pointerEvents = 'none';
                    element.style.zIndex = `${zIndex}`;
                    element.style.left = '0';
                    element.style.top = '0';
                    return element;
                }

                const pendingLayerElement = createCanvasElement(this._pendingCanvasBaseClass, 1);
                this.scalePageElement(pendingLayerElement);

                const actualLayerElement = createCanvasElement(this._actualCanvasBaseClass, 2);
                this.scalePageElement(actualLayerElement);

                // Proceed to scale the width and height of the draw layer.
                const page = this._pdfBehaviour.getPageNumberFromParent(x);
                const pageDrawLayer = this._annotationDrawLayerInstances.filter(y => y.page === page)[0]?.layerElement;
                if (!pageDrawLayer) {
                    throw new Error('Could not find the page draw layer.');
                }
                this.scalePageElement(pageDrawLayer);
            })
    }

    private scalePageElement(element: HTMLElement | HTMLCanvasElement)
    {
        // Try to find a reference element that has the height and width we want to sync with.
        const reference = element.closest('.canvasWrapper') || element.querySelector('.textLayer') || element.closest('.page')?.querySelector('.canvasWrapper');
        if (!reference) {
            console.error(element);
            throw new Error('Could not find a reference whilst scaling the element.');
        }

        element.style.width = `${reference.clientWidth}px`;
        element.style.height = `${reference.clientHeight}px`;

        if (element instanceof HTMLCanvasElement) {
            element.width = reference.clientWidth;
            element.height = reference.clientHeight;
        }
    }

    private getCanvasParentFromPageParent(parent: HTMLDivElement)
    {
        const canvasParent = parent.querySelector('.canvasWrapper') as HTMLDivElement | null;

        // Check if rendered.
        if (!canvasParent)
        {
            throw new Error('Canvas wrapper not found.');
        }

        return canvasParent;
    }
    
    private sendDebugMessage(message?: unknown, ...optionalParams: unknown[])
    {
        if (!this._enableDebugLogging)
        {
            return;
        }

        console.log(`Annotation drawer - ${message}`, ...optionalParams);
    }
}