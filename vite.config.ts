
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'fs';

// Generate build version for cache busting
const buildVersion = Date.now().toString();
const semanticVersion = `1.0.${Math.floor(Date.now() / 1000)}`;

// Update app-version.json with current build info
const updateAppVersion = () => {
  const versionInfo = {
    version: semanticVersion,
    buildTime: new Date().toISOString(),
    twaCompatible: true
  };
  
  try {
    fs.writeFileSync('public/app-version.json', JSON.stringify(versionInfo, null, 2));
    fs.writeFileSync('public/build-version.txt', semanticVersion);
    console.log('📱 Updated version files:', semanticVersion);
  } catch (error) {
    console.warn('⚠️ Could not update version files:', error);
  }
};

updateAppVersion();

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false, // We'll handle registration manually
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
      manifest: false, // Use our own manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,txt}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
        mode: 'production',
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        sourcemap: false,
        swDest: `sw-${buildVersion}.js`, // Version the SW file to bypass cache
        // Aggressive cache cleanup and reset strategy
        additionalManifestEntries: [
          { url: '/', revision: buildVersion },
          { url: '/manifest.json', revision: buildVersion }
        ],
        // Network-first strategy for critical resources
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          },
          {
            urlPattern: /^https:\/\/openrouter\.ai\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'openrouter-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/.*/i,
            handler: 'NetworkOnly'
          },
          // Network-first for app resources to prevent stale cache issues
          {
            urlPattern: /\.(js|css|html)$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: `app-resources-${buildVersion}`,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7
              }
            }
          }
        ]
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
  publicDir: 'public',
  build: {
    rollupOptions: {
      output: {
        // Consistent naming for assets to prevent cache mismatches
        assetFileNames: `assets/[name]-${buildVersion}[extname]`,
        chunkFileNames: `assets/[name]-${buildVersion}.js`,
        entryFileNames: `assets/[name]-${buildVersion}.js`
      }
    }
  }
}));
