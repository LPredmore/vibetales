
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// Generate build version for cache busting
const buildVersion = Date.now().toString();

// https://vitejs.dev/config/
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
      injectRegister: 'script',
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
      manifest: {
        id: '/',
        name: 'StoryBridge - Story Generator',
        short_name: 'StoryBridge',
        description: 'Create magical stories for young readers with sight words practice',
        lang: 'en',
        dir: 'ltr',
        theme_color: '#8B5CF6',
        background_color: '#F3E8FF',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone'],
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['education', 'books', 'kids'],
        prefer_related_applications: false,
        iarc_rating_id: 'e84b072d-71de-4af2-8a98-7e7db97db7d7',
        launch_handler: {
          client_mode: 'navigate-existing'
        },
        // Simplified manifest - removed experimental features
        screenshots: [
          {
            src: '/pwa-512x512.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'StoryBridge mobile view'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '1920x1080',
            type: 'image/png',
            form_factor: 'wide',
            label: 'StoryBridge desktop view'
          }
        ],
        // Simplified - removed advanced features
        icons: [
          { src: 'favicon-16x16.png', sizes: '16x16', type: 'image/png' },
          { src: 'favicon-32x32.png', sizes: '32x32', type: 'image/png' },
          { src: 'favicon-48x48.png', sizes: '48x48', type: 'image/png' },
          { src: 'favicon-96x96.png', sizes: '96x96', type: 'image/png' },
          { src: 'favicon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'favicon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-192x192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'pwa-512x512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' }
        ],
        shortcuts: [
          {
            name: 'Create Story',
            short_name: 'Create',
            description: 'Create a new story',
            url: '/',
            icons: [
              {
                src: 'pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png'
              }
            ]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/, /\/auth/],
        mode: 'production',
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
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
                maxAgeSeconds: 60 * 60 * 24 // 1 day
              }
            }
          },
          // CRITICAL: Never cache Supabase auth endpoints
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/.*/i,
            handler: 'NetworkOnly'
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/auth\/.*/i,
            handler: 'NetworkOnly'
          }
        ],
        cleanupOutdatedCaches: true,
        sourcemap: true,
        // Add build version for cache busting
        swDest: 'sw.js',
        additionalManifestEntries: [
          { url: '/build-version.txt', revision: buildVersion }
        ]
      },
      // Enable periodic background sync and push notifications
      devOptions: {
        enabled: true
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Ensure .well-known files are served with correct MIME type
  define: {
    __ASSET_LINKS_ENABLED__: true
  },
  publicDir: 'public'
}));
