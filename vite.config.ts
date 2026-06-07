import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** TrustedWaiver-style paths; each folder has its own index.html for GitHub Pages. */
const WAIVER_HTML_PATHS = [
  'sahelieyebrow/waiver-from-centennial-location',
  'sahelieyebrow/waiver-from-aurora-location',
  'sahelieyebrow/waiver-from-thornton-location',
  'sahelieyebrow/waiver-from-denver-location',
  'sahelieyebrow/waiver-from-parker-location',
] as const;

function buildRollupInput(): Record<string, string> {
  const input: Record<string, string> = {
    main: path.resolve(__dirname, 'index.html'),
  };
  for (const rel of WAIVER_HTML_PATHS) {
    const key = rel.replace(/\//g, '-');
    input[key] = path.resolve(__dirname, rel, 'index.html');
  }
  return input;
}

export default defineConfig(() => {
  const base =
    (process.env.VITE_BASE_URL && process.env.VITE_BASE_URL.trim()) || '/';
  return {
    base,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: buildRollupInput(),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
