export class pdfContext
{
    constructor(
        public readonly title: string,
        public readonly url: string,
        public readonly blobUrl: string,
        public readonly data: Blob | null)
    {
    }
}