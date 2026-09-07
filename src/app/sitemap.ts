import type { MetadataRoute } from 'next';
import { appUrl } from '@/lib/constants';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = appUrl();
  const lastModified = new Date();

  return [
    { url: `${base}/`, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/#features`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/#pricing`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/#faq`, lastModified, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/signup`, lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/login`, lastModified, changeFrequency: 'yearly', priority: 0.4 },
  ];
}
