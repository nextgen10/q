'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Chip, Accordion, AccordionSummary,
    AccordionDetails, useTheme, alpha, Tooltip, IconButton,
    CircularProgress,
} from '@mui/material';
import UBSSnackbar from '@/components/UBSSnackbar';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {
    Brain, ShieldCheck, GitCompare, Gauge
} from 'lucide-react';
import { API_BASE_URL } from '@/features/agent-eval/utils/config';
import { authFetch } from '@/features/agent-eval/utils/authFetch';

interface PromptData {
    prompt_key: string;
    title: string;
    description: string;
    model: string;
    temperature: number;
    max_tokens: number;
    response_format: string;
    used_in: string;
    system_message: string;
    user_message_template: string;
    updated_at?: string;
}

const ICON_MAP: Record<string, React.ReactNode> = {
    semantic: <Brain size={18} />,
    fuzzy: <GitCompare size={18} />,
    consistency: <Gauge size={18} />,
    safety: <ShieldCheck size={18} />,
};

function PromptBlock({ label, content, onCopy }: { label: string; content: string; onCopy: () => void }) {
    const theme = useTheme();
    const isSystem = label === 'SYSTEM';

    return (
        <Box sx={{ mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Chip
                    label={label}
                    size="small"
                    sx={{
                        fontWeight: 700, fontSize: '0.6rem', letterSpacing: '0.08em', height: 20,
                        bgcolor: isSystem ? alpha(theme.palette.info.main, 0.12) : alpha(theme.palette.primary.main, 0.10),
                        color: isSystem ? 'info.main' : 'primary.main',
                        border: '1px solid',
                        borderColor: isSystem ? alpha(theme.palette.info.main, 0.25) : alpha(theme.palette.primary.main, 0.25),
                    }}
                />
                <Tooltip title="Copy prompt" arrow>
                    <IconButton size="small" onClick={onCopy} sx={{ p: 0.3 }}>
                        <ContentCopyIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                    </IconButton>
                </Tooltip>
            </Box>
            <Box
                sx={{
                    bgcolor: theme.palette.mode === 'dark'
                        ? alpha(theme.palette.common.white, 0.03)
                        : alpha(theme.palette.common.black, 0.02),
                    border: '1px solid', borderColor: 'divider', borderRadius: 1.5,
                    p: 2,
                    fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
                    fontSize: '0.78rem', lineHeight: 1.7,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'text.primary',
                    '& .var': {
                        color: theme.palette.primary.main, fontWeight: 700,
                        bgcolor: alpha(theme.palette.primary.main, 0.08), px: 0.5, borderRadius: 0.5,
                    }
                }}
                dangerouslySetInnerHTML={{
                    __html: content
                        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                        .replace(/\{(\w+)\}/g, '<span class="var">{$1}</span>')
                }}
            />
        </Box>
    );
}

function MetaChip({ label, value }: { label: string; value: string }) {
    const theme = useTheme();
    return (
        <Box sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.5,
            px: 1, py: 0.25, borderRadius: 1,
            border: '1px solid', borderColor: 'divider',
            bgcolor: theme.palette.mode === 'dark'
                ? alpha(theme.palette.common.white, 0.03)
                : alpha(theme.palette.common.black, 0.02),
        }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.6rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {label}:
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'text.primary', fontFamily: 'monospace' }}>
                {value}
            </Typography>
        </Box>
    );
}

export default function PromptsPage() {
    const theme = useTheme();
    const [prompts, setPrompts] = useState<PromptData[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedSet, setExpandedSet] = useState<Set<string>>(new Set(['semantic']));
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

    const fetchPrompts = useCallback(async () => {
        try {
            const res = await authFetch(`${API_BASE_URL}/prompts`);
            if (!res.ok) throw new Error('Failed to fetch prompts');
            const data = await res.json();
            if (Array.isArray(data)) {
                // Defensive filter so Agent Prompt tab never shows RAG prompt definitions.
                setPrompts(data.filter((p: PromptData) => !String(p.prompt_key || '').startsWith('rag_')));
            }
        } catch (e) {
            console.error('Error fetching prompts:', e);
            setSnackbar({ open: true, message: 'Failed to load prompts from server', severity: 'error' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchPrompts(); }, [fetchPrompts]);

    const copyTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => { return () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); }; }, []);

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => setCopiedId(null), 1500);
    };

    const handleToggle = (key: string) => {
        setExpandedSet(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
            <Box sx={{ mb: 2, flexShrink: 0 }}>
                <Typography sx={{ fontWeight: 800, fontSize: { xs: '0.95rem', md: '1.1rem' }, letterSpacing: '-0.02em', mb: 0.5, color: 'text.primary' }}>
                    Prompts
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.85rem' } }}>
                    Prompts used during Agent Eval. Includes semantic, fuzzy, consistency, and safety definitions. To edit, update the JSON files in <code>backend/prompts/</code>.
                </Typography>
            </Box>

            <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', pr: 0.5 }}>
                {prompts.map((p) => (
                    <Accordion
                        key={p.prompt_key}
                        expanded={expandedSet.has(p.prompt_key)}
                        onChange={() => handleToggle(p.prompt_key)}
                        disableGutters elevation={0}
                        sx={{
                            border: '1px solid',
                            borderColor: expandedSet.has(p.prompt_key) ? 'primary.main' : 'divider',
                            borderRadius: '8px !important', mb: 1.5, overflow: 'hidden',
                            transition: 'border-color 0.2s', '&:before': { display: 'none' },
                        }}
                    >
                        <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            sx={{ px: 2, py: 0.5, '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1.5 } }}
                        >
                            <Box sx={{
                                width: 32, height: 32, borderRadius: 1,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                bgcolor: alpha(theme.palette.primary.main, 0.08),
                                color: 'primary.main', flexShrink: 0,
                            }}>
                                {ICON_MAP[p.prompt_key] || <Brain size={18} />}
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', lineHeight: 1.3 }}>
                                    {p.title}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                                    {p.description}
                                </Typography>
                            </Box>
                        </AccordionSummary>

                        <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
                                <MetaChip label="Model" value={p.model} />
                                <MetaChip label="Temperature" value={String(p.temperature)} />
                                <MetaChip label="Max Tokens" value={String(p.max_tokens || 'default')} />
                                <MetaChip label="Response" value={p.response_format} />
                                <MetaChip label="Used In" value={p.used_in} />
                            </Box>

                            <PromptBlock
                                label="SYSTEM"
                                content={p.system_message}
                                onCopy={() => handleCopy(p.system_message, `${p.prompt_key}-sys`)}
                            />
                            <PromptBlock
                                label="USER"
                                content={p.user_message_template}
                                onCopy={() => handleCopy(p.user_message_template, `${p.prompt_key}-usr`)}
                            />

                            {copiedId?.startsWith(p.prompt_key) && (
                                <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600, mt: 0.5, display: 'block' }}>
                                    Copied to clipboard
                                </Typography>
                            )}
                        </AccordionDetails>
                    </Accordion>
                ))}
            </Box>

            <UBSSnackbar
                open={snackbar.open}
                message={snackbar.message}
                severity={snackbar.severity}
                onClose={() => setSnackbar(s => ({ ...s, open: false }))}
            />
        </Box>
    );
}
