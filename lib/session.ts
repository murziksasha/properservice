export const SESSION_COOKIE = 'admin_session';

export const SESSION_TOKEN =
  '489359261382c0e0e6a60401d1c9234627b54609b865e81f9e747fff6fac61f4';

export function isValidSession(session: string | undefined): boolean {
  return session === SESSION_TOKEN;
}