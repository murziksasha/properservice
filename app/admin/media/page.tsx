import { AdminShell } from '@/components/admin/AdminShell';
import { MediaLibrary } from '@/components/admin/MediaLibrary';

export const dynamic = 'force-dynamic';

export default function AdminMediaPage() {
  return (
    <AdminShell>
      <h1>Медіатека</h1>
      <p className='admin-hint admin-mb-lg'>
        Файли з <code>public/uploads/</code>. Великі зображення зменшуються до 1920px. JPEG
        конвертується в WebP; PNG (логотипи, іконки) залишаються PNG. GIF без змін.
      </p>
      <MediaLibrary />
    </AdminShell>
  );
}
