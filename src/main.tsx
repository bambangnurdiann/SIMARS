import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress known benign library errors (jsPDF tries to overwrite read-only window properties)
const suppressBenignErrors = (msg: any) => {
  const message = typeof msg === 'string' ? msg : (msg?.message || '');
  return typeof message === 'string' && (
    message.includes('Cannot set property fetch') || 
    message.includes('fetch of #<Window>') ||
    message.includes('property fetch of') ||
    message.includes('read-only property fetch')
  );
};

const originalError = console.error;
console.error = (...args) => {
  if (suppressBenignErrors(args[0])) return;
  originalError.apply(console, args);
};

// Use capturing phase to catch the error before it bubbles up to the browser's default handler
window.addEventListener('error', (event) => {
  if (suppressBenignErrors(event.message) || suppressBenignErrors(event.error)) {
    event.stopImmediatePropagation();
    event.preventDefault();
    return true;
  }
}, true);

window.addEventListener('unhandledrejection', (event) => {
  if (suppressBenignErrors(event.reason)) {
    event.stopImmediatePropagation();
    event.preventDefault();
  }
}, true);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
