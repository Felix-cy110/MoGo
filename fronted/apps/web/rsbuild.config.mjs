import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: {
      index: './src/main.jsx'
    }
  },
  html: {
    title: 'MoGo',
    meta: { description: 'MoGo' }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': process.env.MOGO_API_TARGET || 'http://localhost:8080'
    }
  }
});
