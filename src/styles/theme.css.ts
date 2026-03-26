import { createGlobalTheme } from "@vanilla-extract/css";

// このファイルはステップ1: ChakraのデザイントークンをVanilla-Extractのグローバル変数に移植するために作成しました。
// 意図: 既存のChakraベースの色・スペーシング・タイポグラフィなどを一箇所にまとめ、
//       後続のSprinkles/recipesの基盤として再利用可能にする。

export const vars = createGlobalTheme(":root", {
	space: {
		px: '1px',
		'0': '0px',
		'1': '0.25rem',
		'2': '0.5rem',
		'3': '0.75rem',
		'4': '1rem',
		'6': '1.5rem',
		'8': '2rem'
	},
	fontSize: {
		xs: '0.75rem',
		sm: '0.875rem',
		md: '1rem',
		lg: '1.125rem'
	},
	radii: {
		sm: '0.125rem',
		md: '0.25rem',
		full: '9999px'
	},
	sizes: {
		container: '64rem'
	},
	mfdi: {
		iconSizeSmall: 'var(--icon-m)',
		iconSizeMedium: 'var(--size-4-6)',
		iconSizeLarge: 'var(--size-4-10)',
		iconSizeXxlarge: 'calc(var(--size-4-4) * 4)',
		iconPadding: 'var(--size-4-1)',
		iconRadius: 'var(--size-4-1)',
		dateInputWidthDefault: 'calc(var(--size-4-4) * 10)',
		dateInputWidthYear: 'calc(var(--size-4-1) * 26)',
		buttonMinHeight: 'var(--size-4-8)',
		controlHeight: 'var(--size-4-7)',
		faviconSize: 'var(--size-4-5)',
		lineHeight1: 'var(--size-4-4)',
		letterSpacingTight: '0.8px',
		badgeFontSize: '11px',
		badgePaddingX: 'var(--size-2-3)'
	}
});
