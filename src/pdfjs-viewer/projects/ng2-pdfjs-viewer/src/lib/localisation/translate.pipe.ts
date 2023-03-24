import { Pipe, PipeTransform } from '@angular/core';
import { LocalisationService } from './localisation.service';

@Pipe({
	name: 'translate'
})
export class TranslatePipe implements PipeTransform
{
    constructor(
        private localisationService: LocalisationService)
    {
    }

	transform(key: string, ...args: string[])
	{
		return this.localisationService.Translate(key, args);
	}
}
