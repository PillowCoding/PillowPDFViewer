export interface DownloadManager {
    downloadUrl: (url: string, filename: string) => void;
    downloadData: (data: Uint8Array, filename: string, contentType: string) => void;
    openOrDownloadData: (element: HTMLElement, data: Uint8Array, filename: string) => boolean;
    download: (blob: Blob, url: string, filename: string) => void;
}
