'use client';

import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Grid,
    Paper,
    Stack,
    Divider,
    Button,
    Avatar,
    alpha,
    useTheme,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    IconButton,
} from '@mui/material';
import { motion } from 'framer-motion';
import {
    Book,
    Shield,
    Zap,
    Target,
    Layers,
    Activity,
    CheckCircle2,
    AlertTriangle,
    Mail,
    ExternalLink,
    Code,
    Terminal,
    Cpu,
    Brain,
    History,
    Compass,
    ArrowRight,
    Key,
    Cloud,
    Lock,
    Users,
    Copy,
} from 'lucide-react';
import { UbsLogo } from '../../components/UbsLogo';
import { UnifiedNavBar } from '../../components/UnifiedNavBar';
import ThemeToggle from '@/components/ThemeToggle';
import { API_ROOT } from '@/utils/apiBase';
import { useRouter } from 'next/navigation';
import { SourceAboutContent } from './SourceAboutContent';

export default function DocumentationPage() {
    const theme = useTheme();
    const router = useRouter();

    useEffect(() => {
        const hash = window.location.hash.replace('#', '');
        if (hash) {
            setTimeout(() => {
                document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
            }, 300);
        }
    }, []);

    return (
        <Box sx={{
                minHeight: '100vh',
                bgcolor: 'background.default',
                color: 'text.primary',
                pb: 10
            }}>
                <UnifiedNavBar
                    title="QUALARIS"
                    items={[
                        { id: 'platforms', label: 'Overview', onClick: () => document.getElementById('overview')?.scrollIntoView({ behavior: 'smooth' }) },
                        { id: 'solutions', label: 'Use Cases', onClick: () => document.getElementById('ground-truth-application')?.scrollIntoView({ behavior: 'smooth' }) },
                        { id: 'enterprise', label: 'Enterprise', onClick: () => document.getElementById('contact-support')?.scrollIntoView({ behavior: 'smooth' }) },
                    ]}
                    onLogoClick={() => router.push('/')}
                    actions={
                        <>
                            <Button
                                variant="outlined"
                                onClick={() => router.push('/')}
                                sx={{
                                    borderColor: 'divider',
                                    color: 'text.primary',
                                    '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(208,0,0,0.04)' }
                                }}
                            >
                                Back to Home
                            </Button>
                            <ThemeToggle />
                        </>
                    }
                />

                <Container maxWidth="xl" sx={{ mt: 4, px: { xs: 2, md: 3 } }}>
                    {/* Header */}
                    <Box sx={{ mb: 8, textAlign: 'center' }}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <Typography variant="h3" sx={{ fontWeight: 600, mb: 2, letterSpacing: '-0.02em' }}>
                                Platform <Box component="span" sx={{ color: 'primary.main' }}>Documentation</Box>
                            </Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.1rem', maxWidth: 800, mx: 'auto' }}>
                                The definitive guide to Qualaris&apos;s unified workflow: Ground Truth Generator, Playwright Compass, RAG Eval, and Agent Eval for enterprise AI quality assurance.
                            </Typography>
                        </motion.div>
                    </Box>

                    <Grid container spacing={4}>
                        {/* Sidebar Navigation (Optional but useful for long docs) */}
                        <Grid size={{ xs: 12, md: 3 }}>
                            <Box sx={{ position: 'sticky', top: 120 }}>
                                <Typography variant="overline" sx={{ fontWeight: 800, color: 'primary.main', mb: 2, display: 'block' }}>
                                    ON THIS PAGE
                                </Typography>
                                <Stack spacing={1}>
                                    {[
                                        { label: 'Overview', id: 'overview' },
                                        { label: 'Ground Truth Application', id: 'ground-truth-application' },
                                        { label: 'Playwright Compass', id: 'playwright-compass' },
                                        { label: 'Agent Eval Use Case', id: 'agent-eval' },
                                        { label: 'RAG Eval Use Case', id: 'rag-eval' },
                                        { label: 'RAG Methodology', id: 'rag-methodology' },
                                        { label: 'Agent Eval Metrics', id: 'agent-metrics' },
                                        { label: 'Decision Engine', id: 'decision-engine' },
                                        { label: 'Models & Infrastructure', id: 'models-api' },
                                        { label: 'API as a Service', id: 'api-as-a-service' },
                                        { label: 'Authentication', id: 'authentication' },
                                        { label: 'API Reference', id: 'api-reference' },
                                        { label: 'Our Team', id: 'our-team' },
                                        { label: 'Technical Ownership', id: 'contact-support' },
                                    ].map((item) => (
                                        <Typography
                                            key={item.id}
                                            variant="body2"
                                            sx={{
                                                cursor: 'pointer',
                                                color: 'text.secondary',
                                                '&:hover': { color: 'primary.main' },
                                                transition: 'color 0.2s',
                                                fontWeight: 500
                                            }}
                                            onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' })}
                                        >
                                            {item.label}
                                        </Typography>
                                    ))}
                                </Stack>
                            </Box>
                        </Grid>

                        {/* Main Content */}
                        <Grid size={{ xs: 12, md: 9 }}>
                            <Stack spacing={8}>

                                {/* 1. Overview */}
                                <Box id="overview" sx={{ scrollMarginTop: '80px' }}>
                                    <SectionHeader icon={<Layers size={24} />} title="Overview" />
                                    <Typography variant="body1" paragraph color="text.secondary">
                                        Qualaris is an enterprise-grade evaluation suite for benchmarking Large Language Model applications.
                                        It provides four integrated modules:
                                    </Typography>
                                    <Grid container spacing={2}>
                                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                            <DocCard
                                                title="RAG Eval"
                                                icon={<Activity size={20} />}
                                                content="Evaluates Retrieval-Augmented Generation pipelines. Upload Excel datasets, compare multiple RAG architectures, and measure faithfulness, relevancy, context precision/recall, and answer correctness."
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                            <DocCard
                                                title="Agent Eval"
                                                icon={<Brain size={20} />}
                                                content="Evaluates JSON-structured agent outputs. Measures correctness, completeness, hallucination, consistency, and safety. Supports Batch (JSON files) and single-run JSON evaluation."
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                            <DocCard
                                                title="Ground Truth Generator"
                                                icon={<Layers size={20} />}
                                                content="Builds and validates high-quality datasets using JSON/YAML/Form views, schema-aware editing, and Excel/HTML import-export for downstream evaluation use cases."
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                            <DocCard
                                                title="Playwright Compass"
                                                icon={<Compass size={20} />}
                                                content="Designs and operates Playwright browser automation workflows, including test design, execution, locator management, self-healing operations, and architecture visibility."
                                            />
                                        </Grid>
                                    </Grid>
                                </Box>

                                {/* 2. Ground Truth Generator */}
                                <Box id="ground-truth-application" sx={{ scrollMarginTop: '80px' }}>
                                    <SectionHeader icon={<Layers size={24} />} title="Ground Truth Application" />
                                    <Typography variant="body1" paragraph color="text.secondary">
                                        Ground Truth Generator is the dataset engineering module in Qualaris. It standardizes evaluation inputs for both RAG Eval and Agent Eval with schema-aware controls and portable formats.
                                    </Typography>
                                    <Stack spacing={2}>
                                        <MetricDetail
                                            title="Editor Modes"
                                            description="Use JSON, YAML, Schema Template, and Generated Form modes to author and validate datasets in one place while keeping structures synchronized."
                                        />
                                        <MetricDetail
                                            title="Template Library"
                                            description="Store reusable templates scoped to your application, with import/export support for team sharing and cross-project reuse."
                                        />
                                        <MetricDetail
                                            title="Portable Data Operations"
                                            description="Import and export Excel/HTML/JSON for operational workflows. Generated datasets flow directly into RAG and Agent evaluation pipelines."
                                        />
                                    </Stack>
                                </Box>

                                {/* 3. Playwright Compass */}
                                <Box id="playwright-compass" sx={{ scrollMarginTop: '80px' }}>
                                    <SectionHeader icon={<Compass size={24} />} title="Playwright Compass" />
                                    <Typography variant="body1" paragraph color="text.secondary">
                                        Playwright Compass is the browser-automation engineering module in Qualaris. It supports end-to-end lifecycle management from test design to execution and operational maintenance.
                                    </Typography>
                                    <Stack spacing={2}>
                                        <MetricDetail
                                            title="Studio + Test Design"
                                            description="Author page-object structures and reusable test flows with guided design controls aligned to automation standards."
                                        />
                                        <MetricDetail
                                            title="Execution + Locator Ops"
                                            description="Run test sessions, track execution outcomes, and manage locator assets for resilient browser automation."
                                        />
                                        <MetricDetail
                                            title="Healing + Architecture + ROI"
                                            description="Review self-healing recommendations, inspect architecture relationships, and monitor ROI indicators for automation programs."
                                        />
                                    </Stack>
                                </Box>

                                {/* 4. Agent Eval Use Case */}
                                <Box id="agent-eval" sx={{ scrollMarginTop: '80px' }}>
                                    <SectionHeader icon={<Brain size={24} />} title="Agent Eval Use Case" />
                                    <Typography variant="body1" paragraph color="text.secondary">
                                        Agent Eval validates autonomous agents that produce JSON outputs. Navigate via: <strong>Dashboard → Experiments → History → Configuration</strong>.
                                    </Typography>
                                    <Stack spacing={2}>
                                        <MetricDetail
                                            title="Dashboard"
                                            description="Real-time overview of the latest evaluation: RQS, Accuracy, Completeness, Hallucination, Consistency, Safety, Status. Includes performance trend charts (last 100 runs) and consistency vs. hallucination over time."
                                        />
                                        <MetricDetail
                                            title="Experiments"
                                            description="Run evaluations via Batch (local JSON files) or JSON Evaluation (paste Ground Truth + AI Outputs). Configure key mapping (query_id, expected_output, match_type). View per-run results with Accuracy, Completeness, Hallucination, Consistency, and Safety tabs."
                                        />
                                        <MetricDetail
                                            title="History"
                                            description="Browse past evaluations, compare runs, and view detailed JSON results."
                                        />
                                        <MetricDetail
                                            title="Configuration"
                                            description="Set thresholds (semantic, fuzzy, accuracy, hallucination, RQS), LLM model (gpt-4o), and JSON weights (accuracy, completeness, hallucination, safety) for the weighted RQS formula."
                                        />
                                    </Stack>
                                </Box>

                                {/* 5. RAG Eval Use Case */}
                                <Box id="rag-eval" sx={{ scrollMarginTop: '80px' }}>
                                    <SectionHeader icon={<Activity size={24} />} title="RAG Eval Use Case" />
                                    <Typography variant="body1" paragraph color="text.secondary">
                                        RAG Eval compares multiple RAG architectures on Excel datasets. Navigate via: <strong>Dashboard → Experiments → History → Configuration</strong>.
                                    </Typography>
                                    <Stack spacing={2}>
                                        <MetricDetail
                                            title="Dashboard (Insights)"
                                            description="Production intelligence view: Highest RQS, Answer Correctness, Faithfulness, Relevancy, Context Precision, Context Recall. Area charts show performance trajectory. Export reports as PDF, JSON, or Excel."
                                        />
                                        <MetricDetail
                                            title="Experiments (Drilldown)"
                                            description="Per-question analysis: compare bot responses, ground truth, and metrics (Faithfulness, Relevancy, Context Precision/Recall, Answer Correctness) for each test case."
                                        />
                                        <MetricDetail
                                            title="Configuration"
                                            description="Configure weights (Alpha/Beta/Gamma), metric toggles, thresholds, judge model, and max rows. Weights are validated and normalized for safe production scoring."
                                        />
                                        <MetricDetail
                                            title="Confusion Matrix + Recommendation"
                                            description="Run-level diagnostics include TP/FP/FN/TN analytics and derived metrics. Use the recommendation endpoint to generate remediation guidance from metric gaps."
                                        />
                                    </Stack>
                                </Box>

                                {/* 5b. RAG Methodology (source About content moved here) */}
                                <Box id="rag-methodology" sx={{ scrollMarginTop: '80px' }}>
                                    <SectionHeader icon={<Target size={24} />} title="RAG Methodology" />
                                    <SourceAboutContent />
                                </Box>

                                {/* 4. Agent Metrics */}
                                <Box id="agent-metrics" sx={{ scrollMarginTop: '80px' }}>
                                    <SectionHeader icon={<Brain size={24} />} title="Agent Eval Metrics" />
                                    <Stack spacing={3}>
                                        <MetricDetail
                                            title="RQS (Retrieval Quality Score)"
                                            description="Weighted composite score for Agent Eval: RQS = w_accuracy × Accuracy + w_completeness × Completeness + w_hallucination × (1 − Hallucination) + w_safety × Safety. Default weights: 0.45, 0.25, 0.15, 0.15."
                                            formula="RQS = w_acc × Acc + w_comp × Comp + w_hall × (1 − Hall) + w_safe × Safe"
                                            example="Accuracy 0.9, Completeness 1.0, Hallucination 0.05, Safety 1.0 → RQS ≈ 0.95 (excellent)."
                                        />
                                        <MetricDetail
                                            title="Accuracy"
                                            description="Correctness based on exact match or semantic similarity (0–1). Uses match_type per field: exact, number, text, or semantic. Semantic uses cosine similarity vs. semantic threshold (default 0.72)."
                                            example="Expected: 42. AI output: 42 → 100%. Expected: 'John Doe'. Output: 'john doe' → 100% (case-insensitive exact). Semantic similarity 0.85 vs threshold 0.72 → pass."
                                        />
                                        <MetricDetail
                                            title="Completeness"
                                            description="Proportion of expected fields from ground truth present in the AI output. Checks that all required JSON keys exist."
                                            example="GT keys: name, age, occupation. AI output has name, age but missing occupation → Completeness ≈ 0.67."
                                        />
                                        <MetricDetail
                                            title="Hallucination"
                                            description="Identifies information in the output not present in reference or context (0–1). Higher = more hallucinated content."
                                            example="Output contains a claim not in ground truth or context → Hallucination score increases. Used with Error Type (correct vs hallucination) for classification."
                                        />
                                        <MetricDetail
                                            title="Consistency"
                                            description="Similarity of outputs across multiple runs for the same query, or internal coherence within a single output (0–1)."
                                            example="Same query run 3 times: outputs A, B, C. If A≈B≈C (high similarity), Consistency ≈ 1.0. High variance → low Consistency."
                                        />
                                        <MetricDetail
                                            title="Safety Score"
                                            description="Unified score (0–1) for content safety (non-toxicity) and qualitative judge results. 1.0 = perfectly safe."
                                            example="LLM evaluates response for harmful, biased, or unsafe content. Score &lt; 0.8 triggers safety issues list."
                                        />
                                    </Stack>
                                </Box>

                                {/* 6. Decision Engine */}
                                <Box id="decision-engine" sx={{ scrollMarginTop: '80px' }}>
                                    <SectionHeader icon={<Zap size={24} />} title="The Decision Engine" />
                                    <Paper sx={{ p: 4, borderRadius: 4, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                                        <Typography variant="h6" gutterBottom fontWeight={800}>Text Accuracy Logic</Typography>
                                        <Typography variant="body2" paragraph color="text.secondary">
                                            For free-text responses, we use a multi-stage decision tree to ensure factual correctness beyond simple keyword matching:
                                        </Typography>
                                        <Stack spacing={1.5}>
                                            <StepItem step="1" title="Exact Match" desc="Case-insensitive equality check. If true, Accuracy = 100%." />
                                            <StepItem step="2" title="Semantic Similarity" desc="LLM-based semantic similarity vs. threshold (default 0.72). If below threshold, Accuracy = 0%." />
                                            <StepItem step="3" title="Match Type" desc="Per-field match_type (exact, number, text, semantic) determines comparison logic. JSON keys are validated against ground truth." />
                                        </Stack>
                                    </Paper>
                                </Box>

                                {/* 7. Models & API */}
                                <Box id="models-api" sx={{ scrollMarginTop: '80px' }}>
                                    <SectionHeader icon={<Cpu size={24} />} title="Models & Infrastructure" />
                                    <TableContainer component={Paper} sx={{ borderRadius: 4, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', overflowX: 'auto' }}>
                                        <Table size="small">
                                            <TableHead sx={{ bgcolor: (t) => alpha(t.palette.primary.main, 0.05) }}>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 800 }}>Model</TableCell>
                                                    <TableCell sx={{ fontWeight: 800 }}>Primary Metric</TableCell>
                                                    <TableCell sx={{ fontWeight: 800 }}>Provider</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                <TableRow>
                                                    <TableCell sx={{ color: 'text.primary', fontWeight: 600 }}>gpt-4o</TableCell>
                                                    <TableCell><Chip label="Semantic, Fuzzy, Consistency, Safety" size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} /></TableCell>
                                                    <TableCell color="text.secondary">OpenAI / Azure</TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                                        Agent Eval API base: <code style={{ padding: '2px 6px', background: 'rgba(0,0,0,0.1)', borderRadius: 4 }}>/agent-eval</code>. RAG Eval APIs are root-level endpoints, with health available at <code style={{ padding: '2px 6px', background: 'rgba(0,0,0,0.1)', borderRadius: 4 }}>/health</code>.
                                    </Typography>
                                    <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                                        <Button variant="outlined" startIcon={<Code />} href={`${API_ROOT}/docs`} target="_blank" rel="noopener noreferrer" sx={{ borderColor: 'divider', color: 'text.primary', '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(208,0,0,0.04)' } }}>Swagger UI</Button>
                                        <Button variant="outlined" startIcon={<Terminal />} href={`${API_ROOT}/redoc`} target="_blank" rel="noopener noreferrer" sx={{ borderColor: 'divider', color: 'text.primary', '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(208,0,0,0.04)' } }}>ReDoc</Button>
                                    </Box>
                                </Box>

                                {/* 8. API as a Service */}
                                <Box id="api-as-a-service" sx={{ scrollMarginTop: '80px' }}>
                                    <SectionHeader icon={<Cloud size={24} />} title="API as a Service" />
                                    <Typography variant="body1" paragraph color="text.secondary">
                                        Qualaris is designed to be consumed as a <strong>multi-tenant evaluation service</strong> by any team in your organization.
                                        Each application gets its own isolated environment — evaluations, history, and feedback are scoped to the registered app.
                                    </Typography>
                                    <Grid container spacing={2} sx={{ mb: 3 }}>
                                        <Grid size={{ xs: 12, sm: 4 }}>
                                            <DocCard title="Register Once" icon={<Key size={20} />} content="Register your application to receive a unique API key. Use this key to authenticate all requests — from the dashboard UI or programmatic API calls." />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 4 }}>
                                            <DocCard title="Data Isolation" icon={<Lock size={20} />} content="Each API key scopes all data access. Your evaluations, history, and feedback are completely isolated from other applications." />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 4 }}>
                                            <DocCard title="Multi-Team" icon={<Users size={20} />} content="Multiple teams can use the same Qualaris instance. Each team registers their app and sees only their data through the dashboard or API." />
                                        </Grid>
                                    </Grid>

                                    <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                                        <Typography variant="h6" fontWeight={800} gutterBottom>Quick Start</Typography>
                                        <Stack spacing={2}>
                                            <StepItem step="1" title="Register your application" desc="POST /agent-eval/apps/register with your app name. You'll receive an API key (nxe_...) — store it securely." />
                                            <StepItem step="2" title="Authenticate" desc="Include the header X-API-Key: nxe_your_key in every request, or sign in via the dashboard login page." />
                                            <StepItem step="3" title="Run evaluations" desc="Agent Eval: POST /agent-eval/evaluate-from-json with JSON ground truth + AI outputs. RAG Eval: POST /evaluate-excel with an Excel file or POST /evaluate with JSON test cases." />
                                            <StepItem step="4" title="View results" desc="Use the dashboard (scoped to your app) or fetch programmatically: GET /agent-eval/history (Agent) or GET /evaluations (RAG)." />
                                        </Stack>
                                    </Paper>

                                    <Paper sx={{ p: 3, mt: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                                        <Typography variant="h6" fontWeight={800} gutterBottom>Unified Access Model</Typography>
                                        <Typography variant="body2" color="text.secondary" paragraph>
                                            Qualaris uses one application identity across its modules. Use the same <code style={{ padding: '2px 6px', background: 'rgba(0,0,0,0.08)', borderRadius: 4 }}>X-API-Key</code> header for API-backed evaluation services.
                                        </Typography>
                                        <Grid container spacing={2}>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <Box sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                                                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>Agent Eval</Typography>
                                                    <Typography variant="caption" color="text.secondary" component="div">
                                                        Base: <code>/agent-eval</code><br />
                                                        Input: JSON ground truth + AI outputs<br />
                                                        Metrics: Accuracy, Completeness, Hallucination, Consistency, Safety, RQS<br />
                                                        Use for: Autonomous agent JSON outputs
                                                    </Typography>
                                                </Box>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <Box sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                                                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>RAG Eval</Typography>
                                                    <Typography variant="caption" color="text.secondary" component="div">
                                                        Base: <code>/</code> (root)<br />
                                                        Input: Excel file or JSON test cases<br />
                                                        Metrics: Faithfulness, Relevancy, Context Precision/Recall, Answer Correctness, RQS<br />
                                                        Use for: RAG pipeline comparison
                                                    </Typography>
                                                </Box>
                                            </Grid>
                                        </Grid>
                                    </Paper>
                                </Box>

                                {/* 9. Authentication */}
                                <Box id="authentication" sx={{ scrollMarginTop: '80px' }}>
                                    <SectionHeader icon={<Shield size={24} />} title="Authentication" />
                                    <Typography variant="body1" paragraph color="text.secondary">
                                        Qualaris uses username/password sign-in for platform access. After login, requests are authorized with <code style={{ padding: '2px 6px', background: 'rgba(0,0,0,0.08)', borderRadius: 4 }}>X-API-Key</code>.
                                        Access is enforced per application scope (for example, RAG Eval or Agent Eval).
                                    </Typography>

                                    <Stack spacing={3}>
                                        <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                                            <Typography variant="h6" fontWeight={800} gutterBottom>Register Account</Typography>
                                            <CodeBlock>{`POST /agent-eval/apps/register
Content-Type: application/json

{
  "username": "qa_engineer",
  "password": "securePass123",
  "owner_email": "team@company.com",
  "requested_access": "ALL"
}

# Response:
{
  "app_id": "qa_engineer",
  "app_name": "qa_engineer",
  "username": "qa_engineer",
  "requested_access": "ALL",
  "api_key": "nxe_abc123..."   ← Save this! Shown only once.
}`}</CodeBlock>
                                            <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1, fontWeight: 600 }}>
                                                ⚠ The API key is returned only once at registration. Store it securely.
                                            </Typography>
                                        </Paper>

                                        <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                                            <Typography variant="h6" fontWeight={800} gutterBottom>Login</Typography>
                                            <CodeBlock>{`POST /agent-eval/apps/login
Content-Type: application/json

{
  "username": "qa_engineer",
  "password": "securePass123"
}

# Response (200):
{
  "app_id": "qa_engineer",
  "app_name": "qa_engineer",
  "username": "qa_engineer",
  "requested_access": "ALL",
  "owner_email": "team@company.com"
}

# Response (401):
{ "detail": "Invalid username or password" }`}</CodeBlock>
                                        </Paper>

                                        <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                                            <Typography variant="h6" fontWeight={800} gutterBottom>Using the API Key</Typography>
                                            <CodeBlock>{`# Include in every request:
curl -H "X-API-Key: nxe_abc123..." \\
     https://your-server/agent-eval/history

# Python example:
import requests

headers = {"X-API-Key": "nxe_abc123..."}
response = requests.get(
    "https://your-server/agent-eval/history",
    headers=headers
)
print(response.json())`}</CodeBlock>
                                        </Paper>

                                        <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                                            <Typography variant="h6" fontWeight={800} gutterBottom>Rotate API Key</Typography>
                                            <CodeBlock>{`POST /agent-eval/apps/{app_id}/rotate-key
X-API-Key: nxe_current_key...

# Response:
{
  "app_id": "my-trading-bot",
  "api_key": "nxe_new_key..."   ← Old key is immediately invalidated
}`}</CodeBlock>
                                        </Paper>
                                    </Stack>
                                </Box>

                                {/* 10. API Reference */}
                                <Box id="api-reference" sx={{ scrollMarginTop: '80px' }}>
                                    <SectionHeader icon={<Code size={24} />} title="API Reference" />
                                    <Typography variant="body1" paragraph color="text.secondary">
                                        All endpoints require the <code style={{ padding: '2px 6px', background: 'rgba(0,0,0,0.08)', borderRadius: 4 }}>X-API-Key</code> header unless noted.
                                        The server exposes two endpoint groups: <strong>Agent Eval</strong> (under <code>/agent-eval</code>) and <strong>RAG Eval</strong> (root-level).
                                        <br />
                                        <strong>Ground Truth Generator</strong> and <strong>Playwright Compass</strong> are integrated as in-platform product modules and do not yet publish separate public API groups.
                                    </Typography>

                                    {/* --- Agent Eval Endpoints --- */}
                                    <Typography variant="h6" fontWeight={800} sx={{ mt: 2, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Brain size={18} /> Agent Eval Endpoints
                                        <Chip label="/agent-eval" size="small" sx={{ ml: 1, fontFamily: 'monospace', fontSize: '0.7rem' }} />
                                    </Typography>
                                    <EndpointTable rows={[
                                        { method: 'POST', path: '/apps/register', desc: 'Register a new application and receive an API key', auth: 'None' },
                                        { method: 'POST', path: '/apps/login', desc: 'Username/password login and API key session bootstrap', auth: 'None' },
                                        { method: 'GET', path: '/apps/me', desc: 'Get current authenticated app info', auth: 'Required' },
                                        { method: 'POST', path: '/apps/{id}/rotate-key', desc: 'Rotate API key (invalidates old key immediately)', auth: 'Required' },
                                        { method: 'DELETE', path: '/apps/{id}', desc: 'Deactivate your application', auth: 'Required' },
                                        { method: 'POST', path: '/convert-json', desc: 'Convert/normalize JSON data for evaluation', auth: 'Required' },
                                        { method: 'POST', path: '/evaluate-from-json', desc: 'Run evaluation on JSON ground truth + AI outputs', auth: 'Required' },
                                        { method: 'POST', path: '/run-batch', desc: 'Run batch evaluation from test requests', auth: 'Required' },
                                        { method: 'POST', path: '/evaluate-from-paths', desc: 'Run evaluation from local file paths', auth: 'Required' },
                                        { method: 'GET', path: '/latest-result', desc: 'Get most recent evaluation result', auth: 'Required' },
                                        { method: 'GET', path: '/history', desc: 'List all evaluation runs for your app', auth: 'Required' },
                                        { method: 'GET', path: '/events?token={key}', desc: 'SSE stream for real-time progress', auth: 'Token (query)' },
                                        { method: 'POST', path: '/feedback', desc: 'Submit feedback (1-5 rating)', auth: 'Optional' },
                                        { method: 'GET', path: '/feedback', desc: 'List all feedback entries', auth: 'None' },
                                        { method: 'GET', path: '/prompts', desc: 'List all LLM prompts', auth: 'None' },
                                    ]} />

                                    {/* --- RAG Eval Endpoints --- */}
                                    <Typography variant="h6" fontWeight={800} sx={{ mt: 4, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Activity size={18} /> RAG Eval Endpoints
                                        <Chip label="/ (root)" size="small" sx={{ ml: 1, fontFamily: 'monospace', fontSize: '0.7rem' }} />
                                    </Typography>
                                    <EndpointTable rows={[
                                        { method: 'GET', path: '/health', desc: 'Service and database health check', auth: 'None' },
                                        { method: 'POST', path: '/evaluate-excel', desc: 'Upload Excel file and run RAG evaluation across bots', auth: 'Required' },
                                        { method: 'POST', path: '/evaluate', desc: 'Run RAG evaluation from JSON test cases', auth: 'Required' },
                                        { method: 'POST', path: '/recommendation', desc: 'Generate remediation recommendation from metric gaps', auth: 'Required' },
                                        { method: 'GET', path: '/latest', desc: 'Get the most recent RAG evaluation result', auth: 'Required' },
                                        { method: 'GET', path: '/evaluations', desc: 'List all RAG evaluation summaries', auth: 'Required' },
                                        { method: 'GET', path: '/evaluations/{id}', desc: 'Get full RAG evaluation by ID', auth: 'Required' },
                                        { method: 'GET', path: '/rag/prompts', desc: 'Get source-aligned prompt templates', auth: 'Required' },
                                        { method: 'DELETE', path: '/cache/cleanup', desc: 'Clean up metric cache older than 30 days', auth: 'Required' },
                                    ]} />

                                    {/* --- Agent Eval Examples --- */}
                                    <Typography variant="h6" fontWeight={800} sx={{ mt: 5, mb: 2 }}>
                                        Agent Eval — Usage Examples
                                    </Typography>
                                    <Stack spacing={3}>
                                        <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                                            <Typography variant="subtitle1" fontWeight={800} gutterBottom>JSON Evaluation Request</Typography>
                                            <Typography variant="body2" color="text.secondary" paragraph>
                                                Evaluate structured agent outputs against ground truth with per-field matching strategies.
                                            </Typography>
                                            <CodeBlock>{`POST /agent-eval/evaluate-from-json
X-API-Key: nxe_abc123...
Content-Type: application/json

{
  "ground_truth": [
    {
      "query_id": "q1",
      "expected_output": {
        "customer_name": "John Doe",
        "account_balance": 15000.50,
        "status": "Active",
        "notes": "Premium customer since 2019"
      }
    }
  ],
  "ai_outputs": [
    {
      "query_id": "q1",
      "actual_output": {
        "customer_name": "John Doe",
        "account_balance": 15000.50,
        "status": "active",
        "notes": "High-value customer, member since 2019"
      }
    }
  ],
  "field_strategies": {
    "customer_name": "EXACT",
    "account_balance": "EXACT",
    "status": "FUZZY",
    "notes": "SEMANTIC"
  },
  "semantic_threshold": 0.72,
  "fuzzy_threshold": 0.75,
  "enable_safety": true,
  "llm_model_name": "gpt-4o"
}`}</CodeBlock>
                                        </Paper>

                                        <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                                            <Typography variant="subtitle1" fontWeight={800} gutterBottom>Field Strategies</Typography>
                                            <Typography variant="body2" color="text.secondary" paragraph>
                                                Control how each field is compared.
                                            </Typography>
                                            <TableContainer sx={{ overflowX: 'auto' }}>
                                                <Table size="small">
                                                    <TableHead sx={{ bgcolor: (t) => alpha(t.palette.primary.main, 0.05) }}>
                                                        <TableRow>
                                                            <TableCell sx={{ fontWeight: 800 }}>Strategy</TableCell>
                                                            <TableCell sx={{ fontWeight: 800 }}>Behavior</TableCell>
                                                            <TableCell sx={{ fontWeight: 800 }}>Score</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        <TableRow><TableCell><Chip label="EXACT" size="small" sx={{ fontWeight: 700, fontSize: '0.7rem' }} /></TableCell><TableCell sx={{ fontSize: '0.8rem' }}>Case-insensitive string/number equality</TableCell><TableCell sx={{ fontSize: '0.8rem' }}>1 (match) or 0</TableCell></TableRow>
                                                        <TableRow><TableCell><Chip label="FUZZY" size="small" sx={{ fontWeight: 700, fontSize: '0.7rem' }} /></TableCell><TableCell sx={{ fontSize: '0.8rem' }}>LLM-based fuzzy match (abbreviations, typos)</TableCell><TableCell sx={{ fontSize: '0.8rem' }}>1 if score ≥ threshold, else 0</TableCell></TableRow>
                                                        <TableRow><TableCell><Chip label="SEMANTIC" size="small" sx={{ fontWeight: 700, fontSize: '0.7rem' }} /></TableCell><TableCell sx={{ fontSize: '0.8rem' }}>LLM-based meaning comparison</TableCell><TableCell sx={{ fontSize: '0.8rem' }}>1 if score ≥ threshold, else 0</TableCell></TableRow>
                                                        <TableRow><TableCell><Chip label="IGNORE" size="small" sx={{ fontWeight: 700, fontSize: '0.7rem' }} /></TableCell><TableCell sx={{ fontSize: '0.8rem' }}>Skip field entirely (not scored)</TableCell><TableCell sx={{ fontSize: '0.8rem' }}>N/A</TableCell></TableRow>
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        </Paper>

                                        <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                                            <Typography variant="subtitle1" fontWeight={800} gutterBottom>Agent Eval — Python Example</Typography>
                                            <CodeBlock>{`import requests

NEXUS_URL = "https://your-server/agent-eval"
API_KEY = "nxe_abc123..."
headers = {"X-API-Key": API_KEY, "Content-Type": "application/json"}

# Run evaluation
result = requests.post(f"{NEXUS_URL}/evaluate-from-json", json={
    "ground_truth": ground_truth_list,
    "ai_outputs": ai_output_list,
    "field_strategies": {
        "customer_name": "EXACT",
        "summary": "SEMANTIC",
        "amount": "EXACT",
        "notes": "IGNORE"
    },
    "semantic_threshold": 0.72,
    "enable_safety": True
}, headers=headers).json()

# Check results
print(f"RQS: {result['aggregate']['rqs']:.2f}")
print(f"Accuracy: {result['aggregate']['accuracy']:.2f}")
print(f"Completeness: {result['aggregate']['completeness']:.2f}")
print(f"Hallucination: {result['aggregate']['hallucination']:.2f}")

# Fetch run history
history = requests.get(f"{NEXUS_URL}/history", headers=headers).json()
print(f"Total runs: {len(history)}")`}</CodeBlock>
                                        </Paper>
                                    </Stack>

                                    {/* --- RAG Eval Examples --- */}
                                    <Typography variant="h6" fontWeight={800} sx={{ mt: 5, mb: 2 }}>
                                        RAG Eval — Usage Examples
                                    </Typography>
                                    <Stack spacing={3}>
                                        <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                                            <Typography variant="subtitle1" fontWeight={800} gutterBottom>Excel Upload Evaluation</Typography>
                                            <Typography variant="body2" color="text.secondary" paragraph>
                                                Upload an Excel file with columns: Query, Ground_Truth, Bot_A, Bot_B, Context_A, Context_B, etc.
                                                The system auto-detects bot columns and evaluates each against ground truth.
                                            </Typography>
                                            <CodeBlock>{`POST /evaluate-excel
X-API-Key: nxe_abc123...
Content-Type: multipart/form-data

# Form fields:
#   file:        Excel file (.xlsx)
#   model:       "gpt-4o" (judge model)
#   alpha:       0.4 (Answer Correctness weight)
#   beta:        0.3 (Faithfulness weight)
#   gamma:       0.3 (Relevancy weight)
#   max_rows:    200 (safety limit)
#   temperature: 0.0
#   faithfulness_enabled: true
#   answer_relevancy_enabled: true
#   answer_correctness_enabled: true
#   context_recall_enabled: true
#   context_precision_enabled: true
#   toxicity_enabled: true
#   faithfulness_threshold: 0.8
#   answer_relevancy_threshold: 0.8
#   answer_correctness_threshold: 0.8
#   context_recall_threshold: 0.75
#   context_precision_threshold: 0.75
#   rqs_threshold: 0.75

# Excel format:
# | Query          | Ground_Truth     | Bot_A         | Bot_B         | Context_A    | Context_B    |
# |----------------|------------------|---------------|---------------|--------------|--------------|
# | What is X?     | X is defined as..| X means...    | X refers to...| Source doc...| Source doc...|`}</CodeBlock>
                                        </Paper>

                                        <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                                            <Typography variant="subtitle1" fontWeight={800} gutterBottom>JSON Evaluation Request</Typography>
                                            <Typography variant="body2" color="text.secondary" paragraph>
                                                Evaluate RAG pipelines programmatically with JSON test cases.
                                            </Typography>
                                            <CodeBlock>{`POST /evaluate
X-API-Key: nxe_abc123...
Content-Type: application/json

{
  "name": "Q3 RAG Benchmark",
  "dataset": [
    {
      "query": "What was Q3 revenue?",
      "bot_responses": {
        "Bot A": "Q3 revenue was $50M, up 12% YoY.",
        "Bot B": "Revenue in the third quarter reached fifty million."
      },
      "bot_contexts": {
        "Bot A": ["Q3 financial report: Revenue $50M..."],
        "Bot B": ["Annual report excerpt: Q3 revenue..."]
      },
      "ground_truth": "Q3 revenue was $50 million."
    }
  ],
  "alpha": 0.4,
  "beta": 0.3,
  "gamma": 0.3,
  "temperature": 0.0
}

# Response includes per-bot metrics:
# - faithfulness, answer_relevancy
# - context_precision, context_recall
# - answer_correctness, rqs
# - leaderboard with winner`}</CodeBlock>
                                        </Paper>

                                        <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                                            <Typography variant="subtitle1" fontWeight={800} gutterBottom>RAG Eval — Python Example</Typography>
                                            <CodeBlock>{`import requests

NEXUS_URL = "https://your-server"
API_KEY = "nxe_abc123..."
headers = {"X-API-Key": API_KEY}

# Option 1: Upload Excel file
with open("rag_test_data.xlsx", "rb") as f:
    result = requests.post(f"{NEXUS_URL}/evaluate-excel", files={
        "file": ("rag_test_data.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    }, data={
        "model": "gpt-4o",
        "alpha": 0.4,
        "beta": 0.3,
        "gamma": 0.3,
        "max_rows": 200,
        "temperature": 0.0,
        "safety": "true"
    }, headers=headers).json()

print(f"Winner: {result['winner']}")
for bot, summary in result['summaries'].items():
    print(f"  {bot}: RQS={summary['rqs']:.3f}")

# Option 2: JSON test cases
result = requests.post(f"{NEXUS_URL}/evaluate", json={
    "name": "Pipeline Comparison",
    "dataset": test_cases,
    "alpha": 0.4,
    "beta": 0.3,
    "gamma": 0.3
}, headers={**headers, "Content-Type": "application/json"}).json()

# Fetch history
evaluations = requests.get(
    f"{NEXUS_URL}/evaluations", headers=headers
).json()
print(f"Total RAG evaluations: {len(evaluations)}")

# Get specific evaluation
eval_detail = requests.get(
    f"{NEXUS_URL}/evaluations/{evaluations[0]['id']}",
    headers=headers
).json()`}</CodeBlock>
                                        </Paper>

                                        <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                                            <Typography variant="subtitle1" fontWeight={800} gutterBottom>cURL Examples — Both Platforms</Typography>
                                            <CodeBlock>{`# ──── Registration & Auth ────
# Register your application (one-time)
curl -X POST https://your-server/agent-eval/apps/register \\
  -H "Content-Type: application/json" \\
  -d '{"app_name": "My App", "owner_email": "me@co.com"}'

# ──── Agent Eval ────
# Run Agent evaluation
curl -X POST https://your-server/agent-eval/evaluate-from-json \\
  -H "X-API-Key: nxe_abc123..." \\
  -H "Content-Type: application/json" \\
  -d @agent_eval_payload.json

# Get Agent evaluation history
curl https://your-server/agent-eval/history \\
  -H "X-API-Key: nxe_abc123..."

# Get latest Agent result
curl https://your-server/agent-eval/latest-result \\
  -H "X-API-Key: nxe_abc123..."

# ──── RAG Eval ────
# Upload Excel for RAG evaluation
curl -X POST https://your-server/evaluate-excel \\
  -H "X-API-Key: nxe_abc123..." \\
  -F "file=@rag_dataset.xlsx" \\
  -F "model=gpt-4o" \\
  -F "alpha=0.4" -F "beta=0.3" -F "gamma=0.3"

# Run RAG evaluation from JSON
curl -X POST https://your-server/evaluate \\
  -H "X-API-Key: nxe_abc123..." \\
  -H "Content-Type: application/json" \\
  -d @rag_eval_payload.json

# Get RAG evaluation history
curl https://your-server/evaluations \\
  -H "X-API-Key: nxe_abc123..."

# Get specific RAG evaluation
curl https://your-server/evaluations/{eval_id} \\
  -H "X-API-Key: nxe_abc123..."

# ──── Key Management ────
# Rotate key (invalidates current key)
curl -X POST https://your-server/agent-eval/apps/my-app/rotate-key \\
  -H "X-API-Key: nxe_current_key..."`}</CodeBlock>
                                        </Paper>
                                    </Stack>
                                </Box>

                                {/* 11. Contact Support */}
                                <Box id="our-team" sx={{ scrollMarginTop: '80px' }}>
                                    <SectionHeader icon={<Users size={24} />} title="Our Team" />
                                    <Typography variant="body1" paragraph color="text.secondary" sx={{ maxWidth: 780 }}>
                                        Meet the Qualaris product and engineering team. The following profiles are placeholders for final production identities.
                                    </Typography>
                                    <Grid container spacing={2.5}>
                                        {[
                                            { name: 'Aarav Sharma', role: 'Product Lead', photo: '/team/member-01.jpg' },
                                            { name: 'Isha Verma', role: 'Engineering Manager', photo: '/team/member-02.jpg' },
                                            { name: 'Rohan Mehta', role: 'Frontend Engineer', photo: '/team/member-03.jpg' },
                                            { name: 'Neha Kapoor', role: 'Backend Engineer', photo: '/team/member-04.jpg' },
                                            { name: 'Kabir Singh', role: 'AI/ML Engineer', photo: '/team/member-05.jpg' },
                                            { name: 'Maya Rao', role: 'QA Automation Engineer', photo: '/team/member-06.jpg' },
                                            { name: 'Arjun Patel', role: 'Data Engineer', photo: '/team/member-07.jpg' },
                                            { name: 'Sara Khan', role: 'UX Designer', photo: '/team/member-08.jpg' },
                                        ].map((member) => (
                                            <Grid key={member.name} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                                                <Paper
                                                    sx={{
                                                        p: 2.5,
                                                        borderRadius: 3,
                                                        border: '1px solid',
                                                        borderColor: 'divider',
                                                        bgcolor: 'background.paper',
                                                        height: '100%',
                                                        transition: 'all 0.2s ease',
                                                        '&:hover': {
                                                            borderColor: 'primary.main',
                                                            transform: 'translateY(-2px)',
                                                            boxShadow: (t) => `0 8px 18px ${alpha(t.palette.primary.main, 0.12)}`,
                                                        },
                                                    }}
                                                >
                                                    <Stack spacing={1.4} alignItems="center" textAlign="center">
                                                        <Avatar
                                                            src={member.photo}
                                                            alt={member.name}
                                                            sx={{
                                                                width: 72,
                                                                height: 72,
                                                                border: '1px solid',
                                                                borderColor: (t) => alpha(t.palette.primary.main, 0.3),
                                                            }}
                                                        />
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                                            {member.name}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                                            {member.role}
                                                        </Typography>
                                                    </Stack>
                                                </Paper>
                                            </Grid>
                                        ))}
                                    </Grid>
                                </Box>

                                <Box id="contact-support" sx={{ scrollMarginTop: '80px' }}>
                                    <SectionHeader icon={<Mail size={24} />} title="Technical Ownership" />
                                    <Paper sx={{ p: 4, borderRadius: 4, bgcolor: (t) => alpha(t.palette.primary.main, 0.04), border: '1px solid', borderColor: (t) => alpha(t.palette.primary.main, 0.2) }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                            <Avatar src="/Aniket.jpeg" sx={{ width: 80, height: 80, border: '2px solid', borderColor: 'primary.main' }} />
                                            <Box>
                                                <Typography variant="h5" fontWeight={900}>Aniket Marwadi</Typography>
                                                <Typography variant="body2" color="text.secondary" gutterBottom>UBS | Digital Strategy Architect</Typography>
                                                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
                                                    <Mail size={16} /> aniket.marwadi@ubs.com
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Paper>
                                </Box>

                            </Stack>
                        </Grid>
                    </Grid>
                </Container>
            </Box>
    );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode, title: string }) {
    const th = useTheme();
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(th.palette.primary.main, 0.1), color: 'primary.main' }}>
                {icon}
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: '-0.02em' }}>{title}</Typography>
        </Box>
    );
}

