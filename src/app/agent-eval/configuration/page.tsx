'use client';
import React, { useState, useRef } from 'react';
import {
    Box, Typography, Paper, TextField, Button, Grid,
    Tooltip, InputAdornment, Chip,
    IconButton, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import UBSSnackbar from '@/components/UBSSnackbar';
import SaveIcon from '@mui/icons-material/Save';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import { CheckCircle2 } from 'lucide-react';

const VALID_STRATEGIES = ['SEMANTIC', 'FUZZY', 'EXACT', 'IGNORE'] as const;
type Strategy = typeof VALID_STRATEGIES[number];

interface FieldStrategyEntry {
    field: string;
    strategy: Strategy;
}

export default function ConfigurationPage() {
    const [mounted, setMounted] = useState(false);
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('Configuration saved successfully!');
    const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [semanticThreshold, setSemanticThreshold] = useState('0.72');
    const [alpha, setAlpha] = useState('0.6');
    const [beta, setBeta] = useState('0.2');
    const [gamma, setGamma] = useState('0.2');
    const [enableSafety, setEnableSafety] = useState(true);
    const [llmModelName, setLlmModelName] = useState('gpt-4o');
    const [accuracyThreshold, setAccuracyThreshold] = useState('0.5');
    const [consistencyThreshold, setConsistencyThreshold] = useState('0.5');
    const [hallucinationThreshold, setHallucinationThreshold] = useState('0.5');
    const [rqsThreshold, setRqsThreshold] = useState('0.5');
    const [fuzzyThreshold, setFuzzyThreshold] = useState('0.85');

    const [wAccuracy, setWAccuracy] = useState('0.45');
    const [wCompleteness, setWCompleteness] = useState('0.25');
    const [wHallucination, setWHallucination] = useState('0.15');
    const [wSafety, setWSafety] = useState('0.15');

    const [fieldStrategies, setFieldStrategies] = useState<FieldStrategyEntry[]>([]);
    const [rawConfigJson, setRawConfigJson] = useState<Record<string, any>>({});
    const [newFieldName, setNewFieldName] = useState('');
    const [newFieldStrategy, setNewFieldStrategy] = useState<Strategy>('EXACT');

    const handleAddField = () => {
        const trimmed = newFieldName.trim();
        if (!trimmed) return;
        if (fieldStrategies.some(e => e.field === trimmed)) return;
        setFieldStrategies(prev => [...prev, { field: trimmed, strategy: newFieldStrategy }]);
        setNewFieldName('');
        setRawConfigJson({});
    };

    const handleRemoveField = (fieldName: string) => {
        setFieldStrategies(prev => prev.filter(e => e.field !== fieldName));
        setRawConfigJson({});
    };

    const handleStrategyChange = (fieldName: string, strategy: Strategy) => {
        setFieldStrategies(prev => prev.map(e => e.field === fieldName ? { ...e, strategy } : e));
        setRawConfigJson({});
    };

    const flattenStrategies = (data: any, parentKey = '', result: Record<string, string> = {}): Record<string, string> => {
        if (typeof data === 'string' && (VALID_STRATEGIES as readonly string[]).includes(data.toUpperCase())) {
            result[parentKey] = data.toUpperCase();
        } else if (Array.isArray(data)) {
            data.forEach((item, idx) => {
                flattenStrategies(item, `${parentKey}#${idx + 1}`, result);
            });
        } else if (typeof data === 'object' && data !== null) {
            for (const [key, val] of Object.entries(data)) {
                const flatKey = parentKey ? `${parentKey}_${key}` : key;
                flattenStrategies(val, flatKey, result);
            }
        }
        return result;
    };

    const applyParsedConfig = (parsed: Record<string, any>) => {
        setRawConfigJson(parsed);
        const flat = flattenStrategies(parsed);
        const entries: FieldStrategyEntry[] = [];
        for (const [key, val] of Object.entries(flat)) {
            const upper = String(val).toUpperCase();
            if ((VALID_STRATEGIES as readonly string[]).includes(upper)) {
                entries.push({ field: key, strategy: upper as Strategy });
            }
        }
        setFieldStrategies(entries);
    };

    const handleUploadConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target?.result as string);
                if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                    applyParsedConfig(parsed);
                }
            } catch {
                // silently ignore bad JSON
            }
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleExportConfig = () => {
        const obj: Record<string, string> = {};
        fieldStrategies.forEach(e => { obj[e.field] = e.strategy; });
        const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'field_strategies.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleSave = () => {
        const numericFields: [string, string][] = [
            [semanticThreshold, 'Semantic Threshold'],
            [alpha, 'Alpha'], [beta, 'Beta'], [gamma, 'Gamma'],
            [accuracyThreshold, 'Accuracy Threshold'],
            [consistencyThreshold, 'Consistency Threshold'],
            [hallucinationThreshold, 'Hallucination Threshold'],
            [rqsThreshold, 'RQS Threshold'],
            [fuzzyThreshold, 'Fuzzy Threshold'],
            [wAccuracy, 'Weight: Accuracy'], [wCompleteness, 'Weight: Completeness'],
            [wHallucination, 'Weight: Hallucination'], [wSafety, 'Weight: Safety'],
        ];
        for (const [val, label] of numericFields) {
            const n = parseFloat(val);
            if (isNaN(n) || n < 0 || n > 1) {
                setSnackbarMessage(`Invalid value for ${label}: must be a number between 0 and 1.`);
                setSnackbarSeverity('error');
                setOpenSnackbar(true);
                return;
            }
        }

        localStorage.setItem('config_semantic_threshold', semanticThreshold);
        localStorage.setItem('config_alpha', alpha);
        localStorage.setItem('config_beta', beta);
        localStorage.setItem('config_gamma', gamma);
        localStorage.setItem('config_enable_safety', 'true');
        localStorage.setItem('config_llm_model_name', llmModelName);
        localStorage.setItem('config_accuracy_threshold', accuracyThreshold);
        localStorage.setItem('config_consistency_threshold', consistencyThreshold);
        localStorage.setItem('config_hallucination_threshold', hallucinationThreshold);
        localStorage.setItem('config_rqs_threshold', rqsThreshold);
        localStorage.setItem('config_fuzzy_threshold', fuzzyThreshold);
        localStorage.setItem('config_w_accuracy', wAccuracy);
        localStorage.setItem('config_w_completeness', wCompleteness);
        localStorage.setItem('config_w_hallucination', wHallucination);
        localStorage.setItem('config_w_safety', wSafety);

        if (Object.keys(rawConfigJson).length > 0) {
            localStorage.setItem('config_field_strategies', JSON.stringify(rawConfigJson));
        } else {
            const obj: Record<string, string> = {};
            fieldStrategies.forEach(e => { obj[e.field] = e.strategy; });
            localStorage.setItem('config_field_strategies', JSON.stringify(obj));
        }

        setSnackbarMessage('Configuration saved successfully!');
        setSnackbarSeverity('success');
        setOpenSnackbar(true);
    };

    React.useEffect(() => {
        setSemanticThreshold(localStorage.getItem('config_semantic_threshold') || '0.72');
        setAlpha(localStorage.getItem('config_alpha') || '0.6');
        setBeta(localStorage.getItem('config_beta') || '0.2');
        setGamma(localStorage.getItem('config_gamma') || '0.2');
        setEnableSafety(true);
        setLlmModelName(localStorage.getItem('config_llm_model_name') || 'gpt-4o');
        setAccuracyThreshold(localStorage.getItem('config_accuracy_threshold') || '0.5');
        setConsistencyThreshold(localStorage.getItem('config_consistency_threshold') || '0.5');
        setHallucinationThreshold(localStorage.getItem('config_hallucination_threshold') || '0.5');
        setRqsThreshold(localStorage.getItem('config_rqs_threshold') || '0.5');
        setFuzzyThreshold(localStorage.getItem('config_fuzzy_threshold') || '0.85');
        setWAccuracy(localStorage.getItem('config_w_accuracy') || '0.45');
        setWCompleteness(localStorage.getItem('config_w_completeness') || '0.25');
        setWHallucination(localStorage.getItem('config_w_hallucination') || '0.15');
        setWSafety(localStorage.getItem('config_w_safety') || '0.15');

        try {
            const raw = localStorage.getItem('config_field_strategies');
            if (raw) {
                const parsed = JSON.parse(raw);
                applyParsedConfig(parsed);
            }
        } catch { /* ignore */ }
        setMounted(true);
    }, []);

    const InfoIconWithHover = (props: any) => (
        <InfoOutlinedIcon
            {...props}
            sx={{
                color: theme => theme.palette.text.disabled,
                cursor: 'pointer',
                fontSize: 'medium',
                ...props.sx
            }}
        />
    );

    const strategyColor = (s: Strategy) => {
        switch (s) {
            case 'SEMANTIC': return '#1565C0';
            case 'FUZZY': return '#E65100';
            case 'EXACT': return '#2E7D32';
            case 'IGNORE': return '#757575';
        }
    };

    if (!mounted) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'auto' }}>
                <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: { xs: '0.95rem', md: '1.1rem' }, letterSpacing: '-0.02em', mb: 0.5, color: 'text.primary' }}>
                        Configuration
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.85rem' } }}>
                        System Settings & Parameters
                    </Typography>
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'auto' }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, mb: 2, flexShrink: 0 }}>
                <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: { xs: '0.95rem', md: '1.1rem' }, letterSpacing: '-0.02em', mb: 0.5, color: 'text.primary' }}>
                        Configuration
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.85rem' } }}>
                        System Settings & Parameters
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSave}
                    startIcon={<SaveIcon />}
                >
                    Save Configuration
                </Button>
            </Box>

            <Box sx={{ flex: 1, minHeight: 0 }}>
                <Grid container spacing={2}>
                    {/* Left Column - Thresholds */}
                    <Grid size={{ xs: 12, lg: 6 }} sx={{ minHeight: 0 }}>
                        <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
                                Evaluation Thresholds
                            </Typography>
                            <Typography variant="overline" sx={{ display: 'block', mt: 1, mb: 0.5, color: 'text.secondary', fontWeight: 600, fontSize: '0.65rem' }}>
                                Basic Thresholds
                            </Typography>

                            <Grid container spacing={1}>
                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Semantic Threshold"
                                        type="number"
                                        value={semanticThreshold}
                                        onChange={(e) => setSemanticThreshold(e.target.value)}
                                        inputProps={{ step: "0.01", min: "0", max: "1" }}
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <Tooltip title="Minimum similarity score required for semantic matching (0-1)" arrow>
                                                        <InfoIconWithHover />
                                                    </Tooltip>
                                                </InputAdornment>
                                            )
                                        }}
                                    />
                                </Grid>
                            </Grid>

                            <Typography variant="overline" sx={{ display: 'block', mt: 1.5, mb: 0.5, color: 'text.secondary', fontWeight: 600, fontSize: '0.65rem' }}>
                                Status Thresholds
                            </Typography>
                            <Grid container spacing={1}>
                                <Grid size={{ xs: 6, md: 3 }}>
                                    <TextField fullWidth size="small" label="Min Accuracy" type="number" value={accuracyThreshold} onChange={(e) => setAccuracyThreshold(e.target.value)} inputProps={{ step: "0.01", min: "0", max: "1" }} InputProps={{ endAdornment: (<InputAdornment position="end"><Tooltip title="Minimum acceptable accuracy score (0-1)" arrow><InfoIconWithHover /></Tooltip></InputAdornment>) }} />
                                </Grid>
                                <Grid size={{ xs: 6, md: 3 }}>
                                    <TextField fullWidth size="small" label="Min Consistency" type="number" value={consistencyThreshold} onChange={(e) => setConsistencyThreshold(e.target.value)} inputProps={{ step: "0.01", min: "0", max: "1" }} InputProps={{ endAdornment: (<InputAdornment position="end"><Tooltip title="Minimum acceptable consistency score (0-1)" arrow><InfoIconWithHover /></Tooltip></InputAdornment>) }} />
                                </Grid>
                                <Grid size={{ xs: 6, md: 3 }}>
                                    <TextField fullWidth size="small" label="Max Hallucination" type="number" value={hallucinationThreshold} onChange={(e) => setHallucinationThreshold(e.target.value)} inputProps={{ step: "0.01", min: "0", max: "1" }} InputProps={{ endAdornment: (<InputAdornment position="end"><Tooltip title="Maximum acceptable hallucination rate (0-1)" arrow><InfoIconWithHover /></Tooltip></InputAdornment>) }} />
                                </Grid>
                                <Grid size={{ xs: 6, md: 3 }}>
                                    <TextField fullWidth size="small" label="Min RQS" type="number" value={rqsThreshold} onChange={(e) => setRqsThreshold(e.target.value)} inputProps={{ step: "0.01", min: "0", max: "1" }} InputProps={{ endAdornment: (<InputAdornment position="end"><Tooltip title="Minimum Response Quality Score (RQS) required to pass (0-1)" arrow><InfoIconWithHover /></Tooltip></InputAdornment>) }} />
                                </Grid>
                            </Grid>

                            <Typography variant="overline" sx={{ display: 'block', mt: 1.5, mb: 0.5, color: 'text.secondary', fontWeight: 600, fontSize: '0.65rem' }}>
                                RQS Weights
                            </Typography>
                            <Grid container spacing={1}>
                                <Grid size={{ xs: 4 }}>
                                    <TextField fullWidth size="small" label="Alpha" type="number" value={alpha} onChange={(e) => setAlpha(e.target.value)} inputProps={{ step: "0.1", min: "0", max: "1" }} InputProps={{ endAdornment: (<InputAdornment position="end"><Tooltip title="Weight for Accuracy in RQS calculation (0-1). Alpha + Beta + Gamma should sum to 1." arrow><InfoIconWithHover /></Tooltip></InputAdornment>) }} />
                                </Grid>
                                <Grid size={{ xs: 4 }}>
                                    <TextField fullWidth size="small" label="Beta" type="number" value={beta} onChange={(e) => setBeta(e.target.value)} inputProps={{ step: "0.1", min: "0", max: "1" }} InputProps={{ endAdornment: (<InputAdornment position="end"><Tooltip title="Weight for Consistency in RQS calculation (0-1)." arrow><InfoIconWithHover /></Tooltip></InputAdornment>) }} />
                                </Grid>
                                <Grid size={{ xs: 4 }}>
                                    <TextField fullWidth size="small" label="Gamma" type="number" value={gamma} onChange={(e) => setGamma(e.target.value)} inputProps={{ step: "0.1", min: "0", max: "1" }} InputProps={{ endAdornment: (<InputAdornment position="end"><Tooltip title="Weight for Strict Correctness in RQS calculation (0-1)." arrow><InfoIconWithHover /></Tooltip></InputAdornment>) }} />
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>

                    {/* Right Column - Models & Settings */}
                    <Grid size={{ xs: 12, lg: 6 }} sx={{ minHeight: 0 }}>
                        <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
                                Models & Paths
                            </Typography>

                            <Typography variant="overline" sx={{ display: 'block', mb: 0.5, color: 'text.secondary', fontWeight: 600, fontSize: '0.65rem' }}>
                                Safety & Quality Assessment
                            </Typography>
                            <TextField
                                fullWidth
                                size="small"
                                label="Safety Judge Model"
                                value={llmModelName}
                                onChange={(e) => setLlmModelName(e.target.value)}
                                sx={{ mb: 1.5 }}
                                placeholder="gpt-4o, gpt-4o-mini"
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <Tooltip title="Name of the LLM model used for safety and quality judging (e.g., gpt-4o)" arrow>
                                                <InfoIconWithHover />
                                            </Tooltip>
                                        </InputAdornment>
                                    )
                                }}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                Hybrid Safety Scoring: Always Enabled
                            </Typography>
                        </Paper>

                        <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, mt: 2 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
                                Advanced Structured & JSON Metrics
                            </Typography>

                            <Grid container spacing={1}>
                                <Grid size={{ xs: 6, md: 4 }}>
                                    <TextField fullWidth size="small" label="Fuzzy Threshold" type="number" value={fuzzyThreshold} onChange={(e) => setFuzzyThreshold(e.target.value)} inputProps={{ step: "0.01", min: "0", max: "1" }} InputProps={{ endAdornment: (<InputAdornment position="end"><Tooltip title="Sensitivity for fuzzy string matching (0-1). Higher means stricter." arrow><InfoIconWithHover /></Tooltip></InputAdornment>) }} />
                                </Grid>
                            </Grid>

                            <Typography variant="overline" sx={{ display: 'block', mt: 1.5, mb: 0.5, color: 'text.secondary', fontWeight: 600, fontSize: '0.65rem' }}>
                                JSON RQS Weights
                            </Typography>
                            <Grid container spacing={1}>
                                <Grid size={{ xs: 3 }}>
                                    <TextField fullWidth size="small" label="Acc Weight" type="number" value={wAccuracy} onChange={(e) => setWAccuracy(e.target.value)} inputProps={{ step: "0.05", min: "0", max: "1" }} InputProps={{ endAdornment: (<InputAdornment position="end"><Tooltip title="Accuracy weight for JSON items." arrow><InfoIconWithHover /></Tooltip></InputAdornment>) }} />
                                </Grid>
                                <Grid size={{ xs: 3 }}>
                                    <TextField fullWidth size="small" label="Comp Weight" type="number" value={wCompleteness} onChange={(e) => setWCompleteness(e.target.value)} inputProps={{ step: "0.05", min: "0", max: "1" }} InputProps={{ endAdornment: (<InputAdornment position="end"><Tooltip title="Completeness weight for JSON items." arrow><InfoIconWithHover /></Tooltip></InputAdornment>) }} />
                                </Grid>
                                <Grid size={{ xs: 3 }}>
                                    <TextField fullWidth size="small" label="Hall Weight" type="number" value={wHallucination} onChange={(e) => setWHallucination(e.target.value)} inputProps={{ step: "0.05", min: "0", max: "1" }} InputProps={{ endAdornment: (<InputAdornment position="end"><Tooltip title="Hallucination weight for JSON items." arrow><InfoIconWithHover /></Tooltip></InputAdornment>) }} />
                                </Grid>
                                <Grid size={{ xs: 3 }}>
                                    <TextField fullWidth size="small" label="Safe Weight" type="number" value={wSafety} onChange={(e) => setWSafety(e.target.value)} inputProps={{ step: "0.05", min: "0", max: "1" }} InputProps={{ endAdornment: (<InputAdornment position="end"><Tooltip title="Safety weight for JSON items." arrow><InfoIconWithHover /></Tooltip></InputAdornment>) }} />
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>

                    {/* Full-Width — Field Strategy Config */}
                    <Grid size={{ xs: 12 }}>
                        <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                <Box>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                        Field Matching Strategies
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Define per-field comparison strategy. Unlisted fields auto-detect based on value type.
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".json"
                                        style={{ display: 'none' }}
                                        onChange={handleUploadConfig}
                                    />
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<UploadFileIcon />}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        Import JSON
                                    </Button>
                                    {fieldStrategies.length > 0 && (
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={handleExportConfig}
                                        >
                                            Export JSON
                                        </Button>
                                    )}
                                </Box>
                            </Box>

                            {/* Add New Field Row */}
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
                                <TextField
                                    size="small"
                                    label="Field Name"
                                    value={newFieldName}
                                    onChange={(e) => setNewFieldName(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddField(); }}
                                    sx={{ flex: 1, maxWidth: 300 }}
                                    placeholder="e.g. customer_name"
                                />
                                <FormControl size="small" sx={{ minWidth: 140 }}>
                                    <InputLabel>Strategy</InputLabel>
                                    <Select
                                        value={newFieldStrategy}
                                        label="Strategy"
                                        onChange={(e) => setNewFieldStrategy(e.target.value as Strategy)}
                                    >
                                        {VALID_STRATEGIES.map(s => (
                                            <MenuItem key={s} value={s}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: strategyColor(s) }} />
                                                    {s}
                                                </Box>
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={handleAddField}
                                    disabled={!newFieldName.trim()}
                                    sx={{ border: '1px solid', borderColor: 'divider' }}
                                >
                                    <AddIcon />
                                </IconButton>
                            </Box>

                            {/* Entries Table */}
                            {fieldStrategies.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 3, color: 'text.disabled' }}>
                                    <Typography variant="body2">
                                        No field strategies configured. Fields will auto-detect comparison strategy based on value type.
                                    </Typography>
                                    <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
                                        Upload a JSON config file or add fields manually above.
                                    </Typography>
                                </Box>
                            ) : (
                                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                                    <Box sx={{ display: 'flex', px: 2, py: 0.75, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
                                        <Typography variant="caption" sx={{ fontWeight: 700, flex: 1, color: 'text.secondary' }}>Field Name</Typography>
                                        <Typography variant="caption" sx={{ fontWeight: 700, width: 160, color: 'text.secondary' }}>Strategy</Typography>
                                        <Typography variant="caption" sx={{ fontWeight: 700, width: 48, textAlign: 'center', color: 'text.secondary' }}></Typography>
                                    </Box>
                                    {fieldStrategies.map((entry) => (
                                        <Box
                                            key={entry.field}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                px: 2, py: 0.5,
                                                borderBottom: '1px solid',
                                                borderColor: 'divider',
                                                '&:last-child': { borderBottom: 'none' },
                                                '&:hover': { bgcolor: 'action.hover' }
                                            }}
                                        >
                                            <Typography variant="body2" sx={{ flex: 1, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                                {entry.field}
                                            </Typography>
                                            <FormControl size="small" sx={{ width: 160 }}>
                                                <Select
                                                    value={entry.strategy}
                                                    onChange={(e) => handleStrategyChange(entry.field, e.target.value as Strategy)}
                                                    variant="standard"
                                                    disableUnderline
                                                    sx={{ fontSize: '0.8rem' }}
                                                >
                                                    {VALID_STRATEGIES.map(s => (
                                                        <MenuItem key={s} value={s}>
                                                            <Chip
                                                                label={s}
                                                                size="small"
                                                                sx={{
                                                                    fontWeight: 700,
                                                                    fontSize: '0.65rem',
                                                                    height: 20,
                                                                    bgcolor: `${strategyColor(s)}18`,
                                                                    color: strategyColor(s),
                                                                    border: `1px solid ${strategyColor(s)}40`
                                                                }}
                                                            />
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleRemoveField(entry.field)}
                                                sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                                            >
                                                <DeleteOutlineIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    ))}
                                </Box>
                            )}

                            {fieldStrategies.length > 0 && (
                                <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {VALID_STRATEGIES.map(s => {
                                        const count = fieldStrategies.filter(e => e.strategy === s).length;
                                        if (count === 0) return null;
                                        return (
                                            <Chip
                                                key={s}
                                                label={`${s}: ${count}`}
                                                size="small"
                                                sx={{
                                                    fontWeight: 600,
                                                    fontSize: '0.7rem',
                                                    bgcolor: `${strategyColor(s)}12`,
                                                    color: strategyColor(s),
                                                    border: `1px solid ${strategyColor(s)}30`
                                                }}
                                            />
                                        );
                                    })}
                                    <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', ml: 1 }}>
                                        {fieldStrategies.length} field{fieldStrategies.length !== 1 ? 's' : ''} configured
                                    </Typography>
                                </Box>
                            )}

                            {/* JSON Config Format Hint */}
                            <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1, border: '1px dashed', borderColor: 'divider' }}>
                                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                                    JSON Config Format — mirrors your GT structure
                                </Typography>
                                <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
{`{
  "events": [
    {
      "timestamp": "EXACT",
      "event": "SEMANTIC",
      "name": "FUZZY",
      "internal_notes": "IGNORE"
    }
  ]
}`}
                                </Typography>
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
            </Box>

            <UBSSnackbar
                open={openSnackbar}
                message={snackbarMessage}
                severity={snackbarSeverity}
                onClose={() => setOpenSnackbar(false)}
            />
        </Box>
    );
}
