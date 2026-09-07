import type { MetadataRoute } from 'next';
import { appUrl } from '@/lib/constants';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Private areas carry no public value and must not be indexed.
        disallow: ['/api/', '/dashboard/', '/admin/', '/reset-password', '/verify-email'],
      },
    ],
    sitemap: `${appUrl()}/sitemap.xml`,
    host: appUrl(),
  };
}
