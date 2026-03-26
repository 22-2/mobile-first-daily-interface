import path from 'path';
import { defineConfig } from 'vitest/config';
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin"

export default defineConfig({
  plugins: [vanillaExtractPlugin()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx,js,jsx}'],
    exclude: ['node_modules/**', 'e2e/**'],
    alias: {
      "src": path.resolve(__dirname, './src'),
      'obsidian': path.resolve(__dirname, './src/__mocks__/obsidian.ts'),
    },
  },
});
