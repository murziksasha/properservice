import type { ReactNode } from 'react';
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
  const visible = sections.filter(s => s.visible);
  const advantages = visible.find(s => s.type === 'advantages');
  // Hosts that already inject advantages — avoid double-render
  const advantagesHosted = visible.some(s => s.type === 'about-links') || visible.some(s => s.type === 'malfunctions');
  // Hero already shows services nav — skip standalone if hero present
  const hasHero = visible.some(s => s.type === 'hero');

  return (
    <>
      {visible.map(section => {
        let node: ReactNode = null;
        switch (section.type) {
          case 'hero':
            node = <HeroSection section={section} servicesNav={servicesNav} heroImages={heroImages} />;
            break;
          case 'services-nav':
            if (hasHero) return null;
            node = (
              <div className='wrapper' style={{ paddingTop: '1.5rem' }}>
                <ServicesNav items={servicesNav} activeSlug={section.activeSlug} heroImages={heroImages} />
              </div>
            );
            break;
          case 'advantages':
            if (advantagesHosted) return null;
            node = (
              <div className='about-link'>
                <div className='about-link__wrapper wrapper'>
                  <AdvantagesSection section={section} />
                </div>
              </div>
            );
            break;
          case 'malfunctions':
            node = (
              <div className='about-link'>
                <div className='about-link__wrapper wrapper'>
                  {advantages && advantages.type === 'advantages' ? <AdvantagesSection section={advantages} /> : null}
                  <MalfunctionsSection section={section} />
                </div>
              </div>
            );
            break;
          case 'about-links':
            node = (
              <AboutLinksSection
                section={section}
                advantages={advantages && advantages.type === 'advantages' ? advantages : undefined}
              />
            );
            break;
          case 'callback':
            node = (
              <div className='about-link'>
                <div className='about-link__wrapper wrapper'>
                  <CallbackBlock section={section} />
                </div>
              </div>
            );
            break;
          case 'feedback':
            node = <FeedbackSection section={section} reviewsUrl={reviewsUrl} />;
            break;
          case 'contacts':
            node = <ContactsSection section={section} settings={settings} />;
            break;
          case 'shop-grid':
            node = <ShopGridSection section={section} products={products} />;
            break;
          default:
            return null;
        }
        const vp = [section.hideOnMobile ? 'ps-hide-mobile' : '', section.hideOnDesktop ? 'ps-hide-desktop' : '']
          .filter(Boolean)
          .join(' ');
        if (!vp) {
          return <div key={section.id}>{node}</div>;
        }
        return (
          <div key={section.id} className={vp}>
            {node}
          </div>
        );
      })}
    </>
  );
}
