'use client';
import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Typography,
    Box,
    Collapse,
    IconButton,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

interface OutputDetail {
    found: boolean;
    match_type: string;
    accuracy: number;
    expected: string;
    output: string;
    run_id: string;
    in_pdf: boolean;
    pdf_similarity?: number;
    toxicity: number;
    error_type: string;
    semantic_score?: number;
    bleu?: number;
    rougeL?: number;
}

interface QueryResult {
    outputs: OutputDetail[];
    n_runs: number;
}

interface ResultsTableProps {
    data: Record<string, QueryResult>;
}

function Row(props: { queryId: string; result: QueryResult }) {
    const { queryId, result } = props;
    const [open, setOpen] = React.useState(false);
    const output = result.outputs?.[0];

    if (!output) return null;

    const isSuccess = output.accuracy === 1.0;

    return (
        <React.Fragment>
            <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
                <TableCell>
                    <IconButton
                        aria-label="expand row"
                        size="small"
                        onClick={() => setOpen(!open)}
                    >
                        {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                </TableCell>
                <TableCell component="th" scope="row">
                    <Typography variant="subtitle2" fontWeight="bold">
                        {queryId}
                    </Typography>
                </TableCell>
                <TableCell>
                    <Chip
                        label={output.match_type}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ borderRadius: '4px' }}
                    />
                </TableCell>
                <TableCell align="center">
                    {isSuccess ? (
                        <Chip icon={<CheckCircleIcon />} label="PASS" color="success" size="small" />
                    ) : (
                        <Chip icon={<ErrorIcon />} label="FAIL" color="error" size="small" />
                    )}
                </TableCell>
                <TableCell align="right">{output.accuracy.toFixed(2)}</TableCell>
                <TableCell align="right">
                    {output.semantic_score ? output.semantic_score.toFixed(3) : 'N/A'}
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 1, padding: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                            <Typography variant="h6" gutterBottom component="div" color="primary">
                                Details
                            </Typography>
                            <Table size="small" aria-label="details">
                                <TableBody>
                                    <TableRow>
                                        <TableCell component="th" scope="row" sx={{ fontWeight: 'bold', width: '150px' }}>Ground Truth</TableCell>
                                        <TableCell sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{output.expected}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>AI Output</TableCell>
                                        <TableCell sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{output.output}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>Error Type</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={output.error_type}
                                                color={output.error_type === 'correct' ? 'success' : 'error'}
                                                size="small"
                                                variant="outlined"
                                            />
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>Metrics</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                <Chip label={`BLEU: ${output.bleu?.toFixed(2) ?? 'N/A'}`} size="small" />
                                                <Chip label={`ROUGE-L: ${output.rougeL?.toFixed(3) ?? 'N/A'}`} size="small" />
                                                <Chip label={`Toxicity: ${output.toxicity?.toFixed(4) ?? 'N/A'}`} size="small" />
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
}

export default function ResultsTable({ data }: ResultsTableProps) {
    return (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0' }}>
            <Table aria-label="collapsible table">
                <TableHead sx={{ bgcolor: 'secondary.light' }}>
                    <TableRow>
                        <TableCell />
                        <TableCell>Query ID</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell align="center">Status</TableCell>
                        <TableCell align="right">Accuracy</TableCell>
                        <TableCell align="right">Semantic Score</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {Object.entries(data).map(([queryId, result]) => (
                        <Row key={queryId} queryId={queryId} result={result} />
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
