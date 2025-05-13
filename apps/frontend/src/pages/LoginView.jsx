/*
LoginView.jsx – Simple email / password form that talks to the back-end.

How it works in plain words:
1. User types email + password and hits the **Login** button.
2. We send a POST request to `/auth/login` (same origin; Vercel rewrites).
3. If the response is `{ token }`, we save it to localStorage so future API
   calls include the JWT automatically (done later with a fetch helper).
4. We also put the user into our tiny zustand store so React components know
   the user is authenticated and can redirect to the main CanvasView.
5. On error we show a toast in the corner with a human-friendly message.

Example manual test:
• Run the API server locally (`npm --workspace apps/api-server run dev`).
• In another shell, `npm --workspace apps/frontend run dev`.
• Open http://localhost:5173 and login with the demo credentials given in the
  implementation plan (demo@acme.test / pass123).
*/

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/useAuthStore.js';

function LoginView() {
  // Local state for the two form fields.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Pull the login action from our global store.
  const { setToken } = useAuthStore();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        // Backend sends JSON { error: "…" }
        const { error } = await res.json();
        throw new Error(error || 'Login failed');
      }

      const { token } = await res.json();
      setToken(token); // Save into zustand + localStorage.
      toast.success('Logged in successfully');
      // TODO: navigate to CanvasView once it exists.
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '10vh auto', textAlign: 'center' }}>
      <h1>Flow 1 Dataset Editor</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '0.75rem' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '0.5rem' }}
            required
          />
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '0.5rem' }}
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: '#6366f1',
            color: '#fff',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Logging in…' : 'Login'}
        </button>
      </form>
    </div>
  );
}

export default LoginView; 