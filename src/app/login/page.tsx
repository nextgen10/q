'use client';

import React, { useState, useEffect } from 'react';
import {
    Box, Container, Typography, TextField, Button, Paper, Tabs, Tab, Alert,
    useTheme, IconButton, InputAdornment, Fade, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import UBSSnackbar from '@/components/UBSSnackbar';
import { Eye, EyeOff, User, Mail, ArrowRight, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { UbsLogoFull } from '@/components/UbsLogoFull';
import { BrandPipe } from '@/components/BrandPipe';
import AnimatedQualarisWord from '@/components/AnimatedQualarisWord';
import ThemeToggle from '@/components/ThemeToggle';

const USERNAME_REGEX = /^[A-Za-z0-9]{1,32}$/;
const ACCESS_OPTIONS = [
    { value: 'ALL', label: 'ALL Applications' },
    { value: 'RAG_EVAL', label: 'RAG Eval' },
    { value: 'AGENT_EVAL', label: 'Agent Eval' },
    { value: 'GROUND_TRUTH', label: 'Ground Truth Generator' },
    { value: 'PLAYWRIGHT_POM', label: 'Playwright Compass' },
] as const;

export default function LoginPage() {
    const theme = useTheme();
    const router = useRouter();
    const { login, register, isAuthenticated } = useAuth();

    const [activeTab, setActiveTab] = useState(0);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [ownerEmail, setOwnerEmail] = useState('');
    const [requestedAccess, setRequestedAccess] = useState<(typeof ACCESS_OPTIONS)[number]['value']>('ALL');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [mounted, setMounted] = useState(false);

    const [snackOpen, setSnackOpen] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (isAuthenticated && mounted) {
            router.push('/');
        }
    }, [isAuthenticated, mounted, router]);

    const handleLogin = async () => {
        if (!username.trim() || !password) {
            setError('Please enter username and password');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await login(username.trim(), password);
            router.push('/');
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async () => {
        const normalizedUsername = username.trim();
        if (!USERNAME_REGEX.test(normalizedUsername)) {
            setError('Username must be alphanumeric and up to 32 characters');
            return;
        }
        if (!password || password.length < 4) {
            setError('Password must be at least 4 characters');
            return;
        }
        if (password !== confirmPassword) {
            setError('Password and confirm password do not match');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await register(normalizedUsername, password, ownerEmail.trim(), requestedAccess);
            await login(normalizedUsername, password);
            setSnackOpen(true);
            router.push('/');
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Registration failed');
        } finally {
            setLoading(false);
        }
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
                            <Box
                                role="button"
                                aria-label="Go to landing page"
                                onClick={() => router.push('/')}
                                sx={{ cursor: 'pointer' }}
                            >
                                <Typography component="div" variant="h5">
                                    <AnimatedQualarisWord sx={{ fontSize: { xs: '1.15rem', sm: '1.25rem' } }} />
                                </Typography>
                            </Box>
                        </Box>

                        <Tabs
                            value={activeTab}
                            onChange={(_, v) => { setActiveTab(v); setError(''); }}
                            variant="fullWidth"
                            sx={{
                                mb: 3,
                                '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: '0.9rem' },
                                '& .Mui-selected': { color: 'primary.main' },
                                '& .MuiTabs-indicator': { backgroundColor: 'primary.main' },
                            }}
                        >
                            <Tab label="Sign In" />
                            <Tab label="Create Account" />
                        </Tabs>

                        {error && (
                            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                                {error}
                            </Alert>
                        )}

                        {activeTab === 0 && (
                            <Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    Sign in with your username and password.
                                </Typography>
                                <TextField
                                    fullWidth
                                    label="Username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 32))}
                                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                    placeholder="Enter username"
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <User size={18} color={theme.palette.text.secondary} />
                                            </InputAdornment>
                                        )
                                    }}
                                    sx={{ mb: 2 }}
                                />
                                <TextField
                                    fullWidth
                                    label="Password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                    placeholder="••••••••"
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Lock size={18} color={theme.palette.text.secondary} />
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton size="small" onClick={() => setShowPassword(!showPassword)}>
                                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    Create your account with requested application access.
                                </Typography>
                                <TextField
                                    fullWidth
                                    label="Username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 32))}
                                    placeholder="e.g. TeamUser01"
                                    helperText="Alphanumeric only, max 32 characters"
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <User size={18} color={theme.palette.text.secondary} />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{ mb: 2 }}
                                />
                                <TextField
                                    fullWidth
                                    label="Password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="At least 4 characters"
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Lock size={18} color={theme.palette.text.secondary} />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{ mb: 2 }}
                                />
                                <TextField
                                    fullWidth
                                    label="Confirm Password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Re-enter password"
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Lock size={18} color={theme.palette.text.secondary} />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{ mb: 2 }}
                                />
                                <FormControl fullWidth sx={{ mb: 2 }}>
                                    <InputLabel id="requested-access-label">Requested Application Access</InputLabel>
                                    <Select
                                        labelId="requested-access-label"
                                        label="Requested Application Access"
                                        value={requestedAccess}
                                        onChange={(e) => setRequestedAccess(e.target.value as typeof requestedAccess)}
                                        MenuProps={{ disableScrollLock: true }}
                                    >
                                        {ACCESS_OPTIONS.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <TextField
                                    fullWidth
                                    label="Email (optional)"
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
                                    {loading ? 'Creating Account...' : 'Create Account'}
                                </Button>
                            </Box>
                        )}

                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 3 }}>
                            Username/password accounts are stored securely.
                        </Typography>
                    </Paper>
                </Fade>
            </Container>

            <UBSSnackbar
                open={snackOpen}
                message="Account created successfully."
                severity="success"
                onClose={() => setSnackOpen(false)}
            />
        </Box>
    );
}
