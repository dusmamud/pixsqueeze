import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import './lib/i18n';
import './index.css';
import 'react-image-crop/dist/ReactCrop.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <BrowserRouter><ErrorBoundary><App /></ErrorBoundary></BrowserRouter>
    </MotionConfig>
  </React.StrictMode>,
);
