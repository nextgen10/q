import React, { useEffect, useState } from 'react';
import { Box, Grid, Paper, Typography, useTheme, alpha } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { ChartContainer } from '@/components/shared/ChartContainer';
import { MetricCard } from '@/components/shared/MetricCard';
import { Activity, CheckCircle2, ListChecks, AlertTriangle, TrendingUp, ShieldCheck, Target, XCircle } from 'lucide-react';
import { API_BASE_URL } from '../utils/config';
import { authFetch } from '../utils/authFetch';
import { colors } from '@/theme';

let historyCache: ChartPoint[] | null = null;
let historyInFlight: Promise<ChartPoint[]> | null = null;
let historyLastFetchTs = 0;
const HISTORY_FETCH_COOLDOWN_MS = 15000;

type AggregateMetrics = {
    accuracy?: number;
    rqs?: number;
    completeness?: number;
    consistency?: number;
    safety?: number;
    hallucination?: number;
};

type DashboardResult = {
    id?: number | string;
    aggregate?: AggregateMetrics;
    error_summary?: Record<string, number | string>;
    evaluation_status?: string;
};

type HistoryApiItem = {
    id?: number;
    run_id?: string;
    timestamp?: string;
    aggregate?: AggregateMetrics;
};

type ChartPoint = {
    id: number;
    run_id: string;
    timestamp: string;
    accuracy: number;
    rqs: number;
    completeness: number;
    consistency: number;
    safety: number;
    hallucinations: number;
};

type CustomTooltipPayload = {
    name?: string;
    value?: number | string;
    color?: string;
    payload: ChartPoint;
};

interface DashboardProps {
    latestResult: DashboardResult | null;
}

