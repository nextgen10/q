/**
 * Shared API base URL resolution.
 * Single source of truth for all features (agent-eval, rag-eval, auth).
 */
let rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

if (!rawUrl.startsWith('http')) {
    if (!rawUrl.includes('.') && !rawUrl.includes(':')) {
        rawUrl += '.onrender.com';
    }
    rawUrl = `https://${rawUrl}`;
}

export const API_ROOT = rawUrl;
