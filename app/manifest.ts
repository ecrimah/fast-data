import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/brand';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: SITE.shortName,
    description: SITE.shortDescription,
    start_url: '/',
    display: 'standalone',
    background_color: '#081F3F',
    theme_color: '#081F3F',
    categories: ['shopping', 'utilities', 'finance'],
    lang: 'en-GH',
    icons: [
      {
        src: SITE.icon,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: SITE.icon,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: SITE.icon,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
