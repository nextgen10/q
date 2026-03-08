'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Interaction page removed - redirect to dashboard.
 */
export default function AgentInteractionRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/agent-eval/dashboard');
    }, [router]);
    return null;
}
