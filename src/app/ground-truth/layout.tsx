'use client';

import React from 'react';
import { Box } from '@mui/material';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import ThemeToggle from '@/components/ThemeToggle';
import AppIdentityBadge from '@/components/AppIdentityBadge';
import { useAuth } from '@/contexts/AuthContext';
import { UnifiedNavBar } from '@/components/UnifiedNavBar';

export default function GroundTruthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session } = useAuth();

  return (
    <AuthGuard requiredAccess="GROUND_TRUTH">
      <Box sx={{
        display: 'flex', flexDirection: 'column',
        height: '100vh', overflow: 'hidden',
        bgcolor: 'background.default', color: 'text.primary',
      }}>
        <UnifiedNavBar
          title="GROUND TRUTH GENERATOR"
          items={[]}
          onLogoClick={() => router.push('/')}
          centerContent={
            // JsonEditor portals its toolbar controls into this div
            <Box
              id="gt-navbar-menus"
              sx={{
                display: 'flex',
                alignItems: 'center',
                minHeight: 40,
                maxWidth: '64vw',
                minWidth: 0,
                flexShrink: 1,
                overflow: 'visible',
              }}
            />
          }
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
            py: 2,
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
    </AuthGuard>
  );
}
