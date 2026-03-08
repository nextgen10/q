'use client';
import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Button, Tabs, Tab, TextField, Accordion, AccordionSummary, AccordionDetails, Grid, Dialog, DialogTitle, DialogContent, IconButton, CircularProgress, Collapse, Tooltip as MuiTooltip, Card, CardContent, Divider, Alert } from '@mui/material';
import UBSSnackbar from '@/components/UBSSnackbar';
import { API_BASE_URL } from '@/features/agent-eval/utils/config';
import { authFetch } from '@/features/agent-eval/utils/authFetch';
import { alpha, useTheme } from '@mui/material/styles';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import dynamic from 'next/dynamic';
import PsychologyIcon from '@mui/icons-material/Psychology';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import AssistantIcon from '@mui/icons-material/Assistant';
import TimelineIcon from '@mui/icons-material/Timeline';
import FunctionsIcon from '@mui/icons-material/Functions';
import CodeIcon from '@mui/icons-material/Code';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import JavascriptIcon from '@mui/icons-material/Javascript';
import DataObjectIcon from '@mui/icons-material/DataObject';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import InfoIcon from '@mui/icons-material/Info';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DifferenceIcon from '@mui/icons-material/Difference';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import HistoryIcon from '@mui/icons-material/History';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { useAgentEvents } from '@/features/agent-eval/hooks/useAgentEvents';
import * as XLSX from 'xlsx';
import { useEvaluation } from '@/features/agent-eval/contexts/EvaluationContext';


import JsonView from 'react18-json-view';
import 'react18-json-view/src/style.css';
import 'react18-json-view/src/dark.css';

// Type definitions
interface EvaluationResult {
    id: string | number;
    aggregate?: {
        n_queries?: number;
        accuracy?: number;
        completeness?: number;
        hallucination?: number;
        consistency?: number;
        safety?: number;
        rqs?: number;
    };
    per_query?: Record<string, { outputs?: Array<Record<string, unknown>> }>;
    accuracy_per_query?: Record<string, number>;
    consistency_per_query?: Record<string, number>;
    evaluation_status?: string;
    run_details?: Record<string, Record<string, unknown>>;
    [key: string]: unknown;
}

const isEvaluationResult = (value: unknown): value is EvaluationResult => {
    if (!value || typeof value !== 'object') return false;
    const v = value as { id?: unknown };
    return typeof v.id === 'string' || typeof v.id === 'number';
};

const Tooltip = MuiTooltip;

function safeJsonParse<T>(raw: string | null, fallback: T): T {
    if (!raw) return fallback;
    try { return JSON.parse(raw); } catch { return fallback; }
}

type EvalConfig = {
    semantic_threshold: number;
    alpha: number;
    beta: number;
    gamma: number;
    enable_safety: boolean;
    llm_model_name: string;
    accuracy_threshold: number;
    consistency_threshold: number;
    hallucination_threshold: number;
    rqs_threshold: number;
    fuzzy_threshold: number;
    w_accuracy: number;
    w_completeness: number;
    w_hallucination: number;
    w_safety: number;
    field_strategies: Record<string, unknown>;
};

const safeNum = (value: string | null, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const loadEvalConfigFromStorage = (overrides?: Partial<EvalConfig>): EvalConfig => ({
    semantic_threshold: safeNum(localStorage.getItem('config_semantic_threshold'), 0.72),
    alpha: safeNum(localStorage.getItem('config_alpha'), 0.6),
    beta: safeNum(localStorage.getItem('config_beta'), 0.2),
    gamma: safeNum(localStorage.getItem('config_gamma'), 0.2),
    enable_safety: localStorage.getItem('config_enable_safety') !== 'false',
    llm_model_name: localStorage.getItem('config_llm_model_name') || 'gpt-4o',
    accuracy_threshold: safeNum(localStorage.getItem('config_accuracy_threshold'), 0.5),
    consistency_threshold: safeNum(localStorage.getItem('config_consistency_threshold'), 0.5),
    hallucination_threshold: safeNum(localStorage.getItem('config_hallucination_threshold'), 0.5),
    rqs_threshold: safeNum(localStorage.getItem('config_rqs_threshold'), 0.5),
    fuzzy_threshold: safeNum(localStorage.getItem('config_fuzzy_threshold'), 0.85),
    w_accuracy: safeNum(localStorage.getItem('config_w_accuracy'), 0.45),
    w_completeness: safeNum(localStorage.getItem('config_w_completeness'), 0.25),
    w_hallucination: safeNum(localStorage.getItem('config_w_hallucination'), 0.15),
    w_safety: safeNum(localStorage.getItem('config_w_safety'), 0.15),
    field_strategies: safeJsonParse(localStorage.getItem('config_field_strategies'), {}),
    ...overrides,
});

const getErrorMessage = (error: unknown, fallback = 'Unexpected error'): string => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return fallback;
};

const asNonEmptyString = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    return value.trim().length > 0 ? value : null;
};

const metricTooltips: { [key: string]: string } = {
    "Accuracy": "Measures correctness based on exact match or semantic similarity. (0-1)",
    "Completeness": "Measures if all expected fields from the ground truth are present in the AI output.",
    "Consistency": "Measures similarity of outputs across multiple runs or internal coherence. (0-1)",
    "Hallucination": "Identifies if the output contains information not present in the reference or context. (0-1)",
    "Safety Score": "Unified score (0-1) representing both content safety (non-toxicity) and qualitative judge results. 1.0 is perfectly safe/accurate.",
    "Match Type": "The criteria used for determining correctness (e.g., exact match, semantic similarity).",
    "Error Type": "Classification of the result as Correct or Hallucination."
};


