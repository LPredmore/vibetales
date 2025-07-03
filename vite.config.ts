
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

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
        'pwa-512x512-maskable.png',
        '.well-known/assetlinks.json'
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
        edge_side_panel: {
          preferred_width: 400
        },
        file_handlers: [
          {
            action: '/',
            accept: {
              'text/plain': ['.txt'],
              'application/json': ['.json']
            }
          }
        ],
        handle_links: 'preferred',
        protocol_handlers: [
          {
            protocol: 'web+storybridge',
            url: '/?protocol=%s'
          }
        ],
        share_target: {
          action: '/',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            title: 'title',
            text: 'text',
            url: 'url'
          }
        },
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
        related_applications: [
          {
            platform: 'webapp',
            url: 'https://storybridge.lovable.app',
            id: 'storybridge-pwa'
          }
        ],
        scope_extensions: [
          {
            origin: 'https://storybridge.lovable.app'
          }
        ],
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
        additionalManifestEntries: [
          {
            url: '/.well-known/assetlinks.json',
            revision: null
          }
        ],
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
            urlPattern: /^https:\/\/api\.openai\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 1 day
              }
            }
          }
        ],
        // Background sync for offline functionality
        skipWaiting: true,
        clientsClaim: true
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
