// @ts-nocheck
'use client';
import React from 'react';
import { Box, Paper, Typography, Stack, Button, TextField, Alert, IconButton, InputAdornment, AlertColor } from '@mui/material';
import { Layout as LayoutIcon, Check, Plus, Minus, Search, AlertCircle, X } from 'lucide-react';
import { DynamicField } from '../DynamicField';
import { Value } from '../types';
import { updateSchemaWithPaths } from '@/features/ground-truth/utils/schemaUpdates';

interface FormTabProps {
    parsedData: Value | null;
    handleFormChange: (path: (string | number)[], newValue: Value) => void;
    handleFormRemove: (path: (string | number)[]) => void;
    forceExpandState: boolean | null;
    setForceExpandState: (val: boolean | null) => void;
    highlightedPath: (string | number)[] | null;
    setHighlightedPath: (path: (string | number)[] | null) => void;
    schemaData: Value | null;
    setSchemaData: (val: Value | null) => void;
    setSchemaInput: (val: string) => void;
    setJsonInput: (val: string) => void;
    setYamlInput: (val: string) => void;
    showNotification: (msg: string, sev: AlertColor) => void;
    showConfirm: (msg: string, onConfirm: () => void, onCancel?: () => void) => void;
    yaml: { dump: (value: Value, options?: { lineWidth?: number }) => string };
    error: string | null;
    validateAgainstSchema: (data: Value, schema: Value) => { valid: boolean; errors: string[] };
    jsonInput: string;
}

