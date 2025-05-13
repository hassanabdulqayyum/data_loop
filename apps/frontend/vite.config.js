// vite.config.js – tells Vite how to build & serve our React app
// We load the official React plugin so Vite understands JSX.
// Everything is written in plain English comments for future readers.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `defineConfig` just gives us nice typing & auto-complete.
export default defineConfig({
  plugins: [react()],
  // By default Vite serves on http://localhost:5173 but you can
  // change the port with `vite --port 3000` if needed.
  server: {
    open: true // Opens the browser automatically when you run `npm run dev`.
  },
  build: {
    outDir: 'dist', // Where the production files end up after `npm run build`.
    emptyOutDir: true // Clean the folder first so old files don't linger.
  }
}); 