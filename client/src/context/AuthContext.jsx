/**
 * ARDM Enterprise ERP — Role-Based Authentication & Session Context
 * - Instant non-blocking boot from localStorage (Zero stuck loading screen)
 * - Single background /auth/me verification on mount (No infinite loop)
 */

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo
} from 'react';
import axiosClient, {
    TOKEN_STORAGE_KEY,
    USER_STORAGE_KEY,
    clearAuthSessionStorage
} from '@api/axiosClient';

export const SYSTEM_ROLES = Object.freeze({
    SUPER_ADMIN: 'SuperAdmin',
    ADMIN: 'Admin',
    TEACHER: 'Teacher'
});

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => {
        try {
            return localStorage.getItem(TOKEN_STORAGE_KEY);
        } catch (e) {
            return null;
        }
    });
    const [user, setUser] = useState(null);
    const [isInitializing, setIsInitializing] = useState(true);

    useEffect(() => {
        let isMounted = true;
        if (!token) {
            setIsInitializing(false);
            return () => {
                isMounted = false;
            };
        }

        axiosClient
            .get('/auth/me')
            .then((res) => {
                if (!isMounted) return;
                const serverUser =
                    res?.data?.data?.teacher ||
                    res?.data?.data?.user ||
                    res?.data?.data;

                if (serverUser && (serverUser._id || serverUser.teacherCode)) {
                    setUser(serverUser);
                    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(serverUser));
                } else {
                    clearAuthSessionStorage();
                    setToken(null);
                }
            })
            .catch(() => {
                if (!isMounted) return;
                clearAuthSessionStorage();
                setToken(null);
                setUser(null);
            })
            .finally(() => {
                if (isMounted) setIsInitializing(false);
            });

        return () => {
            isMounted = false;
        };
    }, [token]);

    const establishSession = useCallback((userObj, jwtToken) => {
        if (!userObj || !jwtToken) {
            throw new Error('সার্ভার থেকে বৈধ লগইন সেশন পাওয়া যায়নি।');
        }
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userObj));
        localStorage.setItem(TOKEN_STORAGE_KEY, jwtToken);
        setUser(userObj);
        setToken(jwtToken);
    }, []);

    const logout = useCallback(async () => {
        try {
            await axiosClient.post('/auth/logout').catch(() => {});
        } finally {
            clearAuthSessionStorage();
            setUser(null);
            setToken(null);
        }
    }, []);

    const refreshProfile = useCallback(async () => {
        const res = await axiosClient.get('/auth/me');
        const serverUser =
            res?.data?.data?.teacher ||
            res?.data?.data?.user ||
            res?.data?.data;
        if (!serverUser || !(serverUser._id || serverUser.teacherCode)) {
            throw new Error('সার্ভার থেকে বৈধ প্রোফাইল পাওয়া যায়নি।');
        }
        setUser(serverUser);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(serverUser));
    }, []);

    const contextValue = useMemo(() => {
        const currentRole = user?.role || null;
        const isSuperAdmin = currentRole === SYSTEM_ROLES.SUPER_ADMIN;
        const isAdmin = isSuperAdmin || currentRole === SYSTEM_ROLES.ADMIN;
        const isTeacher = currentRole === SYSTEM_ROLES.TEACHER;
        const defaultDashboardPath = isAdmin ? '/admin/dashboard' : '/teacher/portal';

        return {
            user,
            token,
            isAuthenticated: Boolean(user),
            isInitializing,
            isCheckingSession: isInitializing,
            defaultDashboardPath,
            role: currentRole,
            isSuperAdmin,
            isAdmin,
            isTeacher,
            establishSession,
            logout,
            refreshProfile
        };
    }, [
        user,
        token,
        isInitializing,
        establishSession,
        logout,
        refreshProfile
    ]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used inside an <AuthProvider>');
    }
    return ctx;
}

export default AuthContext;
