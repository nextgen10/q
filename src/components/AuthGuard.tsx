'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

type AccessKey = 'RAG_EVAL' | 'AGENT_EVAL' | 'GROUND_TRUTH' | 'PLAYWRIGHT_POM' | 'ALL';

export default function AuthGuard({ children, requiredAccess }: { children: React.ReactNode; requiredAccess?: AccessKey }) {
    const { isAuthenticated, session } = useAuth();
    const router = useRouter();
    const hasAccess = !requiredAccess
        || session?.requested_access === 'ALL'
        || session?.requested_access === requiredAccess;

    useEffect(() => {
        if (!isAuthenticated) {
            router.replace('/login');
            return;
        }
        if (!hasAccess) {
            router.replace('/');
        }
    }, [isAuthenticated, hasAccess, router]);

    if (!isAuthenticated || !hasAccess) return null;

    return <>{children}</>;
}
