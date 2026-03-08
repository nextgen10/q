import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Bot, Box as BoxIcon, Check, CheckCircle, ChevronDown, ChevronRight, Circle, Clock, Copy, Cpu, Download, Eye, FileCode, Folder, FolderInput, FolderOpen, Info, Layers, MessageSquare, Play, RefreshCw, Rocket, Save, Scissors, Search, Sparkles, Square, Terminal, Trash2, Upload, User, Video, Wand2, X, XCircle } from 'lucide-react';
import { AIChatWindow } from '../UI/AIChatWindow';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { Box, Divider, Menu, MenuItem, Paper, Tooltip, Typography } from '@mui/material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { alpha, useTheme } from '@mui/material/styles';
import { ThemeToggle } from '../UI/ThemeToggle';
import { StatusSnackbar } from '../UI/StatusSnackbar';

export function StudioView() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

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
        fetch('/api/playwright-pom/generate/files')
            .then(res => res.json())
            .then(data => setGeneratedFiles(data.files || []))
            .catch(console.error);

        // Fetch markers from settings
        fetch('/api/playwright-pom/settings')
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
                    const res = await fetch(`/api/playwright-pom/tests/logs?offset=${logOffset}`);
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
                    const res = await fetch(`/api/playwright-pom/record/run/logs?offset=${logOffset}`);
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
            fetch('/api/playwright-pom/settings')
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
            const res = await fetch('/api/playwright-pom/tests/run', {
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

            const res = await fetch('/api/playwright-pom/ai/heal', {
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
            const res = await fetch('/api/playwright-pom/ai/prompts', {
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
            const res = await fetch('/api/tests/report/download', { method: 'GET' });
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
            // Fallback: keep legacy behavior if blob download fails.
            window.open('/api/tests/report/download', '_blank');
        }
    };

    const publishTest = async () => {
        if (!testName.trim()) return;
        try {
            setPublishing(true);
            setTestError(null);
            const res = await fetch('/api/playwright-pom/publish', {
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
            const res = await fetch(`/api/playwright-pom/record/load/${filepath}`);
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
            const res = await fetch('/api/playwright-pom/record/save', {
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
            const res = await fetch('/api/playwright-pom/record/files');
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
            const res = await fetch('/api/playwright-pom/extract-snippet', {
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
                    const res = await fetch('/api/playwright-pom/record/content');
                    const data = await res.json();
                    setCode(data.content);
                } catch (err) {
                    console.error("Failed to fetch code", err);
                }
            }, 1000);
        } else {
            // Initial fetch or refresh when not recording
            fetch('/api/playwright-pom/record/content')
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

            const res = await fetch('/api/playwright-pom/record/save', {
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
            const res = await fetch('/api/playwright-pom/record/save-as', {
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
                fetch(`/api/playwright-pom/record/delete/${path}`, { method: 'DELETE' })
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
            const res = await fetch(`/api/playwright-pom/record/delete/${confirmDeleteFile}`, { method: 'DELETE' });
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
            const res = await fetch(`/api/playwright-pom/record/load/${filepath}`);
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
            const res = await fetch('/api/playwright-pom/record/start', { method: 'POST' });
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
            await fetch('/api/playwright-pom/record/stop', { method: 'POST' });
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

            const res = await fetch('/api/playwright-pom/generate', {
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
            const res = await fetch('/api/playwright-pom/record/run', {
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

        fetch('/api/playwright-pom/ai/chat', {
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
            {showRunRawModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => !runningRaw && setShowRunRawModal(false)}>
                    <div
                        className={`w-[800px] h-[70vh] flex flex-col rounded-xl border shadow-2xl overflow-hidden ${isDark ? 'bg-[#161B22] border-gray-800' : 'bg-white border-gray-300'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div
                            className={`flex items-center justify-between px-5 border-b ${isDark ? 'border-gray-800 bg-[#21262D]' : 'border-gray-300 bg-gray-50'}`}
                            style={{ minHeight: 76, paddingTop: 14, paddingBottom: 14 }}
                        >
                            <div className="flex items-center gap-3">
                                <Play className={isDark ? 'text-cyan-400' : 'text-cyan-600'} size={20} />
                                <h3 className={`text-lg font-bold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Raw Script Execution</h3>
                                {runningRaw && (
                                    <div className={`flex items-center gap-2 px-2 py-1 rounded-full border text-xs font-semibold ${isDark ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' : 'bg-cyan-50 border-cyan-200 text-cyan-700'}`}>
                                        <RefreshCw size={12} className="animate-spin" />
                                        Running...
                                    </div>
                                )}
                            </div>
                            <button onClick={() => setShowRunRawModal(false)} disabled={runningRaw} title="Close" className={`p-1.5 rounded-md transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-200 text-gray-500'} disabled:opacity-50`}>
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body - Logs */}
                        <div className={`flex-1 flex flex-col min-h-0 p-5 font-mono text-sm ${isDark ? 'bg-[#161B22]' : 'bg-white'}`}>
                            {runningRaw && !rawRunResult && (
                                <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-50">
                                    <RefreshCw size={48} className="animate-spin text-cyan-500" />
                                    <p>Starting execution...</p>
                                </div>
                            )}

                            {rawRunResult && (
                                <div className="flex-1 flex flex-col min-h-0 gap-4">
                                    {rawRunResult.status === 'running' ? (
                                        <div className={`flex items-center gap-2 text-base font-bold shrink-0 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
                                            <RefreshCw size={20} className="animate-spin" />
                                            Execution In Progress...
                                        </div>
                                    ) : (
                                        <div className={`flex items-center gap-2 text-base font-bold shrink-0 ${rawRunResult.status === 'success' ? (isDark ? 'text-green-400' : 'text-green-600') : (isDark ? 'text-red-400' : 'text-red-600')}`}>
                                            {rawRunResult.status === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                                            {rawRunResult.status === 'success' ? 'Execution Successful' : 'Execution Failed'}
                                            {rawRunResult.return_code !== undefined && <span className={`ml-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>(Exit Code: {rawRunResult.return_code})</span>}
                                        </div>
                                    )}

                                    <div className={`flex-1 overflow-y-auto custom-scrollbar p-4 rounded-lg border whitespace-pre-wrap break-words min-h-0 ${isDark ? 'bg-black/40 border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                                        {rawRunResult.output || (
                                            rawRunResult.status === 'success' ?
                                                <span className="italic text-gray-500">Execution Successful (No Output)</span> :
                                                "No output generated."
                                        )}
                                        <div ref={rawLogEndRef} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Logs Expansion Modal */}
            {showLogsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowLogsModal(false)}>
                    <div
                        className={`w-[800px] h-[80vh] flex flex-col rounded-xl border shadow-2xl overflow-hidden ${isDark ? 'bg-[#161B22] border-gray-800' : 'bg-white border-gray-300'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div
                            className={`flex items-center justify-between px-5 border-b ${isDark ? 'border-gray-800 bg-[#21262D]' : 'border-gray-300 bg-gray-50'}`}
                            style={{ minHeight: 50, paddingTop: 14, paddingBottom: 14 }}
                        >
                            <div className="flex items-center gap-3" style={{ marginLeft: 10 }}>
                                <Terminal className={isDark ? 'text-red-400' : 'text-red-700'} size={20} />
                                <h3 className={`text-lg font-bold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Test Execution Logs</h3>
                                {runningTest && (
                                    <div className={`flex items-center gap-2 px-2 py-1 rounded-full border text-xs font-semibold ${isDark ? 'bg-red-600/10 border-red-600/20 text-red-400' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-600" />
                                        Running...
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {testResult && (
                                    <button
                                        onClick={handleCopy}
                                        title={copied ? "Copied" : "Copy Logs"}
                                        className={`p-1.5 rounded-md transition-colors ${copied ? 'text-green-500' : (isDark ? 'text-red-400 hover:bg-white/10' : 'text-red-700 hover:bg-gray-200')}`}
                                    >
                                        {copied ? <Check size={18} /> : <Copy size={18} />}
                                    </button>
                                )}
                                <button onClick={() => setShowLogsModal(false)} title="Close" className={`rounded-md transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`} style={{ padding: 6, marginRight: 6 }}>
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div
                            className={`flex-1 overflow-y-auto overflow-x-hidden font-mono text-sm custom-scrollbar ${isDark ? 'bg-[#161B22]' : 'bg-white'}`}
                            style={{ paddingTop: 20, paddingBottom: 20, paddingLeft: 28, paddingRight: 28 }}
                        >
                            {runningTest && (
                                <div className="space-y-3">
                                    <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-red-400' : 'text-red-700'}`}>
                                        <RefreshCw size={16} />
                                        <span className="font-bold">Executing tests...</span>
                                    </div>
                                    {liveLogs && (
                                        <pre className={`whitespace-pre-wrap break-words p-4 rounded-lg border ${isDark ? 'bg-black/40 border-gray-800 text-gray-300' : 'bg-white border-gray-300 text-gray-700'}`}>{liveLogs}</pre>
                                    )}
                                </div>
                            )}
                            {!runningTest && testResult && (
                                <div className="space-y-4">
                                    <div className={`flex items-center gap-2 text-base font-bold ${testResult.status === 'success' ? (isDark ? 'text-green-400' : 'text-green-600') : (isDark ? 'text-red-400' : 'text-red-600')}`}>
                                        {testResult.status === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                                        {testResult.status === 'success' ? 'Tests Passed' : 'Tests Failed'}
                                        <span className={`ml-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>(Exit Code: {testResult.return_code})</span>
                                    </div>
                                    {testResult.output && (
                                        <div>
                                            <div className={`text-xs mb-2 uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Output:</div>
                                            <pre className={`whitespace-pre-wrap break-words p-4 rounded-lg border ${isDark ? 'bg-black/40 border-gray-800 text-gray-300' : 'bg-white border-gray-300 text-gray-700'}`}>{testResult.output}</pre>
                                        </div>
                                    )}
                                </div>
                            )}
                            {!runningTest && testError && (
                                <div className="space-y-3">
                                    <div className={`flex items-center gap-2 text-base font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                                        <AlertCircle size={20} />
                                        Error Occurred
                                    </div>
                                    <pre className={`whitespace-pre-wrap break-words p-4 rounded-lg border ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-200' : 'bg-red-50 border-red-200 text-red-700'}`}>{testError}</pre>
                                </div>
                            )}
                            {!runningTest && !testResult && !testError && (
                                <div className={`h-full flex flex-col items-center justify-center space-y-3 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                    <Terminal size={48} className="opacity-20" />
                                    <p className="text-lg">No test execution logs</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div
                            className={`px-5 border-t flex justify-end items-center gap-3 shrink-0 ${isDark ? 'border-gray-800 bg-[#21262D]' : 'border-gray-300 bg-gray-50'}`}
                            style={{ minHeight: 72, paddingTop: 10, paddingBottom: 10, paddingRight: 28 }}
                        >
                            <Button
                                variant="danger"
                                onClick={() => setShowLogsModal(false)}
                                className="px-8 my-1 font-bold"
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            {/* AI Prompts Modal */}
            {showPromptsModal && aiPrompts && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowPromptsModal(false)}>
                    <div
                        className={`w-[800px] h-[80vh] flex flex-col rounded-xl border shadow-2xl overflow-hidden ${isDark ? 'bg-[#161B22] border-gray-800' : 'bg-white border-gray-300'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={`flex items-center justify-between px-4 border-b ${isDark ? 'border-gray-800 bg-[#21262D]' : 'border-gray-300 bg-gray-50'}`} style={{ paddingTop: 16, paddingBottom: 16, minHeight: 72 }}>
                            <div className="flex items-center gap-2.5" style={{ marginLeft: 24 }}>
                                <Sparkles className={isDark ? 'text-red-400' : 'text-red-700'} size={18} />
                                <h3 className={`text-lg font-bold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>AI Prompts Preview</h3>
                            </div>
                            <button
                                onClick={() => setShowPromptsModal(false)}
                                title="Close"
                                className={`p-1.5 rounded-md transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
                                style={{ marginRight: 24 }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className={`flex-1 overflow-y-auto custom-scrollbar space-y-4 ${isDark ? 'bg-[#161B22]' : 'bg-white'}`} style={{ padding: "20px" }}>
                            {/* System Prompt */}
                            <div style={{ margin: 0, marginLeft: 10 }}>
                                <h4 className={`text-xs font-bold uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-600'}`} style={{ margin: 0, marginBottom: 10 }}>System Prompt</h4>
                                <pre className={`m-0 rounded-lg border text-xs whitespace-pre-wrap break-words font-mono leading-relaxed ${isDark ? 'bg-black/35 border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`} style={{ padding: "16px" }}>
                                    {aiPrompts.system_prompt}
                                </pre>
                            </div>

                            {/* User Prompt */}
                            <div style={{ margin: 0, marginTop: 14, marginLeft: 10 }}>
                                <h4 className={`text-xs font-bold uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-600'}`} style={{ margin: 0, marginBottom: 10 }}>User Prompt</h4>
                                <pre className={`m-0 rounded-lg border text-xs whitespace-pre-wrap break-words font-mono leading-relaxed ${isDark ? 'bg-black/35 border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`} style={{ padding: "18px", minHeight: 220 }}>
                                    {aiPrompts.user_prompt}
                                </pre>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <StatusSnackbar status={status} onClose={() => setStatus(null)} />

                {/* Save As Modal */}
                {showSaveAs && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className={`w-[460px] rounded-xl border shadow-2xl overflow-hidden ${isDark ? 'bg-[#161B22] border-gray-800' : 'bg-white border-gray-300'}`}>
                            <div className={`flex items-center justify-between px-5 py-3.5 border-b ${isDark ? 'border-gray-800 bg-[#21262D]' : 'border-gray-300 bg-gray-50'}`}>
                                <div className="flex items-center gap-2">
                                    <Save className="text-red-600" size={18} />
                                    <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Save Recording As</h3>
                                </div>
                                <button
                                    onClick={() => { setShowSaveAs(false); setSaveAsName(''); setSaveAsFolderName(''); }}
                                    title="Close"
                                    className={`p-1 rounded hover:bg-white/10 transition-colors ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div style={{ padding: 18 }}>

                                {/* Folder Name Input (Optional) */}
                                <div className="mb-3">
                                    <label className={`block text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        Folder Name <span className="text-red-400">*</span>
                                    </label>
                                    <div className="relative">
                                        <FolderOpen size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-yellow-500' : 'text-yellow-600'}`} />
                                        <input
                                            type="text"
                                            maxLength={30}
                                            value={saveAsFolderName}
                                            onChange={(e) => setSaveAsFolderName(e.target.value.replace(/\s+/g, '_'))}
                                            placeholder="e.g., authentication (Max 30 chars)"
                                            className={`w-full pl-9 pr-3 py-2 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-600 ${isDark ? 'bg-[#0D1117] border-gray-800 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'}`}
                                            onKeyDown={(e) => e.key === 'Enter' && saveAsName.trim() && saveAsFolderName.trim() && saveAsFile()}
                                        />
                                    </div>
                                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                        Saves to: recordings/{saveAsFolderName ? `${saveAsFolderName.toLowerCase().replace(/[^\w-]/g, '_')}/` : 'folder/'}{saveAsName ? `${saveAsName.replace(/[^\w-]/g, '_')}.py` : 'filename.py'}
                                    </p>
                                </div>

                                {/* Filename Input */}
                                <div className="mb-4">
                                    <label className={`block text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        Scenario Name <span className={`${isDark ? 'text-red-400' : 'text-red-500'}`}>*</span>
                                    </label>
                                    <div className="relative">
                                        <FileCode size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                                        <input
                                            type="text"
                                            maxLength={30}
                                            value={saveAsName}
                                            onChange={(e) => setSaveAsName(e.target.value.replace(/\s+/g, '_'))}
                                            placeholder="e.g., login_flow (Max 30 chars)"
                                            className={`w-full pl-9 pr-3 py-2 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-600 ${isDark ? 'bg-[#0D1117] border-gray-800 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'}`}
                                            onKeyDown={(e) => e.key === 'Enter' && saveAsName.trim() && saveAsFolderName.trim() && saveAsFile()}
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        variant="danger"
                                        fullWidth
                                        onClick={() => { setShowSaveAs(false); setSaveAsName(''); setSaveAsFolderName(''); }}
                                        className="px-6"
                                        icon={X}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="primary-glass"
                                        fullWidth
                                        onClick={saveAsFile}
                                        disabled={saveStatus === 'saving' || !saveAsName.trim() || !saveAsFolderName.trim()}
                                        className="px-6"
                                        loading={saveStatus === 'saving'}
                                        icon={Save}
                                    >
                                        Save
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showPublishModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className={`w-[560px] max-w-[92vw] rounded-xl border shadow-2xl overflow-hidden flex flex-col ${isDark ? 'bg-[#161B22] border-gray-800' : 'bg-white border-gray-300'}`}>
                            <div className={`flex items-center justify-between px-5 border-b ${isDark ? 'border-gray-800 bg-[#21262D]' : 'border-gray-300 bg-gray-50'}`} style={{ paddingTop: 14, paddingBottom: 14, minHeight: 72 }}>
                                <div className="flex items-center gap-3" style={{ marginLeft: 12 }}>
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-red-600/15' : 'bg-purple-100'}`}>
                                        <Rocket className="text-red-600" size={16} />
                                    </div>
                                    <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Publish to Framework</h3>
                                </div>
                                <button
                                    onClick={() => { setShowPublishModal(false); setTestName(''); setFolderName(''); setSelectedMarker(''); setIsSnippet(false); }}
                                    title="Close"
                                    className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                                    style={{ marginRight: 18 }}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div style={{ padding: 24 }}>

                                {!publishSuccess ? (
                                    <div style={{ display: 'grid', rowGap: 24 }}>
                                        {/* Folder Name Input (Optional) */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            <label className={`block text-xs ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                                                Folder Name <span className="text-red-400">*</span>
                                            </label>
                                            <div className="relative" style={{ paddingLeft: 4, paddingRight: 4 }}>
                                                <FolderInput size={14} className="absolute top-1/2 -translate-y-1/2 text-yellow-500" style={{ left: 18 }} />
                                                <input
                                                    type="text"
                                                    maxLength={30}
                                                    value={folderName}
                                                    onChange={(e) => setFolderName(e.target.value.replace(/\s+/g, '_'))}
                                                    placeholder="e.g., authentication (Max 30 chars)"
                                                    className={`w-full pr-3 py-3 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-600 ${isDark ? 'bg-[#0D1117] border-gray-800 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 shadow-sm'}`}
                                                    style={{ paddingLeft: 44 }}
                                                    onKeyDown={(e) => e.key === 'Enter' && testName.trim() && folderName.trim() && publishTest()}
                                                />
                                            </div>
                                            <p className={`text-xs leading-relaxed ${isDark ? 'text-gray-500' : 'text-gray-600'}`} style={{ margin: 0 }}>
                                                Saves to: <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>pages/{folderName ? folderName.toLowerCase().replace(/[^\w-]/g, '_') : 'folder'}/{testName ? testName.replace(/[^\w-]/g, '_') : 'name'}_page.py</span>
                                            </p>
                                        </div>

                                        {/* Scenario Name Input */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            <label className={`block text-xs ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                                                Scenario Name <span className="text-red-400">*</span>
                                            </label>
                                            <div className="relative" style={{ paddingLeft: 4, paddingRight: 4 }}>
                                                <FileCode size={14} className="absolute top-1/2 -translate-y-1/2 text-red-400" style={{ left: 18 }} />
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    maxLength={30}
                                                    value={testName}
                                                    onChange={(e) => setTestName(e.target.value.replace(/\s+/g, '_'))}
                                                    placeholder="e.g., login_flow (Max 30 chars)"
                                                    className={`w-full pr-3 py-3 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-600 ${isDark ? 'bg-[#0D1117] border-gray-800 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 shadow-sm'}`}
                                                    style={{ paddingLeft: 44 }}
                                                    onKeyDown={(e) => e.key === 'Enter' && testName.trim() && folderName.trim() && publishTest()}
                                                />
                                            </div>
                                        </div>

                                        {/* Playwright Marker Dropdown */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            <label className={`block text-xs font-bold uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                                                Markers <span className="text-gray-400 font-normal lowercase">(optional)</span>
                                            </label>
                                            <Box
                                                onClick={(e) => setMarkerMenuAnchor(e.currentTarget)}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    px: 1.5,
                                                    py: 1,
                                                    border: '1px solid',
                                                    borderColor: 'divider',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                                                    transition: 'all 0.2s',
                                                    '&:hover': {
                                                        borderColor: 'primary.main',
                                                        bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                                                    }
                                                }}
                                            >
                                                <span className={`text-sm ${selectedMarker ? (isDark ? 'text-gray-400' : 'text-gray-800') : (isDark ? 'text-gray-600' : 'text-gray-500')}`}>
                                                    {selectedMarker || "None"}
                                                </span>
                                                <ChevronDown size={14} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                                            </Box>
                                            <Menu
                                                anchorEl={markerMenuAnchor}
                                                open={Boolean(markerMenuAnchor)}
                                                onClose={() => setMarkerMenuAnchor(null)}
                                                PaperProps={{
                                                    sx: {
                                                        mt: 1,
                                                        borderRadius: '8px',
                                                        border: '1px solid',
                                                        borderColor: 'divider',
                                                        bgcolor: isDark ? '#161B22' : '#fff',
                                                        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                                                        minWidth: markerMenuAnchor ? markerMenuAnchor.clientWidth : 200,
                                                        maxHeight: '200px',
                                                        overflowY: 'auto'
                                                    }
                                                }}
                                            >
                                                <MenuItem
                                                    onClick={() => { setSelectedMarker(""); setMarkerMenuAnchor(null); }}
                                                    sx={{
                                                        fontSize: '0.875rem',
                                                        py: 1,
                                                        color: isDark ? 'rgba(255,255,255,0.5)' : 'text.secondary',
                                                        '&:hover': {
                                                            bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                                                            color: isDark ? 'rgba(255,255,255,0.9)' : 'text.primary'
                                                        }
                                                    }}
                                                >
                                                    None
                                                </MenuItem>
                                                <Divider sx={{ my: 0.5, borderColor: 'divider' }} />
                                                {availableMarkers.map(marker => (
                                                    <MenuItem
                                                        key={marker}
                                                        onClick={() => { setSelectedMarker(marker); setMarkerMenuAnchor(null); }}
                                                        sx={{
                                                            fontSize: '0.875rem',
                                                            py: 1,
                                                            color: isDark ? 'rgba(255,255,255,0.5)' : 'text.secondary',
                                                            '&:hover': {
                                                                bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                                                                color: isDark ? 'rgba(255,255,255,0.9)' : 'text.primary'
                                                            }
                                                        }}
                                                    >
                                                        {marker}
                                                    </MenuItem>
                                                ))}
                                            </Menu>
                                            <p className={`text-xs leading-relaxed ${isDark ? 'text-gray-500' : 'text-gray-600'}`} style={{ margin: 0 }}>
                                                Adds <span className="text-red-600">@pytest.mark.{selectedMarker || 'marker'}</span> to the test class
                                            </p>
                                        </div>

                                        {/* Snippet Toggle */}
                                        <div className={`p-4 rounded-xl border ${isDark ? 'bg-red-600/5 border-red-600/20' : 'bg-blue-50 border-blue-200'}`}>
                                            <div style={{ paddingLeft: 6, paddingRight: 6, paddingTop: 4, paddingBottom: 4, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                <div className="flex items-center justify-between" style={{ paddingRight: 2 }}>
                                                    <div className="flex items-center gap-2.5">
                                                        <Sparkles size={16} className="text-red-600" />
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Reusable Snippet</span>
                                                            <span className={`text-xs px-2 py-0.5 rounded-full ${isSnippet ? (isDark ? 'bg-red-600/20 text-blue-300' : 'bg-blue-100 text-blue-700') : (isDark ? 'bg-white/10 text-gray-400' : 'bg-white text-gray-500 border border-gray-200')}`}>
                                                                {isSnippet ? 'Enabled' : 'Disabled'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsSnippet(!isSnippet)}
                                                        className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors duration-200 ${isSnippet ? 'bg-red-600' : (isDark ? 'bg-gray-700' : 'bg-gray-300')}`}
                                                    >
                                                        <div className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white transition-all duration-200 ${isSnippet ? 'left-6' : 'left-1'}`} />
                                                    </button>
                                                </div>
                                                <p className={`text-xs leading-relaxed ${isDark ? 'text-gray-500' : 'text-gray-600'}`} style={{ margin: 0 }}>
                                                    {isSnippet
                                                        ? "Snippet logic is appended to the shared flows library for reuse across tests."
                                                        : "Standard publish creates independent Page and Test files."}
                                                </p>

                                                {isSnippet && (
                                                    <div>
                                                        <label className={`block text-xs font-bold uppercase tracking-wide mb-1.5 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                                                            Target Flow File
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={targetFlowFile}
                                                            onChange={(e) => setTargetFlowFile(e.target.value)}
                                                            className={`w-full px-3 py-2 rounded-lg border text-xs font-mono transition-colors focus:outline-none focus:ring-1 focus:ring-red-600 ${isDark ? 'bg-black/40 border-gray-800 text-blue-300' : 'bg-white border-gray-300 text-blue-700 shadow-sm'}`}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div
                                            className={`flex items-center gap-3 border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}`}
                                            style={{ paddingTop: 10, paddingBottom: 10, minHeight: 68 }}
                                        >
                                            <Button
                                                variant="danger"
                                                fullWidth
                                                onClick={() => { setShowPublishModal(false); setTestName(''); setFolderName(''); setSelectedMarker(''); }}
                                                className="px-6 my-1"
                                                icon={X}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                variant="primary-glass"
                                                fullWidth
                                                onClick={publishTest}
                                                disabled={!testName.trim() || !folderName.trim() || publishing}
                                                className="px-6 my-1"
                                                loading={publishing}
                                                icon={Rocket}
                                            >
                                                Publish
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-6 space-y-4">
                                        <div className={`inline-flex p-3 rounded-full ${isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-100 text-green-600'}`}>
                                            <CheckCircle size={32} />
                                        </div>
                                        <p className={isDark ? "text-green-400 font-medium" : "text-green-600 font-medium"}>{publishSuccess}</p>
                                        <div className="pt-4">
                                            <Button
                                                variant="primary-glass"
                                                fullWidth
                                                onClick={() => { setShowPublishModal(false); setPublishSuccess(null); setTestName(''); setFolderName(''); setSelectedMarker(''); setIsSnippet(false); }}
                                                className="px-6"
                                                icon={Check}
                                            >
                                                Done
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Partial Snippet Extraction Modal */}
                {showSnippetModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className={`w-[420px] rounded-xl border shadow-2xl overflow-hidden ${isDark ? 'bg-[#161B22] border-gray-800' : 'bg-white border-gray-300'}`}>
                            <div className={`flex items-center justify-between px-5 py-3 border-b ${isDark ? 'border-gray-800 bg-[#21262D]' : 'border-gray-300 bg-gray-50'}`}>
                                <div className="flex items-center gap-2">
                                    <Scissors className="text-orange-500" size={18} />
                                    <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Extract Partial Snippet</h3>
                                </div>
                                <button
                                    onClick={() => setShowSnippetModal(false)}
                                    title="Close"
                                    className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div style={{ padding: 18 }}>

                                <div className="space-y-4">
                                    <div>
                                        <label className={`block text-xs font-bold uppercase tracking-wide mb-1.5 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                                            Snippet Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g., login_process"
                                            value={snippetName}
                                            onChange={(e) => setSnippetName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                                            className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 ${isDark ? 'bg-[#0D1117] border-gray-800 text-white' : 'bg-white border-gray-300 text-gray-900 shadow-sm'}`}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={`block text-xs font-bold uppercase tracking-wide mb-1.5 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                                                Start Step Index
                                            </label>
                                            <input
                                                type="number"
                                                value={snippetRange.start}
                                                onChange={(e) => setSnippetRange({ ...snippetRange, start: parseInt(e.target.value) || 0 })}
                                                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 ${isDark ? 'bg-[#0D1117] border-gray-800 text-white' : 'bg-white border-gray-300 text-gray-900 shadow-sm'}`}
                                            />
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-bold uppercase tracking-wide mb-1.5 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                                                End Step Index
                                            </label>
                                            <input
                                                type="number"
                                                value={snippetRange.end}
                                                onChange={(e) => setSnippetRange({ ...snippetRange, end: parseInt(e.target.value) || 0 })}
                                                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 ${isDark ? 'bg-[#0D1117] border-gray-800 text-white' : 'bg-white border-gray-300 text-gray-900 shadow-sm'}`}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className={`block text-xs font-bold uppercase tracking-wide mb-1.5 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                                            Target Library File
                                        </label>
                                        <input
                                            type="text"
                                            value={targetFlowFile}
                                            onChange={(e) => setTargetFlowFile(e.target.value)}
                                            className={`w-full px-3 py-1.5 rounded-lg border text-xs font-mono ${isDark ? 'bg-black/40 border-gray-800 text-blue-300' : 'bg-gray-50 border-gray-300 text-blue-700 shadow-sm'}`}
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <Button
                                            variant="danger"
                                            fullWidth
                                            onClick={() => setShowSnippetModal(false)}
                                            className=""
                                            icon={X}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            variant="primary-glass"
                                            fullWidth
                                            onClick={handleExtractSnippet}
                                            loading={extractingSnippet}
                                            disabled={!snippetName.trim() || extractingSnippet}
                                            className=" !border-orange-500/20"
                                            icon={Sparkles}
                                        >
                                            Extract Snippet
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showLoad && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className={`relative w-[600px] h-[70vh] flex flex-col rounded-xl border shadow-2xl overflow-hidden ${isDark ? 'bg-[#161B22] border-gray-800' : 'bg-white border-gray-300'}`}>
                            {/* Confirmation Overlay */}
                            {confirmDeleteFile && (
                                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] rounded-xl">
                                    <div className={`w-[320px] p-5 rounded-xl shadow-2xl border transform transition-all scale-100 ${isDark ? 'bg-[#21262D] border-gray-800' : 'bg-white border-gray-300'}`}>
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="p-2 rounded-full bg-red-500/10 text-red-500">
                                                <Trash2 size={18} />
                                            </div>
                                            <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Delete Recording?</h4>
                                        </div>
                                        <p className={`text-xs mb-4 leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            Are you sure you want to delete <span className="font-mono text-red-600 break-all">{confirmDeleteFile}</span>?
                                            <br />This action cannot be undone.
                                        </p>
                                        <div className="flex gap-3">
                                            <Button
                                                variant="danger"
                                                fullWidth
                                                onClick={() => setConfirmDeleteFile(null)}
                                                className=""
                                                icon={X}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                variant="danger"
                                                fullWidth
                                                onClick={executeDelete}
                                                className=""
                                                icon={Trash2}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className={`flex items-center justify-between px-5 py-3 border-b ${isDark ? 'border-gray-800 bg-[#21262D]' : 'border-gray-300 bg-gray-50'}`}>
                                <div className="flex items-center gap-2">
                                    <FolderOpen className="text-red-600" fill="currentColor" size={18} />
                                    <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Load Recording</h3>
                                </div>
                                <button
                                    onClick={() => { setShowLoad(false); setSelectedFile(''); }}
                                    title="Close"
                                    className={`p-1 rounded hover:bg-white/10 transition-colors ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="flex-1 min-h-0" style={{ padding: 16 }}>

                                {/* Reuse Tree Logic for Load - Read Only mostly */}
                                <div className={`flex-1 overflow-y-auto border rounded-lg ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                                    <div className={`flex items-center gap-2 px-4 py-2 border-b ${isDark ? 'border-gray-800 bg-[#1a1a1a]' : 'border-gray-300 bg-gray-100'}`}>
                                        <FolderOpen size={14} className={isDark ? 'text-yellow-500' : 'text-yellow-600'} />
                                        <span className={`text-sm font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>recordings/</span>
                                    </div>
                                    <div className="p-2">
                                        {groupedFiles.root && groupedFiles.root.map((file, idx) => (
                                            <div
                                                key={`root-${idx}`}
                                                onClick={() => setSelectedFile(file.path)}
                                                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 group ${selectedFile === file.path ? (isDark ? 'bg-red-600/10 border border-red-600/20' : 'bg-blue-50 border border-blue-200 shadow-sm') : (isDark ? 'text-gray-400 hover:bg-white/5 border border-transparent' : 'text-gray-600 hover:bg-white hover:shadow-sm border border-transparent')}`}
                                            >
                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${selectedFile === file.path ? 'border-red-600' : (isDark ? 'border-gray-600 group-hover:border-gray-400' : 'border-gray-300 group-hover:border-gray-400')}`}>
                                                    {selectedFile === file.path && <div className="w-2 h-2 rounded-full bg-red-600" />}
                                                </div>
                                                <div className="flex-1 min-w-0 flex flex-col">
                                                    <span className={`text-sm truncate ${selectedFile === file.path ? (isDark ? 'text-blue-300' : 'text-blue-700') : (isDark ? 'text-gray-400 group-hover:text-gray-300' : 'text-gray-600 group-hover:text-gray-900')}`}>{file.name.replace('.py', '')}</span>
                                                    <span className={`text-[9px] opacity-40 font-mono truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{file.path}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{new Date(file.modified).toLocaleDateString()}</span>
                                                    <button
                                                        onClick={(e) => quickDeleteFile(e, file.path)}
                                                        className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-all ${isDark ? 'text-gray-500 hover:text-red-400 hover:bg-red-400/10' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {Object.keys(groupedFiles).filter(k => k !== 'root').sort().map(folder => (
                                            <div key={folder}>
                                                <button
                                                    onClick={() => toggleFolder(folder)}
                                                    title={expandedFolders[folder] ? `Collapse ${folder}` : `Expand ${folder}`}
                                                    className={`w-full group flex items-center gap-2 px-3 py-2 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-xs font-bold tracking-wider ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                                                >
                                                    {expandedFolders[folder] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                    {expandedFolders[folder] ? <FolderOpen size={14} className={isDark ? "text-yellow-500" : "text-yellow-600"} /> : <Folder size={14} className={isDark ? "text-yellow-500/70" : "text-yellow-600/70"} />}
                                                    {folder}
                                                </button>
                                                {expandedFolders[folder] && (
                                                    <div className="ml-6 space-y-1 mt-1 border-l pl-2 border-gray-300 dark:border-gray-700">
                                                        {groupedFiles[folder].map(file => (
                                                            <div
                                                                key={file.path}
                                                                onClick={() => setSelectedFile(file.path)}
                                                                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 group ${selectedFile === file.path ? (isDark ? 'bg-red-600/10 border border-red-600/20' : 'bg-blue-50 border border-blue-200 shadow-sm') : (isDark ? 'text-gray-400 hover:bg-white/5 border border-transparent' : 'text-gray-600 hover:bg-white hover:shadow-sm border border-transparent')}`}
                                                            >
                                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${selectedFile === file.path ? 'border-red-600' : (isDark ? 'border-gray-600 group-hover:border-gray-400' : 'border-gray-300 group-hover:border-gray-400')}`}>
                                                                    {selectedFile === file.path && <div className="w-2 h-2 rounded-full bg-red-600" />}
                                                                </div>
                                                                <div className="flex-1 min-w-0 flex flex-col">
                                                                    <span className={`text-sm truncate ${selectedFile === file.path ? (isDark ? 'text-blue-300' : 'text-blue-700') : (isDark ? 'text-gray-400 group-hover:text-gray-300' : 'text-gray-600 group-hover:text-gray-900')}`}>{file.name.replace('.py', '')}</span>
                                                                    <span className={`text-[9px] opacity-40 font-mono truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{file.path}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{new Date(file.modified).toLocaleDateString()}</span>
                                                                    <button
                                                                        onClick={(e) => quickDeleteFile(e, file.path)}
                                                                        className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-all ${isDark ? 'text-gray-500 hover:text-red-400 hover:bg-red-400/10' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                                                                        title="Delete"
                                                                    >
                                                                        <Trash2 size={13} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className={`flex gap-3 mt-4 pt-4 border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                                    <Button
                                        variant="danger"
                                        fullWidth
                                        onClick={() => { setShowLoad(false); setSelectedFile(''); }}
                                        className="px-6"
                                        icon={X}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="primary-glass"
                                        size="medium"
                                        fullWidth
                                        className="px-6"
                                        onClick={() => { if (selectedFile) { loadFile(selectedFile); setShowLoad(false); setSelectedFile(''); } }}
                                        disabled={!selectedFile}
                                        icon={FolderOpen}
                                    >
                                        Load
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Manager Modal */}
                {showDeleteManager && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className={`relative w-[600px] h-[70vh] flex flex-col rounded-xl border shadow-2xl overflow-hidden ${isDark ? 'bg-[#161B22] border-gray-800' : 'bg-white border-gray-300'}`}>
                            {/* Confirmation Overlay */}
                            {showDeleteConfirmOverlay && selectedItemsToDelete.size > 0 && (
                                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] rounded-xl">
                                    <div className={`w-[320px] p-5 rounded-xl shadow-2xl border transform transition-all scale-100 ${isDark ? 'bg-[#21262D] border-gray-800' : 'bg-white border-gray-300'}`}>
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="p-2 rounded-full bg-red-500/10 text-red-500">
                                                <Trash2 size={18} />
                                            </div>
                                            <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Delete Selected Items?</h4>
                                        </div>
                                        <p className={`text-xs mb-4 leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            Are you sure you want to delete <span className="font-bold text-red-600">{selectedFileCount}</span> file(s)?
                                            {selectedItemsToDelete.size < 5 && (
                                                <ul className="mt-2 list-disc list-inside opacity-75">
                                                    {Array.from(selectedItemsToDelete).map(p => (
                                                        <li key={p} className="truncate">{p}</li>
                                                    ))}
                                                </ul>
                                            )}
                                            <br />This action cannot be undone.
                                        </p>
                                        <div className="flex gap-3">
                                            <Button
                                                variant="danger"
                                                fullWidth
                                                onClick={() => setShowDeleteConfirmOverlay(false)}
                                                className=""
                                                icon={X}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                variant="danger"
                                                fullWidth
                                                onClick={deleteSelectedItems}
                                                className=" font-bold"
                                                icon={Trash2}
                                            >
                                                Delete All
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className={`px-5 py-3 border-b flex flex-col gap-3 ${isDark ? 'bg-[#21262D] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Trash2 className="text-red-500" size={18} />
                                        <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Delete Recordings</h3>
                                    </div>
                                    <button
                                        onClick={() => { setShowDeleteManager(false); setSelectedItemsToDelete(new Set()); setDeleteSearchTerm(""); }}
                                        title="Close"
                                        className={`p-1 rounded ${isDark ? 'text-gray-400 hover:bg-white/10' : 'text-gray-500 hover:bg-gray-100'}`}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Search Bar */}
                                <div className="relative group">
                                    <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${isDark ? 'text-gray-500 group-focus-within:text-red-400' : 'text-gray-400 group-focus-within:text-red-600'}`} />
                                    <input
                                        type="text"
                                        placeholder="Filter recordings..."
                                        value={deleteSearchTerm}
                                        onChange={(e) => setDeleteSearchTerm(e.target.value)}
                                        className={`w-full pl-9 pr-9 py-2 rounded-lg text-sm border transition-all outline-none 
                                            ${isDark
                                                ? 'bg-black/20 border-gray-800 focus:border-red-600/50 text-gray-200 placeholder-gray-600'
                                                : 'bg-white border-gray-200 focus:border-red-400 text-gray-700 placeholder-gray-400 shadow-sm'}`}
                                    />
                                    {deleteSearchTerm && (
                                        <button
                                            onClick={() => setDeleteSearchTerm("")}
                                            title="Clear search"
                                            className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors ${isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-white/10' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 min-h-0" style={{ padding: 16 }}>

                                {/* Actions Toolbar */}
                                <div className={`px-4 py-2 border-b flex items-center justify-between text-xs ${isDark ? 'bg-[#161B22] border-gray-800' : 'bg-white border-gray-200'}`}>
                                    <button
                                        onClick={handleSelectAll}
                                        title="Select all recordings"
                                        className={`flex items-center gap-2 font-medium transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
                                    >
                                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all
                                        ${isDeleteSelectAllChecked
                                                ? 'bg-red-600 border-red-600'
                                                : (isDark ? 'border-gray-600' : 'border-gray-400')}`}
                                        >
                                            {isDeleteSelectAllChecked && <Check size={10} className="text-white" />}
                                        </div>
                                        Select All
                                    </button>
                                    <div className="flex items-center gap-3">
                                        <span className={`font-medium ${selectedItemsToDelete.size > 0 ? 'text-red-600' : (isDark ? 'text-gray-500' : 'text-gray-400')}`}>
                                            {selectedFileCount} selected
                                        </span>

                                    </div>
                                </div>

                                <div className={`flex-1 overflow-y-auto p-2 border rounded-lg mt-2 ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                                    {/* Root Files */}
                                    {groupedDeleteFiles.root && groupedDeleteFiles.root.map((file, idx) => (
                                        <div
                                            key={`del-root-${idx}`}
                                            onClick={() => toggleDeleteSelection(file.path)}
                                            className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer border transition-all duration-200 mb-1
                                            ${selectedItemsToDelete.has(file.path)
                                                    ? (isDark ? 'bg-red-600/10 border-red-600/20' : 'bg-blue-50 border-blue-200 shadow-sm')
                                                    : (isDark ? 'bg-transparent border-transparent hover:bg-white/5' : 'bg-transparent border-transparent hover:bg-white hover:shadow-sm')
                                                }`}
                                        >
                                            <div className={`shrink-0 w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors 
                                            ${selectedItemsToDelete.has(file.path)
                                                    ? 'bg-red-600 border-red-600'
                                                    : (isDark ? 'border-gray-600 group-hover:border-gray-400' : 'border-gray-400 group-hover:border-gray-500')}`}
                                            >
                                                {selectedItemsToDelete.has(file.path) && <Check size={10} className="text-white" />}
                                            </div>
                                            <FileCode size={14} className={isDark ? 'text-red-400' : 'text-red-700'} />
                                            <div className="flex-1 min-w-0 flex flex-col">
                                                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{file.name.replace('.py', '')}</span>
                                                <span className={`text-[9px] opacity-40 font-mono truncate ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{file.path}</span>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Folders */}
                                    {Object.keys(groupedDeleteFiles).filter(k => k !== 'root').sort().map(folder => {
                                        const folderTests = groupedDeleteFiles[folder];
                                        const isFolderSelected = selectedItemsToDelete.has(`recordings/${folder}`);
                                        const isAllFilteredSelected = folderTests.length > 0 && folderTests.every(f => selectedItemsToDelete.has(f.path));

                                        return (
                                            <div key={folder} className="mb-1">
                                                {/* Folder Header */}
                                                <div
                                                    className={`flex items-center px-2 py-1.5 mb-1 cursor-pointer hover:bg-white/5 rounded group`}
                                                    onClick={() => toggleFolder(folder)}
                                                >
                                                    <button className={`p-0.5 rounded mr-1 transition-transform duration-200 ${expandedFolders[folder] ? 'rotate-90' : ''}`}>
                                                        <ChevronRight size={14} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                                                    </button>

                                                    {/* Folder Checkbox */}
                                                    <div
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleDeleteSelection(`recordings/${folder}`, folderTests);
                                                        }}
                                                        className={`mr-2 w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors 
                                                        ${isAllFilteredSelected || isFolderSelected
                                                                ? 'bg-red-600 border-red-600'
                                                                : (isDark ? 'border-gray-600 hover:border-gray-400' : 'border-gray-400 hover:border-gray-500')}`}
                                                    >
                                                        {(isAllFilteredSelected || isFolderSelected) && <Check size={10} className="text-white" />}
                                                    </div>

                                                    <div className={`flex items-center gap-2 text-xs font-bold tracking-wider ${isDark ? 'text-gray-400 group-hover:text-gray-300' : 'text-gray-500 group-hover:text-gray-700'}`}>
                                                        {expandedFolders[folder] ? <FolderOpen size={14} className={isDark ? "text-yellow-500" : "text-yellow-600"} /> : <Folder size={14} className={isDark ? "text-yellow-500/70" : "text-yellow-600/70"} />}
                                                        {folder}
                                                    </div>
                                                </div>

                                                {/* Folder Items */}
                                                {expandedFolders[folder] && (
                                                    <div className="ml-6 space-y-1 border-l border-gray-700/50 pl-2">
                                                        {folderTests.map(file => (
                                                            <div
                                                                key={`del-${file.path}`}
                                                                onClick={() => toggleDeleteSelection(file.path)}
                                                                className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer border transition-all duration-200
                                                                ${selectedItemsToDelete.has(file.path)
                                                                        ? (isDark ? 'bg-red-600/10 border-red-600/20' : 'bg-blue-50 border-blue-200 shadow-sm')
                                                                        : (isDark ? 'bg-transparent border-transparent hover:bg-white/5' : 'bg-transparent border-transparent hover:bg-white hover:shadow-sm')
                                                                    }`}
                                                            >
                                                                <div className={`shrink-0 w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors 
                                                                ${selectedItemsToDelete.has(file.path)
                                                                        ? 'bg-red-600 border-red-600'
                                                                        : (isDark ? 'border-gray-600 group-hover:border-gray-400' : 'border-gray-400 group-hover:border-gray-500')}`}
                                                                >
                                                                    {selectedItemsToDelete.has(file.path) && <Check size={10} className="text-white" />}
                                                                </div>
                                                                <FileCode size={13} className={isDark ? 'text-red-400' : 'text-red-700'} />
                                                                <div className="flex-1 min-w-0 flex flex-col">
                                                                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{file.name.replace('.py', '')}</span>
                                                                    <span className={`text-[9px] opacity-40 font-mono truncate ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{file.path}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className={`flex gap-3 mt-4 pt-4 border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                                    <Button
                                        variant="danger"
                                        fullWidth
                                        onClick={() => { setShowDeleteManager(false); setSelectedItemsToDelete(new Set()); setDeleteSearchTerm(""); }}
                                        className=""
                                        icon={X}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="danger"
                                        fullWidth
                                        onClick={() => { if (selectedItemsToDelete.size > 0) { setShowDeleteConfirmOverlay(true); } }}
                                        disabled={selectedItemsToDelete.size === 0}
                                        className={`px-6 ${selectedItemsToDelete.size > 0 ? '' : ''}`}
                                        icon={Trash2}
                                    >
                                        Delete {selectedFileCount > 0 ? `(${selectedFileCount})` : ''}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}


                {/* Prevew/Edit Modal */}
                {previewFile && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className={`w-[800px] h-[80vh] flex flex-col rounded-xl border shadow-2xl overflow-hidden ${isDark ? 'bg-[#161B22] border-gray-800' : 'bg-white border-gray-300'}`}>
                            {/* Header */}
                            <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-gray-800 bg-[#21262D]' : 'border-gray-300 bg-gray-50'}`} style={{ minHeight: 50 }}>
                                <div className="flex items-center gap-2" style={{ marginLeft: 25 }}>
                                    <FileCode size={16} className="text-red-600" />
                                    <span className={`font-mono text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{previewFile}</span>
                                </div>
                                <div className="flex items-center gap-2">

                                    <button
                                        onClick={() => setPreviewFile(null)}
                                        title="Close"
                                        className={`p-1.5 rounded-md transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
                                        style={{ marginRight: 15 }}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Editor Content */}
                            <div className={`flex-1 relative group min-h-0 ${isDark ? 'bg-[#161B22]' : 'bg-white'}`}>
                                {/* Syntax Highlighted Layer - Bottom */}
                                <div
                                    ref={previewHighlighterRef}
                                    className="absolute inset-0 overflow-hidden"
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
                                </div>

                                {/* Editable Textarea Layer - Top */}
                                <textarea
                                    className={`absolute inset-0 w-full h-full resize-none bg-transparent text-transparent caret-red-600 focus:outline-none z-10 font-mono text-sm leading-relaxed overflow-auto scrollbar-thin scrollbar-track-transparent ${isDark ? 'scrollbar-thumb-gray-700/50 hover:scrollbar-thumb-gray-600' : 'scrollbar-thumb-gray-200 hover:scrollbar-thumb-gray-300'}`}
                                    style={{
                                        fontFamily: 'monospace',
                                        fontSize: '0.875rem',
                                        lineHeight: '1.5',
                                        paddingTop: '1.5rem',
                                        paddingLeft: '5.5rem', // Slightly reduced to move content left
                                        paddingRight: '1.5rem',
                                        paddingBottom: '10rem', // Extra space at bottom
                                        caretColor: isDark ? '#60a5fa' : '#2563eb',
                                        whiteSpace: 'pre',
                                        letterSpacing: 'normal',
                                        fontVariantLigatures: 'none',
                                        tabSize: 4
                                    }}
                                    value={previewContent}
                                    onScroll={handlePreviewScroll}
                                    onChange={(e) => setPreviewContent(e.target.value)}
                                    spellCheck="false"
                                    autoCapitalize="off"
                                    autoComplete="off"
                                    autoCorrect="off"
                                />
                            </div>

                            {/* Footer */}
                            <div
                                className={`px-5 border-t flex justify-end items-center gap-3 shrink-0 ${isDark ? 'border-gray-800 bg-[#21262D]' : 'border-gray-300 bg-gray-50'}`}
                                style={{ minHeight: 72, paddingTop: 10, paddingBottom: 10, paddingRight: 28 }}
                            >
                                <Button
                                    variant={previewSaveStatus === 'saved' ? 'success' : 'primary-glass'}
                                    onClick={handleSavePreview}
                                    disabled={previewSaveStatus === 'saving'}
                                    loading={previewSaveStatus === 'saving'}
                                    className={`px-8 my-1 font-bold ${previewSaveStatus === 'saved' ? '' : ''}`}
                                    icon={previewSaveStatus === 'saved' ? CheckCircle : Save}
                                >
                                    {previewSaveStatus === 'saved' ? 'Saved' : 'Save'}
                                </Button>
                                <Button
                                    variant="danger"
                                    onClick={() => setPreviewFile(null)}
                                    className="px-8 my-1 font-bold"
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                <Box sx={{ flex: 1, p: 2, minHeight: 0, overflow: 'hidden', display: 'flex', transition: 'background-color 0.3s' }}>
                    <div className="grid gap-4" style={{ flex: 1, minHeight: 0, overflow: 'hidden', gridTemplateColumns: 'minmax(0, 3.2fr) minmax(0, 1.8fr)' }}>

                        {/* Left Column: Editor Window */}
                        <div className="flex flex-col min-h-0 overflow-hidden">
                            <div className={`flex-1 flex flex-col rounded-xl border shadow-2xl overflow-hidden transition-colors duration-300 ${isDark ? 'bg-[#161B22] border-gray-800 ring-white/5' : 'bg-white border-gray-300 ring-black/5'} ring-1`}>
                                {/* Window Header */}
                                <div className={`relative h-10 flex items-center justify-between pl-6 pr-8 shrink-0 transition-colors duration-300 ${isDark ? 'bg-[#21262D]' : 'bg-gray-50'}`}>
                                    {/* Bottom border line for header - positioned absolutely so tab can sit on top */}
                                    <div className={`absolute bottom-0 left-0 right-0 h-[1px] ${isDark ? 'bg-[#333]' : 'bg-transparent'}`} />

                                    <div className="relative z-10 h-full flex items-center gap-2">
                                        <div className="h-full flex items-center gap-2 mr-4" style={{ marginLeft: 14 }}>
                                            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] shadow-sm" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] shadow-sm" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f] shadow-sm" />
                                        </div>

                                        {/* Tab with current filename - overlaps the bottom border line */}
                                        <div className={`flex items-center px-4 py-1 rounded-t-lg text-xs font-medium border-t-2 relative transition-all duration-300 font-sans ${isDark ? 'bg-[#161B22] text-gray-200 border-t-red-600 border-x border-x-[#333]' : 'bg-white text-gray-700 border-t-red-600 border-x border-x-gray-200'}`}>
                                            <FileCode size={13} className={`mr-2 shrink-0 ${isDark ? 'text-red-400' : 'text-red-700'}`} />
                                            <span className="tracking-tight max-w-[200px] truncate" title={currentFilePath || currentFile}>
                                                {currentFilePath || currentFile}
                                            </span>
                                            {/* Cover the bottom line with a pseudo-border matching bg */}
                                            <div className={`absolute bottom-[-2px] left-0 right-0 h-[2px] ${isDark ? 'bg-[#161B22]' : 'bg-white'}`} />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-5 shrink-0 -translate-x-4">
                                        {recording && (
                                            <div className="flex items-center gap-2 px-2 py-0.5 bg-red-500/10 rounded border border-red-500/20">
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                <span className={`text-xs font-bold tracking-wider ${isDark ? 'text-red-400' : 'text-red-600'}`}>REC</span>
                                            </div>
                                        )}
                                        {!recording && (
                                            <>
                                                <Tooltip title="Run Raw Script" arrow placement="top">
                                                    <button
                                                        onClick={handleRunRaw}
                                                        className={`p-1.5 rounded-md transition-all ${isDark ? 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10' : 'text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50'}`}
                                                    >
                                                        <Play size={14} />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip title="Load Recording" arrow placement="top">
                                                    <button
                                                        onClick={() => { fetchRecordings(); setShowLoad(true); }}
                                                        className={`p-1.5 rounded-md transition-all ${isDark ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10' : 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'}`}
                                                    >
                                                        <FolderOpen size={14} />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip title="Delete Recordings" arrow placement="top">
                                                    <button
                                                        onClick={() => { fetchRecordings(); setShowDeleteManager(true); }}
                                                        className={`p-1.5 rounded-md transition-all ${isDark ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10' : 'text-red-600 hover:text-red-700 hover:bg-red-50'}`}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip title={saveStatus === 'saved' ? 'Saved!' : 'Save'} arrow placement="top">
                                                    <span className="inline-flex">
                                                        <button
                                                            onClick={saveCode}
                                                            disabled={saveStatus === 'saving'}
                                                            className={`p-1.5 rounded-md transition-all ${saveStatus === 'saved' ? (isDark ? 'text-green-400 bg-green-500/10' : 'text-green-600 bg-green-50') : (isDark ? 'text-green-400 hover:text-green-300 hover:bg-green-500/10' : 'text-green-600 hover:text-green-700 hover:bg-green-50')}`}
                                                        >
                                                            {saveStatus === 'saving' ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                                        </button>
                                                    </span>
                                                </Tooltip>
                                                <Tooltip title="Save As..." arrow placement="top">
                                                    <button
                                                        onClick={() => setShowSaveAs(true)}
                                                        className={`p-1.5 rounded-md transition-all ${isDark ? 'text-red-400 hover:text-purple-300 hover:bg-red-600/10' : 'text-red-700 hover:text-purple-700 hover:bg-purple-50'}`}
                                                    >
                                                        <Download size={14} />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip title={codeCopied ? 'Copied!' : 'Copy Code'} arrow placement="top">
                                                    <button
                                                        onClick={handleCopyCode}
                                                        className={`p-1.5 rounded-md transition-all ${codeCopied ? (isDark ? 'text-green-400 bg-green-500/10' : 'text-green-600 bg-green-50') : (isDark ? 'text-red-400 hover:text-blue-300 hover:bg-red-600/10' : 'text-red-700 hover:text-blue-700 hover:bg-blue-50')}`}
                                                    >
                                                        {codeCopied ? <Check size={14} /> : <Copy size={14} />}
                                                    </button>
                                                </Tooltip>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Editor Area */}
                                <div className={`relative flex-1 group min-h-0 transition-colors duration-300 ${isDark ? 'bg-[#161B22]' : 'bg-white'}`}>
                                    {/* Syntax Highlighted Code Display - Passive Scroll */}
                                    <div
                                        ref={highlighterRef}
                                        className={`absolute inset-0 overflow-hidden`}>
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
                                    </div>

                                    {/* Editing Overlay (only when not recording) */}
                                    {!recording && (
                                        <textarea
                                            className={`absolute inset-0 w-full h-full bg-transparent text-sm font-mono leading-relaxed resize-none focus:outline-none caret-red-600 overflow-auto scrollbar-thin scrollbar-track-transparent ${isDark ? 'text-transparent selection:bg-red-600/20 scrollbar-thumb-gray-700/50 hover:scrollbar-thumb-gray-600' : 'text-transparent selection:bg-red-600/10 scrollbar-thumb-gray-200 hover:scrollbar-thumb-gray-300'}`}
                                            style={{
                                                fontFamily: 'monospace',
                                                fontSize: '0.875rem',
                                                lineHeight: '1.5',
                                                paddingLeft: '2rem',
                                                paddingTop: '1.5rem',
                                                paddingRight: '1.5rem',
                                                paddingBottom: '10rem', // Extra space at bottom
                                                caretColor: isDark ? '#60a5fa' : '#2563eb',
                                                whiteSpace: 'pre',
                                                letterSpacing: 'normal',
                                                fontVariantLigatures: 'none',
                                                tabSize: 4
                                            }}
                                            value={code}
                                            onScroll={handleScroll}
                                            onChange={(e) => setCode(e.target.value)}
                                            spellCheck="false"
                                            autoCapitalize="off"
                                            autoComplete="off"
                                            autoCorrect="off"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Workflow Panel */}
                        <div className="flex flex-col gap-4 min-h-0 overflow-hidden">

                            {/* UNIFIED WORKFLOW CARD */}
                            <Card
                                className="shrink-0 transition-colors duration-300"
                                sx={{
                                    minHeight: 390,
                                    bgcolor: isDark ? '#161B22' : '#ffffff',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    boxShadow: isDark ? '0 10px 24px rgba(0,0,0,0.35)' : '0 6px 18px rgba(15,23,42,0.08)',
                                }}
                            >
                                <div style={{ padding: '12px 16px 6px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexShrink: 0 }}>
                                        <Layers className={`shrink-0 ${isDark ? 'text-red-400' : 'text-red-700'}`} size={16} />
                                        <h3 className={`text-sm font-bold truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Automation Workflow</h3>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                                        {/* STEP 1: Record */}
                                        <div className={`rounded-xl border transition-all duration-300 ${recording ? (isDark ? 'bg-red-500/10 border-red-500/40 shadow-[0_0_25px_rgba(239,68,68,0.3)] ring-1 ring-red-500/50 scale-[1.03]' : 'bg-red-50 border-red-300 shadow-xl ring-2 ring-red-200 transform scale-[1.03]') : (isDark ? 'bg-[#21262D] border-gray-800 hover:border-white/30 shadow-xl shadow-black/50 hover:bg-[#30363D] hover:scale-[1.01]' : 'bg-white border-gray-300 shadow-lg hover:border-red-400/50 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01]')}`} style={{ padding: 10 }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${publishSuccess
                                                        ? (isDark ? 'bg-white/5 border-gray-700 text-gray-400' : 'bg-gray-200 border-gray-300 text-gray-600')
                                                        : recording
                                                            ? (isDark ? 'bg-red-500/10 border-red-500 text-red-400' : 'bg-red-500 border-red-600 text-white')
                                                            : recordingCompleted
                                                                ? (isDark ? 'bg-green-500/10 border-green-500 text-green-400' : 'bg-green-500 border-green-600 text-white')
                                                                : (isDark ? 'bg-white/5 border-gray-700 text-gray-400' : 'bg-gray-200 border-gray-300 text-gray-600')
                                                        }`}>
                                                        1
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`text-sm font-semibold ${isDark ? 'text-green-400' : 'text-green-700'}`}>Record</span>
                                                            {recording && (
                                                                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border ${isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-100 border-red-200'}`}>
                                                                    <div className="w-1 h-1 rounded-full bg-red-500" />
                                                                    <span className={`text-[8px] font-bold tracking-wider uppercase ${isDark ? 'text-red-400' : 'text-red-600'}`}>Live</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p className={`text-xs italic ${isDark ? 'text-green-400/80' : 'text-green-600/80'}`}>Capture browser interactions</p>
                                                    </div>
                                                </div>
                                                {recording ? (
                                                    <button
                                                        onClick={stopRecording}
                                                        title="Stop recording"
                                                        className={`w-20 h-7 px-2.5 text-xs font-semibold rounded-lg backdrop-blur-md transition-all duration-200 ${isDark ? 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 hover:text-red-200 shadow-sm' : 'bg-red-500/10 hover:bg-red-500/15 border border-red-300/40 text-red-700 hover:text-red-800 shadow-sm'}`}
                                                    >
                                                        Stop
                                                    </button>
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', flexShrink: 0 }}>
                                                        {(recordingCompleted || currentFile) && !recording && (
                                                            <button
                                                                onClick={() => setShowSnippetModal(true)}
                                                                title="Extract partial snippet"
                                                                className={`${isDark ? 'bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-300 shadow-sm' : 'bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 shadow-sm'}`}
                                                                style={{
                                                                    height: 26,
                                                                    padding: '0 8px',
                                                                    fontSize: 10,
                                                                    fontWeight: 600,
                                                                    borderRadius: 10,
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    whiteSpace: 'nowrap',
                                                                    flexShrink: 0,
                                                                    minWidth: 112,
                                                                }}
                                                            >
                                                                <Scissors size={12} style={{ marginRight: 6, flexShrink: 0 }} />
                                                                <span style={{ whiteSpace: 'nowrap' }}>Partial Snippet</span>
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={startRecording}
                                                            title="Start recording"
                                                            className={`w-20 h-7 px-2.5 text-xs font-semibold rounded-lg backdrop-blur-md transition-all duration-200 flex items-center justify-center ${isDark ? 'bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-300 hover:text-green-200 shadow-sm' : 'bg-green-500/10 hover:bg-green-500/15 border border-green-300/40 text-green-700 hover:text-green-800 shadow-sm'}`}
                                                        >
                                                            Start
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* STEP 2: Generate */}
                                        <div className={`rounded-xl border transition-all duration-300 ${generating ? (isDark ? 'bg-red-600/10 border-red-600/40 shadow-md ring-1 ring-red-600/50 scale-[1.03]' : 'bg-white border-gray-300 shadow-md ring-1 ring-gray-100 transform scale-[1.03]') : (isDark ? 'bg-[#21262D] border-gray-800 hover:border-white/30 shadow-xl shadow-black/50 hover:bg-[#30363D] hover:scale-[1.01]' : 'bg-white border-gray-300 shadow-lg hover:border-red-400/50 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01]')}`} style={{ padding: 10 }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${publishSuccess || recording
                                                        ? (isDark ? 'bg-white/5 border-gray-700 text-gray-400' : 'bg-gray-200 border-gray-300 text-gray-600')
                                                        : generating
                                                            ? (isDark ? 'bg-red-600/10 border-red-600 text-red-400' : 'bg-red-600 border-red-700 text-white')
                                                            : output && output.status === 'success' && !generating
                                                                ? (isDark ? 'bg-green-500/10 border-green-500 text-green-400' : 'bg-green-500 border-green-600 text-white')
                                                                : status && status.severity === 'error'
                                                                    ? (isDark ? 'bg-red-500/10 border-red-500 text-red-400' : 'bg-red-500 border-red-600 text-white')
                                                                    : (isDark ? 'bg-white/5 border-gray-700 text-gray-400' : 'bg-gray-200 border-gray-300 text-gray-600')
                                                        }`}>
                                                        2
                                                    </div>
                                                    <div className="flex-1">
                                                        <span className={`text-sm font-semibold ${isDark ? 'text-red-400' : 'text-purple-700'}`}>Generate POM</span>
                                                        <p className={`text-xs italic ${isDark ? 'text-red-400/80' : 'text-red-700/80'}`}>{useAI ? 'AI-powered generation' : 'AST-based generation'}</p>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', flexShrink: 0 }}>
                                                    {/* AI Toggle Switch - Colored Pill Design */}
                                                    <div
                                                        onClick={() => !generating && setUseAI(!useAI)}
                                                        className={`relative flex items-center cursor-pointer select-none transition-all duration-300 rounded-full ${generating ? 'opacity-50 cursor-not-allowed' : ''} ${isDark ? 'bg-gray-800/80 border border-gray-800' : 'bg-gray-200 border border-gray-300'
                                                            }`}
                                                        title={useAI ? 'AI Mode: Semantic locators, smart code generation' : 'AST Mode: Traditional syntax tree parsing'}
                                                        style={{ height: 26, padding: '1px 3px' }}
                                                    >
                                                        {/* AST Label - Blue when active */}
                                                        <div className={`h-full flex items-center justify-center gap-1 px-3 rounded-full text-xs font-bold transition-all duration-300 ${!useAI
                                                            ? (isDark
                                                                ? 'bg-gradient-to-r from-cyan-500 to-red-600 text-white shadow-sm'
                                                                : 'bg-gradient-to-r from-cyan-500 to-red-700 text-white shadow-md shadow-blue-300')
                                                            : (isDark ? 'text-gray-500 hover:text-gray-400' : 'text-gray-500 hover:text-gray-600')
                                                            }`}
                                                            title="Abstract Syntax Tree - Traditional code parsing"
                                                            style={{ minWidth: 56 }}
                                                        >
                                                            <Cpu size={12} />
                                                            <span>AST</span>
                                                        </div>
                                                        {/* AI Label - Purple/Pink when active */}
                                                        <div
                                                            className={`h-full flex items-center justify-center gap-1 px-3 rounded-full text-xs font-bold transition-all duration-300 ${useAI
                                                                ? (isDark
                                                                    ? 'bg-gradient-to-r from-violet-500 via-red-600 to-pink-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.5)]'
                                                                    : 'bg-gradient-to-r from-violet-500 via-red-600 to-pink-500 text-white shadow-md shadow-purple-300')
                                                                : (isDark ? 'text-gray-500 hover:text-gray-400' : 'text-gray-500 hover:text-gray-600')
                                                                }`}
                                                            title="Azure OpenAI Powered - Smart code generation"
                                                            style={{ minWidth: 56 }}
                                                        >
                                                            <Sparkles size={12} className={useAI ? 'animate-pulse' : ''} />
                                                            <span>AI</span>
                                                        </div>
                                                    </div>
                                                    {useAI && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); fetchPrompts(); }}
                                                            className={`p-1.5 rounded-md transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400 hover:text-purple-300' : 'hover:bg-gray-200 text-gray-400 hover:text-red-700'}`}
                                                            title="View AI Prompts"
                                                        >
                                                            <Info size={16} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={generatePOM}
                                                        disabled={generating || recording}
                                                        title={generating ? 'Generating POM...' : 'Generate POM'}
                                                        className={`w-20 h-7 px-2.5 text-xs font-semibold rounded-lg backdrop-blur-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${useAI ? (isDark ? 'bg-gradient-to-r from-red-600/20 to-pink-500/20 hover:from-red-600/30 hover:to-pink-500/30 border border-red-600/40 text-purple-300 hover:text-purple-200 shadow-sm' : 'bg-gradient-to-r from-red-600/15 to-pink-500/15 hover:from-red-600/25 hover:to-pink-500/25 border border-purple-300/50 text-purple-700 hover:text-purple-800 shadow-sm') : (isDark ? 'bg-red-600/10 hover:bg-red-600/20 border border-red-600/30 text-purple-300 hover:text-purple-200 shadow-sm' : 'bg-red-600/10 hover:bg-red-600/15 border border-purple-300/40 text-purple-700 hover:text-purple-800 shadow-sm')}`}
                                                    >
                                                        {generating ? 'Running...' : 'Generate'}
                                                    </button>
                                                </div>
                                            </div>
                                            <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${isDark ? '#374151' : '#d1d5db'}`, fontSize: 9 }} className={output?.status === 'success' ? (isDark ? 'text-green-400' : 'text-green-600') : (isDark ? 'text-gray-500' : 'text-gray-500')}>
                                                <div className="flex items-center gap-1">
                                                    {generating ? (
                                                        <>
                                                            <RefreshCw size={9} className="animate-spin" />
                                                            <span className="font-medium">Generating...</span>
                                                        </>
                                                    ) : output && output.status === 'success' ? (
                                                        <>
                                                            {output.method === 'AI-powered' ? <Sparkles size={9} /> : <CheckCircle size={9} />}
                                                            <span className="font-medium">{output.files?.length || 0} files ({output.method || 'Traditional'})</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Circle size={9} />
                                                            <span className="font-medium">Status: Ready</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* STEP 3: Test */}
                                        <div className={`rounded-xl border transition-all duration-300 ${runningTest ? (isDark ? 'bg-red-600/10 border-red-600/40 shadow-[0_0_25px_rgba(59,130,246,0.3)] ring-1 ring-red-600/50 scale-[1.03]' : 'bg-white border-gray-300 shadow-md ring-1 ring-gray-100 transform scale-[1.03]') : (isDark ? 'bg-[#21262D] border-gray-800 hover:border-white/30 shadow-xl shadow-black/50 hover:bg-[#30363D] hover:scale-[1.01]' : 'bg-white border-gray-300 shadow-lg hover:border-red-400/50 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01]')}`} style={{ padding: 10 }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${publishSuccess || recording
                                                        ? (isDark ? 'bg-white/5 border-gray-700 text-gray-400' : 'bg-gray-200 border-gray-300 text-gray-600')
                                                        : runningTest
                                                            ? (isDark ? 'bg-red-600/10 border-red-600 text-red-400' : 'bg-red-600 border-red-700 text-white')
                                                            : testResult
                                                                ? (testResult.status === 'success' ? (isDark ? 'bg-green-500/10 border-green-500 text-green-400' : 'bg-green-500 border-green-600 text-white') : (isDark ? 'bg-red-500/10 border-red-500 text-red-400' : 'bg-red-500 border-red-600 text-white'))
                                                                : (isDark ? 'bg-white/5 border-gray-700 text-gray-400' : 'bg-gray-200 border-gray-300 text-gray-600')
                                                        }`}>
                                                        3
                                                    </div>
                                                    <div className="flex-1">
                                                        <span className={`text-sm font-semibold ${isDark ? 'text-red-400' : 'text-blue-700'}`}>Run Tests</span>
                                                        <p className={`text-xs italic ${isDark ? 'text-red-400/80' : 'text-red-700/80'}`}>Execute latest generated POM tests</p>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', flexShrink: 0 }}>
                                                    {/* Heal Button - Shows when test failed, hides after healed */}
                                                    {testResult && testResult.status !== 'success' && !healResult?.fixes_applied && (
                                                        <Tooltip title="AI Heal - Analyze failure and fix" arrow placement="top">
                                                            <span>
                                                                <button
                                                                    onClick={healTest}
                                                                    disabled={healing || runningTest}
                                                                    className={`flex items-center justify-center gap-1 h-7 px-2 text-xs font-semibold rounded-lg backdrop-blur-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${healing
                                                                        ? (isDark ? 'bg-gradient-to-r from-violet-500/20 to-pink-500/20 border border-red-600/40 text-purple-300' : 'bg-gradient-to-r from-violet-500/15 to-pink-500/15 border border-purple-300/50 text-purple-700')
                                                                        : healResult?.fixes_applied
                                                                            ? (isDark ? 'bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-300 hover:text-green-200' : 'bg-green-500/10 hover:bg-green-500/15 border border-green-300/40 text-green-700 hover:text-green-800')
                                                                            : (isDark ? 'bg-gradient-to-r from-violet-500/10 to-pink-500/10 hover:from-violet-500/20 hover:to-pink-500/20 border border-red-600/30 text-purple-300 hover:text-purple-200 shadow-sm' : 'bg-gradient-to-r from-violet-500/10 to-pink-500/10 hover:from-violet-500/15 hover:to-pink-500/15 border border-purple-300/40 text-purple-700 hover:text-purple-800 shadow-sm')
                                                                        }`}
                                                                    style={{ minWidth: 92, flexShrink: 0 }}
                                                                >
                                                                    <Wand2 size={12} className={healing ? 'animate-pulse' : ''} />
                                                                    <span>{healing ? 'Healing...' : healResult?.fixes_applied ? 'Healed!' : 'Heal'}</span>
                                                                </button>
                                                            </span>
                                                        </Tooltip>
                                                    )}
                                                    <Tooltip title={runningTest ? 'Running tests...' : 'Run Tests'} arrow placement="top">
                                                        <span>
                                                            <button
                                                                onClick={() => runTest()}
                                                                disabled={runningTest || recording || healing}
                                                                className={`w-20 h-7 px-2.5 text-xs font-semibold rounded-lg backdrop-blur-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'bg-red-600/10 hover:bg-red-600/20 border border-red-600/30 text-blue-300 hover:text-blue-200 shadow-sm' : 'bg-red-600/10 hover:bg-red-600/15 border border-blue-300/40 text-blue-700 hover:text-blue-800 shadow-sm'}`}
                                                            >
                                                                {runningTest ? 'Run...' : 'Run'}
                                                            </button>
                                                        </span>
                                                    </Tooltip>
                                                </div>
                                            </div>
                                            <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${isDark ? '#374151' : '#d1d5db'}`, fontSize: 9 }} className={healResult?.fixes_applied ? (isDark ? 'text-green-400' : 'text-green-600') : testResult?.status === 'success' ? (isDark ? 'text-green-400' : 'text-green-600') : testResult || testError ? (isDark ? 'text-red-400' : 'text-red-600') : (isDark ? 'text-gray-500' : 'text-gray-500')}>
                                                <div className="flex items-center gap-1">
                                                    {healing ? (
                                                        <>
                                                            <Wand2 size={9} className="animate-pulse" />
                                                            <span className="font-medium">AI analyzing failure...</span>
                                                        </>
                                                    ) : healResult?.fixes_applied ? (
                                                        <>
                                                            <CheckCircle size={9} />
                                                            <span className="font-medium">Fixed! Click Run to retest</span>
                                                        </>
                                                    ) : runningTest ? (
                                                        <>
                                                            <RefreshCw size={9} className="animate-spin" />
                                                            <span className="font-medium">Running...</span>
                                                        </>
                                                    ) : testResult ? (
                                                        <>
                                                            {testResult.status === 'success' ? <CheckCircle size={9} /> : <XCircle size={9} />}
                                                            <span className="font-medium">{testResult.status === 'success' ? 'Passed' : 'Failed - Click Heal'} (Exit: {testResult.return_code})</span>
                                                        </>
                                                    ) : testError ? (
                                                        <>
                                                            <AlertCircle size={9} />
                                                            <span className="font-medium">Error Occurred</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Circle size={9} />
                                                            <span className="font-medium">Status: Ready</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* STEP 4: Publish */}
                                        <div className={`rounded-xl border transition-all duration-300 ${isDark ? 'bg-[#21262D] border-gray-800 hover:border-white/30 shadow-xl shadow-black/50 hover:bg-[#30363D] hover:scale-[1.01]' : 'bg-white border-gray-300 shadow-lg hover:border-red-400/50 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01]'}`} style={{ padding: 10 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${recording
                                                        ? (isDark ? 'bg-white/5 border-gray-700 text-gray-400' : 'bg-gray-200 border-gray-300 text-gray-600')
                                                        : publishSuccess
                                                            ? (isDark ? 'bg-green-500/10 border-green-500 text-green-400' : 'bg-green-500 border-green-600 text-white')
                                                            : (isDark ? 'bg-white/5 border-gray-700 text-gray-400' : 'bg-gray-200 border-gray-300 text-gray-600')
                                                        }`}>
                                                        4
                                                    </div>
                                                    <div className="flex-1">
                                                        <span className={`text-sm font-semibold ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>Publish</span>
                                                        <p className={`text-xs italic ${isDark ? 'text-orange-400/80' : 'text-orange-600/80'}`}>Deploy POM code to test framework</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setShowPublishModal(true)}
                                                    disabled={recording || generating}
                                                    title="Publish to framework"
                                                    className={`w-20 h-7 px-2.5 text-xs font-semibold rounded-lg backdrop-blur-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-300 hover:text-orange-200 shadow-sm' : 'bg-orange-500/10 hover:bg-orange-500/15 border border-orange-300/40 text-orange-700 hover:text-orange-800 shadow-sm'}`}
                                                    style={{ flexShrink: 0 }}
                                                >
                                                    Publish
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>


                            {/* 5. Output / Console - Flexible Height */}
                            <div className={`flex-1 flex flex-col rounded-xl border shadow-lg overflow-hidden min-h-0 transition-colors duration-300 ${isDark ? 'bg-[#161B22] border-gray-800' : 'bg-white border-gray-300'}`}>
                                {/* Terminal Header / Tabs */}
                                <div className={`py-2.5 border-b flex justify-between items-center shrink-0 transition-colors duration-300 ${isDark ? 'bg-[#21262D] border-gray-800' : 'bg-gray-50 border-gray-300'}`} style={{ paddingLeft: 22, paddingRight: 22 }}>
                                    <div className="flex items-center gap-6">
                                        <button
                                            onClick={() => setActiveTerminalTab('output')}
                                            title="Generation output"
                                            className={`text-xs font-semibold uppercase tracking-wide flex items-center gap-2 transition-colors ${activeTerminalTab === 'output' ? (isDark ? 'text-blue-300' : 'text-blue-700') : 'text-gray-500 hover:text-gray-400'}`}
                                            style={{
                                                padding: '6px 2px',
                                                borderBottom: `2px solid ${activeTerminalTab === 'output' ? (isDark ? '#3b82f6' : '#2563eb') : 'transparent'}`,
                                                background: 'transparent',
                                            }}
                                        >
                                            <Wand2 size={12} />
                                            Generation
                                        </button>
                                        <button
                                            onClick={() => setActiveTerminalTab('test')}
                                            title="Test execution output"
                                            className={`text-xs font-semibold uppercase tracking-wide flex items-center gap-2 transition-colors ${activeTerminalTab === 'test' ? (isDark ? 'text-blue-300' : 'text-blue-700') : 'text-gray-500 hover:text-gray-400'}`}
                                            style={{
                                                padding: '6px 2px',
                                                borderBottom: `2px solid ${activeTerminalTab === 'test' ? (isDark ? '#3b82f6' : '#2563eb') : 'transparent'}`,
                                                background: 'transparent',
                                            }}
                                        >
                                            <Terminal size={12} />
                                            Test Execution
                                        </button>
                                    </div>
                                    {activeTerminalTab === 'test' && (testResult || runningTest || liveLogs) && (
                                        <div className="flex items-center gap-2">
                                            {testResult && (
                                                <Tooltip title="Download Report" arrow placement="top">
                                                    <button
                                                        onClick={handleDownloadReport}
                                                        className={`p-1 rounded transition-colors ${isDark ? 'text-red-400 hover:text-purple-300 hover:bg-white/5' : 'text-red-700 hover:text-purple-700 hover:bg-black/5'}`}
                                                    >
                                                        <Download size={14} />
                                                    </button>
                                                </Tooltip>
                                            )}
                                            <Tooltip title="Expand Logs" arrow placement="top">
                                                <button
                                                    onClick={() => setShowLogsModal(true)}
                                                    className={`p-1 rounded transition-colors ${isDark ? 'text-red-400 hover:text-blue-300 hover:bg-white/5' : 'text-red-700 hover:text-blue-700 hover:bg-black/5'}`}
                                                >
                                                    <Search size={14} />
                                                </button>
                                            </Tooltip>
                                            {testResult && (
                                                <Tooltip title={copied ? "Copied" : "Copy Log"} arrow placement="top">
                                                    <button
                                                        onClick={handleCopy}
                                                        className={`p-1 rounded transition-colors ${copied ? 'text-green-500' : (isDark ? 'text-red-400 hover:text-blue-300 hover:bg-white/5' : 'text-red-700 hover:text-blue-700 hover:bg-black/5')}`}
                                                    >
                                                        {copied ? <Check size={14} /> : <Copy size={14} />}
                                                    </button>
                                                </Tooltip>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 overflow-y-auto font-mono text-xs custom-scrollbar" style={{ paddingLeft: 22, paddingRight: 22, paddingTop: 16, paddingBottom: 16 }}>
                                    {/* TAB 1: GENERATION OUTPUT */}
                                    {activeTerminalTab === 'output' && (
                                        <>
                                            {!output && !generating && (
                                                <div className={`h-full flex flex-col items-center justify-center space-y-2 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                                    <BoxIcon size={24} className="opacity-20" />
                                                    <p>No generation output</p>
                                                </div>
                                            )}

                                            {generating && (
                                                <div className="space-y-2">
                                                    <div className={`h-4 w-3/4 rounded ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
                                                    <div className={`h-4 w-1/2 rounded ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
                                                    <div className={`h-4 w-5/6 rounded ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
                                                </div>
                                            )}

                                            {output && output.status === 'success' && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                                    <div className={`flex items-center gap-2 ${isDark ? 'text-green-400' : 'text-green-600'}`} style={{ marginBottom: 2 }}>
                                                        <CheckCircle size={16} />
                                                        <span className="font-bold" style={{ lineHeight: 1.25 }}>Generation Complete</span>
                                                    </div>

                                                    <div>
                                                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`} style={{ marginBottom: 10, lineHeight: 1.35 }}>Created POM Files: ready to publish to framework</p>
                                                        <div className="space-y-2">
                                                            {output.files?.map((f, i) => (
                                                                <div
                                                                    key={i}
                                                                    onClick={() => handlePreviewFile(f)}
                                                                    title="Click to view & edit"
                                                                    className={`flex items-center gap-2 rounded transition-colors group cursor-pointer border border-transparent ${isDark ? 'hover:bg-white/5 hover:border-gray-800' : 'hover:bg-black/5 hover:border-black/5'}`}
                                                                    style={{ padding: '10px 12px' }}
                                                                >
                                                                    <FileCode size={14} className={isDark ? 'text-red-400' : 'text-red-600'} />
                                                                    <span className={`transition-colors font-mono text-xs ${isDark ? 'text-gray-300 group-hover:text-white' : 'text-gray-700 group-hover:text-black'}`} style={{ lineHeight: 1.35 }}>{f}</span>
                                                                    <div className={`flex items-center gap-1 ${isDark ? 'text-red-400 hover:text-blue-300' : 'text-red-700 hover:text-blue-700'}`} style={{ marginLeft: 6 }}>
                                                                        <Eye size={12} />
                                                                    </div>
                                                                    <div style={{ flex: 1 }} />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* TAB 2: TEST EXECUTION */}
                                    {activeTerminalTab === 'test' && (
                                        <>
                                            {!runningTest && !testResult && !testError && (
                                                <div className={`h-full flex flex-col items-center justify-center space-y-2 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                                    <Play size={24} className="opacity-20" />
                                                    <p>Ready to execute tests</p>
                                                </div>
                                            )}

                                            {/* Running State */}
                                            {runningTest && (
                                                <div className="space-y-3">
                                                    <div className={`flex items-center gap-2 mb-3 text-xs font-semibold ${isDark ? 'text-red-400' : 'text-red-700'}`}>
                                                        <div className="w-2 h-2 rounded-full bg-red-600" />
                                                        Executing Pytest...
                                                    </div>
                                                    <div className={`font-mono whitespace-pre-wrap leading-relaxed opacity-80 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                        {liveLogs}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Error State */}
                                            {testError && (
                                                <div className={`p-3 rounded border text-xs ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-200' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                                    <div className="flex items-center gap-2 font-bold mb-1">
                                                        <XCircle size={14} />
                                                        Execution Error
                                                    </div>
                                                    {testError}
                                                </div>
                                            )}

                                            {/* Result State */}
                                            {testResult && !runningTest && (
                                                <div className="space-y-3">
                                                    <div className={`flex items-center justify-between p-3 rounded border ${testResult.status === 'success' ? (isDark ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-200') : (isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200')}`}>
                                                        <div className={`flex items-center gap-2 font-bold ${testResult.status === 'success' ? (isDark ? 'text-green-400' : 'text-green-700') : (isDark ? 'text-red-400' : 'text-red-700')}`}>
                                                            {testResult.status === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                                                            Test {testResult.status === 'success' ? 'Passed' : 'Failed'}
                                                        </div>
                                                        <span className={`text-xs font-mono opacity-60 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Exit: {testResult.return_code}</span>
                                                    </div>

                                                    <div>
                                                        <p className={`text-xs uppercase font-bold tracking-wider mb-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Console Output</p>
                                                        <div className={`whitespace-pre-wrap leading-relaxed opacity-90 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
                                                            {testResult.output}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
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
                <div
                    className="fixed bottom-6 right-6 z-[110] cursor-grab active:cursor-grabbing"
                    style={{ transform: `translate(${chatPos.x}px, ${chatPos.y}px)` }}
                    onMouseDown={(e) => {
                        isDraggingChat.current = true;
                        chatDragStart.current = { x: e.clientX, y: e.clientY };
                        chatStartPos.current = { ...chatPos };
                        hasMoved.current = false;
                    }}
                >
                    <button
                        onClick={(e) => {
                            if (hasMoved.current) {
                                e.preventDefault();
                                return;
                            }
                            setShowChat(!showChat);
                        }}
                        title={showChat ? 'Close assistant' : 'Open assistant'}
                        className={`group relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 bg-gradient-to-br from-[#D00000] via-[#D00000] to-[#D00000] text-white shadow-2xl`}
                    >
                        {!showChat && (
                            <>
                                <span className={`absolute inset-0 rounded-full border ${isDark ? 'border-gray-600' : 'border-red-700/40'} animate-[ping_2s_linear_infinite]`} />
                                <span className={`absolute inset-0 rounded-full border ${isDark ? 'border-gray-700' : 'border-red-700/20'} animate-[ping_2s_linear_infinite_1s]`} />
                            </>
                        )}
                        {showChat ? (
                            <X size={24} className="relative z-10 animate-in fade-in zoom-in duration-300" />
                        ) : (
                            <MessageSquare size={24} className="relative z-10 animate-in fade-in zoom-in duration-300" />
                        )}
                    </button>
                </div>
            </Box>
        </>
    );
}