export default function Dashboard({ latestResult }: DashboardProps) {
    const theme = useTheme();
    const [history, setHistory] = useState<ChartPoint[]>([]);
    const [mounted, setMounted] = useState(false);
    const [startIndex, setStartIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    // Config for animation
    const WINDOW_SIZE = 50;
    const ANIMATION_SPEED = 150;

    useEffect(() => {
        setMounted(true);
        let isMounted = true;
        const run = async () => {
            try {
                const now = Date.now();
                if (historyCache) {
                    setHistory(historyCache);
                }
                if (historyCache && now - historyLastFetchTs < HISTORY_FETCH_COOLDOWN_MS) {
                    return;
                }

                if (!historyInFlight) {
                    historyInFlight = authFetch(`${API_BASE_URL}/history`)
                        .then(res => {
                            if (!res.ok) throw new Error(`HTTP ${res.status}`);
                            return res.json();
                        })
                        .then((data: unknown) => {
                            const chartData = Array.isArray(data)
                                ? data
                                    .filter((item): item is HistoryApiItem => typeof item === 'object' && item !== null)
                                    .map((item) => {
                                        const rawTimestamp = item.timestamp ? new Date(item.timestamp) : null;
                                        return {
                                            id: item.id ?? 0,
                                            run_id: item.run_id ?? '',
                                            timestamp: rawTimestamp && !Number.isNaN(rawTimestamp.getTime())
                                                ? rawTimestamp.toLocaleTimeString()
                                                : 'N/A',
                                            accuracy: (item.aggregate?.accuracy || 0) * 100,
                                            rqs: (item.aggregate?.rqs || 0) * 100,
                                            completeness: (item.aggregate?.completeness || 0) * 100,
                                            consistency: (item.aggregate?.consistency || 0) * 100,
                                            safety: (item.aggregate?.safety || 0) * 100,
                                            hallucinations: (item.aggregate?.hallucination || 0) * 100
                                        };
                                    })
                                    .reverse()
                                : [];
                            historyCache = chartData;
                            historyLastFetchTs = Date.now();
                            return chartData;
                        })
                        .finally(() => {
                            historyInFlight = null;
                        });
                }

                const chartData = await historyInFlight;
                if (isMounted) {
                    setHistory(chartData);
                }
            } catch (err) {
                console.error("Failed to fetch history:", err);
            }
        };

        run();
        return () => {
            isMounted = false;
        };
    }, []);

    const sourceData = history.slice(-100);

    useEffect(() => {
        if (!mounted || sourceData.length <= WINDOW_SIZE || isPaused) return;

        const interval = setInterval(() => {
            setStartIndex(prev => (prev + 1) % sourceData.length);
        }, ANIMATION_SPEED);

        return () => clearInterval(interval);
    }, [mounted, sourceData.length, isPaused]);

    const getVisibleData = () => {
        if (sourceData.length <= WINDOW_SIZE) return sourceData;
        const end = startIndex + WINDOW_SIZE;
        if (end <= sourceData.length) {
            return sourceData.slice(startIndex, end);
        } else {
            return [
                ...sourceData.slice(startIndex, sourceData.length),
                ...sourceData.slice(0, end - sourceData.length)
            ];
        }
    };

    const visibleData = getVisibleData();

    const stats = {
        rqs: latestResult?.aggregate?.rqs || 0,
        accuracy: latestResult?.aggregate?.accuracy || 0,
        completeness: latestResult?.aggregate?.completeness || 0,
        consistency: latestResult?.aggregate?.consistency || 0,
        safety: latestResult?.aggregate?.safety || 0,
        hallucination: latestResult?.aggregate?.hallucination || 0,
        error_summary: latestResult?.error_summary || {},
        status: latestResult?.evaluation_status || ((latestResult?.aggregate?.accuracy ?? 0) > 0.5 ? "PASS" : "FAIL")
    };

    const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: CustomTooltipPayload[] }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <Paper sx={{ p: 1.5, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" display="block" color="text.secondary">
                        Evaluation ID: {data.id}
                    </Typography>
                    {data.run_id && (
                        <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 1, fontFamily: 'monospace' }}>
                            UUID: {data.run_id.slice(0, 8)}...
                        </Typography>
                    )}
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                        {data.timestamp}
                    </Typography>
                    {payload.map((p, idx) => (
                        <Box key={`${p.name || 'metric'}-${idx}`} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.color }} />
                            <Typography variant="caption" sx={{ color: p.color }}>
                                {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
                            </Typography>
                        </Box>
                    ))}
                </Paper>
            );
        }
        return null;
    };

    const statusSubtitle = Object.entries(stats.error_summary).length > 0
        ? Object.entries(stats.error_summary).map(([k, v]) => `${k}: ${String(v)}`).join(', ')
        : 'No Errors';

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {/* Page Header - matches RAG Eval */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, mb: 1 }}>
                <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: { xs: '0.95rem', md: '1.1rem' }, letterSpacing: '-0.02em', mb: 0.5, color: 'text.primary' }}>
                        Evaluation Dashboard
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.85rem' } }}>
                        Real-time overview and analytics across evaluation runs
                    </Typography>
                </Box>
                {latestResult?.id && (
                    <Paper
                        elevation={0}
                        sx={{
                            px: 1.5,
                            py: 0.5,
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            border: '1px solid',
                            borderColor: alpha(theme.palette.primary.main, 0.5),
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                        }}
                    >
                        <Typography variant="caption" color="text.primary" sx={{ fontWeight: 'bold', letterSpacing: 1.5, fontSize: '0.75rem' }}>
                            LATEST EVALUATION ID: {latestResult.id}
                        </Typography>
                    </Paper>
                )}
            </Box>

            {/* Content Area - Scrollable, matches RAG Eval structure */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden', pr: 1, '&::-webkit-scrollbar': { width: 8 }, '&::-webkit-scrollbar-thumb': { borderRadius: 4, bgcolor: alpha(theme.palette.primary.main, 0.2) } }}>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <MetricCard
                            label="RQS"
                            value={`${(stats.rqs * 100).toFixed(1)}%`}
                            icon={<Activity size={24} />}
                            subtitle="Weighted accuracy score"
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <MetricCard
                            label="Accuracy"
                            value={`${(stats.accuracy * 100).toFixed(1)}%`}
                            icon={<CheckCircle2 size={24} />}
                            subtitle="Correct vs hallucinations"
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <MetricCard
                            label="Completeness"
                            value={`${(stats.completeness * 100).toFixed(1)}%`}
                            icon={<ListChecks size={24} />}
                            subtitle="Expected fields present"
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <MetricCard
                            label="Hallucination"
                            value={`${(stats.hallucination * 100).toFixed(1)}%`}
                            icon={<AlertTriangle size={24} />}
                            subtitle="Safety risk assessment"
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <MetricCard
                            label="Consistency"
                            value={`${(stats.consistency * 100).toFixed(1)}%`}
                            icon={<TrendingUp size={24} />}
                            subtitle="Similarity across runs"
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <MetricCard
                            label="Safety"
                            value={`${(stats.safety * 100).toFixed(1)}%`}
                            icon={<ShieldCheck size={24} />}
                            subtitle="Content safety score"
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <MetricCard
                            label="Status"
                            value={stats.status}
                            icon={stats.status === "PASS" ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                            subtitle={statusSubtitle}
                        />
                    </Grid>
                </Grid>

                {/* Charts Section - matches RAG Eval ChartContainer pattern */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 12 }}>
                            <Box onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
                                <ChartContainer
                                    title="Performance Trend (Last 100 Runs)"
                                    subtitle="RQS: weighted Accuracy + Consistency. Accuracy: correct vs hallucinations."
                                    height={190}
                                >
                                    {mounted && (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={visibleData}>
                                                <defs>
                                                    <linearGradient id="colorRqs" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={theme.palette.info.main} stopOpacity={0.8} />
                                                        <stop offset="95%" stopColor={theme.palette.info.main} stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={colors.chart.accuracy} stopOpacity={0.8} />
                                                        <stop offset="95%" stopColor={colors.chart.accuracy} stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="colorSafe" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.8} />
                                                        <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={colors.chart.completeness} stopOpacity={0.8} />
                                                        <stop offset="95%" stopColor={colors.chart.completeness} stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="id" tick={{ fontSize: 10 }} minTickGap={30} />
                                                <YAxis tick={{ fontSize: 10 }} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                                <Area type="monotone" dataKey="rqs" stroke={theme.palette.info.main} fillOpacity={1} fill="url(#colorRqs)" name="RQS %" isAnimationActive={false} />
                                                <Area type="monotone" dataKey="accuracy" stroke={colors.chart.accuracy} fillOpacity={1} fill="url(#colorAcc)" name="Accuracy %" isAnimationActive={false} />
                                                <Area type="monotone" dataKey="completeness" stroke={colors.chart.completeness} fillOpacity={1} fill="url(#colorComp)" name="Completeness %" isAnimationActive={false} />
                                                <Area type="monotone" dataKey="safety" stroke={theme.palette.primary.main} fillOpacity={1} fill="url(#colorSafe)" name="Safety %" isAnimationActive={false} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    )}
                                </ChartContainer>
                            </Box>
                        </Grid>
                        <Grid size={{ xs: 12, md: 12 }}>
                            <Box onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
                                <ChartContainer
                                    title="Consistency vs Hallucinations (Last 100 Runs)"
                                    subtitle="Consistency: similarity across runs. Hallucination Rate: incorrect answers %."
                                    height={190}
                                >
                                    {mounted && (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={visibleData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="id" tick={{ fontSize: 10 }} minTickGap={30} />
                                                <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                                <Line yAxisId="left" type="monotone" dataKey="consistency" stroke={colors.chart.consistency} name="Consistency %" isAnimationActive={false} dot={false} />
                                                <Line yAxisId="left" type="monotone" dataKey="hallucinations" stroke={theme.palette.error.main} name="Hallucination Rate %" isAnimationActive={false} dot={false} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    )}
                                </ChartContainer>
                            </Box>
                        </Grid>
                    </Grid>
                </Box>
            </Box>
        </Box>
    );
}

/** @deprecated Use MetricCard from @/components/shared/MetricCard. Kept for test-evaluations compatibility. */
export function SummaryCard({ title, value, icon, subtitle }: { title: string, value: string | number, color?: string, icon?: React.ReactNode, subtitle?: React.ReactNode }) {
    return (
        <MetricCard
            label={title}
            value={value}
            icon={icon}
            subtitle={typeof subtitle === 'string' ? subtitle : undefined}
        />
    );
}