function QueryConsistencyDialog({ open, onClose, qid, perQueryData }: { open: boolean, onClose: () => void, qid: string, perQueryData: any }) {
    const theme = useTheme();
    const outputs = perQueryData?.outputs || [];

    const fieldStability = React.useMemo(() => {
        const fieldMap: Record<string, { values: any[], stability: number }> = {};
        outputs.forEach((out: any) => {
            try {
                const parsed = JSON.parse(out.output);
                if (typeof parsed === 'object' && parsed !== null) {
                    Object.entries(parsed).forEach(([k, v]) => {
                        if (!fieldMap[k]) fieldMap[k] = { values: [], stability: 0 };
                        fieldMap[k].values.push(JSON.stringify(v));
                    });
                }
            } catch (e) {
                // Not JSON or parse err
            }
        });

        Object.keys(fieldMap).forEach(k => {
            const vals = fieldMap[k].values;
            const unique = new Set(vals).size;
            fieldMap[k].stability = (vals.length - (unique - 1)) / vals.length;
        });

        return Object.entries(fieldMap).sort((a, b) => a[1].stability - b[1].stability);
    }, [outputs]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                <Box>
                    <Typography variant="h6" fontWeight="bold">Consistency Analyst</Typography>
                    <Typography variant="caption" color="text.secondary">Evaluating variance of query: <code>{qid}</code> across {outputs.length} runs</Typography>
                </Box>
                <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 2 }}>
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Paper variant="outlined" sx={{ p: 2, height: '100%', bgcolor: alpha(theme.palette.info.main, 0.02) }}>
                            <Typography variant="subtitle2" gutterBottom fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <HistoryIcon fontSize="small" /> Execution Variance
                            </Typography>
                            <Box sx={{ mt: 2 }}>
                                {outputs.map((out: any, i: number) => (
                                    <Paper key={i} sx={{ p: 1, mb: 1, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography variant="caption" fontWeight="bold">Run: {out.run_id}</Typography>
                                            <Chip label={`${(out.accuracy * 100).toFixed(0)}% Acc`} size="small" variant="outlined" sx={{ height: 16, fontSize: '0.6rem' }} />
                                        </Box>
                                        <Typography variant="body2" sx={{ fontSize: '0.7rem', color: 'text.secondary', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                            {out.output}
                                        </Typography>
                                    </Paper>
                                ))}
                            </Box>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, md: 8 }}>
                        <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.secondary.main, 0.02) }}>
                            <Typography variant="subtitle2" gutterBottom fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <AssessmentIcon fontSize="small" /> Field-Level Stability (JSON)
                            </Typography>
                            {fieldStability.length > 0 ? (
                                <Table size="small" sx={{ mt: 1 }}>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Field Name</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Stability</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Status</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {fieldStability.map(([name, data]) => (
                                            <TableRow key={name}>
                                                <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{name}</TableCell>
                                                <TableCell align="right" sx={{ fontSize: '0.75rem' }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                                                        <Box sx={{ width: 40, height: 4, bgcolor: alpha(theme.palette.divider, 0.5), borderRadius: 2, overflow: 'hidden' }}>
                                                            <Box sx={{ width: `${data.stability * 100}%`, height: '100%', bgcolor: data.stability >= 0.8 ? 'success.main' : 'warning.main' }} />
                                                        </Box>
                                                        {(data.stability * 100).toFixed(0)}%
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={data.stability === 1 ? 'STATIC' : data.stability >= 0.7 ? 'STABLE' : 'DRIFTING'}
                                                        size="small"
                                                        sx={{
                                                            fontSize: '0.6rem',
                                                            height: 18,
                                                            bgcolor: data.stability === 1 ? alpha(theme.palette.success.main, 0.1) : data.stability >= 0.7 ? alpha(theme.palette.info.main, 0.1) : alpha(theme.palette.error.main, 0.1),
                                                            color: data.stability === 1 ? theme.palette.success.main : data.stability >= 0.7 ? theme.palette.info.main : theme.palette.error.main
                                                        }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <Box sx={{ p: 4, textAlign: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">Plain text output detected. Field-level stability analysis is only available for JSON responses.</Typography>
                                </Box>
                            )}
                        </Paper>
                    </Grid>
                </Grid>
            </DialogContent>
        </Dialog>
    );
}

function RunResultRow({ run, thresholds, expandAction, result }: { run: any, thresholds: any, expandAction: any, result: any }) {
    const theme = useTheme();
    const [expanded, setExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [consistencyDialog, setConsistencyDialog] = useState<{ open: boolean, qid: string } | null>(null);

    useEffect(() => {
        if (expandAction) {
            setExpanded(expandAction.type === 'expand');
        }
    }, [expandAction]);

    const formatMetric = (val: any, decimals = 2) => {
        if (val === null || val === undefined || isNaN(val)) return 'N/A';
        return Number(val).toFixed(decimals);
    };

    // Group fields by strategy for the Accuracy tab
    const accuracyGroups = React.useMemo(() => {
        const groups: { [key: string]: any[] } = {};
        run.outputs.forEach((out: any) => {
            Object.entries(out.field_scores || {}).forEach(([fieldName, scoreData]: [string, any]) => {
                const strategy = scoreData.match_strategy || 'Unknown';
                if (!groups[strategy]) groups[strategy] = [];
                groups[strategy].push({
                    fieldName,
                    qid: out.qid,
                    ...scoreData
                });
            });
        });
        return groups;
    }, [run.outputs]);

    return (
        <React.Fragment>
            <TableRow sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.05), '&:hover': { bgcolor: alpha(theme.palette.secondary.main, 0.08) } }}>
                <TableCell>
                    <IconButton size="small" onClick={() => setExpanded(!expanded)}>
                        {expanded ? <ExpandMoreIcon sx={{ transform: 'rotate(180deg)' }} /> : <ExpandMoreIcon />}
                    </IconButton>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <InsertDriveFileIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                        {run.runId}
                    </Box>
                </TableCell>
                <TableCell align="center">
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: run.avg.completeness >= 0.9 ? 'success.main' : 'warning.main' }}>
                        {(run.avg.completeness * 100).toFixed(1)}%
                    </Typography>
                </TableCell>
                <TableCell align="center">
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: run.avg.hallucination <= (thresholds.hallucination_threshold || 0.1) ? 'success.main' : 'error.main' }}>
                        {(run.avg.hallucination * 100).toFixed(1)}%
                    </Typography>
                </TableCell>
                <TableCell align="center">
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: run.avg.accuracy >= (thresholds.accuracy_threshold || 0.5) ? 'success.main' : 'error.main' }}>
                        {(run.avg.accuracy * 100).toFixed(1)}%
                    </Typography>
                </TableCell>
                <TableCell align="center">
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: (run.avg.consistency ?? 0) >= (thresholds.consistency_threshold || 0.5) ? 'success.main' : 'error.main' }}>
                        {((run.avg.consistency ?? 0) * 100).toFixed(1)}%
                    </Typography>
                </TableCell>
                <TableCell align="center">
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: (run.avg.safety_score ?? 1.0) >= 0.8 ? 'success.main' : 'error.main' }}>
                        {((run.avg.safety_score ?? 1.0) * 100).toFixed(1)}%
                    </Typography>
                </TableCell>
                <TableCell align="center">
                    <Chip
                        label={run.all_passed ? 'ALL PASS' : 'SOME FAIL'}
                        size="small"
                        color={run.all_passed ? 'success' : 'warning'}
                        sx={{ fontWeight: 'bold', fontSize: '0.65rem' }}
                    />
                </TableCell>
            </TableRow>

            <TableRow>
                <TableCell colSpan={9} style={{ paddingBottom: 0, paddingTop: 0 }}>
                    <Collapse in={expanded} timeout="auto" unmountOnExit>
                        <Box sx={{ m: 2, p: 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                                <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} textColor="primary" indicatorColor="primary" variant="scrollable" scrollButtons="auto">
                                    <Tab
                                        icon={<CheckCircleIcon sx={{ fontSize: 18 }} />}
                                        iconPosition="start"
                                        label="Completeness"
                                        sx={{ minHeight: 48, fontWeight: 'bold' }}
                                    />
                                    <Tab
                                        icon={<DifferenceIcon sx={{ fontSize: 18 }} />}
                                        iconPosition="start"
                                        label="Hallucination"
                                        sx={{ minHeight: 48, fontWeight: 'bold' }}
                                    />
                                    <Tab
                                        icon={<FunctionsIcon sx={{ fontSize: 18 }} />}
                                        iconPosition="start"
                                        label="Accuracy"
                                        sx={{ minHeight: 48, fontWeight: 'bold' }}
                                    />
                                    <Tab
                                        icon={<TimelineIcon sx={{ fontSize: 18 }} />}
                                        iconPosition="start"
                                        label="Consistency"
                                        sx={{ minHeight: 48, fontWeight: 'bold' }}
                                    />
                                    <Tab
                                        icon={<PsychologyIcon sx={{ fontSize: 18 }} />}
                                        iconPosition="start"
                                        label="Safety & Toxicity"
                                        sx={{ minHeight: 48, fontWeight: 'bold' }}
                                    />
                                </Tabs>
                            </Box>

                            {/* 1. CORRECTNESS TAB (JSON LEVEL - FILE SUMMARY) */}
                            {activeTab === 0 && (
                                <Box sx={{ p: 1 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>JSON File Structural Integrity (Aggregate)</Typography>
                                    <Grid container spacing={3}>
                                        <Grid size={{ xs: 12, md: 4 }}>
                                            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: alpha(theme.palette.success.main, 0.02) }}>
                                                <Typography variant="caption" color="text.secondary" display="block">Total Ground Truth Keys</Typography>
                                                <Typography variant="h4" fontWeight="bold">{run.outputs.reduce((a: number, b: any) => a + (b.gt_keys?.length || 0), 0)}</Typography>
                                            </Paper>
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 4 }}>
                                            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: alpha(theme.palette.info.main, 0.02) }}>
                                                <Typography variant="caption" color="text.secondary" display="block">Total AI Output Keys</Typography>
                                                <Typography variant="h4" fontWeight="bold">{run.outputs.reduce((a: number, b: any) => a + (b.aio_keys?.length || 0), 0)}</Typography>
                                            </Paper>
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 4 }}>
                                            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: alpha(theme.palette.error.main, 0.02) }}>
                                                <Typography variant="caption" color="text.secondary" display="block">Unique Missing Fields</Typography>
                                                <Typography variant="h4" fontWeight="bold" color="error.main">
                                                    {new Set(run.outputs.flatMap((o: any) => o.missing_keys || [])).size}
                                                </Typography>
                                            </Paper>
                                        </Grid>

                                        <Grid size={{ xs: 12 }}>
                                            <Paper variant="outlined" sx={{ p: 2 }}>
                                                <Typography variant="subtitle2" gutterBottom fontWeight="bold">Summary of All Missing Fields:</Typography>
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                                    {Array.from(new Set(run.outputs.flatMap((o: any) => o.missing_keys || []))).length > 0 ? (
                                                        Array.from(new Set(run.outputs.flatMap((o: any) => o.missing_keys || []))).map((k: any, i) => (
                                                            <Chip key={i} label={k} size="small" variant="outlined" color="error" />
                                                        ))
                                                    ) : (
                                                        <Typography variant="body2" color="success.main">Perfect structural match. No missing fields across any records.</Typography>
                                                    )}
                                                </Box>
                                            </Paper>
                                        </Grid>
                                    </Grid>
                                </Box>
                            )}

                            {/* 2. HALLUCINATION TAB (JSON LEVEL - FILE SUMMARY) */}
                            {activeTab === 1 && (
                                <Box sx={{ p: 1 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>Hallucination & Schema Compliance (Aggregate)</Typography>
                                    <Grid container spacing={3}>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: alpha(theme.palette.warning.main, 0.02) }}>
                                                <Typography variant="caption" color="text.secondary" display="block">Total Extra Keys (Not in GT)</Typography>
                                                <Typography variant="h4" fontWeight="bold" color="warning.main">
                                                    {run.outputs.reduce((a: number, b: any) => a + (b.extra_keys?.length || 0), 0)}
                                                </Typography>
                                            </Paper>
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: alpha(theme.palette.error.main, 0.02) }}>
                                                <Typography variant="caption" color="text.secondary" display="block">Overall Hallucination Index (File Average)</Typography>
                                                <Typography variant="h4" fontWeight="bold" color={run.avg.hallucination > 0.1 ? "error.main" : "success.main"}>
                                                    {(run.avg.hallucination * 100).toFixed(1)}%
                                                </Typography>
                                            </Paper>
                                        </Grid>

                                        <Grid size={{ xs: 12 }}>
                                            <Paper variant="outlined" sx={{ p: 2 }}>
                                                <Typography variant="subtitle2" gutterBottom fontWeight="bold">List of All Hallucinated Fields:</Typography>
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                                    {Array.from(new Set(run.outputs.flatMap((o: any) => o.extra_keys || []))).length > 0 ? (
                                                        Array.from(new Set(run.outputs.flatMap((o: any) => o.extra_keys || []))).map((k: any, i) => (
                                                            <Chip key={i} label={k} size="small" variant="outlined" color="warning" />
                                                        ))
                                                    ) : (
                                                        <Typography variant="body2" color="success.main">Perfect compliance. No extra fields found in the AI output.</Typography>
                                                    )}
                                                </Box>
                                            </Paper>
                                        </Grid>
                                    </Grid>
                                </Box>
                            )}

                            {/* 3. ACCURACY TAB (FIELD LEVEL GROUPED BY STRATEGY) */}
                            {activeTab === 2 && (
                                <Box>
                                    <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>Field Correlation & Accuracy Strategy Breakdown</Typography>
                                    {Object.entries(accuracyGroups).length > 0 ? (
                                        Object.entries(accuracyGroups).map(([strategy, fields]) => {
                                            const stratUpper = strategy.toUpperCase();
                                            const scoreColName = stratUpper === 'SEMANTIC' ? 'Semantic Score'
                                                : stratUpper === 'FUZZY' ? 'Fuzzy Score'
                                                : stratUpper === 'EXACT' ? 'Exact Match Score'
                                                : `${strategy} Score`;
                                            const threshold = stratUpper === 'SEMANTIC' ? (thresholds?.semantic_threshold || 0.72)
                                                : stratUpper === 'FUZZY' ? (thresholds?.fuzzy_threshold || 0.85)
                                                : null;

                                            return (
                                            <Accordion key={strategy} defaultExpanded sx={{ mb: 2, border: '1px solid', borderColor: alpha(theme.palette.info.main, 0.2), boxShadow: 'none' }}>
                                                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: alpha(theme.palette.info.main, 0.05) }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                        <Typography sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>{strategy} Match</Typography>
                                                        <Chip label={`${fields.length} Fields`} size="small" color="primary" variant="outlined" />
                                                        <Chip label={threshold !== null ? `Threshold: ${(threshold * 100).toFixed(0)}%` : 'Binary'} size="small" variant="outlined" color="info" />
                                                    </Box>
                                                </AccordionSummary>
                                                <AccordionDetails sx={{ p: 0 }}>
                                                    <Table size="small" sx={{ tableLayout: 'fixed' }}>
                                                        <TableHead sx={{ bgcolor: alpha(theme.palette.info.main, 0.02) }}>
                                                            <TableRow>
                                                                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem', width: '12%' }}>Field Name</TableCell>
                                                                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem', width: '15%' }}>Query ID</TableCell>
                                                                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem', width: '23%' }}>Ground Truth</TableCell>
                                                                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem', width: '23%' }}>AI Output</TableCell>
                                                                <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.75rem', width: '18%' }}>{scoreColName}</TableCell>
                                                                <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.75rem', width: '9%' }}>Final Score</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {fields.map((f, i) => {
                                                                const sim = Number(f.similarity) || 0;
                                                                const sc = Number(f.score) || 0;
                                                                const simPct = (sim * 100).toFixed(1);
                                                                const threshPct = threshold !== null ? (threshold * 100).toFixed(0) : null;
                                                                const scoreDisplay = stratUpper === 'EXACT'
                                                                    ? (sim >= 1.0 ? 'true' : 'false')
                                                                    : threshPct !== null
                                                                        ? `${simPct} ${sc >= 1.0 ? '>' : '<='} ${threshPct} (Threshold)`
                                                                        : `${simPct}%`;
                                                                const scoreColor = stratUpper === 'EXACT'
                                                                    ? (sim >= 1.0 ? 'success.main' : 'error.main')
                                                                    : (sc >= 1.0 ? 'success.main' : 'error.main');

                                                                return (
                                                                <TableRow key={i}>
                                                                    <TableCell sx={{ fontSize: '0.75rem', fontWeight: 'medium', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                        <Tooltip title={String(f.fieldName || '')} arrow>
                                                                            <span>{String(f.fieldName || 'N/A')}</span>
                                                                        </Tooltip>
                                                                    </TableCell>
                                                                    <TableCell sx={{ fontSize: '0.7rem', color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                        <Tooltip title={String(f.qid || '')} arrow>
                                                                            <span>{String(f.qid || 'N/A')}</span>
                                                                        </Tooltip>
                                                                    </TableCell>
                                                                    <TableCell sx={{ fontSize: '0.7rem', color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                        <Tooltip title={String(f.gt_value || '')} arrow>
                                                                            <span>{String(f.gt_value || 'N/A')}</span>
                                                                        </Tooltip>
                                                                    </TableCell>
                                                                    <TableCell sx={{ fontSize: '0.7rem', color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                        <Tooltip title={String(f.aio_value || '')} arrow>
                                                                            <span>{String(f.aio_value || 'N/A')}</span>
                                                                        </Tooltip>
                                                                    </TableCell>
                                                                    <TableCell align="center" sx={{ fontSize: '0.73rem', fontWeight: 'bold', color: scoreColor }}>
                                                                        {scoreDisplay}
                                                                    </TableCell>
                                                                    <TableCell align="center">
                                                                        <Chip
                                                                            label={sc >= 1.0 ? '1' : '0'}
                                                                            size="small"
                                                                            sx={{ height: 22, minWidth: 32, fontSize: '0.75rem', fontWeight: 'bold', bgcolor: sc >= 1.0 ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.error.main, 0.1), color: sc >= 1.0 ? 'success.main' : 'error.main' }}
                                                                        />
                                                                    </TableCell>
                                                                </TableRow>
                                                                );
                                                            })}
                                                        </TableBody>
                                                    </Table>
                                                </AccordionDetails>
                                            </Accordion>
                                            );
                                        })
                                    ) : (
                                        <Typography variant="body2" color="text.secondary">No field-level accuracy data found.</Typography>
                                    )}
                                </Box>
                            )}

                            {/* 4. CONSISTENCY TAB (PER QUERY BREAKDOWN) */}
                            {activeTab === 3 && (
                                <Box sx={{ p: 1 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>Query-Level Consistency Breakdown (Across All Runs)</Typography>
                                    <Grid container spacing={3}>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: alpha(theme.palette.info.main, 0.02) }}>
                                                <Typography variant="caption" color="text.secondary" display="block">Average Run Consistency</Typography>
                                                <Typography variant="h4" fontWeight="bold" color="primary.main">
                                                    {(run.avg.consistency * 100).toFixed(1)}%
                                                </Typography>
                                            </Paper>
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: alpha(theme.palette.secondary.main, 0.02) }}>
                                                <Typography variant="caption" color="text.secondary" display="block">Most Inconsistent Query</Typography>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {(() => {
                                                        const entries = Object.entries(run.consistency_per_query || {});
                                                        if (entries.length === 0) return "N/A (Single Run)";
                                                        const min = entries.reduce((a, b) => (Number(a[1]) || 0) < (Number(b[1]) || 0) ? a : b);
                                                        return `${min[0].slice(0, 15)}... (${((Number(min[1]) || 0) * 100).toFixed(1)}%)`;
                                                    })()}
                                                </Typography>
                                            </Paper>
                                        </Grid>

                                        <Grid size={{ xs: 12 }}>
                                            <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
                                                <Table size="small">
                                                    <TableHead sx={{ bgcolor: alpha(theme.palette.divider, 0.3) }}>
                                                        <TableRow>
                                                            <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Query ID</TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Consistency Score</TableCell>
                                                            <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Stability</TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Analysis</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {run.outputs.map((o: any, i: number) => {
                                                            const c = run.consistency_per_query?.[o.qid] ?? 1.0;
                                                            return (
                                                                <TableRow key={i}>
                                                                    <TableCell sx={{ fontSize: '0.75rem' }}>{o.qid}</TableCell>
                                                                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
                                                                        {(c * 100).toFixed(1)}%
                                                                    </TableCell>
                                                                    <TableCell align="center">
                                                                        <Chip
                                                                            label={c >= 0.8 ? 'STABLE' : 'UNSTABLE'}
                                                                            size="small"
                                                                            color={c >= 0.8 ? 'success' : 'warning'}
                                                                            variant="outlined"
                                                                            sx={{ fontSize: '0.6rem', height: 18 }}
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell align="right">
                                                                        <Tooltip title="View Consistency Details">
                                                                            <IconButton
                                                                                size="small"
                                                                                color="primary"
                                                                                onClick={() => setConsistencyDialog({ open: true, qid: o.qid })}
                                                                            >
                                                                                <AssessmentIcon sx={{ fontSize: 16 }} />
                                                                            </IconButton>
                                                                        </Tooltip>
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        </Grid>
                                    </Grid>
                                </Box>
                            )}

                            {/* 5. SAFETY & TOXICITY TAB (JSON LEVEL SUMMARY) */}
                            {activeTab === 4 && (
                                <Box sx={{ p: 1 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>JSON Payload Safety & Quality Analysis (Run Level)</Typography>
                                    <Paper variant="outlined" sx={{ p: 3, borderLeft: '6px solid', borderLeftColor: (run.details?.safety_score || run.avg.safety_score || 1.0) >= 0.8 ? 'success.main' : 'error.main', bgcolor: (run.details?.safety_score || run.avg.safety_score || 1.0) >= 0.8 ? alpha(theme.palette.success.main, 0.02) : alpha(theme.palette.error.main, 0.02) }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <Box>
                                                <Typography variant="h6" fontWeight="bold" gutterBottom>Consolidated Safety & Quality Score</Typography>
                                                <Typography variant="body2" color="text.secondary">Unified assessment of content safety (non-toxicity) and qualitative reasoning for run <code style={{ padding: '2px 4px', background: alpha(theme.palette.text.primary, 0.05) }}>{run.runId}</code></Typography>
                                            </Box>
                                            <Box sx={{ textAlign: 'right' }}>
                                                <Typography variant="h3" fontWeight="bold" color={(run.details?.safety_score || run.avg.safety_score || 1.0) >= 0.8 ? "success.main" : "error.main"}>
                                                    {((run.details?.safety_score || run.avg.safety_score || 1.0) * 100).toFixed(1)}%
                                                </Typography>
                                                <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 1, fontWeight: 'bold' }}>Safety Score</Typography>
                                            </Box>
                                        </Box>

                                        <Divider sx={{ my: 2 }} />

                                        {(run.details?.safety_score || run.avg.safety_score || 1.0) < 0.8 ? (
                                            <Box>
                                                <Typography variant="subtitle2" color="error" gutterBottom fontWeight="bold">Identified Issues & Reasoning:</Typography>
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1, mb: 2 }}>
                                                    {(run.details?.safety_issues || []).length > 0 ? (
                                                        run.details.safety_issues.map((issue: string, i: number) => (
                                                            <Chip key={i} label={issue} color="error" size="medium" />
                                                        ))
                                                    ) : (
                                                        <Typography variant="body2">General quality or safety violation detected by the model.</Typography>
                                                    )}
                                                </Box>
                                                {run.details?.llm_explanation && (
                                                    <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.error.main, 0.05), borderRadius: 2, fontStyle: 'italic', border: '1px dashed', borderColor: 'error.light' }}>
                                                        <Typography variant="body2">"{run.details.llm_explanation}"</Typography>
                                                    </Paper>
                                                )}
                                            </Box>
                                        ) : (
                                            <Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                                    <CheckCircleIcon color="success" />
                                                    <Typography variant="body1" color="success.main" fontWeight="medium">Professional content with high qualitative integrity. No safety violations detected.</Typography>
                                                </Box>
                                                {run.details?.llm_explanation && (
                                                    <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.success.main, 0.05), borderRadius: 2, fontStyle: 'italic', border: '1px dashed', borderColor: 'success.light' }}>
                                                        <Typography variant="body2">"{run.details.llm_explanation}"</Typography>
                                                    </Paper>
                                                )}
                                            </Box>
                                        )}

                                        {run.details?.reconstructed_aio && (run.details?.safety_score || run.avg.safety_score || 1.0) < 0.8 && (
                                            <Accordion sx={{ mt: 3, bgcolor: alpha(theme.palette.text.primary, 0.02), boxShadow: 'none', border: '1px solid divider' }}>
                                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Review Flawed Content</Typography>
                                                </AccordionSummary>
                                                <AccordionDetails>
                                                    <Box sx={{ maxHeight: '200px', overflow: 'auto', p: 1, bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.200', borderRadius: 1 }}>
                                                        <pre style={{ margin: 0, color: theme.palette.text.primary, fontSize: '11px' }}>{run.details.reconstructed_aio}</pre>
                                                    </Box>
                                                </AccordionDetails>
                                            </Accordion>
                                        )}
                                    </Paper>
                                </Box>
                            )}
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
            {consistencyDialog && (
                <QueryConsistencyDialog
                    open={consistencyDialog.open}
                    onClose={() => setConsistencyDialog(null)}
                    qid={consistencyDialog.qid}
                    perQueryData={result?.per_query?.[consistencyDialog.qid]}
                />
            )}
        </React.Fragment>
    );
}

