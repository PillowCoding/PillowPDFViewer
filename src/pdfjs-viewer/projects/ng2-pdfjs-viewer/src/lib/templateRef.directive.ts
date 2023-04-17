import { Directive, Input, TemplateRef } from "@angular/core";

/**
 * The directive allows for referencing templates used in the viewer.
 */
@Directive({ selector: '[libTemplateRef]' })
export class templateRefDirective
{
    @Input('libTemplateRef') type?: string;
    constructor(public template: TemplateRef<unknown>) {}
}