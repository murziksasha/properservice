import { AdminShell } from '@/components/admin/AdminShell';
import { MediaLibrary } from '@/components/admin/MediaLibrary';

export const dynamic = 'force-dynamic';

export default function AdminMediaPage() {
  return (
    <AdminShell>
      <h1>Медіатека</h1>
      <p className='admin-hint admin-mb-lg'>
        Файли з <code>public/uploads/</code>. При upload — resize ≤1920px і WebP.
      </p>
      <MediaLibrary />
    </AdminShell>
  );
}
