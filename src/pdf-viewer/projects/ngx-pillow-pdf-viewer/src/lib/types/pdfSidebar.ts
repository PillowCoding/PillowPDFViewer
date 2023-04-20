export type pageModeType = /* 'unknown' | */'none' | 'thumbs' | 'outline' | 'attachments' | 'layers';

export const pageModeTranslations: { [key in pageModeType] : number; } = {
    'none': 0,
    'thumbs': 1,
    'outline': 2,
    'attachments': 3,
    'layers': 4
};

export interface PDFSidebar {
    open: () => void;
    close: () => void;
    toggle: () => void;
    switchView: (view: number, forceOpen?: boolean) => void;
}