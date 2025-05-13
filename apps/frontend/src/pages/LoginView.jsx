/*
LoginView.jsx – Simple email / password form that talks to the back-end.

UPDATE 2025-05-13 (Flow-1 2.6.1 visual polish)
———————————————————————————————————————————
• Font switched to **Inter** (imported globally in `index.html`).
• Page now uses a clean white canvas with the form centred exactly like the
  1440 × 1024 Figma frame.
• Header text changed from project name to a plain **"Login"** title so the
  focus remains on the action a visitor expects to take.
• Added a subtle "Forgot password?" link beneath the primary button—this is a
  non-functional placeholder for now but completes the familiar login layout.
• Button colour updated to solid black `#131413` with white text to mirror the
  design.  Disabled state drops the opacity to 60 % so users immediately know
  why they cannot click.

Example usage (manual):
```
<BrowserRouter>
  <Routes>
    <Route path="/login" element={<LoginView />} />
  </Routes>
</BrowserRouter>
```
*/

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/useAuthStore.js';
import { apiFetch } from '../lib/api.js';

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
      const { token } = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      setToken(token); // Save into zustand + localStorage.
      toast.success('Logged in successfully');
      // TODO: navigate to CanvasView once it exists.
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Pre-compute simple flags to keep the JSX tidy below.
  const formIncomplete = !email.trim() || !password.trim();

  /* Inline CSS object reused so we don't repeat colour literals */
  const colours = {
    black: '#131413',
    greyText: '#373639',
    greyBorder: '#CCCCCC'
  };

  return (
    /*
     * A single flexbox container vertically and horizontally centres the
     * narrow card in the middle of the 1440 × 1024 desktop frame. This keeps
     * the code responsive without extra CSS files.
     */
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ffffff'
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 360,
          padding: '0 1rem',
          textAlign: 'center'
        }}
      >
        {/* Title */}
        <h1 style={{ marginBottom: '2rem', fontSize: 48, fontWeight: 600 }}>
          Login
        </h1>

        {/* Email textbox */}
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              border: `1px solid ${colours.greyBorder}`,
              borderRadius: 6,
              fontSize: 26
            }}
            required
          />
        </div>

        {/* Password textbox */}
        <div style={{ marginBottom: '1.5rem' }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              border: `1px solid ${colours.greyBorder}`,
              borderRadius: 6,
              fontSize: 26
            }}
            required
          />
        </div>

        {/* Primary action */}
        <button
          type="submit"
          disabled={loading || formIncomplete}
          style={{
            width: '100%',
            padding: '0.9rem',
            background: colours.black,
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 32,
            fontWeight: 600,
            cursor: loading || formIncomplete ? 'not-allowed' : 'pointer',
            opacity: loading || formIncomplete ? 0.6 : 1,
            transition: 'opacity 0.2s'
          }}
        >
          {loading ? 'Logging in…' : 'Login'}
        </button>

        {/* Forgot password */}
        <div style={{ marginTop: '1rem' }}>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            style={{
              fontSize: 26,
              color: colours.greyText,
              textDecoration: 'none'
            }}
          >
            Forgot password?
          </a>
        </div>
      </form>

      {/* Placeholder colour via scoped style so JSX doesn't need pseudo-element hacks */}
      <style>{`
        input::placeholder {
          color: ${colours.greyText};
          letter-spacing: -0.05em;
        }
      `}</style>
    </div>
  );
}

export default LoginView; 