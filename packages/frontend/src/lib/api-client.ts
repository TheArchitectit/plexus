import createClient from 'openapi-fetch';
import type { paths, components } from './management.d.ts';

const API_BASE = '/v0';

const client = createClient<paths>({
  baseUrl: API_BASE,
});

client.use({
  async onRequest({ request }) {
    const adminKey = localStorage.getItem('plexus_admin_key');
    if (adminKey) {
      request.headers.set('Authorization', `Bearer ${adminKey}`);
    }
    return request;
  },
  async onResponse({ response }) {
    if (response.status === 401) {
      localStorage.removeItem('plexus_admin_key');
      if (window.location.pathname !== '/ui/login') {
        window.location.href = '/ui/login';
      }
    }
    return response;
  },
});

export { client };

export type { paths, components };