export const FormTab = ({
    parsedData,
    handleFormChange,
    handleFormRemove,
    forceExpandState,
    setForceExpandState,
    highlightedPath,
    setHighlightedPath,
    schemaData,
    setSchemaData,
    setSchemaInput,
    setJsonInput,
    setYamlInput,
    showNotification,
    showConfirm,
    yaml,
    error,
    validateAgainstSchema,
    jsonInput
}: FormTabProps) => {
    const [searchQuery, setSearchQuery] = React.useState("");

    const handleApply = () => {
        try {
            const parsed = parsedData; // It's already parsed
            if (!parsed) return;

            // VALIDATION: Check for issues against Schema
            if (schemaData) {
                const result = validateAgainstSchema(parsed, schemaData);

                if (!result.valid) {
                    const unknownPaths = result.errors
                        .filter((e: string) => e.includes("Unknown field"))
                        .map((e: string) => e.split(":")[0].trim());

                    // Also capture type mismatches (e.g., string → number) as candidates for schema update
                    const typeMismatchPaths = result.errors
                        .filter((e: string) => e.includes("Expected") && e.includes("got"))
                        .map((e: string) => e.split(":")[0].trim());

                    // Merge unique paths
                    const allActionablePaths = Array.from(new Set([...unknownPaths, ...typeMismatchPaths]));

                    const otherErrors = result.errors.filter((e: string) => {
                        return !e.includes("Unknown field") &&
                            !allActionablePaths.some(path => e.startsWith(`${path}:`));
                    });

                    if (allActionablePaths.length > 0) {
                        const msg = `The following fields are new or have changed structure (e.g., string → object):\n\n${allActionablePaths.slice(0, 10).join('\n')}${allActionablePaths.length > 10 ? '\n...' : ''}\n\nDo you want to update the Schema to match your data?`;

                        showConfirm(msg, () => {
                            const newSchema = updateSchemaWithPaths(schemaData, parsed, allActionablePaths);
                            setSchemaData(newSchema);
                            setSchemaInput(JSON.stringify(newSchema, null, 2));
                            showNotification("Schema updated! Please SAVE your template to persist these changes.", 'success');
                            syncTextInputs(parsed);
                        }, () => {
                            showNotification("Cancelled. Data not updated.", 'info');
                        });
                        return;
                    } else if (otherErrors.length > 0) {
                        const msg = `Validation Issues Found:\n\n${otherErrors.slice(0, 5).map((e: string) => `• ${e}`).join('\n')}${otherErrors.length > 5 ? `\n... and ${otherErrors.length - 5} more.` : ''}\n\nDo you want to sync anyway? (Note: Schema will not be updated)`;

                        showConfirm(msg, () => {
                            syncTextInputs(parsed);
                            showNotification("Synced with validation warnings.", 'warning');
                        });
                        return;
                    }
                }
            }

            syncTextInputs(parsed);
            showNotification("Applied and Synced successfully!", 'success');
        } catch (e) {
            showNotification("Error: " + (e instanceof Error ? e.message : String(e)), 'error');
        }
    };

    const syncTextInputs = (data: Value) => {
        const jsonStr = JSON.stringify(data, null, 2);
        setJsonInput(jsonStr);
        setYamlInput(yaml.dump(data, { lineWidth: -1 }));
    };

    const handleSchemaUpdate = React.useCallback((updatedSchema: Value | null) => {
        setSchemaData(updatedSchema);
        setSchemaInput(JSON.stringify(updatedSchema, null, 2));
    }, [setSchemaData, setSchemaInput]);

    // Calculate dynamic expansion limit
    const lineCount = React.useMemo(() => jsonInput ? jsonInput.split('\n').length : 0, [jsonInput]);
    let maxExpandDepth = Infinity;
    if (lineCount > 2000) maxExpandDepth = 4;
    else if (lineCount > 1000) maxExpandDepth = 6;

    return (
        <Paper sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}><LayoutIcon size={18} /> Generated Form</Typography>
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="contained"
                        size="small"
                        onClick={handleApply}
                        startIcon={<Check size={16} />}
                    >
                        Apply
                    </Button>
                    <Button variant="outlined" size="small" onClick={() => {
                        setForceExpandState(true);
                        const limitText = maxExpandDepth === Infinity ? "Unlimited" : `${maxExpandDepth} levels`;
                        showNotification(`Expanding... (Limit: ${limitText}, Lines: ${lineCount})`, "info");
                    }} startIcon={<Plus size={14} />}>Expand All</Button>
                    <Button variant="outlined" size="small" onClick={() => setForceExpandState(false)} startIcon={<Minus size={14} />}>Collapse All</Button>
                    <TextField
                        id="form-search-field"
                        size="small"
                        placeholder="Search fields..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        sx={{ width: 220 }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search size={14} />
                                </InputAdornment>
                            ),
                            endAdornment: searchQuery ? (
                                <IconButton size="small" onClick={() => setSearchQuery("")}>
                                    <X size={14} />
                                </IconButton>
                            ) : null
                        }}
                    />
                </Stack>
            </Box>
            {error && <Alert severity="error" sx={{ mb: 1 }}>Invalid JSON</Alert>}

            <Box sx={{ flexGrow: 1, minHeight: 320, overflowY: 'auto', p: 1 }}>
                {parsedData === null ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 8, opacity: 0.5 }}>
                        <AlertCircle size={48} />
                        <Typography variant="subtitle2" sx={{ mt: 2, fontWeight: 700 }}>No Data</Typography>
                        <Typography variant="body2">Enter valid JSON to see the form.</Typography>
                    </Box>
                ) : (
                    <Box>
                        {typeof parsedData === 'object' && parsedData !== null && !Array.isArray(parsedData) ? (
                            // Merge keys from schema and data to ensure all schema fields are shown
                            Array.from(new Set([
                                ...Object.keys(schemaData || {}),
                                ...Object.keys(parsedData || {})
                            ])).map((key) => {
                                const val = (parsedData as Record<string, Value>)[key];
                                return (
                                    <DynamicField
                                        key={key}
                                        label={key}
                                        value={val === undefined ? (schemaData?.[key] ?? null) : val}
                                        path={[key]}
                                        onChange={handleFormChange}
                                        onRemove={handleFormRemove}
                                        forceExpandState={forceExpandState}
                                        highlightedPath={highlightedPath}
                                        setHighlightedPath={setHighlightedPath}
                                        schemaData={schemaData}
                                        onSchemaUpdate={handleSchemaUpdate}
                                        maxExpandDepth={maxExpandDepth}
                                        lockedStructure={true}
                                        searchQuery={searchQuery}
                                    />
                                );
                            })
                        ) : Array.isArray(parsedData) ? (
                            <DynamicField
                                label="Root Array"
                                value={parsedData}
                                path={[]}
                                onChange={handleFormChange}
                                forceExpandState={forceExpandState}
                                highlightedPath={highlightedPath}
                                setHighlightedPath={setHighlightedPath}
                                schemaData={schemaData}
                                onSchemaUpdate={handleSchemaUpdate}
                                hideHeader
                                maxExpandDepth={maxExpandDepth}
                                lockedStructure={true}
                                searchQuery={searchQuery}
                            />
                        ) : null}
                    </Box>
                )}
            </Box>
        </Paper>
    );
};
