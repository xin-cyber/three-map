import { defineConfig } from 'vite';
import VitePluginFullReload from 'vite-plugin-full-reload';

export default defineConfig({
  plugins: [
    VitePluginFullReload(['**/*.html'], { log: false }),
  ]
});
