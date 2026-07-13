import Image from 'next/image';
import type { AdvantagesSection as AdvantagesSectionType } from '@/lib/types';
import { sanitizeHtml } from '@/lib/sanitize';

export function AdvantagesSection({ section }: { section: AdvantagesSectionType }) {
  return (
    <div className="advantages">
      <div className="advantages__wrapper wrapper">
        {section.items.map((item) => (
          <div key={item.iconAlt} className="advantages__block">
            <div className="advantages__ico">
              <Image src={item.icon} alt={item.iconAlt} width={48} height={48} />
              <p className="_paragr" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.textHtml) }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}