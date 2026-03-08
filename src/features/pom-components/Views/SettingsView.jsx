import React, { useState, useEffect } from 'react';
import { Box, Button, Chip, CircularProgress, FormControlLabel, Grid, IconButton, InputAdornment, MenuItem, Paper, Stack, Switch, TextField, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Plus, RefreshCw, Save, Settings2, Trash2, X } from 'lucide-react';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { StatusSnackbar } from '../UI/StatusSnackbar';

export function SettingsView() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState(null); // { message, severity }
    const [newMarker, setNewMarker] = useState("");
    const [sharedData, setSharedData] = useState({});
    const [newDataKey, setNewDataKey] = useState("");
    const [newDataValue, setNewDataValue] = useState("");
    const [dataLoading, setDataLoading] = useState(false);

    const [settings, setSettings] = useState({
        base_url: "",
        browser_type: "chromium",
        headless: false,
        timeout: 30000,
        slow_mo: 0,
        viewport_width: 1280,
        viewport_height: 720,
        markers: ["smoke", "regression", "sanity", "e2e"]
    });

    useEffect(() => {
        fetchSettings();
        fetchSharedData();
    }, []);

    const fetchSharedData = async () => {
        setDataLoading(true);
        try {
            const res = await fetch('/api/playwright-pom/data/shared');
            const data = await res.json();
            setSharedData(data);
        } catch (error) {
            console.error('Failed to fetch shared data:', error);
        } finally {
            setDataLoading(false);
        }
    };

    const saveSharedData = async (updatedData) => {
        try {
            const res = await fetch('/api/playwright-pom/data/shared', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData || sharedData)
            });
            if (!res.ok) throw new Error('Failed to save shared data');
            showStatus("Shared data saved", "success");
        } catch (error) {
            showStatus("Failed to save data", "error");
        }
    };

    const fetchSettings = async () => {
        try {
            const response = await fetch('/api/playwright-pom/settings');
            if (!response.ok) throw new Error('Failed to fetch settings');
            const data = await response.json();
            setSettings(data);
        } catch (error) {
            console.error('Failed to fetch settings:', error);
            showStatus("Failed to load settings", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await fetch('/api/playwright-pom/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to save settings');
            }

            showStatus("Configuration saved successfully", "success");
        } catch (error) {
            console.error('Failed to save settings:', error);
            showStatus("Failed to save configuration: " + error.message, "error");
        } finally {
            setSaving(false);
        }
    };

    const addMarker = (marker) => {
        const sanitized = marker.trim().toLowerCase().replace(/\s+/g, '_');
        if (!sanitized || settings.markers.includes(sanitized)) return;
        setSettings(prev => ({ ...prev, markers: [...prev.markers, sanitized] }));
    };

    const removeMarker = (marker) => {
        setSettings(prev => ({ ...prev, markers: prev.markers.filter(m => m !== marker) }));
    };

    const showStatus = (msg, severity) => {
        setStatus({ message: msg, severity: severity });
        setTimeout(() => setStatus(null), 4000);
    };

    const updateSetting = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleRefreshAll = async () => {
        setLoading(true);
        await Promise.all([fetchSettings(), fetchSharedData()]);
        showStatus("Configuration reloaded", "success");
    };

    const handleAddMarker = () => {
        const sanitized = newMarker.trim().toLowerCase().replace(/\s+/g, '_');
        if (!sanitized) {
            showStatus("Enter a valid marker name", "error");
            return;
        }
        if (settings.markers.includes(sanitized)) {
            showStatus("Marker already exists", "error");
            return;
        }
        addMarker(newMarker);
        setNewMarker('');
        showStatus("Marker added", "success");
    };

    const handleRemoveDataGroup = (groupKey) => {
        const newData = { ...sharedData };
        delete newData[groupKey];
        setSharedData(newData);
        saveSharedData(newData);
    };

    const handleRemoveDataValue = (groupKey, valueToRemove) => {
        const existing = Array.isArray(sharedData[groupKey]) ? sharedData[groupKey] : [];
        const nextValues = existing.filter((v) => v !== valueToRemove);
        const newData = { ...sharedData };
        if (nextValues.length === 0) {
            delete newData[groupKey];
        } else {
            newData[groupKey] = nextValues;
        }
        setSharedData(newData);
        saveSharedData(newData);
    };

    const handleAddSharedData = () => {
        if (!newDataKey.trim() || !newDataValue.trim()) {
            showStatus("Both key and value are required", "error");
            return;
        }
        const key = newDataKey.trim();
        const val = newDataValue.trim();
        const newData = { ...sharedData };
        if (!Array.isArray(newData[key])) newData[key] = [];
        if (newData[key].includes(val)) {
            showStatus("This value already exists for the key", "error");
            return;
        }
        newData[key].push(val);
        setSharedData(newData);
        setNewDataKey("");
        setNewDataValue("");
        saveSharedData(newData);
    };

    const addIconButtonSx = {
        minWidth: 36,
        width: 36,
        height: 32,
        p: 0,
    };
    const sectionHeaderSx = { mb: 2 };
    const subsectionTitleSx = { mb: 0.75, fontSize: '0.75rem', color: 'text.secondary', fontWeight: 600 };

    const InfoIconWithHover = (props) => (
        <InfoOutlinedIcon
            {...props}
            sx={{
                color: 'text.disabled',
                cursor: 'pointer',
                fontSize: 'medium',
                ...props.sx
            }}
        />
    );



    return (
        <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 2 }}>
            
            <StatusSnackbar status={status} onClose={() => setStatus(null)} />


            <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', transition: 'background-color 0.3s' }}>
                <Box sx={{ display: 'flex', gap: 2, height: '100%', minHeight: 0 }}>
                    <Paper
                        variant="outlined"
                        className="custom-scrollbar"
                        sx={{ width: '100%', p: 2, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}
                    >
                    <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ pb: 1, mt: -0.5 }}
                    >
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Settings2 size={16} color={theme.palette.error.main} />
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Configuration</Typography>
                        </Stack>
                        <IconButton
                            size="small"
                            sx={{ color: 'error.main' }}
                            aria-label="Refresh configuration"
                            onClick={handleRefreshAll}
                            disabled={loading || dataLoading || saving}
                        >
                            <RefreshCw size={14} />
                        </IconButton>
                    </Stack>
                    <Stack className="custom-scrollbar" spacing={2} sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                        <Paper variant="outlined" sx={{ p: 2.5 }}>
                            <Stack direction="row" spacing={1} alignItems="center" sx={sectionHeaderSx}>
                                <Box sx={{ width: 4, height: 20, bgcolor: 'error.main', borderRadius: 1 }} />
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>General Controls</Typography>
                            </Stack>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12 }}>
                                    <Typography variant="subtitle2" sx={subsectionTitleSx}>Environment Details</Typography>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Base URL"
                                        value={settings.base_url}
                                        onChange={(e) => updateSetting('base_url', e.target.value)}
                                        placeholder="https://example.com"
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <Tooltip title="Base URL for application under test" arrow>
                                                        <InfoIconWithHover />
                                                    </Tooltip>
                                                </InputAdornment>
                                            )
                                        }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <Typography variant="subtitle2" sx={subsectionTitleSx}>Timing Parameters</Typography>
                                    <Grid container spacing={2}>
                                        <Grid size={{ xs: 12, md: 4 }}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                label="Timeout (ms)"
                                                type="number"
                                                value={settings.timeout}
                                                onChange={(e) => updateSetting('timeout', parseInt(e.target.value) || 0)}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 4 }}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                label="Slow Motion (ms)"
                                                type="number"
                                                value={settings.slow_mo}
                                                onChange={(e) => updateSetting('slow_mo', parseInt(e.target.value) || 0)}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 4 }}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                label="Default Workers"
                                                type="number"
                                                value={settings.default_parallel_workers || 4}
                                                onChange={(e) => updateSetting('default_parallel_workers', parseInt(e.target.value) || 1)}
                                            />
                                        </Grid>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Paper>

                        <Paper variant="outlined" sx={{ p: 2.5 }}>
                            <Stack direction="row" spacing={1} alignItems="center" sx={sectionHeaderSx}>
                                <Box sx={{ width: 4, height: 20, bgcolor: 'error.main', borderRadius: 1 }} />
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Browser Controls</Typography>
                            </Stack>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12 }}>
                                    <Typography variant="subtitle2" sx={subsectionTitleSx}>Execution Engine</Typography>
                                    <TextField select fullWidth size="small" label="Browser Type" value={settings.browser_type} onChange={(e) => updateSetting('browser_type', e.target.value)}>
                                        <MenuItem value="chromium">Chromium</MenuItem>
                                        <MenuItem value="firefox">Firefox</MenuItem>
                                    </TextField>
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <Typography variant="subtitle2" sx={subsectionTitleSx}>Viewport & Visibility</Typography>
                                    <Box sx={{ mb: 1 }}>
                                        <FormControlLabel
                                            control={<Switch checked={settings.headless} onChange={(e) => updateSetting('headless', e.target.checked)} />}
                                            label={<Typography variant="body2">Headless Mode</Typography>}
                                        />
                                    </Box>
                                    <Grid container spacing={2}>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                label="Width"
                                                type="number"
                                                value={settings.viewport_width}
                                                onChange={(e) => updateSetting('viewport_width', parseInt(e.target.value) || 0)}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                label="Height"
                                                type="number"
                                                value={settings.viewport_height}
                                                onChange={(e) => updateSetting('viewport_height', parseInt(e.target.value) || 0)}
                                            />
                                        </Grid>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Paper>

                        <Paper variant="outlined" sx={{ p: 2.5 }}>
                            <Stack direction="row" spacing={1} alignItems="center" sx={sectionHeaderSx}>
                                <Box sx={{ width: 4, height: 20, bgcolor: 'warning.main', borderRadius: 1 }} />
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Markers & Global Data</Typography>
                            </Stack>

                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Playwright Markers</Typography>
                                <Chip size="small" label={settings.markers.length} />
                            </Stack>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                                {settings.markers.map((marker) => (
                                    <Chip
                                        key={marker}
                                        size="small"
                                        label={marker}
                                        onDelete={() => removeMarker(marker)}
                                        deleteIcon={<X size={14} />}
                                        sx={{
                                            bgcolor: alpha(theme.palette.warning.main, 0.1),
                                            color: 'warning.main',
                                            border: '1px solid',
                                            borderColor: alpha(theme.palette.warning.main, 0.35),
                                            '& .MuiChip-label': { fontWeight: 700 },
                                        }}
                                    />
                                ))}
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="New marker (max 30 chars)"
                                    value={newMarker}
                                    onChange={(e) => setNewMarker(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                                    inputProps={{ maxLength: 30 }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleAddMarker();
                                    }}
                                />
                                <Button
                                    variant="contained"
                                    color="error"
                                    size="small"
                                    aria-label="Add marker"
                                    onClick={handleAddMarker}
                                    disabled={!newMarker.trim()}
                                    sx={addIconButtonSx}
                                >
                                    <Plus size={14} />
                                </Button>
                            </Box>

                            <Box sx={{ borderTop: '1px dashed', borderColor: 'divider', pt: 2 }}>
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Global Data Repository</Typography>
                                    <Chip size="small" label={Object.keys(sharedData).length} />
                                </Stack>
                                <Typography variant="caption" color="text.secondary">
                                    Manage persistent data used across Shared Flows and Tests.
                                </Typography>

                                <Stack className="custom-scrollbar" spacing={1.25} sx={{ maxHeight: 220, overflowY: 'auto', mt: 1.5, pr: 0.5 }}>
                                    {dataLoading && Object.keys(sharedData).length === 0 && (
                                        <Stack alignItems="center" justifyContent="center" sx={{ py: 2 }}>
                                            <CircularProgress size={20} />
                                        </Stack>
                                    )}
                                    {Object.keys(sharedData).length === 0 ? (
                                        <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.disabled', p: 1 }}>No global data defined.</Typography>
                                    ) : (
                                        Object.entries(sharedData).map(([key, values]) => (
                                            <Paper key={key} variant="outlined" sx={{ p: 1.25, bgcolor: isDark ? alpha(theme.palette.common.black, 0.2) : 'background.paper' }}>
                                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main', fontFamily: 'monospace' }}>{key}</Typography>
                                                    <IconButton size="small" color="error" onClick={() => handleRemoveDataGroup(key)}>
                                                        <Trash2 size={14} />
                                                    </IconButton>
                                                </Stack>
                                                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                                    {(Array.isArray(values) ? values : []).map((v, i) => (
                                                        <Chip key={i} size="small" label={v} variant="outlined" onDelete={() => handleRemoveDataValue(key, v)} />
                                                    ))}
                                                </Stack>
                                            </Paper>
                                        ))
                                    )}
                                </Stack>

                                <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px dashed', borderColor: 'divider', display: 'flex', gap: 1.5, alignItems: 'center' }}>
                                    <TextField
                                        size="small"
                                        placeholder="Key (e.g. usernames)"
                                        value={newDataKey}
                                        onChange={(e) => setNewDataKey(e.target.value)}
                                        sx={{ flex: 1 }}
                                    />
                                    <TextField
                                        size="small"
                                        placeholder="Value (e.g. admin)"
                                        value={newDataValue}
                                        onChange={(e) => setNewDataValue(e.target.value)}
                                        sx={{ flex: 1 }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleAddSharedData();
                                        }}
                                    />
                                    <Button
                                        variant="contained"
                                        color="error"
                                        size="small"
                                        aria-label="Add shared data"
                                        onClick={handleAddSharedData}
                                        disabled={!newDataKey.trim() || !newDataValue.trim()}
                                        sx={addIconButtonSx}
                                    >
                                        <Plus size={14} />
                                    </Button>
                                </Box>
                            </Box>
                        </Paper>
                    </Stack>
                    <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                            Remember to save after changing execution settings.
                        </Typography>
                        <Button variant="contained" color="error" size="small" onClick={handleSave} disabled={saving || loading} startIcon={<Save size={14} />}>
                            {saving ? 'Saving...' : 'Save'}
                        </Button>
                    </Box>
                    </Paper>
                </Box>

            </Box>


        </Box>
    );
}
