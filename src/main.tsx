import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/app.css';
import { Provider } from './lib/store';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider><App /></Provider>
  </React.StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined);
  });
}
