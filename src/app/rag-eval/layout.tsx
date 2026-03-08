'use client';

import React, { Suspense } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { Box } from '@mui/material';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LayoutDashboard, Activity, History, Settings, FileText } from 'lucide-react';
import { UnifiedNavBar } from '@/components/UnifiedNavBar';
import ThemeToggle from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import AppIdentityBadge from '@/components/AppIdentityBadge';

function RAGEvalNav() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { session } = useAuth();
    const view = searchParams.get('view') || 'insights';

    const items = [
        { id: 'insights', label: 'Dashboard', icon: <LayoutDashboard size={16} />, onClick: () => router.push('/rag-eval?view=insights') },
        { id: 'drilldown', label: 'Experiments', icon: <Activity size={16} />, onClick: () => router.push('/rag-eval?view=drilldown') },
        { id: 'history', label: 'History', icon: <History size={16} />, onClick: () => router.push('/rag-eval?view=history') },
        { id: 'prompts', label: 'Prompts', icon: <FileText size={16} />, onClick: () => router.push('/rag-eval/prompts') },
        { id: 'config', label: 'Configuration', icon: <Settings size={16} />, onClick: () => router.push('/rag-eval?view=config') },
    ].map((item) => ({
        ...item,
        active: item.id === 'prompts'
            ? pathname === '/rag-eval/prompts'
            : pathname === '/rag-eval' && view === item.id,
    }));

    return (
        <UnifiedNavBar
            title="RAG EVAL"
            items={items}
            onLogoClick={() => router.push('/')}
            actions={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {session && <AppIdentityBadge appName={session.app_name} appId={session.app_id} />}
                    <ThemeToggle />
                </Box>
            }
        />
    );
}

export default function RAGEvalLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthGuard requiredAccess="RAG_EVAL">
            <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary' }}>
                <Suspense fallback={null}>
                    <RAGEvalNav />
                </Suspense>
                {children}
            </Box>
        </AuthGuard>
    );
}
