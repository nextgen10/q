'use client';

import React from 'react';
import { Box } from '@mui/material';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    Activity,
    Settings,
    History,
    FileText,
} from 'lucide-react';

import CopyProtection from '@/features/agent-eval/components/CopyProtection';
import { EvaluationProvider } from '@/features/agent-eval/contexts/EvaluationContext';
import ThemeToggle from '@/components/ThemeToggle';
import { UnifiedNavBar } from '../../components/UnifiedNavBar';
import { agentEvalNavItems } from '../../config/nav';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import AppIdentityBadge from '@/components/AppIdentityBadge';

export default function AgentEvalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { session } = useAuth();

    const menuItems = agentEvalNavItems.map((item) => ({
        id: item.path,
        label: item.label,
        icon: item.id === 'dashboard' ? <LayoutDashboard size={16} /> :
              item.id === 'test-evaluations' ? <Activity size={16} /> :
              item.id === 'configuration' ? <Settings size={16} /> :
              item.id === 'prompts' ? <FileText size={16} /> :
              <History size={16} />,
        path: item.path,
    }));

    return (
        <AuthGuard>
        <EvaluationProvider>
            <CopyProtection />
            <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary' }}>
            <UnifiedNavBar
                    title="AGENT EVAL"
                    items={menuItems.map(item => ({
                        id: item.id,
                        label: item.label,
                        icon: item.icon,
                        active: pathname === item.path || pathname.startsWith(item.path + '/'),
                        onClick: () => router.push(item.path)
                    }))}
                    onLogoClick={() => router.push('/')}
                    actions={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {session && <AppIdentityBadge appName={session.app_name} appId={session.app_id} />}
                            <ThemeToggle />
                        </Box>
                    }
                />

                <Box
                    component="main"
                    sx={{
                        width: '100%',
                        flexGrow: 1,
                        px: { xs: 2, md: 3 },
                        pb: 2,
                        pt: 2,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        maxWidth: 1536,
                        mx: 'auto',
                    }}
                >
                    {children}
                </Box>
            </Box>
        </EvaluationProvider>
        </AuthGuard>
    );
}
