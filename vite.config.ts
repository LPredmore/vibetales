
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
        // Use NetworkFirst for all requests to prevent stale cache issues on Android
        runtimeCaching: [
          {
            urlPattern: /^\/$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: `main-page-${buildVersion}`,
              expiration: {
                maxEntries: 1,
                maxAgeSeconds: 60 * 60 // 1 hour
              },
              networkTimeoutSeconds: 5
            }
          },
          {
            urlPattern: /\.(?:js|css)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: `assets-${buildVersion}`,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: `images-${buildVersion}`,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/.*/i,
            handler: 'NetworkOnly'
          },
          {
            urlPattern: /^https:\/\/openrouter\.ai\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60
              }
            }
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
      manifest: {
        id: "/",
        name: "StoryBridge - Story Generator",
        short_name: "StoryBridge",
        description: "Create magical stories for young readers with sight words practice",
        lang: "en",
        dir: "ltr",
        theme_color: "#8B5CF6",
        background_color: "#F3E8FF",
        display: "standalone",
        display_override: ["window-controls-overlay", "standalone"],
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        categories: ["education", "books", "kids"],
        prefer_related_applications: false,
        icons: [
          { src: "favicon-16x16.png", sizes: "16x16", type: "image/png", purpose: "any" },
          { src: "favicon-32x32.png", sizes: "32x32", type: "image/png", purpose: "any" },
          { src: "favicon-48x48.png", sizes: "48x48", type: "image/png", purpose: "any" },
          { src: "favicon-96x96.png", sizes: "96x96", type: "image/png", purpose: "any" },
          { src: "favicon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "favicon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "pwa-192x192-maskable.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "pwa-512x512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "apple-touch-icon.png", sizes: "180x180", type: "image/png", purpose: "any" }
        ],
        shortcuts: [
          {
            name: "Create Story",
            short_name: "Create",
            description: "Create a new story",
            url: "/",
            icons: [{ src: "favicon-192x192.png", sizes: "192x192", type: "image/png" }]
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
  build: {
    rollupOptions: {
      output: {
        // Simple, consistent naming for Android compatibility
        assetFileNames: 'assets/[name].[hash][extname]',
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js'
      }
    },
    // Ensure proper minification
    minify: 'terser',
    sourcemap: false,
    // Ensure chunks are properly split for better loading
    chunkSizeWarningLimit: 1000
  }
}));
