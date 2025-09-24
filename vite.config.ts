
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'fs';

// Generate build version for cache busting
const buildVersion = Date.now().toString();

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    // Completely disable VitePWA to prevent manifest interference
    VitePWA({
      registerType: 'autoUpdate',
      // Completely disable manifest generation
      manifest: false,
      injectManifest: {
        injectionPoint: undefined
      },
      // Disable all manifest-related features
      useCredentials: false,
      // Minimal workbox config - only handle caching, no manifest
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/, /\/manifest\.json$/],
        cleanupOutdatedCaches: true,
        // Exclude manifest from service worker handling
        globIgnores: ['**/manifest.json', '**/manifest.webmanifest']
      },
      devOptions: {
        enabled: false
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Consistent naming for Android compatibility
        assetFileNames: (assetInfo) => {
          if (!assetInfo.name) return `assets/[name]-[hash][extname]`;
          
          const info = assetInfo.name.split('.');
          const extType = info[info.length - 1];
          if (/\.(css)$/.test(assetInfo.name)) {
            return `assets/[name]-[hash].css`;
          }
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js'
      }
    },
    // Ensure proper minification and optimization for Android
    minify: 'terser',
    sourcemap: false,
    chunkSizeWarningLimit: 800, // Reduced for mobile
    target: ['es2015', 'edge18', 'firefox60', 'chrome61', 'safari11'] // Better Android support
  }
}));
