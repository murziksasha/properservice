import Link from 'next/link';
import type { ServiceNavItem } from '@/lib/types';

export function ServicesNav({ items, activeSlug }: { items: ServiceNavItem[]; activeSlug?: string }) {
  return (
    <nav className="services-nav">
      <ul className="services-nav__list">
        {items.filter((item) => item.visible).map((item) => (
          <li
            key={item.id}
            className={`services-nav__item${activeSlug === item.slug ? ' services-nav__item_active' : ''}`}
          >
            <Link className="_list-reset" href={item.href}>{item.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}