
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

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
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,txt}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        // Import background sync handlers
        importScripts: ['/sw-background-sync.js'],
        // Simplified caching strategy to reduce memory usage
        runtimeCaching: [
          {
            urlPattern: /\.(?:js|css)$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: `assets-${buildVersion}`,
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 // 1 day
              },
              networkTimeoutSeconds: 5
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: `images-${buildVersion}`,
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 3 // 3 days
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/.*/i,
            handler: 'NetworkOnly'
          }
        ]
      },
      includeAssets: [
        'favicon-16x16.png',
        'favicon-32x32.png', 
        'favicon-48x48.png',
        'favicon-96x96.png',
        'favicon-192x192.png',
        'favicon-512x512.png',
        'apple-touch-icon.png',
        'placeholder.png',
        'pwa-192x192-maskable.png',
        'pwa-512x512-maskable.png'
      ],
      manifest: false,
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