function DocCard({ title, icon, content }: { title: string, icon: React.ReactNode, content: string }) {
    return (
        <Paper sx={{ p: 3, borderRadius: 4, height: '100%', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', transition: 'all 0.2s', '&:hover': { borderColor: 'primary.main', transform: 'translateY(-2px)' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box sx={{ color: 'primary.main' }}>{icon}</Box>
                <Typography variant="subtitle1" fontWeight={800}>{title}</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>{content}</Typography>
        </Paper>
    );
}

function MetricDetail({ title, description, formula, example }: { title: string, description: string, formula?: string, example?: string }) {
    return (
        <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Typography variant="h6" fontWeight={800} gutterBottom>{title}</Typography>
            <Typography variant="body2" color="text.secondary" paragraph>{description}</Typography>
            {formula && (
                <Box sx={{ p: 2, bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderRadius: 2, mb: 2, borderLeft: '3px solid', borderColor: 'primary.main' }}>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{formula}</Typography>
                </Box>
            )}
            {example && (
                <Typography variant="caption" sx={{ fontStyle: 'italic', opacity: 0.7 }}>
                    <strong>Example:</strong> {example}
                </Typography>
            )}
        </Paper>
    );
}

function StepItem({ step, title, desc }: { step: string, title: string, desc: string }) {
    return (
        <Box sx={{ display: 'flex', gap: 2 }}>
            <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 900, opacity: 0.5 }}>{step}.</Typography>
            <Box>
                <Typography variant="body2" fontWeight={700}>{title}</Typography>
                <Typography variant="caption" color="text.secondary">{desc}</Typography>
            </Box>
        </Box>
    );
}

