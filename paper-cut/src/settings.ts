// Paper Cut の設定型
// MVP では固定ノートのパスのみを管理する。MFDI の Settings とは独立した型。
export interface PaperCutSettings {
  fixedNotePath: string | null;
}

export const DEFAULT_PAPER_CUT_SETTINGS: PaperCutSettings = {
  fixedNotePath: null,
};
