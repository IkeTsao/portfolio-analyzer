import { defineConfig } from 'vite';
import { jsxLocPlugin } from '@builder.io/vite-plugin-jsx-loc';

export default defineConfig({
  plugins: [jsxLocPlugin()],
});