function JsonDiffDialog({ open, onClose, initialRun, result, thresholds, allRuns }: { open: boolean, onClose: () => void, initialRun: any, result: any, thresholds: any, allRuns: any[] }) {
    const [selectedRunId, setSelectedRunId] = React.useState<string>('');
    const [viewMode, setViewMode] = React.useState<'json' | 'table'>('json');
    const [jsonDepth, setJsonDepth] = React.useState<number | boolean>(1);
    const theme = useTheme();

    React.useEffect(() => {
        if (initialRun?.runId) {
            setSelectedRunId(initialRun.runId);
        }
    }, [initialRun]);

    const currentRun = React.useMemo(() => {
        if (!selectedRunId) return initialRun;
        return (allRuns || []).find(r => r.runId === selectedRunId) || initialRun;
    }, [selectedRunId, allRuns, initialRun]);

    const allFields = React.useMemo(() => {
        const rows: any[] = [];
        if (!currentRun?.outputs) return rows;

        currentRun.outputs.forEach((out: any) => {
            Object.entries(out.field_scores || {}).forEach(([fieldName, scoreData]: [string, any]) => {
                rows.push({
                    type: 'match',
                    fieldName,
                    qid: out.qid,
                    gt_value: scoreData.gt_value,
                    aio_value: scoreData.aio_value,
                    score: scoreData.score,
                    similarity: scoreData.similarity,
                    strategy: scoreData.match_strategy
                });
            });

            (out.missing_keys || []).forEach((key: string) => {
                if (!out.field_scores?.[key]) {
                    rows.push({ type: 'missing', fieldName: key, qid: out.qid, gt_value: 'EXISTS IN GT', aio_value: 'MISSING', score: 0, strategy: 'STRUCTURAL' });
                }
            });

            (out.extra_keys || []).forEach((key: string) => {
                if (!out.field_scores?.[key]) {
                    rows.push({ type: 'extra', fieldName: key, qid: out.qid, gt_value: 'MISSING', aio_value: 'EXTRA FIELD', score: 0, strategy: 'STRUCTURAL' });
                }
            });
        });

        return rows;
    }, [currentRun]);

    const reconstructed = React.useMemo(() => {
        const fieldMeta: Record<string, any> = {};

        allFields.forEach(f => {
            fieldMeta[f.fieldName] = f;
        });

        // 1. Try to get reconstruction from run_details (preferred for Batch/File mode)
        const activeRunId = selectedRunId || initialRun?.runId;
        const runDetails = result?.run_details?.[activeRunId];
        if (runDetails?.reconstructed_aio && runDetails?.reconstructed_gt) {
            try {
                const gt = JSON.parse(runDetails.reconstructed_gt);
                const aio = JSON.parse(runDetails.reconstructed_aio);
                return { gt, aio, fieldMeta };
            } catch (e) {
                console.warn("Failed to parse run_details reconstruction", e);
            }
        }

        // 2. Try to get actual JSON strings if it's a JSON evaluation or Structured Engine
        const firstOut = currentRun?.outputs?.[0];
        if (currentRun?.outputs?.length === 1 && (firstOut?.match_type === 'json' || firstOut?.match_type === 'json_structured')) {
            try {
                const gt = JSON.parse(firstOut.expected || '{}');
                const aio = JSON.parse(firstOut.output || '{}');
                return { gt, aio, fieldMeta };
            } catch (e) {
                console.warn("Failed to parse actual JSON, falling back to reconstruction", e);
            }
        }

        // 3. Last Resort: Manual unflattening in frontend
        const gt: any = {};
        const aio: any = {};

        allFields.forEach(f => {
            const keyPath = f.fieldName;
            // Split by both dot and underscore to be safe
            let segments = keyPath.split(/[._]/);

            const setInObj = (obj: any, val: any) => {
                let curr = obj;
                for (let i = 0; i < segments.length; i++) {
                    let seg = segments[i];

                    const listMatch = seg.match(/^(.+?)#(\d+)$/);
                    if (listMatch) {
                        const base = listMatch[1];
                        const idx = parseInt(listMatch[2]) - 1;

                        if (!curr[base]) curr[base] = [];
                        if (Array.isArray(curr[base])) {
                            if (i === segments.length - 1) {
                                curr[base][idx] = val;
                            } else {
                                if (!curr[base][idx]) curr[base][idx] = {};
                                curr = curr[base][idx];
                            }
                        } else {
                            // Fallback: if it's not an array, treat the whole segment as a key
                            if (i === segments.length - 1) curr[seg] = val;
                            else { if (!curr[seg]) curr[seg] = {}; curr = curr[seg]; }
                        }
                    } else {
                        if (i === segments.length - 1) {
                            curr[seg] = val;
                        } else {
                            if (!curr[seg]) curr[seg] = {};
                            curr = curr[seg];
                        }
                    }
                }
            };

            setInObj(gt, f.gt_value);
            setInObj(aio, f.aio_value);
        });

        return { gt, aio, fieldMeta };
    }, [allFields, currentRun, result, initialRun, selectedRunId]);

    const customizeNode = React.useCallback((params: any) => {
        if (!params.path) return undefined;

        const pathArr = params.path;

        // 1. Try standard joins (dots and underscores)
        const joinedDot = pathArr.join('.');
        const joinedUnderscore = pathArr.join('_');

        // 2. Try the new '#' 1-indexed join format for arrays
        // This maps JSON-view path [tags, 0] to the backend's tags#1
        const segmentsWithHash = pathArr.map((seg: any) => {
            const s = String(seg);
            return /^\d+$/.test(s) ? `#${parseInt(s) + 1}` : s;
        });

        // Handle nested vs top-level join for the hash path
        // If segments are like ['tags', '#1'], we want 'tags#1'
        const joinedHash = segmentsWithHash.reduce((acc: string, curr: string) => {
            if (!acc) return curr;
            if (curr.startsWith('#')) return acc + curr; // Append #1 directly to parent tags#1
            return acc + '_' + curr; // Standard nesting with _
        }, "");

        const meta = reconstructed.fieldMeta[joinedDot] ||
            reconstructed.fieldMeta[joinedUnderscore] ||
            reconstructed.fieldMeta[joinedHash];

        if (meta) {
            const accThreshold = thresholds?.accuracy_threshold || 0.5;
            const isPass = meta.score >= accThreshold && meta.type === 'match';
            const statusColor = isPass ? theme.palette.success.main : theme.palette.error.main;
            const label = isPass ? 'MATCH' : (meta.type === 'missing' ? 'MISSING' : (meta.type === 'extra' ? 'EXTRA' : 'MISMATCH'));

            return (
                <Box component="span" sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    ml: 1,
                    px: 0.8,
                    py: 0.2,
                    borderRadius: 1,
                    bgcolor: alpha(statusColor, 0.1),
                    border: '1px solid',
                    borderColor: alpha(statusColor, 0.3),
                    verticalAlign: 'middle'
                }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: statusColor }} />
                    <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 'bold', color: statusColor }}>
                        {label} {meta.type === 'match' ? `(${(meta.score * 100).toFixed(0)}%)` : ''}
                    </Typography>
                </Box>
            );
        }
        return undefined;
    }, [reconstructed.fieldMeta, thresholds, theme]);

    if (!initialRun) return null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xl"
            fullWidth
            scroll="paper"
            PaperProps={{
                sx: {
                    height: '90vh',
                    maxHeight: '90vh'
                }
            }}
        >

            <DialogTitle sx={{ p: 0 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <CompareArrowsIcon color="primary" />
                            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>AI Output JSON Diff</Typography>
                            <Tabs
                                value={viewMode}
                                onChange={(_, v) => setViewMode(v)}
                                sx={{ minHeight: 32, bgcolor: alpha(theme.palette.background.paper, 0.5), borderRadius: 1, px: 1, '& .MuiTab-root': { minHeight: 32, py: 0, fontSize: '0.7rem', fontWeight: 'bold' } }}
                            >
                                <Tab label="Side-by-Side JSON" value="json" />
                                <Tab label="Analysis Table" value="table" />
                            </Tabs>
                            {viewMode === 'json' && (
                                <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<UnfoldMoreIcon />}
                                        onClick={() => setJsonDepth(false)}
                                        sx={{ height: 28, fontSize: '0.65rem' }}
                                    >
                                        Expand All
                                    </Button>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<UnfoldLessIcon />}
                                        onClick={() => setJsonDepth(1)}
                                        sx={{ height: 28, fontSize: '0.65rem' }}
                                    >
                                        Collapse All
                                    </Button>
                                </Box>
                            )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">Reviewing original input vs agent response</Typography>
                    </Box>
                    <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
                </Box>
                {allRuns && allRuns.length > 1 && (
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: alpha(theme.palette.background.paper, 1) }}>
                        <Tabs
                            value={selectedRunId || initialRun.runId}
                            onChange={(_, v) => setSelectedRunId(v)}
                            variant="scrollable"
                            scrollButtons="auto"
                            sx={{ minHeight: 40 }}
                        >
                            {allRuns.map(r => (
                                <Tab key={r.runId} label={r.runId} value={r.runId} sx={{ minHeight: 40, fontSize: '0.75rem', fontWeight: 'bold' }} />
                            ))}
                        </Tabs>
                    </Box>
                )}
            </DialogTitle>
            <DialogContent dividers sx={{ p: 0 }}>
                {viewMode === 'json' ? (
                    <Box sx={{ height: '80vh', overflowY: 'auto', p: 3, bgcolor: alpha(theme.palette.background.paper, 0.4) }}>
                        <Grid container spacing={3}>
                            <Grid size={{ xs: 6 }}>
                                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2, boxShadow: theme.shadows[1] }}>
                                    <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', letterSpacing: '0.05rem' }}>
                                        <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: 'primary.main' }} />
                                        EXPECTED (GROUND TRUTH)
                                    </Typography>
                                    <Box>
                                        <JsonView
                                            key={`gt-${jsonDepth}`}
                                            src={reconstructed.gt}
                                            theme={theme.palette.mode === 'dark' ? 'vscode' : 'default'}
                                            customizeNode={customizeNode}
                                            collapsed={jsonDepth}
                                        />
                                    </Box>
                                </Paper>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                                <Paper variant="outlined" sx={{ p: 2, borderLeft: '4px solid', borderLeftColor: theme.palette.primary.main, bgcolor: 'background.paper', borderRadius: 2, boxShadow: theme.shadows[1] }}>
                                    <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', letterSpacing: '0.05rem' }}>
                                        <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: 'secondary.main' }} />
                                        ACTUAL (AI OUTPUT)
                                    </Typography>
                                    <Box>
                                        <JsonView
                                            key={`aio-${jsonDepth}`}
                                            src={reconstructed.aio}
                                            theme={theme.palette.mode === 'dark' ? 'vscode' : 'default'}
                                            customizeNode={customizeNode}
                                            collapsed={jsonDepth}
                                        />
                                    </Box>
                                </Paper>
                            </Grid>
                        </Grid>
                    </Box>
                ) : (
                    <Box sx={{ p: 1 }}>
                        <TableContainer sx={{ overflowX: 'auto' }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold', width: '25%', bgcolor: alpha(theme.palette.background.paper, 1) }}>Field Path</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', width: '30%', bgcolor: alpha(theme.palette.background.paper, 1) }}>Ground Truth</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', width: '30%', bgcolor: alpha(theme.palette.background.paper, 1) }}>AI Output</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 'bold', width: '15%', bgcolor: alpha(theme.palette.background.paper, 1) }}>Analysis</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {allFields.length > 0 ? allFields.map((f, i) => {
                                        const accThreshold = thresholds?.accuracy_threshold || 0.5;
                                        const isPass = f.score >= accThreshold && f.type === 'match';
                                        const isMissing = f.type === 'missing';
                                        const isExtra = f.type === 'extra';

                                        let bgColor = alpha(theme.palette.success.main, 0.05);
                                        let borderColor = alpha(theme.palette.success.main, 0.2);
                                        if (!isPass) {
                                            bgColor = alpha(theme.palette.error.main, 0.05);
                                            borderColor = alpha(theme.palette.error.main, 0.2);
                                        }
                                        if (isMissing || isExtra) {
                                            bgColor = alpha(theme.palette.warning.main, 0.05);
                                            borderColor = alpha(theme.palette.warning.main, 0.2);
                                        }

                                        return (
                                            <TableRow key={i} sx={{
                                                bgcolor: bgColor,
                                                '& td': { borderBottom: `1px solid ${borderColor}` },
                                                '&:hover': { bgcolor: alpha(bgColor, 0.1) }
                                            }}>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace', fontSize: '0.8rem' }}>{f.fieldName}</Typography>
                                                    {f.fieldName !== f.qid && (
                                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>Name: {f.fieldName}</Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Box sx={{ p: 1, bgcolor: alpha(theme.palette.text.primary, 0.02), borderRadius: 1, maxHeight: 150, overflow: 'auto' }}>
                                                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                                                            {typeof f.gt_value === 'object' ? JSON.stringify(f.gt_value, null, 2) : String(f.gt_value || '-')}
                                                        </pre>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Box sx={{ p: 1, bgcolor: alpha(theme.palette.text.primary, 0.02), borderRadius: 1, maxHeight: 150, overflow: 'auto' }}>
                                                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                                                            {typeof f.aio_value === 'object' ? JSON.stringify(f.aio_value, null, 2) : String(f.aio_value || '-')}
                                                        </pre>
                                                    </Box>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
                                                        <Chip
                                                            label={isPass ? 'MATCH' : (isMissing ? 'MISSING' : (isExtra ? 'EXTRA' : 'MISMATCH'))}
                                                            size="small"
                                                            variant="filled"
                                                            color={isPass ? 'success' : (isMissing || isExtra ? 'warning' : 'error')}
                                                            sx={{ fontWeight: 'bold', fontSize: '0.6rem', height: 18 }}
                                                        />
                                                        {f.type === 'match' && (
                                                            <Typography variant="caption" sx={{ fontWeight: 'bold', color: isPass ? 'success.main' : 'error.main', fontSize: '0.65rem' }}>
                                                                {isPass ? 'Accuracy Pass' : 'Low Accuracy'}
                                                            </Typography>
                                                        )}
                                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3, justifyContent: 'center', mt: 0.5 }}>
                                                            {f.strategy && (
                                                                <MuiTooltip title="Match Strategy">
                                                                    <Chip label={f.strategy} size="small" variant="outlined" sx={{ height: 14, fontSize: '0.5rem', px: 0.5 }} />
                                                                </MuiTooltip>
                                                            )}
                                                            {f.similarity != null && (
                                                                <MuiTooltip title="Semantic Similarity">
                                                                    <Chip label={`Sim: ${f.similarity.toFixed(2)}`} size="small" variant="outlined" sx={{ height: 14, fontSize: '0.5rem', px: 0.5 }} />
                                                                </MuiTooltip>
                                                            )}
                                                        </Box>
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    }) : (
                                        <TableRow>
                                            <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                                                <Typography variant="body2" color="text.secondary">No field-level comparison data found.</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
}

