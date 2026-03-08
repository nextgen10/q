import React, { useEffect, useMemo, useState } from "react";
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    Grid,
    IconButton,
    InputAdornment,
    LinearProgress,
    Paper,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import {
    Clock,
    DollarSign,
    FileCode,
    Layers,
    PieChart,
    Play,
    RefreshCw,
    Save,
    Server,
    Settings,
    TrendingUp,
    Wrench,
    Zap,
} from "lucide-react";
import { StatusSnackbar } from "../UI/StatusSnackbar";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
    XAxis,
    YAxis,
} from "recharts";
import { MetricCard } from "@/components/shared/MetricCard";
import { useAuth } from "@/contexts/AuthContext";

const ASSUMPTION_FIELDS = [
    { key: "hourly_rate", label: "Hourly Rate ($/hr)", icon: DollarSign },
    { key: "maintenance_percent", label: "Maintenance Percent (%)", icon: Wrench },
    { key: "manual_exec_mins", label: "Manual Execution", icon: Play },
    { key: "infra_cost_per_hour", label: "Infrastructure Cost ($)", icon: Server },
    { key: "manual_design_mins", label: "Manual Design", icon: Layers },
    { key: "auto_design_mins", label: "Automation Design", icon: Zap },
    { key: "manual_script_mins", label: "Manual Scripting", icon: FileCode },
    { key: "auto_script_mins", label: "Automation Scripting", icon: Zap },
];

