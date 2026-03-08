import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Bot, Box as BoxIcon, Check, CheckCircle, ChevronDown, ChevronRight, Circle, Clock, Copy, Cpu, Download, Eye, FileCode, Folder, FolderInput, FolderOpen, Info, Layers, MessageSquare, Play, RefreshCw, Rocket, Save, Scissors, Search, Sparkles, Square, Terminal, Trash2, Upload, User, Video, Wand2, X, XCircle } from 'lucide-react';
import { AIChatWindow } from '../UI/AIChatWindow';
import { Box, Button as MuiButton, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, Menu, MenuItem, Paper, TextField, Tooltip, Typography } from '@mui/material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { alpha, useTheme } from '@mui/material/styles';
import { keyframes } from '@mui/system';
import { StatusSnackbar } from '../UI/StatusSnackbar';
import { useAuth } from '@/contexts/AuthContext';

const chatPing = keyframes`
  0% {
    transform: scale(1);
    opacity: 0.75;
  }
  70% {
    transform: scale(1.35);
    opacity: 0;
  }
  100% {
    transform: scale(1.35);
    opacity: 0;
  }
`;

const chatGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(208, 0, 0, 0.65), 0 16px 32px rgba(0,0,0,0.35);
  }
  50% {
    box-shadow: 0 0 0 18px rgba(208, 0, 0, 0), 0 16px 32px rgba(0,0,0,0.35);
  }
`;

const chatBadgePulse = keyframes`
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.18);
    opacity: 0.72;
  }
