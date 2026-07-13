import Image from 'next/image';
import type { HeroSection as HeroSectionType } from '@/lib/types';
import { CallbackForm } from '@/components/forms/CallbackForm';
import { sanitizeHtml } from '@/lib/sanitize';
import { ServicesNav } from './ServicesNav';
import type { ServiceNavItem } from '@/lib/types';

export function HeroSection({
  section,
  servicesNav,
}: {
  section: HeroSectionType;
  servicesNav: ServiceNavItem[];
}) {
  return (
    <div className="services">
      <div className="wrapper services__wrapper">
        <ServicesNav items={servicesNav} activeSlug={section.activeServiceSlug} />
        <aside className="services__aside">
          <div className="services__top">
            <h1 className="services__title _title" dangerouslySetInnerHTML={{ __html: sanitizeHtml(section.titleHtml) }} />
            <div className="services__about">
              {section.aboutLines.map((line) => (
                <p key={line} className="services__about-info _paragr" dangerouslySetInnerHTML={{ __html: sanitizeHtml(line) }} />
              ))}
            </div>
          </div>
          <div className="services__callback _callback">
            <p
              className="_callback__title _paragr"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(section.callbackTitleHtml ?? section.callbackTitle) }}
            />
            <CallbackForm
              buttonText={section.callbackButtonText}
              buttonHtml={section.callbackButtonHtml}
              placeholder={section.callbackPlaceholder}
            />
          </div>
          <div className={`services__main-img${section.imageClass ? ` ${section.imageClass}` : ''}`}>
            <Image
              src={section.image}
              alt={section.imageAlt}
              width={500}
              height={400}
              className={section.imageClass}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}