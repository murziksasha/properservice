import type { Page, Section } from './types';
import { createId } from './id';

export const SECTION_TYPES = [
  'hero',
  'advantages',
  'malfunctions',
  'about-links',
  'callback',
  'feedback',
  'contacts',
  'shop-grid',
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];

export const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero (заголовок + форма)',
  advantages: 'Переваги',
  malfunctions: 'Несправності',
  'about-links': 'Посилання / послуги',
  callback: 'Форма зворотного дзвінка',
  feedback: 'Відгуки',
  contacts: 'Контакти',
  'shop-grid': 'Магазин (сітка товарів)',
  'services-nav': 'Навігація послуг',
};

export function newSection(type: SectionType | string): Section {
  const id = createId();
  switch (type) {
    case 'hero':
      return {
        id,
        type: 'hero',
        visible: true,
        titleHtml: 'Заголовок',
        aboutLines: [''],
        callbackTitle: 'Залиште заявку',
        callbackButtonText: 'Надіслати',
        callbackPlaceholder: '+38 (___) ___ __ __',
        image: '/img/services/technika_img.png',
        imageAlt: 'image',
      };
    case 'advantages':
      return { id, type: 'advantages', visible: true, items: [] };
    case 'malfunctions':
      return {
        id,
        type: 'malfunctions',
        visible: true,
        title: 'Несправності',
        intro: '',
        items: [''],
        image: '/img/services/technika_img.png',
        imageAlt: 'image',
      };
    case 'about-links':
      return {
        id,
        type: 'about-links',
        visible: true,
        titleHtml: 'Заголовок',
        subtitle: '',
        items: [],
      };
    case 'callback':
      return {
        id,
        type: 'callback',
        visible: true,
        title: 'Залиште заявку',
        buttonText: 'Надіслати',
        placeholder: '+38 (___) ___ __ __',
      };
    case 'feedback':
      return {
        id,
        type: 'feedback',
        visible: true,
        images: ['/img/feedback/feed-1.jpg'],
        moreReviewsButtonText: 'Більше відгуків',
      };
    case 'contacts':
      return {
        id,
        type: 'contacts',
        visible: true,
        title: 'Контакти',
        inviteText: '',
        addressHtml: '',
        phones: [],
        email: '',
        social: [],
        mapEmbedUrl: '',
      };
    case 'shop-grid':
      return { id, type: 'shop-grid', visible: true, title: 'Магазин', subtitle: '' };
    case 'services-nav':
      return { id, type: 'services-nav', visible: true };
    default:
      return {
        id,
        type: 'callback',
        visible: true,
        title: '',
        buttonText: '',
        placeholder: '',
      };
  }
}

export function createDefaultPage(opts: { title: string; slug: string; email?: string; mapEmbedUrl?: string }): Page {
  return {
    id: createId(),
    slug: opts.slug,
    title: opts.title,
    description: opts.title,
    visible: true,
    sections: [
      { ...newSection('hero'), titleHtml: opts.title } as Section,
      newSection('advantages'),
      newSection('callback'),
      {
        ...newSection('contacts'),
        email: opts.email || '',
        mapEmbedUrl: opts.mapEmbedUrl || '',
      } as Section,
    ],
  };
}
