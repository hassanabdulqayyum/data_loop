/*
main.jsx – Boots our React app when the browser first loads the page.

Example usage (happens automatically):
1. You run `npm run dev`.
2. Vite serves index.html which includes `main.jsx` as the script.
3. This file renders the <App /> component inside the #root div.
*/

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import App from './App.jsx';

// Grab the placeholder <div id="root"></div> that lives in index.html.
const rootElement = document.getElementById('root');

// React 18's createRoot API – more performant concurrent rendering.
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    {/* BrowserRouter gives us client-side routing (no full-page reloads). */}
    <BrowserRouter>
      <App />
      {/* Toaster is a global slot; any component can trigger a toast. */}
      <Toaster position="top-right" />
    </BrowserRouter>
  </React.StrictMode>
); 