'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_BASE_URL } from '../utils/config';
import { authFetch } from '../utils/authFetch';

let hasFetchedLatestResultOnce = false;
const LATEST_RESULT_FETCH_TS_KEY = 'agent_eval_latest_result_fetch_ts';
const LATEST_RESULT_FETCH_COOLDOWN_MS = 15000;

interface EvaluationContextType {
    latestResult: any;
    loading: boolean;
    refreshLatestResult: () => Promise<void>;
}

const EvaluationContext = createContext<EvaluationContextType | undefined>(undefined);

export function EvaluationProvider({ children }: { children: ReactNode }) {
    const [latestResult, setLatestResult] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchLatestResult = async (force = false) => {
        try {
            if (!force && typeof window !== 'undefined') {
                const lastTsRaw = sessionStorage.getItem(LATEST_RESULT_FETCH_TS_KEY);
                const lastTs = lastTsRaw ? Number(lastTsRaw) : 0;
                if (lastTs > 0 && Date.now() - lastTs < LATEST_RESULT_FETCH_COOLDOWN_MS) {
                    return;
                }
                sessionStorage.setItem(LATEST_RESULT_FETCH_TS_KEY, String(Date.now()));
            }
            const res = await authFetch(`${API_BASE_URL}/latest-result`);
            if (!res.ok) return;
            const data = await res.json();
            if (data && data.result) {
                setLatestResult(data.result);
            }
        } catch (err) {
            console.error("Failed to fetch latest result:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (hasFetchedLatestResultOnce) {
            setLoading(false);
            return;
        }
        hasFetchedLatestResultOnce = true;
        fetchLatestResult();
    }, []);

    const refreshLatestResult = async () => {
        await fetchLatestResult(true);
    };

    return (
        <EvaluationContext.Provider value={{ latestResult, loading, refreshLatestResult }}>
            {children}
        </EvaluationContext.Provider>
    );
}

export function useEvaluation() {
    const context = useContext(EvaluationContext);
    if (context === undefined) {
        throw new Error('useEvaluation must be used within an EvaluationProvider');
    }
    return context;
}