export function RoiView() {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";
    const { getAuthHeaders } = useAuth();
    const pomFetch = (input, init = {}) => {
        const headers = new Headers(init.headers || {});
        const authHeaders = getAuthHeaders();
        Object.entries(authHeaders).forEach(([key, value]) => headers.set(key, value));
        return fetch(input, { ...init, headers });
    };

    const [stats, setStats] = useState(null);
    const [settings, setSettings] = useState(null);
    const [formSettings, setFormSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState(null);

    const showStatus = (message, severity = "success") => {
        setStatus({ message, severity });
    };

    const fetchStats = async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        try {
            const res = await pomFetch("/api/playwright-pom/roi/stats");
            if (!res.ok) throw new Error(res.statusText);
            const data = await res.json();
            setStats(data);
            setSettings(data.settings || {});
            setFormSettings(data.settings || {});
        } catch (e) {
            console.error("Failed to fetch ROI stats:", e);
            showStatus("Failed to load ROI stats", "error");
        } finally {
            if (!silent) setLoading(false);
            else setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const handleSaveSettings = async () => {
        setSaving(true);
        try {
            const res = await pomFetch("/api/playwright-pom/roi/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formSettings),
            });
            if (!res.ok) throw new Error("Failed to save settings");
            setEditing(false);
            showStatus("ROI assumptions updated");
            await fetchStats(true);
        } catch (e) {
            console.error(e);
            showStatus("Failed to save ROI assumptions", "error");
        } finally {
            setSaving(false);
        }
    };

    const history = useMemo(() => stats?.history || [], [stats]);
    const automatedCost = Math.max(
        0,
        (stats?.projected_manual_cost || 0) - (stats?.total_hard_savings || 0),
    );

    const SavingsRow = ({ label, savedHours, manualHours, tone = "error" }) => {
        const percent = Math.max(0, Math.min(100, (savedHours / Math.max(manualHours || 1, 1)) * 100));
        return (
            <Box>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        {label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {savedHours?.toFixed?.(1) ?? savedHours} hrs
                    </Typography>
                </Stack>
                <LinearProgress
                    variant="determinate"
                    value={percent}
                    sx={{
                        height: 8,
                        borderRadius: 999,
                        bgcolor: alpha(theme.palette[tone].main, 0.12),
                        "& .MuiLinearProgress-bar": { bgcolor: `${tone}.main`, borderRadius: 999 },
                    }}
                />
            </Box>
        );
    };

    if (loading || !stats) {
        return (
            <Box sx={{ height: "calc(100vh - 64px)", display: "grid", placeItems: "center" }}>
                <Stack alignItems="center" spacing={1.5}>
                    <CircularProgress size={26} />
                    <Typography variant="body2" color="text.secondary">
                        Loading ROI stats...
                    </Typography>
                </Stack>
            </Box>
        );
    }

    return (
        <Box sx={{ height: "calc(100vh - 64px)", display: "flex", flexDirection: "column", overflow: "hidden", p: 2 }}>
            <StatusSnackbar status={status} onClose={() => setStatus(null)} />

            <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden", transition: "background-color 0.3s" }}>
                <Paper variant="outlined" sx={{ height: "100%", p: 1.5, display: "flex", flexDirection: "column", minHeight: 0 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pb: 0.5 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <TrendingUp size={16} color={theme.palette.error.main} />
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                ROI Dashboard
                            </Typography>
                        </Stack>
                        <IconButton
                            size="small"
                            sx={{ color: "error.main" }}
                            onClick={() => fetchStats(true)}
                            disabled={refreshing || saving}
                        >
                            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                        </IconButton>
                    </Stack>

                    <Stack spacing={1.25} sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                        <Grid container spacing={1.25}>
                            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                                <MetricCard
                                    label="Total Runs"
                                    value={stats.total_runs || 0}
                                    icon={<Play size={24} color={theme.palette.error.main} />}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                                <MetricCard
                                    label="Tests Executed"
                                    value={stats.total_tests_executed || 0}
                                    icon={<Layers size={24} color={theme.palette.error.main} />}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                                <MetricCard
                                    label="Time Saved"
                                    value={`${stats.total_savings_hours || 0} hrs`}
                                    icon={<Clock size={24} color={theme.palette.error.main} />}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                                <MetricCard
                                    label="Hard Savings"
                                    value={`$${(stats.total_hard_savings || 0).toLocaleString()}`}
                                    icon={<DollarSign size={24} color={theme.palette.error.main} />}
                                />
                            </Grid>
                        </Grid>

                        <Grid container spacing={1.25} sx={{ minHeight: 0, flex: 1 }}>
                            <Grid size={{ xs: 12, lg: 8 }}>
                                <Stack spacing={1.25}>
                                    <Paper variant="outlined" sx={{ p: 1.5 }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <TrendingUp size={16} color={theme.palette.error.main} />
                                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                                    Cumulative Savings Impact
                                                </Typography>
                                            </Stack>
                                            <Chip size="small" label="Over time" />
                                        </Stack>
                                        <Box sx={{ height: 210 }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={history}>
                                                    <defs>
                                                        <linearGradient id="roiSavings" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid
                                                        strokeDasharray="3 3"
                                                        vertical={false}
                                                        stroke={isDark ? alpha(theme.palette.common.white, 0.16) : alpha(theme.palette.common.black, 0.12)}
                                                    />
                                                    <XAxis
                                                        dataKey="timestamp"
                                                        tickFormatter={(str) =>
                                                            new Date(str).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                                                        }
                                                        stroke={theme.palette.text.secondary}
                                                        fontSize={11}
                                                    />
                                                    <YAxis stroke={theme.palette.text.secondary} fontSize={11} tickFormatter={(v) => `$${v}`} />
                                                    <RechartsTooltip
                                                        contentStyle={{
                                                            backgroundColor: theme.palette.background.paper,
                                                            borderColor: theme.palette.divider,
                                                            borderRadius: 8,
                                                        }}
                                                        formatter={(value) => [`$${value}`, "Savings"]}
                                                        labelFormatter={(label) => new Date(label).toLocaleString()}
                                                    />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="cumulative_savings"
                                                        stroke="#22c55e"
                                                        strokeWidth={2}
                                                        fillOpacity={1}
                                                        fill="url(#roiSavings)"
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </Box>
                                    </Paper>

                                    <Paper variant="outlined" sx={{ p: 1.5 }}>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                            <PieChart size={16} color={theme.palette.error.main} />
                                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                                Cost Efficiency Analysis
                                            </Typography>
                                        </Stack>
                                        <Grid container spacing={1}>
                                            <Grid size={{ xs: 12, md: 8 }}>
                                                <Box sx={{ height: 150 }}>
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart
                                                            layout="vertical"
                                                            data={[
                                                                { name: "Manual", cost: stats.projected_manual_cost || 0 },
                                                                { name: "Automation", cost: automatedCost },
                                                            ]}
                                                            barSize={14}
                                                        >
                                                            <XAxis type="number" hide />
                                                            <YAxis
                                                                dataKey="name"
                                                                type="category"
                                                                width={78}
                                                                tick={{ fontSize: 12, fill: theme.palette.text.primary }}
                                                            />
                                                            <RechartsTooltip
                                                                cursor={{ fill: "transparent" }}
                                                                formatter={(value) => [`$${Number(value).toLocaleString()}`, "Cost"]}
                                                                contentStyle={{
                                                                    backgroundColor: theme.palette.background.paper,
                                                                    borderColor: theme.palette.divider,
                                                                    borderRadius: 8,
                                                                }}
                                                            />
                                                            <Bar dataKey="cost" radius={[0, 5, 5, 0]}>
                                                                <Cell fill="#ef4444" />
                                                                <Cell fill="#22c55e" />
                                                            </Bar>
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </Box>
                                            </Grid>
                                            <Grid size={{ xs: 12, md: 4 }}>
                                                <Stack spacing={1.5} justifyContent="center" sx={{ height: "100%" }}>
                                                    <Box>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Velocity Multiplier
                                                        </Typography>
                                                        <Typography variant="h5" sx={{ fontWeight: 800, color: "error.main" }}>
                                                            {stats.velocity_multiplier || 0}x
                                                        </Typography>
                                                    </Box>
                                                    <Box>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Cost Ratio
                                                        </Typography>
                                                        <Typography variant="h5" sx={{ fontWeight: 800, color: "error.main" }}>
                                                            1:{stats.cost_savings_ratio || 0}
                                                        </Typography>
                                                    </Box>
                                                </Stack>
                                            </Grid>
                                        </Grid>
                                    </Paper>
                                </Stack>
                            </Grid>

                            <Grid size={{ xs: 12, lg: 4 }}>
                                <Stack spacing={1} sx={{ height: "100%" }}>
                                    <Paper variant="outlined" sx={{ p: 1.25 }}>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                            <Zap size={16} color={theme.palette.error.main} />
                                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                                Efficiency Gains
                                            </Typography>
                                        </Stack>
                                        <Stack spacing={1}>
                                            <SavingsRow
                                                label="Design"
                                                savedHours={stats.design_savings_hours || 0}
                                                manualHours={(stats.total_tests_executed * (settings?.manual_design_mins || 0)) / 60}
                                                tone="error"
                                            />
                                            <SavingsRow
                                                label="Scripting"
                                                savedHours={stats.script_savings_hours || 0}
                                                manualHours={(stats.total_tests_executed * (settings?.manual_script_mins || 0)) / 60}
                                                tone="error"
                                            />
                                            <SavingsRow
                                                label="Execution"
                                                savedHours={stats.exec_savings_hours || 0}
                                                manualHours={(stats.total_tests_executed * (settings?.manual_exec_mins || 0)) / 60}
                                                tone="error"
                                            />
                                        </Stack>
                                    </Paper>

                                    <Paper
                                        variant="outlined"
                                        sx={{ p: 1.25, display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}
                                    >
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                                            <Settings size={16} color={theme.palette.error.main} />
                                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                                Assumptions
                                            </Typography>
                                        </Stack>
                                        <Divider sx={{ mb: 0.75 }} />

                                        <Grid container spacing={0.75} sx={{ alignContent: "flex-start" }}>
                                            {ASSUMPTION_FIELDS.map((field) => {
                                                const Icon = field.icon;
                                                return (
                                                    <Grid key={field.key} size={{ xs: 6 }}>
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                color: "text.secondary",
                                                                fontWeight: 700,
                                                                letterSpacing: "0.03em",
                                                                fontSize: "0.64rem",
                                                                lineHeight: 1.1,
                                                            }}
                                                        >
                                                            {field.label}
                                                        </Typography>
                                                        <TextField
                                                            size="small"
                                                            type="number"
                                                            fullWidth
                                                            disabled={!editing}
                                                            value={formSettings[field.key] ?? 0}
                                                            onChange={(e) =>
                                                                setFormSettings((prev) => ({
                                                                    ...prev,
                                                                    [field.key]: Number(e.target.value),
                                                                }))
                                                            }
                                                            InputProps={{
                                                                startAdornment: (
                                                                    <InputAdornment position="start">
                                                                        <Icon size={13} color={theme.palette.error.main} />
                                                                    </InputAdornment>
                                                                ),
                                                            }}
                                                            sx={{
                                                                mt: 0.25,
                                                                "& .MuiInputBase-root": { height: 30 },
                                                                "& .MuiInputBase-input": { fontSize: "0.76rem", py: 0.5 },
                                                            }}
                                                        />
                                                    </Grid>
                                                );
                                            })}
                                        </Grid>

                                        <Box sx={{ mt: 1.25, display: "flex", justifyContent: "flex-end" }}>
                                            {editing ? (
                                                <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
                                                    <Button
                                                        fullWidth
                                                        size="small"
                                                        variant="outlined"
                                                        color="inherit"
                                                        onClick={() => {
                                                            setEditing(false);
                                                            setFormSettings(settings || {});
                                                        }}
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        fullWidth
                                                        size="small"
                                                        variant="contained"
                                                        color="error"
                                                        disabled={saving}
                                                        onClick={handleSaveSettings}
                                                        startIcon={<Save size={14} />}
                                                    >
                                                        {saving ? "Saving..." : "Save"}
                                                    </Button>
                                                </Stack>
                                            ) : (
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    color="error"
                                                    onClick={() => setEditing(true)}
                                                    sx={{ minWidth: 128 }}
                                                >
                                                    Adjust Drivers
                                                </Button>
                                            )}
                                        </Box>
                                    </Paper>
                                </Stack>
                            </Grid>
                        </Grid>
                    </Stack>
                </Paper>
            </Box>
        </Box>
    );
}
