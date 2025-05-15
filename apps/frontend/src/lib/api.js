/*
api.js – One tiny helper so every component can call the back-end
without repeating the base URL or error handling every time.

How it works (plain English):
1. We read VITE_API_BASE_URL from Vite env.  If it's undefined we fall back to
   an empty string, which means the browser will call the same origin – this is
   handy for local dev when the API is proxied or running on the same port.
2. `apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ … }) })`
   automatically prefixes the path with the base URL and attaches
   `Content-Type: application/json` whenever a body is present.
3. If the response status is not OK (>=400) we parse the JSON and throw it so
   callers can decide how to show the error (toast, banner, etc.).

Example usage:
```js
import { apiFetch } from '../lib/api.js';
const data = await apiFetch('/hierarchy');
```
*/

export async function apiFetch(path, options = {}) {
  // Guard: `import.meta` is undefined in Jest (Node) so we fall back safely.
  const BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) || '';

  // Strip trailing slash on base and ensure path starts with single leading slash
  const normalizedBase = BASE.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // Ensure header defaults – merge any caller-supplied headers.
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${normalizedBase}${normalizedPath}`, { ...options, headers });

  // Try to parse JSON either way so error handling sees the message.
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // Throw an Error with fallback message so UI can toast it.
    const message = (data && data.error) || res.statusText || 'Request failed';
    throw new Error(message);
  }

  return data;
}

/**
 * getScript – Fetch the *current gold-path* for a given Persona.
 *
 * Plain-English behaviour:
 * • Makes a GET call to `/script/:personaId` and returns the JSON body.
 * • Requires a JWT so the request gets authorised by the backend.
 *
 * Example:
 * ```js
 * const { data } = await getScript('persona-123', token);
 * ```
 */
export async function getScript(personaId, token) {
  if (!personaId || !token) throw new Error('personaId and token are required');
  return apiFetch(`/script/${encodeURIComponent(personaId)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

/**
 * patchTurn – Save a *new* version under an existing Turn.
 *
 * • parentId – the Turn we are editing (becomes the parent of the new Turn).
 * • body – { text: 'new text', commit_message?: 'optional summary' }
 * • token – JWT string.
 *
 * Returns whatever the backend echoes (usually new Turn id & meta-data).
 */
export async function patchTurn(parentId, body, token) {
  if (!parentId || !body || !token) throw new Error('parentId, body and token are required');
  return apiFetch(`/turn/${encodeURIComponent(parentId)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  });
} 