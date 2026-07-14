import type { SiteSettings } from '@/lib/types';

interface LocalBusinessJsonLdProps {
  settings: SiteSettings;
  /** Absolute site origin, e.g. https://example.com */
  siteUrl?: string;
}

/**
 * Schema.org LocalBusiness for local SEO (Google Maps / rich results).
 */
export function LocalBusinessJsonLd({ settings, siteUrl }: LocalBusinessJsonLdProps) {
  const phones = [
    settings.headerPhone?.tel,
    ...(settings.phones || []).map((p) => p.tel),
  ].filter(Boolean);

  const uniquePhones = [...new Set(phones)];

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: settings.title || 'Proper Service',
    description: settings.description,
    image: settings.logo
      ? siteUrl
        ? new URL(settings.logo, siteUrl).toString()
        : settings.logo
      : undefined,
    url: siteUrl || undefined,
    telephone: uniquePhones[0] || undefined,
    email: settings.email || undefined,
    address: settings.address
      ? {
          '@type': 'PostalAddress',
          streetAddress: settings.address,
          addressLocality: 'Чорноморськ',
          addressCountry: 'UA',
        }
      : undefined,
    openingHours: settings.hours || settings.officeHours || undefined,
    priceRange: '$$',
  };

  // Strip undefined keys for cleaner JSON
  const clean = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;

  return (
    <script
      type='application/ld+json'
      dangerouslySetInnerHTML={{ __html: JSON.stringify(clean) }}
    />
  );
}
