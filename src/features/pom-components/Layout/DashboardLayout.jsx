import React from 'react';
import { Sidebar } from './Sidebar';
import { useSidebar } from '@/contexts/SidebarContext';
import { Box } from '@mui/material';

export function DashboardLayout({ children, currentView, setView, setShowLanding }) {
    const { sidebarWidth } = useSidebar();

    return (
        <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
            <Sidebar currentView={currentView} setView={setView} setShowLanding={setShowLanding} />

            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    ml: `${sidebarWidth}px`,
                    height: '100%',
                    overflow: 'hidden',
                    position: 'relative',
                    zIndex: 10,
                    transition: 'margin-left 0.3s ease-in-out',
                }}
            >
                {children}
            </Box>
        </Box>
    );
}

