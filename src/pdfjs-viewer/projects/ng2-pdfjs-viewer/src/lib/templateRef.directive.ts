import { Directive, Input, TemplateRef } from "@angular/core";

@Directive({ selector: '[libTemplateRef]' })
export class templateRefDirective
{
    @Input('libTemplateRef') type?: string;
    constructor(public template: TemplateRef<unknown>) {}
}