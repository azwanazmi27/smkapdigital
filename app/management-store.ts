import { env } from 'cloudflare:workers';
export function managementStore(){return {db:env.DB};}
