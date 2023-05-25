import { Component, Input } from "@angular/core";

@Component({
    selector: 'lib-initials-avatar',
    template: `
        <div class="avatar text"
            [style.width.px]="size"
            [style.height.px]="size"
            [style.line-height.px]="size"
            [style.font-size.px]="size/2">
            {{initials}}
        </div>
    `,
    styles: [`
        .avatar {
            display: inline-block;
            border-radius: 50%;
            border: 2px solid rgba(0, 0, 0, 0.2);
            background-color: rgba(0, 0, 0, 0.05);
            text-align: center;
        }
    `],
    styleUrls: ['./../common.scss']
})
export class InitialsAvatarComponent {
    
    @Input() input?: string;
    @Input() size = 24;
    
    private _initials?: string;
    public get initials() {

        this.assertParametersSet();
        if (!this._initials) {
            this._initials = this.getInitials(this.input);
        }

        return this._initials;
    }

    private getInitials(input: string) {
        const matches = input.split(' ').map(i => i.charAt(0));
        return matches.slice(0, 2).join('');
    }

    private assertParametersSet(): asserts this is this & {
        input: string;
    } {
        const missingParameters = [];
        if (!this.input) { missingParameters.push('input'); }
        if (missingParameters.length > 0) {
            throw new Error(`Please provide a value for the parameters: ${missingParameters.join(', ')}`);
        }
    }
}