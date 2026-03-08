'use client';
import React from 'react';
import { Box, Paper, Typography, Stack, Button, AlertColor } from '@mui/material';
import Editor from '@monaco-editor/react';
import { Theme } from '@mui/material/styles';
import { AlignLeft, Check } from 'lucide-react';
import yaml from 'js-yaml';
import { updateSchemaWithPaths } from '@/features/ground-truth/utils/schemaUpdates';
import { Value } from '../types';

interface YamlTabProps {
    yamlInput: string;
    setYamlInput: (val: string) => void;
    setJsonInput: (val: string) => void;
    setParsedData: (val: Value | null) => void;
    showNotification: (msg: string, sev: AlertColor) => void;
    showConfirm: (msg: string, onConfirm: () => void, onCancel?: () => void) => void;
    validateAgainstSchema: (data: Value, schema: Value) => { valid: boolean; errors: string[] };
    schemaData: Value | null;
    setSchemaData: (val: Value | null) => void;
    setSchemaInput: (val: string) => void;
    theme: Theme;
    wordWrap: boolean;
}

export const YamlTab = ({
    yamlInput,
    setYamlInput,
    setJsonInput,
    setParsedData,
    showNotification,
    showConfirm,
    validateAgainstSchema,
    schemaData,
    setSchemaData,
    setSchemaInput,
    theme,
    wordWrap
}: YamlTabProps) => {
    const handleApply = () => {
        try {
            const parsed = yaml.load(yamlInput) as Value;

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

                            setParsedData(parsed);
                            setJsonInput(JSON.stringify(parsed, null, 2));
                            setYamlInput(yaml.dump(parsed, { lineWidth: -1 }));
                            showNotification("Schema updated! Please SAVE your template to persist these changes.", 'success');
                        }, () => {
                            showNotification("Cancelled. Data not synced to maintain schema integrity.", 'info');
                        });
                        return;
                    } else if (otherErrors.length > 0) {
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
            showNotification("Invalid YAML: " + (e instanceof Error ? e.message : String(e)), 'error');
        }
    };

    return (
        <Paper sx={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            p: 2,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider'
        }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
                    <AlignLeft size={18} /> YAML Editor
                </Typography>
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        onClick={handleApply}
                        startIcon={<Check size={16} />}
                    >
                        Apply
                    </Button>
                </Stack>
            </Box>
            <Box sx={{ flexGrow: 1, minHeight: 320, border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                <Editor
                    height="100%"
                    defaultLanguage="yaml"
                    value={yamlInput}
                    theme={theme.palette.mode === 'dark' ? "vs-dark" : "light"}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        readOnly: false,
                        domReadOnly: false,
                        contextmenu: true,
                        wordWrap: wordWrap ? 'on' : 'off',
                        scrollBeyondLastLine: false,
                    }}
                    onChange={(value) => setYamlInput(value || "")}
                />
            </Box>
        </Paper>
    );
};
