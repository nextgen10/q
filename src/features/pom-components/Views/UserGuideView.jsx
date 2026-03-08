import React, { useState, useRef, useEffect } from 'react';
import { Alert, Box, Card, CardContent, Chip, Divider, Grid, IconButton, Link, List, ListItem, ListItemButton, ListItemText, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { Activity, AlertCircle, Book, Bug, Camera, CheckCircle, ChevronRight, Code, FileCode, FolderOpen, HelpCircle, Lightbulb, MousePointer, Play, Rocket, Settings, Sparkles, Star, Target, Terminal, TrendingUp, Video, Wand2, Zap } from 'lucide-react';
import { StatusSnackbar } from '../UI/StatusSnackbar';
import { alpha, useTheme } from '@mui/material/styles';

export function UserGuideView() {
    const theme = useTheme();
    const [status, setStatus] = useState(null);
    const [activeSection, setActiveSection] = useState('introduction');
    const contentRef = useRef(null);
    const sectionRefs = useRef({});

    const scrollToSection = (sectionId) => {
        setActiveSection(sectionId);
        const element = sectionRefs.current[sectionId];
        const container = contentRef.current;

        if (element && container) {
            // Get the element's position relative to the container scrollTop
            const top = element.offsetTop - 32; // 32px offset
            container.scrollTo({
                top: top,
                behavior: 'smooth'
            });
        }
    };

    const styles = {
        sectionTitle: {
            fontWeight: 800,
            mb: 2.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            fontSize: '1.125rem'
        },
        subTitle: {
            fontWeight: 700,
            mb: 2,
            mt: 3,
            fontSize: '0.875rem',
            color: theme.palette.text.primary
        },
        card: {
            height: '100%',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            transition: 'all 0.3s ease',
            '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: theme.shadows[4]
            }
        },
        stepBox: {
            position: 'relative',
            pl: 3,
            borderLeft: `2px solid ${theme.palette.divider}`,
            mb: 2.5,
            pb: 1
        },
        stepDot: {
            position: 'absolute',
            left: -9,
            top: 0,
            width: 16,
            height: 16,
            borderRadius: '50%',
            bgcolor: 'background.paper',
            border: `4px solid ${theme.palette.primary.main}`
        },
        codeBlock: (color) => ({
            p: 2,
            borderRadius: 2,
            bgcolor: alpha(color, 0.1),
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            border: `1px solid ${alpha(color, 0.2)}`,
            my: 1
        })
    };

    const navigation = [
        { id: 'introduction', label: 'Introduction' },
        { id: 'getting-started', label: 'Getting Started' },
        { id: 'test-design', label: 'Test Design' },
        { id: 'test-studio', label: 'Test Studio' },
        { id: 'test-execution', label: 'Test Execution' },
        { id: 'manage-locators', label: 'Manage Locators' },
        { id: 'heal-recording', label: 'Heal Recording' },
        { id: 'ai-prompts', label: 'AI Prompts' },
        { id: 'configuration', label: 'Configuration' },
        { id: 'architecture', label: 'Architecture' },
        { id: 'roi-savings', label: 'ROI & Savings' },
        { id: 'best-practices', label: 'Best Practices' },
        { id: 'troubleshooting', label: 'Troubleshooting' },
    ];

    // Scroll Spy
    useEffect(() => {
        const container = contentRef.current;
        if (!container) return;

        const handleScroll = () => {
            const containerTop = container.scrollTop;

            // Find the active section
            let currentSection = navigation[0].id;

            for (const item of navigation) {
                const element = sectionRefs.current[item.id];
                if (element) {
                    // Check if we've scrolled past this section (with some offset)
                    // element.offsetTop is relative to the container now due to position: relative
                    if (containerTop >= (element.offsetTop - 100)) {
                        currentSection = item.id;
                    }
                }
            }

            if (currentSection !== activeSection) {
                setActiveSection(currentSection);
            }
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // Check initial position

        return () => container.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            <StatusSnackbar status={status} onClose={() => setStatus(null)} />


            {/* Main Layout */}
            <Box sx={{
                flex: 1,
                minHeight: 0,
                position: 'relative',
                p: 2
            }}>
                <Paper sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    borderRadius: 1
                }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, pt: 1.5, pb: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Book size={16} color={theme.palette.error.main} />
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                User Guide
                            </Typography>
                        </Stack>
                        <Tooltip title="Back to top">
                            <IconButton
                                size="small"
                                sx={{ color: 'error.main' }}
                                onClick={() => {
                                    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                                    setActiveSection('introduction');
                                }}
                            >
                                <ChevronRight size={14} color={theme.palette.error.main} style={{ transform: 'rotate(-90deg)' }} />
                            </IconButton>
                        </Tooltip>
                    </Stack>

                    {/* Content Area */}
                    <Box
                        ref={contentRef}
                        sx={{
                            position: 'relative',
                            flex: 1,
                            overflowY: 'auto',
                            px: 3,
                            pb: 3,
                            scrollBehavior: 'smooth',
                            '&::-webkit-scrollbar': { width: '10px' },
                            '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                            '&::-webkit-scrollbar-thumb': {
                                backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                                borderRadius: '10px'
                            }
                        }}
                    >
                        <Box sx={{ maxWidth: '1200px', mx: 'auto', display: 'flex', gap: 4 }}>

                            {/* Main Content Column */}
                            <Box sx={{ flex: 1, maxWidth: '850px' }}>

                                {/* 1. Introduction */}
                                <Box ref={el => sectionRefs.current['introduction'] = el} sx={{ mb: 6 }}>
                                    <Typography variant="h6" sx={styles.sectionTitle}>
                                        <HelpCircle size={24} color={theme.palette.error.main} />
                                        Introduction
                                    </Typography>

                                    <Typography variant="body1" paragraph sx={{ lineHeight: 1.8, color: 'text.secondary' }}>
                                        <strong>COMPASS</strong> (Comprehensive Automated Page Object Model with AI Support System) is an intelligent test automation framework that revolutionizes how you create and maintain web tests. Built on Microsoft Playwright and Python, it combines powerful browser automation with AI capabilities to make testing faster, smarter, and more reliable.
                                    </Typography>

                                    <Typography variant="body1" paragraph sx={{ lineHeight: 1.8, color: 'text.secondary' }}>
                                        Whether you're a QA engineer, developer, or automation specialist, COMPASS helps you create robust test suites without writing code from scratch. The framework follows the Page Object Model (POM) pattern, ensuring your tests are maintainable and scalable.
                                    </Typography>

                                    <Typography sx={styles.subTitle}>What Makes COMPASS Special?</Typography>
                                    <Grid container spacing={3} sx={{ mt: 1, mb: 3 }}>
                                        {[
                                            { icon: Sparkles, title: 'AI-Powered Test Design', desc: 'Generate comprehensive test scenarios from requirements, user stories, or Figma designs', color: '#9c27b0' },
                                            { icon: MousePointer, title: 'No-Code Recording', desc: 'Record browser interactions naturally - no coding required during recording', color: '#D00000' },
                                            { icon: Zap, title: 'Smart Code Generation', desc: 'AI converts recordings into clean, maintainable Page Object Model code', color: '#ff9800' },
                                            { icon: Activity, title: 'Self-Healing Tests', desc: 'AI automatically detects and suggests fixes for broken tests', color: '#e91e63' },
                                            { icon: Target, title: 'Intelligent Locators', desc: 'AI-assisted locator management for stable, reliable element selection', color: '#f44336' },
                                            { icon: CheckCircle, title: 'Comprehensive Reporting', desc: 'Detailed HTML reports with screenshots and execution logs', color: '#4caf50' }
                                        ].map((item, idx) => (
                                            <Grid item xs={12} md={6} lg={4} key={idx}>
                                                <Card sx={styles.card}>
                                                    <CardContent>
                                                        <Box sx={{ mb: 1.5, display: 'flex' }}>
                                                            <item.icon size={24} color={theme.palette.error.main} />
                                                        </Box>
                                                        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>{item.title}</Typography>
                                                        <Typography variant="body1" color="text.secondary">{item.desc}</Typography>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        ))}
                                    </Grid>

                                    <Typography sx={styles.subTitle}>Who Should Use COMPASS?</Typography>
                                    <List dense sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 2, mb: 2 }}>
                                        <ListItem>• <strong>QA Engineers</strong> - Create automated tests faster with AI assistance</ListItem>
                                        <ListItem>• <strong>Developers</strong> - Integrate testing into your development workflow</ListItem>
                                        <ListItem>• <strong>Test Automation Specialists</strong> - Build scalable test frameworks with POM best practices</ListItem>
                                        <ListItem>• <strong>Teams New to Automation</strong> - Get started quickly with guided workflows and AI help</ListItem>
                                    </List>
                                </Box>

                                <Divider sx={{ mb: 6 }} />

                                {/* 2. Getting Started */}
                                <Box ref={el => sectionRefs.current['getting-started'] = el} sx={{ mb: 6 }}>
                                    <Typography variant="h6" sx={styles.sectionTitle}>
                                        <Rocket size={24} color={theme.palette.error.main} />
                                        Getting Started
                                    </Typography>

                                    <Typography variant="body1" paragraph sx={{ lineHeight: 1.8, color: 'text.secondary' }}>
                                        Follow these steps to set up COMPASS on your machine. The entire setup takes about 10-15 minutes.
                                    </Typography>

                                    <Typography sx={styles.subTitle}>Prerequisites</Typography>
                                    <Paper variant="outlined" sx={{ p: 3, mb: 2.5, bgcolor: 'background.paper', borderRadius: 2 }}>
                                        <Typography variant="body1" gutterBottom fontWeight="bold">Before you begin, make sure you have:</Typography>
                                        <List dense>
                                            <ListItem>
                                                <CheckCircle size={16} color={theme.palette.error.main} />
                                                <ListItemText
                                                    primary="Python 3.8 or higher"
                                                    secondary="Check with: python3 --version"
                                                    sx={{ ml: 1 }}
                                                    primaryTypographyProps={{ variant: 'body1' }}
                                                    secondaryTypographyProps={{ variant: 'body2' }}
                                                />
                                            </ListItem>
                                            <ListItem>
                                                <CheckCircle size={16} color={theme.palette.error.main} />
                                                <ListItemText
                                                    primary="Node.js 16 or higher"
                                                    secondary="Check with: node --version"
                                                    sx={{ ml: 1 }}
                                                    primaryTypographyProps={{ variant: 'body1' }}
                                                    secondaryTypographyProps={{ variant: 'body2' }}
                                                />
                                            </ListItem>
                                            <ListItem>
                                                <CheckCircle size={16} color={theme.palette.error.main} />
                                                <ListItemText
                                                    primary="Git (for cloning the repository)"
                                                    secondary="Check with: git --version"
                                                    sx={{ ml: 1 }}
                                                    primaryTypographyProps={{ variant: 'body1' }}
                                                    secondaryTypographyProps={{ variant: 'body2' }}
                                                />
                                            </ListItem>
                                            <ListItem>
                                                <CheckCircle size={16} color={theme.palette.error.main} />
                                                <ListItemText
                                                    primary="AI API Key (Gemini or OpenAI)"
                                                    secondary="Required for AI features - get from Google AI Studio or OpenAI"
                                                    sx={{ ml: 1 }}
                                                    primaryTypographyProps={{ variant: 'body1' }}
                                                    secondaryTypographyProps={{ variant: 'body2' }}
                                                />
                                            </ListItem>
                                        </List>
                                    </Paper>

                                    <Typography sx={styles.subTitle}>Step 1: Clone the Repository</Typography>
                                    <Paper variant="outlined" sx={{ p: 3, mb: 2.5, bgcolor: 'background.paper', borderRadius: 2 }}>
                                        <Typography variant="body1" gutterBottom>Open your terminal and run:</Typography>
                                        <Typography component="pre" sx={styles.codeBlock('#10b981')}>
{`git clone <repository-url>
cd playwright_pom_framework`}
                                        </Typography>
                                    </Paper>

                                    <Typography sx={styles.subTitle}>Step 2: Install Python Dependencies</Typography>
                                    <Paper variant="outlined" sx={{ p: 3, mb: 2.5, bgcolor: 'background.paper', borderRadius: 2 }}>
                                        <Typography variant="body1" gutterBottom>Install required Python packages and Playwright browsers:</Typography>
                                        <Typography component="pre" sx={styles.codeBlock('#10b981')}>
{`pip install -r requirements.txt
playwright install`}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                            💡 This installs Playwright, Pytest, FastAPI, and other dependencies. Browser installation may take a few minutes.
                                        </Typography>
                                    </Paper>

                                    <Typography sx={styles.subTitle}>Step 3: Install Frontend Dependencies</Typography>
                                    <Paper variant="outlined" sx={{ p: 3, mb: 2.5, bgcolor: 'background.paper', borderRadius: 2 }}>
                                        <Typography variant="body1" gutterBottom>Navigate to the frontend folder and install npm packages:</Typography>
                                        <Typography component="pre" sx={styles.codeBlock('#10b981')}>
{`cd studio/frontend
npm install
cd ../..`}
                                        </Typography>
                                    </Paper>

                                    <Typography sx={styles.subTitle}>Step 4: Configure AI API Key</Typography>
                                    <Paper variant="outlined" sx={{ p: 3, mb: 2.5, bgcolor: 'background.paper', borderRadius: 2 }}>
                                        <Typography variant="body1" gutterBottom>Set up your AI API key for intelligent features:</Typography>
                                        <List dense>
                                            <ListItem>1. Navigate to <strong>Configuration</strong> page in the UI (after starting the app)</ListItem>
                                            <ListItem>2. Select your AI provider (Gemini or OpenAI)</ListItem>
                                            <ListItem>3. Enter your API key</ListItem>
                                            <ListItem>4. Click Save</ListItem>
                                        </List>
                                        <Alert severity="info" sx={{ mt: 2 }}>
                                            <Stack spacing={0.5}>
                                                <Typography variant="body2" fontWeight={700}>Getting API Keys</Typography>
                                                <Typography variant="body2">
                                                    Gemini:{" "}
                                                    <Link href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener">
                                                        Google AI Studio
                                                    </Link>
                                                </Typography>
                                                <Typography variant="body2">
                                                    OpenAI:{" "}
                                                    <Link href="https://platform.openai.com/api-keys" target="_blank" rel="noopener">
                                                        OpenAI Platform
                                                    </Link>
                                                </Typography>
                                            </Stack>
                                        </Alert>
                                    </Paper>

                                    <Typography sx={styles.subTitle}>Step 5: Start the Application</Typography>
                                    <Typography variant="body1" paragraph color="text.secondary">
                                        You need to run both the backend and frontend servers. Open two terminal windows:
                                    </Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} md={6}>
                                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                                                <Chip label="Terminal 1 - Backend" color="primary" size="small" sx={{ mb: 2 }} />
                                                <Typography component="pre" sx={styles.codeBlock('#D00000')}>
{`cd studio/backend
python3 -m uvicorn main:app --reload`}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                                    ✅ Backend runs on: http://localhost:8000
                                                </Typography>
                                            </Paper>
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                                                <Chip label="Terminal 2 - Frontend" color="secondary" size="small" sx={{ mb: 2 }} />
                                                <Typography component="pre" sx={styles.codeBlock('#9c27b0')}>
{`cd studio/frontend
npm run dev`}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                                    ✅ Frontend runs on: http://localhost:5173
                                                </Typography>
                                            </Paper>
                                        </Grid>
                                    </Grid>

                                    <Typography sx={{ ...styles.subTitle, mt: 3 }}>Step 6: Access the Application</Typography>
                                    <Paper variant="outlined" sx={{ p: 3, bgcolor: alpha('#10b981', 0.05), borderRadius: 2, border: `1px solid ${alpha('#10b981', 0.2)}` }}>
                                        <Typography variant="body1" gutterBottom>
                                            <strong>🎉 You're all set!</strong> Open your browser and navigate to:
                                        </Typography>
                                        <Box sx={{ ...styles.codeBlock('#10b981'), mt: 2 }}>
                                            http://localhost:5173
                                        </Box>
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                                            💡 <strong>First-time users:</strong> Start with the <strong>Test Design</strong> page to generate test scenarios, or jump to <strong>Test Studio</strong> to record your first test!
                                        </Typography>
                                    </Paper>

                                    <Typography sx={{ ...styles.subTitle, mt: 3 }}>Quick Start Workflow</Typography>
                                    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                                        <Typography variant="body1" gutterBottom fontWeight="bold">Try this simple workflow to get familiar:</Typography>
                                        <Box sx={{ mt: 2 }}>
                                            <Box sx={styles.stepBox}>
                                                <Box sx={styles.stepDot} />
                                                <Typography variant="subtitle2" fontWeight="bold">1. Record a Test</Typography>
                                                <Typography variant="body1" color="text.secondary">
                                                    Go to <strong>Test Studio</strong> → Click "Start Recording" → Interact with a website → Close browser
                                                </Typography>
                                            </Box>
                                            <Box sx={styles.stepBox}>
                                                <Box sx={styles.stepDot} />
                                                <Typography variant="subtitle2" fontWeight="bold">2. Generate POM Code</Typography>
                                                <Typography variant="body1" color="text.secondary">
                                                    Review the raw recording → Click "Generate POM" → AI creates clean code
                                                </Typography>
                                            </Box>
                                            <Box sx={styles.stepBox}>
                                                <Box sx={styles.stepDot} />
                                                <Typography variant="subtitle2" fontWeight="bold">3. Run Your Test</Typography>
                                                <Typography variant="body1" color="text.secondary">
                                                    Go to <strong>Test Execution</strong> → Select your test → Click "Run Selected"
                                                </Typography>
                                            </Box>
                                            <Box sx={{ ...styles.stepBox, borderLeft: 'none' }}>
                                                <Box sx={styles.stepDot} />
                                                <Typography variant="subtitle2" fontWeight="bold">4. View Results</Typography>
                                                <Typography variant="body1" color="text.secondary">
                                                    Check execution status → Download HTML report for detailed analysis
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Paper>
                                </Box>

                                <Divider sx={{ mb: 6 }} />

                                {/* 3. Test Design */}
                                <Box ref={el => sectionRefs.current['test-design'] = el} sx={{ mb: 6 }}>
                                    <Typography variant="h6" sx={styles.sectionTitle}>
                                        <Sparkles size={24} color={theme.palette.error.main} />
                                        Test Design
                                    </Typography>
                                    <Typography variant="body1" paragraph color="text.secondary">
                                        AI-powered test scenario generation from requirements and user stories.
                                    </Typography>

                                    <Box sx={{ mt: 4 }}>
                                        <Box sx={styles.stepBox}>
                                            <Box sx={styles.stepDot} />
                                            <Typography variant="subtitle2" fontWeight="bold">1. Enter Requirements</Typography>
                                            <Typography variant="body1" color="text.secondary" paragraph>
                                                Paste your user stories, acceptance criteria, or feature descriptions in the Requirements field.
                                            </Typography>
                                        </Box>

                                        <Box sx={styles.stepBox}>
                                            <Box sx={styles.stepDot} />
                                            <Typography variant="subtitle2" fontWeight="bold">2. Add Context (Optional)</Typography>
                                            <List dense sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 2 }}>
                                                <ListItem>• Figma Design URLs for UI context</ListItem>
                                                <ListItem>• Upload PDFs or images for visual reference</ListItem>
                                            </List>
                                        </Box>

                                        <Box sx={styles.stepBox}>
                                            <Box sx={styles.stepDot} />
                                            <Typography variant="subtitle2" fontWeight="bold">3. Generate Test Scenarios</Typography>
                                            <Typography variant="body1" color="text.secondary" paragraph>
                                                Click "Generate Test Cases Using AI" to create comprehensive test scenarios with steps and expected results.
                                            </Typography>
                                        </Box>

                                        <Box sx={{ ...styles.stepBox, borderLeft: 'none' }}>
                                            <Box sx={styles.stepDot} />
                                            <Typography variant="subtitle2" fontWeight="bold">4. Review & Export</Typography>
                                            <Typography variant="body1" color="text.secondary">
                                                Review generated scenarios, edit as needed, and export to CSV or copy to clipboard.
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>

                                <Divider sx={{ mb: 6 }} />

                                {/* 4. Test Studio */}
                                <Box ref={el => sectionRefs.current['test-studio'] = el} sx={{ mb: 6 }}>
                                    <Typography variant="h6" sx={styles.sectionTitle}>
                                        <Video size={24} color={theme.palette.error.main} />
                                        Test Studio
                                    </Typography>
                                    <Typography paragraph color="text.secondary">
                                        Record browser interactions and generate Page Object Model code.
                                    </Typography>

                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}>
                                            <Paper sx={{ p: 2.5, borderRadius: 2, height: '100%' }}>
                                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                                    <Camera size={20} color={theme.palette.error.main} />
                                                    <Typography variant="subtitle2" fontWeight="bold">Recording</Typography>
                                                </Stack>
                                                <List dense>
                                                    <ListItem sx={{ px: 0, py: 0.35 }}>
                                                        <ListItemText primaryTypographyProps={{ variant: 'body1' }} primary="1. Click 'Start Recording'" />
                                                    </ListItem>
                                                    <ListItem sx={{ px: 0, py: 0.35 }}>
                                                        <ListItemText primaryTypographyProps={{ variant: 'body1' }} primary="2. Perform actions in browser" />
                                                    </ListItem>
                                                    <ListItem sx={{ px: 0, py: 0.35 }}>
                                                        <ListItemText primaryTypographyProps={{ variant: 'body1' }} primary="3. Close browser to save" />
                                                    </ListItem>
                                                </List>
                                            </Paper>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <Paper sx={{ p: 2.5, borderRadius: 2, height: '100%' }}>
                                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                                    <FileCode size={20} color={theme.palette.error.main} />
                                                    <Typography variant="subtitle2" fontWeight="bold">Code Generation</Typography>
                                                </Stack>
                                                <List dense>
                                                    <ListItem sx={{ px: 0, py: 0.35 }}>
                                                        <ListItemText primaryTypographyProps={{ variant: 'body1' }} primary="1. Review raw recording" />
                                                    </ListItem>
                                                    <ListItem sx={{ px: 0, py: 0.35 }}>
                                                        <ListItemText primaryTypographyProps={{ variant: 'body1' }} primary="2. Click 'Generate POM'" />
                                                    </ListItem>
                                                    <ListItem sx={{ px: 0, py: 0.35 }}>
                                                        <ListItemText primaryTypographyProps={{ variant: 'body1' }} primary="3. Publish to framework" />
                                                    </ListItem>
                                                </List>
                                            </Paper>
                                        </Grid>
                                    </Grid>
                                </Box>

                                <Divider sx={{ mb: 6 }} />

                                {/* 5. Test Execution */}
                                <Box ref={el => sectionRefs.current['test-execution'] = el} sx={{ mb: 6 }}>
                                    <Typography variant="h6" sx={styles.sectionTitle}>
                                        <Play size={24} color={theme.palette.error.main} />
                                        Test Execution
                                    </Typography>
                                    <Typography paragraph color="text.secondary">
                                        Run tests with comprehensive reporting and result tracking.
                                    </Typography>

                                    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                                        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Execution Steps</Typography>
                                        <List dense>
                                            <ListItem>• Select test files from the folder tree</ListItem>
                                            <ListItem>• Use "Select All" for batch execution</ListItem>
                                            <ListItem>• Click "Run Selected" or "Run All"</ListItem>
                                            <ListItem>• Monitor real-time execution status</ListItem>
                                            <ListItem>• Download HTML reports for detailed analysis</ListItem>
                                        </List>
                                    </Paper>
                                </Box>

                                <Divider sx={{ mb: 6 }} />

                                {/* 6. Manage Locators */}
                                <Box ref={el => sectionRefs.current['manage-locators'] = el} sx={{ mb: 6 }}>
                                    <Typography variant="h6" sx={styles.sectionTitle}>
                                        <Target size={24} color={theme.palette.error.main} />
                                        Manage Locators
                                    </Typography>
                                    <Typography paragraph color="text.secondary">
                                        Centralized locator management with AI-powered optimization.
                                    </Typography>

                                    <Box sx={{ mt: 3 }}>
                                        <Box sx={{ mb: 3 }}>
                                            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Manual Editing</Typography>
                                            <List dense sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 2 }}>
                                                <ListItem sx={{ px: 0, py: 0.35 }}>
                                                    <ListItemText primaryTypographyProps={{ variant: 'body1' }} primary="1. Open Locator Manager from sidebar" />
                                                </ListItem>
                                                <ListItem sx={{ px: 0, py: 0.35 }}>
                                                    <ListItemText primaryTypographyProps={{ variant: 'body1' }} primary="2. Click ✏️ to edit any locator manually" />
                                                </ListItem>
                                                <ListItem sx={{ px: 0, py: 0.35 }}>
                                                    <ListItemText primaryTypographyProps={{ variant: 'body1' }} primary="3. Save changes to update locator file" />
                                                </ListItem>
                                            </List>
                                        </Box>

                                        <Box>
                                            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>AI Assistant</Typography>
                                            <List dense sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 2 }}>
                                                <ListItem sx={{ px: 0, py: 0.35 }}>
                                                    <ListItemText primaryTypographyProps={{ variant: 'body1' }} primary="• Click 🤖 to get AI suggestions for better locators" />
                                                </ListItem>
                                                <ListItem sx={{ px: 0, py: 0.35 }}>
                                                    <ListItemText primaryTypographyProps={{ variant: 'body1' }} primary="• AI analyzes context and recommends improvements" />
                                                </ListItem>
                                            </List>
                                        </Box>
                                    </Box>
                                </Box>

                                <Divider sx={{ mb: 6 }} />

                                {/* 7. Heal Recording */}
                                <Box ref={el => sectionRefs.current['heal-recording'] = el} sx={{ mb: 6 }}>
                                    <Typography variant="h6" sx={styles.sectionTitle}>
                                        <Activity size={24} color={theme.palette.error.main} />
                                        Heal Recording
                                    </Typography>
                                    <Typography paragraph color="text.secondary">
                                        Automatically detect and fix broken tests using AI.
                                    </Typography>

                                    <Box sx={{ mt: 4 }}>
                                        <Box sx={styles.stepBox}>
                                            <Box sx={styles.stepDot} />
                                            <Typography variant="subtitle2" fontWeight="bold">1. Select Failed Test</Typography>
                                            <Typography variant="body1" color="text.secondary" paragraph>
                                                Choose a recording that failed during execution.
                                            </Typography>
                                        </Box>

                                        <Box sx={styles.stepBox}>
                                            <Box sx={styles.stepDot} />
                                            <Typography variant="subtitle2" fontWeight="bold">2. Analyze Failures</Typography>
                                            <Typography variant="body1" color="text.secondary" paragraph>
                                                Click "Heal with AI" to analyze failure logs and identify issues.
                                            </Typography>
                                        </Box>

                                        <Box sx={styles.stepBox}>
                                            <Box sx={styles.stepDot} />
                                            <Typography variant="subtitle2" fontWeight="bold">3. Review Suggestions</Typography>
                                            <Typography variant="body1" color="text.secondary" paragraph>
                                                AI proposes fixes for broken locators and test logic.
                                            </Typography>
                                        </Box>

                                        <Box sx={{ ...styles.stepBox, borderLeft: 'none' }}>
                                            <Box sx={styles.stepDot} />
                                            <Typography variant="subtitle2" fontWeight="bold">4. Apply & Re-run</Typography>
                                            <Typography variant="body1" color="text.secondary">
                                                Accept suggestions, save changes, and re-run the test.
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>

                                <Divider sx={{ mb: 6 }} />

                                {/* 8. AI Prompts */}
                                <Box ref={el => sectionRefs.current['ai-prompts'] = el} sx={{ mb: 6 }}>
                                    <Typography variant="h6" sx={styles.sectionTitle}>
                                        <Wand2 size={24} color={theme.palette.error.main} />
                                        AI Prompts
                                    </Typography>
                                    <Typography paragraph color="text.secondary">
                                        Customize AI behavior by editing system prompts.
                                    </Typography>

                                    <Grid container spacing={2}>
                                        <Grid item xs={12}>
                                            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                                                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Available Prompts</Typography>
                                                <List dense>
                                                    <ListItem>• <b>Test Design Prompt</b> - Controls test scenario generation</ListItem>
                                                    <ListItem>• <b>Healing Prompt</b> - Guides test fixing logic</ListItem>
                                                    <ListItem>• <b>Locator Suggestion Prompt</b> - Directs locator recommendations</ListItem>
                                                </List>
                                                <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                                                    Edit prompts to emphasize specific testing approaches or patterns for your application.
                                                </Typography>
                                            </Paper>
                                        </Grid>
                                    </Grid>
                                </Box>

                                <Divider sx={{ mb: 6 }} />

                                {/* 9. Configuration */}
                                <Box ref={el => sectionRefs.current['configuration'] = el} sx={{ mb: 6 }}>
                                    <Typography variant="h6" sx={styles.sectionTitle}>
                                        <Settings size={24} color={theme.palette.error.main} />
                                        Configuration
                                    </Typography>
                                    <Typography paragraph color="text.secondary">
                                        Manage test environment settings and framework configuration.
                                    </Typography>

                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}>
                                            <Paper sx={{ p: 2.5, borderRadius: 2, height: '100%' }}>
                                                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Browser Settings</Typography>
                                                <List dense>
                                                    <ListItem sx={{ px: 0, py: 0.35 }}>
                                                        <ListItemText primaryTypographyProps={{ variant: 'body1' }} primary="• Default browser selection" />
                                                    </ListItem>
                                                    <ListItem sx={{ px: 0, py: 0.35 }}>
                                                        <ListItemText primaryTypographyProps={{ variant: 'body1' }} primary="• Headless mode toggle" />
                                                    </ListItem>
                                                    <ListItem sx={{ px: 0, py: 0.35 }}>
                                                        <ListItemText primaryTypographyProps={{ variant: 'body1' }} primary="• Viewport configuration" />
                                                    </ListItem>
                                                </List>
                                            </Paper>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <Paper sx={{ p: 2.5, borderRadius: 2, height: '100%' }}>
                                                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Test Settings</Typography>
                                                <List dense>
                                                    <ListItem sx={{ px: 0, py: 0.35 }}>
                                                        <ListItemText primaryTypographyProps={{ variant: 'body1' }} primary="• Base URL configuration" />
                                                    </ListItem>
                                                    <ListItem sx={{ px: 0, py: 0.35 }}>
                                                        <ListItemText primaryTypographyProps={{ variant: 'body1' }} primary="• Timeout values" />
                                                    </ListItem>
                                                    <ListItem sx={{ px: 0, py: 0.35 }}>
                                                        <ListItemText primaryTypographyProps={{ variant: 'body1' }} primary="• Screenshot & video settings" />
                                                    </ListItem>
                                                </List>
                                            </Paper>
                                        </Grid>
                                    </Grid>
                                </Box>

                                <Divider sx={{ mb: 6 }} />

                                {/* 10. Architecture */}
                                <Box ref={el => sectionRefs.current['architecture'] = el} sx={{ mb: 6 }}>
                                    <Typography variant="h6" sx={styles.sectionTitle}>
                                        <FolderOpen size={24} color={theme.palette.error.main} />
                                        System Architecture
                                    </Typography>
                                    <Typography paragraph color="text.secondary">
                                        Visual representation of framework components and data flow.
                                    </Typography>

                                    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, bgcolor: alpha('#00bcd4', 0.05) }}>
                                        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Components</Typography>
                                        <List dense>
                                            <ListItem>• Frontend (React + Material UI)</ListItem>
                                            <ListItem>• Backend (FastAPI + SQLite)</ListItem>
                                            <ListItem>• AI Engine (Gemini/OpenAI)</ListItem>
                                            <ListItem>• Playwright (Browser Automation)</ListItem>
                                            <ListItem>• Pytest (Test Framework)</ListItem>
                                        </List>
                                        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                                            Click "Architecture" in the sidebar to view the interactive flow diagram.
                                        </Typography>
                                    </Paper>
                                </Box>

                                <Divider sx={{ mb: 6 }} />

                                {/* 11. ROI & Savings */}
                                <Box ref={el => sectionRefs.current['roi-savings'] = el} sx={{ mb: 6 }}>
                                    <Typography variant="h6" sx={styles.sectionTitle}>
                                        <TrendingUp size={24} color={theme.palette.error.main} />
                                        ROI & Savings
                                    </Typography>
                                    <Typography paragraph color="text.secondary">
                                        Understand how the framework calculates automation benefits and savings.
                                    </Typography>

                                    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                            <Box sx={{ p: 1, borderRadius: 1, bgcolor: alpha('#D00000', 0.1), color: '#D00000', display: 'flex' }}>
                                                <FileCode size={20} color={theme.palette.error.main} />
                                            </Box>
                                            <Typography variant="subtitle1" fontWeight="bold">Formulas Used</Typography>
                                        </Box>

                                        <Grid container spacing={2}>
                                            <Grid item xs={12} md={6}>
                                                <Box sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight={600}>
                                                        Design Savings
                                                    </Typography>
                                                    <Box sx={styles.codeBlock('#D00000')}>
                                                        (Manual Design Mins - Auto Design Mins) × Total Tests
                                                    </Box>
                                                </Box>
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                                <Box sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight={600}>
                                                        Script Creation Savings
                                                    </Typography>
                                                    <Box sx={styles.codeBlock('#9c27b0')}>
                                                        (Manual Script Mins - Auto Script Mins) × Total Tests
                                                    </Box>
                                                </Box>
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                                <Box sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight={600}>
                                                        Execution Savings
                                                    </Typography>
                                                    <Box sx={styles.codeBlock('#ff9800')}>
                                                        (Manual Exec Mins × Total Tests) - Actual Auto Exec Time
                                                    </Box>
                                                </Box>
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                                <Box sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight={600}>
                                                        Total Time Saved
                                                    </Typography>
                                                    <Box sx={styles.codeBlock('#f44336')}>
                                                        Design Savings + Script Creation Savings + Execution Savings
                                                    </Box>
                                                </Box>
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                                <Box sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight={600}>
                                                        Total Manual Effort
                                                    </Typography>
                                                    <Box sx={styles.codeBlock('#ff5722')}>
                                                        (Manual Design + Script + Exec Mins) × Total Tests
                                                    </Box>
                                                </Box>
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                                <Box sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight={600}>
                                                        Total Project Manual Cost
                                                    </Typography>
                                                    <Box sx={styles.codeBlock('#795548')}>
                                                        Total Manual Effort (Hours) × Hourly Rate ($)
                                                    </Box>
                                                </Box>
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                                <Box sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight={600}>
                                                        Total Hard Savings ($)
                                                    </Typography>
                                                    <Box sx={styles.codeBlock('#4caf50')}>
                                                        Total Time Saved (Hours) × Hourly Rate ($)
                                                    </Box>
                                                </Box>
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                                <Box sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight={600}>
                                                        Total ROI (%)
                                                    </Typography>
                                                    <Box sx={styles.codeBlock('#00bcd4')}>
                                                        (Total Time Saved / Total Manual Effort) × 100
                                                    </Box>
                                                </Box>
                                            </Grid>
                                        </Grid>

                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5, mt: 4 }}>
                                            <Box sx={{ p: 1, borderRadius: 1, bgcolor: alpha('#9c27b0', 0.1), color: '#9c27b0', display: 'flex' }}>
                                                <TrendingUp size={20} color={theme.palette.error.main} />
                                            </Box>
                                            <Typography variant="subtitle1" fontWeight="bold">Advanced Business Metrics</Typography>
                                        </Box>

                                        <Grid container spacing={2}>
                                            <Grid item xs={12} md={6}>
                                                <Box sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight={600}>
                                                        Velocity Multiplier (x)
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary" paragraph>
                                                        Indicates how many times faster automation is compared to manual execution.
                                                    </Typography>
                                                    <Box sx={styles.codeBlock('#3f51b5')}>
                                                        Manual Exec Time / Actual Auto Exec Time
                                                    </Box>
                                                </Box>
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                                <Box sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight={600}>
                                                        Cost Savings Ratio
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary" paragraph>
                                                        The return on every dollar spent (ROI efficiency).
                                                    </Typography>
                                                    <Box sx={styles.codeBlock('#e91e63')}>
                                                        Projected Manual Cost / Actual Auto Cost
                                                    </Box>
                                                </Box>
                                            </Grid>
                                            <Grid item xs={12}>
                                                <Box sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight={600}>
                                                        Net Hard Savings (TCO Model)
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary" paragraph>
                                                        The true realized value after deducting operational friction and runner costs.
                                                    </Typography>
                                                    <Box sx={styles.codeBlock('#ff9800')}>
                                                        Gross Savings ($) - (Maintenance Cost + Infrastructure Cost)
                                                    </Box>
                                                    <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                                        <Box sx={{ bgcolor: alpha('#ff9800', 0.1), p: 1, borderRadius: 1 }}>
                                                            <Typography variant="caption" fontWeight="bold" color="text.primary">Maintenance Cost</Typography>
                                                            <Typography variant="caption" display="block" color="text.secondary">Gross Savings × Maintenance %</Typography>
                                                        </Box>
                                                        <Box sx={{ bgcolor: alpha('#ff9800', 0.1), p: 1, borderRadius: 1 }}>
                                                            <Typography variant="caption" fontWeight="bold" color="text.primary">Infra Cost</Typography>
                                                            <Typography variant="caption" display="block" color="text.secondary">Execution Hours × Hourly Node Cost</Typography>
                                                        </Box>
                                                    </Box>
                                                </Box>
                                            </Grid>
                                        </Grid>
                                    </Paper>
                                </Box>

                                <Divider sx={{ mb: 6 }} />

                                {/* 12. Best Practices */}
                                <Box ref={el => sectionRefs.current['best-practices'] = el} sx={{ mb: 6 }}>
                                    <Typography variant="h6" sx={styles.sectionTitle}>
                                        <TrendingUp size={24} color={theme.palette.error.main} />
                                        Best Practices
                                    </Typography>

                                    <Grid container spacing={3}>
                                        <Grid item xs={12} md={6}>
                                            <Card sx={{ bgcolor: alpha('#10b981', 0.05), border: 'none' }}>
                                                <CardContent>
                                                    <Typography variant="subtitle2" fontWeight="bold" color="success.main" gutterBottom>✅ Do's</Typography>
                                                    <List>
                                                        <ListItem>• Use <b>Page Object Model</b> structure</ListItem>
                                                        <ListItem>• Externalize data to <b>JSON files</b></ListItem>
                                                        <ListItem>• Use <b>data-testid</b> attributes when possible</ListItem>
                                                        <ListItem>• Add <b>assertions</b> for every step</ListItem>
                                                    </List>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <Card sx={{ bgcolor: alpha('#f44336', 0.05), border: 'none' }}>
                                                <CardContent>
                                                    <Typography variant="subtitle2" fontWeight="bold" color="error.main" gutterBottom>❌ Don'ts</Typography>
                                                    <List>
                                                        <ListItem>• Don't use <b>absolute XPaths</b></ListItem>
                                                        <ListItem>• Don't use <b>sleep()</b> statements</ListItem>
                                                        <ListItem>• Don't mix test data with logic</ListItem>
                                                        <ListItem>• Don't create monolithic test files</ListItem>
                                                    </List>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    </Grid>
                                </Box>

                                <Divider sx={{ mb: 6 }} />

                                {/* 7. Troubleshooting */}
                                <Box ref={el => sectionRefs.current['troubleshooting'] = el} sx={{ mb: 4 }}>
                                    <Typography variant="h6" sx={styles.sectionTitle}>
                                        <Bug size={24} color={theme.palette.error.main} />
                                        Troubleshooting
                                    </Typography>

                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                        {[
                                            { type: 'error', label: 'Error', title: 'Module not found', desc: 'Run `pip install -r requirements.txt` and `playwright install`' },
                                            { type: 'warning', label: 'Port', title: 'Address already in use', desc: 'Kill the process: `lsof -ti:8000 | xargs kill -9`' },
                                            { type: 'info', label: 'Timeout', title: 'Test Timeout Exceeded', desc: 'Increase TIMEOUT in config/config.py (default is 20s)' }
                                        ].map((item, idx) => (
                                            <Paper key={idx} variant="outlined" sx={{
                                                p: 2.5,
                                                borderRadius: 2,
                                                display: 'flex',
                                                gap: 3,
                                                alignItems: 'center',
                                                bgcolor: (theme) => alpha(theme.palette[item.type].main, 0.02),
                                                borderColor: (theme) => alpha(theme.palette[item.type].main, 0.1),
                                                '&:hover': {
                                                    bgcolor: (theme) => alpha(theme.palette[item.type].main, 0.05),
                                                    borderColor: (theme) => alpha(theme.palette[item.type].main, 0.3),
                                                },
                                                transition: 'all 0.2s'
                                            }}>
                                                <Chip
                                                    label={item.label}
                                                    size="small"
                                                    sx={{
                                                        fontWeight: 'bold',
                                                        fontSize: '0.625rem',
                                                        borderRadius: 1,
                                                        width: 70,
                                                        bgcolor: (theme) => alpha(theme.palette[item.type].main, 0.1),
                                                        color: (theme) => theme.palette[item.type].main,
                                                        border: (theme) => `1px solid ${alpha(theme.palette[item.type].main, 0.2)}`
                                                    }}
                                                />
                                                <Box>
                                                    <Typography variant="subtitle2" fontWeight="bold">{item.title}</Typography>
                                                    <Typography variant="body1" color="text.secondary" sx={{ fontSize: '0.875rem' }}>{item.desc}</Typography>
                                                </Box>
                                            </Paper>
                                        ))}
                                    </Box>
                                </Box>
                            </Box>

                            {/* Right Sticky TOC */}
                            <Box sx={{
                                width: 240,
                                display: { xs: 'none', lg: 'block' },
                                position: 'sticky',
                                top: 20,
                                alignSelf: 'flex-start',
                                borderLeft: '1px solid',
                                borderColor: 'divider',
                                pl: 3
                            }}>
                                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                                    <Typography variant="overline" sx={{
                                        fontWeight: 'bold',
                                        color: 'text.secondary',
                                        display: 'block',
                                        mb: 2
                                    }}>
                                        On this page
                                    </Typography>
                                    <List dense>
                                        {navigation.map((item) => (
                                            <ListItemButton
                                                key={item.id}
                                                onClick={() => scrollToSection(item.id)}
                                                sx={{
                                                    position: 'relative',
                                                    pl: 2,
                                                    borderLeft: activeSection === item.id ? `2px solid ${theme.palette.error.main}` : '2px solid transparent',
                                                    color: activeSection === item.id ? 'error.main' : 'text.secondary',
                                                    mb: 0.5,
                                                    '&:hover': { color: 'error.main', bgcolor: 'transparent' }
                                                }}
                                            >
                                                <ListItemText
                                                    primary={item.label}
                                                    primaryTypographyProps={{
                                                        fontSize: '0.875rem',
                                                        fontWeight: activeSection === item.id ? 600 : 400
                                                    }}
                                                />
                                            </ListItemButton>
                                        ))}
                                    </List>
                                </Paper>
                            </Box>

                        </Box>
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
}
