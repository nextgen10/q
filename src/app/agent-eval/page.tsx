'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AgentEvalIndexPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/agent-eval/dashboard');
    }, [router]);

    return null;
}
