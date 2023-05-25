export class LocalisationConfiguration
{
    public readonly localisationToUse?: string;

    public constructor(init?: Partial<LocalisationConfiguration>) {
        Object.assign(this, init);
    }
}