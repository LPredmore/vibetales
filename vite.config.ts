
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
      includeAssets: ['favicon.ico', 'og-image.svg', 'placeholder.svg', '.well-known/assetlinks.json'],
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
            src: '/placeholder.svg',
            sizes: '390x844',
            type: 'image/svg+xml',
            form_factor: 'narrow',
            label: 'StoryBridge mobile view'
          },
          {
            src: '/placeholder.svg',
            sizes: '1920x1080',
            type: 'image/svg+xml',
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
          {
            src: '/favicon.ico',
            sizes: '48x48',
            type: 'image/x-icon'
          },
          {
            src: '/placeholder.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/placeholder.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/placeholder.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Create Story',
            short_name: 'Create',
            description: 'Create a new story',
            url: '/',
            icons: [
              {
                src: '/placeholder.svg',
                sizes: '96x96',
                type: 'image/svg+xml'
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
