/** Client-safe role helpers (no Node fs/crypto). */

export type AdminRole = 'owner' | 'editor' | 'operator';

/** Role permissions for admin routes / UI. */
export function roleCan(role: AdminRole | 'legacy', action: string): boolean {
  if (role === 'legacy' || role === 'owner') return true;
  if (role === 'editor') {
    // Full content + ops except multi-user security & restore
    return !['users', 'security_owner', 'restore_backup'].includes(action);
  }
  // operator: inbox / journals / dashboard only (no content/media/settings)
  const operatorOk = new Set(['inbox', 'leads', 'orders', 'dashboard_view', 'activity', 'stats', 'clients']);
  return operatorOk.has(action);
}

/** Nav hrefs allowed for role (prefix match on /admin paths). */
export function navAllowedForRole(role: AdminRole | 'legacy', href: string): boolean {
  if (role === 'legacy' || role === 'owner' || role === 'editor') return true;
  // operator
  const allowed = [
    '/admin',
    '/admin/inbox',
    '/admin/leads',
    '/admin/orders',
    '/admin/clients',
    '/admin/activity',
    '/admin/ops',
  ];
  if (href === '/admin') return true;
  return allowed.some(p => p !== '/admin' && (href === p || href.startsWith(`${p}/`)));
}
