import { createGlobalTheme } from "@vanilla-extract/css";

// このファイルはステップ1: ChakraのデザイントークンをVanilla-Extractのグローバル変数に移植するために作成しました。
// 意図: 既存のChakraベースの色・スペーシング・タイポグラフィなどを一箇所にまとめ、
//       後続のSprinkles/recipesの基盤として再利用可能にする。

export const vars = createGlobalTheme(":root", {});
