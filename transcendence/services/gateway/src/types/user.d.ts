// types/user.d.ts
export interface User {
  id: string | number | null;
  username: string | null;
  role: 'registered' | 'guest';
  isGuest?: boolean;
  jwt: string | null;
  authState: 'valid' | 'expired' | 'missing' | 'invalid';
}
