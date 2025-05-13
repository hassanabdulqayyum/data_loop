/*
useAuthStore.js – Tiny global store that remembers the JWT.

Why we need it:
• React components across different routes (CanvasView, etc.) need to know
  whether the user is logged in and what token to attach to fetch requests.
• zustand is a 1-kb state-library that avoids the boiler-plate of Redux.

Public API:
• token – current JWT string or null.
• setToken(token) – saves token to state *and* localStorage.jwt.
*/

import { create } from 'zustand';

const useAuthStore = create((set) => ({
  token: typeof localStorage !== 'undefined' ? localStorage.getItem('jwt') : null,
  setToken: (token) => {
    if (token) {
      localStorage.setItem('jwt', token);
    } else {
      localStorage.removeItem('jwt');
    }
    set({ token });
  }
}));

export default useAuthStore; 