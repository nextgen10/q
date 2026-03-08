// @ts-nocheck
'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { validateAgainstSchema } from '@/features/ground-truth/utils/schemaValidator';
import {
    Box, Paper, TextField, Button, Typography, Tabs, Tab,
    IconButton, Stack, Dialog, DialogTitle, DialogContent, DialogActions,
    Autocomplete, Switch, Tooltip
} from '@mui/material';
import { useLiveQuery } from 'dexie-react-hooks';
import { getScopedGroundTruthDb, migrateLegacyTemplatesToScope } from '../../db';
import {
    Trash2, Braces, AlertCircle, AlignLeft,
    Download, Upload, Layout as LayoutIcon, FileJson, Undo, Redo,
    FileSpreadsheet, FileCode2, Lock
} from 'lucide-react';
import { useTheme } from '@mui/material/styles';
import { saveAs } from 'file-saver';
import yaml from 'js-yaml';
import { Value, Template } from './types';
import { setValue, removeValue } from './utils';
import { handleExportExcel, handleImportExcel } from './excelUtils';
import { handleExportHtml, handleImportHtml } from './htmlUtils';
import { JsonTab } from './tabs/JsonTab';
import { YamlTab } from './tabs/YamlTab';
import { SchemaTab } from './tabs/SchemaTab';
import { FormTab } from './tabs/FormTab';
import { useNotification } from '@/features/ground-truth/components/Notifications/NotificationProvider';
import { LoadingOverlay } from '@/features/ground-truth/components/Loading/LoadingOverlay';
import { useHistory } from '@/features/ground-truth/hooks/useHistory';
import { validateAndSanitizeJSON, isWithinSizeLimit } from '@/features/ground-truth/utils/sanitize';
import { useAuth } from '@/contexts/AuthContext';

