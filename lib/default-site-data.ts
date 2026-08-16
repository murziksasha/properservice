import type { SiteData } from './types';

const ADVANTAGES = [
  {
    icon: '/img/icons/descr_key.png',
    iconAlt: 'icon_key',
    textHtml: 'Використовуємо доступні комплектуючі <span>хорошої якості</span>',
  },
  {
    icon: '/img/icons/descr_hands.png',
    iconAlt: 'icon_hands',
    textHtml: 'Не накручуємо вартість за вигадані <span>"несправності"</span>',
  },
  {
    icon: '/img/icons/descr_advan.png',
    iconAlt: 'icon_advantage',
    textHtml: 'Працюємо навіть з <span>безнадійними</span> випадками',
  },
  {
    icon: '/img/icons/descr_rewards.png',
    iconAlt: 'icon_reward',
    textHtml: 'Даємо гарантію на <span>всі</span> зроблені роботи',
  },
];

const ABOUT_LINKS = [
  {
    href: '/coffee-machines',
    image: '/img/about-link/coff_machine_log.png',
    imageAlt: 'coffee machine',
    label: 'Кофемашина',
  },
  { href: '/televizoru', image: '/img/about-link/televizor_logo.png', imageAlt: 'tv set', label: 'телевизор' },
  { href: '/laptop-pc', image: '/img/about-link/laptop-ico.png', imageAlt: 'laptop', label: 'ноутбук' },
  { href: '/bake', image: '/img/about-link/bake0.png', imageAlt: 'bake', label: 'піч' },
  { href: '/vacuum-cleaner', image: '/img/about-link/vacuum.png', imageAlt: 'vacuum-cleaner', label: 'пилосмок' },
  { href: '/televizoru', image: '/img/about-link/monitor.jpg', imageAlt: 'monitor', label: 'монітор' },
  { href: '/phones', image: '/img/about-link/phone.png', imageAlt: 'phone', label: 'смартфон' },
  { href: '/others', image: '/img/about-link/other.png', imageAlt: 'other', label: 'інші прилади' },
];

const FEEDBACK_IMAGES = [
  '/img/feedback/feed-1.jpg',
  '/img/feedback/feed-2.jpg',
  '/img/feedback/feed-3.jpg',
  '/img/feedback/feed-4.jpg',
  '/img/feedback/feed-5.jpg',
];

const CONTACTS_SECTION = {
  id: 'contacts',
  type: 'contacts' as const,
  visible: true,
  title: 'Наші контакти:',
  inviteText: 'Будемо раді бачити Вас у нашому офісі:',
  addressHtml:
    'м. Чорноморськ, вул. Віталія Шума 2-Б <br>(цоколь зліва від входу в "Снігова Королева") ПН - ПТ з 08:00 до 17:00',
  phones: [
    { display: '+38 099 538 56 55', tel: '+380995385655' },
    { display: '+38 063 556 70 90', tel: '+380635567090' },
  ],
  email: 'remontmailshop@gmail.com',
  social: [
    { id: 'viber', type: 'viber', url: 'viber://chat?number=+380995385655', icon: '/img/icons/viber.svg' },
    { id: 'telegram', type: 'telegram', url: 'https://t.me/+380995385655', icon: '/img/icons/telegram.svg' },
    {
      id: 'instagram',
      type: 'instagram',
      url: 'http://instagram.com/_u/remont_servis_chernomorsk',
      icon: '/img/icons/instagram.svg',
    },
    {
      id: 'youtube',
      type: 'youtube',
      url: 'https://www.youtube.com/channel/UCMst-3U2Yp4zqRPzGDkh0fg',
      icon: '/img/icons/youtube.svg',
    },
  ],
  mapEmbedUrl:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d669.5547639817211!2d30.639834534575012!3d46.295996529895035!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40c7c9103c986d39%3A0x60ee4de500df2374!2z0KDQtdC80L7QvdGCINCh0LXRgNCy0LjRgQ!5e0!3m2!1sen!2sua!4v1671553101368!5m2!1sen!2sua',
};

