import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Admin | Proper Service',
  robots: 'noindex',
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headerStore = await headers();
  // Set by middleware for protected /admin/* routes (not login)
  const pathname = headerStore.get('x-admin-pathname') || '';

  // Login page: middleware does not set x-admin-pathname
  if (!pathname) {
    return children;
  }

  const ok = await getSession();
  if (!ok) {
    redirect(`/admin/login?from=${encodeURIComponent(pathname)}`);
  }

  return children;
}
