'use client';

import React from 'react';
import { Box } from '@mui/material';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import ThemeToggle from '@/components/ThemeToggle';
import AppIdentityBadge from '@/components/AppIdentityBadge';
import { useAuth } from '@/contexts/AuthContext';
import { UnifiedNavBar } from '@/components/UnifiedNavBar';

export default function PlaywrightPomLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session } = useAuth();

  return (
    <AuthGuard requiredAccess="PLAYWRIGHT_POM">
      <style>{`body { overflow: hidden !important; }`}</style>
      <Box sx={{
        display: 'flex', flexDirection: 'column',
        height: '100vh', overflow: 'hidden',
        bgcolor: 'background.default', color: 'text.primary',
      }}>
        <UnifiedNavBar
          title="PLAYWRIGHT COMPASS"
          items={[]}
          onLogoClick={() => router.push('/')}
          centerContent={
            // PomApp portals its icon-nav buttons into this div
            <Box
              id="pws-navbar-menus"
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
            minHeight: 0,
            px: 0,
            pt: 0,
            pb: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxWidth: '100%',
            mx: 'auto',
          }}
        >
          {children}
        </Box>
      </Box>
    </AuthGuard>
  );
}
