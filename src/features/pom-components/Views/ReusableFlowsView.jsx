import React, { useEffect, useState } from "react";
import {
    Box,
    Chip,
    CircularProgress,
    IconButton,
    Paper,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { ChevronDown, ChevronRight, FileCode, Layers, RefreshCw, Rocket, Sparkles } from "lucide-react";
import { StatusSnackbar } from "../UI/StatusSnackbar";

export function ReusableFlowsView() {
    const theme = useTheme();
    const [sharedFlows, setSharedFlows] = useState([]);
    const [loadingFlows, setLoadingFlows] = useState(false);
    const [status, setStatus] = useState(null);
    const [expandedFlowCodes, setExpandedFlowCodes] = useState({});

    const fetchSharedFlows = async () => {
        try {
            setLoadingFlows(true);
            const res = await fetch("/api/playwright-pom/shared-flows");
            const data = await res.json();
            setSharedFlows(data.flows || []);
        } catch (err) {
            console.error("Failed to fetch shared flows:", err);
            setSharedFlows([]);
            setStatus({ message: "Failed to fetch reusable flows", severity: "error" });
        } finally {
            setLoadingFlows(false);
        }
    };

    useEffect(() => {
        fetchSharedFlows();
    }, []);

    const toggleCode = (flowName) => {
        setExpandedFlowCodes((prev) => ({ ...prev, [flowName]: !prev[flowName] }));
    };

    return (
        <Box sx={{ height: "calc(100vh - 64px)", display: "flex", flexDirection: "column", overflow: "hidden", p: 2 }}>
            <StatusSnackbar status={status} onClose={() => setStatus(null)} />

            <Paper
                variant="outlined"
                sx={{ flex: 1, minHeight: 0, p: 2, display: "flex", flexDirection: "column", overflow: "hidden" }}
            >
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pb: 1.25 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Sparkles size={16} color={theme.palette.error.main} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            Reusable Flow Library
                        </Typography>
                    </Stack>
                    <Tooltip title="Refresh flows">
                        <IconButton size="small" sx={{ color: "error.main" }} onClick={fetchSharedFlows}>
                            <RefreshCw size={14} className={loadingFlows ? "animate-spin" : ""} />
                        </IconButton>
                    </Tooltip>
                </Stack>

                <Stack className="custom-scrollbar" spacing={1.25} sx={{ flex: 1, minHeight: 0, overflowY: "auto", pr: 0.5 }}>
                    {loadingFlows && sharedFlows.length === 0 ? (
                        <Stack alignItems="center" justifyContent="center" spacing={1.25} sx={{ height: "100%", color: "text.secondary" }}>
                            <CircularProgress size={24} />
                            <Typography variant="body2">Loading reusable flows...</Typography>
                        </Stack>
                    ) : sharedFlows.length === 0 ? (
                        <Stack alignItems="center" justifyContent="center" spacing={1.25} sx={{ height: "100%", color: "text.secondary" }}>
                            <Layers size={24} />
                            <Typography variant="body2">No shared flows found.</Typography>
                        </Stack>
                    ) : (
                        sharedFlows.map((flow) => (
                            <Paper
                                key={flow.name}
                                variant="outlined"
                                sx={{
                                    p: 1.5,
                                    transition: "all 0.2s ease",
                                    "&:hover": {
                                        borderColor: alpha(theme.palette.error.main, 0.45),
                                        bgcolor: alpha(theme.palette.error.main, 0.03),
                                    },
                                }}
                            >
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "error.main" }} />
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                            {flow.name}
                                        </Typography>
                                    </Stack>
                                    <Stack direction="row" spacing={0.25} alignItems="center">
                                        {flow.code && (
                                            <Tooltip title={expandedFlowCodes[flow.name] ? "Hide code" : "Show code"}>
                                                <IconButton
                                                    size="small"
                                                    sx={{ color: "error.main" }}
                                                    onClick={() => toggleCode(flow.name)}
                                                >
                                                    {expandedFlowCodes[flow.name] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        <Rocket size={13} color={theme.palette.error.main} />
                                    </Stack>
                                </Stack>

                                <Typography variant="body2" color="text.secondary" sx={{ mb: flow.parameters?.length ? 1 : 0 }}>
                                    {flow.description}
                                </Typography>

                                {flow.parameters?.length > 0 && (
                                    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                                        {flow.parameters.map((p) => (
                                            <Chip
                                                key={p}
                                                size="small"
                                                label={p}
                                                sx={{
                                                    fontFamily: "monospace",
                                                    bgcolor: alpha(theme.palette.error.main, 0.08),
                                                    color: "error.main",
                                                    border: "1px solid",
                                                    borderColor: alpha(theme.palette.error.main, 0.18),
                                                }}
                                            />
                                        ))}
                                    </Stack>
                                )}

                                {flow.code && expandedFlowCodes[flow.name] && (
                                    <Box
                                        sx={{
                                            mt: 1,
                                            p: 1.25,
                                            borderRadius: 1,
                                            border: "1px solid",
                                            borderColor: alpha(theme.palette.error.main, 0.18),
                                            bgcolor: alpha(theme.palette.error.main, 0.03),
                                        }}
                                    >
                                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.75, color: "error.main" }}>
                                            <FileCode size={14} />
                                            <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                                                Flow Code
                                            </Typography>
                                        </Stack>
                                        <Box
                                            component="pre"
                                            sx={{
                                                m: 0,
                                                p: 1,
                                                borderRadius: 1,
                                                border: "1px solid",
                                                borderColor: "divider",
                                                bgcolor: theme.palette.mode === "dark" ? alpha("#000", 0.35) : "#fff",
                                                color: "text.primary",
                                                whiteSpace: "pre-wrap",
                                                wordBreak: "break-word",
                                                fontFamily: "monospace",
                                                fontSize: "0.75rem",
                                                lineHeight: 1.45,
                                                maxHeight: 260,
                                                overflowY: "auto",
                                            }}
                                        >
                                            {flow.code}
                                        </Box>
                                    </Box>
                                )}
                            </Paper>
                        ))
                    )}
                </Stack>
            </Paper>
        </Box>
    );
}
