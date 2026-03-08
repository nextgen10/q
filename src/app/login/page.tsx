'use client';

import React, { useState, useEffect } from 'react';
import {
    Box, Container, Typography, TextField, Button, Paper, Tabs, Tab, Alert,
    alpha, useTheme, IconButton, InputAdornment, Fade,
} from '@mui/material';
import UBSSnackbar from '@/components/UBSSnackbar';
import { Eye, EyeOff, Key, Building2, Mail, ArrowRight, Copy, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { UbsLogoFull } from '@/components/UbsLogoFull';
import { BrandPipe } from '@/components/BrandPipe';
import ThemeToggle from '@/components/ThemeToggle';

const APP_NAME_REGEX = /^[A-Za-z0-9]{1,15}$/;

export default function LoginPage() {
    const theme = useTheme();
    const router = useRouter();
    const { login, register, isAuthenticated } = useAuth();

    const [activeTab, setActiveTab] = useState(0);
    const [apiKey, setApiKey] = useState('');
    const [appName, setAppName] = useState('');
    const [ownerEmail, setOwnerEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showKey, setShowKey] = useState(false);
    const [mounted, setMounted] = useState(false);

    const [registeredKey, setRegisteredKey] = useState('');
    const [copied, setCopied] = useState(false);
    const [snackOpen, setSnackOpen] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (isAuthenticated && mounted && !registeredKey) {
            router.push('/');
        }
    }, [isAuthenticated, mounted, router, registeredKey]);

    const handleLogin = async () => {
        if (!apiKey.trim()) { setError('Please enter your API key'); return; }
        setLoading(true);
        setError('');
        try {
            await login(apiKey.trim());
            router.push('/');
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async () => {
        const normalizedName = appName.trim();
        if (!APP_NAME_REGEX.test(normalizedName)) {
            setError('Application name must be alphanumeric and up to 15 characters');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const result = await register(normalizedName, ownerEmail.trim());
            setRegisteredKey(result.api_key);
            setSnackOpen(true);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const handleContinueToDashboard = async () => {
        if (!registeredKey) return;
        setLoading(true);
        setError('');
        try {
            await login(registeredKey);
            router.push('/');
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to sign in with new key');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyKey = () => {
        navigator.clipboard.writeText(registeredKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!mounted) return null;

    return (
        <Box sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.default',
            p: 2,
            position: 'relative',
        }}>
            <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
                <ThemeToggle />
            </Box>
            <Container maxWidth="sm">
                <Fade in timeout={600}>
                    <Paper elevation={0} sx={{
                        p: { xs: 3, sm: 5 },
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4, justifyContent: 'center' }}>
                            <UbsLogoFull />
                            <BrandPipe />
                            <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
                                NEXUS{' '}
                                <Box component="span" sx={{ color: 'primary.main' }}>EVAL</Box>
                            </Typography>
                        </Box>

                        <Tabs
                            value={activeTab}
                            onChange={(_, v) => { setActiveTab(v); setError(''); setRegisteredKey(''); }}
                            variant="fullWidth"
                            sx={{
                                mb: 3,
                                '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: '0.9rem' },
                                '& .Mui-selected': { color: 'primary.main' },
                                '& .MuiTabs-indicator': { backgroundColor: 'primary.main' },
                            }}
                        >
                            <Tab label="Sign In" />
                            <Tab label="Register App" />
                        </Tabs>

                        {error && (
                            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                                {error}
                            </Alert>
                        )}

                        {activeTab === 0 && (
                            <Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    Enter your application API key to access your evaluations.
                                </Typography>
                                <TextField
                                    fullWidth
                                    label="API Key"
                                    type={showKey ? 'text' : 'password'}
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                    placeholder="nxe_..."
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Key size={18} color={theme.palette.text.secondary} />
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton size="small" onClick={() => setShowKey(!showKey)}>
                                                    {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{ mb: 3 }}
                                />
                                <Button
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    onClick={handleLogin}
                                    disabled={loading}
                                    endIcon={<ArrowRight size={18} />}
                                >
                                    {loading ? 'Signing in...' : 'Sign In'}
                                </Button>
                            </Box>
                        )}

                        {activeTab === 1 && (
                            <Box>
                                {!registeredKey ? (
                                    <>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            Register your application to get an API key. You&apos;ll use this key to access the dashboard and call evaluation APIs.
                                        </Typography>
                                        <TextField
                                            fullWidth
                                            label="Application Name"
                                            value={appName}
                                            onChange={(e) => {
                                                const normalized = e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 15);
                                                setAppName(normalized);
                                            }}
                                            onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                                            placeholder="e.g. TradingBot01"
                                            helperText="Alphanumeric only, max 15 characters"
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <Building2 size={18} color={theme.palette.text.secondary} />
                                                    </InputAdornment>
                                                ),
                                            }}
                                            sx={{ mb: 2 }}
                                        />
                                        <TextField
                                            fullWidth
                                            label="Owner Email (optional)"
                                            value={ownerEmail}
                                            onChange={(e) => setOwnerEmail(e.target.value)}
                                            placeholder="team@example.com"
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <Mail size={18} color={theme.palette.text.secondary} />
                                                    </InputAdornment>
                                                ),
                                            }}
                                            sx={{ mb: 3 }}
                                        />
                                        <Button
                                            fullWidth
                                            variant="contained"
                                            size="large"
                                            onClick={handleRegister}
                                            disabled={loading}
                                            endIcon={<ArrowRight size={18} />}
                                        >
                                            {loading ? 'Registering...' : 'Register Application'}
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Alert severity="success" sx={{ mb: 3 }} icon={<CheckCircle2 size={20} />}>
                                            <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                                                Application registered! Save your API key:
                                            </Typography>
                                            <Box sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                bgcolor: alpha(theme.palette.success.main, 0.08),
                                                borderRadius: 1,
                                                px: 1.5, py: 0.75,
                                                fontFamily: 'monospace',
                                                fontSize: '0.8rem',
                                                wordBreak: 'break-all',
                                            }}>
                                                <Box sx={{ flex: 1 }}>{registeredKey}</Box>
                                                <IconButton size="small" onClick={handleCopyKey}>
                                                    {copied ? <CheckCircle2 size={16} color={theme.palette.success.main} /> : <Copy size={16} />}
                                                </IconButton>
                                            </Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                                This key won&apos;t be shown again. Store it securely.
                                            </Typography>
                                        </Alert>

                                        <Button
                                            fullWidth
                                            variant="contained"
                                            size="large"
                                            onClick={handleContinueToDashboard}
                                            disabled={loading}
                                            endIcon={<ArrowRight size={18} />}
                                        >
                                            {loading ? 'Signing in...' : 'I\'ve saved my key — Continue to Dashboard'}
                                        </Button>
                                    </>
                                )}
                            </Box>
                        )}

                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 3 }}>
                            If you are a new user, please register your application to get an API key.
                        </Typography>
                    </Paper>
                </Fade>
            </Container>

            <UBSSnackbar
                open={snackOpen}
                message="Application registered successfully! Copy your key before continuing."
                severity="success"
                onClose={() => setSnackOpen(false)}
            />
        </Box>
    );
}
