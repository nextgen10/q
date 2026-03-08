"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  CssBaseline,
  CircularProgress,
  Backdrop,
  Avatar,
  Card,
  CardContent,
  Stack,
  Tooltip,
  alpha,
  Switch,
  FormControlLabel,
  Slider,
  useTheme,
  Alert,
  lighten,
  darken,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  LayoutDashboard,
  History,
  Layers,
  Settings,
  UploadCloud,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  Activity,
  ChevronRight,
  Search,
  Filter,
  ArrowUpRight,
  Zap,
  Cpu,
  ShieldCheck,
  AlignLeft,
  Compass,

  Save,
  Users,
  Target,
  Lock,
  Thermometer,
  FileJson,
  Shield,
  Eye,
  Settings2,
  FileSpreadsheet,
  Download,
  FileText,
  Wrench,
  Info,
  Mail,
  Sun,
  Moon
} from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { RAG_API_BASE_URL } from '../utils/config';
import { authFetch } from '@/features/agent-eval/utils/authFetch';
import UBSSnackbar from '@/components/UBSSnackbar';

// --- Helper Components ---
import { MetricCard } from '@/components/shared/MetricCard';
import { ChartContainer } from '@/components/shared/ChartContainer';

import { PrintOnlyReport } from '@/components/Reports/PrintOnlyReport';
import { PaginationControl } from '@/components/Common/PaginationControl';
import { nexusTheme } from '@/theme';
import { UbsLogo } from '@/components/UbsLogo';

const theme = nexusTheme;


// --- Components ---
const MotionBox = motion(Box);
const MotionPaper = motion(Paper);



// --- Main Pages ---


