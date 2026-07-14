import { AdminShell } from '@/components/admin/AdminShell';
import { HealthPanel } from '@/components/admin/HealthPanel';
import { countLeads } from '@/lib/leads';
import { getSiteData } from '@/lib/site-data';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const site = await getSiteData();
  const visiblePages = site.pages.filter((p) => p.visible).length;
  const visibleGoods = site.goods.filter((g) => g.visible).length;
  const cookieSecure = process.env.COOKIE_SECURE;
  const smtpConfigured = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
  const strongPassword =
    Boolean(process.env.ADMIN_PASSWORD) &&
    process.env.ADMIN_PASSWORD !== 'changeme' &&
    (process.env.ADMIN_PASSWORD?.length ?? 0) >= 8;
  const hasSessionSecret = Boolean(process.env.SESSION_SECRET);

  let openLeads = 0;
  try {
    openLeads = await countLeads({ unhandledOnly: true });
  } catch {
    openLeads = 0;
  }

  return (
    <AdminShell>
      <h1>Dashboard</h1>
      <p className='admin-hint admin-mb-lg'>
        Керування контентом сайту. Зміни зберігаються у <code>data/site.json</code> (atomic write).
      </p>

      <div className='admin-stats'>
        <div className='admin-stat-card'>
          <span className='admin-stat-value'>{site.pages.length}</span>
          <span className='admin-stat-label'>Сторінок</span>
          <span className='admin-stat-meta'>{visiblePages} видимих</span>
        </div>
        <div className='admin-stat-card'>
          <span className='admin-stat-value'>{site.goods.length}</span>
          <span className='admin-stat-label'>Товарів</span>
          <span className='admin-stat-meta'>{visibleGoods} у каталозі</span>
        </div>
        <div className='admin-stat-card'>
          <span className='admin-stat-value'>{openLeads}</span>
          <span className='admin-stat-label'>Нові заявки</span>
          <span className='admin-stat-meta'>
            <Link href='/admin/leads'>відкрити журнал →</Link>
          </span>
        </div>
        <div className='admin-stat-card'>
          <span className='admin-stat-value'>{site.headerMenu.filter((m) => m.visible).length}</span>
          <span className='admin-stat-label'>Пунктів меню</span>
          <span className='admin-stat-meta'>{site.servicesNav.filter((m) => m.visible).length} у послугах</span>
        </div>
      </div>

      <div className='admin-card'>
        <h2 className='admin-h2'>Швидкі дії</h2>
        <div className='admin-row admin-row--wrap'>
          <Link href='/admin/leads' className='admin-btn'>
            Заявки{openLeads > 0 ? ` (${openLeads})` : ''}
          </Link>
          <Link href='/admin/pages' className='admin-btn'>
            Сторінки
          </Link>
          <Link href='/admin/goods' className='admin-btn'>
            Товари
          </Link>
          <Link href='/admin/media' className='admin-btn admin-btn--secondary'>
            Медіатека
          </Link>
          <Link href='/admin/menu' className='admin-btn admin-btn--secondary'>
            Меню
          </Link>
          <Link href='/admin/settings' className='admin-btn admin-btn--secondary'>
            Налаштування
          </Link>
          <Link href='/' className='admin-btn admin-btn--secondary' target='_blank'>
            Відкрити сайт ↗
          </Link>
        </div>
      </div>

      <div className='admin-card'>
        <h2 className='admin-h2'>Live health (Keen DNS / Docker)</h2>
        <HealthPanel />
      </div>

      <div className='admin-card'>
        <h2 className='admin-h2'>Конфіг (env)</h2>
        <ul className='admin-checklist'>
          <li className={strongPassword ? 'is-ok' : 'is-warn'}>
            {strongPassword ? '✓' : '!'} Пароль адмінки
            {!strongPassword ? ' — змініть ADMIN_PASSWORD (не changeme, ≥8 символів)' : ''}
          </li>
          <li className={hasSessionSecret ? 'is-ok' : 'is-warn'}>
            {hasSessionSecret ? '✓' : '!'} SESSION_SECRET
            {!hasSessionSecret ? ' — задайте окремий секрет для cookie' : ''}
          </li>
          <li className={cookieSecure === 'false' || cookieSecure === undefined ? 'is-ok' : 'is-info'}>
            COOKIE_SECURE={cookieSecure ?? '(auto)'}
            {cookieSecure !== 'false' ? ' — для HTTP через Keen DNS зазвичай false' : ' (OK для HTTP у LAN)'}
          </li>
          <li className={smtpConfigured ? 'is-ok' : 'is-warn'}>
            {smtpConfigured ? '✓' : '!'} SMTP
            {!smtpConfigured ? ' — email вимкнено; заявки все одно в /admin/leads' : ''}
          </li>
          <li className={process.env.ADMIN_IP_ALLOWLIST ? 'is-ok' : 'is-info'}>
            {process.env.ADMIN_IP_ALLOWLIST
              ? `✓ ADMIN_IP_ALLOWLIST активний`
              : 'ADMIN_IP_ALLOWLIST порожній — адмінка доступна з будь-якої IP (лише пароль)'}
          </li>
        </ul>
      </div>
    </AdminShell>
  );
}
