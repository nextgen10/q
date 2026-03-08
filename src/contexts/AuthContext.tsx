'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { API_ROOT } from '@/utils/apiBase';

interface AppSession {
    app_id: string;
    app_name: string;
    api_key: string;
    username?: string;
    requested_access?: 'RAG_EVAL' | 'AGENT_EVAL' | 'GROUND_TRUTH' | 'PLAYWRIGHT_POM' | 'ALL';
    owner_email?: string;
}

interface AuthContextValue {
    session: AppSession | null;
    login: (username: string, password: string) => Promise<void>;
    register: (username: string, password: string, ownerEmail: string, requestedAccess: AppSession['requested_access']) => Promise<AppSession>;
    generateApiKey: () => Promise<string>;
    logout: () => void;
    isAuthenticated: boolean;
    getAuthHeaders: () => Record<string, string>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_KEY = 'nexus_eval_session';
const USERNAME_REGEX = /^[A-Za-z0-9]{1,32}$/;
const API_BASE = `${API_ROOT}/agent-eval`;

function toErrorMessage(detail: unknown, fallback: string): string {
    if (!detail) return fallback;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
        const messages = detail
            .map((item) => {
                if (typeof item === 'string') return item;
                if (item && typeof item === 'object' && 'msg' in item) {
                    return String((item as { msg?: unknown }).msg ?? '');
                }
                return '';
            })
            .filter(Boolean);
        return messages.length ? messages.join('; ') : fallback;
    }
    if (typeof detail === 'object') {
        if ('msg' in detail) {
            return String((detail as { msg?: unknown }).msg ?? fallback);
        }
        if ('message' in detail) {
            return String((detail as { message?: unknown }).message ?? fallback);
        }
    }
    return fallback;
}

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

    const login = useCallback(async (username: string, password: string) => {
        const res = await fetch(`${API_BASE}/apps/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(toErrorMessage(err?.detail, 'Invalid username or password'));
        }
        const data = await res.json();
        persistSession({
            app_id: data.app_id,
            app_name: data.app_name,
            api_key: data.api_key,
            username: data.username,
            requested_access: data.requested_access || 'ALL',
            owner_email: data.owner_email,
        });
    }, [persistSession]);

    const register = useCallback(async (username: string, password: string, ownerEmail: string, requestedAccess: AppSession['requested_access']) => {
        const normalizedUsername = username.trim();
        if (!USERNAME_REGEX.test(normalizedUsername)) {
            throw new Error('Username must be alphanumeric and up to 32 characters');
        }
        if (!password || password.length < 4) {
            throw new Error('Password must be at least 4 characters');
        }
        const res = await fetch(`${API_BASE}/apps/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: normalizedUsername,
                password,
                owner_email: ownerEmail,
                requested_access: requestedAccess || 'ALL',
            }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(toErrorMessage(err?.detail, 'Registration failed'));
        }
        const data = await res.json();
        return {
            app_id: data.app_id,
            app_name: data.app_name,
            api_key: data.api_key,
            username: data.username,
            requested_access: data.requested_access || 'ALL',
            owner_email: ownerEmail,
        } as AppSession;
    }, []);

    const logout = useCallback(() => {
        persistSession(null);
    }, [persistSession]);

    const generateApiKey = useCallback(async (): Promise<string> => {
        if (!session?.app_id || !session?.api_key) {
            throw new Error('No active session found');
        }
        const res = await fetch(`${API_BASE}/apps/${session.app_id}/rotate-key`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': session.api_key,
            },
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(toErrorMessage(err?.detail, 'Failed to generate API key'));
        }
        const data = await res.json();
        const nextSession: AppSession = {
            ...session,
            api_key: data.api_key,
        };
        persistSession(nextSession);
        return data.api_key;
    }, [session, persistSession]);

    const getAuthHeaders = useCallback((): Record<string, string> => {
        if (!session?.api_key) return {};
        return { 'X-API-Key': session.api_key };
    }, [session]);

    const value = useMemo<AuthContextValue>(() => ({
        session,
        login,
        register,
        generateApiKey,
        logout,
        isAuthenticated: !!session,
        getAuthHeaders,
    }), [session, login, register, generateApiKey, logout, getAuthHeaders]);

    if (!loaded) return null;

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
