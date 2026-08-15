import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SHAi — Small Happy Appetites',
    short_name: 'SHAi',
    description: 'The companion for every feed, meal, and milestone.',
    start_url: '/home',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FDFAF5',
    theme_color: '#C4714A',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
