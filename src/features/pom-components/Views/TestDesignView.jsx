import React, { useState, useRef, useEffect } from 'react';
import { Avatar, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogContent, DialogTitle, Divider, Grid, IconButton, LinearProgress, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { AlertCircle, ArrowRight, Brain, CheckCircle, Code, Copy, Download, Figma, FileText, Info, Layout, Plus, Sparkles, Star, Target, X, Zap } from 'lucide-react';
import { StatusSnackbar } from '../UI/StatusSnackbar';
import { alpha, useTheme } from '@mui/material/styles';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';

export function TestDesignView() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const { getAuthHeaders } = useAuth();

    const [userStory, setUserStory] = useState('');
    const [figmaUrl, setFigmaUrl] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [testCases, setTestCases] = useState([]);
    const [metadata, setMetadata] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingStage, setLoadingStage] = useState('');
    const [status, setStatus] = useState(null); // { message, severity }
    const [feedbackVisible, setFeedbackVisible] = useState(false);
    const [currentFeedback, setCurrentFeedback] = useState({ rating: 5, comments: '' });

    const fileInputRef = useRef(null);

    useEffect(() => {
        if (testCases.length > 0) {
            console.log("SUCCESS: State updated with test cases:", testCases);
        }
    }, [testCases]);

    // Fetch latest generated test cases on mount
    useEffect(() => {
        const fetchLatestData = async () => {
            try {
                const response = await axios.get(`${API_BASE}/latest`, authConfig());
                const { test_cases, metadata, user_story } = response.data;

                if (test_cases && test_cases.length > 0) {
                    setTestCases(test_cases);
                    setMetadata(metadata);
                    if (user_story) setUserStory(user_story);
                    console.log("Loaded last generated test cases:", test_cases.length);
                }
            } catch (error) {
                console.error("Failed to load latest test cases:", error);
            }
        };

        fetchLatestData();
    }, []);

    const API_BASE = '/api/playwright-pom/v1/test-design';
    const authConfig = (extraHeaders = {}) => ({
        headers: {
            ...getAuthHeaders(),
            ...extraHeaders,
        },
    });

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files).slice(0, 5);
        setAttachments(files);
    };

    const removeFile = (index) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const showNotification = (msg, severity) => {
        setStatus({ message: msg, severity: severity });
        setTimeout(() => setStatus(null), 4000);
    };

    const simulateLoadingProgress = () => {
        const stages = [
            { text: 'Analyzing requirements...', progress: 15 },
            { text: 'Processing attachments...', progress: 30 },
            { text: 'Fetching design context...', progress: 45 },
            { text: 'AI generating test scenarios...', progress: 70 },
            { text: 'Optimizing test coverage...', progress: 85 },
            { text: 'Finalizing Test Cases...', progress: 95 }
        ];

        let currentStage = 0;
        const interval = setInterval(() => {
            if (currentStage < stages.length) {
                setLoadingStage(stages[currentStage].text);
                setLoadingProgress(stages[currentStage].progress);
                currentStage++;
            } else {
                clearInterval(interval);
            }
        }, 800);

        return interval;
    };

    const handleGenerate = async () => {
        if (!userStory.trim() && attachments.length === 0 && !figmaUrl.trim()) {
            showNotification("Please provide at least one input (User Story, files, or Figma URL)", "error");
            return;
        }

        setLoading(true);
        setLoadingProgress(0);
        setLoadingStage('Initializing...');
        const progressInterval = simulateLoadingProgress();

        try {
            const formData = new FormData();
            formData.append('story', userStory);
            if (figmaUrl.trim()) formData.append('figma_url', figmaUrl);
            attachments.forEach(file => formData.append('attachments', file));

            const response = await axios.post(
                `${API_BASE}/generate`,
                formData,
                authConfig({ 'Content-Type': 'multipart/form-data' }),
            );

            console.log("RAW API RESPONSE:", response.data);

            clearInterval(progressInterval);
            setLoadingProgress(100);
            setLoadingStage('Success!');

            if (response.data && response.data.test_cases) {
                setTestCases(response.data.test_cases);
                setMetadata(response.data.metadata || null);
                showNotification(`Successfully generated ${response.data.test_cases.length} test cases`, "success");
            } else {
                console.error("No test cases in response:", response.data);
                showNotification("No test cases were generated. Please check your input.", "warning");
            }
        } catch (error) {
            console.error(error);
            clearInterval(progressInterval);
            showNotification("Failed to generate Test Cases", "error");
        } finally {
            setTimeout(() => {
                setLoading(false);
                setLoadingProgress(0);
                setLoadingStage('');
            }, 800);
        }
    };

    const handleFeedback = async () => {
        try {
            await axios.post(
                `${API_BASE}/feedback`,
                {
                    story_id: metadata?.story_id,
                    ...currentFeedback,
                },
                authConfig(),
            );
            showNotification("Thank you for your feedback!", "success");
            setFeedbackVisible(false);
        } catch (error) {
            showNotification("Failed to submit feedback", "error");
        }
    };

    const downloadCSV = () => {
        if (!testCases || testCases.length === 0) return;

        // Helper to escape CSV fields
        const escapeCsvField = (field) => {
            if (field === null || field === undefined) return '""';
            let stringField = String(field);
            // Replace any escaped newlines
            stringField = stringField.replace(/\\n/g, '\n');
            // Wrap in quotes if needed
            if (stringField.includes('"') || stringField.includes(',') || stringField.includes('\n') || stringField.includes('\r')) {
                return `"${stringField.replace(/"/g, '""')}"`;
            }
            return stringField;
        };

        const headers = ["ID", "Title", "Priority", "Preconditions", "Step", "Expected Result", "Mapping"];
        const rows = [];

        testCases.forEach(tc => {
            // Split steps and expected results into lines
            const stepLines = (tc.steps || "").split('\n').filter(l => l.trim());
            const expectedLines = (tc.expected || "").split('\n').filter(l => l.trim());

            // Determine how many rows we need (max of steps or expected)
            const rowCount = Math.max(stepLines.length, expectedLines.length, 1);

            for (let i = 0; i < rowCount; i++) {
                rows.push([
                    // Only show ID/Title/Priority/Preconds/Mapping on the first line of the test case
                    // OR repeat them? Usually repeated is safer for "Row per step" imports.
                    // Let's repeat them to ensure context is preserved for every step row.
                    tc.id,
                    tc.title,
                    tc.priority || "Medium",
                    tc.preconditions || "",
                    stepLines[i] || "",     // Single step line
                    expectedLines[i] || "", // Single expected line (matched by index)
                    tc.requirement_mapping || ""
                ].map(escapeCsvField).join(","));
            }
        });

        const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `test_cases_${metadata?.story_id || 'export'}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const copyToClipboard = () => {
        const text = testCases.map(tc =>
            `ID: ${tc.id}\nTitle: ${tc.title}\nSteps:\n${tc.steps}\nExpected: ${tc.expected}\n`
        ).join('\n---\n\n');
        navigator.clipboard.writeText(text);
        showNotification("Test Cases copied to clipboard!", "success");
    };

    const [showDebugModal, setShowDebugModal] = useState(false);
    const [debugModalData, setDebugModalData] = useState({ title: '', content: '' });

    const openDebugModal = (title, content) => {
        setDebugModalData({ title, content });
        setShowDebugModal(true);
    };

    return (
        <Box sx={{
            height: 'calc(100vh - 64px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        }}>
            <Dialog open={showDebugModal} onClose={() => setShowDebugModal(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ py: 1.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Sparkles size={18} color={theme.palette.error.main} />
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                {debugModalData.title}
                            </Typography>
                        </Stack>
                        <IconButton size="small" onClick={() => setShowDebugModal(false)} sx={{ color: 'text.secondary' }}>
                            <X size={16} />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent dividers sx={{ p: 2 }}>
                    <Paper
                        variant="outlined"
                        sx={{
                            p: 1.5,
                            borderRadius: 1.5,
                            bgcolor: isDark ? alpha(theme.palette.common.black, 0.35) : alpha(theme.palette.common.black, 0.02),
                            borderColor: 'divider',
                        }}
                    >
                        <Typography
                            component="pre"
                            sx={{
                                m: 0,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                fontFamily: 'monospace',
                                fontSize: '0.78rem',
                                color: 'text.secondary',
                            }}
                        >
                            {debugModalData.content}
                        </Typography>
                    </Paper>
                </DialogContent>
            </Dialog>

            <StatusSnackbar status={status} onClose={() => setStatus(null)} />


            {/* Content Area */}
            <Box sx={{
                flex: 1,
                p: 2,
                minHeight: 0,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'background-color 0.3s',
                boxSizing: 'border-box'
            }}>
                <Grid container spacing={2} sx={{ height: '100%', width: '100%' }}>
                    {/* Left Column - Inputs */}
                    <Grid size={{ xs: 12, lg: 5 }} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Paper sx={{
                            p: 3,
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 3,
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: isDark ? alpha('#161B22', 0.8) : alpha('#ffffff', 0.9),
                            backdropFilter: 'blur(10px)',
                            overflowY: 'auto'
                        }}>
                            <Box>
                                <Typography component="div" sx={{ mb: 1.5, fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.6, letterSpacing: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <FileText size={18} color={theme.palette.error.main} /> Requirements / User Story
                                </Typography>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={8}
                                    placeholder="Describe the feature or paste your user story here..."
                                    value={userStory}
                                    onChange={(e) => setUserStory(e.target.value)}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.01),
                                            '&:hover fieldset': {
                                                borderColor: theme.palette.primary.main
                                            },
                                            '&.Mui-focused fieldset': {
                                                borderColor: theme.palette.primary.main
                                            }
                                        }
                                    }}
                                />
                            </Box>

                            <Box>
                                <Typography component="div" sx={{ mb: 1.5, fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.6, letterSpacing: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Figma size={18} color={theme.palette.error.main} /> Figma Design (Optional)
                                </Typography>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="https://www.figma.com/file/..."
                                    value={figmaUrl}
                                    onChange={(e) => setFigmaUrl(e.target.value)}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            '&:hover fieldset': {
                                                borderColor: theme.palette.primary.main
                                            },
                                            '&.Mui-focused fieldset': {
                                                borderColor: theme.palette.primary.main
                                            }
                                        }
                                    }}
                                />
                            </Box>

                            <Box>
                                <Typography component="div" sx={{ mb: 1.5, fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.6, letterSpacing: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Plus size={18} color={theme.palette.error.main} /> Attachments (PDF/Images)
                                </Typography>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*,application/pdf"
                                    onChange={handleFileUpload}
                                    hidden
                                    id="file-upload"
                                />
                                <Box component="label" htmlFor="file-upload" sx={{ display: 'block' }}>
                                    <Box sx={{
                                        p: 2, border: '2px dashed', borderColor: 'divider', borderRadius: 2,
                                        textAlign: 'center', cursor: 'pointer',
                                        '&:hover': { borderColor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.05) }
                                    }}>
                                        <Typography variant="body2" color="text.secondary">
                                            Click to upload or drag and drop
                                        </Typography>
                                    </Box>
                                </Box>
                                {attachments.length > 0 && (
                                    <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 1 }}>
                                        {attachments.map((file, idx) => (
                                            <Chip
                                                key={idx}
                                                label={file.name}
                                                onDelete={() => removeFile(idx)}
                                                size="small"
                                                variant="outlined"
                                            />
                                        ))}
                                    </Stack>
                                )}
                            </Box>

                            <Box sx={{ mt: 'auto' }}>
                                <Button
                                    variant="contained"
                                    color="error"
                                    size="small"
                                    fullWidth
                                    onClick={handleGenerate}
                                    disabled={loading}
                                    startIcon={<Sparkles size={14} />}
                                >
                                    {loading ? "Generating..." : "Generate Test Cases Using AI"}
                                </Button>
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Right Column - Results */}
                    <Grid size={{ xs: 12, lg: 7 }} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Paper sx={{
                            p: 0,
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            borderRadius: 1,
                            overflow: 'hidden',
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: isDark ? alpha('#161B22', 0.8) : alpha('#ffffff', 0.9),
                            backdropFilter: 'blur(10px)',
                        }}>
                            <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.02) }}>
                                <Typography component="div" sx={{ m: 0, fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.6, letterSpacing: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Zap size={18} color={theme.palette.error.main} /> Generated Test Scenarios {testCases.length > 0 && `(${testCases.length})`}
                                </Typography>
                                {testCases.length > 0 && (
                                    <Stack direction="row" spacing={1}>
                                        {/* Debug: Extracted Content */}
                                        {metadata?.extracted_content && metadata.extracted_content.length > 0 && (
                                            <IconButton
                                                size="small"
                                                color="info"
                                                title="View Extracted Context"
                                                onClick={() => openDebugModal(
                                                    'Extracted Source Content',
                                                    metadata.extracted_content.map(t => typeof t === 'string' ? t : JSON.stringify(t, null, 2)).join('\n\n---\n\n')
                                                )}
                                            >
                                                <Info size={18} color={theme.palette.error.main} />
                                            </IconButton>
                                        )}

                                        {/* Debug: Full Prompt */}
                                        {metadata?.full_prompt && (
                                            <IconButton
                                                size="small"
                                                color="secondary"
                                                title="View AI Prompt"
                                                onClick={() => openDebugModal(
                                                    'AI Prompt Preview',
                                                    metadata.full_prompt
                                                )}
                                            >
                                                <Code size={18} color={theme.palette.error.main} />
                                            </IconButton>
                                        )}

                                        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

                                        <IconButton size="small" onClick={copyToClipboard} title="Copy to Clipboard">
                                            <Copy size={18} color={theme.palette.error.main} />
                                        </IconButton>
                                        <IconButton size="small" onClick={downloadCSV} title="Download CSV" color="success">
                                            <Download size={18} color={theme.palette.error.main} />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={() => setFeedbackVisible(!feedbackVisible)}
                                            color={feedbackVisible ? "primary" : "default"}
                                            title="Provide Feedback"
                                        >
                                            <Star size={18} color={theme.palette.error.main} />
                                        </IconButton>
                                    </Stack>
                                )}
                            </Box>

                            <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
                                {feedbackVisible && testCases.length > 0 && (
                                    <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: alpha(theme.palette.primary.main, 0.02), borderColor: 'primary.main', borderRadius: 2 }}>
                                        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>Rate AI Generated Test Cases Quality</Typography>
                                        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <IconButton
                                                    key={star}
                                                    size="small"
                                                    onClick={() => setCurrentFeedback({ ...currentFeedback, rating: star })}
                                                    color={currentFeedback.rating >= star ? "warning" : "default"}
                                                >
                                                    <Star
                                                        size={20}
                                                        fill={currentFeedback.rating >= star ? theme.palette.error.main : 'transparent'}
                                                        color={currentFeedback.rating >= star ? theme.palette.error.main : alpha(theme.palette.error.main, 0.35)}
                                                    />
                                                </IconButton>
                                            ))}
                                        </Stack>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            placeholder="What could be improved?"
                                            value={currentFeedback.comments}
                                            onChange={(e) => setCurrentFeedback({ ...currentFeedback, comments: e.target.value })}
                                            sx={{ mb: 2 }}
                                        />
                                        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                                            <Button
                                                variant="contained"
                                                color="error"
                                                size="small"
                                                onClick={handleFeedback}
                                                startIcon={<CheckCircle size={14} />}
                                            >
                                                Submit
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                color="inherit"
                                                size="small"
                                                onClick={() => setFeedbackVisible(false)}
                                                startIcon={<X size={14} />}
                                            >
                                                Cancel
                                            </Button>
                                        </Box>
                                    </Paper>
                                )}

                                {loading ? (
                                    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                                        <Stack alignItems="center" spacing={1}>
                                            <CircularProgress size={28} />
                                            <Brain size={52} color={theme.palette.error.main} />
                                        </Stack>
                                        <Box sx={{ width: '100%', maxWidth: 400 }}>
                                            <Typography variant="h6" align="center" gutterBottom>{loadingStage}</Typography>
                                            <LinearProgress
                                                variant="determinate"
                                                value={loadingProgress}
                                                sx={{
                                                    height: 10,
                                                    borderRadius: 5,
                                                    bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                                    '& .MuiLinearProgress-bar': {
                                                        backgroundColor: '#D00000'
                                                    }
                                                }}
                                            />
                                            <Typography align="right" variant="caption" display="block" sx={{ mt: 1 }}>{loadingProgress}%</Typography>
                                        </Box>
                                    </Box>
                                ) : testCases.length > 0 ? (
                                    <Stack spacing={2}>
                                        {testCases.map((tc, idx) => (
                                            <Card key={idx} variant="outlined" sx={{
                                                borderRadius: 2,
                                                transition: 'all 0.2s',
                                                '&:hover': {
                                                    boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                                                    borderColor: 'primary.main',
                                                    transform: 'translateY(-2px)'
                                                }
                                            }}>
                                                <CardContent sx={{ p: 2.5 }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                            <Chip
                                                                label={tc.id}
                                                                size="small"
                                                                sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}
                                                            />
                                                            <Chip
                                                                label={tc.priority || 'Medium'}
                                                                size="small"
                                                                variant="outlined"
                                                                sx={{
                                                                    borderColor: tc.priority === 'High' ? 'error.main' : 'warning.main',
                                                                    color: tc.priority === 'High' ? 'error.main' : 'warning.main'
                                                                }}
                                                            />
                                                        </Stack>
                                                    </Box>
                                                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>{tc.title}</Typography>

                                                    <Grid container spacing={2}>
                                                        <Grid size={{ xs: 12, md: 6 }}>
                                                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5 }}>TEST STEPS</Typography>
                                                            <Typography variant="body2" sx={{ whiteSpace: 'pre-line', color: 'text.primary' }}>{tc.steps}</Typography>
                                                        </Grid>
                                                        <Grid size={{ xs: 12, md: 6 }}>
                                                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5 }}>EXPECTED RESULT</Typography>
                                                            <Typography variant="body2" sx={{ color: 'text.primary' }}>{tc.expected}</Typography>
                                                        </Grid>
                                                    </Grid>

                                                    {tc.requirement_mapping && (
                                                        <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: alpha(theme.palette.divider, 0.3) }}>
                                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                <Target size={12} color={theme.palette.error.main} /> Mapping: {tc.requirement_mapping}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </Stack>
                                ) : testCases.length === 0 && metadata ? (
                                    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.8, color: 'warning.main' }}>
                                        <Box sx={{ mb: 2 }}>
                                            <AlertCircle size={64} color={theme.palette.error.main} />
                                        </Box>
                                        <Typography variant="h6">No Scenarios Detected</Typography>
                                        <Typography variant="body2">The AI didn't find specific testable requirements. Try adding more detail to your user story.</Typography>
                                    </Box>
                                ) : (
                                    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                                        <Box sx={{ mb: 2 }}>
                                            <Sparkles size={64} color={theme.palette.error.main} />
                                        </Box>
                                        <Typography variant="h6">Ready to generate intelligence</Typography>
                                        <Typography variant="body2">Fill in the requirements and click Generate</Typography>
                                    </Box>
                                )}
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
            </Box>

        </Box>
    );
}