`;

function Button({
    variant = 'primary-glass',
    icon: Icon,
    loading = false,
    children,
    size = 'small',
    disabled,
    ...rest
}) {
    const muiVariant = variant === 'danger' || variant === 'success' ? 'contained' : 'outlined';
    const muiColor = variant === 'success' ? 'success' : 'error';
    const muiSize = size === 'medium' ? 'medium' : 'small';
    return (
        <MuiButton
            {...rest}
            size={muiSize}
            variant={muiVariant}
            color={muiColor}
            disabled={Boolean(disabled) || loading}
            startIcon={Icon && !loading ? <Icon size={14} /> : undefined}
        >
            {loading ? 'Loading...' : children}
        </MuiButton>
    );
}

export function StudioView() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const { getAuthHeaders } = useAuth();

    const pomFetch = (input, init = {}) => {
        const headers = new Headers(init.headers || {});
        const authHeaders = getAuthHeaders();
        Object.entries(authHeaders).forEach(([key, value]) => headers.set(key, value));
        return fetch(input, { ...init, headers });
    };

    const highlighterRef = useRef(null); // Ref for syncing scroll
    const previewHighlighterRef = useRef(null); // Ref for preview modal syncing scroll
    const rawLogEndRef = useRef(null); // Ref for auto-scrolling raw logs

    const [recording, setRecording] = useState(false);
    const [recordingCompleted, setRecordingCompleted] = useState(false);
    const [code, setCode] = useState("# Initializing...");
    const [output, setOutput] = useState(null);
    const [status, setStatus] = useState(null); // { message, severity }
    const showStatus = (message, severity = 'success') => {
        setStatus({ message, severity });
        setTimeout(() => setStatus(null), 3000);
    };
    const [generating, setGenerating] = useState(false);
    const [useAI, setUseAI] = useState(false); // Toggle for AI-powered POM generation
    const [saveStatus, setSaveStatus] = useState('idle'); // idle, saving, saved

    // File management states
    const [recordings, setRecordings] = useState([]);
    const [allFolders, setAllFolders] = useState([]);
    const [showSaveAs, setShowSaveAs] = useState(false);
    const [showLoad, setShowLoad] = useState(false);
    const [showDeleteManager, setShowDeleteManager] = useState(false);
    const [saveAsName, setSaveAsName] = useState('');
    const [saveAsFolderName, setSaveAsFolderName] = useState('');
    const [selectedFile, setSelectedFile] = useState('');
    const [selectedItemsToDelete, setSelectedItemsToDelete] = useState(new Set());
    const [markerMenuAnchor, setMarkerMenuAnchor] = useState(null);
    const [currentFile, setCurrentFile] = useState('raw_recorded.py');
    const [currentFilePath, setCurrentFilePath] = useState(null); // Track full path for saving
    const [loadingFiles, setLoadingFiles] = useState(false);

    const [expandedFolders, setExpandedFolders] = useState({});
    const [confirmDeleteFile, setConfirmDeleteFile] = useState(null); // Filepath for deletion confirmation
    const [showDeleteConfirmOverlay, setShowDeleteConfirmOverlay] = useState(false);
    const [deleteSearchTerm, setDeleteSearchTerm] = useState(""); // Search for delete manager

    useEffect(() => {
        if (!showDeleteManager) {
            setDeleteSearchTerm("");
            setSelectedItemsToDelete(new Set());
        }
    }, [showDeleteManager]);

    // Preview/Edit Generated Files
    const [previewFile, setPreviewFile] = useState(null);
    const [previewContent, setPreviewContent] = useState("");
    const [previewSaveStatus, setPreviewSaveStatus] = useState("idle");

    // --- TEST RUNNER INTEGRATION ---
    const [showTerminal, setShowTerminal] = useState(false);
    const [activeTerminalTab, setActiveTerminalTab] = useState('output'); // 'output' or 'staged'

    const [runningTest, setRunningTest] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [testError, setTestError] = useState(null);
    const [copied, setCopied] = useState(false);
    const [codeCopied, setCodeCopied] = useState(false);
    const [generatedFiles, setGeneratedFiles] = useState([]);

    // Live log streaming state
    const [liveLogs, setLiveLogs] = useState("");
    const [logOffset, setLogOffset] = useState(0);

    // Publish State
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [testName, setTestName] = useState("");
    const [folderName, setFolderName] = useState("");
    const [publishing, setPublishing] = useState(false);
    const [publishSuccess, setPublishSuccess] = useState(null);
    const [showLogsModal, setShowLogsModal] = useState(false);

    // AI Healing State
    const [healing, setHealing] = useState(false);
    const [healResult, setHealResult] = useState(null);

    // AI Prompts State
    const [showPromptsModal, setShowPromptsModal] = useState(false);
    const [aiPrompts, setAiPrompts] = useState(null);
    const [availableMarkers, setAvailableMarkers] = useState(["smoke", "regression", "sanity", "e2e"]);
    const [selectedMarker, setSelectedMarker] = useState('');
    const [isSnippet, setIsSnippet] = useState(false);
    const [targetFlowFile, setTargetFlowFile] = useState("flows/shared_flows.py");

    // Snippet Extraction State
    const [showSnippetModal, setShowSnippetModal] = useState(false);
    const [snippetRange, setSnippetRange] = useState({ start: 0, end: 0 });
    const [snippetName, setSnippetName] = useState("");
    const [extractingSnippet, setExtractingSnippet] = useState(false);

    // Chat State
    const [showChat, setShowChat] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [isChatTyping, setIsChatTyping] = useState(false);
    const [includeContext, setIncludeContext] = useState(false);

    // Floating Chat Button Drag State
    const [chatPos, setChatPos] = useState({ x: 0, y: 0 });
    const isDraggingChat = useRef(false);
    const chatDragStart = useRef({ x: 0, y: 0 });
    const chatStartPos = useRef({ x: 0, y: 0 });
    const hasMoved = useRef(false);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDraggingChat.current) return;
            const dx = e.clientX - chatDragStart.current.x;
            const dy = e.clientY - chatDragStart.current.y;

            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved.current = true;

            setChatPos({
                x: chatStartPos.current.x + dx,
                y: chatStartPos.current.y + dy
            });
        };

        const handleMouseUp = () => {
            isDraggingChat.current = false;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    // Raw Run State
    const [showRunRawModal, setShowRunRawModal] = useState(false);
    const [rawRunResult, setRawRunResult] = useState(null);
    const [runningRaw, setRunningRaw] = useState(false);

    // Fetch generated files on mount
    useEffect(() => {
        pomFetch('/api/playwright-pom/generate/files')
            .then(res => res.json())
            .then(data => setGeneratedFiles(data.files || []))
            .catch(console.error);

        // Fetch markers from settings
        pomFetch('/api/playwright-pom/settings')
            .then(res => res.json())
            .then(data => {
                if (data.markers) setAvailableMarkers(data.markers);
            })
            .catch(console.error);
    }, []);

    // Poll for live logs while test is running
    useEffect(() => {
        let interval;
        if (runningTest) {
            interval = setInterval(async () => {
                try {
                    const res = await pomFetch(`/api/playwright-pom/tests/logs?offset=${logOffset}`);
                    const data = await res.json();
                    if (data.content) {
                        setLiveLogs(prev => prev + data.content);
                        setLogOffset(data.offset);
                    }
                } catch (err) {
                    console.error('Failed to fetch logs:', err);
                }
            }, 500);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [runningTest, logOffset]);

    // Poll for live logs while RAW TEST is running
    useEffect(() => {
        let interval;
        if (runningRaw) {
            interval = setInterval(async () => {
                try {
                    // We reuse the same offset logic, but need separate state if we want to be safe.
                    // Actually, let's reuse logOffset but reset it before starting.
                    const res = await pomFetch(`/api/playwright-pom/record/run/logs?offset=${logOffset}`);
                    const data = await res.json();
                    if (data.content) {
                        setRawRunResult(prev => ({
                            ...prev,
                            // Append content to existing output or create new
                            output: (prev?.output || "") + data.content,
                            status: 'running'
                        }));
                        setLogOffset(data.offset);
                    }
                } catch (err) {
                    console.error('Failed to fetch raw logs:', err);
                }
            }, 500);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [runningRaw, logOffset]);

    useEffect(() => {
        if (showPublishModal) {
            pomFetch('/api/playwright-pom/settings')
                .then(res => res.json())
                .then(data => {
                    if (data.markers) setAvailableMarkers(data.markers);
                })
                .catch(console.error);
        }
    }, [showPublishModal]);

    const runTest = async () => {
        try {
            setShowTerminal(true);
            setActiveTerminalTab('test'); // Switch to Test Execution tab immediately
            setLiveLogs("");
            setLogOffset(0);
            setRunningTest(true);
            setTestResult(null);
            setTestError(null);
            setHealResult(null); // Clear heal result when rerunning
            const res = await pomFetch('/api/playwright-pom/tests/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.output || data.detail);
            setTestResult(data);
        } catch (e) {
            setTestError(e.message);
        }
        finally { setRunningTest(false); }
    };

    useEffect(() => {
        if (showRunRawModal && rawLogEndRef.current) {
            rawLogEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [rawRunResult, showRunRawModal]);

    // AI Healing - Analyze failure and fix
    const healTest = async () => {
        if (!testResult || testResult.status === 'success') return;

        try {
            setHealing(true);
            setHealResult(null);

            // Extract error info from test output
            const errorMessage = testResult.output?.substring(0, 500) || 'Test failed';
            const errorTraceback = testResult.output || '';

            const res = await pomFetch('/api/playwright-pom/ai/heal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error_message: errorMessage,
                    error_traceback: errorTraceback,
                    test_file: 'generated_pom/tests/test_generated.py',
                    page_file: 'generated_pom/pages/generated_page.py',
                    locators_file: 'generated_pom/locators/generated_locators.py'
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.detail);

            setHealResult(data);

            // Show success message if fixes were applied
            if (data.fixes_applied) {
                setActiveTerminalTab('output');
            }
        } catch (e) {
            setHealResult({ status: 'error', analysis: e.message, fixes_applied: false });
        } finally {
            setHealing(false);
        }
    };

    const fetchPrompts = async () => {
        try {
            const res = await pomFetch('/api/playwright-pom/ai/prompts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ raw_script: code })
            });
            const data = await res.json();
            setAiPrompts(data);
            setShowPromptsModal(true);
        } catch (e) {
            alert("Failed to fetch prompts: " + e.message);
        }
    };

    const handleCopy = () => {
        if (!testResult?.output) return;
        navigator.clipboard.writeText(testResult.output);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyCode = () => {
        if (!code) return;
        navigator.clipboard.writeText(code);
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2000);
    };

    const handleDownloadReport = async () => {
        try {
            const headers = new Headers();
            const authHeaders = getAuthHeaders();
            Object.entries(authHeaders).forEach(([key, value]) => headers.set(key, value));
            const res = await fetch('/api/tests/report/download', { method: 'GET', headers });
            if (!res.ok) {
                throw new Error(`Download failed with status ${res.status}`);
            }

            const blob = await res.blob();
            const disposition = res.headers.get('content-disposition') || '';
            const match = disposition.match(/filename="?([^"]+)"?/i);
            const filename = match?.[1] || 'extent_report.html';

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (e) {
            showStatus(e.message || 'Failed to download report', 'error');
        }
    };

    const publishTest = async () => {
        if (!testName.trim()) return;
        try {
            setPublishing(true);
            setTestError(null);
            const res = await pomFetch('/api/playwright-pom/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: testName,
                    folder_name: folderName.trim() || null,
                    marker: selectedMarker || null,
                    is_snippet: isSnippet,
                    target_flow_file: targetFlowFile
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail);

            setPublishSuccess(`Successfully published ${data.published_files.length} files to framework!`);

            // Reset workflow states on success
            setOutput(null);
            setTestResult(null);
            setTestError(null);
            setRecordingCompleted(false);

            setTimeout(() => {
                setShowPublishModal(false);
                setPublishSuccess(null);
                setTestName("");
                setFolderName("");
                setSelectedMarker("");
            }, 2000);
        } catch (e) {
            alert(e.message); // Use alert or existing error mechanism
        } finally {
            setPublishing(false);
        }
    };

    const handlePreviewFile = async (filename) => {
        // Assume generated files are in "generated_pom/" if not specified
        // But the output filenames might already include path.
        // Let's try to load it. If it fails, try prepending "generated_pom/"
        let filepath = filename;
        if (!filepath.startsWith('generated_pom/') && !filepath.startsWith('recordings/')) {
            filepath = `generated_pom/${filename}`;
        }

        try {
            const res = await pomFetch(`/api/playwright-pom/record/load/${filepath}`);
            if (!res.ok) throw new Error("Failed to load file");
            const data = await res.json();
            setPreviewContent(data.content);
            setPreviewFile(filepath);
        } catch (e) {
            alert(`Could not load file: ${e.message}`);
        }
    };

    const handleSavePreview = async () => {
        if (!previewFile) return;
        setPreviewSaveStatus("saving");
        try {
            const res = await pomFetch('/api/playwright-pom/record/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: previewContent,
                    filepath: previewFile
                })
            });
            if (!res.ok) throw new Error("Failed to save file");
            setPreviewSaveStatus("saved");
            setTimeout(() => setPreviewSaveStatus("idle"), 2000);
        } catch (e) {
            setPreviewSaveStatus("idle");
            alert(e.message);
        }
    };

    const toggleDeleteSelection = (path, folderFiles = null) => {
        const newSet = new Set(selectedItemsToDelete);

        // Logic for Folder Selection (Recursive)
        if (folderFiles) {
            const isSelecting = !newSet.has(path);

            if (isSelecting) {
                newSet.add(path); // Add folder
                folderFiles.forEach(f => newSet.add(f.path)); // Add all children
            } else {
                newSet.delete(path); // Remove folder
                folderFiles.forEach(f => newSet.delete(f.path)); // Remove all children
            }
        }
        // Logic for Single File Selection
        else {
            if (newSet.has(path)) {
                newSet.delete(path);

                // CRITICAL SAFETY CHECK:
                // If unchecking a file, we MUST uncheck its parent folder if it was selected.
                // Otherwise, the "Delete" action might interpret the presence of the folder 
                // as a command to delete the *entire* folder (including this unchecked file).
                // Path format: "recordings/folderName/fileName.py" -> Parent: "recordings/folderName"
                const pathParts = path.split('/');
                if (pathParts.length > 2) {
                    const parentPath = pathParts.slice(0, -1).join('/');
                    if (newSet.has(parentPath)) {
                        newSet.delete(parentPath);
                    }
                }
            } else {
                newSet.add(path);
            }
        }
        setSelectedItemsToDelete(newSet);
    };

    // Toggle folder expansion
    const toggleFolder = (folderName) => {
        setExpandedFolders(prev => ({
            ...prev,
            [folderName]: !prev[folderName]
        }));
    };

    const handleScroll = (e) => {
        if (highlighterRef.current) {
            highlighterRef.current.scrollTop = e.target.scrollTop;
            highlighterRef.current.scrollLeft = e.target.scrollLeft;
        }
    };

    const handlePreviewScroll = (e) => {
        if (previewHighlighterRef.current) {
            previewHighlighterRef.current.scrollTop = e.target.scrollTop;
            previewHighlighterRef.current.scrollLeft = e.target.scrollLeft;
        }
    };

    // Group files by folder
    const groupedFiles = React.useMemo(() => {
        const groups = { root: [] };

        // Initialize all known folders with empty arrays
        allFolders.forEach(folder => {
            groups[folder] = [];
        });

        recordings.forEach(file => {
            const folder = file.folder || 'root';
            if (!groups[folder]) groups[folder] = [];
            groups[folder].push(file);
        });
        return groups;
    }, [recordings, allFolders]);

    // Filtered files for Delete Manager
    const groupedDeleteFiles = React.useMemo(() => {
        const groups = { root: [] };
        allFolders.forEach(folder => { groups[folder] = []; });

        const targetFiles = deleteSearchTerm
            ? recordings.filter(f => f.name.toLowerCase().includes(deleteSearchTerm.toLowerCase()))
            : recordings;

        targetFiles.forEach(file => {
            const folder = file.folder || 'root';
            if (!groups[folder]) groups[folder] = [];
            groups[folder].push(file);
        });

        // Hide empty folders during search
        if (deleteSearchTerm) {
            Object.keys(groups).forEach(key => {
                if (groups[key].length === 0 && key !== 'root') delete groups[key];
            });
        }
        return groups;
    }, [recordings, allFolders, deleteSearchTerm]);

    // Select syntax theme
    const syntaxStyle = isDark ? vscDarkPlus : vs;

    // Fetch available recordings
    const fetchRecordings = async () => {
        try {
            setLoadingFiles(true);
            const res = await pomFetch('/api/playwright-pom/record/files');
            const data = await res.json();
            setRecordings(data.files || []);
            setAllFolders(data.folders || []);
        } catch (err) {
            console.error("Failed to fetch recordings", err);
        } finally {
            setLoadingFiles(false);
        }
    };

    const handleExtractSnippet = async () => {
        if (!snippetName.trim()) return;
        setExtractingSnippet(true);
        console.log("Extracting Snippet:", {
            filename: currentFilePath || currentFile || "raw_recorded.py",
            start_step: snippetRange.start,
            end_step: snippetRange.end,
            snippet_name: snippetName,
            target_flow_file: targetFlowFile
        });

        try {
            const res = await pomFetch('/api/playwright-pom/extract-snippet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: currentFilePath || currentFile || "raw_recorded.py",
                    start_step: snippetRange.start,
                    end_step: snippetRange.end,
                    snippet_name: snippetName,
                    target_flow_file: targetFlowFile
                })
            });
            const data = await res.json();
            console.log("Extraction Response:", data);
            if (res.ok) {
                setStatus({ message: "Snippet extracted successfully!", severity: "success" });
                setShowSnippetModal(false);
                setSnippetName("");
            } else {
                console.error("Extraction Error Detail:", data.detail);
                setStatus({ message: data.detail || "Extraction failed", severity: "error" });
            }
        } catch (err) {
            setStatus({ message: "Failed to connect to server", severity: "error" });
        } finally {
            setExtractingSnippet(false);
        }
    };



    // Poll for code content only when recording
    useEffect(() => {
        let interval;
        if (recording) {
            interval = setInterval(async () => {
                try {
                    const res = await pomFetch('/api/playwright-pom/record/content');
                    const data = await res.json();
                    setCode(data.content);
                } catch (err) {
                    console.error("Failed to fetch code", err);
                }
            }, 1000);
        } else {
            // Initial fetch or refresh when not recording
            pomFetch('/api/playwright-pom/record/content')
                .then(res => res.json())
                .then(data => setCode(data.content))
                .catch(e => console.error(e));

            // Also fetch available recordings
            fetchRecordings();
        }
        return () => { if (interval) clearInterval(interval) };
    }, [recording]);

    const saveCode = async () => {
        try {
            setSaveStatus('saving');
            setStatus(null);
            // console.log("Saving code...", currentFilePath ? `to ${currentFilePath}` : "to raw_recorded.py");  // TODO: Remove in production

            const res = await pomFetch('/api/playwright-pom/record/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: code,
                    filepath: currentFilePath || null // Send filepath for loaded recordings, explicit null for raw
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || "Failed to save code");
            }

            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (e) {
            console.error("Save failed:", e);
            setSaveStatus('idle');
            showStatus(e.message, "error");
            // Also show a browser alert for immediate feedback if the UI error is missed
            alert(`Failed to save: ${e.message}`);
        }
    };

    const saveAsFile = async () => {
        if (!saveAsName.trim()) {
            showStatus("Please enter a filename", "error");
            return;
        }
        try {
            setSaveStatus('saving');
            setStatus(null);
            const res = await pomFetch('/api/playwright-pom/record/save-as', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: code,
                    filename: saveAsName,
                    folder_name: saveAsFolderName.trim() || null
                })
            });
            if (!res.ok) throw new Error("Failed to save file");

            const data = await res.json();
            setSaveStatus('saved');
            setShowSaveAs(false);
            setSaveAsName('');
            setSaveAsFolderName('');
            setCurrentFile(data.filename);
            setCurrentFilePath(data.file);
            fetchRecordings(); // Refresh list
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (e) {
            setSaveStatus('idle');
            showStatus(e.message, "error");
        }
    };

    const handleSelectAll = () => {
        // Gather all currently visible paths (files + folders) from groupedDeleteFiles
        const visiblePaths = new Set();

        // Root items
        if (groupedDeleteFiles.root) {
            groupedDeleteFiles.root.forEach(f => visiblePaths.add(f.path));
        }

        // Folders
        Object.keys(groupedDeleteFiles).forEach(folder => {
            if (folder === 'root') return;
            visiblePaths.add(`recordings/${folder}`);
            groupedDeleteFiles[folder].forEach(f => visiblePaths.add(f.path));
        });

        // Check if all visible are selected
        const allSelected = Array.from(visiblePaths).every(p => selectedItemsToDelete.has(p));

        const newSet = new Set(selectedItemsToDelete);
        if (allSelected) {
            // Deselect visible
            visiblePaths.forEach(p => newSet.delete(p));
        } else {
            // Select visible
            visiblePaths.forEach(p => newSet.add(p));
        }
        setSelectedItemsToDelete(newSet);
    };

    const isDeleteSelectAllChecked = React.useMemo(() => {
        if (!showDeleteManager) return false;
        let visibleCount = 0;
        let selectedCount = 0;

        // Root
        groupedDeleteFiles.root?.forEach(f => {
            visibleCount++; // File
            if (selectedItemsToDelete.has(f.path)) selectedCount++;
        });

        // Folders
        Object.keys(groupedDeleteFiles).forEach(folder => {
            if (folder === 'root') return;
            visibleCount++; // Folder
            if (selectedItemsToDelete.has(`recordings/${folder}`)) selectedCount++;

            groupedDeleteFiles[folder].forEach(f => {
                visibleCount++; // File
                if (selectedItemsToDelete.has(f.path)) selectedCount++;
            });
        });

        return visibleCount > 0 && visibleCount === selectedCount;
    }, [groupedDeleteFiles, selectedItemsToDelete, showDeleteManager]);

    const selectedFileCount = React.useMemo(() => {
        return recordings.reduce((acc, file) => selectedItemsToDelete.has(file.path) ? acc + 1 : acc, 0);
    }, [recordings, selectedItemsToDelete]);

    const deleteSelectedItems = async () => {
        if (selectedItemsToDelete.size === 0) return;

        try {
            const allPaths = Array.from(selectedItemsToDelete);
            const folders = allPaths.filter(p => !p.endsWith('.py')); // Assumes folders don't end in .py
            const files = allPaths.filter(p => p.endsWith('.py'));

            // Filter out files that are inside folders already marked for deletion
            const validFilesToDelete = files.filter(filePath => {
                const parentFolder = filePath.split('/').slice(0, -1).join('/');
                // Check if parent folder (or any ancestor) is in the folders list
                return !folders.some(folder => filePath.startsWith(folder + '/'));
            });

            // Combine non-redundant items
            const finalItemsToDelete = [...folders, ...validFilesToDelete];

            const deletePromises = finalItemsToDelete.map(path =>
                pomFetch(`/api/playwright-pom/record/delete/${path}`, { method: 'DELETE' })
            );

            await Promise.all(deletePromises);

            // Refresh list
            fetchRecordings();

            // If current file was deleted
            if (currentFilePath && selectedItemsToDelete.has(currentFilePath)) {
                setCode("# Start recording or load a file...");
                setCurrentFile('raw_recorded.py');
                setCurrentFilePath(null);
            }

            setSelectedItemsToDelete(new Set());
            setShowDeleteConfirmOverlay(false);
        } catch (e) {
            alert(e.message);
            setShowDeleteConfirmOverlay(false);
        }
    };

    // Quick inline delete for the list views
    // Quick inline delete for the list views
    const quickDeleteFile = (e, filepath) => {
        e.stopPropagation();
        setConfirmDeleteFile(filepath);
    };

    const executeDelete = async () => {
        if (!confirmDeleteFile) return;
        try {
            const res = await pomFetch(`/api/playwright-pom/record/delete/${confirmDeleteFile}`, { method: 'DELETE' });
            if (!res.ok) throw new Error("Failed to delete file");
            fetchRecordings();
            if (confirmDeleteFile === currentFilePath) {
                setCode("# Start recording or load a file...");
                setCurrentFile('raw_recorded.py');
                setCurrentFilePath(null);
            }
            setConfirmDeleteFile(null);
        } catch (e) {
            alert(e.message);
            setConfirmDeleteFile(null);
        }
    };

    const loadFile = async (filepath) => {
        try {
            setStatus(null);
            const res = await pomFetch(`/api/playwright-pom/record/load/${filepath}`);
            if (!res.ok) throw new Error("Failed to load file");

            const data = await res.json();
            setCode(data.content);
            // Extract filename from path and store full path for saving
            const filename = filepath.split('/').pop();
            setCurrentFile(filename);
            setCurrentFilePath(filepath); // Track full path for saving
            setRecordingCompleted(true); // Allow snippet extraction from loaded files
        } catch (e) {
            showStatus(e.message, "error");
        }
    };

    const startRecording = async () => {
        try {
            setStatus(null);
            const res = await pomFetch('/api/playwright-pom/record/start', { method: 'POST' });
            if (res.ok) {
                setRecording(true);
                setRecordingCompleted(false); // Reset completion state
                setCurrentFile('raw_recorded.py');
                setCurrentFilePath(null); // Reset to default save location
            } else {
                const errData = await res.json().catch(() => ({}));
                showStatus(errData.detail || "Failed to start recording", "error");
            }
        } catch (e) { showStatus(e.message, "error"); }
    };

    const stopRecording = async () => {
        try {
            await pomFetch('/api/playwright-pom/record/stop', { method: 'POST' });
            setRecording(false);
            setRecordingCompleted(true); // Mark as completed
        } catch (e) { showStatus(e.message, "error"); }
    };

    const generatePOM = async () => {
        try {
            // Ensure any edits are saved before generation
            await saveCode();

            setGenerating(true);
            setActiveTerminalTab('output'); // Switch to Generation tab immediately
            setStatus(null);

            // Determine which file to use as input
            const inputPath = currentFilePath || "tools/raw_recorded.py";

            const res = await pomFetch('/api/playwright-pom/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input_file: inputPath,
                    output_dir: "generated_pom",
                    use_ai: useAI // Pass AI toggle state
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail);
            setOutput(data);

            // If AI detected this is a snippet, pre-fill publish states
            if (data.is_snippet) {
                setIsSnippet(true);
                if (data.snippet_method_name) {
                    setTestName(data.snippet_method_name);
                }
            }
        } catch (e) { showStatus(e.message, "error"); }
        finally { setGenerating(false); }
    };

    const handleRunRaw = async () => {
        setRunningRaw(true);
        setRawRunResult({ output: "", status: "running" }); // Initialize with empty output
        setLogOffset(0); // Reset log offset
        setShowRunRawModal(true);
        try {
            const res = await pomFetch('/api/playwright-pom/record/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: code,
                    filepath: null // We run content directly
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Failed to run script");
            setRawRunResult(data);
        } catch (e) {
            setRawRunResult({ status: 'error', output: e.message });
        } finally {
            setRunningRaw(false);
        }
    };
    const handleSendMessage = (value) => {
        const newMsgs = [...chatMessages, { role: 'user', content: value }];
        setChatMessages(newMsgs);
        setIsChatTyping(true);

        pomFetch('/api/playwright-pom/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: newMsgs,
                context: includeContext ? code : null
            })
        })
            .then(async res => {
                if (!res.ok) {
                    let errorMessage = res.statusText;
                    try {
                        const errorData = await res.json();
                        errorMessage = errorData.detail || errorMessage;
                    } catch (e) {
                        try {
                            errorMessage = await res.text();
                        } catch (e2) { }
                    }
                    throw new Error(errorMessage || "Failed to get response");
                }
                return res.json();
            })
            .then(data => {
                if (!data || !data.response) throw new Error("Invalid response format");
                setChatMessages([...newMsgs, { role: 'assistant', content: data.response }]);
            })
            .catch(err => {
                console.error("AI Chat Error:", err);
                setChatMessages([...newMsgs, { role: 'assistant', content: `Sorry, I encountered an error: ${err.message}` }]);
            })
            .finally(() => setIsChatTyping(false));
    };


    return (
        <>
            {/* Raw Run Logs Modal */}
            <Dialog
                open={showRunRawModal}
                onClose={(_, reason) => {
                    if (runningRaw && (reason === 'backdropClick' || reason === 'escapeKeyDown')) return;
                    setShowRunRawModal(false);
                }}
                fullWidth
                maxWidth="md"
                PaperProps={{
                    sx: {
                        height: '70vh',
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: isDark ? '#161B22' : '#fff',
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        bgcolor: isDark ? '#21262D' : 'grey.50',
                        py: 1.5,
                        px: 2.5,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                            <Play size={20} color={theme.palette.error.main} />
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Raw Script Execution</Typography>
                            {runningRaw && (
                                <Box sx={{ px: 1, py: 0.25, borderRadius: 999, border: '1px solid', borderColor: alpha(theme.palette.error.main, 0.35), bgcolor: alpha(theme.palette.error.main, 0.12), fontSize: '0.72rem', fontWeight: 700, color: 'error.main', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <RefreshCw size={12} />
                                    Running...
                                </Box>
                            )}
                        </Box>
                        <IconButton onClick={() => setShowRunRawModal(false)} disabled={runningRaw} size="small">
                            <X size={18} />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    {runningRaw && !rawRunResult && (
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.25, opacity: 0.7 }}>
                            <CircularProgress size={42} />
                            <Typography variant="body2">Starting execution...</Typography>
                        </Box>
                    )}
                    {rawRunResult && (
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, gap: 1.5 }}>
                            {rawRunResult.status === 'running' ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main', fontWeight: 700 }}>
                                    <RefreshCw size={18} />
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>Execution In Progress...</Typography>
                                </Box>
                            ) : (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: rawRunResult.status === 'success' ? 'success.main' : 'error.main', fontWeight: 700 }}>
                                    {rawRunResult.status === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                        {rawRunResult.status === 'success' ? 'Execution Successful' : 'Execution Failed'}
                                    </Typography>
                                    {rawRunResult.return_code !== undefined && (
                                        <Typography variant="caption" color="text.secondary">
                                            (Exit Code: {rawRunResult.return_code})
                                        </Typography>
                                    )}
                                </Box>
                            )}
                            <Box
                                sx={{
                                    flex: 1,
                                    overflowY: 'auto',
                                    p: 1.5,
                                    borderRadius: 1.5,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    bgcolor: isDark ? 'rgba(0,0,0,0.35)' : 'grey.50',
                                    color: isDark ? 'grey.300' : 'grey.800',
                                    fontFamily: 'monospace',
                                    fontSize: '0.82rem',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                }}
                            >
                                {rawRunResult.output || (rawRunResult.status === 'success' ? 'Execution Successful (No Output)' : 'No output generated.')}
                                <Box ref={rawLogEndRef} />
                            </Box>
                        </Box>
                    )}
                </DialogContent>
            </Dialog>

            {/* Logs Expansion Modal */}
            <Dialog
                open={showLogsModal}
                onClose={() => setShowLogsModal(false)}
                fullWidth
                maxWidth="md"
                PaperProps={{
                    sx: {
                        height: '80vh',
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: isDark ? '#161B22' : '#fff',
                    },
                }}
            >
                <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: isDark ? '#21262D' : 'grey.50', px: 2.5, py: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                            <Terminal size={20} color={theme.palette.error.main} />
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Test Execution Logs</Typography>
                            {runningTest && (
                                <Box sx={{ px: 1, py: 0.25, borderRadius: 999, border: '1px solid', borderColor: alpha(theme.palette.error.main, 0.35), bgcolor: alpha(theme.palette.error.main, 0.12), fontSize: '0.72rem', fontWeight: 700, color: 'error.main' }}>
                                    Running...
                                </Box>
                            )}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {testResult && (
                                <IconButton onClick={handleCopy} size="small" title={copied ? "Copied" : "Copy Logs"} sx={{ color: 'error.main' }}>
                                    {copied ? <Check size={18} /> : <Copy size={18} />}
                                </IconButton>
                            )}
                            <IconButton onClick={() => setShowLogsModal(false)} size="small">
                                <X size={18} />
                            </IconButton>
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ p: 2.5, fontFamily: 'monospace', fontSize: '0.82rem' }}>
                    {runningTest && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main', fontWeight: 700 }}>
                                <RefreshCw size={16} />
                                <Typography variant="caption" sx={{ fontWeight: 700 }}>Executing tests...</Typography>
                            </Box>
                            {liveLogs && (
                                <Box component="pre" sx={{ m: 0, p: 1.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: isDark ? 'rgba(0,0,0,0.35)' : '#fff', color: isDark ? 'grey.300' : 'grey.800', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                    {liveLogs}
                                </Box>
                            )}
                        </Box>
                    )}
                    {!runningTest && testResult && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: testResult.status === 'success' ? 'success.main' : 'error.main', fontWeight: 700 }}>
                                {testResult.status === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    {testResult.status === 'success' ? 'Tests Passed' : 'Tests Failed'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">(Exit Code: {testResult.return_code})</Typography>
                            </Box>
                            {testResult.output && (
                                <Box component="pre" sx={{ m: 0, p: 1.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: isDark ? 'rgba(0,0,0,0.35)' : '#fff', color: isDark ? 'grey.300' : 'grey.800', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                    {testResult.output}
                                </Box>
                            )}
                        </Box>
                    )}
                    {!runningTest && testError && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main', fontWeight: 700 }}>
                                <AlertCircle size={20} />
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>Error Occurred</Typography>
                            </Box>
                            <Box component="pre" sx={{ m: 0, p: 1.5, borderRadius: 1.5, border: '1px solid', borderColor: alpha(theme.palette.error.main, 0.35), bgcolor: alpha(theme.palette.error.main, 0.08), color: isDark ? 'error.light' : 'error.dark', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {testError}
                            </Box>
                        </Box>
                    )}
                    {!runningTest && !testResult && !testError && (
                        <Box sx={{ py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                            <Terminal size={40} />
                            <Typography variant="body2">No test execution logs</Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ borderTop: '1px solid', borderColor: 'divider', bgcolor: isDark ? '#21262D' : 'grey.50', px: 2.5, py: 1.25 }}>
                    <Button variant="danger" onClick={() => setShowLogsModal(false)}>Close</Button>
                </DialogActions>
            </Dialog>
            {/* AI Prompts Modal */}
            <Dialog
                open={showPromptsModal && Boolean(aiPrompts)}
                onClose={() => setShowPromptsModal(false)}
                fullWidth
                maxWidth="md"
                PaperProps={{
                    sx: {
                        height: '80vh',
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: isDark ? '#161B22' : '#fff',
                    },
                }}
            >
                <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: isDark ? '#21262D' : 'grey.50', py: 1.5, px: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Sparkles size={18} color={theme.palette.error.main} />
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>AI Prompts Preview</Typography>
                        </Box>
                        <IconButton onClick={() => setShowPromptsModal(false)} size="small">
                            <X size={18} />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box>
                        <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>System Prompt</Typography>
                        <Box component="pre" sx={{ m: 0, mt: 1, p: 1.5, minHeight: 140, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: isDark ? 'rgba(0,0,0,0.32)' : 'grey.50', color: isDark ? 'grey.300' : 'grey.800', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                            {aiPrompts?.system_prompt}
                        </Box>
                    </Box>
                    <Box>
                        <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>User Prompt</Typography>
                        <Box component="pre" sx={{ m: 0, mt: 1, p: 1.5, minHeight: 220, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: isDark ? 'rgba(0,0,0,0.32)' : 'grey.50', color: isDark ? 'grey.300' : 'grey.800', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                            {aiPrompts?.user_prompt}
                        </Box>
                    </Box>
                </DialogContent>
            </Dialog>
            <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <StatusSnackbar status={status} onClose={() => setStatus(null)} />

                {/* Save As Modal */}
                <Dialog
                    open={showSaveAs}
                    onClose={() => { setShowSaveAs(false); setSaveAsName(''); setSaveAsFolderName(''); }}
                    fullWidth
                    maxWidth="xs"
                    PaperProps={{
                        sx: {
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: isDark ? '#161B22' : '#fff',
                        },
                    }}
                >
                    <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: isDark ? '#21262D' : 'grey.50', py: 1.25, px: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Save size={18} color={theme.palette.error.main} />
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Save Recording As</Typography>
                            </Box>
                            <IconButton onClick={() => { setShowSaveAs(false); setSaveAsName(''); setSaveAsFolderName(''); }} size="small">
                                <X size={18} />
                            </IconButton>
                        </Box>
                    </DialogTitle>
                    <DialogContent sx={{ p: 2.25, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Box>
                            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.75 }}>
                                Folder Name <Box component="span" sx={{ color: 'error.main' }}>*</Box>
                            </Typography>
                            <TextField
                                fullWidth
                                size="small"
                                inputProps={{ maxLength: 30 }}
                                value={saveAsFolderName}
                                onChange={(e) => setSaveAsFolderName(e.target.value.replace(/\s+/g, '_'))}
                                placeholder="e.g., authentication (Max 30 chars)"
                                onKeyDown={(e) => e.key === 'Enter' && saveAsName.trim() && saveAsFolderName.trim() && saveAsFile()}
                                InputProps={{
                                    startAdornment: <FolderOpen size={14} color={theme.palette.error.main} />,
                                }}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
                                Saves to: recordings/{saveAsFolderName ? `${saveAsFolderName.toLowerCase().replace(/[^\w-]/g, '_')}/` : 'folder/'}{saveAsName ? `${saveAsName.replace(/[^\w-]/g, '_')}.py` : 'filename.py'}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.75 }}>
                                Scenario Name <Box component="span" sx={{ color: 'error.main' }}>*</Box>
                            </Typography>
                            <TextField
                                fullWidth
                                size="small"
                                autoFocus
                                inputProps={{ maxLength: 30 }}
                                value={saveAsName}
                                onChange={(e) => setSaveAsName(e.target.value.replace(/\s+/g, '_'))}
                                placeholder="e.g., login_flow (Max 30 chars)"
                                onKeyDown={(e) => e.key === 'Enter' && saveAsName.trim() && saveAsFolderName.trim() && saveAsFile()}
                                InputProps={{
                                    startAdornment: <FileCode size={14} color={theme.palette.error.main} />,
                                }}
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ px: 2.25, pb: 2, pt: 0.5 }}>
                        <Button
                            variant="danger"
                            fullWidth
                            onClick={() => { setShowSaveAs(false); setSaveAsName(''); setSaveAsFolderName(''); }}
                            icon={X}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary-glass"
                            fullWidth
                            onClick={saveAsFile}
                            disabled={saveStatus === 'saving' || !saveAsName.trim() || !saveAsFolderName.trim()}
                            loading={saveStatus === 'saving'}
                            icon={Save}
                        >
                            Save
                        </Button>
                    </DialogActions>
                </Dialog>

                {showPublishModal && (
                    <Dialog
                        open={showPublishModal}
                        onClose={() => { setShowPublishModal(false); setTestName(''); setFolderName(''); setSelectedMarker(''); setIsSnippet(false); }}
                        fullWidth
                        maxWidth="sm"
                        PaperProps={{
                            sx: {
                                border: '1px solid',
                                borderColor: 'divider',
                                bgcolor: isDark ? '#161B22' : '#fff',
                                overflow: 'hidden',
                            },
                        }}
                    >
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: isDark ? '#21262D' : 'grey.50', py: 1.5, px: 2.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                                        <Box sx={{ width: 28, height: 28, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: isDark ? alpha(theme.palette.error.main, 0.15) : 'purple.100' }}>
                                            <Rocket size={16} color={theme.palette.error.main} />
                                        </Box>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Publish to Framework</Typography>
                                    </Box>
                                    <IconButton onClick={() => { setShowPublishModal(false); setTestName(''); setFolderName(''); setSelectedMarker(''); setIsSnippet(false); }} size="small">
                                        <X size={18} />
                                    </IconButton>
                                </Box>
                            </DialogTitle>
                            <DialogContent sx={{ p: 2.5 }}>
                                {!publishSuccess ? (
                                    <Box sx={{ display: 'grid', rowGap: 2.25 }}>
                                        <Box>
                                            <Typography variant="caption" sx={{ display: 'block', mb: 0.75 }}>
                                                Folder Name <Box component="span" sx={{ color: 'error.main' }}>*</Box>
                                            </Typography>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                inputProps={{ maxLength: 30 }}
                                                value={folderName}
                                                onChange={(e) => setFolderName(e.target.value.replace(/\s+/g, '_'))}
                                                placeholder="e.g., authentication (Max 30 chars)"
                                                onKeyDown={(e) => e.key === 'Enter' && testName.trim() && folderName.trim() && publishTest()}
                                            />
                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.6, display: 'block' }}>
                                                Saves to: pages/{folderName ? folderName.toLowerCase().replace(/[^\w-]/g, '_') : 'folder'}/{testName ? testName.replace(/[^\w-]/g, '_') : 'name'}_page.py
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" sx={{ display: 'block', mb: 0.75 }}>
                                                Scenario Name <Box component="span" sx={{ color: 'error.main' }}>*</Box>
                                            </Typography>
                                            <TextField
                                                autoFocus
                                                fullWidth
                                                size="small"
                                                inputProps={{ maxLength: 30 }}
                                                value={testName}
                                                onChange={(e) => setTestName(e.target.value.replace(/\s+/g, '_'))}
                                                placeholder="e.g., login_flow (Max 30 chars)"
                                                onKeyDown={(e) => e.key === 'Enter' && testName.trim() && folderName.trim() && publishTest()}
                                            />
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                Markers <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400, textTransform: 'none', ml: 0.5 }}>(optional)</Box>
                                            </Typography>
                                            <Box
                                                onClick={(e) => setMarkerMenuAnchor(e.currentTarget)}
                                                sx={{
                                                    mt: 0.75,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    px: 1.5,
                                                    py: 1,
                                                    border: '1px solid',
                                                    borderColor: 'divider',
                                                    borderRadius: 1,
                                                    cursor: 'pointer',
                                                    bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                                                    '&:hover': { borderColor: 'primary.main' },
                                                }}
                                            >
                                                <Typography variant="body2" color={selectedMarker ? 'text.primary' : 'text.secondary'}>
                                                    {selectedMarker || "None"}
                                                </Typography>
                                                <ChevronDown size={14} color={theme.palette.error.main} />
                                            </Box>
                                            <Menu
                                                anchorEl={markerMenuAnchor}
                                                open={Boolean(markerMenuAnchor)}
                                                onClose={() => setMarkerMenuAnchor(null)}
                                                PaperProps={{
                                                    sx: {
                                                        mt: 1,
                                                        borderRadius: 1,
                                                        border: '1px solid',
                                                        borderColor: 'divider',
                                                        bgcolor: isDark ? '#161B22' : '#fff',
                                                        minWidth: markerMenuAnchor ? markerMenuAnchor.clientWidth : 200,
                                                        maxHeight: '200px',
                                                    },
                                                }}
                                            >
                                                <MenuItem onClick={() => { setSelectedMarker(""); setMarkerMenuAnchor(null); }}>None</MenuItem>
                                                <Divider sx={{ my: 0.5 }} />
                                                {availableMarkers.map((marker) => (
                                                    <MenuItem key={marker} onClick={() => { setSelectedMarker(marker); setMarkerMenuAnchor(null); }}>
                                                        {marker}
                                                    </MenuItem>
                                                ))}
                                            </Menu>
                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.6, display: 'block' }}>
                                                Adds `@pytest.mark.{selectedMarker || 'marker'}` to the test class
                                            </Typography>
                                        </Box>
                                        <Box sx={{ p: 1.5, borderRadius: 1.5, border: '1px solid', borderColor: isSnippet ? alpha(theme.palette.error.main, 0.25) : 'divider', bgcolor: isSnippet ? alpha(theme.palette.error.main, 0.06) : 'transparent' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Sparkles size={16} color={theme.palette.error.main} />
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Reusable Snippet</Typography>
                                                    <Typography variant="caption" sx={{ px: 0.75, py: 0.2, borderRadius: 999, border: '1px solid', borderColor: isSnippet ? alpha(theme.palette.error.main, 0.35) : 'divider', color: isSnippet ? 'error.main' : 'text.secondary' }}>
                                                        {isSnippet ? 'Enabled' : 'Disabled'}
                                                    </Typography>
                                                </Box>
                                                <MuiButton
                                                    type="button"
                                                    onClick={() => setIsSnippet(!isSnippet)}
                                                    size="small"
                                                    variant={isSnippet ? 'contained' : 'outlined'}
                                                    color="error"
                                                >
                                                    {isSnippet ? 'On' : 'Off'}
                                                </MuiButton>
                                            </Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                                {isSnippet
                                                    ? "Snippet logic is appended to the shared flows library for reuse across tests."
                                                    : "Standard publish creates independent Page and Test files."}
                                            </Typography>
                                            {isSnippet && (
                                                <Box sx={{ mt: 1 }}>
                                                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 0.5 }}>
                                                        Target Flow File
                                                    </Typography>
                                                    <TextField
                                                        fullWidth
                                                        size="small"
                                                        value={targetFlowFile}
                                                        onChange={(e) => setTargetFlowFile(e.target.value)}
                                                        sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.75rem' } }}
                                                    />
                                                </Box>
                                            )}
                                        </Box>
                                        <Box sx={{ pt: 1.25, borderTop: '1px solid', borderColor: 'divider', display: 'flex', gap: 1.25 }}>
                                            <Button
                                                variant="danger"
                                                fullWidth
                                                onClick={() => { setShowPublishModal(false); setTestName(''); setFolderName(''); setSelectedMarker(''); }}
                                                icon={X}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                variant="primary-glass"
                                                fullWidth
                                                onClick={publishTest}
                                                disabled={!testName.trim() || !folderName.trim() || publishing}
                                                loading={publishing}
                                                icon={Rocket}
                                            >
                                                Publish
                                            </Button>
                                        </Box>
                                    </Box>
                                ) : (
                                    <Box sx={{ textAlign: 'center', py: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                        <Box sx={{ display: 'inline-flex', mx: 'auto', p: 1.25, borderRadius: '50%', bgcolor: alpha(theme.palette.success.main, 0.12), color: 'success.main' }}>
                                            <CheckCircle size={30} />
                                        </Box>
                                        <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600 }}>{publishSuccess}</Typography>
                                        <Button
                                            variant="primary-glass"
                                            fullWidth
                                            onClick={() => { setShowPublishModal(false); setPublishSuccess(null); setTestName(''); setFolderName(''); setSelectedMarker(''); setIsSnippet(false); }}
                                            icon={Check}
                                        >
                                            Done
                                        </Button>
                                    </Box>
                                )}
                            </DialogContent>
                        </Box>
                    </Dialog>
                )}

                {/* Partial Snippet Extraction Modal */}
                <Dialog
                    open={showSnippetModal}
                    onClose={() => setShowSnippetModal(false)}
                    fullWidth
                    maxWidth="xs"
                    PaperProps={{
                        sx: {
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: isDark ? '#161B22' : '#fff',
                        },
                    }}
                >
                    <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: isDark ? '#21262D' : 'grey.50', py: 1.25, px: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Scissors size={18} color={theme.palette.error.main} />
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Extract Partial Snippet</Typography>
                            </Box>
                            <IconButton onClick={() => setShowSnippetModal(false)} size="small">
                                <X size={18} />
                            </IconButton>
                        </Box>
                    </DialogTitle>
                    <DialogContent sx={{ p: 2.25, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Box>
                            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.75 }}>
                                Snippet Name <Box component="span" sx={{ color: 'error.main' }}>*</Box>
                            </Typography>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="e.g., login_process"
                                value={snippetName}
                                onChange={(e) => setSnippetName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                            />
                        </Box>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
                            <Box>
                                <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.75 }}>Start Step Index</Typography>
                                <TextField
                                    fullWidth
                                    size="small"
                                    type="number"
                                    value={snippetRange.start}
                                    onChange={(e) => setSnippetRange({ ...snippetRange, start: parseInt(e.target.value, 10) || 0 })}
                                />
                            </Box>
                            <Box>
                                <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.75 }}>End Step Index</Typography>
                                <TextField
                                    fullWidth
                                    size="small"
                                    type="number"
                                    value={snippetRange.end}
                                    onChange={(e) => setSnippetRange({ ...snippetRange, end: parseInt(e.target.value, 10) || 0 })}
                                />
                            </Box>
                        </Box>
                        <Box>
                            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.75 }}>Target Library File</Typography>
                            <TextField
                                fullWidth
                                size="small"
                                value={targetFlowFile}
                                onChange={(e) => setTargetFlowFile(e.target.value)}
                                sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.75rem' } }}
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ px: 2.25, pb: 2, pt: 0.5 }}>
                        <Button variant="danger" fullWidth onClick={() => setShowSnippetModal(false)} icon={X}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary-glass"
                            fullWidth
                            onClick={handleExtractSnippet}
                            loading={extractingSnippet}
                            disabled={!snippetName.trim() || extractingSnippet}
                            icon={Sparkles}
                        >
                            Extract Snippet
                        </Button>
                    </DialogActions>
                </Dialog>

                {showLoad && (
                    <Dialog
                        open={showLoad}
                        onClose={() => { setShowLoad(false); setSelectedFile(''); }}
                        fullWidth
                        maxWidth="sm"
                        PaperProps={{
                            sx: {
                                height: '70vh',
                                border: '1px solid',
                                borderColor: 'divider',
                                bgcolor: isDark ? '#161B22' : '#fff',
                                overflow: 'hidden',
                            },
                        }}
                    >
                        <Box sx={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
                            {/* Confirmation Overlay */}
                            {confirmDeleteFile && (
                                <Box sx={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha('#000', 0.6), backdropFilter: 'blur(2px)', borderRadius: 1.5 }}>
                                    <Paper sx={{ width: 320, p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: isDark ? '#21262D' : '#fff' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                            <Box sx={{ p: 0.9, borderRadius: '50%', bgcolor: alpha(theme.palette.error.main, 0.12), color: 'error.main' }}>
                                                <Trash2 size={18} />
                                            </Box>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Delete Recording?</Typography>
                                        </Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block', lineHeight: 1.6 }}>
                                            Are you sure you want to delete <Box component="span" sx={{ fontFamily: 'monospace', color: 'error.main', wordBreak: 'break-all' }}>{confirmDeleteFile}</Box>?<br />
                                            This action cannot be undone.
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <Button
                                                variant="danger"
                                                fullWidth
                                                onClick={() => setConfirmDeleteFile(null)}
                                                icon={X}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                variant="danger"
                                                fullWidth
                                                onClick={executeDelete}
                                                icon={Trash2}
                                            >
                                                Delete
                                            </Button>
                                        </Box>
                                    </Paper>
                                </Box>
                            )}
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.25, borderBottom: '1px solid', borderColor: 'divider', bgcolor: isDark ? '#21262D' : 'grey.50' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <FolderOpen size={18} color={theme.palette.error.main} />
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Load Recording</Typography>
                                </Box>
                                <IconButton onClick={() => { setShowLoad(false); setSelectedFile(''); }} size="small">
                                    <X size={18} />
                                </IconButton>
                            </Box>
                            <Box sx={{ flex: 1, minHeight: 0, p: 2 }}>

                                {/* Reuse Tree Logic for Load - Read Only mostly */}
                                <Box sx={{ flex: 1, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: isDark ? '#1a1a1a' : 'grey.100' }}>
                                        <FolderOpen size={14} color={theme.palette.error.main} />
                                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>recordings/</Typography>
                                    </Box>
                                    <Box sx={{ p: 1 }}>
                                        {groupedFiles.root && groupedFiles.root.map((file, idx) => {
                                            const isSelected = selectedFile === file.path;
                                            return (
                                                <Box
                                                    key={`root-${idx}`}
                                                    onClick={() => setSelectedFile(file.path)}
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 1.25,
                                                        px: 1.5,
                                                        py: 1,
                                                        mb: 0.5,
                                                        borderRadius: 1.25,
                                                        cursor: 'pointer',
                                                        border: '1px solid',
                                                        borderColor: isSelected ? alpha(theme.palette.error.main, 0.25) : 'transparent',
                                                        bgcolor: isSelected ? alpha(theme.palette.error.main, 0.08) : 'transparent',
                                                        '&:hover': { bgcolor: isSelected ? alpha(theme.palette.error.main, 0.08) : 'action.hover' },
                                                    }}
                                                >
                                                    <Box sx={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid', borderColor: isSelected ? 'error.main' : 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {isSelected && <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: 'error.main' }} />}
                                                    </Box>
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Typography variant="body2" sx={{ fontSize: '0.82rem' }} noWrap>{file.name.replace('.py', '')}</Typography>
                                                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', opacity: 0.6 }} noWrap>{file.path}</Typography>
                                                    </Box>
                                                    <Typography variant="caption" color="text.secondary">{new Date(file.modified).toLocaleDateString()}</Typography>
                                                    <IconButton onClick={(e) => quickDeleteFile(e, file.path)} size="small" sx={{ color: 'error.main' }} title="Delete">
                                                        <Trash2 size={13} />
                                                    </IconButton>
                                                </Box>
                                            );
                                        })}
                                        {Object.keys(groupedFiles).filter(k => k !== 'root').sort().map(folder => (
                                            <Box key={folder} sx={{ mb: 0.5 }}>
                                                <Box
                                                    onClick={() => toggleFolder(folder)}
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 1,
                                                        px: 1.5,
                                                        py: 1,
                                                        borderRadius: 1,
                                                        cursor: 'pointer',
                                                        color: 'text.secondary',
                                                        '&:hover': { bgcolor: 'action.hover' },
                                                        fontSize: '0.72rem',
                                                        fontWeight: 700,
                                                        letterSpacing: '0.08em',
                                                        textTransform: 'uppercase',
                                                    }}
                                                >
                                                    {expandedFolders[folder] ? <ChevronDown size={14} color={theme.palette.error.main} /> : <ChevronRight size={14} color={theme.palette.error.main} />}
                                                    {expandedFolders[folder] ? <FolderOpen size={14} color={theme.palette.error.main} /> : <Folder size={14} color={theme.palette.error.main} />}
                                                    {folder}
                                                </Box>
                                                {expandedFolders[folder] && (
                                                    <Box sx={{ ml: 3, borderLeft: '1px solid', borderColor: 'divider', pl: 1 }}>
                                                        {groupedFiles[folder].map(file => {
                                                            const isSelected = selectedFile === file.path;
                                                            return (
                                                                <Box
                                                                    key={file.path}
                                                                    onClick={() => setSelectedFile(file.path)}
                                                                    sx={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: 1.25,
                                                                        px: 1.5,
                                                                        py: 1,
                                                                        mb: 0.5,
                                                                        borderRadius: 1.25,
                                                                        cursor: 'pointer',
                                                                        border: '1px solid',
                                                                        borderColor: isSelected ? alpha(theme.palette.error.main, 0.25) : 'transparent',
                                                                        bgcolor: isSelected ? alpha(theme.palette.error.main, 0.08) : 'transparent',
                                                                        '&:hover': { bgcolor: isSelected ? alpha(theme.palette.error.main, 0.08) : 'action.hover' },
                                                                    }}
                                                                >
                                                                    <Box sx={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid', borderColor: isSelected ? 'error.main' : 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        {isSelected && <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: 'error.main' }} />}
                                                                    </Box>
                                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                                        <Typography variant="body2" sx={{ fontSize: '0.82rem' }} noWrap>{file.name.replace('.py', '')}</Typography>
                                                                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', opacity: 0.6 }} noWrap>{file.path}</Typography>
                                                                    </Box>
                                                                    <Typography variant="caption" color="text.secondary">{new Date(file.modified).toLocaleDateString()}</Typography>
                                                                    <IconButton onClick={(e) => quickDeleteFile(e, file.path)} size="small" sx={{ color: 'error.main' }} title="Delete">
                                                                        <Trash2 size={13} />
                                                                    </IconButton>
                                                                </Box>
                                                            );
                                                        })}
                                                    </Box>
                                                )}
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>

                                <Box sx={{ display: 'flex', gap: 1.25, mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                                    <Button
                                        variant="danger"
                                        fullWidth
                                        onClick={() => { setShowLoad(false); setSelectedFile(''); }}
                                        icon={X}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="primary-glass"
                                        size="medium"
                                        fullWidth
                                        onClick={() => { if (selectedFile) { loadFile(selectedFile); setShowLoad(false); setSelectedFile(''); } }}
                                        disabled={!selectedFile}
                                        icon={FolderOpen}
                                    >
                                        Load
                                    </Button>
                                </Box>
                            </Box>
                        </Box>
                    </Dialog>
                )}

                {/* Delete Manager Modal */}
                {showDeleteManager && (
                    <Dialog
                        open={showDeleteManager}
                        onClose={() => { setShowDeleteManager(false); setSelectedItemsToDelete(new Set()); setDeleteSearchTerm(""); }}
                        fullWidth
                        maxWidth="sm"
                        PaperProps={{
                            sx: {
                                height: '70vh',
                                border: '1px solid',
                                borderColor: 'divider',
                                bgcolor: isDark ? '#161B22' : '#fff',
                                overflow: 'hidden',
                            },
                        }}
                    >
                        <Box sx={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
                            {/* Confirmation Overlay */}
                            {showDeleteConfirmOverlay && selectedItemsToDelete.size > 0 && (
                                <Box sx={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha('#000', 0.6), backdropFilter: 'blur(2px)', borderRadius: 1.5 }}>
                                    <Paper sx={{ width: 320, p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: isDark ? '#21262D' : '#fff' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                            <Box sx={{ p: 0.9, borderRadius: '50%', bgcolor: alpha(theme.palette.error.main, 0.12), color: 'error.main' }}>
                                                <Trash2 size={18} />
                                            </Box>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Delete Selected Items?</Typography>
                                        </Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', lineHeight: 1.6 }}>
                                            Are you sure you want to delete <Box component="span" sx={{ fontWeight: 700, color: 'error.main' }}>{selectedFileCount}</Box> file(s)?
                                        </Typography>
                                        {selectedItemsToDelete.size < 5 && (
                                            <Box component="ul" sx={{ mt: 0.5, mb: 1, pl: 2.5, opacity: 0.8 }}>
                                                {Array.from(selectedItemsToDelete).map((p) => (
                                                    <Typography key={p} component="li" variant="caption" sx={{ display: 'list-item' }} noWrap>
                                                        {p}
                                                    </Typography>
                                                ))}
                                            </Box>
                                        )}
                                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                                            This action cannot be undone.
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <Button
                                                variant="danger"
                                                fullWidth
                                                onClick={() => setShowDeleteConfirmOverlay(false)}
                                                icon={X}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                variant="danger"
                                                fullWidth
                                                onClick={deleteSelectedItems}
                                                icon={Trash2}
                                            >
                                                Delete All
                                            </Button>
                                        </Box>
                                    </Paper>
                                </Box>
                            )}
                            <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1.25, bgcolor: isDark ? '#21262D' : 'grey.50' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Trash2 size={18} color={theme.palette.error.main} />
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Delete Recordings</Typography>
                                    </Box>
                                    <IconButton onClick={() => { setShowDeleteManager(false); setSelectedItemsToDelete(new Set()); setDeleteSearchTerm(""); }} size="small">
                                        <X size={18} />
                                    </IconButton>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        placeholder="Filter recordings..."
                                        value={deleteSearchTerm}
                                        onChange={(e) => setDeleteSearchTerm(e.target.value)}
                                    />
                                    {deleteSearchTerm && (
                                        <IconButton onClick={() => setDeleteSearchTerm("")} size="small" title="Clear search">
                                            <X size={12} />
                                        </IconButton>
                                    )}
                                </Box>
                            </Box>
                            <Box sx={{ flex: 1, minHeight: 0, p: 2 }}>
                                <Box sx={{ px: 1.5, py: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                    <MuiButton onClick={handleSelectAll} size="small" color="error" variant="text">
                                        {isDeleteSelectAllChecked ? 'Unselect All' : 'Select All'}
                                    </MuiButton>
                                    <Typography variant="caption" sx={{ color: selectedItemsToDelete.size > 0 ? 'error.main' : 'text.secondary', fontWeight: 600 }}>
                                        {selectedFileCount} selected
                                    </Typography>
                                </Box>

                                <Box sx={{ flex: 1, overflowY: 'auto', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1.25, mt: 1.25 }}>
                                    {groupedDeleteFiles.root && groupedDeleteFiles.root.map((file, idx) => {
                                        const isSelected = selectedItemsToDelete.has(file.path);
                                        return (
                                            <Box
                                                key={`del-root-${idx}`}
                                                onClick={() => toggleDeleteSelection(file.path)}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                    px: 1.25,
                                                    py: 1,
                                                    mb: 0.5,
                                                    borderRadius: 1,
                                                    cursor: 'pointer',
                                                    border: '1px solid',
                                                    borderColor: isSelected ? alpha(theme.palette.error.main, 0.25) : 'transparent',
                                                    bgcolor: isSelected ? alpha(theme.palette.error.main, 0.08) : 'transparent',
                                                    '&:hover': { bgcolor: isSelected ? alpha(theme.palette.error.main, 0.08) : 'action.hover' },
                                                }}
                                            >
                                                <Box sx={{ width: 13, height: 13, borderRadius: 0.5, border: '1px solid', borderColor: isSelected ? 'error.main' : 'divider', bgcolor: isSelected ? 'error.main' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {isSelected && <Check size={10} color="#fff" />}
                                                </Box>
                                                <FileCode size={14} color={theme.palette.error.main} />
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography variant="body2" sx={{ fontSize: '0.82rem' }} noWrap>{file.name.replace('.py', '')}</Typography>
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', opacity: 0.6 }} noWrap>{file.path}</Typography>
                                                </Box>
                                            </Box>
                                        );
                                    })}
                                    {Object.keys(groupedDeleteFiles).filter(k => k !== 'root').sort().map((folder) => {
                                        const folderTests = groupedDeleteFiles[folder];
                                        const isFolderSelected = selectedItemsToDelete.has(`recordings/${folder}`);
                                        const isAllFilteredSelected = folderTests.length > 0 && folderTests.every(f => selectedItemsToDelete.has(f.path));
                                        return (
                                            <Box key={folder} sx={{ mb: 0.5 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', px: 1, py: 0.75, borderRadius: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }} onClick={() => toggleFolder(folder)}>
                                                    <Box sx={{ mr: 0.5, transform: expandedFolders[folder] ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
                                                        <ChevronRight size={14} color={theme.palette.error.main} />
                                                    </Box>
                                                    <Box
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleDeleteSelection(`recordings/${folder}`, folderTests);
                                                        }}
                                                        sx={{ mr: 1, width: 13, height: 13, borderRadius: 0.5, border: '1px solid', borderColor: (isAllFilteredSelected || isFolderSelected) ? 'error.main' : 'divider', bgcolor: (isAllFilteredSelected || isFolderSelected) ? 'error.main' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    >
                                                        {(isAllFilteredSelected || isFolderSelected) && <Check size={10} color="#fff" />}
                                                    </Box>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary' }}>
                                                        {expandedFolders[folder] ? <FolderOpen size={14} color={theme.palette.error.main} /> : <Folder size={14} color={theme.palette.error.main} />}
                                                        {folder}
                                                    </Box>
                                                </Box>
                                                {expandedFolders[folder] && (
                                                    <Box sx={{ ml: 3, pl: 1, borderLeft: '1px solid', borderColor: 'divider' }}>
                                                        {folderTests.map((file) => {
                                                            const isSelected = selectedItemsToDelete.has(file.path);
                                                            return (
                                                                <Box
                                                                    key={`del-${file.path}`}
                                                                    onClick={() => toggleDeleteSelection(file.path)}
                                                                    sx={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: 1,
                                                                        px: 1.25,
                                                                        py: 1,
                                                                        mb: 0.5,
                                                                        borderRadius: 1,
                                                                        cursor: 'pointer',
                                                                        border: '1px solid',
                                                                        borderColor: isSelected ? alpha(theme.palette.error.main, 0.25) : 'transparent',
                                                                        bgcolor: isSelected ? alpha(theme.palette.error.main, 0.08) : 'transparent',
                                                                        '&:hover': { bgcolor: isSelected ? alpha(theme.palette.error.main, 0.08) : 'action.hover' },
                                                                    }}
                                                                >
                                                                    <Box sx={{ width: 13, height: 13, borderRadius: 0.5, border: '1px solid', borderColor: isSelected ? 'error.main' : 'divider', bgcolor: isSelected ? 'error.main' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        {isSelected && <Check size={10} color="#fff" />}
                                                                    </Box>
                                                                    <FileCode size={13} color={theme.palette.error.main} />
                                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                                        <Typography variant="body2" sx={{ fontSize: '0.82rem' }} noWrap>{file.name.replace('.py', '')}</Typography>
                                                                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', opacity: 0.6 }} noWrap>{file.path}</Typography>
                                                                    </Box>
                                                                </Box>
                                                            );
                                                        })}
                                                    </Box>
                                                )}
                                            </Box>
                                        );
                                    })}
                                </Box>

                                <Box sx={{ display: 'flex', gap: 1.25, mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                                    <Button
                                        variant="danger"
                                        fullWidth
                                        onClick={() => { setShowDeleteManager(false); setSelectedItemsToDelete(new Set()); setDeleteSearchTerm(""); }}
                                        icon={X}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="danger"
                                        fullWidth
                                        onClick={() => { if (selectedItemsToDelete.size > 0) { setShowDeleteConfirmOverlay(true); } }}
                                        disabled={selectedItemsToDelete.size === 0}
                                        icon={Trash2}
                                    >
                                        Delete {selectedFileCount > 0 ? `(${selectedFileCount})` : ''}
                                    </Button>
                                </Box>
                            </Box>
                        </Box>
                    </Dialog>
                )}


                {/* Prevew/Edit Modal */}
                {previewFile && (
                    <Dialog
                        open={Boolean(previewFile)}
                        onClose={() => setPreviewFile(null)}
                        fullWidth
                        maxWidth="md"
                        PaperProps={{
                            sx: {
                                height: '80vh',
                                border: '1px solid',
                                borderColor: 'divider',
                                bgcolor: isDark ? '#161B22' : '#fff',
                                overflow: 'hidden',
                            },
                        }}
                    >
                        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            {/* Header */}
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.25, borderBottom: '1px solid', borderColor: 'divider', bgcolor: isDark ? '#21262D' : 'grey.50', minHeight: 50 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1.5 }}>
                                    <FileCode size={16} color={theme.palette.error.main} />
                                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{previewFile}</Typography>
                                </Box>
                                <IconButton onClick={() => setPreviewFile(null)} size="small" sx={{ mr: 1 }}>
                                    <X size={18} />
                                </IconButton>
                            </Box>

                            {/* Editor Content */}
                            <Box sx={{ flex: 1, position: 'relative', minHeight: 0, bgcolor: isDark ? '#161B22' : '#fff' }}>
                                {/* Syntax Highlighted Layer - Bottom */}
                                <Box
                                    ref={previewHighlighterRef}
                                    sx={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
                                >
                                    <SyntaxHighlighter
                                        language="python"
                                        style={syntaxStyle}
                                        showLineNumbers={true}
                                        lineNumberStyle={{
                                            minWidth: '1rem',
                                            paddingRight: '0.75rem',
                                            paddingLeft: '0.5rem', // Added
                                            borderRight: 'none',   // Added
                                            textAlign: 'right',
                                            color: isDark ? '#6e7681' : '#a0a0a0',
                                            userSelect: 'none',
                                            opacity: 0.7,
                                            fontFamily: 'monospace',
                                            fontSize: '0.875rem',
                                            display: 'inline-block',
                                            boxSizing: 'content-box'
                                        }}
                                        customStyle={{
                                            margin: 0,
                                            paddingTop: '1.5rem', // Changed from padding
                                            paddingLeft: '1.25rem', // Changed from padding
                                            paddingRight: '1.5rem', // Changed from padding
                                            paddingBottom: '10rem', // Changed from padding, new value
                                            fontSize: '0.875rem',
                                            lineHeight: '1.5',
                                            fontFamily: 'monospace',
                                            fontVariantLigatures: 'none',
                                            border: 'none',
                                            outline: 'none',
                                            letterSpacing: 'normal',
                                            tabSize: 4,
                                            whiteSpace: 'pre',
                                            minHeight: '100%',
                                            overflow: 'visible'
                                        }}
                                        codeTagProps={{
                                            style: {
                                                fontFamily: 'monospace',
                                            }
                                        }}
                                    >
                                        {previewContent || ""}
                                    </SyntaxHighlighter>
                                </Box>

                                {/* Editable Textarea Layer - Top */}
                                <Box
                                    component="textarea"
                                    sx={{
                                        position: 'absolute',
                                        inset: 0,
                                        width: '100%',
                                        height: '100%',
                                        background: 'transparent',
                                        color: 'transparent',
                                        resize: 'none',
                                        outline: 'none',
                                        zIndex: 10,
                                        fontFamily: 'monospace',
                                        fontSize: '0.875rem',
                                        lineHeight: '1.5',
                                        pt: '1.5rem',
                                        pl: '5.5rem',
                                        pr: '1.5rem',
                                        pb: '10rem',
                                        caretColor: theme.palette.error.main,
                                        whiteSpace: 'pre',
                                        letterSpacing: 'normal',
                                        fontVariantLigatures: 'none',
                                        tabSize: 4,
                                    }}
                                    value={previewContent}
                                    onScroll={handlePreviewScroll}
                                    onChange={(e) => setPreviewContent(e.target.value)}
                                    spellCheck={false}
                                    autoCapitalize="off"
                                    autoComplete="off"
                                    autoCorrect="off"
                                />
                            </Box>

                            {/* Footer */}
                            <Box sx={{ px: 2.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1.25, minHeight: 72, py: 1.25, pr: 3.5, bgcolor: isDark ? '#21262D' : 'grey.50' }}>
                                <Button
                                    variant={previewSaveStatus === 'saved' ? 'success' : 'primary-glass'}
                                    onClick={handleSavePreview}
                                    disabled={previewSaveStatus === 'saving'}
                                    loading={previewSaveStatus === 'saving'}
                                    icon={previewSaveStatus === 'saved' ? CheckCircle : Save}
                                >
                                    {previewSaveStatus === 'saved' ? 'Saved' : 'Save'}
                                </Button>
                                <Button
                                    variant="danger"
                                    onClick={() => setPreviewFile(null)}
                                >
                                    Close
                                </Button>
                            </Box>
                        </Box>
                    </Dialog>
                )}

                <Box sx={{ flex: 1, p: 2, minHeight: 0, overflow: 'hidden', display: 'flex', transition: 'background-color 0.3s' }}>
                    <Box sx={{ display: 'grid', gap: 2, flex: 1, minHeight: 0, overflow: 'hidden', gridTemplateColumns: 'minmax(0, 3.2fr) minmax(0, 1.8fr)' }}>

                        {/* Left Column: Editor Window */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', borderRadius: 2, border: '1px solid', borderColor: 'divider', boxShadow: isDark ? '0 10px 24px rgba(0,0,0,0.35)' : '0 6px 18px rgba(15,23,42,0.08)', overflow: 'hidden', bgcolor: isDark ? '#161B22' : '#fff' }}>
                                {/* Window Header */}
                                <Box sx={{ position: 'relative', height: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pl: 3, pr: 4, flexShrink: 0, bgcolor: isDark ? '#21262D' : 'grey.50' }}>
                                    {/* Bottom border line for header - positioned absolutely so tab can sit on top */}
                                    <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, bgcolor: isDark ? '#333' : 'transparent' }} />

                                    <Box sx={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', gap: 1, mr: 2, ml: 1.75 }}>
                                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ff5f56' }} />
                                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ffbd2e' }} />
                                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#27c93f' }} />
                                        </Box>

                                        {/* Tab with current filename - overlaps the bottom border line */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 0.5, borderRadius: '8px 8px 0 0', fontSize: '0.75rem', fontWeight: 500, borderTop: '2px solid', borderTopColor: 'error.main', borderLeft: '1px solid', borderRight: '1px solid', borderLeftColor: isDark ? '#333' : '#e5e7eb', borderRightColor: isDark ? '#333' : '#e5e7eb', position: 'relative', bgcolor: isDark ? '#161B22' : '#fff', color: 'text.primary' }}>
                                            <Box sx={{ mr: 1, display: 'inline-flex', flexShrink: 0 }}>
                                                <FileCode size={13} color={theme.palette.error.main} />
                                            </Box>
                                            <Typography variant="caption" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={currentFilePath || currentFile}>
                                                {currentFilePath || currentFile}
                                            </Typography>
                                            {/* Cover the bottom line with a pseudo-border matching bg */}
                                            <Box sx={{ position: 'absolute', bottom: -2, left: 0, right: 0, height: 2, bgcolor: isDark ? '#161B22' : '#fff' }} />
                                        </Box>
                                    </Box>

                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, mr: -0.5 }}>
                                        {recording && (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1, py: 0.25, bgcolor: alpha(theme.palette.error.main, 0.1), borderRadius: 1, border: '1px solid', borderColor: alpha(theme.palette.error.main, 0.2) }}>
                                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'error.main' }} />
                                                <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.08em', color: 'error.main' }}>REC</Typography>
                                            </Box>
                                        )}
                                        {!recording && (
                                            <>
                                                <Tooltip title="Run Raw Script" arrow placement="top">
                                                    <IconButton onClick={handleRunRaw} size="small" sx={{ color: 'error.main' }}>
                                                        <Play size={14} />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Load Recording" arrow placement="top">
                                                    <IconButton onClick={() => { fetchRecordings(); setShowLoad(true); }} size="small" sx={{ color: 'error.main' }}>
                                                        <FolderOpen size={14} />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Delete Recordings" arrow placement="top">
                                                    <IconButton onClick={() => { fetchRecordings(); setShowDeleteManager(true); }} size="small" sx={{ color: 'error.main' }}>
                                                        <Trash2 size={14} />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title={saveStatus === 'saved' ? 'Saved!' : 'Save'} arrow placement="top">
                                                    <span>
                                                        <IconButton onClick={saveCode} disabled={saveStatus === 'saving'} size="small" sx={{ color: 'error.main' }}>
                                                            {saveStatus === 'saving' ? <CircularProgress size={14} color="inherit" /> : <Save size={14} />}
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                                <Tooltip title="Save As..." arrow placement="top">
                                                    <IconButton onClick={() => setShowSaveAs(true)} size="small" sx={{ color: 'error.main' }}>
                                                        <Download size={14} />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title={codeCopied ? 'Copied!' : 'Copy Code'} arrow placement="top">
                                                    <IconButton onClick={handleCopyCode} size="small" sx={{ color: 'error.main' }}>
                                                        {codeCopied ? <Check size={14} /> : <Copy size={14} />}
                                                    </IconButton>
                                                </Tooltip>
                                            </>
                                        )}
                                    </Box>
                                </Box>

                                {/* Editor Area */}
                                <Box sx={{ position: 'relative', flex: 1, minHeight: 0, bgcolor: isDark ? '#161B22' : '#fff' }}>
                                    {/* Syntax Highlighted Code Display - Passive Scroll */}
                                    <Box
                                        ref={highlighterRef}
                                        sx={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                                        <SyntaxHighlighter
                                            language="python"
                                            style={syntaxStyle}
                                            showLineNumbers={true}
                                            lineNumberStyle={{
                                                minWidth: '1.5rem',
                                                paddingRight: '0.25rem',
                                                borderRight: 'none',
                                                color: isDark ? '#6e7681' : '#aeb7c2',
                                                textAlign: 'right',
                                                userSelect: 'none',
                                                fontFamily: 'monospace',
                                                fontSize: '0.875rem',
                                                display: 'inline-block',
                                                boxSizing: 'content-box'
                                            }}
                                            customStyle={{
                                                margin: 0,
                                                paddingTop: '1.5rem',
                                                paddingLeft: '0.25rem',
                                                paddingRight: '1.5rem',
                                                paddingBottom: '10rem',
                                                fontSize: '0.875rem',
                                                lineHeight: '1.5',
                                                fontFamily: 'monospace',
                                                fontVariantLigatures: 'none',
                                                border: 'none',
                                                outline: 'none',
                                                letterSpacing: 'normal',
                                                tabSize: 4,
                                                whiteSpace: 'pre',
                                                minHeight: '100%',
                                                overflow: 'visible'
                                            }}
                                            codeTagProps={{
                                                style: {
                                                    fontFamily: 'monospace',
                                                }
                                            }}
                                            wrapLongLines={false}
                                        >
                                            {code}
                                        </SyntaxHighlighter>
                                    </Box>

                                    {/* Editing Overlay (only when not recording) */}
                                    {!recording && (
                                        <Box
                                            component="textarea"
                                            sx={{
                                                position: 'absolute',
                                                inset: 0,
                                                width: '100%',
                                                height: '100%',
                                                background: 'transparent',
                                                color: 'transparent',
                                                WebkitTextFillColor: 'transparent',
                                                resize: 'none',
                                                outline: 'none',
                                                overflow: 'auto',
                                                fontFamily: 'monospace',
                                                fontSize: '0.875rem',
                                                lineHeight: '1.5',
                                                pl: '2rem',
                                                pt: '1.5rem',
                                                pr: '1.5rem',
                                                pb: '10rem',
                                                caretColor: theme.palette.error.main,
                                                whiteSpace: 'pre',
                                                letterSpacing: 'normal',
                                                fontVariantLigatures: 'none',
                                                tabSize: 4,
                                            }}
                                            value={code}
                                            onScroll={handleScroll}
                                            onChange={(e) => setCode(e.target.value)}
                                            spellCheck={false}
                                            autoCapitalize="off"
                                            autoComplete="off"
                                            autoCorrect="off"
                                        />
                                    )}
                                </Box>
                            </Box>
                        </Box>

                        {/* Right Column: Workflow Panel */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minHeight: 0, overflow: 'hidden' }}>

                            {/* UNIFIED WORKFLOW CARD */}
                            <Paper
                                sx={{
                                    minHeight: 220,
                                    bgcolor: isDark ? '#161B22' : '#ffffff',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    boxShadow: isDark ? '0 10px 24px rgba(0,0,0,0.35)' : '0 6px 18px rgba(15,23,42,0.08)',
                                }}
                            >
                                <Box sx={{ p: '6px 10px 8px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25, flexShrink: 0 }}>
                                        <Layers size={16} color={theme.palette.error.main} />
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Automation Workflow</Typography>
                                    </Box>

                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        {/* STEP 1: Record */}
                                        <Box
                                            sx={{
                                                p: 1,
                                                borderRadius: 1.5,
                                                border: '1px solid',
                                                borderColor: recording ? alpha(theme.palette.error.main, 0.4) : 'divider',
                                                bgcolor: recording
                                                    ? alpha(theme.palette.error.main, 0.1)
                                                    : isDark
                                                        ? '#21262D'
                                                        : '#fff',
                                                boxShadow: recording
                                                    ? `0 0 25px ${alpha(theme.palette.error.main, 0.28)}`
                                                    : isDark
                                                        ? '0 8px 16px rgba(0,0,0,0.35)'
                                                        : '0 6px 14px rgba(15,23,42,0.08)',
                                                transform: recording ? 'scale(1.03)' : 'none',
                                                transition: 'all 0.25s ease',
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.25 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                                                    <Box
                                                        sx={{
                                                            width: 24,
                                                            height: 24,
                                                            borderRadius: '50%',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 700,
                                                            border: '2px solid',
                                                            borderColor: publishSuccess
                                                                ? 'divider'
                                                                : recording
                                                                    ? 'error.main'
                                                                    : recordingCompleted
                                                                        ? 'success.main'
                                                                        : 'divider',
                                                            color: publishSuccess
                                                                ? 'text.secondary'
                                                                : recording
                                                                    ? 'error.main'
                                                                    : recordingCompleted
                                                                        ? 'success.main'
                                                                        : 'text.secondary',
                                                            bgcolor: publishSuccess
                                                                ? 'action.hover'
                                                                : recording
                                                                    ? alpha(theme.palette.error.main, 0.12)
                                                                    : recordingCompleted
                                                                        ? alpha(theme.palette.success.main, 0.12)
                                                                        : 'action.hover',
                                                        }}
                                                    >
                                                        1
                                                    </Box>
                                                    <Box sx={{ flex: 1 }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main' }}>Record</Typography>
                                                            {recording && (
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 0.75, py: 0.2, borderRadius: 999, border: '1px solid', borderColor: alpha(theme.palette.error.main, 0.3), bgcolor: alpha(theme.palette.error.main, 0.12) }}>
                                                                    <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'error.main' }} />
                                                                    <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'error.main' }}>Live</Typography>
                                                                </Box>
                                                            )}
                                                        </Box>
                                                        <Typography variant="caption" sx={{ fontStyle: 'italic', color: isDark ? alpha(theme.palette.error.light, 0.82) : alpha(theme.palette.error.dark, 0.78) }}>
                                                            Capture browser interactions
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                {recording ? (
                                                    <MuiButton
                                                        onClick={stopRecording}
                                                        title="Stop recording"
                                                        size="small"
                                                        variant="outlined"
                                                        color="error"
                                                        sx={{ minWidth: 80, height: 28, fontSize: '0.72rem', fontWeight: 700 }}
                                                    >
                                                        Stop
                                                    </MuiButton>
                                                ) : (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', justifyContent: 'flex-end', flexShrink: 0 }}>
                                                        {(recordingCompleted || currentFile) && !recording && (
                                                            <MuiButton
                                                                onClick={() => setShowSnippetModal(true)}
                                                                title="Extract partial snippet"
                                                                size="small"
                                                                variant="outlined"
                                                                color="error"
                                                                startIcon={<Scissors size={12} />}
                                                                sx={{ height: 26, px: 1, fontSize: '0.64rem', fontWeight: 700, minWidth: 112 }}
                                                            >
                                                                Partial Snippet
                                                            </MuiButton>
                                                        )}
                                                        <MuiButton
                                                            onClick={startRecording}
                                                            title="Start recording"
                                                            size="small"
                                                            variant="outlined"
                                                            color="error"
                                                            sx={{ minWidth: 80, height: 28, fontSize: '0.72rem', fontWeight: 700 }}
                                                        >
                                                            Start
                                                        </MuiButton>
                                                    </Box>
                                                )}
                                            </Box>
                                        </Box>

                                        {/* STEP 2: Generate */}
                                        <Box
                                            sx={{
                                                p: 1,
                                                borderRadius: 1.5,
                                                border: '1px solid',
                                                borderColor: generating ? alpha(theme.palette.error.main, 0.4) : 'divider',
                                                bgcolor: generating ? alpha(theme.palette.error.main, 0.1) : isDark ? '#21262D' : '#fff',
                                                boxShadow: generating ? `0 0 20px ${alpha(theme.palette.error.main, 0.2)}` : 'none',
                                                transition: 'all 0.25s ease',
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.25 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                                                    <Box sx={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, border: '2px solid', borderColor: generating ? 'error.main' : output?.status === 'success' ? 'success.main' : 'divider', color: generating ? 'error.main' : output?.status === 'success' ? 'success.main' : 'text.secondary', bgcolor: generating ? alpha(theme.palette.error.main, 0.12) : output?.status === 'success' ? alpha(theme.palette.success.main, 0.12) : 'action.hover' }}>
                                                        2
                                                    </Box>
                                                    <Box sx={{ flex: 1 }}>
                                                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main' }}>Generate POM</Typography>
                                                        <Typography variant="caption" sx={{ fontStyle: 'italic', color: isDark ? alpha(theme.palette.error.light, 0.82) : alpha(theme.palette.error.dark, 0.78) }}>
                                                            {useAI ? 'AI-powered generation' : 'AST-based generation'}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', justifyContent: 'flex-end', flexShrink: 0 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', p: 0.25, borderRadius: 999, border: '1px solid', borderColor: 'divider', bgcolor: isDark ? alpha('#fff', 0.05) : alpha('#000', 0.03) }}>
                                                        <MuiButton size="small" variant={!useAI ? 'contained' : 'text'} color="error" onClick={() => !generating && setUseAI(false)} startIcon={<Cpu size={12} />} sx={{ minWidth: 56, height: 24, fontSize: '0.65rem', px: 1 }}>
                                                            AST
                                                        </MuiButton>
                                                        <MuiButton size="small" variant={useAI ? 'contained' : 'text'} color="error" onClick={() => !generating && setUseAI(true)} startIcon={<Sparkles size={12} />} sx={{ minWidth: 56, height: 24, fontSize: '0.65rem', px: 1 }}>
                                                            AI
                                                        </MuiButton>
                                                    </Box>
                                                    {useAI && (
                                                        <IconButton onClick={(e) => { e.stopPropagation(); fetchPrompts(); }} size="small" sx={{ color: 'error.main' }} title="View AI Prompts">
                                                            <Info size={16} />
                                                        </IconButton>
                                                    )}
                                                    <MuiButton onClick={generatePOM} disabled={generating || recording} size="small" variant="outlined" color="error" sx={{ minWidth: 80, height: 28, fontSize: '0.72rem', fontWeight: 700 }}>
                                                        {generating ? 'Running...' : 'Generate'}
                                                    </MuiButton>
                                                </Box>
                                            </Box>
                                            <Box sx={{ mt: 0.75, pt: 0.75, borderTop: '1px solid', borderColor: 'divider', fontSize: '0.58rem', color: output?.status === 'success' ? 'success.main' : 'text.secondary' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    {generating ? <RefreshCw size={9} /> : output?.status === 'success' ? (output.method === 'AI-powered' ? <Sparkles size={9} /> : <CheckCircle size={9} />) : <Circle size={9} />}
                                                    <Typography component="span" sx={{ fontSize: '0.62rem', fontWeight: 600 }}>
                                                        {generating ? 'Generating...' : output?.status === 'success' ? `${output.files?.length || 0} files (${output.method || 'Traditional'})` : 'Status: Ready'}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </Box>

                                        {/* STEP 3: Test */}
                                        <Box
                                            sx={{
                                                p: 1,
                                                borderRadius: 1.5,
                                                border: '1px solid',
                                                borderColor: runningTest ? alpha(theme.palette.error.main, 0.4) : 'divider',
                                                bgcolor: runningTest ? alpha(theme.palette.error.main, 0.1) : isDark ? '#21262D' : '#fff',
                                                transition: 'all 0.25s ease',
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.25 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                                                    <Box sx={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, border: '2px solid', borderColor: runningTest ? 'error.main' : testResult?.status === 'success' ? 'success.main' : testResult ? 'error.main' : 'divider', color: runningTest ? 'error.main' : testResult?.status === 'success' ? 'success.main' : testResult ? 'error.main' : 'text.secondary', bgcolor: runningTest ? alpha(theme.palette.error.main, 0.12) : testResult?.status === 'success' ? alpha(theme.palette.success.main, 0.12) : testResult ? alpha(theme.palette.error.main, 0.12) : 'action.hover' }}>
                                                        3
                                                    </Box>
                                                    <Box sx={{ flex: 1 }}>
                                                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main' }}>Run Tests</Typography>
                                                        <Typography variant="caption" sx={{ fontStyle: 'italic', color: isDark ? alpha(theme.palette.error.light, 0.82) : alpha(theme.palette.error.dark, 0.78) }}>
                                                            Execute latest generated POM tests
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', justifyContent: 'flex-end', flexShrink: 0 }}>
                                                    {testResult && testResult.status !== 'success' && !healResult?.fixes_applied && (
                                                        <MuiButton onClick={healTest} disabled={healing || runningTest} size="small" variant="outlined" color="error" startIcon={<Wand2 size={12} />} sx={{ minWidth: 92, height: 28, fontSize: '0.7rem', fontWeight: 700 }}>
                                                            {healing ? 'Healing...' : healResult?.fixes_applied ? 'Healed!' : 'Heal'}
                                                        </MuiButton>
                                                    )}
                                                    <MuiButton onClick={() => runTest()} disabled={runningTest || recording || healing} size="small" variant="outlined" color="error" sx={{ minWidth: 80, height: 28, fontSize: '0.72rem', fontWeight: 700 }}>
                                                        {runningTest ? 'Run...' : 'Run'}
                                                    </MuiButton>
                                                </Box>
                                            </Box>
                                            <Box sx={{ mt: 0.75, pt: 0.75, borderTop: '1px solid', borderColor: 'divider', fontSize: '0.58rem', color: healResult?.fixes_applied ? 'success.main' : testResult?.status === 'success' ? 'success.main' : testResult || testError ? 'error.main' : 'text.secondary' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    {healing ? <Wand2 size={9} /> : healResult?.fixes_applied ? <CheckCircle size={9} /> : runningTest ? <RefreshCw size={9} /> : testResult ? (testResult.status === 'success' ? <CheckCircle size={9} /> : <XCircle size={9} />) : testError ? <AlertCircle size={9} /> : <Circle size={9} />}
                                                    <Typography component="span" sx={{ fontSize: '0.62rem', fontWeight: 600 }}>
                                                        {healing
                                                            ? 'AI analyzing failure...'
                                                            : healResult?.fixes_applied
                                                                ? 'Fixed! Click Run to retest'
                                                                : runningTest
                                                                    ? 'Running...'
                                                                    : testResult
                                                                        ? `${testResult.status === 'success' ? 'Passed' : 'Failed - Click Heal'} (Exit: ${testResult.return_code})`
                                                                        : testError
                                                                            ? 'Error Occurred'
                                                                            : 'Status: Ready'}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </Box>

                                        {/* STEP 4: Publish */}
                                        <Box
                                            sx={{
                                                p: 1,
                                                borderRadius: 1.5,
                                                border: '1px solid',
                                                borderColor: 'divider',
                                                bgcolor: isDark ? '#21262D' : '#fff',
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                                                    <Box sx={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, border: '2px solid', borderColor: publishSuccess ? 'success.main' : 'divider', color: publishSuccess ? 'success.main' : 'text.secondary', bgcolor: publishSuccess ? alpha(theme.palette.success.main, 0.12) : 'action.hover' }}>
                                                        4
                                                    </Box>
                                                    <Box sx={{ flex: 1 }}>
                                                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main' }}>Publish</Typography>
                                                        <Typography variant="caption" sx={{ fontStyle: 'italic', color: isDark ? alpha(theme.palette.error.light, 0.82) : alpha(theme.palette.error.dark, 0.78) }}>
                                                            Deploy POM code to test framework
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                <MuiButton
                                                    onClick={() => setShowPublishModal(true)}
                                                    disabled={recording || generating}
                                                    size="small"
                                                    variant="outlined"
                                                    color="error"
                                                    sx={{ minWidth: 80, height: 28, fontSize: '0.72rem', fontWeight: 700, mt: 0.125 }}
                                                >
                                                    Publish
                                                </MuiButton>
                                            </Box>
                                        </Box>
                                    </Box>
                                </Box>
                            </Paper>


                            {/* 5. Output / Console - Flexible Height */}
                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', borderRadius: 2, border: '1px solid', borderColor: 'divider', boxShadow: isDark ? '0 10px 24px rgba(0,0,0,0.35)' : '0 6px 18px rgba(15,23,42,0.08)', overflow: 'hidden', minHeight: 0, bgcolor: isDark ? '#161B22' : '#fff' }}>
                                {/* Terminal Header / Tabs */}
                                <Box sx={{ py: 1.25, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, px: 2.75, bgcolor: isDark ? '#21262D' : 'grey.50' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <MuiButton
                                            onClick={() => setActiveTerminalTab('output')}
                                            size="small"
                                            color="error"
                                            variant="text"
                                            startIcon={<Wand2 size={12} />}
                                            sx={{
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.08em',
                                                fontSize: '0.68rem',
                                                fontWeight: 700,
                                                color: activeTerminalTab === 'output' ? 'error.main' : 'text.secondary',
                                                borderBottom: '2px solid',
                                                borderBottomColor: activeTerminalTab === 'output' ? 'error.main' : 'transparent',
                                                borderRadius: 0,
                                                px: 0.25,
                                            }}
                                        >
                                            Generation
                                        </MuiButton>
                                        <MuiButton
                                            onClick={() => setActiveTerminalTab('test')}
                                            size="small"
                                            color="error"
                                            variant="text"
                                            startIcon={<Terminal size={12} />}
                                            sx={{
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.08em',
                                                fontSize: '0.68rem',
                                                fontWeight: 700,
                                                color: activeTerminalTab === 'test' ? 'error.main' : 'text.secondary',
                                                borderBottom: '2px solid',
                                                borderBottomColor: activeTerminalTab === 'test' ? 'error.main' : 'transparent',
                                                borderRadius: 0,
                                                px: 0.25,
                                            }}
                                        >
                                            Test Execution
                                        </MuiButton>
                                    </Box>
                                    {activeTerminalTab === 'test' && (testResult || runningTest || liveLogs) && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            {testResult && (
                                                <Tooltip title="Download Report" arrow placement="top">
                                                    <IconButton onClick={handleDownloadReport} size="small" sx={{ color: 'error.main' }}>
                                                        <Download size={14} />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            <Tooltip title="Expand Logs" arrow placement="top">
                                                <IconButton onClick={() => setShowLogsModal(true)} size="small" sx={{ color: 'error.main' }}>
                                                    <Search size={14} />
                                                </IconButton>
                                            </Tooltip>
                                            {testResult && (
                                                <Tooltip title={copied ? "Copied" : "Copy Log"} arrow placement="top">
                                                    <IconButton onClick={handleCopy} size="small" sx={{ color: 'error.main' }}>
                                                        {copied ? <Check size={14} /> : <Copy size={14} />}
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Box>
                                    )}
                                </Box>

                                <Box sx={{ flex: 1, overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.75rem', px: 1.5, pt: 1, pb: 1 }}>
                                    {/* TAB 1: GENERATION OUTPUT */}
                                    {activeTerminalTab === 'output' && (
                                        <>
                                            {!output && !generating && (
                                                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, color: 'text.secondary' }}>
                                                    <BoxIcon size={24} />
                                                    <Typography variant="caption">No generation output</Typography>
                                                </Box>
                                            )}

                                            {generating && (
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                    <Box sx={{ height: 16, width: '75%', borderRadius: 0.75, bgcolor: isDark ? '#1f2937' : '#e5e7eb' }} />
                                                    <Box sx={{ height: 16, width: '50%', borderRadius: 0.75, bgcolor: isDark ? '#1f2937' : '#e5e7eb' }} />
                                                    <Box sx={{ height: 16, width: '83%', borderRadius: 0.75, bgcolor: isDark ? '#1f2937' : '#e5e7eb' }} />
                                                </Box>
                                            )}

                                            {output && output.status === 'success' && (
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'success.main', mb: 0.25 }}>
                                                        <CheckCircle size={16} />
                                                        <Typography variant="caption" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
                                                            Generation Complete
                                                        </Typography>
                                                    </Box>

                                                    <Box>
                                                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1.25, display: 'block', lineHeight: 1.35 }}>
                                                            Created POM Files: ready to publish to framework
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                            {output.files?.map((f, i) => (
                                                                <Box
                                                                    key={i}
                                                                    onClick={() => handlePreviewFile(f)}
                                                                    title="Click to view & edit"
                                                                    sx={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: 1,
                                                                        borderRadius: 1,
                                                                        px: 1.5,
                                                                        py: 1.25,
                                                                        cursor: 'pointer',
                                                                        border: '1px solid',
                                                                        borderColor: 'transparent',
                                                                        '&:hover': {
                                                                            bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                                                            borderColor: 'divider',
                                                                        },
                                                                    }}
                                                                >
                                                                    <FileCode size={14} color={theme.palette.error.main} />
                                                                    <Typography variant="caption" sx={{ fontFamily: 'monospace', lineHeight: 1.35, color: 'text.primary' }}>
                                                                        {f}
                                                                    </Typography>
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'error.main', ml: 0.5 }}>
                                                                        <Eye size={12} />
                                                                    </Box>
                                                                    <Box sx={{ flex: 1 }} />
                                                                </Box>
                                                            ))}
                                                        </Box>
                                                    </Box>
                                                </Box>
                                            )}
                                        </>
                                    )}

                                    {/* TAB 2: TEST EXECUTION */}
                                    {activeTerminalTab === 'test' && (
                                        <>
                                            {!runningTest && !testResult && !testError && (
                                                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, color: 'text.secondary' }}>
                                                    <Play size={24} />
                                                    <Typography variant="caption">Ready to execute tests</Typography>
                                                </Box>
                                            )}

                                            {/* Running State */}
                                            {runningTest && (
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, fontSize: '0.75rem', fontWeight: 600, color: 'error.main' }}>
                                                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main' }} />
                                                        Executing Pytest...
                                                    </Box>
                                                    <Typography sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: 1.6, opacity: 0.85, color: 'text.primary' }}>
                                                        {liveLogs}
                                                    </Typography>
                                                </Box>
                                            )}

                                            {/* Error State */}
                                            {testError && (
                                                <Box sx={{ p: 1.5, borderRadius: 1, border: '1px solid', borderColor: alpha(theme.palette.error.main, 0.3), bgcolor: alpha(theme.palette.error.main, 0.08), color: 'error.main', fontSize: '0.75rem' }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700, mb: 0.5 }}>
                                                        <XCircle size={14} />
                                                        Execution Error
                                                    </Box>
                                                    {testError}
                                                </Box>
                                            )}

                                            {/* Result State */}
                                            {testResult && !runningTest && (
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderRadius: 1, border: '1px solid', borderColor: alpha(testResult.status === 'success' ? theme.palette.success.main : theme.palette.error.main, 0.3), bgcolor: alpha(testResult.status === 'success' ? theme.palette.success.main : theme.palette.error.main, 0.08) }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700, color: testResult.status === 'success' ? 'success.main' : 'error.main' }}>
                                                            {testResult.status === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                                                            Test {testResult.status === 'success' ? 'Passed' : 'Failed'}
                                                        </Box>
                                                        <Typography variant="caption" sx={{ fontFamily: 'monospace', opacity: 0.7, color: 'text.secondary' }}>
                                                            Exit: {testResult.return_code}
                                                        </Typography>
                                                    </Box>

                                                    <Box>
                                                        <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', color: 'text.secondary', mb: 1, display: 'block' }}>
                                                            Console Output
                                                        </Typography>
                                                        <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, opacity: 0.9, color: 'text.primary' }}>
                                                            {testResult.output}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            )}
                                        </>
                                    )}
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                </Box>

                {/* AI Chat System */}
                <AIChatWindow
                    isDark={isDark}
                    showChat={showChat}
                    setShowChat={setShowChat}
                    chatMessages={chatMessages}
                    setChatMessages={setChatMessages}
                    isChatTyping={isChatTyping}
                    includeContext={includeContext}
                    setIncludeContext={setIncludeContext}
                    onSendMessage={handleSendMessage}
                />

                {/* Floating Toggle Button */}
                <Box
                    sx={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        zIndex: 110,
                        cursor: 'grab',
                        transform: `translate(${chatPos.x}px, ${chatPos.y}px)`,
                        '&:active': { cursor: 'grabbing' },
                    }}
                    onMouseDown={(e) => {
                        isDraggingChat.current = true;
                        chatDragStart.current = { x: e.clientX, y: e.clientY };
                        chatStartPos.current = { ...chatPos };
                        hasMoved.current = false;
                    }}
                >
                    <IconButton
                        onClick={(e) => {
                            if (hasMoved.current) {
                                e.preventDefault();
                                return;
                            }
                            setShowChat(!showChat);
                        }}
                        title={showChat ? 'Close assistant' : 'Open assistant'}
                        sx={{
                            position: 'relative',
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            overflow: 'visible',
                            color: '#fff',
                            background: 'linear-gradient(135deg, #D00000, #D00000, #D00000)',
                            boxShadow: '0 16px 32px rgba(0,0,0,0.35)',
                            transition: 'transform 0.2s ease',
                            ...(!showChat && {
                                animation: `${chatGlow} 1.4s ease-in-out infinite`,
                            }),
                            '&:hover': { transform: 'scale(1.1)', background: 'linear-gradient(135deg, #D00000, #D00000, #D00000)' },
                            '&:active': { transform: 'scale(0.95)' },
                        }}
                    >
                        {!showChat && (
                            <>
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        inset: 0,
                                        borderRadius: '50%',
                                        border: '1px solid',
                                        borderColor: isDark ? '#4b5563' : 'rgba(185,28,28,0.4)',
                                        animation: `${chatPing} 1.6s linear infinite`,
                                        pointerEvents: 'none',
                                    }}
                                />
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        inset: 0,
                                        borderRadius: '50%',
                                        border: '1px solid',
                                        borderColor: isDark ? '#374151' : 'rgba(185,28,28,0.2)',
                                        animation: `${chatPing} 1.6s linear infinite`,
                                        animationDelay: '0.8s',
                                        pointerEvents: 'none',
                                    }}
                                />
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        top: -2,
                                        right: -2,
                                        width: 10,
                                        height: 10,
                                        borderRadius: '50%',
                                        bgcolor: '#22c55e',
                                        border: '1px solid',
                                        borderColor: '#fff',
                                        animation: `${chatBadgePulse} 1.1s ease-in-out infinite`,
                                        pointerEvents: 'none',
                                    }}
                                />
                            </>
                        )}
                        {showChat ? (
                            <X size={24} />
                        ) : (
                            <MessageSquare size={24} />
                        )}
                    </IconButton>
                </Box>
            </Box>
        </>
    );
}
