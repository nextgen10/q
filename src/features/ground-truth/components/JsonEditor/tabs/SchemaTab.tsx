'use client';
import React from 'react';
import { Box, Paper, Typography, Stack, Button, AlertColor } from '@mui/material';
import Editor from '@monaco-editor/react';
import { Theme } from '@mui/material/styles';
import { FileJson, Check, Save, Wand2 } from 'lucide-react';
import { inferSchema } from '@/features/ground-truth/utils/schemaUpdates';
import { Value } from '../types';

interface SchemaTabProps {
    schemaInput: string;
    setSchemaInput: (val: string) => void;
    setSchemaData: (val: Value | null) => void;
    showNotification: (msg: string, sev: AlertColor) => void;
    showConfirm: (msg: string, onConfirm: () => void, onCancel?: () => void) => void;
    theme: Theme;
    wordWrap: boolean;
    handleSaveTemplate: () => void;
    handleSaveAsTemplate: () => void;
    parsedData: Value | null;
}

export const SchemaTab = ({
    schemaInput,
    setSchemaInput,
    setSchemaData,
    showNotification,
    showConfirm,
    theme,
    wordWrap,
    handleSaveTemplate,
    handleSaveAsTemplate,
    parsedData
}: SchemaTabProps) => {
    const handleApply = () => {
        try {
            const parsed = JSON.parse(schemaInput) as Value;
            setSchemaData(parsed);
            showNotification("Schema Template applied!", 'success');
        } catch (e) {
            showNotification("Invalid JSON in Schema Template", 'error');
        }
    };

    const handleInfer = () => {
        if (!parsedData) {
            showNotification("No JSON data available to infer from.", "warning");
            return;
        }

        showConfirm("This will overwrite your current Schema Template based on the structure of your JSON data. Continue?", () => {
            const inferred = inferSchema(parsedData);
            const inferredStr = JSON.stringify(inferred, null, 2);
            setSchemaInput(inferredStr);
            setSchemaData(inferred);
            showNotification("Schema inferred from JSON!", "success");
        });
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
                <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}><FileJson size={18} /> Schema Template</Typography>
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={handleInfer}
                        startIcon={<Wand2 size={16} />}
                        color="primary"
                    >
                        Infer from Current JSON
                    </Button>
                    <Button variant="contained" size="small" onClick={handleSaveTemplate} startIcon={<Save size={16} />}>Save</Button>
                    <Button variant="outlined" size="small" onClick={handleSaveAsTemplate} startIcon={<Save size={16} />}>Save As</Button>
                    <Button
                        variant="contained"
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
                    defaultLanguage="json"
                    value={schemaInput}
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
                    onChange={(value) => setSchemaInput(value || "")}
                />
            </Box>
        </Paper>
    );
};
