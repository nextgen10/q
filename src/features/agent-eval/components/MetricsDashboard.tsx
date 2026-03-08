"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts";
import { Box, Paper, Tabs, Tab, Typography, useTheme } from "@mui/material";
import { ChartContainer } from "@/components/shared/ChartContainer";
import { MetricCard } from "@/components/shared/MetricCard";

interface Metric {
    name: string;
    score: number;
    reason: string;
    success: boolean;
    category: string;
}

interface RQSMetrics {
    accuracy: number;
    consistency: number;
    pdf_support_rate: number;
    rqs: number;
}

interface MetricsDashboardProps {
    metrics: Metric[];
    rqsMetrics?: RQSMetrics;
    batchResults?: any[]; // simplified for now
}

export function MetricsDashboard({ metrics, rqsMetrics, batchResults }: MetricsDashboardProps) {
    const theme = useTheme();
    const gridStroke = theme.palette.divider;
    const tickColor = theme.palette.text.secondary;
    const tooltipBg = theme.palette.background.paper;
    const tooltipBorder = theme.palette.divider;
    const tooltipColor = theme.palette.text.primary;

    if ((!metrics || !metrics.length) && !rqsMetrics) return null;

    const safeMetrics = metrics || [];
    const nlpMetrics = safeMetrics.filter(m => m.category === "NLP");
    const otherMetrics = safeMetrics.filter(m => m.category !== "NLP");

    const [tabValue, setTabValue] = React.useState(0);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {rqsMetrics && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
                    <MetricCard label="RQS Score" value={(rqsMetrics.rqs ?? 0).toFixed(3)} />
                    <MetricCard label="Accuracy" value={(rqsMetrics.accuracy ?? 0).toFixed(3)} />
                    <MetricCard label="Consistency" value={(rqsMetrics.consistency ?? 0).toFixed(3)} />
                    <MetricCard label="PDF Support" value={(rqsMetrics.pdf_support_rate ?? 0).toFixed(3)} />
                </Box>
            )}

            <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tab label="Visualizations" />
                <Tab label="Detailed Breakdown" />
                {batchResults && <Tab label="Batch Results" />}
            </Tabs>

            {tabValue === 0 && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                        {/* Radar Chart for NLP Metrics */}
                        {nlpMetrics.length > 0 && (
                            <ChartContainer title="NLP Metrics (Radar)" height={280}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={nlpMetrics}>
                                        <PolarGrid stroke={gridStroke} />
                                        <PolarAngleAxis dataKey="name" tick={{ fill: tickColor, fontSize: 12 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 1]} tick={{ fill: tickColor }} />
                                        <Radar
                                            name="Score"
                                            dataKey="score"
                                            stroke={theme.palette.info.main}
                                            fill={theme.palette.info.main}
                                            fillOpacity={0.5}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipColor, border: '1px solid' }}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        )}

                        {/* Bar Chart for Structure/Other */}
                        <ChartContainer title="Structural & Judge Scores" height={280}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={otherMetrics}>
                                    <XAxis dataKey="name" stroke={tickColor} fontSize={12} />
                                    <YAxis stroke={tickColor} fontSize={12} domain={[0, 1]} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipColor, border: '1px solid' }}
                                        itemStyle={{ color: tooltipColor }}
                                    />
                                    <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                                        {otherMetrics.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.success ? theme.palette.success.main : theme.palette.error.main} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                </Box>
            )}

            {tabValue === 1 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {metrics.map((metric, idx) => (
                        <Paper key={idx} elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="subtitle1" fontWeight={600}>{metric.name}</Typography>
                                    <Typography component="span" variant="caption" sx={{ px: 1, py: 0.5, borderRadius: '999px', bgcolor: 'action.hover', color: 'text.secondary' }}>
                                        {metric.category}
                                    </Typography>
                                </Box>
                                <Typography variant="caption" fontWeight={700} sx={{ px: 1, py: 0.5, borderRadius: 1, bgcolor: (t) => t.palette.mode === 'dark' ? (metric.success ? 'rgba(31, 138, 112, 0.3)' : 'rgba(194, 48, 48, 0.3)') : (metric.success ? 'rgba(31, 138, 112, 0.2)' : 'rgba(194, 48, 48, 0.2)'), color: metric.success ? 'success.main' : 'error.main' }}>
                                    {metric.score.toFixed(3)}
                                </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">{metric.reason}</Typography>
                        </Paper>
                    ))}
                </Box>
            )}

            {batchResults && tabValue === 2 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {batchResults.map((res: any, idx: number) => (
                        <Paper key={idx} elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="subtitle1" fontWeight={600}>Run #{idx + 1}</Typography>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {(res.metrics ?? []).map((m: any, i: number) => (
                                        <Typography key={i} component="span" variant="caption" sx={{ px: 1, py: 0.5, borderRadius: 1, bgcolor: () => m.success ? 'rgba(31, 138, 112, 0.25)' : 'rgba(194, 48, 48, 0.25)', color: m.success ? 'success.main' : 'error.main' }}>
                                            {m.name}: {(m.score ?? 0).toFixed(2)}
                                        </Typography>
                                    ))}
                                </Box>
                            </Box>
                            <Box component="pre" sx={{ fontSize: '0.75rem', color: 'text.secondary', fontFamily: 'monospace', bgcolor: 'action.hover', p: 1.5, borderRadius: 1, overflow: 'auto' }}>
                                {JSON.stringify(res.output ?? {})}
                            </Box>
                        </Paper>
                    ))}
                </Box>
            )}
        </Box>
    );
}