export default function JsonEditor() {
    // Hooks for notifications and loading
    const { showNotification, showConfirm, showConfirmAsync } = useNotification();
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');

    const [jsonInput, setJsonInput] = useState<string>('{\n  "title": "My Awesome Form",\n  "isActive": true,\n  "count": 42,\n  "tags": ["hero", "dark-mode", "react"],\n  "author": {\n    "name": "Jane Doe",\n    "email": "jane@example.com"\n  },\n  "features": [\n    { "id": 1, "name": "Login" },\n    { "id": 2, "name": "Dashboard" }\n  ]\n}');
    const {
        state: parsedData,
        set: setParsedData,
        undo,
        redo,
        canUndo,
        canRedo,
    } = useHistory<Value | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [wordWrap, setWordWrap] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<'json' | 'form' | 'yaml' | 'schema'>('json');
    const [yamlInput, setYamlInput] = useState<string>('');
    const [forceExpandState, setForceExpandState] = useState<boolean | null>(null);
    const [highlightedPath, setHighlightedPath] = useState<(string | number)[] | null>(null);
    const [lockExcel, setLockExcel] = useState<boolean>(false);
    const [navbarMenuHost, setNavbarMenuHost] = useState<HTMLElement | null>(null);

    // Schema State
    const [schemaInput, setSchemaInput] = useState<string>('{}');
    const [schemaData, setSchemaData] = useState<Value | null>(null);

    // Save Modal State
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [tempTemplateName, setTempTemplateName] = useState("");
    const [saveMode, setSaveMode] = useState<'save' | 'saveAs'>('save');

    // Template Library State (IndexedDB)
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

    const theme = useTheme();
    const { session } = useAuth();
    const appScope = session?.app_id || 'anonymous';
    const templateDb = useMemo(() => getScopedGroundTruthDb(appScope), [appScope]);
    const templates = useLiveQuery(
        () => templateDb.templates.where('appScope').equals(appScope).toArray(),
        [templateDb, appScope]
    ) || [];
    const migrationMarkerKey = `groundtruth_scope_migrated_${appScope}`;

    // Prevent Dexie bulk operations from failing on duplicate template IDs.
    const dedupeTemplatesById = (items: Template[]): Template[] => {
        const byId = new Map<string, Template>();
        items.forEach((item) => {
            const id = String(item?.id ?? '');
            if (!id) return;
            byId.set(id, item);
        });
        return Array.from(byId.values());
    };

    // Assign legacy unscoped templates in the scoped DB to the current app scope.
    useEffect(() => {
        const assignLegacyScopeInScopedDb = async () => {
            const legacy = await templateDb.templates.filter((t) => !t.appScope).toArray();
            if (legacy.length > 0) {
                await templateDb.templates.bulkPut(legacy.map((t) => ({ ...t, appScope })));
            }
        };
        assignLegacyScopeInScopedDb();
    }, [templateDb, appScope]);

    // One-time migration from legacy shared DB into this app-scoped DB.
    useEffect(() => {
        const migrateLegacyDbIntoScope = async () => {
            if (localStorage.getItem(migrationMarkerKey) === '1') return;
            try {
                const migrated = await migrateLegacyTemplatesToScope(appScope, templateDb);
                if (migrated > 0) {
                    showNotification(`Migrated ${migrated} legacy templates to this app`, 'success');
                }
                localStorage.setItem(migrationMarkerKey, '1');
            } catch (e) {
                console.error("Legacy DB migration failed", e);
            }
        };
        migrateLegacyDbIntoScope();
    }, [appScope, templateDb, showNotification, migrationMarkerKey]);

    // One-time migration from LocalStorage to IndexedDB (scoped per app)
    useEffect(() => {
        const migrate = async () => {
            const saved = localStorage.getItem('groundtruth_templates');
            if (saved) {
                try {
                    const localTemplates = JSON.parse(saved);
                    if (Array.isArray(localTemplates) && localTemplates.length > 0) {
                        const count = await templateDb.templates.where('appScope').equals(appScope).count();
                        if (count === 0) {
                            const deduped = dedupeTemplatesById(
                                (localTemplates as Template[]).map((t) => ({ ...t, appScope }))
                            );
                            await templateDb.templates.bulkPut(deduped);
                            showNotification(`Migrated ${deduped.length} templates to Database`, 'success');
                        }
                    }
                    // Optional: Clear localStorage after migration? Maybe keep as backup for now.
                    // localStorage.removeItem('groundtruth_templates'); 
                } catch (e) {
                    console.error("Migration failed", e);
                }
            }
        };
        migrate();
    }, [templateDb, appScope, showNotification]);

    const handleSaveTemplate = () => {
        if (!jsonInput || !schemaInput) return;
        setSaveMode('save');

        // If a template is currently selected, use its name as default
        if (selectedTemplateId) {
            const currentTemplate = templates.find(t => t.id === selectedTemplateId);
            setTempTemplateName(currentTemplate?.name || "");
        } else {
            setTempTemplateName("");
        }

        setIsSaveModalOpen(true);
    };

    const handleSaveAsTemplate = () => {
        if (!jsonInput || !schemaInput) return;
        setSaveMode('saveAs');
        setTempTemplateName("");
        setIsSaveModalOpen(true);
    };

    const confirmSaveTemplate = async () => {
        const trimmedName = tempTemplateName.trim();
        if (!trimmedName) {
            showNotification("Please enter a template name", 'warning');
            return;
        }

        // Check for duplicate names (excluding the currently selected template if we are in 'save' mode)
        const duplicate = templates.find(t =>
            t.name.toLowerCase() === trimmedName.toLowerCase() &&
            t.id !== selectedTemplateId
        );

        let idToSave = (saveMode === 'save' && selectedTemplateId) ? selectedTemplateId : null;

        if (duplicate) {
            const confirmed = await showConfirmAsync(`A template named "${trimmedName}" already exists. Do you want to overwrite it?`);
            if (!confirmed) return;
            idToSave = duplicate.id;
        }

        // Ensure active schema data is synced with the input text before saving
        try {
            const parsed = JSON.parse(schemaInput);
            setSchemaData(parsed);
        } catch (e) {
            showNotification("Warning: Saving invalid JSON in Schema", 'warning');
        }

        try {
            const templateData = {
                name: trimmedName,
                json: jsonInput,
                schema: schemaInput,
                date: new Date().toLocaleDateString(),
                appScope
            };

            if (idToSave) {
                // Overwrite existing template
                await templateDb.templates.put({
                    ...templateData,
                    id: idToSave
                });
                setSelectedTemplateId(idToSave);
            } else {
                // Create new template
                const newId = Date.now().toString();
                await templateDb.templates.add({
                    ...templateData,
                    id: newId
                });
                setSelectedTemplateId(newId);
            }

            setIsSaveModalOpen(false);
            showNotification(`Template "${trimmedName}" saved!`, 'success');
            setTempTemplateName("");
        } catch (error) {
            showNotification("Error saving template: " + String(error), 'error');
        }
    };

    const handleLoadTemplate = (t: Template) => {
        showConfirm(`Load template "${t.name}"? This will overwrite your current workspace.`, () => {
            setJsonInput(t.json);
            setSchemaInput(t.schema);
            try {
                const parsedV = JSON.parse(t.json);
                setParsedData(parsedV);
                setSchemaData(JSON.parse(t.schema));
                setYamlInput(yaml.dump(parsedV));
                setSelectedTemplateId(t.id);
                showNotification(`Template "${t.name}" loaded successfully`, 'success');
            } catch (e) {
                console.error("Error loading template data", e);
                showNotification('Error loading template', 'error');
            }
        });
    };

    const handleDeleteTemplate = (id: string) => {
        showConfirm("Are you sure you want to delete this template?", async () => {
            try {
                await templateDb.templates.delete(id);
                if (selectedTemplateId === id) setSelectedTemplateId("");
                showNotification('Template deleted', 'success');
            } catch (e) {
                showNotification('Error deleting template', 'error');
            }
        });
    };

    useEffect(() => {
        let observer: MutationObserver | null = null;

        const resolveHost = () => {
            const host = document.getElementById('gt-navbar-menus');
            if (host) {
                setNavbarMenuHost(host);
                return true;
            }
            return false;
        };

        if (!resolveHost()) {
            observer = new MutationObserver(() => {
                if (resolveHost() && observer) {
                    observer.disconnect();
                    observer = null;
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }

        return () => {
            if (observer) observer.disconnect();
        };
    }, []);

    useEffect(() => {
        try {
            const parsed = JSON.parse(jsonInput);
            setParsedData(parsed);
            setYamlInput(yaml.dump(parsed, { lineWidth: -1 })); // Sync YAML on load
            setError(null);
        } catch (e) {
            if (e instanceof Error) setError(e.message);
        }
    }, []); // Only run once on mount

    // Ref to always access current parsedData without causing re-creation of handlers
    const parsedDataRef = React.useRef(parsedData);
    useEffect(() => {
        parsedDataRef.current = parsedData;
    }, [parsedData]);

    const handleFormChange = React.useCallback((path: (string | number)[], newValue: Value) => {
        if (!parsedDataRef.current) return;
        const newData = setValue(parsedDataRef.current, path, newValue);
        setParsedData(newData);
        setJsonInput(JSON.stringify(newData, null, 2));
    }, [setParsedData]);

    const handleFormRemove = React.useCallback((path: (string | number)[]) => {
        if (!parsedDataRef.current) return;
        const newData = removeValue(parsedDataRef.current, path);
        setParsedData(newData);
        setJsonInput(JSON.stringify(newData, null, 2));
    }, [setParsedData]);

    // Sync other inputs when history changes (Undo/Redo)
    useEffect(() => {
        if (parsedData) {
            const currentJson = JSON.stringify(parsedData, null, 2);
            if (jsonInput !== currentJson) {
                setJsonInput(currentJson);
            }
            const currentYaml = yaml.dump(parsedData, { lineWidth: -1 });
            if (yamlInput !== currentYaml) {
                setYamlInput(currentYaml);
            }
        }
    }, [parsedData]);

    const formatJson = () => {
        try {
            const parsed = JSON.parse(jsonInput);
            setJsonInput(JSON.stringify(parsed, null, 2));
            setError(null);
        } catch (e) { /* ignore */ }
    };

    const handleExportTemplates = () => {
        if (templates.length === 0) {
            showNotification("No templates to export.", "warning");
            return;
        }
        const blob = new Blob([JSON.stringify(templates, null, 2)], { type: 'application/json' });
        saveAs(blob, `groundtruth_templates_${new Date().toISOString().split('T')[0]}.json`);
        showNotification("Templates exported successfully.", "success");
    };

    const handleImportTemplates = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const content = event.target?.result as string;
                const imported = JSON.parse(content);

                if (!Array.isArray(imported)) {
                    throw new Error("Invalid format: expected an array of templates.");
                }

                // Basic validation of template structure
                const valid = imported.every((t: unknown) => {
                    if (!t || typeof t !== 'object') return false;
                    const candidate = t as Partial<Template>;
                    return Boolean(candidate.id && candidate.name && candidate.json !== undefined && candidate.schema !== undefined);
                });
                if (!valid) {
                    throw new Error("Invalid format: templates missing required fields (id, name, json, schema).");
                }

                const shouldMerge = await showConfirmAsync(`Do you want to MERGE ${imported.length} templates with your current library?\n\n- Click "Confirm" to MERGE (keeping existing and adding new ones)\n- Click "Cancel" to skip and decide if you want to OVERWRITE instead.`);

                if (shouldMerge) {
                    // Bulk Put updates existing keys and adds new ones
                    const deduped = dedupeTemplatesById(
                        (imported as Template[]).map((t) => ({ ...t, appScope }))
                    );
                    await templateDb.templates.bulkPut(deduped);
                    showNotification("Templates merged successfully.", "success");
                } else {
                    const shouldOverwrite = await showConfirmAsync("Are you sure you want to OVERWRITE your entire template library with the imported ones? This will delete all your current local templates!");
                    if (shouldOverwrite) {
                        const deduped = dedupeTemplatesById(
                            (imported as Template[]).map((t) => ({ ...t, appScope }))
                        );
                        await templateDb.templates.where('appScope').equals(appScope).delete();
                        await templateDb.templates.bulkPut(deduped);
                        showNotification("Templates overwritten successfully.", "success");
                    }
                }
            } catch (err) {
                console.error("Template Import Error:", err);
                showNotification("Failed to import templates: " + (err instanceof Error ? err.message : String(err)), "error");
            }
            e.target.value = ''; // Reset input
        };
        reader.readAsText(file);
    };

    const onExportExcel = async () => {
        setIsLoading(true);
        setLoadingMessage('Exporting to Excel...');
        try {
            await handleExportExcel(parsedData, lockExcel);
        } catch (e) {
            showNotification("Export failed: " + (e instanceof Error ? e.message : String(e)), "error");
        } finally {
            setIsLoading(false);
        }
    };

    const onExportHtml = () => {
        const activeTemplateName = templates.find(t => t.id === selectedTemplateId)?.name || "Global Export";
        handleExportHtml(parsedData, schemaData, activeTemplateName);
        showNotification(`${activeTemplateName} HTML exported!`, "success");
    };

    const onExportJson = () => {
        const activeTemplateName = templates.find(t => t.id === selectedTemplateId)?.name || "ground_truth";
        const blob = new Blob([jsonInput], { type: 'application/json' });
        saveAs(blob, `${activeTemplateName.replace(/\s+/g, '_')}.json`);
        showNotification("JSON exported!", "success");
    };

    const onImportFile = async (file: File) => {
        const isExcel = file.name.endsWith('.xlsx');
        const isHtml = file.name.endsWith('.html');

        setIsLoading(true);
        setLoadingMessage(isExcel ? 'Importing Excel...' : 'Importing HTML Form...');

        try {
            if (isExcel) {
                await handleImportExcel(
                    file,
                    setParsedData,
                    setJsonInput,
                    setYamlInput,
                    schemaData,
                    setSchemaData,
                    setSchemaInput,
                    setError,
                    showNotification,
                    showConfirmAsync
                );
            } else if (isHtml) {
                const result = (await handleImportHtml(file)) as { data: Value; schema: Value | null };
                setParsedData(result.data);
                setJsonInput(JSON.stringify(result.data, null, 2));
                setYamlInput(yaml.dump(result.data, { lineWidth: -1 }));
                if (result.schema) {
                    setSchemaData(result.schema);
                    setSchemaInput(JSON.stringify(result.schema, null, 2));
                }
                showNotification("HTML Form imported successfully!", "success");
            }
        } catch (e) {
            showNotification("Import failed: " + (e instanceof Error ? e.message : String(e)), "error");
        } finally {
            setIsLoading(false);
        }
    };

    // Keep live references for keyboard shortcuts so the global listener stays stable.
    const canUndoRef = React.useRef(canUndo);
    const canRedoRef = React.useRef(canRedo);
    const shortcutActionsRef = React.useRef({
        undo,
        redo,
        save: handleSaveTemplate,
        saveAs: handleSaveAsTemplate,
        format: formatJson,
    });

    useEffect(() => {
        canUndoRef.current = canUndo;
        canRedoRef.current = canRedo;
        shortcutActionsRef.current = {
            undo,
            redo,
            save: handleSaveTemplate,
            saveAs: handleSaveAsTemplate,
            format: formatJson,
        };
    }, [canUndo, canRedo, undo, redo, handleSaveTemplate, handleSaveAsTemplate, formatJson]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            const tag = target?.tagName?.toLowerCase();
            const isEditableTarget =
                !!target?.closest('.monaco-editor') ||
                tag === 'textarea' ||
                tag === 'input' ||
                target?.isContentEditable === true;

            // Never intercept native editing shortcuts inside editors/inputs.
            if (isEditableTarget) return;

            // Undo/Redo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    if (canRedoRef.current) shortcutActionsRef.current.redo();
                } else {
                    if (canUndoRef.current) shortcutActionsRef.current.undo();
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                if (canRedoRef.current) shortcutActionsRef.current.redo();
            }

            // Save / Save As
            else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (e.shiftKey) {
                    shortcutActionsRef.current.saveAs();
                } else {
                    shortcutActionsRef.current.save();
                }
            }

            // Format
            else if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'f') {
                e.preventDefault();
                shortcutActionsRef.current.format();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const navbarMenus = navbarMenuHost ? createPortal(
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'nowrap' }}>
            <Tooltip title="Undo (Ctrl+Z)" arrow>
                <span>
                    <IconButton
                        onClick={undo}
                        disabled={!canUndo}
                        aria-label="Undo"
                        size="small"
                    >
                        <Undo size={18} />
                    </IconButton>
                </span>
            </Tooltip>
            <Tooltip title="Redo (Ctrl+Y)" arrow>
                <span>
                    <IconButton
                        onClick={redo}
                        disabled={!canRedo}
                        aria-label="Redo"
                        size="small"
                    >
                        <Redo size={18} />
                    </IconButton>
                </span>
            </Tooltip>

            <Tooltip title="Search Template" arrow>
                <Box>
                    <Autocomplete
                        id="template-search-autocomplete"
                        size="small"
                        sx={{
                            width: { xs: 180, md: 220 },
                            '& .MuiInputBase-root': { height: 36 },
                            '& .MuiInputBase-input': { py: 0 },
                        }}
                        options={[
                            { id: '__none__', name: 'None (Clear Current)', json: '{}', schema: '{}', date: '' },
                            ...templates
                        ]}
                        getOptionLabel={(option) => option.name}
                        value={
                            selectedTemplateId === ""
                                ? { id: '__none__', name: 'None (Clear Current)', json: '{}', schema: '{}', date: '' }
                                : templates.find(t => t.id === selectedTemplateId) || null
                        }
                        onChange={(_, newValue) => {
                            if (!newValue || newValue.id === '__none__') {
                                setJsonInput('{}');
                                setYamlInput('');
                                setSchemaInput('{}');
                                setParsedData(null);
                                setSchemaData(null);
                                setSelectedTemplateId("");
                                showNotification("Workspace cleared.", "info");
                            } else {
                                handleLoadTemplate(newValue);
                            }
                        }}
                        renderOption={(props, option) => {
                            const { key, ...optionProps } = props as React.HTMLAttributes<HTMLLIElement> & { key?: React.Key };
                            return (
                                <Box component="li" key={option.id} {...optionProps} sx={{
                                    fontStyle: option.id === '__none__' ? 'italic' : 'normal',
                                    color: option.id === '__none__' ? 'text.secondary' : 'inherit',
                                    borderBottom: option.id === '__none__' ? '1px solid divider' : 'none',
                                    mb: option.id === '__none__' ? 0.5 : 0
                                }}>
                                    {option.name}
                                </Box>
                            );
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Search Template..."
                            />
                        )}
                        noOptionsText="No templates found"
                    />
                </Box>
            </Tooltip>

            <Stack direction="row" spacing={0.5}>
                <Tooltip title="Export JSON" arrow>
                    <IconButton
                        onClick={onExportJson}
                        aria-label="Export JSON"
                        size="small"
                        sx={{ color: 'primary.main' }}
                    >
                        <Braces size={18} />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Export All Templates" arrow>
                    <IconButton
                        onClick={handleExportTemplates}
                        aria-label="Export All Templates"
                        size="small"
                        sx={{ color: 'primary.main' }}
                    >
                        <Download size={18} />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Import Templates (.json)" arrow>
                    <IconButton
                        component="label"
                        aria-label="Import Templates"
                        size="small"
                        sx={{ color: 'primary.main' }}
                    >
                        <FileJson size={18} />
                        <input
                            type="file"
                            accept=".json"
                            hidden
                            onChange={handleImportTemplates}
                        />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Clear Template Library" arrow>
                    <IconButton
                        onClick={() => {
                            showConfirm("Are you sure you want to DELETE ALL templates? This cannot be undone.", async () => {
                                await templateDb.templates.where('appScope').equals(appScope).delete();
                                localStorage.removeItem('groundtruth_templates');
                                setJsonInput('{}');
                                setYamlInput('');
                                setSchemaInput('{}');
                                setParsedData(null);
                                setSchemaData(null);
                                setSelectedTemplateId("");
                                showNotification("All library templates deleted and workspace cleared.", "info");
                            });
                        }}
                        aria-label="Clear Library"
                        size="small"
                        sx={{ color: 'error.main' }}
                    >
                        <Trash2 size={18} />
                    </IconButton>
                </Tooltip>
            </Stack>

            <Stack direction="row" spacing={0} alignItems="center" sx={{ ml: 0.5 }}>
                <Tooltip title="Lock Excel export structure" arrow>
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        bgcolor: 'action.hover',
                        borderTopLeftRadius: 4,
                        borderBottomLeftRadius: 4,
                        px: 1.5,
                        height: 36.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRight: 'none'
                    }}>
                        <Lock size={14} />
                        <Switch
                            size="small"
                            checked={lockExcel}
                            onChange={(e) => setLockExcel(e.target.checked)}
                        />
                    </Box>
                </Tooltip>
                <Tooltip title="Export Excel" arrow>
                    <IconButton
                        onClick={onExportExcel}
                        size="small"
                        aria-label="Export Excel"
                        sx={{
                            borderTopLeftRadius: 0,
                            borderBottomLeftRadius: 0,
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                            height: 36.5,
                            width: 36.5,
                            '&:hover': { bgcolor: 'primary.dark' },
                            boxShadow: 'none',
                            border: '1px solid',
                            borderColor: 'primary.main'
                        }}
                    >
                        <FileSpreadsheet size={16} />
                    </IconButton>
                </Tooltip>
            </Stack>

            <Tooltip title="Export HTML Form" arrow>
                <IconButton
                    size="small"
                    onClick={onExportHtml}
                    aria-label="Export HTML Form"
                    sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                >
                    <FileCode2 size={16} />
                </IconButton>
            </Tooltip>

            <Tooltip title="Import Excel/HTML" arrow>
                <IconButton
                    size="small"
                    component="label"
                    aria-label="Import Excel HTML"
                    sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                >
                    <Upload size={16} />
                    <input
                        type="file"
                        accept=".xlsx,.html"
                        hidden
                        onChange={(e) => {
                            if (e.target.files?.[0]) {
                                onImportFile(e.target.files[0]);
                                e.target.value = '';
                            }
                        }}
                    />
                </IconButton>
            </Tooltip>
        </Stack>,
        navbarMenuHost
    ) : null;

    return (
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {navbarMenus}

            <Paper sx={{ mb: 1.25 }}>
                <Tabs
                    value={activeTab}
                    onChange={(_, v) => setActiveTab(v)}
                    variant="fullWidth"
                    sx={{ minHeight: 40 }}
                >
                    <Tab
                        icon={<Braces size={14} />}
                        label="JSON"
                        value="json"
                        iconPosition="start"
                        sx={{ minHeight: 40, py: 0.5, fontSize: '0.78rem' }}
                    />
                    <Tab
                        icon={<AlignLeft size={14} />}
                        label="YAML"
                        value="yaml"
                        iconPosition="start"
                        sx={{ minHeight: 40, py: 0.5, fontSize: '0.78rem' }}
                    />
                    <Tab
                        icon={<FileJson size={14} />}
                        label="Schema Template"
                        value="schema"
                        iconPosition="start"
                        sx={{ minHeight: 40, py: 0.5, fontSize: '0.78rem' }}
                    />
                    <Tab
                        icon={<LayoutIcon size={14} />}
                        label="Generated Form"
                        value="form"
                        iconPosition="start"
                        sx={{ minHeight: 40, py: 0.5, fontSize: '0.78rem' }}
                    />
                </Tabs>
            </Paper>

            <Box sx={{ flexGrow: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

                {/* JSON TAB */}
                {activeTab === 'json' && (
                    <JsonTab
                        jsonInput={jsonInput}
                        setJsonInput={setJsonInput}
                        setParsedData={setParsedData}
                        setYamlInput={setYamlInput}
                        schemaData={schemaData}
                        setSchemaData={setSchemaData}
                        setSchemaInput={setSchemaInput}
                        validateAgainstSchema={validateAgainstSchema}
                        showNotification={showNotification}
                        showConfirm={showConfirm}
                        error={error}
                        setError={setError}
                        formatJson={formatJson}
                        wordWrap={wordWrap}
                        setWordWrap={setWordWrap}
                        theme={theme}
                        yaml={yaml}
                        onExportJson={onExportJson}
                    />
                )}

                {/* YAML TAB */}
                {activeTab === 'yaml' && (
                    <YamlTab
                        yamlInput={yamlInput}
                        setYamlInput={setYamlInput}
                        setJsonInput={setJsonInput}
                        setParsedData={setParsedData}
                        showNotification={showNotification}
                        showConfirm={showConfirm}
                        validateAgainstSchema={validateAgainstSchema}
                        schemaData={schemaData}
                        setSchemaData={setSchemaData}
                        setSchemaInput={setSchemaInput}
                        theme={theme}
                        wordWrap={wordWrap}
                    />
                )}

                {/* SCHEMA TAB */}
                {activeTab === 'schema' && (
                    <SchemaTab
                        schemaInput={schemaInput}
                        setSchemaInput={setSchemaInput}
                        setSchemaData={setSchemaData}
                        showNotification={showNotification}
                        showConfirm={showConfirm}
                        theme={theme}
                        wordWrap={wordWrap}
                        handleSaveTemplate={handleSaveTemplate}
                        handleSaveAsTemplate={handleSaveAsTemplate}
                        parsedData={parsedData}
                    />
                )}

                {/* GENERATED FORM TAB */}
                {activeTab === 'form' && (
                    <FormTab
                        parsedData={parsedData}
                        handleFormChange={handleFormChange}
                        handleFormRemove={handleFormRemove}
                        forceExpandState={forceExpandState}
                        setForceExpandState={setForceExpandState}
                        highlightedPath={highlightedPath}
                        setHighlightedPath={setHighlightedPath}
                        schemaData={schemaData}
                        setSchemaData={setSchemaData}
                        setSchemaInput={setSchemaInput}
                        setJsonInput={setJsonInput}
                        setYamlInput={setYamlInput}
                        showNotification={showNotification}
                        showConfirm={showConfirm}
                        yaml={yaml}
                        error={error}
                        validateAgainstSchema={validateAgainstSchema}
                        jsonInput={jsonInput}
                    />
                )}
            </Box>

            {/* Save Dialog */}
            <Dialog open={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)}>
                <DialogTitle>{saveMode === 'save' ? 'Save Template' : 'Save Template As'}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Template Name"
                        fullWidth
                        variant="standard"
                        value={tempTemplateName}
                        onChange={(e) => setTempTemplateName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && confirmSaveTemplate()}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsSaveModalOpen(false)}>Cancel</Button>
                    <Button onClick={confirmSaveTemplate} variant="contained">Save</Button>
                </DialogActions>
            </Dialog>
            {/* Loading Overlay */}
            <LoadingOverlay open={isLoading} message={loadingMessage} />
        </Box >
    );
}
