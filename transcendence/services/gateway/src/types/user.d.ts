import type { FastifyPluginAsync, FastifyRequest } from 'fastify'

interface UserContext {
  id: string | null;
  username: string | null;
  role: 'registered' | 'unregistered'  ;
  jwt: string | null;
  isGuest?: boolean | undefined;
  authState?: 'valid' | 'expired' | 'invalid' | 'new' ;
};
