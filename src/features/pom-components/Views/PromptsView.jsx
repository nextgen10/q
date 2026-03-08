import React, { useEffect, useState } from 'react';
import {
    Box,
    Button,
    CircularProgress,
    IconButton,
    InputAdornment,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Paper,
    Stack,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { ChevronRight, Code, List as ListIcon, MessageSquare, RefreshCw, Save, Search, Wand2 } from 'lucide-react';
import { StatusSnackbar } from '../UI/StatusSnackbar';
import { useAuth } from '@/contexts/AuthContext';

export function PromptsView() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const { getAuthHeaders } = useAuth();
    const pomFetch = (input, init = {}) => {
        const headers = new Headers(init.headers || {});
        const authHeaders = getAuthHeaders();
        Object.entries(authHeaders).forEach(([key, value]) => headers.set(key, value));
        return fetch(input, { ...init, headers });
    };

    const [prompts, setPrompts] = useState([]);
    const [selectedPrompt, setSelectedPrompt] = useState('');
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState(null); // { message, severity }
    const [search, setSearch] = useState('');

    const fetchPrompts = async () => {
        setLoading(true);
        try {
            const response = await pomFetch('/api/playwright-pom/prompts/list');
            if (response.ok) {
                const data = await response.json();
                setPrompts(data);
                if (data.length > 0 && !selectedPrompt) {
                    handleSelectPrompt(data[0]);
                }
            }
        } catch (error) {
            console.error('Error fetching prompts:', error);
            showStatus("Failed to load prompts", "error");
        } finally {
            setLoading(false);
        }
    };


    const handleSelectPrompt = async (filename) => {
        setSelectedPrompt(filename);
        try {
            const response = await pomFetch(`/api/playwright-pom/prompts/${filename}`);
            if (response.ok) {
                const data = await response.json();
                setContent(data.content);
            }
        } catch (error) {
            console.error('Error fetching prompt content:', error);
            showStatus("Failed to load prompt content", "error");
        }
    };

    const handleSave = async () => {
        if (!selectedPrompt) return;
        setSaving(true);
        try {
            const response = await pomFetch(`/api/playwright-pom/prompts/${selectedPrompt}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });

            if (response.ok) {
                showStatus("PromptTemplate updated successfully", "success");
            } else {
                showStatus("Failed to save changes", "error");
            }
        } catch (error) {
            console.error('Error saving prompt:', error);
            showStatus("Error saving changes", "error");
        } finally {
            setSaving(false);
        }
    };

    const showStatus = (message, severity) => {
        setStatus({ message, severity });
        setTimeout(() => setStatus(null), 3000);
    };

    useEffect(() => {
        fetchPrompts();
    }, []);

    const filteredPrompts = prompts.filter((filename) =>
        filename.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 2 }}>
            <StatusSnackbar status={status} onClose={() => setStatus(null)} />

            <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', transition: 'background-color 0.3s' }}>
                <Box sx={{ display: 'flex', gap: 2, height: '100%', minHeight: 0 }}>
                    <Paper
                        variant="outlined"
                        sx={{ width: 340, p: 2, display: 'flex', flexDirection: 'column', minHeight: 0 }}
                    >
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pb: 1 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <ListIcon size={16} color={theme.palette.error.main} />
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Define Prompts</Typography>
                            </Stack>
                            <IconButton size="small" onClick={fetchPrompts} disabled={loading} sx={{ color: 'error.main' }}>
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            </IconButton>
                        </Stack>

                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search prompts..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search size={15} color={theme.palette.error.main} />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <List dense sx={{ mt: 1.5, flex: 1, overflowY: 'auto', minHeight: 0 }}>
                            {loading && prompts.length === 0 ? (
                                <Stack alignItems="center" justifyContent="center" sx={{ py: 5 }}>
                                    <CircularProgress size={24} />
                                </Stack>
                            ) : (
                                filteredPrompts.map((filename) => (
                                    <ListItem key={filename} disablePadding sx={{ mb: 0.5 }}>
                                        <ListItemButton
                                            selected={selectedPrompt === filename}
                                            onClick={() => handleSelectPrompt(filename)}
                                            sx={{
                                                borderRadius: 1,
                                                '&.Mui-selected': {
                                                    bgcolor: alpha(theme.palette.error.main, 0.12),
                                                    '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.18) }
                                                }
                                            }}
                                        >
                                            <ListItemIcon sx={{ minWidth: 30 }}>
                                                <MessageSquare size={15} color={theme.palette.error.main} />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={filename.replace('.txt', '').replace(/_/g, ' ')}
                                                primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: 500, textTransform: 'capitalize' }}
                                            />
                                            <ChevronRight size={14} color={theme.palette.error.main} />
                                        </ListItemButton>
                                    </ListItem>
                                ))
                            )}
                        </List>
                    </Paper>

                    <Paper
                        variant="outlined"
                        sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
                    >
                        {selectedPrompt ? (
                            <>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                                    <Stack direction="row" spacing={1.2} alignItems="center">
                                        <Code size={18} color={theme.palette.error.main} />
                                        <Box>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 700, textTransform: 'capitalize' }}>
                                                {selectedPrompt.replace('.txt', '').replace(/_/g, ' ')}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Prompt Template
                                            </Typography>
                                        </Box>
                                    </Stack>
                                    <Button
                                        variant="contained"
                                        color="error"
                                        size="small"
                                        onClick={handleSave}
                                        disabled={saving}
                                        startIcon={<Save size={14} />}
                                    >
                                        {saving ? 'Saving...' : 'Save'}
                                    </Button>
                                </Stack>

                                <Box sx={{ flex: 1, minHeight: 0, p: 2 }}>
                                    <TextField
                                        fullWidth
                                        multiline
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        placeholder="System instructions..."
                                        sx={{
                                            height: '100%',
                                            '& .MuiInputBase-root': {
                                                height: '100%',
                                                alignItems: 'flex-start'
                                            },
                                            '& .MuiInputBase-input': {
                                                height: '100% !important',
                                                overflow: 'auto !important',
                                                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                                fontSize: '0.9rem',
                                                lineHeight: 1.6,
                                                color: theme.palette.text.primary
                                            }
                                        }}
                                    />
                                </Box>
                            </>
                        ) : (
                            <Stack
                                alignItems="center"
                                justifyContent="center"
                                spacing={1.5}
                                sx={{ flex: 1, color: "text.secondary" }}
                            >
                                <Wand2 size={40} />
                                <Typography variant="body2">Select a prompt to edit</Typography>
                            </Stack>
                        )}
                    </Paper>
                </Box>
            </Box>
        </Box>
    );
}
