export const normalizePath = (p: string) => p;
export class TFile {
    basename: string;
    extension: string;
    path: string;
}
export class TFolder {}
export const Vault = {
    recurseChildren: (folder: any, callback: any) => {},
};
