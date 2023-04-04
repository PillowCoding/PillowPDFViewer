import { Directive, Input, TemplateRef } from "@angular/core";

@Directive({ selector: '[libTemplateRef]' })
export class templateRefDirective
{
    // eslint-disable-next-line @angular-eslint/no-input-rename
    @Input('libTemplateRef') type?: string;
    constructor(public template: TemplateRef<unknown>) {}
}