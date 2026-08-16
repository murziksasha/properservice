import type { Section } from './types';
import { newSection } from './section-factory';

export type SectionTemplate = {
  id: string;
  label: string;
  description: string;
  build: () => Section[];
};

export const SECTION_TEMPLATES: SectionTemplate[] = [
  {
    id: 'service-page',
    label: 'Сторінка послуги',
    description: 'Hero + несправності + callback + контакти',
    build: () => [newSection('hero'), newSection('malfunctions'), newSection('callback'), newSection('contacts')],
  },
  {
    id: 'landing-shop',
    label: 'Лендінг + магазин',
    description: 'Hero + переваги + сітка товарів + відгуки',
    build: () => [newSection('hero'), newSection('advantages'), newSection('shop-grid'), newSection('feedback')],
  },
  {
    id: 'contacts-only',
    label: 'Контакти',
    description: 'Контакти + форма дзвінка',
    build: () => [newSection('contacts'), newSection('callback')],
  },
];
