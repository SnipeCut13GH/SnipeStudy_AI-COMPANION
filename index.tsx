import React from 'react';
import ReactDOM from 'react-dom/client';
// Fix: Correct import path for App component.
import App from './App.tsx';

// These styles are not provided but are assumed to exist for a modern web app.
// If not present, the app might not look as intended.
// import './index.css'; 

const rootEl = document.getElementById('root');
if (!rootEl) {
    throw new Error("Root element with id 'root' not found in the document.");
}

const root = ReactDOM.createRoot(rootEl);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register Service Worker for PWA functionality.
// This enables offline capabilities and allows the app to be "installed".
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }, err => {
      // Registration can fail in some development environments (e.g., cross-origin issues)
      // or if the user has disabled them. We log the error but don't break the app.
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}


// Add modal and tooltip portal roots if they don't exist.
if (!document.getElementById('modal-root')) {
    const modalRoot = document.createElement('div');
    modalRoot.id = 'modal-root';
    document.body.appendChild(modalRoot);
}

if (!document.getElementById('tooltip-root')) {
    const tooltipRoot = document.createElement('div');
    tooltipRoot.id = 'tooltip-root';
    document.body.appendChild(tooltipRoot);
}