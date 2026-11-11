import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import './lib/i18n';
import './index.css';
import 'react-image-crop/dist/ReactCrop.css';
// NOTE: sonner's stylesheet is NOT imported here on purpose — its JS
// injects the styles itself at import time (__insertCSS in dist/index.mjs),
// so a manual `import 'sonner/dist/styles.css'` would ship the same rules
// twice. The build-time prerender stub (scripts/prerender.ts) provides the
// `document.head` / `createTextNode` the injection touches in Node.
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <BrowserRouter><ErrorBoundary><App /></ErrorBoundary></BrowserRouter>
    </MotionConfig>
  </React.StrictMode>,
);
