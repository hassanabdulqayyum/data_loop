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
  const BASE = import.meta.env.VITE_API_BASE_URL || '';

  // Ensure header defaults – merge any caller-supplied headers.
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  // Try to parse JSON either way so error handling sees the message.
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // Throw an Error with fallback message so UI can toast it.
    const message = (data && data.error) || res.statusText || 'Request failed';
    throw new Error(message);
  }

  return data;
} 