// --- Metric Explanation Component ---
function MetricExplanationCard({ title, description, details, example, color, icon }: any) {
  const theme = useTheme();
  return (
    <Paper sx={{
      minHeight: 200,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      maxWidth: '96%',
      mx: 'auto',
      p: 3,
      borderRadius: 3,
      bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
      border: (theme) => `1px solid ${theme.palette.divider}`,
      transition: 'all 0.3s ease',
      '&:hover': {
        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
        borderColor: alpha(color, 0.4),
        transform: 'translateY(-2px)',
        boxShadow: `0 10px 40px -10px ${alpha(color, 0.2)}`
      }
    }}>
      <Box sx={{ display: 'flex', gap: 3 }}>
        <Box sx={{
          p: 1.5,
          borderRadius: 2,
          bgcolor: alpha(color, 0.1),
          color: color,
          height: 'fit-content',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {icon}
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, color: 'text.primary' }}>{title}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6, fontSize: '0.9rem' }}>
            {description}
          </Typography>
          <Box sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
            borderLeft: `3px solid ${color}`
          }}>
            <Typography variant="caption" sx={{ color: color, fontWeight: 900, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>Architectural Note</Typography>
            <Typography variant="body2" sx={{ fontSize: '0.8rem', opacity: 0.8, fontStyle: 'italic' }}>
              {details}
            </Typography>
          </Box>
          {example && (
            <Box sx={{
              mt: 2,
              p: 2,
              borderRadius: 2,
              bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
              border: (theme) => `1px dashed ${theme.palette.divider}`
            }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase', display: 'block', mb: 1 }}>Real-World Application Example</Typography>
              <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.5 }}>
                {example}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Paper >
  );
}

function EnterpriseDashboardContent() {
  const [config, setConfig] = useState({
    judgeModel: 'gpt-4o',
    alpha: 0.4,
    beta: 0.3,
    gamma: 0.3,
    concurrency: 5,
    strictness: 0.7,
    enableSafety: true,
    temperature: 0.0,
    exportFormat: 'PDF',
    expertMode: false,
    maxRows: 200
  });
  const [isExporting, setIsExporting] = useState(false);
  const router = useRouter();
  const [activeView, setActiveView] = useState(() => {
    // Initialize from URL if available
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const viewFromUrl = params.get('view');
      if (viewFromUrl && ['insights', 'drilldown', 'history', 'about', 'config'].includes(viewFromUrl)) {
        return viewFromUrl;
      }
    }
    return 'insights';
  });
  // Callback for SearchParamsHandler to update activeView
  const handleViewChangeFromUrl = useCallback((view: string) => {
    setActiveView(view);
  }, []);

  // Update URL when activeView changes
  const handleViewChange = (view: string) => {
    setActiveView(view);
    router.push(`/rag-eval?view=${view}`, { scroll: false });
  };

  const theme = nexusTheme;

  const [data, setData] = useState<any>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [statusLogs, setStatusLogs] = useState<string[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false); // Used for generic notifications
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEvaluating && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [statusLogs, isEvaluating]);

  // Pagination State
  const [historyPage, setHistoryPage] = useState(1);
  const [drilldownPage, setDrilldownPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Search State
  const [historySearch, setHistorySearch] = useState('');
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [showComparisonResults, setShowComparisonResults] = useState(false);
  const [compareEval1, setCompareEval1] = useState('');
  const [compareEval2, setCompareEval2] = useState('');
  const [drilldownSearch, setDrilldownSearch] = useState('');

  useEffect(() => {
    if (activeView === 'history') {
      setIsLoadingHistory(true);
      authFetch(`${RAG_API_BASE_URL}/evaluations`)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (Array.isArray(data)) setHistory(data);
          setIsLoadingHistory(false);
        })
        .catch(err => {
          console.error("Failed to fetch history", err);
          setIsLoadingHistory(false);
        });
    }
  }, [activeView]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [latestRes, historyRes] = await Promise.all([
          authFetch(`${RAG_API_BASE_URL}/latest`),
          authFetch(`${RAG_API_BASE_URL}/evaluations`)
        ]);

        if (latestRes.ok) {
          const latest = await latestRes.json();
          setData(latest);
        }
        if (historyRes.ok) {
          const hist = await historyRes.json();
          setHistory(hist);
        }
      } catch (e) {
        console.error("Connectivity issue with backend engine.");
      }
    };
    fetchData();
  }, []);

  const filteredHistory = useMemo(() => {
    if (!historySearch) return history;
    const s = historySearch.toLowerCase();
    return history.filter(run =>
      run.name?.toLowerCase().includes(s) ||
      run.id?.toLowerCase().includes(s) ||
      run.winner?.toLowerCase().includes(s)
    );
  }, [history, historySearch]);

  const handleLoadReport = async (runId: string) => {
    setIsLoadingReport(true);
    try {
      const res = await authFetch(`${RAG_API_BASE_URL}/evaluations/${runId}`);
      if (res.ok) {
        const fullData = await res.json();
        setData(fullData);
        setDrilldownPage(1);
        handleViewChange('insights');
      } else {
        setSnackbarMsg('Failed to load report details.');
        setSaveSuccess(true);
      }
    } catch (error) {
      console.error("Error loading report:", error);
      setSnackbarMsg('Error connecting to server.');
      setSaveSuccess(true);
    } finally {
      setIsLoadingReport(false);
    }
  };

  const filteredTestCases = useMemo(() => {
    if (!data?.test_cases) return [];
    if (!drilldownSearch) return data.test_cases;
    const s = drilldownSearch.toLowerCase();
    return data.test_cases.filter((tc: any) =>
      tc.query?.toLowerCase().includes(s) ||
      tc.ground_truth?.toLowerCase().includes(s) ||
      tc.id?.toString().toLowerCase().includes(s)
    );
  }, [data, drilldownSearch]);

  const handleExport = async () => {
    if (!data) return;
    setIsExporting(true);
    setStatusLogs(prev => [...prev, `Initiating ${config.exportFormat} report generation...`]);

    // Simulate report collation
    await new Promise(resolve => setTimeout(resolve, 1500));
    setStatusLogs(prev => [...prev, `Collating metrics for ${leaderboardData.length} agents...`]);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const timestamp = new Date().toLocaleString('en-GB', { hour12: false }).replace(/[/, :]/g, '_');
    const fileName = `RAGEval_Report_${timestamp}`;

    if (config.exportFormat === 'JSON') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.json`;
      link.click();
    } else if (config.exportFormat === 'Excel') {
      const s = (v: any) => {
        const n = parseFloat(v);
        return isNaN(n) ? 0 : n;
      };

      // 0. Production Intelligence Sheet (Top Insights)
      const insightHeaders = ['METRIC', 'VALUE', 'CONTEXT'];
      const winner = leaderboardData[0] || {};
      const insightRows = [
        ['TOP_ARCHITECT', winner.id, `MASTER_RQS: ${s(winner.avg_rqs).toFixed(3)}`],
        ['MAX_ANSWER_CORRECTNESS', `${(s(winner.gt_alignment) * 100).toFixed(1)}%`, 'Ground Truth Match'],
        ['TOP_FAITHFULNESS', `${(s(winner.avg_faithfulness) * 100).toFixed(1)}%`, 'Logical Integrity'],
        ['CONTEXT_PRECISION', `${(s(winner.avg_context_precision) * 100).toFixed(1)}%`, 'Information S/N'],
        ['RETRIEVAL_COVERAGE', `${(s(winner.retrieval_success) * 100).toFixed(1)}%`, 'Knowledge Recall'],
        ['HALLUCINATION_RATE', `${((1 - s(winner.avg_faithfulness)) * 100).toFixed(1)}%`, 'Safety Risk'],
        ['TOTAL_TEST_CASES', data.test_cases.length, 'Evaluation Volume']
      ];

      // 1. Summary Sheet (Flattened)
      const summaryHeaders = ['RANK', 'BOT_ID', 'MASTER_RQS', 'ANSWER_CORRECTNESS', 'FAITHFULNESS', 'RELEVANCY', 'CONTEXT_PRECISION', 'RETRIEVAL_SUCCESS'];
      const summaryRows = leaderboardData.map(row => {
        const s = (v: any) => {
          const n = parseFloat(v);
          return isNaN(n) ? 0 : n;
        };
        return [
          row.rank,
          row.id,
          s(row.avg_rqs).toFixed(3),
          (s(row.gt_alignment) * 100).toFixed(1),
          (s(row.avg_faithfulness) * 100).toFixed(1),
          (s(row.avg_relevancy) * 100).toFixed(1),
          (s(row.avg_context_precision) * 100).toFixed(1),
          (s(row.retrieval_success) * 100).toFixed(1)
        ];
      });

      // 2. Detailed Metrics Sheet (Flattened for analysis)
      const detailHeaders = ['TEST_CASE_ID', 'QUERY', 'GROUND_TRUTH', 'BOT_ID', 'RESPONSE', 'FAITHFULNESS', 'RELEVANCY', 'CONTEXT_PRECISION', 'CONTEXT_RECALL', 'ANSWER_CORRECTNESS', 'RQS'];
      const detailRows: any[] = [];

      (data.test_cases || []).forEach((tc: any) => {
        Object.keys(data.summaries || {}).forEach(botId => {
          const m = data.bot_metrics?.[botId]?.[tc.id] || {};
          const response = (tc.bot_responses?.[botId] || "").replace(/"/g, '""');
          const gt = (tc.ground_truth || "").replace(/"/g, '""');
          const s = (v: any) => {
            const n = parseFloat(v);
            return isNaN(n) ? 0 : n;
          };
          detailRows.push([
            tc.id,
            `"${(tc.query || "").replace(/"/g, '""')}"`,
            `"${gt}"`,
            botId,
            `"${response}"`,
            s(m.faithfulness).toFixed(3),
            s(m.answer_relevancy).toFixed(3),
            s(m.context_precision).toFixed(3),
            s(m.context_recall).toFixed(3),
            s(m.semantic_similarity).toFixed(3),
            s(m.rqs).toFixed(3)
          ]);
        });
      });

      const csvContent =
        "--- PRODUCTION INTELLIGENCE (TOP INSIGHTS) ---\n" +
        insightHeaders.join(",") + "\n" +
        insightRows.map(e => e.join(",")).join("\n") +
        "\n\n--- COMPARISON LEADERBOARD (SUMMARY) ---\n" +
        summaryHeaders.join(",") + "\n" +
        summaryRows.map(e => e.join(",")).join("\n") +
        "\n\n--- DETAILED TRANSACTIONAL METRICS ---\n" +
        detailHeaders.join(",") + "\n" +
        detailRows.map(e => e.join(",")).join("\n");

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.csv`;
      link.click();
    } else if (config.exportFormat === 'PDF') {
      const originalTitle = document.title;
      document.title = fileName;
      window.print();
      document.title = originalTitle;
    }

    setIsExporting(false);
    setSnackbarMsg(`${config.exportFormat} Report successfully generated.`);
    setSaveSuccess(true);
  };



  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so the same file can be uploaded again without refresh
    e.target.value = '';

    setIsEvaluating(true);
    setStatusLogs([
      `⚡ [ENGINE] Initializing Parallel Inference Pipeline...`,
      `📁 [FS] Mounting dataset: ${file.name}`,
      `JUDGE [GPT-4o] Active. Warming up reasoning tokens...`
    ]);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("model", config.judgeModel);
    formData.append("alpha", config.alpha.toString());
    formData.append("beta", config.beta.toString());
    formData.append("gamma", config.gamma.toString());
    formData.append("concurrency", config.concurrency.toString());
    formData.append("strictness", config.strictness.toString());
    formData.append("temperature", config.temperature.toString());
    formData.append("safety", config.enableSafety.toString());
    formData.append("max_rows", config.maxRows.toString());

    let animInterval: ReturnType<typeof setInterval> | null = null;
    try {
      const messages = [
        `[GPU] Computing semantic embedding vectors...`,
        `[JUDGE] Cross-referencing latent space alignment...`,
        `[IO] Writing evaluation metrics to local buffer...`,
        `[SYSTEM] Optimization pass ${Math.floor(Math.random() * 5)} active...`,
        `[RAG] Recalculating Context Precision for Bot B...`,
        `[AUTH] Synchronizing cloud inference tokens...`
      ];

      animInterval = setInterval(() => {
        const msg = messages[Math.floor(Math.random() * messages.length)];
        setStatusLogs(prev => [...prev, msg]);
      }, 1500);

      const response = await authFetch(`${RAG_API_BASE_URL}/evaluate-excel`, {
        method: "POST",
        body: formData,
      });

      clearInterval(animInterval!);
      if (!response.ok) {
        const errDetail = await response.json().catch(() => ({ detail: "Backend Protocol Failure" }));
        throw new Error(errDetail.detail || "Evaluation Failed");
      }

      const sessionData = await response.json();
      setData(sessionData);
      setDrilldownPage(1);
      setStatusLogs(prev => [...prev, "✨ [SUCCESS] Full evaluation synchronized. Matrix data outputted to internal DB."]);

      // Refresh history to show the new evaluation
      authFetch(`${RAG_API_BASE_URL}/evaluations`)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(data => { if (Array.isArray(data)) setHistory(data); })
        .catch(err => console.error("Failed to refresh history", err));

      setTimeout(() => setIsEvaluating(false), 1200);

    } catch (err: any) {
      if (animInterval) clearInterval(animInterval);
      setStatusLogs(prev => [...prev, `[CRITICAL] pipeline failed: ${err.message}`]);
      setTimeout(() => setIsEvaluating(false), 3000);
    }
  };

  const leaderboardData = useMemo(() => {
    if (!data?.summaries) return [];
    return Object.keys(data.summaries).map(id => {
      const s = data.summaries[id];
      const safe = (v: any) => {
        const n = parseFloat(v);
        return isNaN(n) ? 0 : n;
      };
      return {
        id,
        ...s,
        avg_rqs: safe(s.avg_rqs),
        gt_alignment: safe(s.gt_alignment),
        avg_faithfulness: safe(s.avg_faithfulness),
        avg_relevancy: safe(s.avg_relevancy),
        avg_context_precision: safe(s.avg_context_precision),
        retrieval_success: safe(s.retrieval_success),
        rank: 0
      };
    }).sort((a, b) => b.avg_rqs - a.avg_rqs).map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [data]);

  const winner = leaderboardData.length > 0 ? leaderboardData[0] : null;

  const totalTokens = useMemo(() => {
    if (!data?.bot_metrics) return 0;
    let sum = 0;
    Object.values(data.bot_metrics).forEach((botMap: any) => {
      Object.values(botMap).forEach((m: any) => {
        sum += (m.total_tokens || 0);
      });
    });
    return sum;
  }, [data]);

  const chartData = useMemo(() => {
    if (!data?.summaries || leaderboardData.length === 0) return [];
    return leaderboardData.map(d => ({
      name: d.id,
      RQS: Number(((d.avg_rqs || 0) * 100).toFixed(1)),
      AnswerCorrectness: Number(((d.gt_alignment || 0) * 100).toFixed(1)),
      Faithfulness: Number(((d.avg_faithfulness || 0) * 100).toFixed(1)),
      Relevancy: Number(((d.avg_relevancy || 0) * 100).toFixed(1)),
      Precision: Number(((d.avg_context_precision || 0) * 100).toFixed(1)),
      Recall: Number(((d.retrieval_success || 0) * 100).toFixed(1))
    }));
  }, [leaderboardData, data]);

  const trends = useMemo(() => {
    // Early return if no winner or insufficient history
    if (!winner || !history || history.length < 1) return {};

    // Find the most recent run that isn't the current one
    const prevRun = history.find(h => h.id !== data?.id);
    if (!prevRun || !prevRun.summaries) return {};

    const prevWinnerId = prevRun.winner || Object.keys(prevRun.summaries)[0];
    const p = prevRun.summaries[prevWinnerId];
    if (!p) return {};

    const calc = (curr: number | undefined, prev: number | undefined) => {
      // Handle undefined, null, or zero values
      if (curr === undefined || prev === undefined || prev === 0) return null;
      const diff = ((curr - prev) / prev) * 100;
      return (diff >= 0 ? "+" : "") + diff.toFixed(1) + "%";
    };

    return {
      rqs: calc(winner.avg_rqs, p.avg_rqs),
      correctness: calc(winner.gt_alignment, p.gt_alignment),
      faithfulness: calc(winner.avg_faithfulness, p.avg_faithfulness),
      relevancy: calc(winner.avg_relevancy, p.avg_relevancy),
      precision: calc(winner.avg_context_precision, p.avg_context_precision),
      recall: calc(winner.retrieval_success, p.retrieval_success),
    };
  }, [history, data, winner]);

  if (!mounted) return null;

  return (
    <>
      <Suspense fallback={null}>
        <SearchParamsHandler onViewChange={handleViewChangeFromUrl} />
      </Suspense>
      <Box className="main-ui-container" sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden', bgcolor: 'background.default', color: 'text.primary' }}>

        {/* Main Content Area - matches landing page margins (px: 3 = 24px) */}
        <Box component="main" sx={{
          width: '100%',
          flexGrow: 1,
          px: { xs: 2, md: 3 },
          pb: 2,
          pt: 2,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxWidth: 1536,
          mx: 'auto',
        }}>

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, mb: 1 }}>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: '0.95rem', md: '1.1rem' }, letterSpacing: '-0.02em', mb: 0.5, color: 'text.primary' }}>
                {activeView === 'insights' ? 'Production Intelligence' :
                  activeView === 'history' ? 'Historical Evaluations' :
                    activeView === 'drilldown' ? 'Experiments' :
                      activeView === 'about' ? 'Methodology & Framework' : 'Configuration'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.85rem' } }}>
                {activeView === 'insights' ? `Multimodal evaluation across ${leaderboardData.length} active agent architectures.` :
                  activeView === 'history' ? 'Archive of past evaluation runs and performance benchmarks.' :
                    activeView === 'drilldown' ? 'Deep dive into specific model metrics and granular analysis.' :
                      activeView === 'about' ? 'Detailed breakdown of organizational RAG scoring benchmarks.' : 'System settings and preferences.'}
              </Typography>
            </Box>

            {activeView === 'insights' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip
                  label={`BATCH LOAD: ${data?.test_cases?.length || 0} QUESTIONS`}
                  sx={{
                    bgcolor: (t: any) => alpha(t.palette.primary.main, 0.08),
                    color: 'primary.main',
                    fontWeight: 800,
                    fontSize: '0.65rem',
                    border: (t: any) => `1px solid ${alpha(t.palette.primary.main, 0.3)}`,
                  }}
                />
              </Box>
            )}

            {activeView === 'history' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {filteredHistory.length > ITEMS_PER_PAGE && (
                  <PaginationControl
                    count={Math.ceil(filteredHistory.length / ITEMS_PER_PAGE)}
                    page={historyPage}
                    onChange={(_, v) => setHistoryPage(v)}
                    sx={{ m: 0, scale: '0.9' }}
                  />
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {historySearch && (
                    <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: 1 }}>
                      FOUND: {filteredHistory.length}
                    </Typography>
                  )}
                  <Box sx={{ position: 'relative', width: { xs: '100%', sm: 300 } }}>
                    <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8C96A5', width: 16, height: 16, zIndex: 1 }} />
                    <Box
                      component="input"
                      placeholder="Search history..."
                      value={historySearch}
                      onChange={(e: any) => { setHistorySearch(e.target.value); setHistoryPage(1); }}
                      sx={{
                        width: '100%',
                        bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.8)',
                        border: (t) => `1px solid ${t.palette.divider}`,
                        borderRadius: '10px',
                        padding: '10px 12px 10px 38px',
                        color: 'text.primary',
                        fontSize: '0.85rem',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        '&:focus': {
                          borderColor: 'primary.main',
                        },
                      }}
                    />
                  </Box>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setCompareDialogOpen(true)}
                  >
                    Compare
                  </Button>
                </Box>
              </Box>
            )}

            {activeView === 'drilldown' && data && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<UploadCloud size={16} />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Evaluate
                </Button>
                {filteredTestCases.length > ITEMS_PER_PAGE && (
                  <PaginationControl
                    count={Math.ceil(filteredTestCases.length / ITEMS_PER_PAGE)}
                    page={drilldownPage}
                    onChange={(_, v) => {
                      setDrilldownPage(v);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    sx={{ m: 0, scale: '0.9' }}
                  />
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {drilldownSearch && (
                    <Typography variant="caption" sx={{ color: 'secondary.main', fontWeight: 800, letterSpacing: 1 }}>
                      FILTERED: {filteredTestCases.length} / {data.test_cases.length}
                    </Typography>
                  )}
                  <Box sx={{ position: 'relative', width: { xs: '100%', sm: 350 } }}>
                    <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8C96A5', width: 16, height: 16, zIndex: 1 }} />
                    <Box
                      component="input"
                      placeholder="Search cases..."
                      value={drilldownSearch}
                      onChange={(e: any) => { setDrilldownSearch(e.target.value); setDrilldownPage(1); }}
                      sx={{
                        width: '100%',
                        bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.6)' : 'rgba(0, 0, 0, 0.02)',
                        border: (t) => `1px solid ${t.palette.divider}`,
                        borderRadius: '10px',
                        padding: '10px 12px 10px 38px',
                        color: 'text.primary',
                        fontSize: '0.85rem',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        '&:focus': {
                          borderColor: 'primary.main',
                        },
                      }}
                    />
                  </Box>
                  <Chip
                    label={`BATCH LOAD: ${data?.test_cases?.length || 0} QUESTIONS`}
                    sx={{
                      bgcolor: (t: any) => alpha(t.palette.primary.main, 0.08),
                      color: 'primary.main',
                      fontWeight: 800,
                      fontSize: '0.65rem',
                      border: (t: any) => `1px solid ${alpha(t.palette.primary.main, 0.3)}`,
                    }}
                  />
                </Box>
              </Box>
            )}

            {activeView === 'config' && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<Settings2 size={16} />}
                onClick={() => {
                  setSnackbarMsg('Neural Engine synchronized with new parameters.');
                  setSaveSuccess(true);
                }}
              >
                Apply Settings
              </Button>
            )}
          </Box>

          {/* Scrollable Content Area (Freeze Pan) */}
          <Box sx={{
            flexGrow: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            width: '100%',
            maxWidth: '100vw',
            maxHeight: 'none',
            pt: 0,
            pb: 0,
            pr: 1, // room for scrollbar
            '&::-webkit-scrollbar': { width: '8px' },
            '&::-webkit-scrollbar-track': { background: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.03)' },
            '&::-webkit-scrollbar-thumb': {
              background: alpha(theme.palette.primary.main, 0.2),
              borderRadius: '10px',
              border: 'none',
              backgroundClip: 'padding-box'
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: alpha(theme.palette.primary.main, 0.4),
              backgroundClip: 'padding-box'
            }
          }}>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                style={{ height: ['about', 'history', 'config'].includes(activeView) ? '100%' : 'auto' }}
              >
                <Box sx={{ height: ['about', 'history', 'config'].includes(activeView) ? '100%' : 'auto' }}>
                  {/* Dashboard View */}
                  {activeView === 'insights' && (
                    <Grid container spacing={1.5} columns={12}>
                      {/* Score Cards - Row 1 */}
                      <Grid size={{ xs: 6, sm: 6, md: 3 }}>
                        <MetricCard
                          label="Highest RQS"
                          value={winner?.id || '0'}
                          icon={<Trophy size={24} />}
                          subtitle={`Master Score: ${(winner?.avg_rqs || 0).toFixed(2)}`}
                          trend={trends.rqs}
                        />
                      </Grid>
                      <Grid size={{ xs: 6, sm: 6, md: 3 }}>
                        <MetricCard
                          label="Best Answer Correctness"
                          value={`${((winner?.gt_alignment || 0) * 100).toFixed(0)}%`}
                          icon={<Target size={24} />}
                          subtitle="Peak GT consistency"
                          trend={trends.correctness}
                        />
                      </Grid>
                      <Grid size={{ xs: 6, sm: 6, md: 3 }}>
                        <MetricCard
                          label="Best Faithfulness"
                          value={`${((winner?.avg_faithfulness || 0) * 100).toFixed(0)}%`}
                          icon={<ShieldCheck size={24} />}
                          subtitle="Grounded logic (Top Model)"
                          trend={trends.faithfulness}
                        />
                      </Grid>
                      <Grid size={{ xs: 6, sm: 6, md: 3 }}>
                        <MetricCard
                          label="Best Relevancy"
                          value={`${((winner?.avg_relevancy || 0) * 100).toFixed(0)}%`}
                          icon={<Compass size={24} />}
                          subtitle="Intent accuracy (Top Model)"
                          trend={trends.relevancy}
                        />
                      </Grid>

                      {/* Score Cards - Row 2 */}
                      <Grid size={{ xs: 6, sm: 6, md: 3 }}>
                        <MetricCard
                          label="Max Context Prec."
                          value={`${((winner?.avg_context_precision || 0) * 100).toFixed(0)}%`}
                          icon={<Zap size={24} />}
                          subtitle="Retrieval Signal-to-Noise"
                          trend={trends.precision}
                        />
                      </Grid>
                      <Grid size={{ xs: 6, sm: 6, md: 3 }}>
                        <MetricCard
                          label="Max Context Recall"
                          value={`${((winner?.retrieval_success || 0) * 100).toFixed(0)}%`}
                          icon={<Layers size={24} />}
                          subtitle="Information Coverage"
                          trend={trends.recall}
                        />
                      </Grid>
                      <Grid size={{ xs: 6, sm: 6, md: 3 }}>
                        <MetricCard
                          label="Hallucination Rate"
                          value={`${((1 - (winner?.avg_faithfulness || 0)) * 100).toFixed(0)}%`}
                          icon={<AlertTriangle size={24} />}
                          subtitle="Safety Risk Assessment"
                        />
                      </Grid>
                      <Grid size={{ xs: 6, sm: 6, md: 3 }}>
                        <MetricCard
                          label="Toxicity Score"
                          value={`${((winner?.avg_toxicity || 0) * 100).toFixed(1)}%`}
                          icon={<Shield size={24} />}
                          subtitle="Content Safety (Lower is Better)"
                        />
                      </Grid>

                      {/* Main Visualization */}
                      <Grid size={{ xs: 12, md: 8 }} className="no-print">
                        <ChartContainer
                          title="Performance Trajectory"
                          subtitle="Multidimensional scoring across top architectures"
                          height={320}
                        >
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                              <defs>
                                <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.3} />
                                  <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="4 4" vertical={true} stroke={theme.palette.divider} strokeWidth={1.5} />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: theme.palette.text.secondary, fontSize: 10, fontWeight: 700 }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fill: theme.palette.text.secondary, fontSize: 10, fontWeight: 700 }} />
                              <ChartTooltip content={<CustomTooltip />} />
                              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 600, top: -10 }} />
                              <Area name="Master RQS Score" type="monotone" dataKey="RQS" stroke={theme.palette.primary.main} strokeWidth={3} fillOpacity={1} fill="url(#colorPrimary)" />
                              <Area name="Answer Correctness" type="monotone" dataKey="AnswerCorrectness" stroke="#1F8A70" strokeWidth={2} fillOpacity={0} />
                              <Area name="Answer Faithfulness" type="monotone" dataKey="Faithfulness" stroke="#673AB7" strokeWidth={2} fillOpacity={0} />
                              <Area name="Answer Relevancy" type="monotone" dataKey="Relevancy" stroke="#D9822B" strokeWidth={2} fillOpacity={0} />
                              <Area name="Context Precision" type="monotone" dataKey="Precision" stroke="#2D6CDF" strokeWidth={2} fillOpacity={0} />
                              <Area name="Context Recall" type="monotone" dataKey="Recall" stroke="#009688" strokeWidth={2} fillOpacity={0} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </Grid>

                      {/* Neural Profile HUD */}
                      <Grid size={{ xs: 12, md: 4 }} className="no-print">
                        <ChartContainer
                          title="Neural Topology"
                          subtitle="Architectural capability mapping (Top 3)"
                          height={340}
                        >
                          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <Box sx={{ flex: 1, minHeight: 260 }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="55%"
                                  data={[
                                    { subject: 'Answer Correctness', ...leaderboardData.slice(0, 3).reduce((acc, m) => ({ ...acc, [m.id]: Number((m.gt_alignment * 100).toFixed(1)) }), {}) },
                                    { subject: 'Answer Faithfulness', ...leaderboardData.slice(0, 3).reduce((acc, m) => ({ ...acc, [m.id]: Number((m.avg_faithfulness * 100).toFixed(1)) }), {}) },
                                    { subject: 'Answer Relevancy', ...leaderboardData.slice(0, 3).reduce((acc, m) => ({ ...acc, [m.id]: Number((m.avg_relevancy * 100).toFixed(1)) }), {}) },
                                    { subject: 'Context Precision', ...leaderboardData.slice(0, 3).reduce((acc, m) => ({ ...acc, [m.id]: Number((m.avg_context_precision * 100).toFixed(1)) }), {}) },
                                    { subject: 'Context Recall', ...leaderboardData.slice(0, 3).reduce((acc, m) => ({ ...acc, [m.id]: Number((m.retrieval_success * 100).toFixed(1)) }), {}) },
                                  ]}
                                >
                                  <PolarGrid stroke={theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'} strokeWidth={1.5} />
                                  <PolarAngleAxis dataKey="subject" tick={{ fill: theme.palette.text.secondary, fontSize: 10, fontWeight: 700 }} />
                                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                  <ChartTooltip content={<CustomTooltip />} />
                                  {leaderboardData.slice(0, 3).map((model, idx) => (
                                    <Radar
                                      key={model.id}
                                      name={model.id}
                                      dataKey={model.id}
                                      stroke={['#D00000', '#2D6CDF', '#D9822B'][idx]}
                                      fill={['#D00000', '#2D6CDF', '#D9822B'][idx]}
                                      fillOpacity={0.25}
                                      strokeWidth={3}
                                    />
                                  ))}
                                </RadarChart>
                              </ResponsiveContainer>
                            </Box>
                            <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
                              {leaderboardData.slice(0, 3).map((model, idx) => (
                                <Box key={model.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    bgcolor: ['#D00000', '#2D6CDF', '#D9822B'][idx],
                                    boxShadow: `0 0 10px ${['#D00000', '#2D6CDF', '#D9822B'][idx]}`
                                  }} />
                                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.75rem' }}>{model.id}</Typography>
                                </Box>
                              ))}
                            </Box>
                          </Box>
                        </ChartContainer>
                      </Grid>


                      {/* Leaderboard Table */}
                      <Grid size={{ xs: 12 }}>
                        <TableContainer component={Paper} sx={{ borderRadius: 2, bgcolor: 'background.paper', border: (theme) => `1px solid ${theme.palette.divider}` }}>
                          <Box sx={{ px: 3, py: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', lineHeight: 1.2 }}>Comparison Leaderboard</Typography>
                            <Button
                              variant="contained"
                              color="primary"
                              size="small"
                              endIcon={<ChevronRight size={16} />}
                              onClick={() => handleViewChange('history')}
                            >
                              View All Historical Runs
                            </Button>
                          </Box>
                          <Table>
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>Rank</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>Model Architecture</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>Master RQS Score</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>Answer Correctness</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>Faithfulness Score</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>Answer Relevancy</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>Context Precision</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>Context Recall</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>Toxicity</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>Analysis</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {leaderboardData.map((row) => (
                                <TableRow key={row.id} hover>
                                  <TableCell sx={{ borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>
                                    <Box sx={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: '50%',
                                      bgcolor: row.rank === 1 ? 'rgba(245, 158, 11, 0.1)' : (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
                                      color: row.rank === 1 ? '#D9822B' : 'inherit',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontWeight: 800,
                                      fontSize: '0.75rem'
                                    }}>
                                      {row.rank}
                                    </Box>
                                  </TableCell>
                                  <TableCell sx={{ fontWeight: 700, borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>{row.id}</TableCell>
                                  <TableCell sx={{ borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>
                                    <Typography sx={{ color: 'primary.main', fontWeight: 900 }}>{(row.avg_rqs || 0).toFixed(3)}</Typography>
                                  </TableCell>
                                  <TableCell sx={{ borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>
                                    <Stack direction="row" alignItems="center" spacing={1.5}>
                                      <LinearProgress
                                        variant="determinate"
                                        value={row.gt_alignment * 100}
                                        sx={{ width: 80, height: 6, borderRadius: 3, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                                      />
                                      <Typography variant="caption">{(row.gt_alignment * 100).toFixed(0)}%</Typography>
                                    </Stack>
                                  </TableCell>
                                  <TableCell sx={{ borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>{(row.avg_faithfulness * 100).toFixed(1)}%</TableCell>
                                  <TableCell sx={{ borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>{(row.avg_relevancy * 100).toFixed(1)}%</TableCell>
                                  <TableCell sx={{ borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>{(row.avg_context_precision * 100).toFixed(1)}%</TableCell>
                                  <TableCell sx={{ borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>{(row.retrieval_success * 100).toFixed(1)}%</TableCell>
                                  <TableCell sx={{ borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>
                                    {((row.avg_toxicity || 0) * 100).toFixed(2)}%
                                  </TableCell>
                                  <TableCell align="right" sx={{ borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>
                                    <Tooltip title="View Detailed Analysis" arrow>
                                      <IconButton
                                        size="small"
                                        color="primary"
                                        onClick={() => handleViewChange('drilldown')}
                                      >
                                        <ArrowUpRight size={18} />
                                      </IconButton>
                                    </Tooltip>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Grid>
                    </Grid>
                  )}

                  {activeView === 'history' && (
                    <Grid container spacing={3} sx={{ height: '100%' }}>
                      <Grid size={{ xs: 12 }} sx={{ height: '100%' }}>
                        <TableContainer
                          component={Paper}
                          sx={{
                            borderRadius: 2,
                            bgcolor: 'background.paper',
                            border: (theme) => `1px solid ${theme.palette.divider}`,
                            boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 0 30px rgba(208, 0, 0, 0.15)' : '0 10px 30px rgba(0,0,0,0.05)',
                            height: '100%',
                            overflowY: 'auto !important',
                            mb: 0,
                            '&::-webkit-scrollbar': { width: '8px' },
                            '&::-webkit-scrollbar-track': { background: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.03)' },
                            '&::-webkit-scrollbar-thumb': {
                              background: (theme) => theme.palette.mode === 'dark' ? 'rgba(230, 0, 0, 0.2)' : 'rgba(230, 0, 0, 0.3)',
                              borderRadius: '10px',
                              border: (theme) => theme.palette.mode === 'dark' ? 'none' : '2px solid transparent',
                              backgroundClip: 'padding-box'
                            },
                            '&::-webkit-scrollbar-thumb:hover': {
                              background: (theme) => theme.palette.mode === 'dark' ? 'rgba(230, 0, 0, 0.4)' : 'rgba(230, 0, 0, 0.5)',
                              backgroundClip: 'padding-box'
                            }
                          }}
                        >
                          <Table sx={{ tableLayout: 'fixed' }}>
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', width: '200px', position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 10, borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>Date</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', width: '250px', position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 10, borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>Name</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', width: '180px', position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 10, borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>Winner</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', width: '120px', position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 10, borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>Max RQS</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', width: '80px', position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 10, borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>Action</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {filteredHistory.slice((historyPage - 1) * ITEMS_PER_PAGE, historyPage * ITEMS_PER_PAGE).map((run) => (
                                <TableRow key={run.id} hover>
                                  <TableCell sx={{ borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>{new Date(run.timestamp).toLocaleString()}</TableCell>
                                  <TableCell sx={{ borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>{run.name}</TableCell>
                                  <TableCell sx={{ borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>
                                    <Chip
                                      icon={<Trophy size={12} />}
                                      label={run.winner}
                                      size="small"
                                      sx={{ bgcolor: 'rgba(31, 138, 112, 0.1)', color: '#1F8A70', fontWeight: 700, '& .MuiChip-icon': { color: '#1F8A70' } }}
                                    />
                                  </TableCell>
                                  <TableCell sx={{ borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>
                                    <Typography sx={{ fontWeight: 700, color: 'primary.main' }}>
                                      {run.summaries?.[run.winner]?.avg_rqs?.toFixed(3) || "N/A"}
                                    </Typography>
                                  </TableCell>
                                  <TableCell sx={{ width: '80px', borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>
                                    <Tooltip title="Load Report" arrow>
                                      <IconButton
                                        size="small"
                                        color="primary"
                                        onClick={() => handleLoadReport(run.id)}
                                        sx={{
                                          borderRadius: 1.5,
                                          '&:hover': {
                                            bgcolor: (t: any) => alpha(t.palette.primary.main, 0.1)
                                          }
                                        }}
                                      >
                                        <Eye size={18} />
                                      </IconButton>
                                    </Tooltip>
                                  </TableCell>
                                </TableRow>
                              ))}
                              {history.length === 0 && !isLoadingHistory && (
                                <TableRow>
                                  <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                                    <Typography color="text.secondary">No historical evaluations found.</Typography>
                                  </TableCell>
                                </TableRow>
                              )}
                              {isLoadingHistory && (
                                <TableRow>
                                  <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                                    <CircularProgress size={32} />
                                    <Typography color="text.secondary" sx={{ mt: 2 }}>Loading evaluation history...</Typography>
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </TableContainer>
                        {/* Pagination moved to header */}
                      </Grid>
                    </Grid>
                  )}

                  {activeView === 'drilldown' && data && (() => {
                    const bots = Object.keys(data.summaries);
                    const safeVal = (v: any) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
                    const mc = (v: number) => v >= 0.8 ? '#1F8A70' : v >= 0.5 ? '#D9822B' : '#C23030';
                    const pageData = filteredTestCases.slice((drilldownPage - 1) * ITEMS_PER_PAGE, drilldownPage * ITEMS_PER_PAGE);
                    const stickyHead = { position: 'sticky' as const, top: 0, zIndex: 2, bgcolor: (t: any) => t.palette.background.paper, borderRight: (t: any) => `1px solid ${t.palette.divider}` };
                    const vBorder = { borderRight: (t: any) => `1px solid ${t.palette.divider}` };
                    const truncCell = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 0 } as const;
                    const clampBox = { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-word' as const };
                    const longTip = { tooltip: { sx: { maxWidth: 500, maxHeight: 300, overflow: 'auto', fontSize: '0.8rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' as const, p: 1.5 } } };
                    return (
                    <Paper sx={{ borderRadius: 2, bgcolor: 'background.paper', border: (t: any) => `1px solid ${t.palette.divider}`, overflow: 'hidden' }}>
                      <TableContainer sx={{ maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}>
                        <Table size="small" stickyHeader sx={{ tableLayout: 'fixed', width: '100%' }}>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ ...stickyHead, fontWeight: 700, fontSize: '0.7rem', py: 1.5, width: '3%' }}>#</TableCell>
                              <TableCell sx={{ ...stickyHead, fontWeight: 700, fontSize: '0.7rem', py: 1.5, width: '13%' }}>Query</TableCell>
                              <TableCell sx={{ ...stickyHead, fontWeight: 700, fontSize: '0.7rem', py: 1.5, width: '13%' }}>Ground Truth</TableCell>
                              <TableCell sx={{ ...stickyHead, fontWeight: 700, fontSize: '0.7rem', py: 1.5, width: '13%' }}>AI Response</TableCell>
                              <TableCell sx={{ ...stickyHead, fontWeight: 700, fontSize: '0.7rem', py: 1.5, width: '12%' }}>Context</TableCell>
                              <TableCell sx={{ ...stickyHead, fontWeight: 700, fontSize: '0.7rem', py: 1.5, width: '5%' }}>Bot</TableCell>
                              <TableCell sx={{ ...stickyHead, fontWeight: 700, fontSize: '0.7rem', py: 1.5, textAlign: 'center', width: '6%' }}>Faithfulness</TableCell>
                              <TableCell sx={{ ...stickyHead, fontWeight: 700, fontSize: '0.7rem', py: 1.5, textAlign: 'center', width: '6%' }}>Relevancy</TableCell>
                              <TableCell sx={{ ...stickyHead, fontWeight: 700, fontSize: '0.7rem', py: 1.5, textAlign: 'center', width: '6%' }}>Context Precision</TableCell>
                              <TableCell sx={{ ...stickyHead, fontWeight: 700, fontSize: '0.7rem', py: 1.5, textAlign: 'center', width: '6%' }}>Context Recall</TableCell>
                              <TableCell sx={{ ...stickyHead, fontWeight: 700, fontSize: '0.7rem', py: 1.5, textAlign: 'center', width: '6%' }}>Correctness</TableCell>
                              <TableCell sx={{ ...stickyHead, fontWeight: 800, fontSize: '0.7rem', py: 1.5, textAlign: 'center', width: '6%', color: 'primary.main', borderRight: 'none' }}>RQS</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {pageData.map((testCase: any, idx: number) =>
                              bots.map((bot, bIdx) => {
                                const m = data.bot_metrics[bot]?.[testCase.id];
                                const faith = safeVal(m?.faithfulness);
                                const relev = safeVal(m?.answer_relevancy);
                                const ctxP = safeVal(m?.context_precision);
                                const ctxR = safeVal(m?.context_recall);
                                const corr = safeVal(m?.semantic_similarity);
                                const rqs = safeVal(m?.rqs);
                                const isFirst = bIdx === 0;
                                const isLast = bIdx === bots.length - 1;
                                const ctxRaw = testCase.bot_contexts?.[bot];
                                const ctxFull = Array.isArray(ctxRaw) ? ctxRaw.join('\n\n') : (ctxRaw || '');
                                const ctxShort = Array.isArray(ctxRaw) ? ctxRaw.join(' | ') : (ctxRaw || 'N/A');
                                const botResponse = testCase.bot_responses?.[bot] || '';
                                return (
                                    <TableRow key={`${testCase.id}-${bot}`} hover sx={{
                                      cursor: 'default',
                                      ...(isLast && { borderBottom: (t: any) => `2px solid ${t.palette.divider}` }),
                                    }}>
                                      {isFirst ? (
                                        <>
                                          <TableCell rowSpan={bots.length} sx={{ py: 1, fontWeight: 700, fontSize: '0.75rem', verticalAlign: 'top', ...vBorder }}>
                                            {(drilldownPage - 1) * ITEMS_PER_PAGE + idx + 1}
                                          </TableCell>
                                          <Tooltip title={testCase.query} placement="bottom-start" arrow slotProps={longTip}>
                                            <TableCell rowSpan={bots.length} sx={{ py: 1, verticalAlign: 'top', ...vBorder, cursor: 'help' }}>
                                              <Box sx={{ ...clampBox, fontSize: '0.78rem', lineHeight: 1.4 }}>{testCase.query}</Box>
                                            </TableCell>
                                          </Tooltip>
                                          <Tooltip title={testCase.ground_truth || 'N/A'} placement="bottom-start" arrow slotProps={longTip}>
                                            <TableCell rowSpan={bots.length} sx={{ py: 1, verticalAlign: 'top', ...vBorder, cursor: 'help' }}>
                                              <Box sx={{ ...clampBox, fontSize: '0.78rem', lineHeight: 1.4, fontStyle: 'italic', color: 'text.secondary' }}>{testCase.ground_truth || 'N/A'}</Box>
                                            </TableCell>
                                          </Tooltip>
                                        </>
                                      ) : null}
                                      <Tooltip title={botResponse || 'No response'} placement="bottom-start" arrow slotProps={longTip}>
                                        <TableCell sx={{ py: 1, fontSize: '0.72rem', color: 'text.secondary', ...truncCell, ...vBorder, cursor: 'help' }}>
                                          {botResponse || 'N/A'}
                                        </TableCell>
                                      </Tooltip>
                                      <Tooltip title={ctxFull ? `${bot} Context: ${ctxFull}` : 'No context available'} placement="bottom-start" arrow slotProps={longTip}>
                                        <TableCell sx={{ py: 1, fontSize: '0.72rem', color: 'text.secondary', ...truncCell, ...vBorder, cursor: 'help' }}>
                                          {ctxShort}
                                        </TableCell>
                                      </Tooltip>
                                      <TableCell sx={{ py: 1, fontWeight: 600, fontSize: '0.78rem', ...truncCell, ...vBorder }}>{bot}</TableCell>
                                      <Tooltip title={`Faithfulness: ${faith.toFixed(4)}`} placement="top" arrow>
                                        <TableCell sx={{ py: 1, textAlign: 'center', fontWeight: 600, fontSize: '0.78rem', color: mc(faith), ...vBorder }}>{faith.toFixed(2)}</TableCell>
                                      </Tooltip>
                                      <Tooltip title={`Relevancy: ${relev.toFixed(4)}`} placement="top" arrow>
                                        <TableCell sx={{ py: 1, textAlign: 'center', fontWeight: 600, fontSize: '0.78rem', color: mc(relev), ...vBorder }}>{relev.toFixed(2)}</TableCell>
                                      </Tooltip>
                                      <Tooltip title={`Context Precision: ${ctxP.toFixed(4)}`} placement="top" arrow>
                                        <TableCell sx={{ py: 1, textAlign: 'center', fontWeight: 600, fontSize: '0.78rem', color: mc(ctxP), ...vBorder }}>{ctxP.toFixed(2)}</TableCell>
                                      </Tooltip>
                                      <Tooltip title={`Context Recall: ${ctxR.toFixed(4)}`} placement="top" arrow>
                                        <TableCell sx={{ py: 1, textAlign: 'center', fontWeight: 600, fontSize: '0.78rem', color: mc(ctxR), ...vBorder }}>{ctxR.toFixed(2)}</TableCell>
                                      </Tooltip>
                                      <Tooltip title={`Correctness: ${corr.toFixed(4)}`} placement="top" arrow>
                                        <TableCell sx={{ py: 1, textAlign: 'center', fontWeight: 600, fontSize: '0.78rem', color: mc(corr), ...vBorder }}>{corr.toFixed(2)}</TableCell>
                                      </Tooltip>
                                      <Tooltip title={`RQS: ${rqs.toFixed(4)}`} placement="top" arrow>
                                        <TableCell sx={{ py: 1, textAlign: 'center', fontWeight: 800, fontSize: '0.8rem', color: 'primary.main' }}>{rqs.toFixed(3)}</TableCell>
                                      </Tooltip>
                                    </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>
                    );
                  })()}



                  {activeView === 'config' && (
                    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Grid container spacing={1.5} sx={{ flexGrow: 1, minHeight: 0 }}>
                        {/* Left Column - Core Intelligence & RQS Weights */}
                        <Grid size={{ xs: 12, md: 6 }} sx={{ height: '100%' }}>
                          <Paper sx={{ px: 2, py: 1.5, borderRadius: 2, bgcolor: 'background.paper', border: (theme) => `1px solid ${theme.palette.divider}`, boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 0 30px rgba(230, 0, 0, 0.2)' : '0 10px 30px rgba(0, 0, 0, 0.05)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                              <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', letterSpacing: '-0.01em' }}>Neural Engine Configuration</Typography>
                              <FormControlLabel
                                control={<Switch size="small" checked={config.expertMode} onChange={(e) => setConfig({ ...config, expertMode: e.target.checked })} />}
                                label={<Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.65rem', color: config.expertMode ? 'primary.main' : 'text.secondary' }}>EXPERT</Typography>}
                              />
                            </Box>

                            {/* Section 1: Core Intelligence */}
                            <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 900, mb: 0.5, display: 'block', fontSize: '0.6rem' }}>I. Core Intelligence</Typography>

                            <Box sx={{ mb: 1 }}>
                              <Typography variant="caption" sx={{ mb: 1, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                                <Cpu size={14} /> Judge Model (LLM)
                              </Typography>
                              <Grid container spacing={1.5}>
                                {['gpt-4o', 'gpt-3.5-turbo', 'claude-3-sonnet'].map((m) => (
                                  <Grid size={{ xs: 4 }} key={m}>
                                    <Button
                                      fullWidth
                                      variant={config.judgeModel === m ? 'contained' : 'outlined'}
                                      color={config.judgeModel === m ? 'primary' : 'inherit'}
                                      size="small"
                                      onClick={() => setConfig({ ...config, judgeModel: m })}
                                      sx={{ p: 1, minHeight: 0 }}
                                    >
                                      <Typography variant="caption" fontWeight={700} fontSize="0.65rem">{m.toUpperCase()}</Typography>
                                    </Button>
                                  </Grid>
                                ))}
                              </Grid>
                            </Box>

                            <Grid container spacing={1.5} sx={{ mb: 1 }}>
                              <Grid size={{ xs: 6 }}>
                                <Typography variant="caption" sx={{ mb: 1, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                                  <Thermometer size={14} /> Temperature
                                </Typography>
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                  <Slider
                                    size="small"
                                    value={config.temperature}
                                    min={0} max={1} step={0.1}
                                    onChange={(_, v) => setConfig({ ...config, temperature: v as number })}
                                    sx={{ flex: 1 }}
                                  />
                                  <Typography variant="caption" sx={{ minWidth: 25, fontWeight: 700, fontSize: '0.7rem' }}>{config.temperature.toFixed(1)}</Typography>
                                </Stack>
                              </Grid>
                              <Grid size={{ xs: 6 }}>
                                <Typography variant="caption" sx={{ mb: 1, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                                  <Users size={14} /> Workers
                                </Typography>
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                  <Slider
                                    size="small"
                                    value={config.concurrency}
                                    min={1} max={20} step={1}
                                    onChange={(_, v) => setConfig({ ...config, concurrency: v as number })}
                                    sx={{ flex: 1 }}
                                  />
                                  <Typography variant="caption" sx={{ minWidth: 25, fontWeight: 700, fontSize: '0.7rem' }}>{config.concurrency}x</Typography>
                                </Stack>
                              </Grid>
                            </Grid>

                            <Divider sx={{ my: 1, borderColor: (theme) => theme.palette.divider }} />

                            {/* Section 2: RQS Weights */}
                            <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 900, mb: 0.5, display: 'block', fontSize: '0.6rem' }}>II. Scoring Architecture (RQS)</Typography>

                            <Grid container spacing={1.5}>
                              {[
                                { label: 'Alpha (Semantic)', key: 'alpha', color: '#D00000' },
                                { label: 'Beta (Faithful)', key: 'beta', color: '#D00000' },
                                { label: 'Gamma (Relevant)', key: 'gamma', color: '#D00000' }
                              ].map((param) => (
                                <Grid size={{ xs: 4 }} key={param.key}>
                                  <Box sx={{ p: 1, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderRadius: 1.5, border: (theme) => `1px solid ${theme.palette.divider}` }}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.5, fontSize: '0.65rem' }}>{param.label}</Typography>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                      <Slider
                                        size="small"
                                        value={(config as any)[param.key]}
                                        min={0} max={1} step={0.05}
                                        onChange={(_, v) => setConfig({ ...config, [param.key]: v as number })}
                                        sx={{ color: param.color }}
                                      />
                                      <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.7rem', minWidth: 30 }}>{(config as any)[param.key].toFixed(2)}</Typography>
                                    </Stack>
                                  </Box>
                                </Grid>
                              ))}
                            </Grid>
                            {(config.alpha + config.beta + config.gamma) > 1.0 && (
                              <Alert severity="warning" sx={{ mt: 1, fontSize: '0.65rem', py: 0.25 }}>
                                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                  Weight sum exceeds 1.0 ({(config.alpha + config.beta + config.gamma).toFixed(2)}). Weights will be auto-normalized during evaluation.
                                </Typography>
                              </Alert>
                            )}
                          </Paper>
                        </Grid>

                        {/* Right Column - System Guardrails */}
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Paper sx={{ px: 2, py: 2, borderRadius: 2, bgcolor: 'background.paper', border: (theme) => `1px solid ${theme.palette.divider}`, boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 0 30px rgba(208, 0, 0, 0.15)' : '0 10px 30px rgba(0,0,0,0.05)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 900, mb: 1, display: 'block', fontSize: '0.6rem' }}>III. System Guardrails</Typography>

                            <Box sx={{ mb: 0.75 }}>
                              <Box sx={{ p: 1.25, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderRadius: 2, border: (theme) => `1px solid ${theme.palette.divider}` }}>
                                <Typography variant="caption" sx={{ mb: 1, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                                  <Target size={14} /> Precision Threshold
                                </Typography>
                                <Slider
                                  size="small"
                                  value={config.strictness}
                                  min={0.5} max={1} step={0.01}
                                  onChange={(_, v) => setConfig({ ...config, strictness: v as number })}
                                  valueLabelDisplay="auto"
                                />
                                <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block', fontSize: '0.65rem' }}>
                                  Minimum confidence required for a "Pass" status.
                                </Typography>
                              </Box>
                            </Box>

                            <Box sx={{ mb: 0.75 }}>
                              <Box sx={{ p: 1.25, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderRadius: 2, border: (theme) => `1px solid ${theme.palette.divider}` }}>
                                <Typography variant="caption" sx={{ mb: 1, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                                  <AlignLeft size={14} /> Dataset Size Limit
                                </Typography>
                                <Slider
                                  size="small"
                                  value={config.maxRows}
                                  min={10} max={1000} step={10}
                                  onChange={(_, v) => setConfig({ ...config, maxRows: v as number })}
                                  valueLabelDisplay="auto"
                                />
                                <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block', fontSize: '0.65rem' }}>
                                  Maximum number of rows allowed for evaluation (Safety Limit: {config.maxRows}).
                                </Typography>
                              </Box>
                            </Box>

                            <Box sx={{ mb: 0.75 }}>
                              <Paper variant="outlined" sx={{ p: 1.25, bgcolor: 'transparent', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                  <Typography variant="caption" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.75rem' }}>
                                    <Shield size={14} /> Automated Safety
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>Scan for hallucination triggers</Typography>
                                </Box>
                                <Switch size="small" checked={config.enableSafety} onChange={(e) => setConfig({ ...config, enableSafety: e.target.checked })} />
                              </Paper>
                            </Box>

                            <Box sx={{ mb: 1 }}>
                              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'transparent', borderColor: 'divider' }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, mb: 1, fontSize: '0.75rem' }}>
                                  <FileJson size={14} /> Export Format
                                </Typography>
                                <Grid container spacing={1.5}>
                                  {['PDF', 'JSON', 'Excel'].map((format) => (
                                    <Grid size={{ xs: 4 }} key={format}>
                                      <Button
                                        fullWidth
                                        variant={config.exportFormat === format ? 'contained' : 'outlined'}
                                        color={config.exportFormat === format ? 'primary' : 'inherit'}
                                        size="small"
                                        onClick={() => setConfig({ ...config, exportFormat: format })}
                                        sx={{ p: 1, minHeight: 0 }}
                                      >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                          {format === 'PDF' && <FileText size={12} />}
                                          {format === 'JSON' && <FileJson size={12} />}
                                          {format === 'Excel' && <FileSpreadsheet size={12} />}
                                          <Typography variant="caption" fontWeight={700} fontSize="0.65rem">{format}</Typography>
                                        </Box>
                                      </Button>
                                    </Grid>
                                  ))}
                                </Grid>
                              </Paper>
                            </Box>
                          </Paper>
                        </Grid>
                      </Grid>
                    </Box>
                  )}


                </Box>
              </motion.div>
            </AnimatePresence>
          </Box>
        </Box>

        {/* Evaluation Modal Backdrop */}
        <Backdrop
          sx={{
            color: '#fff',
            zIndex: (theme) => theme.zIndex.drawer + 999,
            backdropFilter: 'blur(20px) saturate(180%)',
            bgcolor: 'rgba(2, 6, 23, 0.85)'
          }}
          open={isEvaluating}
        >
          <Box sx={{
            width: { xs: '95vw', md: 860 },
            maxWidth: 860,
            textAlign: 'center',
            animation: 'fadeInScale 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <Box sx={{ position: 'relative', display: 'inline-flex', mb: 4 }}>
              <CircularProgress
                size={96}
                thickness={2}
                sx={{
                  color: '#D00000',
                  '& .MuiCircularProgress-circle': {
                    strokeLinecap: 'round',
                  }
                }}
              />
              <Box sx={{
                position: 'absolute',
                top: 0, left: 0, bottom: 0, right: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <motion.div
                  animate={{ rotate: [0, 15, -15, 15, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <UbsLogo size={64} color="#D00000" />
                </motion.div>
              </Box>
            </Box>

            <Typography variant="h3" sx={{ fontWeight: 900, mb: 1, letterSpacing: '-0.04em', color: '#fff' }}>
              RAG Diagnostic Engine Processing
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 5, opacity: 0.8, fontWeight: 500 }}>
              Synchronizing tokens and calculating RAG metrics...
            </Typography>

            <Paper
              elevation={0}
              sx={{
                bgcolor: 'rgba(0, 0, 0, 0.65)',
                p: 0,
                borderRadius: 4,
                border: '1px solid rgba(208, 0, 0, 0.25)',
                height: 480,
                overflow: 'hidden',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 0 50px rgba(0,0,0,0.5), inset 0 0 20px rgba(208, 0, 0, 0.04)'
              }}
            >
              {/* Terminal Header */}
              <Box sx={{
                px: 3,
                py: 1.5,
                bgcolor: 'rgba(15, 23, 42, 0.8)',
                borderBottom: '1px solid rgba(45, 108, 223, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#C23030', opacity: 0.8 }} />
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#D9822B', opacity: 0.8 }} />
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#1F8A70', opacity: 0.8 }} />
                <Typography sx={{ ml: 2, fontSize: '0.7rem', fontWeight: 900, letterSpacing: '0.1em', opacity: 0.6, color: '#2D6CDF' }}>
                  RAG_METRICS_ENGINE_v1.0.0
                </Typography>
              </Box>

              {/* Logs Area */}
              <Box className="custom-scrollbar" sx={{
                flexGrow: 1,
                p: 4,
                overflow: 'auto',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
              }}>
                {statusLogs.map((log, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 3, mb: 1.5, animation: 'fadeInLogs 0.2s ease-out' }}>
                    <Typography variant="caption" sx={{
                      fontFamily: 'inherit',
                      color: '#2D6CDF',
                      opacity: 0.4,
                      whiteSpace: 'nowrap',
                      width: '90px'
                    }}>
                      [{new Date().toLocaleTimeString()}]
                    </Typography>
                    <Typography sx={{
                      fontFamily: 'inherit',
                      fontSize: '0.9rem',
                      color: log.includes('SUCCESS') ? '#1F8A70' : log.includes('CRITICAL') ? '#C23030' : '#f8fafc',
                      lineHeight: 1.6
                    }}>
                      {log}
                    </Typography>
                  </Box>
                ))}
                <div ref={logEndRef} />
              </Box>

              {/* Bottom Cursor Area */}
              <Box sx={{ px: 4, pb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography sx={{ color: 'primary.main', fontWeight: 900, fontSize: '0.9rem' }}>$</Typography>
                <Box sx={{ width: 12, height: 20, bgcolor: 'primary.main', animation: 'blink 1s infinite' }} />
              </Box>
            </Paper>
          </Box>
        </Backdrop>

        {/* Report Loading Backdrop */}
        <Backdrop
          sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 2, backdropFilter: 'blur(4px)', bgcolor: 'rgba(0,0,0,0.7)' }}
          open={isLoadingReport}
        >
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress color="secondary" size={60} thickness={4} />
            <Typography variant="h6" sx={{ mt: 3, fontWeight: 700 }}>Loading Full Report...</Typography>
          </Box>
        </Backdrop>
      </Box>

      <PrintOnlyReport data={data} leaderboardData={leaderboardData} />

      {/* Compare Dialog */}
      <Dialog
        open={compareDialogOpen}
        onClose={() => setCompareDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            border: (theme) => `1px solid ${theme.palette.divider}`,
            borderRadius: 3,
            boxShadow: (theme) => theme.palette.mode === 'dark' ? `0 0 40px ${alpha(theme.palette.primary.main, 0.4)}` : '0 10px 40px rgba(0,0,0,0.1)',
            minHeight: '80vh',
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.1rem', borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>
          Compare Evaluations
        </DialogTitle>
        <DialogContent sx={{
          pt: 3,
          maxHeight: 'calc(90vh - 180px)',
          overflowY: 'auto',
          '&::-webkit-scrollbar': { width: '8px' },
          '&::-webkit-scrollbar-track': { background: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.03)' },
          '&::-webkit-scrollbar-thumb': {
            background: (theme) => theme.palette.mode === 'dark' ? 'rgba(230, 0, 0, 0.25)' : 'rgba(230, 0, 0, 0.15)',
            borderRadius: '10px',
            border: (theme) => theme.palette.mode === 'dark' ? '2px solid rgba(15, 23, 42, 0.8)' : '2px solid rgba(255, 255, 255, 0.9)',
            backgroundClip: 'padding-box'
          },
          '&::-webkit-scrollbar-thumb:hover': { background: (theme) => theme.palette.mode === 'dark' ? 'rgba(230, 0, 0, 0.4)' : 'rgba(230, 0, 0, 0.3)' }
        }}>
          {!showComparisonResults ? (
            <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
              <Stack spacing={3}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: 'text.secondary' }}>First Evaluation</InputLabel>
                  <Select
                    value={compareEval1}
                    onChange={(e) => setCompareEval1(e.target.value)}
                    label="First Evaluation"
                    sx={{
                      bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                      borderRadius: 2,
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: (theme) => theme.palette.divider
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main'
                      }
                    }}
                  >
                    {history.map((run) => (
                      <MenuItem key={run.id} value={run.id} disabled={run.id === compareEval2}>
                        {run.name} - {new Date(run.timestamp).toLocaleDateString()}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel sx={{ color: 'text.secondary' }}>Second Evaluation</InputLabel>
                  <Select
                    value={compareEval2}
                    onChange={(e) => setCompareEval2(e.target.value)}
                    label="Second Evaluation"
                    sx={{
                      bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                      borderRadius: 2,
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: (theme) => theme.palette.divider
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main'
                      }
                    }}
                  >
                    {history.map((run) => (
                      <MenuItem key={run.id} value={run.id} disabled={run.id === compareEval1}>
                        {run.name} - {new Date(run.timestamp).toLocaleDateString()}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Box>
          ) : (() => {
            const eval1 = history.find(h => h.id === compareEval1);
            const eval2 = history.find(h => h.id === compareEval2);
            if (!eval1 || !eval2) return null;

            const metrics = [
              { label: 'Master RQS Score', key: 'avg_rqs', format: (v: number) => v?.toFixed(3) || 'N/A' },
              { label: 'Answer Correctness', key: 'gt_alignment', format: (v: number) => `${(v * 100).toFixed(1)}%` },
              { label: 'Faithfulness', key: 'avg_faithfulness', format: (v: number) => `${(v * 100).toFixed(1)}%` },
              { label: 'Relevancy', key: 'avg_relevancy', format: (v: number) => `${(v * 100).toFixed(1)}%` },
              { label: 'Context Precision', key: 'avg_context_precision', format: (v: number) => `${(v * 100).toFixed(1)}%` },
              { label: 'Context Recall', key: 'retrieval_success', format: (v: number) => `${(v * 100).toFixed(1)}%` },
            ];

            return (
              <Box sx={{ mt: 2 }}>
                {/* Header */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid size={{ xs: 6 }}>
                    <Paper sx={{ p: 2.5, bgcolor: 'rgba(45, 108, 223, 0.06)', border: '1px solid rgba(45, 108, 223, 0.2)', borderRadius: 2 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5, textTransform: 'uppercase', fontWeight: 700 }}>Evaluation 1</Typography>
                      <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', mb: 1 }}>{eval1.name}</Typography>
                      <Stack spacing={0.5}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          <strong>Date:</strong> {new Date(eval1.timestamp).toLocaleString()}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          <strong>Winner:</strong> <span style={{ color: '#1F8A70', fontWeight: 700 }}>{eval1.winner}</span>
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          <strong>Models:</strong> {Object.keys(eval1.summaries || {}).join(', ')}
                        </Typography>
                      </Stack>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Paper sx={{ p: 2.5, bgcolor: 'rgba(208, 0, 0, 0.06)', border: '1px solid rgba(208, 0, 0, 0.2)', borderRadius: 2 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5, textTransform: 'uppercase', fontWeight: 700 }}>Evaluation 2</Typography>
                      <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', mb: 1 }}>{eval2.name}</Typography>
                      <Stack spacing={0.5}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          <strong>Date:</strong> {new Date(eval2.timestamp).toLocaleString()}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          <strong>Winner:</strong> <span style={{ color: '#1F8A70', fontWeight: 700 }}>{eval2.winner}</span>
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          <strong>Models:</strong> {Object.keys(eval2.summaries || {}).join(', ')}
                        </Typography>
                      </Stack>
                    </Paper>
                  </Grid>
                </Grid>

                {/* Winner Metrics Comparison */}
                <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', mb: 2, color: 'primary.light' }}>Winner Metrics Comparison</Typography>
                <TableContainer component={Paper} sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)', borderRadius: 2, border: (theme) => `1px solid ${theme.palette.divider}`, mb: 3 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.7rem', textTransform: 'uppercase' }}>Metric</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, color: '#2D6CDF', fontSize: '0.7rem', textTransform: 'uppercase' }}>Eval 1</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, color: '#D00000', fontSize: '0.7rem', textTransform: 'uppercase' }}>Eval 2</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.7rem', textTransform: 'uppercase' }}>Difference</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {metrics.map((metric) => {
                        const val1 = eval1.summaries?.[eval1.winner]?.[metric.key] || 0;
                        const val2 = eval2.summaries?.[eval2.winner]?.[metric.key] || 0;
                        const diff = val1 - val2;
                        const diffPercent = metric.key === 'avg_rqs' ? (diff * 100).toFixed(1) : (diff * 100).toFixed(1);
                        const isPositive = diff > 0;

                        return (
                          <TableRow key={metric.key} hover>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{metric.label}</TableCell>
                            <TableCell align="center" sx={{
                              fontWeight: 700,
                              color: isPositive ? '#1F8A70' : 'text.primary',
                              bgcolor: isPositive ? 'rgba(31, 138, 112, 0.1)' : 'transparent'
                            }}>
                              {metric.format(val1)}
                              {isPositive && <Trophy size={14} style={{ marginLeft: 4, verticalAlign: 'middle' }} />}
                            </TableCell>
                            <TableCell align="center" sx={{
                              fontWeight: 700,
                              color: !isPositive && diff !== 0 ? '#1F8A70' : 'text.primary',
                              bgcolor: !isPositive && diff !== 0 ? 'rgba(31, 138, 112, 0.1)' : 'transparent'
                            }}>
                              {metric.format(val2)}
                              {!isPositive && diff !== 0 && <Trophy size={14} style={{ marginLeft: 4, verticalAlign: 'middle' }} />}
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={`${diff > 0 ? '+' : ''}${diffPercent}${metric.key === 'avg_rqs' ? '' : '%'}`}
                                size="small"
                                sx={{
                                  fontWeight: 700,
                                  fontSize: '0.7rem',
                                  bgcolor: diff > 0 ? 'rgba(31, 138, 112, 0.2)' : diff < 0 ? 'rgba(194, 48, 48, 0.2)' : 'rgba(140, 150, 165, 0.2)',
                                  color: diff > 0 ? '#1F8A70' : diff < 0 ? '#C23030' : '#8C96A5'
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: (theme) => `1px solid ${theme.palette.divider}` }}>
          <Button
            variant="outlined"
            onClick={() => {
              setCompareDialogOpen(false);
              setShowComparisonResults(false);
              setCompareEval1('');
              setCompareEval2('');
            }}
          >
            {showComparisonResults ? 'Close' : 'Cancel'}
          </Button>
          {!showComparisonResults && (
            <Tooltip title={(!compareEval1 || !compareEval2) ? "Please select two evaluations to compare" : ""} arrow>
              <span>
                <Button
                  variant="contained"
                  color="primary"
                  disabled={!compareEval1 || !compareEval2}
                  onClick={() => {
                    setShowComparisonResults(true);
                  }}
                >
                  Compare
                </Button>
              </span>
            </Tooltip>
          )}
        </DialogActions>
      </Dialog>

      <UBSSnackbar
        open={saveSuccess}
        message={snackbarMsg}
        severity={snackbarMsg.includes('Failed') || snackbarMsg.includes('Error') ? 'error' : snackbarMsg.includes('Report') ? 'info' : 'success'}
        onClose={() => setSaveSuccess(false)}
      />

      <style jsx global>{`
          html, body {
            margin: 0;
            padding: 0;
            height: 100%;
            overflow: auto !important;
          }
          @keyframes blink { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }
          @keyframes shine {
            from { background-position: 200% 0; }
            to { background-position: -200% 0; }
          }
          @keyframes fadeInLogs { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes fadeInScale { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
          .custom-scrollbar::-webkit-scrollbar { width: '8px'; }
          .custom-scrollbar::-webkit-scrollbar-track { background: ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.03)'}; }
          .custom-scrollbar::-webkit-scrollbar-thumb { 
            background: ${theme.palette.mode === 'dark' ? 'rgba(230, 0, 0, 0.2)' : 'rgba(230, 0, 0, 0.3)'}; 
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${theme.palette.mode === 'dark' ? 'rgba(230, 0, 0, 0.4)' : 'rgba(230, 0, 0, 0.5)'}; }
          @media print {
            body { background: ${theme.palette.mode === 'dark' ? '#0f172a' : '#ffffff'} !important; color: ${theme.palette.mode === 'dark' ? '#ffffff' : '#000000'} !important; }
            /* Hide the entire web UI */
            .main-ui-container { display: none !important; }
            /* Show only the print-ready report */
            .print-only-report {
              display: block !important;
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
              z-index: 99999 !important;
            }
          }
        `}</style>
    </>
  );
}

// Component to handle search params (wrapped in Suspense)
function SearchParamsHandler({ onViewChange }: { onViewChange: (view: string) => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const viewFromUrl = searchParams.get('view');
    if (viewFromUrl && ['insights', 'drilldown', 'history', 'about', 'config'].includes(viewFromUrl)) {
      onViewChange(viewFromUrl);
    }
  }, [searchParams, onViewChange]);

  return null;
}

// Wrapper component with Suspense boundary
export default function EnterpriseDashboard() {
  return (
    <Suspense fallback={
        <Box sx={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default'
        }}>
          <CircularProgress size={60} sx={{ color: 'primary.main' }} />
        </Box>
      }>
        <EnterpriseDashboardContent />
      </Suspense>
  );
}

// --- Helper Components ---

// --- Additional Helper Components ---

const safeVal = (val: any) => {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
};

const formatPercent = (val: any) => `${(safeVal(val) * 100).toFixed(1)}%`;
const formatNum = (val: any, dec = 3) => safeVal(val).toFixed(dec);



function SidebarItem({ icon, label, active, onClick }: any) {
  const theme = useTheme();
  return (
    <ListItem disablePadding sx={{ mb: 0.5 }}>
      <ListItemButton
        onClick={onClick}
        sx={{
          borderRadius: 2,
          color: active ? 'primary.main' : 'text.secondary',
          bgcolor: active ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
          '&:hover': {
            bgcolor: active ? alpha(theme.palette.primary.main, 0.12) : (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'),
            color: active ? 'primary.main' : 'text.primary',
          }
        }}
      >
        <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>{icon}</ListItemIcon>
        <ListItemText primary={label} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: active ? 700 : 500 }} />
      </ListItemButton>
    </ListItem>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <Paper sx={{ p: 2, borderRadius: 3, boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 10px 40px rgba(0,0,0,0.5)' : '0 10px 40px rgba(0,0,0,0.1)', border: (theme) => `1px solid ${theme.palette.divider}` }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>{label}</Typography>
        {payload.map((p: any) => (
          <Box key={p.name} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.color }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{p.name}:</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, ml: 'auto' }}>{p.value}%</Typography>
          </Box>
        ))}
      </Paper>
    );
  }
  return null;
};
