export interface MenuItem {
  id: string;
  label: string;
  href: string;
  visible: boolean;
}

export interface PhoneEntry {
  display: string;
  tel: string;
}

export interface SocialLink {
  id: string;
  type: 'viber' | 'telegram' | 'instagram' | 'youtube' | string;
  url: string;
  icon: string;
}

export interface SiteSettings {
  title: string;
  description: string;
  logo: string;
  favicon: string;
  phones: PhoneEntry[];
  headerPhone: PhoneEntry;
  social: SocialLink[];
  hours: string;
  address: string;
  addressNote: string;
  officeHours: string;
  email: string;
  mapEmbedUrl: string;
  copyright: string;
  privacyPolicyUrl: string;
  privacyPolicyText: string;
  /** Optional Google / external reviews URL for feedback CTA */
  reviewsUrl?: string;
}

export interface ServiceNavItem {
  id: string;
  label: string;
  href: string;
  slug: string;
  visible: boolean;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  image: string;
  visible: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SectionBase {
  id: string;
  type: string;
  visible: boolean;
}

export interface HeroSection extends SectionBase {
  type: 'hero';
  titleHtml: string;
  aboutLines: string[];
  callbackTitle: string;
  callbackTitleHtml?: string;
  callbackButtonText: string;
  callbackButtonHtml?: string;
  callbackPlaceholder: string;
  image: string;
  imageAlt: string;
  imageClass?: string;
  activeServiceSlug?: string;
}

export interface ServicesNavSection extends SectionBase {
  type: 'services-nav';
  activeSlug?: string;
}

export interface AdvantageItem {
  icon: string;
  iconAlt: string;
  textHtml: string;
}

export interface AdvantagesSection extends SectionBase {
  type: 'advantages';
  items: AdvantageItem[];
}

export interface MalfunctionsSection extends SectionBase {
  type: 'malfunctions';
  title: string;
  intro: string;
  items: string[];
  image: string;
  imageAlt: string;
  imageClass?: string;
}

export interface AboutLinkItem {
  href: string;
  image: string;
  imageAlt: string;
  label: string;
}

export interface AboutLinksSection extends SectionBase {
  type: 'about-links';
  titleHtml: string;
  subtitle: string;
  items: AboutLinkItem[];
}

export interface FeedbackSection extends SectionBase {
  type: 'feedback';
  images: string[];
  moreReviewsButtonText: string;
}

export interface ContactsSection extends SectionBase {
  type: 'contacts';
  title: string;
  inviteText: string;
  addressHtml: string;
  phones: PhoneEntry[];
  email: string;
  social: SocialLink[];
  mapEmbedUrl: string;
}

export interface CallbackSection extends SectionBase {
  type: 'callback';
  title: string;
  titleHtml?: string;
  buttonText: string;
  buttonHtml?: string;
  placeholder: string;
}

export interface ShopGridSection extends SectionBase {
  type: 'shop-grid';
  title?: string;
  subtitle?: string;
}

export type Section =
  | HeroSection
  | ServicesNavSection
  | AdvantagesSection
  | MalfunctionsSection
  | AboutLinksSection
  | FeedbackSection
  | ContactsSection
  | CallbackSection
  | ShopGridSection;

export interface Page {
  id: string;
  slug: string;
  title: string;
  description: string;
  visible: boolean;
  sections: Section[];
  contentHtml?: string;
  titleSize?: number;   // optional rem size for main titles on this page
  textScale?: number;   // optional multiplier for body text
}

export interface SiteData {
  settings: SiteSettings;
  headerMenu: MenuItem[];
  servicesNav: ServiceNavItem[];
  shopLink: MenuItem;
  pages: Page[];
  goods: Product[];
}