const CALLBACK_TAIL = [
  {
    id: 'callback-1',
    type: 'callback' as const,
    visible: true,
    title: 'Залишіть заявку та отримайте первинну консультацію та діагностику!',
    buttonText: 'залишити заявку',
    placeholder: '+38 (___) ___ __ __',
  },
  {
    id: 'feedback',
    type: 'feedback' as const,
    visible: true,
    images: FEEDBACK_IMAGES,
    moreReviewsButtonText: 'Більше відгуків',
  },
  CONTACTS_SECTION,
  {
    id: 'callback-2',
    type: 'callback' as const,
    visible: true,
    title: 'Залишіть заявку та отримайте первинну консультацію:',
    buttonText: 'залишити заявку',
    placeholder: '+38 (___) ___ __ __',
  },
];

function servicePage(
  id: string,
  slug: string,
  title: string,
  hero: {
    titleHtml: string;
    image: string;
    imageAlt: string;
    imageClass?: string;
    malfunctions: { intro: string; items: string[]; image: string; imageAlt: string; imageClass?: string };
  },
) {
  return {
    id,
    slug,
    title,
    description: title,
    visible: true,
    sections: [
      { id: 'nav', type: 'services-nav' as const, visible: true, activeSlug: slug },
      {
        id: 'hero',
        type: 'hero' as const,
        visible: true,
        titleHtml: hero.titleHtml,
        aboutLines: [
          'Ми - <span>спеціалісти</span> своєї справи. Пропонуємо оптимальне рішення',
          'Постійно підвищуємо <span>якість</span> послуг, що надаються',
        ],
        callbackTitle: 'Вирішуємо питання навіть віддалено!',
        callbackTitleHtml: 'Вирішуємо питання навіть <span>віддалено!</span>',
        callbackButtonText: 'записатися на безкоштовну діагностику',
        callbackButtonHtml: '<span>записатися на</span> <br>безкоштовну діагностику',
        callbackPlaceholder: '+38 (___) ___ __ __',
        image: hero.image,
        imageAlt: hero.imageAlt,
        imageClass: hero.imageClass,
        activeServiceSlug: slug,
      },
      { id: 'advantages', type: 'advantages' as const, visible: true, items: ADVANTAGES },
      {
        id: 'malfunctions',
        type: 'malfunctions' as const,
        visible: true,
        title: 'Усуваємо будь-які несправності',
        intro: hero.malfunctions.intro,
        items: hero.malfunctions.items,
        image: hero.malfunctions.image,
        imageAlt: hero.malfunctions.imageAlt,
        imageClass: hero.malfunctions.imageClass,
      },
      ...CALLBACK_TAIL,
    ],
  };
}

