import Image from 'next/image';
import Link from 'next/link';
import type { AboutLinksSection as AboutLinksSectionType } from '@/lib/types';
import { AdvantagesSection } from './AdvantagesSection';
import type { AdvantagesSection as AdvantagesSectionType } from '@/lib/types';

export function AboutLinksSection({
  section,
  advantages,
}: {
  section: AboutLinksSectionType;
  advantages?: AdvantagesSectionType;
}) {
  return (
    <div className="about-link">
      <div className="about-link__wrapper wrapper" id="about_company">
        {advantages ? <AdvantagesSection section={advantages} /> : null}
        <div className="about-link__line line">
          <div className="line__circle line__circle_left" />
        </div>
        <h2 className="about-link__title _title" dangerouslySetInnerHTML={{ __html: section.titleHtml }} />
        <p className="about-link__paragr">{section.subtitle}</p>
        <div className="about-link__items-wrapper">
          {section.items.map((item) => (
            <div key={item.href + item.label} className="about-link__item">
              <Link href={item.href} className="about-link__link">
                <Image src={item.image} alt={item.imageAlt} className="about-link__img" width={120} height={120} />
                <p className="about-link__descr">{item.label}</p>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}