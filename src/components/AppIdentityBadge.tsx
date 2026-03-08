'use client';

import React, { useState } from 'react';
import {
    Box, Typography, Menu, MenuItem, ListItemIcon, ListItemText,
    Chip, alpha, useTheme, Divider,
} from '@mui/material';
import { LogOut, Building2, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface AppIdentityBadgeProps {
    appName: string;
    appId: string;
}

export default function AppIdentityBadge({ appName, appId }: AppIdentityBadgeProps) {
    const theme = useTheme();
    const { logout } = useAuth();
    const router = useRouter();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const handleLogout = () => {
        setAnchorEl(null);
        logout();
        router.push('/login');
    };

    return (
        <>
            <Chip
                icon={<Building2 size={14} />}
                label={appName}
                size="small"
                onClick={(e) => setAnchorEl(e.currentTarget)}
                deleteIcon={<ChevronDown size={14} />}
                onDelete={(e) => setAnchorEl(e.currentTarget as HTMLElement)}
                sx={{
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    height: 28,
                    width: 180,
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    color: theme.palette.primary.main,
                    borderColor: alpha(theme.palette.primary.main, 0.2),
                    border: '1px solid',
                    '& .MuiChip-icon': { color: theme.palette.primary.main },
                    '& .MuiChip-deleteIcon': { color: theme.palette.primary.main },
                    '& .MuiChip-label': {
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 120,
                    },
                    cursor: 'pointer',
                }}
            />
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                    paper: { sx: { minWidth: 200, mt: 0.5 } },
                }}
            >
                <Box sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="body2" fontWeight={600}>{appName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                        ID: {appId}
                    </Typography>
                </Box>
                <Divider />
                <MenuItem onClick={handleLogout}>
                    <ListItemIcon>
                        <LogOut size={16} color={theme.palette.error.main} />
                    </ListItemIcon>
                    <ListItemText>
                        <Typography variant="body2" color="error.main">Sign Out</Typography>
                    </ListItemText>
                </MenuItem>
            </Menu>
        </>
    );
}
