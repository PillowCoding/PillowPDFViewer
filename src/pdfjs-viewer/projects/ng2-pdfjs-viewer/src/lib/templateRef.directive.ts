import { Directive, Input, TemplateRef } from "@angular/core";

@Directive({ selector: '[templateRef]' })
export class templateRefDirective
{
    @Input('templateRef') type?: string;
    constructor(public template: TemplateRef<any>) {}
}