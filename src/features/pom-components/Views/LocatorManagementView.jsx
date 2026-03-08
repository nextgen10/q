import React, { useEffect, useMemo, useState } from "react";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import {
    Check,
    ChevronDown,
    ChevronRight,
    Code2,
    Copy,
    Database,
    Edit2,
    FileCode,
    Folder,
    FolderOpen,
    Layers,
    List as ListIcon,
    MousePointer2,
    RefreshCw,
    Search,
    Wand2,
    X,
} from "lucide-react";
import { StatusSnackbar } from "../UI/StatusSnackbar";

const buildFileTree = (files) => {
    const root = {};
    files.forEach((file) => {
        const parts = file.file_name.split("/").filter(Boolean);
        let current = root;
        parts.forEach((part, index) => {
            if (index === parts.length - 1) {
                current[part] = { type: "file", name: part, data: file };
            } else {
                if (!current[part]) {
                    current[part] = { type: "folder", name: part, children: {} };
                }
                current = current[part].children;
            }
        });
    });
    return root;
};

const LocatorCopyButton = ({ value, onCopy }) => {
    const [copied, setCopied] = useState(false);
    return (
        <Tooltip title={copied ? "Copied" : "Copy value"}>
            <IconButton
                size="small"
                sx={{ color: "error.main" }}
                onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(value);
                    setCopied(true);
                    onCopy?.();
                    setTimeout(() => setCopied(false), 1400);
                }}
            >
                {copied ? <Check size={14} /> : <Copy size={14} />}
            </IconButton>
        </Tooltip>
    );
};

const FileTreeNode = ({ node, level = 0, onSelect, selectedFile, isDark, theme }) => {
    const [open, setOpen] = useState(true);
    const isFolder = node.type === "folder";
    const paddingLeft = 1 + level * 1.5;

    if (isFolder) {
        return (
            <Box>
                <ListItemButton
                    sx={{ pl: paddingLeft, py: 0.25, minHeight: 32 }}
                    onClick={() => setOpen((p) => !p)}
                >
                    <ListItemIcon sx={{ minWidth: 22 }}>
                        <ChevronRight
                            size={14}
                            color={theme.palette.error.main}
                            style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
                        />
                    </ListItemIcon>
                    <ListItemIcon sx={{ minWidth: 22 }}>
                        {open ? (
                            <FolderOpen size={14} color={theme.palette.error.main} />
                        ) : (
                            <Folder size={14} color={theme.palette.error.main} />
                        )}
                    </ListItemIcon>
                    <ListItemText
                        primary={node.name.replace(".py", "").replace("_locators", "")}
                        primaryTypographyProps={{ fontSize: "0.8rem", fontWeight: 500 }}
                    />
                </ListItemButton>
                {open && (
                    <Box
                        sx={{
                            ml: 3.2,
                            pl: 0.25,
                            borderLeft: "1px dashed",
                            borderColor: isDark
                                ? alpha(theme.palette.common.white, 0.2)
                                : alpha(theme.palette.common.black, 0.2),
                        }}
                    >
                        {Object.values(node.children).map((child) => (
                            <FileTreeNode
                                key={`${node.name}-${child.name}`}
                                node={child}
                                level={level + 1}
                                onSelect={onSelect}
                                selectedFile={selectedFile}
                                isDark={isDark}
                                theme={theme}
                            />
                        ))}
                    </Box>
                )}
            </Box>
        );
    }

    const isSelected = selectedFile?.file_path === node.data.file_path;
    return (
        <ListItemButton
            sx={{
                pl: paddingLeft + 1,
                py: 0.25,
                minHeight: 30,
                borderLeft: "2px solid",
                borderLeftColor: isSelected ? "error.main" : "transparent",
                bgcolor: isSelected ? alpha(theme.palette.error.main, 0.1) : "transparent",
            }}
            onClick={() => onSelect(node.data)}
        >
            <ListItemIcon sx={{ minWidth: 22 }}>
                <FileCode size={13} color={theme.palette.error.main} />
            </ListItemIcon>
            <ListItemText
                primary={node.name.replace(".py", "").replace("_locators", "")}
                primaryTypographyProps={{ fontSize: "0.8rem", fontWeight: 500, noWrap: true }}
            />
        </ListItemButton>
    );
};

