import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/vitest.setup.ts'],
    alias: {
      "src": path.resolve(__dirname, './src'),
      'obsidian': path.resolve(__dirname, './src/__mocks__/obsidian.ts'),
    },
  },
});
