import { AdminShell } from '@/components/admin/AdminShell';
import { getSiteData } from '@/lib/site-data';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const site = await getSiteData();

  return (
    <AdminShell>
      <h1>Dashboard</h1>
      <div className="admin-card">
        <p>Сторінок: {site.pages.length}</p>
        <p>Товарів: {site.goods.length}</p>
        <p>Пунктів меню: {site.headerMenu.length}</p>
      </div>
      <div className="admin-row">
        <Link href="/" className="admin-btn admin-btn--secondary" target="_blank">Відкрити сайт</Link>
        <Link href="/admin/pages" className="admin-btn">Редактор сторінок</Link>
        <Link href="/admin/goods" className="admin-btn">Товари</Link>
      </div>
    </AdminShell>
  );
}