export const defaultSiteData: SiteData = {
  settings: {
    title: "Ремонт комп'ютерної та побутової техніки, телефонів та планшетів",
    description: 'Якісний ремонт, відновлюємо пристрої, гарантія якості, лояльні ціни!',
    logo: '/img/icons/logo.png',
    favicon: '/img/icons/favicon.ico',
    phones: [
      { display: '+38 099 538 56 55', tel: '+380995385655' },
      { display: '+38 063 556 70 90', tel: '+380635567090' },
    ],
    headerPhone: { display: '063 754 89 12', tel: '+380637548912' },
    social: CONTACTS_SECTION.social,
    hours: 'Працюємо з 10:00 до 18:00',
    address: 'м. Чорноморськ, вул. Віталія Шума 2-Б',
    addressNote: '(цоколь зліва від входу в "Снігова Королева")',
    officeHours: 'ПН - ПТ з 08:00 до 17:00',
    email: 'remontmailshop@gmail.com',
    mapEmbedUrl: CONTACTS_SECTION.mapEmbedUrl,
    copyright: '© Proper Service',
    reviewsUrl: '',
    privacyPolicyUrl: '/confident',
    privacyPolicyText: 'політики конфіденційності персональних даних',
  },
  headerMenu: [
    { id: 'about', label: 'Про компанію', href: '/#about_company', visible: true },
    { id: 'feedback', label: 'Відгуки', href: '/#feedback', visible: true },
    { id: 'contacts', label: 'Контакти', href: '/#contacts', visible: true },
    { id: 'shop', label: 'Магазин', href: '/shop', visible: true },
  ],
  servicesNav: [
    { id: 'coffee', label: 'Кавомашини', href: '/coffee-machines', slug: 'coffee-machines', visible: true },
    { id: 'tv', label: 'Телевізори', href: '/televizoru', slug: 'televizoru', visible: true },
    { id: 'laptop', label: 'Ноутбуки та ПК', href: '/laptop-pc', slug: 'laptop-pc', visible: true },
    { id: 'vacuum', label: 'пилосмоки', href: '/vacuum-cleaner', slug: 'vacuum-cleaner', visible: true },
    { id: 'bake', label: 'Мікрохвильові печі', href: '/bake', slug: 'bake', visible: true },
    { id: 'phones', label: 'Телефони', href: '/phones', slug: 'phones', visible: true },
    { id: 'others', label: 'Інші пристрої', href: '/others', slug: 'others', visible: true },
  ],
  shopLink: { id: 'shop', label: 'Магазин', href: '/shop', visible: true },
  goods: [],
  pages: [
    {
      id: 'home',
      slug: '',
      title: "Ремонт комп'ютерної та побутової техніки, телефонів та планшетів",
      description: 'Якісний ремонт, відновлюємо пристрої, гарантія якості, лояльні ціни!',
      visible: true,
      sections: [
        { id: 'nav', type: 'services-nav', visible: true },
        {
          id: 'hero',
          type: 'hero',
          visible: true,
          titleHtml: 'Відремонтуємо побутову та цифрову техніку <span>у Чорноморську</span> з гарантією!',
          aboutLines: [
            'Ми - <span>спеціалісти</span> своєї справи. Пропонуємо оптимальне рішення',
            'Постійно підвищуємо <span>якість</span> послуг, що надаються',
          ],
          callbackTitle: 'Вирішуємо питання навіть віддалено!',
          callbackTitleHtml: 'Вирішуємо питання навіть <span>віддалено!</span>',
          callbackButtonText: 'записатися на безкоштовну діагностику',
          callbackButtonHtml: '<span>записатися на</span> <br>безкоштовну діагностику',
          callbackPlaceholder: '+38 (___) ___ __ __',
          image: '/img/services/technika_img.png',
          imageAlt: 'technique',
        },
        { id: 'advantages', type: 'advantages', visible: true, items: ADVANTAGES },
        {
          id: 'about-links',
          type: 'about-links',
          visible: true,
          titleHtml: 'Ми на ринку <span>понад 5 років!</span> <br/>Бездоганна репутація та індивідуальний підхід',
          subtitle: 'Виберіть, що потрібно відремонтувати:',
          items: ABOUT_LINKS,
        },
        {
          id: 'shop-grid',
          type: 'shop-grid',
          visible: true,
          title: 'Магазин запчастин',
          subtitle: 'Актуальні товари та комплектуючі',
        },
        ...CALLBACK_TAIL,
      ],
    },
    servicePage('coffee-machines', 'coffee-machines', 'Ремонт кавомашин', {
      titleHtml: 'Відремонтуємо <br />кавомашини та кавоварки <span>у Чорноморську</span> <br/>із гарантією!',
      image: '/img/coffee-machines/upper_coffee_machine.png',
      imageAlt: 'coffee machine',
      malfunctions: {
        intro: 'Якісно допоможемо, якщо Ваша кофемашина:',
        items: [
          'не варить каву',
          'не робить пінку',
          'не меле зерна',
          'шумить, гуде і видає дивні звуки',
          'постійно висить повідомлення про необхідність очищення',
          'не гасне індикатор очищення від накипу',
          'Також усі інші можливі неприємності',
        ],
        image: '/img/coffee-machines/downer_coffee_machine.png',
        imageAlt: 'coffee img',
      },
    }),
    servicePage('televizoru', 'televizoru', 'Ремонт телевізорів', {
      titleHtml: 'Відремонтуємо <br />телевізори <span>у Чорноморську</span> <br/>із гарантією!',
      image: '/img/televizoru/tv-set.png',
      imageAlt: 'tv set',
      imageClass: 'tv__set',
      malfunctions: {
        intro: 'Якісно допоможемо, якщо Ваш телевізор:',
        items: [
          'не вмикається',
          'немає зображення',
          'немає звуку',
          'розбитий екран',
          'миготить зображення',
          'не ловить канали',
        ],
        image: '/img/televizoru/tv_set_malfunction.png',
        imageAlt: 'tv malfunction',
        imageClass: 'malfunctions__img',
      },
    }),
    servicePage('laptop-pc', 'laptop-pc', 'Ремонт ноутбуків та ПК', {
      titleHtml: 'Відремонтуємо <br />ноутбуки та ПК <span>у Чорноморську</span> <br/>із гарантією!',
      image: '/img/laptop-pc/main-bg.png',
      imageAlt: 'laptop',
      malfunctions: {
        intro: 'Якісно допоможемо, якщо Ваш ноутбук або ПК:',
        items: ['не вмикається', 'гальмує', 'перегрівається', 'не бачить диск', 'синій екран', 'не працює Wi-Fi'],
        image: '/img/laptop-pc/laptop-1.jpg',
        imageAlt: 'laptop repair',
      },
    }),
    servicePage('vacuum-cleaner', 'vacuum-cleaner', 'Ремонт пилосмоків', {
      titleHtml: 'Відремонтуємо <br />пилосмоки <span>у Чорноморську</span> <br/>із гарантією!',
      image: '/img/vacuum-cleaner/vac-cleaner-main.jpg',
      imageAlt: 'vacuum cleaner',
      malfunctions: {
        intro: 'Якісно допоможемо, якщо Ваш пилосмок:',
        items: ['не вмикається', 'слабке всмоктування', 'перегрівається', 'шумить', 'не заряджається'],
        image: '/img/vacuum-cleaner/vac-cleaner-1.jpg',
        imageAlt: 'vacuum repair',
      },
    }),
    servicePage('bake', 'bake', 'Ремонт мікрохвильових печей', {
      titleHtml: 'Відремонтуємо <br />мікрохвильові печі <span>у Чорноморську</span> <br/>із гарантією!',
      image: '/img/bake/bake_main.jpg',
      imageAlt: 'microwave',
      malfunctions: {
        intro: 'Якісно допоможемо, якщо Ваша піч:',
        items: ['не гріє', 'іскрить', 'не відкривається дверцята', 'не крутиться тарілка', 'не працює дисплей'],
        image: '/img/bake/bake_second.jpg',
        imageAlt: 'microwave repair',
      },
    }),
    servicePage('phones', 'phones', 'Ремонт телефонів', {
      titleHtml: 'Відремонтуємо <br />телефони та планшети <span>у Чорноморську</span> <br/>із гарантією!',
      image: '/img/phones/phones_main.png',
      imageAlt: 'phones',
      imageClass: 'tv__set',
      malfunctions: {
        intro: 'Якісно допоможемо, якщо Ваш телефон:',
        items: [
          'не вмикається',
          'розбитий дисплей',
          'немає зображення',
          'не заряджається',
          'швидко розряджається',
          'камера не працює',
          'зависає',
          'немає мережі',
        ],
        image: '/img/phones/tablet.jpg',
        imageAlt: 'tablet',
        imageClass: 'malfunctions__img',
      },
    }),
    servicePage('others', 'others', 'Ремонт інших пристроїв', {
      titleHtml: 'Відремонтуємо <br />інші пристрої <span>у Чорноморську</span> <br/>із гарантією!',
      image: '/img/services/technika_img.png',
      imageAlt: 'devices',
      malfunctions: {
        intro: 'Якісно допоможемо з ремонтом:',
        items: ['пральних машин', 'посудомийних машин', 'кондиціонерів', 'плит', 'дрібної побутової техніки'],
        image: '/img/about-link/other.png',
        imageAlt: 'other devices',
      },
    }),
    {
      id: 'confident',
      slug: 'confident',
      title: 'Політика конфіденційності',
      description: 'Політика конфіденційності персональних даних',
      visible: true,
      sections: [],
      contentHtml:
        '<div class="wrapper" style="padding:40px 20px"><h1 class="_title">Політика конфіденційності персональних даних</h1><p class="_paragr">Використовуючи веб-сайт, Ви погоджуєтесь з умовами політики конфіденційності персональних даних.</p></div>',
    },
  ],
};
