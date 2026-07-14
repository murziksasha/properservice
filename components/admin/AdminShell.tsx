import { AdminNav } from './AdminNav';
import { AdminToastHost } from './AdminToast';

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className='admin-body'>
      <div className='admin-shell'>
        <AdminNav />
        <main className='admin-main'>{children}</main>
      </div>
      <AdminToastHost />
    </div>
  );
}