export const LocatorManagementView = () => {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";

    const [files, setFiles] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [locators, setLocators] = useState([]);
    const [recordings, setRecordings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fileSearch, setFileSearch] = useState("");
    const [locatorSearch, setLocatorSearch] = useState("");
    const [expandedClasses, setExpandedClasses] = useState({});
    const [status, setStatus] = useState(null);

    const [editingLocator, setEditingLocator] = useState(null);
    const [editForm, setEditForm] = useState({ name: "", value: "" });

    const [aiModalOpen, setAiModalOpen] = useState(false);
    const [aiTargetLocator, setAiTargetLocator] = useState(null);
    const [selectedRecording, setSelectedRecording] = useState("");
    const [recordingMenuAnchor, setRecordingMenuAnchor] = useState(null);
    const [aiSuggestions, setAiSuggestions] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [modifiedLocators, setModifiedLocators] = useState(new Set());

    useEffect(() => {
        fetchFiles();
        fetchRecordings();
    }, []);

    const showStatus = (message, severity = "success") => {
        setStatus({ message, severity });
        setTimeout(() => setStatus(null), 3000);
    };

    const triggerHighlight = (name, className) => {
        setModifiedLocators((prev) => new Set([...prev, `${className}-${name}`]));
    };

    const fetchFiles = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/playwright-pom/locators/");
            const data = await res.json();
            setFiles(data);
            if (selectedFile) {
                const refreshed = data.find((f) => f.file_path === selectedFile.file_path);
                if (refreshed) {
                    handleFileSelect(refreshed, true);
                }
            }
        } catch (e) {
            showStatus("Failed to load locators", "error");
        } finally {
            setLoading(false);
        }
    };

    const fetchRecordings = async () => {
        try {
            const res = await fetch("/api/playwright-pom/record/files");
            const data = await res.json();
            setRecordings(data.files || []);
        } catch {
            // no-op
        }
    };

    const handleFileSelect = (file, keepSuggestions = false) => {
        setSelectedFile(file);
        const flat = [];
        const initialExpanded = {};
        file.classes.forEach((cls) => {
            initialExpanded[cls.name] = true;
            cls.locators.forEach((loc) => flat.push({ ...loc, className: cls.name }));
        });
        setExpandedClasses(initialExpanded);
        setLocators(flat);
        if (!keepSuggestions) {
            setAiSuggestions(null);
        }
    };

    const fileTree = useMemo(() => {
        const targetFiles = fileSearch
            ? files.filter((f) => f.file_name.toLowerCase().includes(fileSearch.toLowerCase()))
            : files;
        return buildFileTree(targetFiles);
    }, [files, fileSearch]);

    const groupedLocators = useMemo(() => {
        if (!selectedFile) {
            return {};
        }
        let displayLocators = locators;
        if (locatorSearch) {
            const lower = locatorSearch.toLowerCase();
            displayLocators = locators.filter(
                (l) =>
                    l.name.toLowerCase().includes(lower) ||
                    l.value.toLowerCase().includes(lower) ||
                    l.className.toLowerCase().includes(lower)
            );
        }
        const groups = {};
        displayLocators.forEach((loc) => {
            if (!groups[loc.className]) {
                groups[loc.className] = [];
            }
            groups[loc.className].push(loc);
        });
        return groups;
    }, [locators, locatorSearch, selectedFile]);

    const handleSaveEdit = async () => {
        if (!selectedFile || !editingLocator) {
            return;
        }
        try {
            const res = await fetch("/api/playwright-pom/locators/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    file_path: selectedFile.file_path,
                    class_name: editingLocator.className,
                    locator_name: editingLocator.name,
                    new_name: editForm.name,
                    new_value: editForm.value,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                const msg = data.refs_updated?.length
                    ? `Saved & updated references in ${data.refs_updated.length} files`
                    : "Locator updated successfully";
                showStatus(msg);
                triggerHighlight(editForm.name, editingLocator.className);
                setEditingLocator(null);
                fetchFiles();
            } else {
                showStatus("Failed to update locator", "error");
            }
        } catch {
            showStatus("Error updating locator", "error");
        }
    };

    const openAiModal = (locator = null) => {
        setAiTargetLocator(locator);
        setAiModalOpen(true);
        setAiSuggestions(null);
    };

    const handleAiSuggest = async () => {
        if (!selectedFile) {
            return;
        }
        try {
            setAiLoading(true);
            let recordingContent = null;
            if (selectedRecording) {
                const res = await fetch(
                    `/api/playwright-pom/record/load/${encodeURIComponent(selectedRecording)}`
                );
                const data = await res.json();
                recordingContent = data.content;
            }
            const res = await fetch("/api/playwright-pom/locators/ai-suggest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    file_path: selectedFile.file_path,
                    locator_name: aiTargetLocator ? aiTargetLocator.name : null,
                    recording_content: recordingContent,
                }),
            });
            const result = await res.json();
            setAiSuggestions(result.suggestions || []);
        } catch {
            showStatus("AI Suggestion failed", "error");
        } finally {
            setAiLoading(false);
        }
    };

    const applyAiSuggestion = async (suggestion) => {
        const className = suggestion.class_name || aiTargetLocator?.className;
        if (!className || !selectedFile) {
            showStatus("Could not determine class name", "error");
            return;
        }
        try {
            const res = await fetch("/api/playwright-pom/locators/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    file_path: selectedFile.file_path,
                    class_name: className,
                    locator_name: suggestion.locator_name,
                    new_name: suggestion.suggested_name,
                    new_value: suggestion.suggested_value,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                const msg = data.refs_updated?.length
                    ? `Healed! Refactored ${data.refs_updated.length} files`
                    : "Locator healed successfully";
                showStatus(msg);
                triggerHighlight(suggestion.suggested_name, className);
                fetchFiles();
            } else {
                showStatus(`Apply failed: ${data.detail || "Server rejected request"}`, "error");
            }
        } catch (e) {
            showStatus(`Apply failed: ${e.message}`, "error");
        }
    };

    return (
        <Box sx={{ height: "calc(100vh - 64px)", p: 2, overflow: "hidden" }}>
            <StatusSnackbar status={status} onClose={() => setStatus(null)} />

            <Box sx={{ height: "100%", display: "flex", gap: 2, minHeight: 0 }}>
                <Paper
                    variant="outlined"
                    sx={{ width: 340, p: 2, display: "flex", flexDirection: "column", minHeight: 0 }}
                >
                    <Stack spacing={1.5}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Stack direction="row" spacing={1} alignItems="center">
                                <ListIcon size={16} color={theme.palette.error.main} />
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                    Locator Files
                                </Typography>
                            </Stack>
                            <Chip label={`${files.length} available`} size="small" color="error" variant="outlined" />
                        </Stack>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search files..."
                            value={fileSearch}
                            onChange={(e) => setFileSearch(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search size={16} color={theme.palette.error.main} />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Stack>
                    <Divider sx={{ my: 1.5 }} />
                    <Box sx={{ mt: 1.5, flex: 1, overflow: "auto", minHeight: 0 }}>
                        {loading ? (
                            <Stack alignItems="center" justifyContent="center" height="100%" spacing={1}>
                                <CircularProgress size={20} />
                                <Typography variant="caption" color="text.secondary">
                                    Loading files...
                                </Typography>
                            </Stack>
                        ) : (
                            <List dense disablePadding>
                                {Object.values(fileTree).map((node) => (
                                    <FileTreeNode
                                        key={node.name}
                                        node={node}
                                        onSelect={handleFileSelect}
                                        selectedFile={selectedFile}
                                        isDark={isDark}
                                        theme={theme}
                                    />
                                ))}
                            </List>
                        )}
                    </Box>
                </Paper>

                <Paper variant="outlined" sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                    {selectedFile ? (
                        <>
                            <Stack
                                direction="row"
                                spacing={1.5}
                                sx={{ px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}
                                alignItems="center"
                            >
                                <Database size={15} color={theme.palette.error.main} />
                                <Typography
                                    variant="subtitle2"
                                    sx={{ fontWeight: 700, color: "warning.main", maxWidth: 420 }}
                                    noWrap
                                    title={selectedFile.file_name}
                                >
                                    {(selectedFile.file_name.startsWith("/")
                                        ? selectedFile.file_name
                                        : `/${selectedFile.file_name}`
                                    )
                                        .replace(".py", "")
                                        .replace("_locators", "")}
                                </Typography>
                                <Chip size="small" variant="outlined" label={`${locators.length} locators`} />
                                <Box sx={{ flex: 1 }} />
                                <TextField
                                    size="small"
                                    placeholder="Filter locators..."
                                    value={locatorSearch}
                                    onChange={(e) => setLocatorSearch(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Search size={14} color={theme.palette.error.main} />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{ width: 300 }}
                                />
                                <Button variant="contained" color="error" size="small" onClick={() => openAiModal(null)} startIcon={<Wand2 size={14} />}>
                                    AI Analyze
                                </Button>
                            </Stack>

                            <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", p: 2 }}>
                                {Object.entries(groupedLocators).map(([className, clsLocators]) => (
                                    <Accordion
                                        key={className}
                                        expanded={expandedClasses[className] ?? true}
                                        onChange={() =>
                                            setExpandedClasses((prev) => ({
                                                ...prev,
                                                [className]: !(prev[className] ?? true),
                                            }))
                                        }
                                        disableGutters
                                        sx={{ mb: 1.5, border: "1px solid", borderColor: "divider", borderRadius: "8px !important" }}
                                    >
                                        <AccordionSummary expandIcon={<ChevronDown size={16} color={theme.palette.error.main} />}>
                                            <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
                                                <Layers size={14} color={theme.palette.error.main} />
                                                <Typography variant="body2" fontFamily="monospace" fontWeight={700}>
                                                    {className}
                                                </Typography>
                                                <Box sx={{ flex: 1, borderBottom: "1px dashed", borderColor: "divider" }} />
                                                <Chip size="small" label={clsLocators.length} />
                                            </Stack>
                                        </AccordionSummary>
                                        <AccordionDetails sx={{ p: 0 }}>
                                            <TableContainer>
                                                <Table size="small">
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableCell width="26%">Variable Name</TableCell>
                                                            <TableCell>Selector Value</TableCell>
                                                            <TableCell width="90" align="right">
                                                                Actions
                                                            </TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {clsLocators.map((loc) => {
                                                            const key = `${className}-${loc.name}`;
                                                            const isHighlighted = modifiedLocators.has(key);
                                                            const isEditing =
                                                                editingLocator?.name === loc.name &&
                                                                editingLocator?.className === loc.className;
                                                            return (
                                                                <TableRow
                                                                    key={key}
                                                                    sx={{
                                                                        bgcolor: isHighlighted
                                                                            ? alpha(theme.palette.warning.main, 0.12)
                                                                            : "transparent",
                                                                    }}
                                                                >
                                                                    {isEditing ? (
                                                                        <>
                                                                            <TableCell>
                                                                                <TextField
                                                                                    size="small"
                                                                                    value={editForm.name}
                                                                                    onChange={(e) =>
                                                                                        setEditForm((prev) => ({ ...prev, name: e.target.value }))
                                                                                    }
                                                                                    fullWidth
                                                                                />
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                <TextField
                                                                                    size="small"
                                                                                    value={editForm.value}
                                                                                    onChange={(e) =>
                                                                                        setEditForm((prev) => ({ ...prev, value: e.target.value }))
                                                                                    }
                                                                                    fullWidth
                                                                                />
                                                                            </TableCell>
                                                                            <TableCell align="right">
                                                                                <IconButton size="small" sx={{ color: "error.main" }} onClick={() => setEditingLocator(null)}>
                                                                                    <X size={14} />
                                                                                </IconButton>
                                                                                <IconButton size="small" sx={{ color: "error.main" }} onClick={handleSaveEdit}>
                                                                                    <Check size={14} />
                                                                                </IconButton>
                                                                            </TableCell>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <TableCell>
                                                                                <Typography variant="body2" fontFamily="monospace" color="info.main">
                                                                                    {loc.name}
                                                                                </Typography>
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                                                                    <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: "break-all" }}>
                                                                                        {loc.value}
                                                                                    </Typography>
                                                                                    <LocatorCopyButton value={loc.value} onCopy={() => showStatus("Copied")} />
                                                                                </Stack>
                                                                            </TableCell>
                                                                            <TableCell align="right">
                                                                                <Tooltip title="Edit">
                                                                                    <IconButton
                                                                                        size="small"
                                                                                        sx={{ color: "error.main" }}
                                                                                        onClick={() => {
                                                                                            setEditingLocator(loc);
                                                                                            setEditForm({ name: loc.name, value: loc.value });
                                                                                        }}
                                                                                    >
                                                                                        <Edit2 size={14} />
                                                                                    </IconButton>
                                                                                </Tooltip>
                                                                                <Tooltip title="AI Heal">
                                                                                    <IconButton size="small" sx={{ color: "error.main" }} onClick={() => openAiModal(loc)}>
                                                                                        <Wand2 size={14} />
                                                                                    </IconButton>
                                                                                </Tooltip>
                                                                            </TableCell>
                                                                        </>
                                                                    )}
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        </AccordionDetails>
                                    </Accordion>
                                ))}

                                {locators.length === 0 && (
                                    <Stack
                                        alignItems="center"
                                        justifyContent="center"
                                        spacing={1.5}
                                        sx={{
                                            border: "1px dashed",
                                            borderColor: "divider",
                                            borderRadius: 1,
                                            py: 10,
                                            color: "text.secondary",
                                        }}
                                    >
                                        <FileCode size={28} />
                                        <Typography variant="body2">No locators found</Typography>
                                    </Stack>
                                )}
                            </Box>
                        </>
                    ) : (
                        <Stack
                            alignItems="center"
                            justifyContent="center"
                            spacing={1.5}
                            sx={{ flex: 1, color: "text.secondary" }}
                        >
                            <MousePointer2 size={42} />
                            <Typography variant="h6">Manage Locators</Typography>
                            <Typography variant="body2">
                                Select a file from the sidebar to visualize and edit selectors.
                            </Typography>
                        </Stack>
                    )}
                </Paper>
            </Box>

            <Dialog open={aiModalOpen} onClose={() => setAiModalOpen(false)} maxWidth="lg" fullWidth>
                <DialogTitle>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Wand2 size={18} color={theme.palette.error.main} />
                            <Box>
                                <Typography variant="h6">AI Locator Assistant</Typography>
                                {aiTargetLocator && (
                                    <Typography variant="caption" color="text.secondary">
                                        Target: {aiTargetLocator.name}
                                    </Typography>
                                )}
                            </Box>
                        </Stack>
                    </Stack>
                </DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2}>
                        <Stack direction="row" spacing={1.5}>
                            <Button
                                variant="outlined"
                                fullWidth
                                onClick={(e) => setRecordingMenuAnchor(e.currentTarget)}
                                endIcon={<ChevronDown size={14} />}
                                sx={{ justifyContent: "space-between" }}
                            >
                                {selectedRecording
                                    ? recordings.find((r) => r.path === selectedRecording)?.name.replace(".py", "") ||
                                      selectedRecording
                                    : "Select recording reference..."}
                            </Button>
                            <Button
                                variant="contained"
                                color="error"
                                onClick={handleAiSuggest}
                                disabled={aiLoading || !selectedFile}
                                startIcon={aiLoading ? <RefreshCw size={14} /> : <Wand2 size={14} />}
                                sx={{
                                    minWidth: 190,
                                    height: 40,
                                    borderRadius: 1,
                                    px: 2,
                                    fontWeight: 800,
                                    fontSize: "0.75rem",
                                    letterSpacing: "0.06em",
                                    textTransform: "uppercase",
                                    boxShadow: "none",
                                    border: "1px solid",
                                    borderColor: alpha(theme.palette.error.main, 0.4),
                                    "&:hover": {
                                        boxShadow: "none",
                                        bgcolor: theme.palette.error.dark,
                                    },
                                    "&.Mui-disabled": {
                                        boxShadow: "none",
                                    },
                                }}
                            >
                                {aiLoading ? "Analyzing..." : "Generate"}
                            </Button>
                        </Stack>

                        <Menu
                            anchorEl={recordingMenuAnchor}
                            open={Boolean(recordingMenuAnchor)}
                            onClose={() => setRecordingMenuAnchor(null)}
                        >
                            <MenuItem
                                onClick={() => {
                                    setSelectedRecording("");
                                    setRecordingMenuAnchor(null);
                                }}
                            >
                                <X size={14} color={theme.palette.error.main} style={{ marginRight: 8 }} />
                                None (Clear)
                            </MenuItem>
                            {recordings.map((rec) => (
                                <MenuItem
                                    key={rec.path}
                                    selected={selectedRecording === rec.path}
                                    onClick={() => {
                                        setSelectedRecording(rec.path);
                                        setRecordingMenuAnchor(null);
                                    }}
                                >
                                    <FileCode size={14} color={theme.palette.error.main} style={{ marginRight: 8 }} />
                                    {rec.name.replace(".py", "")}
                                </MenuItem>
                            ))}
                        </Menu>

                        {aiSuggestions?.map((sug, index) => {
                            const original = locators.find(
                                (l) =>
                                    l.name === sug.locator_name &&
                                    (sug.class_name ? l.className === sug.class_name : true)
                            );
                            return (
                                <Paper key={`${sug.locator_name}-${index}`} variant="outlined" sx={{ p: 2 }}>
                                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Chip size="small" label={index + 1} />
                                            <Typography variant="subtitle2" fontFamily="monospace">
                                                {sug.locator_name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {sug.class_name}
                                            </Typography>
                                        </Stack>
                                        <Button size="small" variant="contained" onClick={() => applyAiSuggestion(sug)}>
                                            Apply Fix
                                        </Button>
                                    </Stack>
                                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="caption" color="error.main">
                                                CURRENT
                                            </Typography>
                                            <Paper variant="outlined" sx={{ p: 1, mt: 0.5, bgcolor: alpha(theme.palette.error.main, 0.06) }}>
                                                <Typography variant="body2" fontFamily="monospace" sx={{ textDecoration: "line-through", opacity: 0.75, wordBreak: "break-all" }}>
                                                    {original?.value || "N/A"}
                                                </Typography>
                                            </Paper>
                                        </Box>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="caption" color="success.main">
                                                SUGGESTED
                                            </Typography>
                                            <Paper variant="outlined" sx={{ p: 1, mt: 0.5, bgcolor: alpha(theme.palette.success.main, 0.06) }}>
                                                <Stack direction="row" spacing={1} alignItems="flex-start">
                                                    <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: "break-all", flex: 1 }}>
                                                        {sug.suggested_value}
                                                    </Typography>
                                                    <LocatorCopyButton value={sug.suggested_value} onCopy={() => showStatus("Copied")} />
                                                </Stack>
                                            </Paper>
                                        </Box>
                                    </Stack>
                                    <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                                        <Code2 size={14} color={theme.palette.error.main} />
                                        <Typography variant="caption" color="text.secondary">
                                            "{sug.reason}"
                                        </Typography>
                                    </Stack>
                                </Paper>
                            );
                        })}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAiModalOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
