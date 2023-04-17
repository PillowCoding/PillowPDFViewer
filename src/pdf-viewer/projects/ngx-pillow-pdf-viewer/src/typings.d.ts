// Declared in order to add support for Json modules used in the translator.
declare module '*.json' {
    const value: unknown;
    export default value;
}