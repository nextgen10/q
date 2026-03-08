import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    InputAdornment,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Paper,
    Stack,
    Switch,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import {
    Check,
    CheckCircle,
    ChevronsDown,
    Copy,
    Download,
    Filter,
    Eye,
    FileCode,
    Folder,
    FolderOpen,
    Layers,
    List as ListIcon,
    Play,
    PlayCircle,
    RefreshCw,
    Search,
    Tag,
    Terminal,
    Trash2,
    XCircle,
    Zap,
} from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus, vs } from "react-syntax-highlighter/dist/esm/styles/prism";
import { StatusSnackbar } from "../UI/StatusSnackbar";

const PREVIEW_TABS = ["test", "page", "locator", "data"];

export function TestExecutionView() {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";
    const logsEndRef = useRef(null);

    const [tests, setTests] = useState([]);
    const [selectedTests, setSelectedTests] = useState(new Set());
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState(null);
    const [status, setStatus] = useState(null);
    const [reportAvailable, setReportAvailable] = useState(false);
    const [copied, setCopied] = useState(false);
    const [runningMode, setRunningMode] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedFolders, setExpandedFolders] = useState({});
    const [liveLogs, setLiveLogs] = useState("");
    const [logOffset, setLogOffset] = useState(0);
    const [autoScroll, setAutoScroll] = useState(true);
    const [availableMarkers, setAvailableMarkers] = useState([]);
    const [selectedMarker, setSelectedMarker] = useState("");
    const [markerMenuAnchor, setMarkerMenuAnchor] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [modalStatus, setModalStatus] = useState(null);
    const [assignMarkerValue, setAssignMarkerValue] = useState("");
    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [previewActiveTab, setPreviewActiveTab] = useState("test");
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewCopied, setPreviewCopied] = useState(false);
    const [runParallel, setRunParallel] = useState(false);
    const [parallelWorkers, setParallelWorkers] = useState("");
    const [defaultWorkers, setDefaultWorkers] = useState(4);

    const showStatus = (message, severity = "success") => {
        setStatus({ message, severity });
        setTimeout(() => setStatus(null), 3000);
    };

    const showModalStatus = (message, severity = "success") => {
        setModalStatus({ message, severity });
        setTimeout(() => setModalStatus(null), 3000);
    };

    useEffect(() => {
        fetchTests();
        fetchMarkers();
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch("/api/playwright-pom/settings");
            const data = await res.json();
            if (data.default_parallel_workers) {
                setDefaultWorkers(data.default_parallel_workers);
            }
        } catch (e) {
            console.error("Failed to fetch settings:", e);
        }
    };

    const fetchMarkers = async () => {
        try {
            const res = await fetch("/api/playwright-pom/settings");
            const data = await res.json();
            if (data.markers) {
                setAvailableMarkers(data.markers);
            }
        } catch (e) {
            console.error("Failed to fetch markers:", e);
        }
    };

    useEffect(() => {
        let interval;
        if (running) {
            interval = setInterval(async () => {
                try {
                    const res = await fetch(`/api/playwright-pom/tests/logs?offset=${logOffset}`);
                    const data = await res.json();
                    if (data.content) {
                        setLiveLogs((prev) => prev + data.content);
                        setLogOffset(data.offset);
                    }
                } catch (err) {
                    console.error("Failed to fetch logs:", err);
                }
            }, 500);
        }
        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [running, logOffset]);

    useEffect(() => {
        if (autoScroll && logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [liveLogs, autoScroll]);

    const fetchTests = async () => {
        try {
            const res = await fetch("/api/playwright-pom/tests/list");
            const data = await res.json();
            const normalizedTests = (data.tests || []).map((t) =>
                typeof t === "string" ? { path: t, name: t, folder: null } : t
            );

            setTests(normalizedTests);

            const initialFolders = {};
            normalizedTests.forEach((test) => {
                const folder = test.folder || "root";
                initialFolders[folder] = true;
            });
            setExpandedFolders(initialFolders);
        } catch (e) {
            showStatus("Failed to load test list.", "error");
        }
    };

    const runTest = async (overrideFile = null) => {
        let payload = {};

        if (overrideFile === "ALL") {
            payload = {
                test_file: "ALL",
                parallel: runParallel,
                parallel_workers: runParallel && parallelWorkers ? parseInt(parallelWorkers, 10) : null,
            };
        } else {
            if (selectedTests.size === 0 && !selectedMarker) {
                return;
            }
            payload = {
                test_files: selectedTests.size > 0 ? Array.from(selectedTests) : null,
                marker: selectedMarker || null,
                parallel: runParallel,
                parallel_workers: runParallel && parallelWorkers ? parseInt(parallelWorkers, 10) : null,
            };
        }

        try {
            setLiveLogs("");
            setLogOffset(0);
            setRunning(true);
            setRunningMode(overrideFile === "ALL" ? "ALL" : "SELECTED");
            setResult(null);
            setStatus(null);
            setReportAvailable(false);
            setAutoScroll(true);

            const res = await fetch("/api/playwright-pom/tests/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.detail || data.output);
            }

            setResult(data);
            if (data.report_path) {
                setReportAvailable(true);
            }
        } catch (e) {
            showStatus(e.message, "error");
        } finally {
            setRunning(false);
            setRunningMode(null);
        }
    };

    const handleCopy = () => {
        const textToCopy = result?.output || liveLogs;
        if (!textToCopy) {
            return;
        }
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleToggle = (testPath) => {
        const newSet = new Set(selectedTests);
        if (newSet.has(testPath)) {
            newSet.delete(testPath);
        } else {
            newSet.add(testPath);
        }
        setSelectedTests(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedTests.size === filteredTests.length && filteredTests.length > 0) {
            setSelectedTests(new Set());
            return;
        }
        const newSet = new Set(selectedTests);
        filteredTests.forEach((t) => newSet.add(t.path));
        setSelectedTests(newSet);
    };

    const toggleFolderSelection = (testsInFolder) => {
        const newSet = new Set(selectedTests);
        const folderPaths = testsInFolder.map((t) => t.path);
        const allSelected = folderPaths.every((path) => newSet.has(path));

        if (allSelected) {
            folderPaths.forEach((path) => newSet.delete(path));
        } else {
            folderPaths.forEach((path) => newSet.add(path));
        }
        setSelectedTests(newSet);
    };

    const filteredTests = useMemo(
        () =>
            tests.filter((test) => {
                const matchesSearch = test.name.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesMarker =
                    !selectedMarker || (test.markers && test.markers.includes(selectedMarker));
                return matchesSearch && matchesMarker;
            }),
        [tests, searchTerm, selectedMarker]
    );

    const groupedTests = useMemo(() => {
        const groups = { root: [] };

        filteredTests.forEach((test) => {
            const folder = test.folder || "root";
            if (!groups[folder]) {
                groups[folder] = [];
            }
            groups[folder].push(test);
        });

        if (groups.root.length === 0 && Object.keys(groups).length > 1) {
            delete groups.root;
        }
        return groups;
    }, [filteredTests]);

    useEffect(() => {
        if (!searchTerm) {
            return;
        }
        const newExpanded = { ...expandedFolders };
        Object.keys(groupedTests).forEach((folder) => {
            newExpanded[folder] = true;
        });
        setExpandedFolders(newExpanded);
    }, [searchTerm, groupedTests]);

    const toggleFolder = (folder) => {
        setExpandedFolders((prev) => ({ ...prev, [folder]: !prev[folder] }));
    };

    const clearLogs = () => {
        setLiveLogs("");
        setResult(null);
        setStatus(null);
    };

    const deleteSelectedTests = async () => {
        if (selectedTests.size === 0) {
            return;
        }

        try {
            const deletePromises = Array.from(selectedTests).map((path) =>
                fetch(`/api/playwright-pom/tests/delete/${path}`, { method: "DELETE" })
            );
            await Promise.all(deletePromises);
            fetchTests();
            setSelectedTests(new Set());
            setShowDeleteConfirm(false);
            showStatus("Deleted successfully");
        } catch (e) {
            showStatus(`Failed to delete items: ${e.message}`, "error");
        }
    };

    const assignMarkersToTests = async () => {
        if (selectedTests.size === 0 || !assignMarkerValue) {
            return;
        }

        const selectedTestsList = (tests || []).filter((t) => selectedTests.has(t.path));
        const atLimit = selectedTestsList.filter(
            (t) => t.markers && t.markers.length >= 3 && !t.markers.includes(assignMarkerValue)
        );

        if (atLimit.length > 0) {
            if (selectedTests.size === 1) {
                showModalStatus("Max 3 markers allowed per test", "warning");
                return;
            }
            if (atLimit.length === selectedTests.size) {
                showModalStatus("All selected tests already have 3 markers", "warning");
                return;
            }
        }

        try {
            const res = await fetch("/api/playwright-pom/tests/assign-marker", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    test_files: Array.from(selectedTests),
                    marker: assignMarkerValue,
                }),
            });
            if (!res.ok) {
                throw new Error("Failed to assign marker");
            }
            const data = await res.json();
            showModalStatus(data.message);
            fetchTests();
            fetchMarkers();
            setAssignMarkerValue("");
        } catch (e) {
            showModalStatus(`Error: ${e.message}`, "error");
        }
    };

    const removeMarkersFromTests = async (markerToRemove) => {
        if (selectedTests.size === 0 || !markerToRemove) {
            return;
        }
        try {
            const res = await fetch("/api/playwright-pom/tests/remove-marker", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    test_files: Array.from(selectedTests),
                    marker: markerToRemove,
                }),
            });
            if (!res.ok) {
                throw new Error("Failed to remove marker");
            }
            const data = await res.json();
            showModalStatus(data.message);
            fetchTests();
        } catch (e) {
            showModalStatus(`Error: ${e.message}`, "error");
        }
    };

    const fetchPreview = async (testPath) => {
        setPreviewLoading(true);
        setShowPreview(true);
        setPreviewActiveTab("test");
        try {
            const res = await fetch(
                `/api/playwright-pom/tests/preview?test_path=${encodeURIComponent(testPath)}`
            );
            if (!res.ok) {
                throw new Error("Failed to load preview");
            }
            const data = await res.json();
            setPreviewData(data);
        } catch (e) {
            showStatus(`Error: ${e.message}`, "error");
            setShowPreview(false);
        } finally {
            setPreviewLoading(false);
        }
    };

    const selectedMarkerPool = useMemo(() => {
        const uniqueAssigned = new Set();
        selectedTests.forEach((path) => {
            const test = tests.find((t) => t.path === path);
            if (test?.markers) {
                test.markers.forEach((m) => uniqueAssigned.add(m));
            }
        });
        return Array.from(uniqueAssigned);
    }, [selectedTests, tests]);

    const sortedGroups = Object.entries(groupedTests).sort(([a], [b]) =>
        a === "root" ? -1 : b === "root" ? 1 : a.localeCompare(b)
    );
    const markerMenuOpen = Boolean(markerMenuAnchor);

    return (
        <Box sx={{ height: "calc(100vh - 64px)", p: 2, overflow: "hidden" }}>
            <Box
                sx={{
                    height: "100%",
                    width: "100%",
                    display: "flex",
                    gap: 2,
                    minHeight: 0,
                    flexDirection: { xs: "column", md: "row" },
                }}
            >
                <Box sx={{ minHeight: 0, width: { xs: "100%", md: 570 }, flexShrink: 0 }}>
                        <Paper
                            variant="outlined"
                            sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column" }}
                        >
                            <Stack spacing={1.5}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <ListIcon size={16} color={theme.palette.error.main} />
                                        <Typography variant="subtitle1" fontWeight={700}>
                                            Test Suite
                                        </Typography>
                                    </Stack>
                                    <Chip label={`${tests.length} available`} size="small" color="error" variant="outlined" />
                                </Stack>

                                <TextField
                                    size="small"
                                    placeholder="Filter tests"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Search size={16} color={theme.palette.error.main} />
                                            </InputAdornment>
                                        ),
                                    }}
                                />

                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Button size="small" onClick={toggleSelectAll}>
                                        {selectedTests.size === filteredTests.length && filteredTests.length > 0
                                            ? "Clear All"
                                            : "Select All"}
                                    </Button>
                                    <Typography variant="caption" color="text.secondary">
                                        {selectedTests.size} selected
                                    </Typography>
                                    <Box sx={{ flex: 1 }} />
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<Filter size={14} color={isDark ? theme.palette.grey[400] : undefined} />}
                                        onClick={(e) => setMarkerMenuAnchor(e.currentTarget)}
                                        sx={{
                                            color: isDark ? "grey.300" : "text.primary",
                                            borderColor: selectedMarker ? alpha(theme.palette.error.main, 0.45) : "divider",
                                            "&:hover": {
                                                borderColor: selectedMarker ? "error.main" : "text.secondary",
                                                bgcolor: isDark
                                                    ? alpha(theme.palette.common.white, 0.02)
                                                    : alpha(theme.palette.common.black, 0.02),
                                            },
                                        }}
                                    >
                                        {selectedMarker || "Marker: None"}
                                    </Button>
                                    <Menu
                                        anchorEl={markerMenuAnchor}
                                        open={markerMenuOpen}
                                        onClose={() => setMarkerMenuAnchor(null)}
                                        PaperProps={{
                                            sx: {
                                                minWidth: 160,
                                                bgcolor: "background.paper",
                                            },
                                        }}
                                    >
                                        <MenuItem
                                            sx={{ color: "text.secondary" }}
                                            onClick={() => {
                                                setSelectedMarker("");
                                                setMarkerMenuAnchor(null);
                                            }}
                                        >
                                            None
                                        </MenuItem>
                                        {availableMarkers.map((m) => (
                                            <MenuItem
                                                key={m}
                                                selected={selectedMarker === m}
                                                sx={{
                                                    color: "text.secondary",
                                                    "&.Mui-selected": {
                                                        color: "error.main",
                                                        bgcolor: alpha(theme.palette.error.main, 0.1),
                                                    },
                                                }}
                                                onClick={() => {
                                                    setSelectedMarker(m);
                                                    setMarkerMenuAnchor(null);
                                                }}
                                            >
                                                {m}
                                            </MenuItem>
                                        ))}
                                    </Menu>
                                    <Tooltip title="Assign marker">
                                        <span>
                                            <IconButton
                                                size="small"
                                                disabled={selectedTests.size === 0}
                                                onClick={() => setShowAssignModal(true)}
                                                sx={{
                                                    color:
                                                        selectedTests.size === 0
                                                            ? "action.disabled"
                                                            : "error.main",
                                                    "&:hover": {
                                                        color: "error.main",
                                                    },
                                                }}
                                            >
                                                <Tag size={16} />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                    <Tooltip title="Delete selected">
                                        <span>
                                            <IconButton
                                                size="small"
                                                color="error"
                                                disabled={selectedTests.size === 0}
                                                onClick={() => setShowDeleteConfirm(true)}
                                            >
                                                <Trash2 size={16} />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                </Stack>
                            </Stack>

                            <Divider sx={{ my: 1.5 }} />

                            <List dense sx={{ flex: 1, overflow: "auto", minHeight: 0 }}>
                                {filteredTests.length === 0 && (
                                    <ListItem>
                                        <ListItemText
                                            primary="No matching tests found"
                                            primaryTypographyProps={{ color: "text.secondary", variant: "body2" }}
                                        />
                                    </ListItem>
                                )}

                                {sortedGroups.map(([folder, folderTests]) => (
                                    <Box key={folder}>
                                        {folder !== "root" && (
                                            <ListItem
                                                disablePadding
                                            >
                                                <ListItemButton
                                                    onClick={() => toggleFolder(folder)}
                                                    sx={{ py: 0.25, minHeight: 32 }}
                                                >
                                                    <ListItemIcon
                                                        sx={{ minWidth: 28 }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleFolderSelection(folderTests);
                                                        }}
                                                    >
                                                        <Box
                                                            sx={{
                                                                width: 14,
                                                                height: 14,
                                                                borderRadius: "4px",
                                                                border: "1px solid",
                                                                borderColor: folderTests.every((t) => selectedTests.has(t.path))
                                                                    ? "error.main"
                                                                    : isDark
                                                                        ? alpha(theme.palette.common.white, 0.38)
                                                                        : "grey.500",
                                                                bgcolor: folderTests.every((t) => selectedTests.has(t.path))
                                                                    ? "error.main"
                                                                    : isDark
                                                                        ? "transparent"
                                                                        : "#ffffff",
                                                                color: "white",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                boxShadow: folderTests.every((t) => selectedTests.has(t.path))
                                                                    ? `0 0 0 1px ${alpha(theme.palette.error.main, 0.35)}`
                                                                    : "none",
                                                            }}
                                                        >
                                                            {folderTests.every((t) => selectedTests.has(t.path)) && (
                                                                <Check size={9} strokeWidth={3.25} />
                                                            )}
                                                        </Box>
                                                    </ListItemIcon>
                                                    <ListItemIcon sx={{ minWidth: 24 }}>
                                                        {expandedFolders[folder] ? (
                                                            <FolderOpen size={13} color={theme.palette.error.main} />
                                                        ) : (
                                                            <Folder size={13} color={theme.palette.error.main} />
                                                        )}
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={folder}
                                                        primaryTypographyProps={{ fontSize: "0.8rem", fontWeight: 500 }}
                                                    />
                                                </ListItemButton>
                                            </ListItem>
                                        )}

                                        {(folder === "root" || expandedFolders[folder]) && (
                                            <Box
                                                sx={
                                                    folder !== "root"
                                                        ? {
                                                              ml: 3.2,
                                                              pl: 0.25,
                                                              borderLeft: "1px dashed",
                                                              borderColor: isDark
                                                                  ? alpha(theme.palette.common.white, 0.2)
                                                                  : alpha(theme.palette.common.black, 0.2),
                                                          }
                                                        : undefined
                                                }
                                            >
                                                {folderTests.map((test) => {
                                                const isSelected = selectedTests.has(test.path);
                                                return (
                                                    <ListItem
                                                        key={test.path}
                                                        secondaryAction={
                                                            <Stack direction="row" spacing={0.5}>
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        fetchPreview(test.path);
                                                                    }}
                                                                    sx={{
                                                                        color: "error.main",
                                                                        "&:hover": { color: "error.main" },
                                                                    }}
                                                                >
                                                                    <Eye size={14} />
                                                                </IconButton>
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedTests(new Set([test.path]));
                                                                        setShowAssignModal(true);
                                                                    }}
                                                                    sx={{
                                                                        color: "error.main",
                                                                        "&:hover": { color: "error.main" },
                                                                    }}
                                                                >
                                                                    <Tag size={14} />
                                                                </IconButton>
                                                            </Stack>
                                                        }
                                                        disablePadding
                                                        sx={{ pl: 0 }}
                                                    >
                                                        <ListItemButton onClick={() => handleToggle(test.path)}>
                                                            <ListItemIcon sx={{ minWidth: 32 }}>
                                                                <Box
                                                                    sx={{
                                                                        width: 14,
                                                                        height: 14,
                                                                        borderRadius: "4px",
                                                                        border: "1px solid",
                                                                        borderColor: isSelected
                                                                            ? "error.main"
                                                                            : isDark
                                                                                ? alpha(theme.palette.common.white, 0.38)
                                                                                : "grey.500",
                                                                        bgcolor: isSelected
                                                                            ? "error.main"
                                                                            : isDark
                                                                                ? "transparent"
                                                                                : "#ffffff",
                                                                        color: "white",
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        justifyContent: "center",
                                                                        boxShadow: isSelected
                                                                            ? `0 0 0 1px ${alpha(theme.palette.error.main, 0.35)}`
                                                                            : "none",
                                                                    }}
                                                                >
                                                                    {isSelected && <Check size={9} strokeWidth={3.25} />}
                                                                </Box>
                                                            </ListItemIcon>
                                                            <ListItemText
                                                                secondaryTypographyProps={{ component: "div" }}
                                                                primaryTypographyProps={{ fontSize: "0.8rem", fontWeight: 500 }}
                                                                primary={
                                                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
                                                                        <FileCode size={12} color={theme.palette.error.main} />
                                                                        <span>{test.name.replace(".py", "").replace(/^test_/, "")}</span>
                                                                        {(test.markers || []).map((m) => (
                                                                            <Chip
                                                                                key={m}
                                                                                label={m}
                                                                                size="small"
                                                                                sx={{
                                                                                    height: 18,
                                                                                    fontSize: "0.65rem",
                                                                                    bgcolor: alpha(theme.palette.warning.main, 0.14),
                                                                                    color: isDark ? "#ffb74d" : "#e65100",
                                                                                    border: "1px solid",
                                                                                    borderColor: alpha(theme.palette.warning.main, 0.35),
                                                                                }}
                                                                            />
                                                                        ))}
                                                                    </Stack>
                                                                }
                                                            />
                                                        </ListItemButton>
                                                    </ListItem>
                                                );
                                            })}
                                            </Box>
                                        )}
                                    </Box>
                                ))}
                            </List>
                        </Paper>
                </Box>

                <Box sx={{ minHeight: 0, flex: 1 }}>
                        <Stack spacing={2} sx={{ height: "100%" }}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
                                    <Box>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Layers size={16} color={theme.palette.error.main} />
                                            <Typography variant="subtitle1" fontWeight={700}>
                                                Execution Control
                                            </Typography>
                                        </Stack>
                                        <Typography variant="caption" color="text.secondary">
                                            {running ? "Tests are running..." : "Ready to execute tests"}
                                        </Typography>
                                    </Box>

                                    <Box sx={{ flex: 1 }} />

                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                            px: 1,
                                            py: 0.5,
                                            border: "1px dashed",
                                            borderColor: alpha(theme.palette.error.main, 0.45),
                                            borderRadius: 1,
                                            bgcolor: alpha(theme.palette.error.main, 0.06),
                                            cursor: "pointer",
                                        }}
                                        onClick={() => {
                                            setRunParallel(!runParallel);
                                            if (runParallel) {
                                                setParallelWorkers("");
                                            }
                                        }}
                                    >
                                        <IconButton
                                            size="small"
                                            color="error"
                                        >
                                            <Zap size={15} />
                                        </IconButton>
                                        <Typography
                                            variant="caption"
                                            sx={{ fontWeight: 700, letterSpacing: "0.08em", color: "error.main" }}
                                        >
                                            PARALLEL
                                        </Typography>
                                        {runParallel && (
                                            <TextField
                                                size="small"
                                                type="number"
                                                placeholder={`${defaultWorkers}`}
                                                value={parallelWorkers}
                                                onChange={(e) => setParallelWorkers(e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                sx={{ width: 72 }}
                                                inputProps={{
                                                    min: 1,
                                                    max: 16,
                                                    style: {
                                                        textAlign: "center",
                                                        fontFamily: "monospace",
                                                        padding: "4px 6px",
                                                    },
                                                }}
                                            />
                                        )}
                                    </Box>

                                    <Stack direction="row" spacing={0.5}>
                                        <Tooltip title="Download report">
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => window.open("/api/tests/report/download", "_blank")}
                                                    disabled={!reportAvailable || running}
                                                    sx={{
                                                        border: "1px solid",
                                                        borderColor: alpha(theme.palette.error.main, 0.35),
                                                        borderRadius: 1,
                                                    }}
                                                >
                                                    <Download size={16} />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                        <Tooltip title="Run all tests">
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    disabled={running}
                                                    onClick={() => runTest("ALL")}
                                                    sx={{
                                                        border: "1px solid",
                                                        borderColor: "divider",
                                                        borderRadius: 1,
                                                    }}
                                                >
                                                    {running && runningMode === "ALL" ? (
                                                        <RefreshCw size={16} className="animate-spin" />
                                                    ) : (
                                                        <PlayCircle size={16} />
                                                    )}
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                        <Tooltip title={`Run selected (${selectedTests.size})`}>
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    disabled={(selectedTests.size === 0 && !selectedMarker) || running}
                                                    onClick={() => runTest()}
                                                    sx={{
                                                        border: "1px solid",
                                                        borderColor: alpha(theme.palette.error.main, 0.35),
                                                        borderRadius: 1,
                                                    }}
                                                >
                                                    {running && runningMode === "SELECTED" ? (
                                                        <RefreshCw size={16} className="animate-spin" />
                                                    ) : (
                                                        <Play size={16} />
                                                    )}
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    </Stack>
                                </Stack>
                            </Paper>

                            <Paper
                                variant="outlined"
                                sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
                            >
                                <Stack
                                    direction="row"
                                    spacing={1}
                                    alignItems="center"
                                    justifyContent="space-between"
                                    sx={{ px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}
                                >
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Terminal size={16} color={theme.palette.error.main} />
                                        <Typography variant="subtitle2" fontWeight={700}>
                                            Console Logs
                                        </Typography>
                                        {running && <Chip label="EXECUTING" size="small" color="error" />}
                                        {!running && result && (
                                            <Chip
                                                icon={result.status === "success" ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                                label={result.status === "success" ? "PASSED" : "FAILED"}
                                                size="small"
                                                color={result.status === "success" ? "success" : "error"}
                                            />
                                        )}
                                    </Stack>

                                    <Stack direction="row" spacing={0.5}>
                                        <Tooltip title={autoScroll ? "Auto-scroll on" : "Auto-scroll off"}>
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => setAutoScroll((prev) => !prev)}
                                                    disabled={!liveLogs}
                                                    color={autoScroll ? "error" : "default"}
                                                    sx={{
                                                        border: "1px solid",
                                                        borderColor: "divider",
                                                        borderRadius: 1,
                                                    }}
                                                >
                                                    <ChevronsDown size={16} />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                        <Tooltip title="Clear logs">
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    onClick={clearLogs}
                                                    disabled={!liveLogs}
                                                    sx={{
                                                        border: "1px solid",
                                                        borderColor: "divider",
                                                        borderRadius: 1,
                                                    }}
                                                >
                                                    <Trash2 size={16} />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                        <Tooltip title={copied ? "Copied" : "Copy logs"}>
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    onClick={handleCopy}
                                                    disabled={!liveLogs}
                                                    color={copied ? "success" : "default"}
                                                    sx={{
                                                        border: "1px solid",
                                                        borderColor: "divider",
                                                        borderRadius: 1,
                                                    }}
                                                >
                                                    {copied ? <Check size={16} /> : <Copy size={16} />}
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    </Stack>
                                </Stack>

                                <Box
                                    sx={{
                                        flex: 1,
                                        overflow: "auto",
                                        p: 2,
                                        fontFamily: "monospace",
                                        fontSize: 13,
                                        bgcolor: alpha(theme.palette.background.default, 0.55),
                                    }}
                                >
                                    {!running && !liveLogs && !result ? (
                                        <Stack height="100%" justifyContent="center" alignItems="center" spacing={1}>
                                            <Terminal size={32} />
                                            <Typography variant="body2" color="text.secondary">
                                                Ready for execution output...
                                            </Typography>
                                        </Stack>
                                    ) : (
                                        <>
                                            <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{liveLogs}</pre>
                                            {result?.output && (
                                                <pre
                                                    style={{
                                                        marginTop: 12,
                                                        paddingTop: 12,
                                                        borderTop: "1px solid",
                                                        whiteSpace: "pre-wrap",
                                                        wordBreak: "break-word",
                                                    }}
                                                >
                                                    {result.output.replace(liveLogs, "")}
                                                </pre>
                                            )}
                                            <div ref={logsEndRef} />
                                        </>
                                    )}
                                </Box>
                            </Paper>
                        </Stack>
                </Box>
            </Box>

            <Dialog open={showAssignModal} onClose={() => setShowAssignModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ pb: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Tag size={18} color={theme.palette.error.main} />
                            <Typography variant="h6">Assign Marker</Typography>
                        </Stack>
                        <Chip
                            size="small"
                            color="error"
                            variant="outlined"
                            label={
                                selectedTests.size === 1
                                    ? (Array.from(selectedTests)[0] || "")
                                          .split("/")
                                          .pop()
                                          .replace(".py", "")
                                          .replace(/^test_/, "")
                                    : `${selectedTests.size} selected`
                            }
                        />
                    </Stack>
                </DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2.5}>
                        <Box>
                            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                                <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: "0.08em" }}>
                                    ACTIVE MARKERS
                                </Typography>
                                <Chip size="small" label="3 LIMIT" variant="outlined" />
                            </Stack>
                            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
                                {selectedMarkerPool.length === 0 && (
                                    <Typography variant="body2" color="text.secondary">
                                        No markers assigned
                                    </Typography>
                                )}
                                {selectedMarkerPool.map((m) => (
                                    <Chip key={m} label={m} onDelete={() => removeMarkersFromTests(m)} />
                                ))}
                            </Stack>
                        </Box>

                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: "0.08em" }}>
                                SELECT FROM PRESETS
                            </Typography>
                            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
                                {availableMarkers.length === 0 && (
                                    <Typography variant="body2" color="text.secondary">
                                        No presets available
                                    </Typography>
                                )}
                                {availableMarkers.map((m) => {
                                    const isSelected = assignMarkerValue === m;
                                    return (
                                        <Chip
                                            key={m}
                                            label={m}
                                            clickable
                                            color={isSelected ? "error" : "default"}
                                            variant={isSelected ? "filled" : "outlined"}
                                            onClick={() => setAssignMarkerValue(isSelected ? "" : m)}
                                        />
                                    );
                                })}
                            </Stack>
                        </Box>

                        <TextField
                            fullWidth
                            size="small"
                            label="Custom marker"
                            placeholder="new_marker_name"
                            value={assignMarkerValue}
                            onChange={(e) =>
                                setAssignMarkerValue(e.target.value.toLowerCase().replace(/\s+/g, "_"))
                            }
                            inputProps={{ maxLength: 30 }}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setShowAssignModal(false);
                            setAssignMarkerValue("");
                        }}
                    >
                        Cancel
                    </Button>
                    <Button variant="contained" onClick={assignMarkersToTests} disabled={!assignMarkerValue}>
                        Assign Marker
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Delete selected tests?</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2">
                        This action cannot be undone. You are deleting {selectedTests.size}{" "}
                        {selectedTests.size === 1 ? "test" : "tests"}.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={deleteSelectedTests}>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={showPreview} onClose={() => setShowPreview(false)} maxWidth="xl" fullWidth>
                <DialogTitle sx={{ pb: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                            <FileCode size={18} color={theme.palette.error.main} />
                            <Box>
                                <Typography variant="h6">Code Preview</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Read-only generated artifacts
                                </Typography>
                            </Box>
                        </Stack>
                        <Chip size="small" label={previewActiveTab.toUpperCase()} color="error" variant="outlined" />
                    </Stack>
                </DialogTitle>
                <DialogContent dividers sx={{ height: 680, p: 0 }}>
                    <Stack sx={{ height: "100%" }}>
                        <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            sx={{ borderBottom: "1px solid", borderColor: "divider", px: 2 }}
                        >
                            <Tabs
                                value={previewActiveTab}
                                onChange={(_, v) => setPreviewActiveTab(v)}
                                variant="scrollable"
                                scrollButtons="auto"
                            >
                                {PREVIEW_TABS.map((tab) => (
                                    <Tab key={tab} label={tab} value={tab} />
                                ))}
                            </Tabs>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                        maxWidth: 420,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        fontFamily: "monospace",
                                    }}
                                >
                                    {previewData?.paths?.[previewActiveTab] || ""}
                                </Typography>
                                <Tooltip title={previewCopied ? "Copied" : "Copy code"}>
                                    <span>
                                        <IconButton
                                            size="small"
                                            color={previewCopied ? "success" : "default"}
                                            sx={{
                                                border: "1px solid",
                                                borderColor: "divider",
                                                borderRadius: 1,
                                            }}
                                            onClick={() => {
                                                const code = previewData?.[previewActiveTab] || "";
                                                navigator.clipboard.writeText(code);
                                                setPreviewCopied(true);
                                                setTimeout(() => setPreviewCopied(false), 2000);
                                            }}
                                        >
                                            {previewCopied ? <Check size={14} /> : <Copy size={14} />}
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            </Stack>
                        </Stack>

                        <Box sx={{ flex: 1, overflow: "auto", bgcolor: isDark ? "#0d1117" : "#ffffff" }}>
                            {previewLoading ? (
                                <Stack height="100%" justifyContent="center" alignItems="center" spacing={2}>
                                    <CircularProgress size={28} />
                                    <Typography variant="body2" color="text.secondary">
                                        Loading components...
                                    </Typography>
                                </Stack>
                            ) : (
                                <SyntaxHighlighter
                                    language={previewActiveTab === "data" ? "json" : "python"}
                                    style={isDark ? vscDarkPlus : vs}
                                    customStyle={{
                                        margin: 0,
                                        height: "100%",
                                        minHeight: "100%",
                                        fontSize: "15px",
                                        lineHeight: "1.65",
                                        background: "transparent",
                                        whiteSpace: "pre",
                                        overflowX: "auto",
                                        fontFamily:
                                            'JetBrains Mono, Fira Code, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                        WebkitFontSmoothing: "auto",
                                        MozOsxFontSmoothing: "auto",
                                    }}
                                    showLineNumbers
                                    wrapLongLines={false}
                                    codeTagProps={{
                                        style: {
                                            fontFamily:
                                                'JetBrains Mono, Fira Code, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                            fontSize: "15px",
                                            lineHeight: "1.65",
                                        },
                                    }}
                                    lineNumberStyle={{
                                        minWidth: "2.4em",
                                        fontSize: "13px",
                                        opacity: 0.7,
                                    }}
                                >
                                    {previewData?.[previewActiveTab] ||
                                        `# No ${previewActiveTab} component found for this test.`}
                                </SyntaxHighlighter>
                            )}
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowPreview(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            <StatusSnackbar status={status} onClose={() => setStatus(null)} />
            <StatusSnackbar
                status={modalStatus}
                onClose={() => setModalStatus(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            />
        </Box>
    );
}
