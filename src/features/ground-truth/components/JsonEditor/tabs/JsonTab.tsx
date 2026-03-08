// @ts-nocheck
'use client';
import React from 'react';
import { Box, Paper, Typography, Stack, Button, IconButton, Alert, AlertColor } from '@mui/material';
import { Theme } from '@mui/material/styles';
import Editor from '@monaco-editor/react';
import { Braces, Check, AlignLeft, WrapText, RotateCcw } from 'lucide-react';
import { validateAndSanitizeJSON, isWithinSizeLimit } from '@/features/ground-truth/utils/sanitize';
import { updateSchemaWithPaths, inferSchema } from '@/features/ground-truth/utils/schemaUpdates';
import { Value } from '../types';

interface JsonTabProps {
    jsonInput: string;
    setJsonInput: (val: string) => void;
    setParsedData: (val: Value | null) => void;
    setYamlInput: (val: string) => void;
    schemaData: Value | null;
    setSchemaData: (val: Value | null) => void;
    setSchemaInput: (val: string) => void;
    validateAgainstSchema: (data: Value, schema: Value) => { valid: boolean; errors: string[] };
    showNotification: (msg: string, sev: AlertColor) => void;
    showConfirm: (msg: string, onConfirm: () => void, onCancel?: () => void) => void;
    error: string | null;
    setError: (val: string | null) => void;
    formatJson: () => void;
    wordWrap: boolean;
    setWordWrap: (val: boolean) => void;
    theme: Theme;
    yaml: { dump: (value: Value, options?: { lineWidth?: number }) => string };
    onExportJson: () => void;
}

export const JsonTab = ({
    jsonInput,
    setJsonInput,
    setParsedData,
    setYamlInput,
    schemaData,
    setSchemaData,
    setSchemaInput,
    validateAgainstSchema,
    showNotification,
    showConfirm,
    error,
    setError,
    formatJson,
    wordWrap,
    setWordWrap,
    theme,
    yaml,
    onExportJson
}: JsonTabProps) => {

    const handleApply = () => {
        try {
            const parsed = JSON.parse(jsonInput);

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
                        // Priority 1: Handle unknown fields & structural updates
                        const msg = `The following fields are new or have changed structure (e.g., string → object):\n\n${allActionablePaths.slice(0, 10).join('\n')}${allActionablePaths.length > 10 ? '\n...' : ''}\n\nDo you want to update the Schema to match your data?`;

                        showConfirm(msg, () => {
                            const newSchema = updateSchemaWithPaths(schemaData, parsed, allActionablePaths);
                            setSchemaData(newSchema);
                            setSchemaInput(JSON.stringify(newSchema, null, 2));

                            setParsedData(parsed);
                            setJsonInput(JSON.stringify(parsed, null, 2));
                            setYamlInput(yaml.dump(parsed, { lineWidth: -1 }));
                            showNotification("Schema updated! Please SAVE your template to persist these changes.", 'success');
                        }, () => {
                            showNotification("Cancelled. Data not synced to maintain schema integrity.", 'info');
                        });
                        return;
                    } else if (otherErrors.length > 0) {
                        // Priority 2: Handle type mismatches or missing fields
                        const msg = `Validation Issues Found:\n\n${otherErrors.slice(0, 5).map((e: string) => `• ${e}`).join('\n')}${otherErrors.length > 5 ? `\n... and ${otherErrors.length - 5} more.` : ''}\n\nDo you want to sync anyway? (Note: Schema will not be updated)`;

                        showConfirm(msg, () => {
                            setParsedData(parsed);
                            setJsonInput(JSON.stringify(parsed, null, 2));
                            setYamlInput(yaml.dump(parsed, { lineWidth: -1 }));
                            showNotification("Synced with validation warnings.", 'warning');
                        });
                        return;
                    }
                }
            }

            setParsedData(parsed);
            setJsonInput(JSON.stringify(parsed, null, 2));
            setYamlInput(yaml.dump(parsed, { lineWidth: -1 }));
            showNotification("Applied and Synced successfully!", 'success');
        } catch (e) {
            showNotification("Invalid JSON: " + (e instanceof Error ? e.message : String(e)), 'error');
        }
    };

    return (
        <Paper sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}><Braces size={18} /> JSON Input</Typography>
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="contained"
                        size="small"
                        onClick={handleApply}
                        startIcon={<Check size={16} />}
                    >
                        Apply
                    </Button>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                            if (!jsonInput) return;
                            try {
                                const parsed = JSON.parse(jsonInput);
                                const inferred = inferSchema(parsed);
                                setSchemaData(inferred);
                                setSchemaInput(JSON.stringify(inferred, null, 2));
                                showNotification("Schema inferred and updated!", "success");
                            } catch (e) {
                                showNotification("Invalid JSON for inference", "error");
                            }
                        }}
                        startIcon={<Braces size={16} />}
                        color="primary"
                    >
                        Infer Schema
                    </Button>
                    <Button
                        variant={wordWrap ? "contained" : "outlined"}
                        size="small"
                        onClick={() => setWordWrap(!wordWrap)}
                        startIcon={<WrapText size={16} />}
                    >
                        Wrap
                    </Button>
                    <Button variant="outlined" size="small" onClick={formatJson} startIcon={<AlignLeft size={16} />}>Format</Button>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={onExportJson}
                        startIcon={<Braces size={16} />}
                    >
                        Export JSON
                    </Button>
                    <IconButton color="error" size="small" onClick={() => setJsonInput('{}')}><RotateCcw size={16} /></IconButton>
                </Stack>
            </Box>
            <Box sx={{ flexGrow: 1, minHeight: 320, border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                <Editor
                    height="100%"
                    defaultLanguage="json"
                    value={jsonInput}
                    theme={theme.palette.mode === 'dark' ? "vs-dark" : "light"}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        readOnly: false,
                        domReadOnly: false,
                        contextmenu: true,
                        wordWrap: wordWrap ? 'on' : 'off',
                        formatOnPaste: true,
                        formatOnType: true,
                        scrollBeyondLastLine: false,
                    }}
                    onChange={(value) => {
                        const newVal = value || "";
                        setJsonInput(newVal);
                        if (!isWithinSizeLimit(newVal)) {
                            setError("Input too large (limit 5MB)");
                            return;
                        }
                        const result = validateAndSanitizeJSON(newVal);
                        if (result.valid) {
                            setParsedData(result.data);
                            setError(null);
                        } else {
                            setError(result.error || "Invalid JSON");
                        }
                    }}
                />
            </Box>
            {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
        </Paper>
    );
};
