import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(new URL('.', import.meta.url)));
const repoEnvDir = path.resolve(__dirname, '..', '..');

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, repoEnvDir, ''), ...(globalThis.process?.env ?? {}) };
  const defaultUserEmail = env.VITE_USER_EMAIL || env.EXPLORER_DEFAULT_USER_EMAIL || '';
  const defaultUsername = env.VITE_USERNAME || env.EXPLORER_DEFAULT_USERNAME || '';

  return {
    plugins: [react()],
    envDir: repoEnvDir,
    define: {
      'import.meta.env.VITE_USER_EMAIL': JSON.stringify(defaultUserEmail),
      'import.meta.env.VITE_USERNAME': JSON.stringify(defaultUsername),
    },
  };
});
