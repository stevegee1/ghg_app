import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppClient } from './AppClient';
import { AppErrorBoundary, initBrowserSentry } from './observability/browserSentry';
import './index.css';

void initBrowserSentry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <AppClient />
    </AppErrorBoundary>
  </React.StrictMode>
);
