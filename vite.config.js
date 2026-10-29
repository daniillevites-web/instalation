import { defineConfig } from 'vite';

// Keep the build portable: GitHub Pages may serve it under /instalation/dist/.
export default defineConfig({ base: './' });
