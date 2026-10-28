import { defineConfig } from 'astro/config'
import cloudflare from '@astrojs/cloudflare'

// Astro 5 + @astrojs/cloudflare v12 = deploy ke Cloudflare PAGES.
// (Astro 6 / adapter v13 hanya mendukung Workers.)
export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    // Saat `npm run dev`, baca variabel rahasia dari file .dev.vars
    platformProxy: { enabled: true },
    imageService: 'passthrough',
  }),
  security: { checkOrigin: true }, // menolak form POST dari situs lain (CSRF)
  devToolbar: { enabled: false },
})
