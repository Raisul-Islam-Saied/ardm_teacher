import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import GlobalErrorBoundary from '@components/shared/GlobalErrorBoundary.jsx';
import OfflineBanner from '@components/shared/OfflineBanner.jsx';
import { ToastProvider } from '@context/ToastContext.jsx';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <GlobalErrorBoundary>
            <ToastProvider>
                <OfflineBanner />
                <App />
            </ToastProvider>
        </GlobalErrorBoundary>
    </React.StrictMode>
);
