import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress known benign library errors
const originalError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('Cannot set property fetch of #<Window>')) return;
  originalError.apply(console, args);
};

window.addEventListener('error', (event) => {
  if (event.error?.message?.includes('Cannot set property fetch of #<Window>')) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
