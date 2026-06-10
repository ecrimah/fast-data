import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/brand';
import { GUIDES } from '@/lib/guides';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
    { path: '/', priority: 1.0, changeFrequency: 'daily' },
    { path: '/mtn-data-bundles', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/telecel-data-bundles', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/at-data-bundles', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/guides', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/faq', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/contact', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/community', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/referrals', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/login', priority: 0.4, changeFrequency: 'yearly' },
  ];

  const staticRoutes: MetadataRoute.Sitemap = routes.map((route) => ({
    url: `${SITE.url}${route.path === '/' ? '' : route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const guideRoutes: MetadataRoute.Sitemap = GUIDES.map((guide) => ({
    url: `${SITE.url}/guides/${guide.slug}`,
    lastModified: new Date(guide.dateModified),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [...staticRoutes, ...guideRoutes];
}
