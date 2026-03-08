/**
 * Wrapper around fetch() that automatically injects the X-API-Key header
 * from the active Qualaris session stored in localStorage.
 * Handles 401 responses by clearing the session and redirecting to /login.
 */

const SESSION_KEY = 'nexus_eval_session';

function getStoredApiKey(): string | null {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed?.api_key || null;
    } catch {
        return null;
    }
}

function clearSessionAndRedirect() {
    localStorage.removeItem(SESSION_KEY);
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
    }
}

export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const apiKey = getStoredApiKey();
    const headers = new Headers(init?.headers);
    if (apiKey) {
        headers.set('X-API-Key', apiKey);
    }
    const response = await fetch(input, { ...init, headers });

    if (response.status === 401) {
        clearSessionAndRedirect();
    }

    return response;
}
