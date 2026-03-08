import React, { useState, useEffect } from 'react';
import { Activity, AlertCircle, ArrowRight, CheckCircle, ChevronDown, Copy, Eye, FileCode, Folder, Info, Pause, Play, RefreshCw, Save, Sparkles, X } from 'lucide-react';
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, Menu, MenuItem, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { StatusSnackbar } from '../UI/StatusSnackbar';

export function HealRecordingView() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    const [recordings, setRecordings] = useState([]);
    const [selectedRecording, setSelectedRecording] = useState('');
    const [recordingMenuAnchor, setRecordingMenuAnchor] = useState(null);
    const [healingSession, setHealingSession] = useState(null); // 'running', 'paused', 'healing', 'complete'
    const [logs, setLogs] = useState([]);
    const [logsCopied, setLogsCopied] = useState(false);
    const [showPromptModal, setShowPromptModal] = useState(false);
    const [showFixModal, setShowFixModal] = useState(false);
    const [lastFix, setLastFix] = useState(null);
    const [editedFix, setEditedFix] = useState('');
    const [aiPrompts, setAiPrompts] = useState(null);
    const [status, setStatus] = useState(null);

    const showStatus = (message, severity = 'success') => {
        setStatus({ message, severity });
        setTimeout(() => setStatus(null), 3000);
    };

    useEffect(() => {
        if (lastFix) setEditedFix(lastFix.new_line || '');
    }, [lastFix]);

    useEffect(() => {
        fetchRecordings();
    }, []);

    const fetchRecordings = async () => {
        try {
            const res = await fetch('/api/playwright-pom/record/files');
            const data = await res.json();
            setRecordings(data.files || []); // Expecting list of {name, path} or just strings?
            // Existing endpoint returns { files: [ {name: '...', path: '...'}, ...], folders: [...] }
        } catch (err) {
            console.error("Failed to fetch recordings", err);
        }
    };

    const startHealing = async () => {
        if (!selectedRecording) return;
        setHealingSession('running');
        setLogs([{ type: 'info', message: `Initializing session for ${selectedRecording}...` }]);
        setLastFix(null);

        try {
            const res = await fetch('/api/playwright-pom/heal/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: selectedRecording })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail);

            setLogs(prev => [...prev, { type: 'success', message: `Session ready. Total steps: ${data.total_steps}` }]);

            // Start the loop
            runHealingLoop();

        } catch (e) {
            setHealingSession('error');
            setLogs(prev => [...prev, { type: 'error', message: `Failed to start: ${e.message}` }]);
        }
    };

    const isPausedRef = React.useRef(false);

    const togglePause = () => {
        if (healingSession === 'running') {
            isPausedRef.current = true;
            setHealingSession('paused_user');
            setLogs(prev => [...prev, { type: 'info', message: 'Execution paused by user.' }]);
        } else if (healingSession === 'paused_user') {
            isPausedRef.current = false;
            setHealingSession('running');
            setLogs(prev => [...prev, { type: 'info', message: 'Resuming execution...' }]);
            runHealingLoop();
        }
    };

    const runHealingLoop = async () => {
        let running = true;
        isPausedRef.current = false; // Reset on start

        while (running) {
            // Check pause ref
            if (isPausedRef.current) {
                running = false;
                break;
            }

            try {
                const res = await fetch('/api/playwright-pom/heal/step', { method: 'POST' });
                const data = await res.json();

                if (!res.ok) throw new Error(data.detail);

                if (data.status === 'complete') {
                    setLogs(prev => [...prev, { type: 'success', message: 'Execution completed successfully.' }]);
                    setHealingSession('complete');
                    running = false;
                } else if (data.status === 'failed') {
                    setLogs(prev => [...prev, { type: 'error', message: `Step Failed: ${data.line_content}` }]);
                    setLogs(prev => [...prev, { type: 'error', message: `Error: ${data.error}` }]);
                    setHealingSession('paused'); // Pause for manual intervention or AI heal trigger
                    running = false;
                    // TODO: Trigger auto-heal here?
                } else if (data.status === 'skipped') {
                    setLogs(prev => [...prev, { type: 'info', message: `Skipped: ${data.line_content}` }]);
                } else {
                    // Success
                    setLogs(prev => [...prev, { type: 'success', message: `Executed: ${data.line_content}` }]);
                    // Add small delay for visualization
                    await new Promise(r => setTimeout(r, 500));
                }

            } catch (e) {
                setLogs(prev => [...prev, { type: 'error', message: `System Error: ${e.message}` }]);
                running = false;
                setHealingSession('error');
            }
        }
    };

    const fixStep = async () => {
        setLogs(prev => [...prev, { type: 'info', message: 'Attempting to heal...' }]);

        try {
            const res = await fetch('/api/playwright-pom/heal/fix', { method: 'POST' });
            const data = await res.json();

            if (!res.ok) throw new Error(data.detail);

            setLogs(prev => [...prev, { type: 'success', message: `Healed: ${data.message}` }]);
            setLastFix(data);
            // Pause to allow user to review and manually resume
            setHealingSession('paused_user');
            isPausedRef.current = true;
        } catch (e) {
            setLogs(prev => [...prev, { type: 'error', message: `Healing failed: ${e.message}` }]);
        }
    };

    const fetchHealPrompts = async () => {
        try {
            const res = await fetch('/api/playwright-pom/heal/prompts', { method: 'GET' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail);

            setAiPrompts(data);
            setShowPromptModal(true);
        } catch (e) {
            setLogs(prev => [...prev, { type: 'error', message: `Failed to fetch prompts: ${e.message}` }]);
        }
    };

    const saveFixOverride = async () => {
        try {
            const res = await fetch('/api/playwright-pom/heal/fix', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ override_code: editedFix })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail);

            setLogs(prev => [...prev, { type: 'success', message: `Fix updated manually.` }]);
            setLastFix(data);
            setShowFixModal(false);
        } catch (e) {
            setLogs(prev => [...prev, { type: 'error', message: `Override failed: ${e.message}` }]);
        }
    };

    return (
        <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 2 }}>
            <StatusSnackbar status={status} onClose={() => setStatus(null)} />

            <Dialog open={showFixModal && Boolean(lastFix)} onClose={() => setShowFixModal(false)} maxWidth="md" fullWidth>
                <DialogTitle>Review Fix</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2}>
                        <Box>
                            <Typography variant="caption" color="text.secondary">ORIGINAL FAILED LINE</Typography>
                            <Paper variant="outlined" sx={{ p: 1.5, mt: 0.5, bgcolor: alpha(theme.palette.error.main, 0.08) }}>
                                <Typography variant="body2" fontFamily="monospace">{lastFix?.original_line || 'Unknown'}</Typography>
                            </Paper>
                        </Box>
                        <TextField
                            label="Healed Line (Editable)"
                            multiline
                            rows={3}
                            value={editedFix}
                            onChange={(e) => setEditedFix(e.target.value)}
                            fullWidth
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowFixModal(false)}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={saveFixOverride}>Save Override</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={showPromptModal && Boolean(aiPrompts)} onClose={() => setShowPromptModal(false)} maxWidth="lg" fullWidth>
                <DialogTitle>AI Prompts Preview</DialogTitle>
                <DialogContent dividers sx={{ maxHeight: '75vh' }}>
                    <Stack spacing={2}>
                        <Box>
                            <Typography variant="caption" color="text.secondary">SYSTEM PROMPT</Typography>
                            <Paper variant="outlined" sx={{ p: 1.5, mt: 0.5 }}>
                                <Typography variant="body2" fontFamily="monospace" sx={{ whiteSpace: 'pre-wrap' }}>
                                    {aiPrompts?.system_prompt}
                                </Typography>
                            </Paper>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">USER PROMPT</Typography>
                            <Paper variant="outlined" sx={{ p: 1.5, mt: 0.5, bgcolor: alpha(theme.palette.error.main, 0.04) }}>
                                <Typography variant="body2" fontFamily="monospace" sx={{ whiteSpace: 'pre-wrap' }}>
                                    {aiPrompts?.user_prompt}
                                </Typography>
                            </Paper>
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowPromptModal(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'flex-end' }}>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: '0.06em' }}>
                                TARGET RECORDING
                            </Typography>
                            <Box
                                onClick={(e) => setRecordingMenuAnchor(e.currentTarget)}
                                sx={{
                                    mt: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    p: '10px 14px',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                    cursor: 'pointer',
                                    '&:hover': { borderColor: 'error.main' }
                                }}
                            >
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                                    <FileCode size={16} color={theme.palette.error.main} />
                                    <Typography noWrap variant="body2">
                                        {selectedRecording
                                            ? (() => {
                                                const r = recordings.find(rec => (rec.path || rec) === selectedRecording);
                                                if (!r) return selectedRecording.replace('.py', '');
                                                return r.folder ? `${r.folder}/${r.name.replace('.py', '')}` : r.name.replace('.py', '');
                                            })()
                                            : 'Select a recording to heal...'}
                                    </Typography>
                                </Stack>
                                <ChevronDown size={16} color={theme.palette.error.main} />
                            </Box>

                            <Menu
                                anchorEl={recordingMenuAnchor}
                                open={Boolean(recordingMenuAnchor)}
                                onClose={() => setRecordingMenuAnchor(null)}
                                PaperProps={{ sx: { maxHeight: 420, minWidth: recordingMenuAnchor?.clientWidth || 320 } }}
                            >
                                {recordings.length === 0
                                    ? [<MenuItem key="no-recordings" disabled>No recordings found</MenuItem>]
                                    : (() => {
                                        const groupedRecordings = Object.entries(
                                            recordings.reduce((acc, r) => {
                                                const folder = r.folder || 'Root';
                                                if (!acc[folder]) acc[folder] = [];
                                                acc[folder].push(r);
                                                return acc;
                                            }, {})
                                        ).sort(([a], [b]) => a === 'Root' ? -1 : b === 'Root' ? 1 : a.localeCompare(b));

                                        const items = [
                                            <MenuItem key="clear" onClick={() => { setSelectedRecording(''); setRecordingMenuAnchor(null); }}>
                                                <X size={14} color={theme.palette.error.main} style={{ marginRight: 8 }} />
                                                None (Clear Selection)
                                            </MenuItem>,
                                            <Divider key="div-0" />,
                                        ];

                                        groupedRecordings.forEach(([folder, folderFiles]) => {
                                            if (folder !== 'Root') {
                                                items.push(
                                                    <Box key={`folder-${folder}`} sx={{ px: 2, py: 0.75, opacity: 0.7 }}>
                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                            <Folder size={12} color={theme.palette.error.main} />
                                                            <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.08em' }}>{folder}</Typography>
                                                        </Stack>
                                                    </Box>
                                                );
                                            }

                                            folderFiles.forEach((r, idx) => {
                                                const recordingPath = r.path || r;
                                                const recordingName = (r.name || r).replace('.py', '');
                                                items.push(
                                                    <MenuItem
                                                        key={`${folder}-${recordingPath}-${idx}`}
                                                        selected={selectedRecording === recordingPath}
                                                        onClick={() => { setSelectedRecording(recordingPath); setRecordingMenuAnchor(null); }}
                                                    >
                                                        <FileCode size={14} color={theme.palette.error.main} style={{ marginRight: 8 }} />
                                                        {recordingName}
                                                    </MenuItem>
                                                );
                                            });
                                            items.push(<Divider key={`div-${folder}`} />);
                                        });
                                        return items;
                                    })()}
                            </Menu>
                        </Box>

                        <Stack direction="row" spacing={1}>
                            {healingSession === 'running' && (
                                <Button variant="contained" color="error" onClick={togglePause} startIcon={<Pause size={16} />}>
                                    Pause
                                </Button>
                            )}
                            {healingSession === 'paused_user' && (
                                <>
                                    {lastFix && (
                                        <Tooltip title="Review Fix">
                                            <IconButton
                                                onClick={() => setShowFixModal(true)}
                                                sx={{ border: '1px solid', borderColor: 'divider', color: 'error.main' }}
                                            >
                                                <Eye size={16} />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    <Button variant="contained" color="error" onClick={togglePause} startIcon={<Play size={16} />}>
                                        Resume
                                    </Button>
                                </>
                            )}
                            {healingSession === 'paused' && (
                                <>
                                    <Tooltip title="View AI Prompts">
                                        <IconButton
                                            onClick={fetchHealPrompts}
                                            sx={{ border: '1px solid', borderColor: 'divider', color: 'error.main' }}
                                        >
                                            <Info size={16} />
                                        </IconButton>
                                    </Tooltip>
                                    <Button variant="contained" color="error" onClick={fixStep} startIcon={<RefreshCw size={16} />}>
                                        Attempt Auto-Heal
                                    </Button>
                                </>
                            )}
                            {(!healingSession || healingSession === 'complete' || healingSession === 'error') && (
                                <Button
                                    variant="contained"
                                    color="error"
                                    disabled={!selectedRecording}
                                    onClick={startHealing}
                                    startIcon={<Play size={16} />}
                                >
                                    Start Healing
                                </Button>
                            )}
                        </Stack>
                    </Stack>
                </Paper>

                <Paper variant="outlined" sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Activity size={16} color={theme.palette.error.main} />
                            <Typography variant="subtitle2" fontWeight={700}>Live Execution Log</Typography>
                        </Stack>
                        <IconButton
                            size="small"
                            onClick={() => {
                                const logText = logs.map(l => `[${l.type.toUpperCase()}] ${l.message}`).join('\n');
                                navigator.clipboard.writeText(logText);
                                setLogsCopied(true);
                                showStatus('Logs copied');
                                setTimeout(() => setLogsCopied(false), 2000);
                            }}
                            disabled={logs.length === 0}
                            sx={{ color: 'error.main' }}
                        >
                            {logsCopied ? <CheckCircle size={16} /> : <Copy size={16} />}
                        </IconButton>
                    </Stack>
                    <Box sx={{ flex: 1, minHeight: 0, p: 2, overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.875rem', bgcolor: isDark ? '#0d0d0d' : '#fafafa' }}>
                        {logs.length === 0 ? (
                            <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ height: '100%', color: 'text.secondary' }}>
                                <Activity size={40} />
                                <Typography variant="body2">Select a recording and run to start healing</Typography>
                            </Stack>
                        ) : (
                            <Stack spacing={1.2}>
                                {logs.map((log, idx) => (
                                    <Stack key={idx} direction="row" spacing={1.2} alignItems="flex-start">
                                        {log.type === 'error' ? (
                                            <AlertCircle size={16} color={theme.palette.error.main} />
                                        ) : log.type === 'success' ? (
                                            <CheckCircle size={16} color={theme.palette.success.main} />
                                        ) : (
                                            <ArrowRight size={16} color={theme.palette.error.main} />
                                        )}
                                        <Typography variant="body2" fontFamily="monospace">{log.message}</Typography>
                                    </Stack>
                                ))}
                            </Stack>
                        )}
                    </Box>
                </Paper>
            </Stack>
        </Box>
    );
}
