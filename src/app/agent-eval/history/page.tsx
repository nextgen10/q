'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, alpha, useTheme, CircularProgress, IconButton, Dialog, DialogTitle, DialogContent, Button, Tooltip, Checkbox, Slide, TextField, InputAdornment, FormControl, Select, MenuItem } from '@mui/material';
import { API_BASE_URL } from '@/features/agent-eval/utils/config';
import { authFetch } from '@/features/agent-eval/utils/authFetch';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import SearchIcon from '@mui/icons-material/Search';
import JsonView from 'react18-json-view';
import 'react18-json-view/src/style.css';
import 'react18-json-view/src/dark.css';
import { TransitionProps } from '@mui/material/transitions';
import { Theme } from '@mui/material/styles';

const Transition = React.forwardRef(function Transition(
    props: TransitionProps & {
        children: React.ReactElement;
    },
    ref: React.Ref<unknown>,
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

type AggregateMetrics = {
    accuracy?: number;
    rqs?: number;
    consistency?: number;
    completeness?: number;
    hallucination?: number;
    safety?: number;
    [key: string]: number | undefined;
};

type EvaluationOutput = {
    safety_score?: number;
    semantic_score?: number;
    error_type?: string;
    [key: string]: unknown;
};

type PerQueryEntry = {
    outputs?: EvaluationOutput[];
    [key: string]: unknown;
};

type HistoryRow = {
    id: number;
    run_id?: string | null;
    timestamp?: string | null;
    evaluation_method?: string | null;
    evaluation_status?: string | null;
    aggregate?: AggregateMetrics;
    per_query?: Record<string, PerQueryEntry>;
    [key: string]: unknown;
};

type CompareMetric = {
    label: string;
    key: string;
    source: 'aggregate' | 'calculated';
    format: (value: number) => string;
    precision: number;
    isPercent?: boolean;
    higherIsBetter: boolean;
};

const isHistoryRow = (value: unknown): value is HistoryRow => {
    if (!value || typeof value !== 'object') return false;
    const v = value as { id?: unknown };
    return typeof v.id === 'number';
};

const formatTimestamp = (value?: string | null): string => {
    if (!value) return 'N/A';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString();
};

const isPassedRun = (row: HistoryRow): boolean => {
    const status = String(row.evaluation_status || '').toUpperCase();
    return status ? status === 'PASS' : (row.aggregate?.accuracy || 0) > 0.5;
};

export default function HistoryPage() {
    const theme = useTheme();
    const [history, setHistory] = useState<HistoryRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [methodFilter, setMethodFilter] = useState<'all' | 'json' | 'batch'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pass' | 'fail'>('all');
    const [selectedResult, setSelectedResult] = useState<HistoryRow | null>(null);
    const [jsonDepth, setJsonDepth] = useState(1);
    const [jsonKey, setJsonKey] = useState(0);

    // Comparison State
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [comparisonOpen, setComparisonOpen] = useState(false);
    const [compareData, setCompareData] = useState<HistoryRow[]>([]);

    const handleSelect = (event: React.ChangeEvent<HTMLInputElement>, id: number) => {
        if (event.target.checked) {
            if (selectedIds.length >= 2) {
                // Keep the most recently selected item and force the new one
                setSelectedIds([...selectedIds.slice(1), id]);
            } else {
                setSelectedIds([...selectedIds, id]);
            }
        } else {
            setSelectedIds(selectedIds.filter(idx => idx !== id));
        }
    };

    const handleCompare = () => {
        const data1 = history.find(h => h.id === selectedIds[0]);
        const data2 = history.find(h => h.id === selectedIds[1]);
        if (data1 && data2) {
            // Sort by ID to have consistent left/right (older vs newer or vice versa)
            // Let's put the older one on left (index 0) and newer on right (index 1) usually makes sense?
            // Actually usually newer vs older. Let's do selected order or just ID order.
            // Let's do ID ascending (Old -> New)
            const sorted = [data1, data2].sort((a, b) => a.id - b.id);
            setCompareData(sorted);
            setComparisonOpen(true);
        }
    };

    useEffect(() => {
        let isMounted = true;
        authFetch(`${API_BASE_URL}/history`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then((data: unknown) => {
                if (!isMounted) return;
                if (!Array.isArray(data)) {
                    setHistory([]);
                    setLoading(false);
                    return;
                }
                const safeRows = data.filter(isHistoryRow);
                const sorted = [...safeRows].sort((a, b) => b.id - a.id).slice(0, 50);
                setHistory(sorted);
                setLoading(false);
            })
            .catch(err => {
                if (!isMounted) return;
                console.error("Failed to fetch history:", err);
                setLoading(false);
            });
        return () => {
            isMounted = false;
        };
    }, []);

    const filteredHistory = useMemo(() => {
        return history.filter((row) => {
            const method = String(row.evaluation_method || 'Batch').toLowerCase();
            const passed = isPassedRun(row);
            const text = `${row.id} ${row.run_id || ''} ${row.timestamp || ''}`.toLowerCase();

            const methodOk = methodFilter === 'all' || method === methodFilter;
            const statusOk = statusFilter === 'all' || (statusFilter === 'pass' ? passed : !passed);
            const searchOk = !search.trim() || text.includes(search.trim().toLowerCase());

            return methodOk && statusOk && searchOk;
        });
    }, [history, methodFilter, search, statusFilter]);

    const getStatusChip = (item: HistoryRow) => {
        const passed = isPassedRun(item);
        const color = passed ? theme.palette.success.main : theme.palette.error.main;

        return (
            <Chip
                label={passed ? "PASS" : "FAIL"}
                variant="outlined"
                size="small"
                sx={{
                    fontWeight: 700,
                    height: 24,
                    background: alpha(color, 0.1),
                    borderColor: alpha(color, 0.35),
                    color: color,
                }}
            />
        );
    };



    const handleViewDetails = (item: HistoryRow) => {
        setSelectedResult(item);
        setJsonDepth(1); // Reset depth on open
        setJsonKey(0);   // Reset key on open
    };

    const handleCloseDialog = () => {
        setSelectedResult(null);
    };

    const headCellSx = {
        fontWeight: 800,
        color: 'text.secondary',
        fontSize: '0.75rem',
        textTransform: 'uppercase' as const,
        position: 'sticky' as const,
        top: 0,
        bgcolor: 'background.paper',
        zIndex: 10,
        borderBottom: (t: Theme) => `1px solid ${t.palette.divider}`,
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* SVG Gradient Definition */}
            <svg width={0} height={0}>
                <defs>
                    <linearGradient id="history_icon_gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={theme.palette.primary.main} />
                        <stop offset="100%" stopColor={theme.palette.primary.dark} />
                    </linearGradient>
                </defs>
            </svg>

            {/* Page Header - matches RAG Eval */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, mb: 1, flexShrink: 0 }}>
                <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: { xs: '0.95rem', md: '1.1rem' }, letterSpacing: '-0.02em', mb: 0.5, color: 'text.primary' }}>
                        Historical Data
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.85rem' } }}>
                        Top 50 Evaluation Results
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {selectedIds.length > 0 && (
                        <Chip
                            label={`${selectedIds.length} Selected`}
                            variant="outlined"
                            onDelete={() => setSelectedIds([])}
                            sx={{
                                background: alpha(theme.palette.secondary.main, 0.1),
                                borderColor: alpha(theme.palette.secondary.main, 0.35),
                                color: theme.palette.secondary.main,
                                fontWeight: 700,
                                '& .MuiChip-deleteIcon': {
                                    color: theme.palette.secondary.main,
                                    '&:hover': {
                                        color: theme.palette.secondary.light,
                                    }
                                }
                            }}
                        />
                    )}
                    <Button
                        variant="contained"
                        color="primary"
                        disabled={selectedIds.length !== 2}
                        onClick={handleCompare}
                        startIcon={<CompareArrowsIcon />}
                    >
                        Compare Evaluations
                    </Button>
                </Box>
            </Box>

            {/* Filters / Controls */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, mb: 1.5, flexShrink: 0 }}>
                <TextField
                    size="small"
                    placeholder="Search by ID / run_id / timestamp"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{ minWidth: 280 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
                            </InputAdornment>
                        ),
                    }}
                />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value as 'all' | 'json' | 'batch')}>
                        <MenuItem value="all">All Methods</MenuItem>
                        <MenuItem value="json">JSON</MenuItem>
                        <MenuItem value="batch">Batch</MenuItem>
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pass' | 'fail')}>
                        <MenuItem value="all">All Status</MenuItem>
                        <MenuItem value="pass">Pass</MenuItem>
                        <MenuItem value="fail">Fail</MenuItem>
                    </Select>
                </FormControl>
                <Chip
                    size="small"
                    label={`${filteredHistory.length} shown / ${history.length} total`}
                    sx={{ fontWeight: 700 }}
                />
            </Box>

            {/* Content */}
            <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <TableContainer
                    component={Paper}
                    sx={{
                        borderRadius: 2,
                        bgcolor: 'background.paper',
                        border: (t) => `1px solid ${t.palette.divider}`,
                        boxShadow: (t) => t.palette.mode === 'dark' ? '0 0 30px rgba(208, 0, 0, 0.15)' : '0 10px 30px rgba(0,0,0,0.05)',
                        height: '100%',
                        overflowY: 'auto !important',
                        mb: 0,
                        '&::-webkit-scrollbar': { width: '8px' },
                        '&::-webkit-scrollbar-track': { background: (t) => t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.03)' },
                        '&::-webkit-scrollbar-thumb': {
                            background: (t) => t.palette.mode === 'dark' ? 'rgba(230, 0, 0, 0.2)' : 'rgba(230, 0, 0, 0.3)',
                            borderRadius: '10px',
                            border: (t) => t.palette.mode === 'dark' ? 'none' : '2px solid transparent',
                            backgroundClip: 'padding-box'
                        },
                        '&::-webkit-scrollbar-thumb:hover': {
                            background: (t) => t.palette.mode === 'dark' ? 'rgba(230, 0, 0, 0.4)' : 'rgba(230, 0, 0, 0.5)',
                            backgroundClip: 'padding-box'
                        }
                    }}
                >
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Table stickyHeader aria-label="sticky table" sx={{ tableLayout: 'fixed' }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell padding="checkbox" sx={{ ...headCellSx, width: 52 }} />
                                        <TableCell sx={{ ...headCellSx, width: 70 }}>ID</TableCell>
                                        <TableCell sx={{ ...headCellSx, width: 170 }}>Timestamp</TableCell>
                                        <TableCell sx={{ ...headCellSx, width: 90 }}>Method</TableCell>
                                        <TableCell sx={{ ...headCellSx, width: 120 }}>Queries/Evals</TableCell>
                                        <TableCell sx={{ ...headCellSx, width: 90 }}>Status</TableCell>
                                        <TableCell sx={{ ...headCellSx, width: 80 }}>RQS</TableCell>
                                        <TableCell sx={{ ...headCellSx, width: 90 }}>Accuracy</TableCell>
                                        <TableCell sx={{ ...headCellSx, width: 105 }}>Completeness</TableCell>
                                        <TableCell sx={{ ...headCellSx, width: 110 }}>Hallucination</TableCell>
                                        <TableCell sx={{ ...headCellSx, width: 100 }}>Consistency</TableCell>
                                        <TableCell sx={{ ...headCellSx, width: 80 }}>Safety</TableCell>
                                        <TableCell sx={{ ...headCellSx, width: 80 }}>Action</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredHistory.map((row) => {
                                        const isSelected = selectedIds.indexOf(row.id) !== -1;
                                        const method = String(row.evaluation_method || 'batch').toLowerCase();
                                        const isJsonMethod = method === 'json';
                                        const accuracy = (row.aggregate?.accuracy || 0) * 100;
                                        const rqs = (row.aggregate?.rqs || 0) * 100;
                                        const consistency = (row.aggregate?.consistency || 0) * 100;
                                        const timestamp = formatTimestamp(row.timestamp);

                                        // Calculate total queries and evaluations
                                        const totalQueries = Object.keys(row.per_query || {}).length;
                                        let totalEvaluations = 0;
                                        Object.values(row.per_query || {}).forEach((q: PerQueryEntry) => {
                                            if (Array.isArray(q.outputs)) {
                                                totalEvaluations += q.outputs.length;
                                            }
                                        });

                                        return (
                                            <TableRow
                                                hover
                                                role="checkbox"
                                                aria-checked={isSelected}
                                                tabIndex={-1}
                                                key={row.id}
                                                selected={isSelected}
                                            >
                                                <TableCell padding="checkbox">
                                                    <Checkbox
                                                        color="primary"
                                                        checked={isSelected}
                                                        onChange={(event) => handleSelect(event, row.id)}
                                                    />
                                                </TableCell>
                                                <TableCell sx={{ borderBottom: (t) => `1px solid ${t.palette.divider}` }}>{row.id}</TableCell>
                                                <TableCell sx={{ borderBottom: (t) => `1px solid ${t.palette.divider}` }}>{timestamp}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={method.toUpperCase()}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{
                                                            height: 24,
                                                            fontSize: '0.72rem',
                                                            fontWeight: 700,
                                                            background: isJsonMethod ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.secondary.main, 0.1),
                                                            borderColor: isJsonMethod ? alpha(theme.palette.primary.main, 0.35) : alpha(theme.palette.secondary.main, 0.35),
                                                            color: isJsonMethod ? theme.palette.primary.main : theme.palette.secondary.main,
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                                                        Q: {totalQueries}, E: {totalEvaluations}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>{getStatusChip(row)}</TableCell>
                                                <TableCell>
                                                    <Typography sx={{ fontWeight: 600, color: 'primary.main' }}>
                                                        {rqs.toFixed(1)}%
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography sx={{ fontWeight: 500 }}>
                                                        {accuracy.toFixed(1)}%
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography sx={{ fontWeight: 500 }}>
                                                        {((row.aggregate?.completeness || 0) * 100).toFixed(1)}%
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography sx={{ fontWeight: 500, color: (row.aggregate?.hallucination || 0) > 0.1 ? 'error.main' : 'inherit' }}>
                                                        {((row.aggregate?.hallucination || 0) * 100).toFixed(1)}%
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography sx={{ fontWeight: 500 }}>
                                                        {consistency.toFixed(1)}%
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography sx={{ fontWeight: 500 }}>
                                                        {((row.aggregate?.safety || 1.0) * 100).toFixed(1)}%
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        onClick={() => handleViewDetails(row)}
                                                        sx={{
                                                            borderRadius: 1.5,
                                                            '&:hover': { bgcolor: (t: Theme) => alpha(t.palette.primary.main, 0.1) }
                                                        }}
                                                    >
                                                        <VisibilityIcon />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {filteredHistory.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={13} align="center" sx={{ py: 4 }}>
                                                <Typography color="text.secondary">
                                                    No matching evaluation history found.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                    )}
                </TableContainer>
            </Box>

            {/* Details Dialog */}
            <Dialog
                open={Boolean(selectedResult)}
                onClose={handleCloseDialog}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            Evaluation Details #{selectedResult?.id}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {formatTimestamp(selectedResult?.timestamp)} • {selectedResult?.run_id || 'N/A'}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                                <UnfoldMoreIcon sx={{ fontSize: 24, fill: "url(#history_icon_gradient)" }} />
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
                                <UnfoldLessIcon sx={{ fontSize: 24, fill: "url(#history_icon_gradient)" }} />
                            </IconButton>
                        </Tooltip>
                        <IconButton onClick={handleCloseDialog}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ p: 0, height: '70vh', bgcolor: 'background.default' }}>
                    {selectedResult && (
                        <Box sx={{ height: '100%', overflow: 'auto', p: 2 }}>
                            <JsonView
                                key={jsonKey}
                                src={selectedResult}
                                theme={theme.palette.mode === 'dark' ? 'vscode' : 'default'}
                                className={theme.palette.mode === 'dark' ? 'dark' : ''}
                                collapsed={jsonDepth === 1}
                            />
                        </Box>
                    )}
                </DialogContent>
            </Dialog>
            <Dialog
                open={comparisonOpen}
                onClose={() => {
                    setComparisonOpen(false);
                    setSelectedIds([]);
                }}
                fullWidth
                maxWidth="lg"
                PaperProps={{
                    sx: {
                        height: '80vh',
                        maxHeight: '80vh',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                        border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                        borderRadius: 2
                    }
                }}
                TransitionComponent={Transition}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.default' }}>
                    <Box sx={{
                        p: 3,
                        height: '90px',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: (theme) => `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)} 0%, ${alpha(theme.palette.secondary.main, 0.15)} 100%)`,
                        backdropFilter: 'blur(20px)',
                        flexShrink: 0
                    }}>
                        <Box>
                            <Typography variant="h4" sx={{
                                fontWeight: 800,
                                color: 'text.primary',
                                mb: 1
                            }}>
                                Evaluation Comparison
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                                <Chip
                                    label={`Execution #${compareData[0]?.id}`}
                                    size="small"
                                    sx={{
                                        background: (theme) => `rgba(${parseInt(theme.palette.primary.main.slice(1, 3), 16)}, ${parseInt(theme.palette.primary.main.slice(3, 5), 16)}, ${parseInt(theme.palette.primary.main.slice(5, 7), 16)}, 0.15)`,
                                        backdropFilter: 'blur(10px)',
                                        border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                                        color: 'primary.main',
                                        fontWeight: 600
                                    }}
                                />
                                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>vs</Typography>
                                <Chip
                                    label={`Execution #${compareData[1]?.id}`}
                                    size="small"
                                    sx={{
                                        background: (theme) => `rgba(${parseInt(theme.palette.secondary.main.slice(1, 3), 16)}, ${parseInt(theme.palette.secondary.main.slice(3, 5), 16)}, ${parseInt(theme.palette.secondary.main.slice(5, 7), 16)}, 0.15)`,
                                        backdropFilter: 'blur(10px)',
                                        border: (theme) => `1px solid ${alpha(theme.palette.secondary.main, 0.3)}`,
                                        color: 'secondary.main',
                                        fontWeight: 600
                                    }}
                                />
                            </Box>
                        </Box>
                        <IconButton
                            onClick={() => {
                                setComparisonOpen(false);
                                setSelectedIds([]);
                            }}
                            sx={{
                                bgcolor: (theme) => alpha(theme.palette.error.main, 0.1),
                                '&:hover': {
                                    bgcolor: (theme) => alpha(theme.palette.error.main, 0.2),
                                }
                            }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </Box>

                    <Box sx={{ p: 3, flexGrow: 1, overflow: 'auto' }}>
                        {/* Helper functions for metric comparison */}
                        {(() => {
                            // Helper to round to display precision
                            const roundToPrecision = (val: number, decimals: number) => {
                                return Math.round(val * Math.pow(10, decimals)) / Math.pow(10, decimals);
                            };

                            // Calculate average metric from per_query data
                            const calculateAvgMetric = (data: HistoryRow | undefined, key: string) => {
                                if (!data?.per_query) return 0;
                                const queries = Object.values(data.per_query);
                                if (queries.length === 0) return 0;

                                let sum = 0;
                                let count = 0;

                                queries.forEach((q: PerQueryEntry) => {
                                    if (!Array.isArray(q.outputs) || q.outputs.length === 0) return;
                                    q.outputs.forEach((output: EvaluationOutput) => {
                                        let val = 0;
                                        if (key === 'safety_score') {
                                            val = output.safety_score || 0;
                                        } else if (key === 'semantic_score') {
                                            val = output.semantic_score || 0;
                                        } else if (key === 'hallucination_rate') {
                                            val = output.error_type === 'hallucination' ? 1 : 0;
                                        }
                                        if (val !== null && val !== undefined) {
                                            sum += val;
                                            count++;
                                        }
                                    });
                                });

                                return count > 0 ? sum / count : 0;
                            };

                            // Calculate metric difference
                            const calculateMetricDiff = (metric: CompareMetric, data1: HistoryRow | undefined, data2: HistoryRow | undefined) => {
                                let val1 = 0, val2 = 0;
                                if (metric.source === 'aggregate') {
                                    val1 = data1?.aggregate?.[metric.key] || 0;
                                    val2 = data2?.aggregate?.[metric.key] || 0;
                                } else if (metric.source === 'calculated') {
                                    val1 = calculateAvgMetric(data1, metric.key);
                                    val2 = calculateAvgMetric(data2, metric.key);
                                }

                                const roundedVal1 = roundToPrecision(val1, metric.precision);
                                const roundedVal2 = roundToPrecision(val2, metric.precision);
                                const diff = roundedVal2 - roundedVal1;

                                let color: 'text.secondary' | 'success.main' | 'error.main' = 'text.secondary';
                                if (diff !== 0) {
                                    if (metric.higherIsBetter) {
                                        color = diff > 0 ? 'success.main' : 'error.main';
                                    } else {
                                        color = diff < 0 ? 'success.main' : 'error.main';
                                    }
                                }

                                return { val1: roundedVal1, val2: roundedVal2, diff, color };
                            };

                            // Render metric row with glassmorphism and enhanced diff display
                            const renderMetricRow = (metric: CompareMetric, val1: number, val2: number, diff: number, color: string) => {
                                const isImprovement = (metric.higherIsBetter && diff > 0) || (!metric.higherIsBetter && diff < 0);
                                const isRegression = (metric.higherIsBetter && diff < 0) || (!metric.higherIsBetter && diff > 0);

                                return (
                                    <TableRow
                                        key={metric.key}
                                        sx={{
                                            '&:hover': {
                                                bgcolor: (theme) => alpha(theme.palette.action.hover, 0.05),
                                            }
                                        }}
                                    >
                                        <TableCell sx={{ fontWeight: 500, borderBottom: '1px solid', borderColor: 'divider' }}>{metric.label}</TableCell>
                                        <TableCell sx={{
                                            background: (theme) => `rgba(${parseInt(theme.palette.primary.main.slice(1, 3), 16)}, ${parseInt(theme.palette.primary.main.slice(3, 5), 16)}, ${parseInt(theme.palette.primary.main.slice(5, 7), 16)}, 0.08)`,
                                            backdropFilter: 'blur(10px)',
                                            fontWeight: 600,
                                            boxShadow: (theme) => `inset 0 -1px 0 ${theme.palette.divider}`
                                        }}>
                                            {metric.format(val1)}
                                        </TableCell>
                                        <TableCell sx={{
                                            background: (theme) => `rgba(${parseInt(theme.palette.secondary.main.slice(1, 3), 16)}, ${parseInt(theme.palette.secondary.main.slice(3, 5), 16)}, ${parseInt(theme.palette.secondary.main.slice(5, 7), 16)}, 0.08)`,
                                            backdropFilter: 'blur(10px)',
                                            fontWeight: 600,
                                            boxShadow: (theme) => `inset 0 -1px 0 ${theme.palette.divider}`
                                        }}>
                                            {metric.format(val2)}
                                        </TableCell>
                                        <TableCell sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                                            {diff === 0 ? (
                                                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                                                    -
                                                </Typography>
                                            ) : (
                                                <Chip
                                                    icon={isImprovement ? <TrendingUpIcon /> : isRegression ? <TrendingDownIcon /> : undefined}
                                                    label={`${diff > 0 ? '+' : ''}${metric.format(diff)}`}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: (theme) => alpha(color === 'success.main' ? theme.palette.success.main : theme.palette.error.main, 0.15),
                                                        color: color,
                                                        fontWeight: 700,
                                                        border: (theme) => `1px solid ${alpha(color === 'success.main' ? theme.palette.success.main : theme.palette.error.main, 0.3)}`,
                                                    }}
                                                />
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            };

                            return (
                                <>
                                    {/* Comparison Overview Table */}
                                    <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 1, fontStyle: 'italic' }}>
                                        Note: All metrics displayed are average values unless specified otherwise
                                    </Typography>
                                    <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>Overview</Typography>
                                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 4, overflowX: 'auto' }}>
                                        <Table>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>METRIC</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                                                        EXECUTION #{compareData[0]?.id}
                                                        <Typography variant="caption" display="block" color="text.secondary">
                                                            {compareData[0]?.timestamp ? new Date(compareData[0].timestamp).toLocaleString() : ''}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.secondary.main, 0.05) }}>
                                                        EXECUTION #{compareData[1]?.id}
                                                        <Typography variant="caption" display="block" color="text.secondary">
                                                            {compareData[1]?.timestamp ? new Date(compareData[1].timestamp).toLocaleString() : ''}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>DELTA</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {/* Standard Metrics Section */}
                                                <TableRow>
                                                    <TableCell colSpan={4} sx={{ bgcolor: (theme) => alpha(theme.palette.info.main, 0.08), py: 1.5 }}>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'info.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            📊 Standard Metrics
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                                {([
                                                    { label: 'RQS (Std)', key: 'rqs', source: 'aggregate', format: (v: number) => `${(v * 100).toFixed(1)}%`, precision: 3, isPercent: true, higherIsBetter: true },
                                                    { label: 'Accuracy', key: 'accuracy', source: 'aggregate', format: (v: number) => `${(v * 100).toFixed(1)}%`, precision: 3, isPercent: true, higherIsBetter: true },
                                                    { label: 'Consistency', key: 'consistency', source: 'aggregate', format: (v: number) => `${(v * 100).toFixed(1)}%`, precision: 3, isPercent: true, higherIsBetter: true },
                                                    { label: 'Completeness', key: 'completeness', source: 'aggregate', format: (v: number) => `${(v * 100).toFixed(1)}%`, precision: 3, isPercent: true, higherIsBetter: true },
                                                    { label: 'Hallucination', key: 'hallucination', source: 'aggregate', format: (v: number) => `${(v * 100).toFixed(1)}%`, precision: 3, isPercent: true, higherIsBetter: false },
                                                    { label: 'Safety Score', key: 'safety', source: 'aggregate', format: (v: number) => `${(v * 100).toFixed(1)}%`, precision: 3, isPercent: true, higherIsBetter: true },
                                                ] as CompareMetric[])
                                                    .map((metric) => {
                                                        const { val1, val2, diff, color } = calculateMetricDiff(metric, compareData[0], compareData[1]);
                                                        return renderMetricRow(metric, val1, val2, diff, color);
                                                    })}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </>
                            );
                        })()}

                        {/* Query Existence Comparison */}
                        <Typography variant="h5" sx={{ mb: 2, mt: 4, fontWeight: 'bold' }}>Query Coverage</Typography>
                        <TableContainer component={Paper} variant="outlined" sx={{ bgcolor: 'transparent' }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold', bgcolor: (theme) => alpha(theme.palette.background.paper, 0.8), backdropFilter: 'blur(10px)' }}>QUERY ID</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1), backdropFilter: 'blur(10px)' }}>
                                            EXECUTION #{compareData[0]?.id}
                                        </TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.1), backdropFilter: 'blur(10px)' }}>
                                            EXECUTION #{compareData[1]?.id}
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(() => {
                                        // Get unique query IDs from both
                                        const set1 = new Set(Object.keys(compareData[0]?.per_query || {}));
                                        const set2 = new Set(Object.keys(compareData[1]?.per_query || {}));
                                        const allQueries = Array.from(new Set([
                                            ...Object.keys(compareData[0]?.per_query || {}),
                                            ...Object.keys(compareData[1]?.per_query || {}),
                                        ])).sort((a, b) => a.localeCompare(b));

                                        return allQueries.map(qid => {
                                            const in1 = set1.has(qid);
                                            const in2 = set2.has(qid);
                                            return (
                                                <TableRow key={qid} hover sx={{ '&:hover': { bgcolor: (theme) => alpha(theme.palette.action.hover, 0.1) } }}>
                                                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 500 }}>{qid}</TableCell>
                                                    <TableCell align="center" sx={{
                                                        background: (theme) => in1
                                                            ? `rgba(${parseInt(theme.palette.success.main.slice(1, 3), 16)}, ${parseInt(theme.palette.success.main.slice(3, 5), 16)}, ${parseInt(theme.palette.success.main.slice(5, 7), 16)}, 0.1)`
                                                            : `rgba(${parseInt(theme.palette.error.main.slice(1, 3), 16)}, ${parseInt(theme.palette.error.main.slice(3, 5), 16)}, ${parseInt(theme.palette.error.main.slice(5, 7), 16)}, 0.05)`,
                                                        backdropFilter: 'blur(10px)',
                                                        borderBottom: '1px solid',
                                                        borderColor: 'divider'
                                                    }}>
                                                        {in1 ? <CheckCircleIcon color="success" fontSize="small" /> : <CancelIcon color="error" fontSize="small" />}
                                                    </TableCell>
                                                    <TableCell align="center" sx={{
                                                        background: (theme) => in2
                                                            ? `rgba(${parseInt(theme.palette.success.main.slice(1, 3), 16)}, ${parseInt(theme.palette.success.main.slice(3, 5), 16)}, ${parseInt(theme.palette.success.main.slice(5, 7), 16)}, 0.1)`
                                                            : `rgba(${parseInt(theme.palette.error.main.slice(1, 3), 16)}, ${parseInt(theme.palette.error.main.slice(3, 5), 16)}, ${parseInt(theme.palette.error.main.slice(5, 7), 16)}, 0.05)`,
                                                        backdropFilter: 'blur(10px)',
                                                        borderBottom: '1px solid',
                                                        borderColor: 'divider'
                                                    }}>
                                                        {in2 ? <CheckCircleIcon color="success" fontSize="small" /> : <CancelIcon color="error" fontSize="small" />}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        });
                                    })()}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box >
                </Box>
            </Dialog >
        </Box>
    );
}
