import type { Product, Section, ServiceNavItem } from '@/lib/types';
import { AboutLinksSection } from './AboutLinksSection';
import { AdvantagesSection } from './AdvantagesSection';
import { CallbackBlock } from './CallbackBlock';
import { ContactsSection } from './ContactsSection';
import { FeedbackSection } from './FeedbackSection';
import { HeroSection } from './HeroSection';
import { MalfunctionsSection } from './MalfunctionsSection';
import { ShopGridSection } from './ShopGridSection';

interface SectionRendererProps {
  sections: Section[];
  servicesNav: ServiceNavItem[];
  products: Product[];
  reviewsUrl?: string;
}

export function SectionRenderer({ sections, servicesNav, products, reviewsUrl }: SectionRendererProps) {
  const visible = sections.filter((s) => s.visible);
  const advantages = visible.find((s) => s.type === 'advantages');

  return (
    <>
      {visible.map((section) => {
        switch (section.type) {
          case 'hero':
            return <HeroSection key={section.id} section={section} servicesNav={servicesNav} />;
          case 'services-nav':
            return null;
          case 'advantages':
            if (visible.some((s) => s.type === 'about-links')) return null;
            return (
              <div key={section.id} className="about-link">
                <div className="about-link__wrapper wrapper">
                  <AdvantagesSection section={section} />
                </div>
              </div>
            );
          case 'malfunctions':
            return (
              <div key={section.id} className="about-link">
                <div className="about-link__wrapper wrapper">
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
              <div key={section.id} className="about-link">
                <div className="about-link__wrapper wrapper">
                  <CallbackBlock section={section} />
                </div>
              </div>
            );
          case 'feedback':
            return <FeedbackSection key={section.id} section={section} reviewsUrl={reviewsUrl} />;
          case 'contacts':
            return <ContactsSection key={section.id} section={section} />;
          case 'shop-grid':
            return <ShopGridSection key={section.id} section={section} products={products} />;
          default:
            return null;
        }
      })}
    </>
  );
}