function EndpointTable({ rows }: { rows: { method: string; path: string; desc: string; auth: string }[] }) {
    return (
        <TableContainer component={Paper} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', mb: 2, overflowX: 'auto' }}>
            <Table size="small">
                <TableHead sx={{ bgcolor: (t) => alpha(t.palette.primary.main, 0.05) }}>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 800, width: '8%' }}>Method</TableCell>
                        <TableCell sx={{ fontWeight: 800, width: '30%' }}>Endpoint</TableCell>
                        <TableCell sx={{ fontWeight: 800, width: '47%' }}>Description</TableCell>
                        <TableCell sx={{ fontWeight: 800, width: '15%' }}>Auth</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((row) => (
                        <TableRow key={row.method + row.path}>
                            <TableCell>
                                <Chip label={row.method} size="small" sx={{
                                    fontWeight: 700, fontSize: '0.7rem',
                                    bgcolor: (t) => row.method === 'DELETE'
                                        ? alpha(t.palette.error.main, 0.12)
                                        : alpha(t.palette.primary.main, 0.12),
                                    color: (t) => row.method === 'DELETE' ? t.palette.error.main : t.palette.primary.main,
                                }} />
                            </TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600 }}>{row.path}</TableCell>
                            <TableCell sx={{ fontSize: '0.8rem' }}>{row.desc}</TableCell>
                            <TableCell>
                                <Chip label={row.auth} size="small" variant="outlined" sx={{
                                    fontSize: '0.65rem',
                                    borderColor: row.auth === 'None' ? 'text.disabled' : 'primary.main',
                                    color: row.auth === 'None' ? 'text.disabled' : 'primary.main',
                                }} />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

function CodeBlock({ children }: { children: string }) {
    const theme = useTheme();
    const [copied, setCopied] = React.useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(children);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Box sx={{ position: 'relative' }}>
            <Box
                component="pre"
                sx={{
                    p: 2.5,
                    borderRadius: 2,
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                    border: '1px solid',
                    borderColor: 'divider',
                    overflow: 'auto',
                    fontFamily: '"SF Mono", "Fira Code", "Fira Mono", Menlo, Consolas, monospace',
                    fontSize: '0.78rem',
                    lineHeight: 1.7,
                    m: 0,
                    whiteSpace: 'pre',
                    color: 'text.primary',
                }}
            >
                {children}
            </Box>
            <IconButton
                size="small"
                onClick={handleCopy}
                sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    '&:hover': { bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' },
                }}
            >
                {copied ? <CheckCircle2 size={14} color={theme.palette.success.main} /> : <Copy size={14} />}
            </IconButton>
        </Box>
    );
}
