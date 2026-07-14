import Image from 'next/image';
import type { ContactsSection as ContactsSectionType, PhoneEntry, SiteSettings, SocialLink } from '@/lib/types';
import { CallbackForm } from '@/components/forms/CallbackForm';
import { sanitizeHtml } from '@/lib/sanitize';

function resolvePhones(section: ContactsSectionType, settings?: SiteSettings): PhoneEntry[] {
  if (section.phones?.length) return section.phones;
  if (!settings) return [];
  const list: PhoneEntry[] = [];
  if (settings.headerPhone?.tel || settings.headerPhone?.display) {
    list.push(settings.headerPhone);
  }
  for (const p of settings.phones || []) {
    if (list.some((x) => x.tel === p.tel)) continue;
    list.push(p);
  }
  return list;
}

function resolveSocial(section: ContactsSectionType, settings?: SiteSettings): SocialLink[] {
  if (section.social?.length) return section.social;
  return settings?.social || [];
}

export function ContactsSection({
  section,
  settings,
}: {
  section: ContactsSectionType;
  settings?: SiteSettings;
}) {
  const phones = resolvePhones(section, settings);
  const social = resolveSocial(section, settings);
  const email = section.email || settings?.email || '';
  const mapUrl = section.mapEmbedUrl || settings?.mapEmbedUrl || '';

  return (
    <div className='contacts' id='contacts'>
      <div className='contacts__wrapper wrapper'>
        <div className='contacts__inner-wrapper'>
          <div className='contacts__left-side'>
            <h2 className='contacts__title'>{section.title}</h2>
            {section.inviteText ? <p className='contacts__par-bold'>{section.inviteText}</p> : null}
            {section.addressHtml ? (
              <p
                className='contacts__par'
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(section.addressHtml) }}
              />
            ) : null}
            {phones.length ? (
              <p className='contacts__phone'>
                {phones.map((phone) => (
                  <span key={phone.tel || phone.display}>
                    <a href={`tel:${phone.tel}`}>{phone.display}</a>
                    <br />
                  </span>
                ))}
              </p>
            ) : null}
            {email ? (
              <p className='contacts__mail'>
                <a href={`mailto:${email}`}>{email}</a>
              </p>
            ) : null}
            {social.length ? (
              <div className='contacts__social header__contact_social'>
                {social.map((link) => (
                  <a key={link.id} href={link.url} target='_blank' rel='noreferrer'>
                    <Image src={link.icon} alt={link.type} width={28} height={28} />
                  </a>
                ))}
              </div>
            ) : null}
          </div>
          <div className='contacts__right-side'>
            <div className='contacts__line line' aria-hidden>
              <div className='line__circle line__circle' />
            </div>
            {mapUrl ? (
              <div className='contacts__map'>
                <iframe
                  src={mapUrl}
                  width='479'
                  height='260'
                  style={{ border: 0 }}
                  allowFullScreen
                  loading='lazy'
                  referrerPolicy='no-referrer-when-downgrade'
                  title='Карта'
                />
              </div>
            ) : null}
          </div>
        </div>
        <div className='contacts__callback _callback'>
          <p className='_callback__title _paragr'>Залишіть заявку та отримайте первинну консультацію:</p>
          <CallbackForm buttonText='залишити заявку' placeholder='+38( ___ ) __ __ ___' />
        </div>
      </div>
    </div>
  );
}
