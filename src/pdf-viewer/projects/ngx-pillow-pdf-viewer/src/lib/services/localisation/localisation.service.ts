import { Inject, Injectable, Optional } from '@angular/core';
import { LocalisationConfiguration } from './localisationConfiguration';
import nl from './languages/nl.json';
import en from './languages/en.json';

@Injectable({
providedIn: 'root'
})
export class LocalisationService
{
    private readonly defaultLocalisationLanguage = 'en';

    private readonly localisationLanguage: string;
    private readonly localisationTemplates: {[key: string]: {[key: string]: string}} = {
        'nl': nl,
        'en': en
    }

    private localisation?: {[key: string]: string};

    constructor(
        @Inject('configuration') @Optional() private configuration?: LocalisationConfiguration)
    {
        let languageToUse = configuration?.localisationToUse || this.defaultLocalisationLanguage;
        if (!this.localisationTemplates[languageToUse]) {
        console.warn(`'${languageToUse}' is not a valid supported language. Switching to ${this.defaultLocalisationLanguage}...`);
        languageToUse = this.defaultLocalisationLanguage;
        }

        this.localisationLanguage = languageToUse;
        this.localisation = this.localisationTemplates[languageToUse];
    }

    public Translate(key: string, args?: string[])
    {
        if (!this.localisation) {
            console.warn(`Localisation has not loaded.`);
            return key;
        }

        if (!this.localisation[key]) {
            console.warn(`No translation was found for '${key}'. Language used: ${this.localisationLanguage}.`);
            return key;
        }

        // Simulated C#'s `String.Format` method.
        const StringFormat = (str: string, ...args: string[]) => str.replace(/{(\d+)}/g, (match, index) => args[index] || '');

        // Translate
        const translation = this.localisation[key];
        return StringFormat(translation, ...args || []);
    }
}
