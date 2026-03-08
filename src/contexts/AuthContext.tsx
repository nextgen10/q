'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { API_ROOT } from '@/utils/apiBase';

interface AppSession {
    app_id: string;
    app_name: string;
    api_key: string;
    owner_email?: string;
}

interface AuthContextValue {
    session: AppSession | null;
    login: (apiKey: string) => Promise<void>;
    register: (appName: string, ownerEmail: string) => Promise<AppSession>;
    logout: () => void;
    isAuthenticated: boolean;
    getAuthHeaders: () => Record<string, string>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_KEY = 'nexus_eval_session';
const APP_NAME_REGEX = /^[A-Za-z0-9]{1,15}$/;
const API_BASE = `${API_ROOT}/agent-eval`;

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<AppSession | null>(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(SESSION_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed?.app_id && parsed?.api_key) {
                    setSession(parsed);
                }
            }
        } catch {
            localStorage.removeItem(SESSION_KEY);
        }
        setLoaded(true);
    }, []);

    useEffect(() => {
        const onStorageChange = (e: StorageEvent) => {
            if (e.key === SESSION_KEY) {
                if (!e.newValue) {
                    setSession(null);
                } else {
                    try {
                        const parsed = JSON.parse(e.newValue);
                        if (parsed?.app_id && parsed?.api_key) {
                            setSession(parsed);
                        }
                    } catch {
                        setSession(null);
                    }
                }
            }
        };
        window.addEventListener('storage', onStorageChange);
        return () => window.removeEventListener('storage', onStorageChange);
    }, []);

    const persistSession = useCallback((s: AppSession | null) => {
        setSession(s);
        if (s) {
            localStorage.setItem(SESSION_KEY, JSON.stringify(s));
        } else {
            localStorage.removeItem(SESSION_KEY);
        }
    }, []);

    const login = useCallback(async (apiKey: string) => {
        const res = await fetch(`${API_BASE}/apps/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: apiKey }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: 'Login failed' }));
            throw new Error(err.detail || 'Invalid API key');
        }
        const data = await res.json();
        persistSession({ ...data, api_key: apiKey });
    }, [persistSession]);

    const register = useCallback(async (appName: string, ownerEmail: string) => {
        const normalizedName = appName.trim();
        if (!APP_NAME_REGEX.test(normalizedName)) {
            throw new Error('Application name must be alphanumeric and up to 15 characters');
        }
        const res = await fetch(`${API_BASE}/apps/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ app_name: normalizedName, owner_email: ownerEmail }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
            throw new Error(err.detail || 'Registration failed');
        }
        const data = await res.json();
        return {
            app_id: data.app_id,
            app_name: data.app_name,
            api_key: data.api_key,
        } as AppSession;
    }, []);

    const logout = useCallback(() => {
        persistSession(null);
    }, [persistSession]);

    const getAuthHeaders = useCallback((): Record<string, string> => {
        if (!session?.api_key) return {};
        return { 'X-API-Key': session.api_key };
    }, [session]);

    const value = useMemo<AuthContextValue>(() => ({
        session,
        login,
        register,
        logout,
        isAuthenticated: !!session,
        getAuthHeaders,
    }), [session, login, register, logout, getAuthHeaders]);

    if (!loaded) return null;

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
