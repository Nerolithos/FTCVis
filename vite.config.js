import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Avoid stale pre-bundle cache issues after switching PPTX -> PDF playback runtime.
    exclude: ['pdfjs-dist'],
  },
});
