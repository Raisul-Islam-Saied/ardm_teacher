/**
 * ARDM Enterprise ERP — Real-Time Browser & Backend Connectivity Hook
 * Tracks navigator.onLine events and allows on-demand backend server health checks.
 */

import { useState, useEffect, useCallback } from 'react';
import { checkBackendHealth } from '@api/axiosClient';

export function useNetworkStatus(autoPingBackend = false) {
    const [isBrowserOnline, setIsBrowserOnline] = useState(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );
    const [wasRecentlyOffline, setWasRecentlyOffline] = useState(false);
    const [backendHealth, setBackendHealth] = useState({
        checked: false,
        checking: false,
        online: false,
        latencyMs: null,
        statusText: 'যাচাই করা হয়নি'
    });

    const pingBackend = useCallback(async () => {
        setBackendHealth((prev) => ({ ...prev, checking: true }));
        const result = await checkBackendHealth();
        setBackendHealth({
            checked: true,
            checking: false,
            online: result.online,
            latencyMs: result.latencyMs,
            statusText: result.statusText,
            serverData: result.serverData || null
        });
        return result;
    }, []);

    useEffect(() => {
        let recoveryTimer = null;

        const handleOnline = () => {
            setIsBrowserOnline(true);
            setWasRecentlyOffline(true);
            if (autoPingBackend) {
                pingBackend();
            }
            recoveryTimer = setTimeout(() => {
                setWasRecentlyOffline(false);
            }, 4000);
        };

        const handleOffline = () => {
            setIsBrowserOnline(false);
            setWasRecentlyOffline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        if (autoPingBackend) {
            pingBackend();
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            if (recoveryTimer) clearTimeout(recoveryTimer);
        };
    }, [autoPingBackend, pingBackend]);

    return {
        isBrowserOnline,
        wasRecentlyOffline,
        backendHealth,
        pingBackend
    };
}
