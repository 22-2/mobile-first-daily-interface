
export const FULL_EXPANSION_STYLE = `
  /* タイトルバー非表示 */
  .titlebar,
  .workspace-tab-header-container {
    display: none;
  }

  .main-content {
    margin: 0 var(--size-4-2);
  }

  /* 上部バーを畳む。 */
  [data-type="mfdi-view"]:has(.mfdi-input-area.mod-expanded) .view-header {
    display: none;
  }

  /* コンテンツのパディングをリセット */
  [data-type="mfdi-view"]:has(.mfdi-input-area.mod-expanded) .view-content {
    padding: 0!important;
  }

  .mfdi-input-area {
    margin-right: 0!important;
  }

  [data-type="mfdi-view"] .mfdi-input-area.mod-expanded .cm-scroller {
    height: calc(100dvh - 123px) !important;
  }
`;

export const DEFAULT_EXPANSION_STYLE = `
  [data-type="mfdi-view"] .mfdi-input-area.mod-expanded .cm-scroller {
    height: calc(100dvh - 220px) !important;
  }
`;
