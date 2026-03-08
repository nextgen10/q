'use client';

import React, { useState } from 'react';
import {
    Box, Typography, Menu, MenuItem, ListItemIcon, ListItemText,
    Chip, alpha, useTheme, Divider, Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton,
} from '@mui/material';
import { LogOut, Building2, ChevronDown, KeyRound, Copy, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface AppIdentityBadgeProps {
    appName: string;
    appId: string;
}

export default function AppIdentityBadge({ appName, appId }: AppIdentityBadgeProps) {
    const theme = useTheme();
    const { logout, generateApiKey } = useAuth();
    const router = useRouter();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
    const [generatedKey, setGeneratedKey] = useState('');
    const [keyLoading, setKeyLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [keyError, setKeyError] = useState('');

    const handleLogout = () => {
        setAnchorEl(null);
        logout();
        router.push('/login');
    };

    const handleGenerateApiKey = async () => {
        setAnchorEl(null);
        setKeyError('');
        setCopied(false);
        setKeyLoading(true);
        try {
            const key = await generateApiKey();
            setGeneratedKey(key);
            setApiKeyDialogOpen(true);
        } catch (error: unknown) {
            setKeyError(error instanceof Error ? error.message : 'Failed to generate API key');
            setApiKeyDialogOpen(true);
        } finally {
            setKeyLoading(false);
        }
    };

    const handleCopy = async () => {
        if (!generatedKey) return;
        await navigator.clipboard.writeText(generatedKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
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
                <MenuItem onClick={handleGenerateApiKey} disabled={keyLoading}>
                    <ListItemIcon>
                        <KeyRound size={16} color={theme.palette.error.main} />
                    </ListItemIcon>
                    <ListItemText>
                        <Typography variant="body2" color="error.main">
                            {keyLoading ? 'Generating API Key...' : 'Generate API Key'}
                        </Typography>
                    </ListItemText>
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                    <ListItemIcon>
                        <LogOut size={16} color={theme.palette.error.main} />
                    </ListItemIcon>
                    <ListItemText>
                        <Typography variant="body2" color="error.main">Sign Out</Typography>
                    </ListItemText>
                </MenuItem>
            </Menu>
            <Dialog
                open={apiKeyDialogOpen}
                onClose={() => setApiKeyDialogOpen(false)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle sx={{ fontWeight: 700 }}>Generated API Key</DialogTitle>
                <DialogContent>
                    {keyError ? (
                        <Typography variant="body2" color="error.main">{keyError}</Typography>
                    ) : (
                        <>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
                                Previous key was replaced in DB. Save this key now.
                            </Typography>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    px: 1.5,
                                    py: 1,
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    fontFamily: 'monospace',
                                    fontSize: '0.78rem',
                                    wordBreak: 'break-all',
                                }}
                            >
                                <Box sx={{ flex: 1 }}>{generatedKey}</Box>
                                <IconButton size="small" onClick={handleCopy} aria-label="Copy API key">
                                    {copied ? <CheckCircle2 size={16} color={theme.palette.success.main} /> : <Copy size={16} />}
                                </IconButton>
                            </Box>
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setApiKeyDialogOpen(false)} color="error" variant="contained">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
