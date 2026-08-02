import type { Product, Section, ServiceNavItem, SiteSettings } from '@/lib/types';
import { AboutLinksSection } from './AboutLinksSection';
import { AdvantagesSection } from './AdvantagesSection';
import { CallbackBlock } from './CallbackBlock';
import { ContactsSection } from './ContactsSection';
import { FeedbackSection } from './FeedbackSection';
import { HeroSection } from './HeroSection';
import { MalfunctionsSection } from './MalfunctionsSection';
import { ServicesNav } from './ServicesNav';
import { ShopGridSection } from './ShopGridSection';

interface SectionRendererProps {
  sections: Section[];
  servicesNav: ServiceNavItem[];
  products: Product[];
  reviewsUrl?: string;
  settings?: SiteSettings;
  /** href/slug → hero image for service nav prefetch */
  heroImages?: Record<string, string>;
}

export function SectionRenderer({
  sections,
  servicesNav,
  products,
  reviewsUrl,
  settings,
  heroImages,
}: SectionRendererProps) {
  const visible = sections.filter((s) => s.visible);
  const advantages = visible.find((s) => s.type === 'advantages');
  // Hosts that already inject advantages — avoid double-render
  const advantagesHosted =
    visible.some((s) => s.type === 'about-links') || visible.some((s) => s.type === 'malfunctions');
  // Hero already shows services nav — skip standalone if hero present
  const hasHero = visible.some((s) => s.type === 'hero');

  return (
    <>
      {visible.map((section) => {
        switch (section.type) {
          case 'hero':
            return (
              <HeroSection
                key={section.id}
                section={section}
                servicesNav={servicesNav}
                heroImages={heroImages}
              />
            );
          case 'services-nav':
            if (hasHero) return null;
            return (
              <div key={section.id} className='wrapper' style={{ paddingTop: '1.5rem' }}>
                <ServicesNav
                  items={servicesNav}
                  activeSlug={section.activeSlug}
                  heroImages={heroImages}
                />
              </div>
            );
          case 'advantages':
            // Rendered inside about-links or malfunctions when those exist
            if (advantagesHosted) return null;
            return (
              <div key={section.id} className='about-link'>
                <div className='about-link__wrapper wrapper'>
                  <AdvantagesSection section={section} />
                </div>
              </div>
            );
          case 'malfunctions':
            return (
              <div key={section.id} className='about-link'>
                <div className='about-link__wrapper wrapper'>
                  {advantages && advantages.type === 'advantages' ? (
                    <AdvantagesSection section={advantages} />
                  ) : null}
                  <MalfunctionsSection section={section} />
                </div>
              </div>
            );
          case 'about-links':
            return (
              <AboutLinksSection
                key={section.id}
                section={section}
                advantages={advantages && advantages.type === 'advantages' ? advantages : undefined}
              />
            );
          case 'callback':
            return (
              <div key={section.id} className='about-link'>
                <div className='about-link__wrapper wrapper'>
                  <CallbackBlock section={section} />
                </div>
              </div>
            );
          case 'feedback':
            return <FeedbackSection key={section.id} section={section} reviewsUrl={reviewsUrl} />;
          case 'contacts':
            return <ContactsSection key={section.id} section={section} settings={settings} />;
          case 'shop-grid':
            return <ShopGridSection key={section.id} section={section} products={products} />;
          default:
            return null;
        }
      })}
    </>
  );
}