function TestEvaluationsPage() {
    const theme = useTheme();
    const [result, setResult] = useState<EvaluationResult | null>(null);
    const [tabValue, setTabValue] = useState(0);
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [evaluationType, setEvaluationType] = useState<'json' | 'batch' | null>(null);

    // Detailed View Dialog
    const [openDialog, setOpenDialog] = useState(false);
    const [jsonDepth, setJsonDepth] = useState(1);
    const [jsonKey, setJsonKey] = useState(0);
    const [expandAction, setExpandAction] = useState<{ type: 'expand' | 'collapse', id: number } | null>(null);

    // Batch Evaluation State
    const [gtPath, setGtPath] = useState('');
    const [aiPath, setAiPath] = useState('');

    // JSON Evaluation State
    const [gtJson, setGtJson] = useState('[\n  {\n    "query_id": "q1",\n    "expected_output": "42",\n    "match_type": "number"\n  }\n]');
    const [outputsJson, setOutputsJson] = useState('[\n  {\n    "query_id": "q1",\n    "output": "42",\n    "run_id": "run1"\n  }\n]');
    const [convertedGt, setConvertedGt] = useState<unknown>(null);
    const [convertedAi, setConvertedAi] = useState<Array<Record<string, unknown>> | null>(null);
    const [gtSource, setGtSource] = useState<string>("");

    // Structured JSON Engine State

    const [showNormalized, setShowNormalized] = useState(false);
    const [normalizedJsonDepth, setNormalizedJsonDepth] = useState(1);
    const [normalizedJsonKey, setNormalizedJsonKey] = useState(0);

    // Config State (Loaded for API calls)
    const [config, setConfig] = useState<EvalConfig>(() => loadEvalConfigFromStorage());

    const [showJsonDiff, setShowJsonDiff] = useState(false);
    const [selectedRunForDiff, setSelectedRunForDiff] = useState<unknown>(null);

    // Agent Events
    const { events, clearEvents } = useAgentEvents();
    const latestEvent = events.length > 0 ? events[events.length - 1] : null;
    const hasNormalizedData = Boolean(convertedGt) || Boolean(convertedAi);

    const { latestResult: globalResult, loading: globalLoading, refreshLatestResult } = useEvaluation();

    // DB is the source of truth — sync from API via global context
    useEffect(() => {
        if (globalResult) {
            setResult(globalResult);
        } else if (!globalLoading) {
            setResult(null);
        }
    }, [globalResult, globalLoading]);

    useEffect(() => {

        setConfig(loadEvalConfigFromStorage());

    }, []);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const handleRunBatch = async () => {
        if (!gtPath || !aiPath) {
            setSnackbarMessage("Please provide both Ground Truth and AI Outputs paths.");
            setOpenSnackbar(true);
            return;
        }

        setLoading(true);
        clearEvents();



        const latestConfig = loadEvalConfigFromStorage();

        try {
            // 1. Preview Normalized Data IMMEDIATELY
            const previewRes = await authFetch(`${API_BASE_URL}/preview-paths`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ground_truth_path: gtPath,
                    ai_outputs_path: aiPath
                })
            });

            if (previewRes.ok) {
                const previewData = await previewRes.json();
                if (previewData.normalized_ground_truth) {
                    setConvertedGt(previewData.normalized_ground_truth);
                    }
                    if (previewData.normalized_ai_outputs) {
                        setConvertedAi(previewData.normalized_ai_outputs);
                }
                if (previewData.ground_truth_source) {
                    setGtSource(previewData.ground_truth_source);
                }
                setEvaluationType('batch');
            }

            // 2. Run Evaluation
            const response = await authFetch(`${API_BASE_URL}/evaluate-from-paths`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ground_truth_path: gtPath,
                    ai_outputs_path: aiPath,
                    ...latestConfig
                })
            });

            if (!response.ok) {
                let detail = "Batch evaluation failed";
                try { const err = await response.json(); detail = err.detail || detail; } catch { /* non-JSON error body */ }
                throw new Error(detail);
            }

            const data: unknown = await response.json();
            if (!isEvaluationResult(data)) throw new Error('Invalid evaluation response format');
            setResult(data);
            await refreshLatestResult();

            // Redundant update but keeps consistency
            const batchNormalizedGt = data.normalized_ground_truth;
            if (batchNormalizedGt) {
                setConvertedGt(batchNormalizedGt);
            }
            const batchNormalizedAi = data.normalized_ai_outputs;
            if (Array.isArray(batchNormalizedAi)) {
                setConvertedAi(batchNormalizedAi);
            }
            const batchGtSource = asNonEmptyString(data.ground_truth_source);
            if (batchGtSource) {
                setGtSource(batchGtSource);
            }

            setEvaluationType('batch');
            setSnackbarMessage("Batch Evaluation Completed Successfully!");
            setOpenSnackbar(true);
        } catch (e: unknown) {
            setSnackbarMessage(`Error: ${getErrorMessage(e, 'Batch evaluation failed')}`);
            setOpenSnackbar(true);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyJson = async (event: React.MouseEvent<HTMLButtonElement>) => {
        if (result) {
            try {
                const jsonString = JSON.stringify(result, null, 2);
                if (typeof window !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(jsonString);
                    setSnackbarMessage("Result JSON copied to clipboard!");
                } else {
                    // Fallback for older browsers or SSR
                    const textArea = document.createElement('textarea');
                    textArea.value = jsonString;

                    // Ensure element is visible but invisible to user
                    textArea.style.position = 'absolute';
                    textArea.style.left = '0';
                    textArea.style.top = '0';
                    textArea.style.opacity = '0';
                    textArea.style.zIndex = '9999';
                    textArea.setAttribute('readonly', '');

                    // Append to the button itself to avoid focus trap issues with Dialog
                    event.currentTarget.appendChild(textArea);

                    // robust selection
                    textArea.focus();
                    textArea.select();
                    textArea.setSelectionRange(0, 999999); // For mobile devices

                    try {
                        document.execCommand('copy');
                        setSnackbarMessage("Result JSON copied to clipboard!");
                    } catch (err) {
                        console.error('Fallback copy failed', err);
                        setSnackbarMessage("Failed to copy JSON");
                    }
                    event.currentTarget.removeChild(textArea);
                }
                setOpenSnackbar(true);
            } catch (error: unknown) {
                console.error('Copy failed', error);
                setSnackbarMessage(`Copy failed: ${getErrorMessage(error, 'Failed to copy JSON')}`);
                setOpenSnackbar(true);
            }
        }
    };

    const handleRunJsonEvaluation = async () => {
        try {
            // Validate JSON first
            let gtInput, outputsInput;
            try {
                gtInput = JSON.parse(gtJson);
                outputsInput = JSON.parse(outputsJson);
            } catch (e) {
                throw new Error("Invalid JSON input.");
            }

            setLoading(true);
            clearEvents(); // Clear old events for new evaluation
            setConvertedGt(null);
            setConvertedAi(null);
            // Clear gtSource and evaluationType for JSON evaluations (should not show filename)
            setGtSource('');
            setEvaluationType('json');

            // 1. Auto-Convert Ground Truth
            const gtRes = await authFetch(`${API_BASE_URL}/convert-json`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: gtInput, mode: 'gt' })
            });
            if (!gtRes.ok) throw new Error("Ground Truth conversion failed");
            const gtData = await gtRes.json();
            setConvertedGt(gtData);

            // 2. Auto-Convert AI Outputs
            const aiRes = await authFetch(`${API_BASE_URL}/convert-json`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: outputsInput, mode: 'ai', run_id: 'manual_run' })
            });
            if (!aiRes.ok) throw new Error("AI Output conversion failed");
            const aiData = await aiRes.json();
            setConvertedAi(Array.isArray(aiData) ? aiData : null);

            const latestConfig = loadEvalConfigFromStorage({ enable_safety: true });

            // 3. Run Evaluation with CONVERTED data and FIXED keys
            const response = await authFetch(`${API_BASE_URL}/evaluate-from-json`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ground_truth: gtData,
                    ai_outputs: aiData,
                    // Force keys to match the conversion output
                    gt_query_id_key: "query_id",
                    gt_expected_key: "expected_output",
                    gt_type_key: "type",
                    pred_query_id_key: "query_id",
                    pred_output_key: "actual_output",
                    pred_run_id_key: "run_id",
                    ...latestConfig
                })
            });

            if (!response.ok) {
                let detail = "JSON evaluation failed";
                try { const err = await response.json(); detail = err.detail || detail; } catch { /* non-JSON error body */ }
                throw new Error(detail);
            }

            const data: unknown = await response.json();
            if (!isEvaluationResult(data)) throw new Error('Invalid evaluation response format');
            setResult(data);
            await refreshLatestResult();

            setGtSource('');
            setEvaluationType('json');
            setSnackbarMessage("JSON Evaluation Completed Successfully!");
            setOpenSnackbar(true);

        } catch (e: unknown) {
            setSnackbarMessage(`Error: ${getErrorMessage(e, 'JSON evaluation failed')}`);
            setOpenSnackbar(true);
        } finally {
            setLoading(false);
        }
    };



    const handleExportToExcel = () => {
        if (!result || !result.per_query) {
            setSnackbarMessage("No evaluation results to export.");
            setOpenSnackbar(true);
            return;
        }

        try {
            // Prepare data for Excel
            const exportData: Array<Record<string, string | number>> = [];

            // Helper function to format metric values
            const formatMetric = (val: unknown) => {
                if (val === 'NA' || val === "NA" || val === null || val === undefined) return 'NA';
                const num = Number(val);
                if (isNaN(num)) return 'NA';
                return num;
            };

            // Helper function to get reason for decision
            const getReasonForDecision = (out: Record<string, unknown>) => {
                const matchType = out.match_type || 'text';
                const getNum = (v: unknown, def = 0) => (v === 'NA' || v == null) ? def : Number(v);
                const semanticScore = getNum(out.semantic_score);
                const accuracy = getNum(out.accuracy);

                const semanticThreshold = config.semantic_threshold || 0.72;

                if (matchType === 'json_structured') {
                    const fmt = (v: unknown) => v != null ? Number(v).toFixed(2) : 'N/A';
                    return `✓ Structured JSON Eval: Acc: ${accuracy.toFixed(2)}, Comp: ${fmt(out.completeness)}, Hall: ${fmt(out.hallucination)}, RQS: ${fmt(out.rqs)}`;
                } else if (matchType === 'json') {
                    return accuracy === 1.0 ? '✓ JSON structural equality' : '✗ JSON structures differ';
                } else if (matchType === 'number') {
                    return accuracy === 1.0 ? '✓ Number match (within tolerance 1e-6)' : '✗ Numbers differ beyond acceptable tolerance';
                } else if (matchType === 'date') {
                    return accuracy === 1.0 ? '✓ Date match (normalized)' : '✗ Dates do not match';
                } else if (matchType === 'email') {
                    return accuracy === 1.0 ? '✓ Email match (normalized)' : '✗ Email addresses do not match';
                } else if (matchType === 'exact') {
                    return accuracy === 1.0 ? '✓ Exact match (String equality)' : `✗ Strings do not match exactly. Semantic Score: ${out.semantic_score !== 'NA' ? semanticScore.toFixed(3) : 'NA'}`;
                } else {
                    if (accuracy === 1.0) {
                        if (out.expected === out.output) {
                            return `✓ Exact match (String equality)`;
                        } else if (semanticScore > semanticThreshold) {
                            return `✓ Semantic Score: ${semanticScore.toFixed(3)} > ${semanticThreshold} (Threshold)`;
                        } else {
                            return `✓ Accuracy: 1.0`;
                        }
                    } else {
                        return `✗ Semantic Score: ${semanticScore.toFixed(3)} ≤ ${semanticThreshold} (Threshold)`;
                    }
                }
            };

            // Extract all evaluation data
            Object.entries(result.per_query || {}).forEach(([qid, data]: [string, any]) => {
                const queryAccuracy = result.accuracy_per_query?.[qid] || 0;
                const queryConsistency = result.consistency_per_query?.[qid] || 0;

                data.outputs?.forEach((out: any, idx: number) => {
                    const row = {
                        'Query ID': qid,
                        'Ground Truth': out.expected || '-',
                        'AI Output': out.output || '-',
                        'Accuracy': formatMetric(out.accuracy),
                        'Query Accuracy': formatMetric(queryAccuracy),
                        'Consistency': formatMetric(queryConsistency),
                        'Toxicity': formatMetric(out.toxicity),
                        'Error Type': out.error_type || '-',
                        'Match Type': out.match_type || '-',
                        'Reason for Decision': getReasonForDecision(out),
                    };
                    exportData.push(row);
                });
            });

            // Create workbook and worksheet
            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Evaluation Results');

            // Auto-size columns
            const maxWidth = 50;
            const colWidths = Object.keys(exportData[0] || {}).map(key => {
                const maxLength = Math.max(
                    key.length,
                    ...exportData.map(row => String(row[key] || '').length)
                );
                return { wch: Math.min(maxLength + 2, maxWidth) };
            });
            worksheet['!cols'] = colWidths;

            // Generate filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `evaluation_results_${timestamp}.xlsx`;

            // Download file
            XLSX.writeFile(workbook, filename);

            setSnackbarMessage(`Exported ${exportData.length} evaluations to ${filename}`);
            setOpenSnackbar(true);
        } catch (error: unknown) {
            console.error('Export failed', error);
            setSnackbarMessage(`Export failed: ${getErrorMessage(error, 'Export failed')}`);
            setOpenSnackbar(true);
        }
    };



    const stats = result ? (() => {
        const n_queries = result.aggregate?.n_queries || 0;
        let totalEvaluations = 0;
        Object.values(result.per_query || {}).forEach((q: any) => {
            totalEvaluations += (q.outputs?.length || 0);
        });

        const accuracyThreshold = config.accuracy_threshold || 0.5;
        const rqsThreshold = config.rqs_threshold || 0.5;
        const pass = (result.aggregate?.accuracy || 0) >= accuracyThreshold && (result.aggregate?.rqs || 0) >= rqsThreshold;

        return {
            accuracy: result.aggregate?.accuracy || 0,
            completeness: result.aggregate?.completeness || 0,
            hallucination: result.aggregate?.hallucination || 0,
            consistency: result.aggregate?.consistency || 0,
            safety: result.aggregate?.safety || 1.0,
            rqs: result.aggregate?.rqs || 0,
            totalQueries: n_queries,
            totalEvaluations,
            status: result.evaluation_status || (pass ? "PASS" : "FAIL"),
            standardStatus: pass ? "PASS" : "FAIL"
        };
    })() : null;

    const groupedRuns = React.useMemo(() => {
        if (!result?.per_query) return [];
        const runs: { [key: string]: any[] } = {};
        Object.entries(result.per_query).forEach(([qid, queryData]: [string, any]) => {
            queryData.outputs?.forEach((out: any) => {
                const rid = out.run_id || 'manual_run';
                if (!runs[rid]) runs[rid] = [];
                runs[rid].push({ ...out, qid });
            });
        });
        return Object.entries(runs).map(([runId, outputs]) => {
            const count = outputs.length;
            const runDetails = result.run_details?.[runId] || null;

            return {
                runId,
                outputs,
                details: runDetails,
                avg: {
                    accuracy: outputs.reduce((a, b) => a + (b.accuracy || 0), 0) / count,
                    completeness: outputs.reduce((a, b) => a + (b.completeness || 0), 0) / count,
                    hallucination: outputs.reduce((a, b) => a + (b.hallucination || 0), 0) / count,
                    safety_score: outputs.reduce((a, b) => a + (b.safety_score || 1.0), 0) / count,
                    consistency: outputs.reduce((a, b) => {
                        const qConsistency = result.consistency_per_query?.[b.qid] || 0;
                        return a + qConsistency;
                    }, 0) / count,
                },
                all_passed: outputs.every(o =>
                    o.error_type === 'correct' &&
                    (o.accuracy || 0) >= (config.accuracy_threshold || 0.5) &&
                    (o.completeness || 0) >= 0.9 &&
                    (o.safety_score === null || o.safety_score >= 0.8)
                ),
                consistency_per_query: result.consistency_per_query || {}
            };
        });
    }, [result, config]);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Page Header - matches RAG Eval */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, mb: 1 }}>
                <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: { xs: '0.95rem', md: '1.1rem' }, letterSpacing: '-0.02em', mb: 0.5, color: 'text.primary' }}>
                        Experimental Evaluations
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.85rem' } }}>
                        Run & Analyze Agent Performance
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    {result?.id && (
                        <Paper
                            elevation={0}
                            sx={{
                                px: 1.5,
                                py: 0.5,
                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                                border: '1px solid',
                                borderColor: (theme) => alpha(theme.palette.primary.main, 0.5),
                                borderRadius: 2,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                            }}
                        >
                            <Typography variant="caption" color="text.primary" sx={{ fontWeight: 'bold', letterSpacing: 1.5, fontSize: '0.75rem' }}>
                                LATEST EVALUATION ID: {result.id}
                            </Typography>
                        </Paper>
                    )}
                    <Button
                        variant="outlined"
                        startIcon={<HistoryIcon />}
                        href="/agent-eval/history"
                    >
                        History
                    </Button>
                </Box>
            </Box>

            {/* Content */}
            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
                <svg width={0} height={0} style={{ position: 'absolute', visibility: 'hidden' }}>
                    <defs>
                        <linearGradient id="export_icon_gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={theme.palette.primary.main} />
                            <stop offset="100%" stopColor={theme.palette.primary.dark} />
                        </linearGradient>
                    </defs>
                </svg>
                {/* Evaluation Analysis - Clean, responsive layout */}
                {stats && (
                    <Box sx={{ mb: 2 }}>
                        <Card sx={{ borderLeft: `4px solid ${stats.status === "PASS" ? theme.palette.success.main : theme.palette.error.main}` }}>
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                {/* Compact Header */}
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 2, rowGap: 1 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                        Evaluation Analysis
                                    </Typography>
                                    <Chip
                                        label={stats.standardStatus}
                                        size="small"
                                        sx={{
                                            fontWeight: 700,
                                            bgcolor: stats.standardStatus === 'PASS' ? alpha(theme.palette.success.main, 0.12) : alpha(theme.palette.error.main, 0.12),
                                            color: stats.standardStatus === 'PASS' ? 'success.main' : 'error.main',
                                            border: '1px solid',
                                            borderColor: stats.standardStatus === 'PASS' ? alpha(theme.palette.success.main, 0.4) : alpha(theme.palette.error.main, 0.4),
                                        }}
                                    />
                                    <Typography variant="body2" color="text.secondary" sx={{ ml: { md: 'auto' } }}>
                                        {stats.totalQueries} queries · {stats.totalEvaluations} evaluations
                                    </Typography>
                                </Box>

                                {/* Metrics Grid - 6 metric cells, responsive */}
                                <Grid container spacing={2} sx={{ mb: 2 }}>
                                    {[
                                        { label: 'RQS', value: (stats.rqs || 0) * 100, primary: true },
                                        { label: 'Accuracy', value: (stats.accuracy || 0) * 100 },
                                        { label: 'Completeness', value: (stats.completeness || 0) * 100 },
                                        { label: 'Hallucination', value: (stats.hallucination || 0) * 100 },
                                        { label: 'Consistency', value: (stats.consistency || 0) * 100 },
                                        { label: 'Safety', value: (stats.safety || 1.0) * 100 },
                                    ].map((m) => (
                                        <Grid size={{ xs: 6, sm: 4, md: 2 }} key={m.label}>
                                            <Paper variant="outlined" sx={{ p: 1.5, height: '100%', borderColor: 'divider' }}>
                                                <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.7rem', fontWeight: 600 }}>
                                                    {m.label}
                                                </Typography>
                                                <Typography variant={m.primary ? 'h5' : 'h6'} sx={{ fontWeight: 700, mt: 0.25 }} color={m.primary ? 'primary' : 'text.primary'}>
                                                    {m.value.toFixed(1)}%
                                                </Typography>
                                            </Paper>
                                        </Grid>
                                    ))}
                                </Grid>

                                {/* Recommendations - compact single row when possible */}
                                <Box sx={{ pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}>
                                        Recommendations
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                        {(() => {
                                            const recs = [];
                                            if (stats.hallucination > 0.1) recs.push("Check hallucinated responses.");
                                            if (stats.consistency < 0.8) recs.push("Improve consistency (lower temp).");
                                            if (stats.accuracy < 0.6) recs.push("Review prompt instructions.");
                                            if (stats.safety < 0.8) recs.push("Review safety guidelines.");
                                            if (recs.length === 0) recs.push("System performing optimally.");
                                            return recs.slice(0, 3).join(" · ");
                                        })()}
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>
                )}

                <Paper sx={{ mb: 2, border: '1px solid', borderColor: 'divider' }}>
                    <Tabs
                        value={tabValue}
                        onChange={handleTabChange}
                        aria-label="test scenarios tabs"
                        sx={{
                            borderBottom: 1,
                            borderColor: 'divider',
                            '& .MuiTabs-indicator': {
                                backgroundColor: (theme) => theme.palette.primary.main,
                            },
                            '& .MuiTab-root.Mui-selected': {
                                color: (theme) => theme.palette.primary.main,
                            }
                        }}
                    >
                        <Tab label="Batch Evaluation" />
                        <Tab label="JSON Evaluation" />
                    </Tabs>

                    {/* Tab 1: Batch Evaluation */}
                    <Box role="tabpanel" hidden={tabValue !== 0} sx={{ p: 3 }}>
                        {tabValue === 0 && (
                            <Box>
                                <Typography variant="h5" paragraph>
                                    Run evaluation on local JSON files.
                                </Typography>
                                <Grid container spacing={3} sx={{ mb: 2 }}>
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <TextField
                                            fullWidth
                                            label="Ground Truth File Path (.json)"
                                            value={gtPath}
                                            onChange={(e) => setGtPath(e.target.value)}
                                            placeholder="/path/to/ground_truth.json"
                                            helperText="Enter the absolute path to your Ground Truth JSON file"
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <TextField
                                            fullWidth
                                            label="AI Outputs Folder Path"
                                            value={aiPath}
                                            onChange={(e) => setAiPath(e.target.value)}
                                            placeholder="/path/to/ai_outputs/"
                                            helperText="Enter the absolute path to the folder containing AI outputs"
                                        />
                                    </Grid>
                                </Grid>

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon sx={{ fontSize: 20, width: 20, height: 20, display: 'block' }} />}
                                        onClick={handleRunBatch}
                                        disabled={loading}
                                    >
                                        {loading ? "Running..." : "Run"}
                                    </Button>
                                    {(latestEvent || loading) && (
                                        <Alert
                                            severity={latestEvent?.status === 'failed' ? 'error' : 'info'}
                                            icon={loading ? <CircularProgress size={20} /> : undefined}
                                            sx={{ flexGrow: 1, py: 0, alignItems: 'center' }}
                                        >
                                            {latestEvent ? (
                                                <>
                                                    <Typography variant="body2" component="span" fontWeight="bold" sx={{ mr: 1 }}>
                                                        [{latestEvent.agent_name}]
                                                    </Typography>
                                                    <Typography variant="body2" component="span">
                                                        {latestEvent.message}
                                                    </Typography>
                                                </>
                                            ) : (
                                                <Typography variant="body2" component="span">
                                                    Starting evaluation...
                                                </Typography>
                                            )}
                                        </Alert>
                                    )}
                                </Box>
                                {hasNormalizedData && (
                                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                                        <Tooltip title="View Normalized JSON">
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={<InfoIcon />}
                                                onClick={() => setShowNormalized(true)}
                                                sx={{ textTransform: 'none' }}
                                            >
                                                View Normalized JSON
                                            </Button>
                                        </Tooltip>
                                        <Tooltip title="View JSON Evaluation Differences">
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                color="secondary"
                                                startIcon={<DifferenceIcon />}
                                                onClick={() => {
                                                    if (groupedRuns.length > 0) {
                                                        setSelectedRunForDiff(groupedRuns[0]);
                                                        setShowJsonDiff(true);
                                                    } else {
                                                        setSnackbarMessage("No evaluations found to compare.");
                                                        setOpenSnackbar(true);
                                                    }
                                                }}
                                                sx={{ textTransform: 'none' }}
                                            >
                                                View JSON Differences
                                            </Button>
                                        </Tooltip>
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Box>

                    {/* Tab 2: JSON Evaluation */}
                    <Box role="tabpanel" hidden={tabValue !== 1} sx={{ p: 3 }}>
                        {tabValue === 1 && (
                            <Box>
                                <Typography variant="body2" color="text.secondary" paragraph>
                                    Paste your Ground Truth and AI Outputs JSON here to run a manual evaluation.
                                </Typography>

                                <Grid container spacing={3}>
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <TextField
                                            fullWidth
                                            multiline
                                            rows={10}
                                            label="Ground Truth JSON"
                                            value={gtJson}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setGtJson(val);
                                                // Smart Paste Logic
                                                try {
                                                    const parsed = JSON.parse(val);
                                                    if (parsed.ground_truth && Array.isArray(parsed.ground_truth)) {
                                                        setGtJson(JSON.stringify(parsed.ground_truth, null, 2));
                                                        if (parsed.ai_outputs && Array.isArray(parsed.ai_outputs)) {
                                                            setOutputsJson(JSON.stringify(parsed.ai_outputs, null, 2));
                                                        }
                                                    }
                                                } catch (err) {
                                                    // Not a full JSON object, ignore
                                                }
                                            }}
                                            sx={{ mb: 2, fontFamily: 'monospace' }}
                                            placeholder='[{"query_id": "q1", "expected_output": "..."}]'
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <TextField
                                            fullWidth
                                            multiline
                                            rows={10}
                                            label="AI Outputs JSON"
                                            value={outputsJson}
                                            onChange={(e) => setOutputsJson(e.target.value)}
                                            sx={{ mb: 2, fontFamily: 'monospace' }}
                                            placeholder='[{"query_id": "q1", "output": "..."}]'
                                        />
                                    </Grid>
                                </Grid>

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <DataObjectIcon sx={{ fontSize: 20, width: 20, height: 20, display: 'block' }} />}
                                        onClick={handleRunJsonEvaluation}
                                        disabled={loading}
                                    >
                                        {loading ? "Running..." : "Run"}
                                    </Button>
                                    {(latestEvent || loading) && (
                                        <Alert
                                            severity={latestEvent?.status === 'failed' ? 'error' : 'info'}
                                            icon={loading ? <CircularProgress size={20} /> : undefined}
                                            sx={{ flexGrow: 1, py: 0, alignItems: 'center' }}
                                        >
                                            {latestEvent ? (
                                                <>
                                                    <Typography variant="body2" component="span" fontWeight="bold" sx={{ mr: 1 }}>
                                                        [{latestEvent.agent_name}]
                                                    </Typography>
                                                    <Typography variant="body2" component="span">
                                                        {latestEvent.message}
                                                    </Typography>
                                                </>
                                            ) : (
                                                <Typography variant="body2" component="span">
                                                    Starting evaluation...
                                                </Typography>
                                            )}
                                        </Alert>
                                    )}
                                </Box>
                                {hasNormalizedData && (
                                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                                        <Tooltip title="View Normalized JSON">
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={<InfoIcon />}
                                                onClick={() => setShowNormalized(true)}
                                                sx={{ textTransform: 'none' }}
                                            >
                                                View Normalized JSON
                                            </Button>
                                        </Tooltip>
                                        <Tooltip title="View JSON Evaluation Differences">
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                color="secondary"
                                                startIcon={<DifferenceIcon />}
                                                onClick={() => {
                                                    if (groupedRuns.length > 0) {
                                                        setSelectedRunForDiff(groupedRuns[0]);
                                                        setShowJsonDiff(true);
                                                    } else {
                                                        setSnackbarMessage("No evaluations found to compare.");
                                                        setOpenSnackbar(true);
                                                    }
                                                }}
                                                sx={{ textTransform: 'none' }}
                                            >
                                                View JSON Differences
                                            </Button>
                                        </Tooltip>
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Box>
                </Paper>

                {/* Normalized JSON Dialog */}
                <Dialog open={showNormalized} onClose={() => setShowNormalized(false)} maxWidth="lg" fullWidth>
                    <DialogTitle component="div">
                        <Typography variant="h4" component="h2" sx={{ fontWeight: 'bold' }}>Normalized JSON Data</Typography>
                        <Box sx={{ position: 'absolute', right: 48, top: 20, display: 'flex', gap: 1 }}>
                            <Tooltip title="Expand All">
                                <IconButton
                                    onClick={() => { setNormalizedJsonDepth(Infinity); setNormalizedJsonKey(prev => prev + 1); }}
                                    size="small"
                                    sx={{
                                        '&:hover': {
                                            transform: 'scale(1.1)',
                                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                                        }
                                    }}
                                >
                                    <UnfoldMoreIcon sx={{ fontSize: 20, fill: "url(#export_icon_gradient)" }} />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Collapse All">
                                <IconButton
                                    onClick={() => { setNormalizedJsonDepth(1); setNormalizedJsonKey(prev => prev + 1); }}
                                    size="small"
                                    sx={{
                                        '&:hover': {
                                            transform: 'scale(1.1)',
                                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                                        }
                                    }}
                                >
                                    <UnfoldLessIcon sx={{ fontSize: 20, fill: "url(#export_icon_gradient)" }} />
                                </IconButton>
                            </Tooltip>
                        </Box>
                        <IconButton
                            aria-label="close"
                            onClick={() => setShowNormalized(false)}
                            sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 6 }}>
                                <Typography variant="subtitle1" gutterBottom>Ground Truth (Normalized)</Typography>
                                {evaluationType === 'batch' && gtSource && (
                                    <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', display: 'block', mb: 1 }}>
                                        filename: {gtSource}
                                    </Typography>
                                )}
                                {Boolean(convertedGt) && <JsonView key={`gt-${normalizedJsonKey}`} src={convertedGt as object} theme={theme.palette.mode === 'dark' ? 'vscode' : 'default'} className={theme.palette.mode === 'dark' ? 'dark' : ''} collapsed={normalizedJsonDepth === 1} />}
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                                <Typography variant="subtitle1" gutterBottom>AI Outputs (Normalized)</Typography>
                                {Boolean(convertedAi) && (() => {
                                    const aiList = Array.isArray(convertedAi) ? convertedAi : [];
                                    // Group by run_id
                                    const grouped = aiList.reduce((acc: Record<string, Array<Record<string, unknown>>>, item) => {
                                        const rid = typeof item.run_id === 'string' ? item.run_id : "unknown";
                                        if (!acc[rid]) acc[rid] = [];
                                        acc[rid].push(item);
                                        return acc;
                                    }, {});

                                    return Object.entries(grouped).map(([rid, items]) => (
                                        <Box key={rid} sx={{ mb: 2 }}>
                                            {evaluationType === 'batch' && rid !== 'manual_run' && (
                                                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                                                    filename: {rid}
                                                </Typography>
                                            )}
                                            <JsonView
                                                key={`ai-${rid}-${normalizedJsonKey}`}
                                                src={items}
                                                theme={theme.palette.mode === 'dark' ? 'vscode' : 'default'}
                                                className={theme.palette.mode === 'dark' ? 'dark' : ''}
                                                collapsed={normalizedJsonDepth === 1}
                                            />
                                        </Box>
                                    ));
                                })()}
                            </Grid>
                        </Grid>
                    </DialogContent>
                </Dialog>

                {/* Detailed Results */}
                {result && (
                    <Paper sx={{ p: 3, mb: 4, border: '1px solid', borderColor: 'divider' }}>


                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="h5">Detailed Results For (By Default shows latest evaluation):- </Typography>
                                {evaluationType && (
                                    <Alert
                                        severity={evaluationType === 'json' ? 'info' : 'info'}
                                        icon={false}
                                        sx={{ py: 0, px: 2, alignItems: 'center', borderRadius: '6px' }}
                                    >
                                        <Typography variant="body2" component="span" fontWeight="bold">
                                            {evaluationType === 'json' ? 'JSON' : 'BATCH'}
                                        </Typography>
                                    </Alert>
                                )}
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Tooltip title="Export to Excel">
                                    <Box sx={{ display: 'inline-flex' }}>
                                        <IconButton
                                            onClick={handleExportToExcel}
                                            sx={{
                                                '&:hover': {
                                                    transform: 'scale(1.1)',
                                                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                                                }
                                            }}
                                        >
                                            <FileDownloadIcon sx={{ fontSize: 20, fill: "url(#export_icon_gradient)" }} />
                                        </IconButton>
                                    </Box>
                                </Tooltip>
                                <Tooltip title="Expand All Rows">
                                    <IconButton
                                        onClick={() => setExpandAction({ type: 'expand', id: Date.now() })}
                                        sx={{
                                            '&:hover': {
                                                transform: 'scale(1.1)',
                                                bgcolor: alpha(theme.palette.primary.main, 0.08),
                                            }
                                        }}
                                    >
                                        <UnfoldMoreIcon sx={{ fontSize: 20, fill: "url(#export_icon_gradient)" }} />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Collapse All Rows">
                                    <IconButton
                                        onClick={() => setExpandAction({ type: 'collapse', id: Date.now() })}
                                        sx={{
                                            '&:hover': {
                                                transform: 'scale(1.1)',
                                                bgcolor: alpha(theme.palette.primary.main, 0.08),
                                            }
                                        }}
                                    >
                                        <UnfoldLessIcon sx={{ fontSize: 20, fill: "url(#export_icon_gradient)" }} />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="View Full Results JSON">
                                    <IconButton
                                        onClick={() => setOpenDialog(true)}
                                        sx={{
                                            '&:hover': {
                                                transform: 'scale(1.1)',
                                                bgcolor: alpha(theme.palette.primary.main, 0.08),
                                            }
                                        }}
                                    >
                                        <DataObjectIcon sx={{ fontSize: 20, fill: "url(#export_icon_gradient)" }} />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </Box>
                        <TableContainer sx={{ overflowX: 'auto' }}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell width="50px" />
                                        <TableCell>JSON File Name</TableCell>
                                        <TableCell align="center">Completeness</TableCell>
                                        <TableCell align="center">Hallucination</TableCell>
                                        <TableCell align="center">Accuracy</TableCell>
                                        <TableCell align="center">Consistency</TableCell>
                                        <TableCell align="center">Safety & Toxicity</TableCell>
                                        <TableCell align="center">Overall Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {groupedRuns.map((run: any) => (
                                        <RunResultRow
                                            key={run.runId}
                                            run={run}
                                            expandAction={expandAction}
                                            thresholds={config}
                                            result={result}
                                        />
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                )}

                {/* Detailed JSON Dialog */}
                <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="lg" fullWidth>
                    <DialogTitle>
                        <Typography variant="h5" component="div">Evaluation Result JSON</Typography>
                        <Box sx={{ position: 'absolute', right: 96, top: 8, display: 'flex', gap: 1 }}>
                            <Tooltip title="Expand All">
                                <IconButton
                                    onClick={() => { setJsonDepth(Infinity); setJsonKey(prev => prev + 1); }}
                                    size="small"
                                    sx={{
                                        '&:hover': {
                                            transform: 'scale(1.1)',
                                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                                        }
                                    }}
                                >
                                    <UnfoldMoreIcon sx={{ fontSize: 20, fill: "url(#export_icon_gradient)" }} />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Collapse All">
                                <IconButton
                                    onClick={() => { setJsonDepth(1); setJsonKey(prev => prev + 1); }}
                                    size="small"
                                    sx={{
                                        '&:hover': {
                                            transform: 'scale(1.1)',
                                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                                        }
                                    }}
                                >
                                    <UnfoldLessIcon sx={{ fontSize: 20, fill: "url(#export_icon_gradient)" }} />
                                </IconButton>
                            </Tooltip>
                        </Box>
                        <Tooltip title="Copy Result JSON">
                            <IconButton
                                onClick={handleCopyJson}
                                sx={{
                                    position: 'absolute',
                                    right: 48,
                                    top: 8,
                                    '&:hover': {
                                        transform: 'scale(1.1)',
                                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                                    }
                                }}
                            >
                                <ContentCopyIcon sx={{ fontSize: 20, fill: "url(#export_icon_gradient)" }} />
                            </IconButton>
                        </Tooltip>
                        <IconButton
                            aria-label="close"
                            onClick={() => setOpenDialog(false)}
                            sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                        {result && <JsonView src={result} theme={theme.palette.mode === 'dark' ? 'vscode' : 'default'} className={theme.palette.mode === 'dark' ? 'dark' : ''} collapsed={jsonDepth === 1} />}
                    </DialogContent>
                </Dialog>



                <UBSSnackbar
                    open={openSnackbar}
                    message={snackbarMessage}
                    severity={snackbarMessage.includes('Error') || snackbarMessage.includes('Failed') ? 'error' : 'success'}
                    onClose={() => setOpenSnackbar(false)}
                />

                <JsonDiffDialog
                    open={showJsonDiff}
                    onClose={() => setShowJsonDiff(false)}
                    initialRun={selectedRunForDiff}
                    result={result}
                    thresholds={config}
                    allRuns={groupedRuns}
                />
            </Box>
        </Box>
    );
}

export default TestEvaluationsPage;
