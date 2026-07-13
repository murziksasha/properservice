import Image from 'next/image';
import type { ContactsSection as ContactsSectionType } from '@/lib/types';
import { CallbackForm } from '@/components/forms/CallbackForm';
import { sanitizeHtml } from '@/lib/sanitize';

export function ContactsSection({ section }: { section: ContactsSectionType }) {
  return (
    <div className="contacts" id="contacts">
      <div className="contacts__wrapper wrapper">
        <div className="contacts__inner-wrapper">
          <div className="contacts__left-side">
            <h2 className="contacts__title">{section.title}</h2>
            <p className="contacts__par-bold">{section.inviteText}</p>
            <p className="contacts__par" dangerouslySetInnerHTML={{ __html: sanitizeHtml(section.addressHtml) }} />
            <p className="contacts__phone">
              {section.phones.map((phone) => (
                <span key={phone.tel}>
                  <a href={`tel:${phone.tel}`}>{phone.display}</a>
                  <br />
                </span>
              ))}
            </p>
            <p className="contacts__mail">
              <a href={`mailto:${section.email}`}>{section.email}</a>
            </p>
            <div className="contacts__social header__contact_social">
              {section.social.map((link) => (
                <a key={link.id} href={link.url} target="_blank" rel="noreferrer">
                  <Image src={link.icon} alt={link.type} width={24} height={24} />
                </a>
              ))}
            </div>
          </div>
          <div className="contacts__right-side">
            <div className="contacts__line line">
              <div className="line__circle line__circle" />
            </div>
            <div className="contacts__map">
              <iframe
                src={section.mapEmbedUrl}
                width="479"
                height="260"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="map"
              />
            </div>
          </div>
        </div>
        <div className="contacts__callback _callback">
          <p className="_callback__title _paragr">Залишіть заявку та отримайте первинну консультацію:</p>
          <CallbackForm buttonText="залишити заявку" placeholder="+38( ___ ) __ __ ___" />
        </div>
      </div>
    </div>
  );
}