import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/App';
// Written by the CLI from the project's config — Tailwind itself, the project's palette and what to
// scan. It has to come first, so the project's own rules can override a utility.
import './tailwind.entry.css';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
