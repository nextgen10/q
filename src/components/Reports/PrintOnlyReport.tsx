import React from 'react';
import {
    Box,
    Typography,
    Avatar,
    Grid,
    TableContainer,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Paper
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { UbsLogo } from '../UbsLogo';

// Helper functions locally scoped to avoid dependency on main file
const safeVal = (val: any) => {
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
};

const formatPercent = (val: any) => `${(safeVal(val) * 100).toFixed(1)}%`;
const formatNum = (val: any, dec = 3) => safeVal(val).toFixed(dec);

interface PrintOnlyReportProps {
    data: any;
    leaderboardData: any[];
}

export const PrintOnlyReport: React.FC<PrintOnlyReportProps> = ({ data, leaderboardData }) => {
    if (!data) return null;

    // Find the top performing model for the summary
    const topModel = leaderboardData[0] || {};

    return (
        <Box className="print-only-report" sx={{ display: 'none' }}>
            <Box sx={{ p: '40px', bgcolor: '#ffffff', color: '#1e293b', minHeight: '297mm' }}>

                {/* --- REPORT HEADER --- */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #2563eb', pb: 3, mb: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Avatar
                            src={process.env.NEXT_PUBLIC_REPORT_AVATAR || undefined}
                            sx={{
                                width: 64,
                                height: 64,
                                border: '3px solid #2563eb',
                                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                                bgcolor: '#2563eb !important', // Force background color
                                color: '#ffffff !important', // Force icon color
                                printColorAdjust: 'exact', // Force print background
                                WebkitPrintColorAdjust: 'exact'
                            }}
                        >
                            <UbsLogo size={32} color="#ffffff" />
                        </Avatar>
                        <Box>
                            <Typography variant="h4" sx={{ fontFamily: 'Audela, sans-serif', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', mb: 0.5 }}>
                                UBS <span style={{ color: '#5B6472' }}>|</span> RAG <span style={{ color: '#D00000' }}>EVAL</span> REPORT
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                Automated Benchmark System | Designed by <span style={{ color: '#0f172a' }}>Aniket Marwadi</span>
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, p: '4px 12px', bgcolor: '#f1f5f9', borderRadius: '4px', mb: 1, display: 'inline-block' }}>
                            CONFIDENTIAL
                        </Typography>
                        <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                            ID: {Math.random().toString(36).substr(2, 9).toUpperCase()} | {new Date().toLocaleDateString()}
                        </Typography>
                    </Box>
                </Box>

                {/* --- PRODUCTION INTELLIGENCE SUMMARY --- */}
                <Box sx={{ mb: 6 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 8, height: 24, bgcolor: '#f59e0b', borderRadius: 1 }} />
                        EXECUTIVE INSIGHTS (PRODUCTION INTELLIGENCE)
                    </Typography>
                    <Grid container spacing={2}>
                        {[
                            { label: 'Top Architect', value: topModel?.id, color: '#2563eb', sub: `RQS: ${formatNum(topModel?.avg_rqs)}` },
                            { label: 'Max Correctness', value: formatPercent(topModel?.gt_alignment), color: '#22c55e', sub: 'Peak consistency' },
                            { label: 'Grounded Faithfulness', value: formatPercent(topModel?.avg_faithfulness), color: '#e879f9', sub: 'Zero-hallucination bias' },
                            { label: 'Contextual Signal', value: formatPercent(topModel?.avg_context_precision), color: '#06b6d4', sub: 'Retrieval precision' },
                            { label: 'Information Recall', value: formatPercent(topModel?.retrieval_success), color: '#6366f1', sub: 'Data coverage' },
                            { label: 'Hallucination Risk', value: formatPercent(1 - safeVal(topModel?.avg_faithfulness)), color: '#ef4444', sub: 'Safety threshold' },
                        ].map((item, i) => (
                            <Grid size={{ xs: 4 }} key={i}>
                                <Box sx={{ p: 2, border: `1px solid ${item.color}33`, bgcolor: `${item.color}05`, borderRadius: '12px' }}>
                                    <Typography variant="caption" sx={{ fontWeight: 800, color: item.color, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                                        {item.label}
                                    </Typography>
                                    <Typography variant="h6" sx={{ fontWeight: 900, color: '#0f172a' }}>{item.value}</Typography>
                                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>{item.sub}</Typography>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                </Box>

                {/* --- EXECUTIVE SUMMARY --- */}
                <Box sx={{ mb: 6 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 8, height: 24, bgcolor: '#2563eb', borderRadius: 1 }} />
                        01. PERFORMANCE LEADERBOARD
                    </Typography>
                    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                        <Table>
                            <TableHead sx={{ bgcolor: '#0f172a' }}>
                                <TableRow>
                                    <TableCell sx={{ color: '#fff', fontWeight: 800, fontSize: '0.75rem' }}>RANK</TableCell>
                                    <TableCell sx={{ color: '#fff', fontWeight: 800, fontSize: '0.75rem' }}>AGENT MODEL</TableCell>
                                    <TableCell sx={{ color: '#fff', fontWeight: 800, fontSize: '0.75rem' }}>MASTER RQS</TableCell>
                                    <TableCell sx={{ color: '#fff', fontWeight: 800, fontSize: '0.75rem' }}>ANSWER CORRECTNESS</TableCell>
                                    <TableCell sx={{ color: '#fff', fontWeight: 800, fontSize: '0.75rem' }}>FAITHFULNESS</TableCell>
                                    <TableCell sx={{ color: '#fff', fontWeight: 800, fontSize: '0.75rem' }}>RELEVANCY</TableCell>
                                    <TableCell sx={{ color: '#fff', fontWeight: 800, fontSize: '0.75rem' }}>PRECISION</TableCell>
                                    <TableCell sx={{ color: '#fff', fontWeight: 800, fontSize: '0.75rem' }}>RECALL</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {leaderboardData.map((row: any) => (
                                    <TableRow key={row.id}>
                                        <TableCell sx={{ width: 60 }}>
                                            <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: row.rank === 1 ? '#fff7ed' : '#f8fafc', border: row.rank === 1 ? '2px solid #f59e0b' : '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: row.rank === 1 ? '#f59e0b' : '#64748b' }}>
                                                {row.rank}
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 800, color: '#1e293b' }}>{row.id}</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Typography sx={{ fontWeight: 900, color: '#2563eb', fontSize: '1rem' }}>{row.avg_rqs.toFixed(3)}</Typography>
                                                <Box sx={{ flex: 1, minWidth: 60, height: 6, bgcolor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                                                    <Box sx={{ width: `${row.avg_rqs * 100}%`, height: '100%', bgcolor: '#2563eb' }} />
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>{formatPercent(row.gt_alignment)}</TableCell>
                                        <TableCell sx={{ color: safeVal(row.avg_faithfulness) < 0.8 ? '#ef4444' : 'inherit', fontWeight: 700 }}>
                                            {formatPercent(row.avg_faithfulness)}
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>{formatPercent(row.avg_relevancy)}</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>{formatPercent(row.avg_context_precision)}</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>{formatPercent(row.retrieval_success)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>

                {/* --- GRANULAR TRANSACTIONAL LOGS --- */}
                <Box sx={{ breakBefore: 'page' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 8, height: 24, bgcolor: '#ec4899', borderRadius: 1 }} />
                        02. GRANULAR DRILLDOWN (PER TEST CASE)
                    </Typography>

                    {(data.test_cases || []).map((tc: any, index: number) => (
                        <Box key={tc.id} sx={{ mb: 5, breakInside: 'avoid' }}>
                            <Box sx={{ p: 2.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderBottom: 'none', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
                                <Typography variant="caption" sx={{ fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    SCENARIO {index + 1} — ID: {tc.id}
                                </Typography>
                                <Typography sx={{ mt: 1.5, fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', lineHeight: 1.5 }}>
                                    <span style={{ color: '#ec4899', marginRight: '8px', fontWeight: 900 }}>QUERY:</span> {tc.query}
                                </Typography>
                                <Typography sx={{ mt: 1.5, fontWeight: 700, fontSize: '0.85rem', color: '#10b981', lineHeight: 1.5, p: 1.5, bgcolor: '#ecfdf5', borderRadius: 2, border: '1px dashed #10b981' }}>
                                    <span style={{ color: '#059669', marginRight: '8px', fontWeight: 900 }}>GROUND TRUTH:</span> {tc.ground_truth || 'No reference provided.'}
                                </Typography>
                            </Box>

                            <TableContainer sx={{ border: '1px solid #e2e8f0', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 800, fontSize: '0.65rem', width: '15%' }}>BOT MODEL</TableCell>
                                            <TableCell sx={{ fontWeight: 800, fontSize: '0.65rem' }}>GENERATED RESPONSE</TableCell>
                                            <TableCell sx={{ fontWeight: 800, fontSize: '0.65rem', width: '8%' }}>FAITH</TableCell>
                                            <TableCell sx={{ fontWeight: 800, fontSize: '0.65rem', width: '8%' }}>REL</TableCell>
                                            <TableCell sx={{ fontWeight: 800, fontSize: '0.65rem', width: '8%' }}>PREC</TableCell>
                                            <TableCell sx={{ fontWeight: 800, fontSize: '0.65rem', width: '8%' }}>RECALL</TableCell>
                                            <TableCell sx={{ fontWeight: 800, fontSize: '0.65rem', width: '10%' }}>RQS</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {Object.keys(data.summaries || {}).map((botId) => {
                                            const m = data.bot_metrics[botId]?.[tc.id] || {};
                                            const response = tc.bot_responses?.[botId] || 'No response captured.';
                                            return (
                                                <TableRow key={`${tc.id}-${botId}`}>
                                                    <TableCell sx={{ verticalAlign: 'top', fontWeight: 800, fontSize: '0.65rem', p: 1.5 }}>{botId}</TableCell>
                                                    <TableCell sx={{ verticalAlign: 'top', fontSize: '0.65rem', lineHeight: 1.5, color: '#475569', py: 1.5, wordBreak: 'break-word' }}>
                                                        {response}
                                                    </TableCell>
                                                    <TableCell sx={{ verticalAlign: 'top', fontWeight: 700, py: 1.5 }}>{formatNum(m.faithfulness, 2)}</TableCell>
                                                    <TableCell sx={{ verticalAlign: 'top', fontWeight: 700, py: 1.5 }}>{formatNum(m.answer_relevancy, 2)}</TableCell>
                                                    <TableCell sx={{ verticalAlign: 'top', fontWeight: 700, py: 1.5 }}>{formatNum(m.context_precision, 2)}</TableCell>
                                                    <TableCell sx={{ verticalAlign: 'top', fontWeight: 700, py: 1.5 }}>{formatNum(m.context_recall, 2)}</TableCell>
                                                    <TableCell sx={{ verticalAlign: 'top', fontWeight: 900, color: '#2563eb', fontSize: '0.75rem', py: 1.5 }}>
                                                        {formatNum(m.rqs, 3)}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    ))}
                </Box>

                {/* --- FOOTER --- */}
                <Box sx={{ borderTop: '1px solid #e2e8f0', mt: 8, pt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>EXPORTED: {new Date().toLocaleTimeString()} / {new Date().toLocaleDateString()}</Typography>
                </Box>
            </Box>
        </Box>
    );
};
