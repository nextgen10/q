// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
    Box,
    TextField,
    Typography,
    IconButton,
    Button,
    Select,
    MenuItem,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Switch,
    Stack,
    Collapse,
    Chip
} from '@mui/material';
import { useNotification } from '@/features/ground-truth/components/Notifications/NotificationProvider';
import {
    Plus,
    Trash2,
    Minus,
    Check,
    X,
    ChevronRight,
    ChevronDown,
    Link
} from 'lucide-react';
import { Value } from './types';
type JsonMap = Record<string, Value>;

interface DynamicFieldProps {
    label: string | number;
    value: Value;
    path: (string | number)[];
    onChange: (path: (string | number)[], val: Value) => void;
    onRemove?: (path: (string | number)[]) => void;
    onRename?: (newKey: string) => void;
    hideHeader?: boolean;
    level?: number;
    forceExpandState?: boolean | null;
    highlightedPath?: (string | number)[] | null;
    setHighlightedPath?: (path: (string | number)[]) => void;
    schemaData?: Value | null;
    onSchemaUpdate?: (updatedSchema: Value | null) => void;
    maxExpandDepth?: number;
    lockedStructure?: boolean;
    searchQuery?: string;
    forceVisible?: boolean;
}

const normalize = (s: string) => s.toLowerCase().replace(/[_\s-]/g, '');

const deepSearch = (
    data: unknown,
    query: string,
    label: string | number,
    schema: unknown,
    visited: Set<object> = new Set(),
    depth: number = 0
): boolean => {
    // 1. Safety Guard for Stack Overflow
    if (depth > 20) return false;

    // 2. Check Match on Label/Value (Base Case)
    const q = normalize(query);
    if (normalize(String(label)).includes(q)) return true;

    // Check primitives
    if (data !== null && data !== undefined && typeof data !== 'object') {
        if (normalize(String(data)).includes(q)) return true;
    }
    if (schema !== null && schema !== undefined && typeof schema !== 'object') {
        if (normalize(String(schema)).includes(q)) return true;
    }

    // 3. Cycle Detection
    if (data && typeof data === 'object') {
        if (visited.has(data)) return false;
        visited.add(data);
    }
    // Note: Schema cycles are rare but possible, checking data usually suffices for JSON editor context.
    // If schema recursion is the culprit, we should track schema objects too.

    // 4. Recursive Search
    // Merge keys from both data and schema
    const dataObj = data && typeof data === 'object' ? data as Record<string, unknown> : {};
    const schemaObj = schema && typeof schema === 'object' ? schema as Record<string, unknown> : {};
    const keys = new Set([...Object.keys(dataObj), ...Object.keys(schemaObj)]);

    for (const key of keys) {
        const childData = dataObj[key];
        let childSchema = schemaObj[key];

        // Handle array item templates in schema
        if (Array.isArray(schema) && schema.length > 0) {
            childSchema = schema[0];
        }

        if (deepSearch(childData, query, key, childSchema, visited, depth + 1)) return true;
    }

    // Clean up visited set for this branch? No, keep it per-search traversal.
    // Actually for 'hasMatch' logic we want a fresh visited set per root call.
    return false;
};

const findSchemaNode = (schema: Value | null | undefined, currentPath: (string | number)[]): Value | null => {
    if (!schema) return null;
    if (currentPath.length === 0) return schema;

    const [head, ...tail] = currentPath;
    if (typeof head === 'number') {
        if (Array.isArray(schema) && schema.length > 0) {
            return findSchemaNode(schema[0], tail);
        }
        return null;
    }

    if (schema && typeof schema === 'object' && !Array.isArray(schema) && (schema as JsonMap)[head]) {
        return findSchemaNode((schema as JsonMap)[head], tail);
    }
    return null;
};

export const DynamicFieldComponent = ({
    label,
    value,
    path,
    onChange,
    onRemove,
    onRename,
    hideHeader,
    level = 0,
    forceExpandState,
    highlightedPath,
    setHighlightedPath,
    schemaData,
    onSchemaUpdate,
    maxExpandDepth = Infinity,
    lockedStructure = false,
    searchQuery = "",
    forceVisible = false
}: DynamicFieldProps) => {
    const { showNotification, showConfirm } = useNotification();

    const isArray = Array.isArray(value);
    const isObject = value !== null && typeof value === 'object' && !isArray;
    const isPrimitive = !isArray && !isObject;

    // A field is an 'item' if its parent is an array (index based label)
    const isArrayItem = typeof label === 'number' || (typeof label === 'string' && label.startsWith('Item '));

    const generateFromSchema = (s: Value | null): Value => {
        if (!s) return "";
        if (typeof s === 'object' && s !== null && !Array.isArray(s) && 'type' in s && 'properties' in s && (s as Record<string, unknown>).type === 'object') s = (s as Record<string, Value>).properties;
        if (typeof s === 'object' && s !== null && !Array.isArray(s) && 'type' in s && (s as Record<string, unknown>).type === 'array') return [];
        if (Array.isArray(s)) return [];
        if (typeof s === 'object' && s !== null) {
            return Object.keys(s as JsonMap).reduce((acc, key) => ({ ...acc, [key]: generateFromSchema((s as JsonMap)[key]) }), {} as JsonMap);
        }
        if (typeof s === 'number') return 0;
        if (typeof s === 'boolean') return false;
        return "";
    };

    const mergeWithSchema = (data: Value, s: Value | null): Value => {
        if (!s) return data;
        if (typeof s === 'object' && s !== null && !Array.isArray(s) && 'type' in s && 'properties' in s && (s as Record<string, unknown>).type === 'object') s = (s as Record<string, Value>).properties;

        // If data is a primitive but schema expects object/array, favor schema structure
        if ((typeof data !== 'object' || data === null) && typeof s === 'object') {
            return generateFromSchema(s);
        }

        if (Array.isArray(s)) return data; // Can't really merge array content safely here

        if (typeof s === 'object' && s !== null) {
            const result: JsonMap = { ...(typeof data === 'object' && data !== null && !Array.isArray(data) ? data as JsonMap : {}) };
            Object.keys(s as JsonMap).forEach(key => {
                if (!(key in result)) {
                    result[key] = generateFromSchema((s as JsonMap)[key]);
                } else if (typeof (s as JsonMap)[key] === 'object' && (s as JsonMap)[key] !== null) {
                    result[key] = mergeWithSchema(result[key], (s as JsonMap)[key]);
                }
            });
            return result;
        }
        return data;
    };

    const [isAdding, setIsAdding] = useState(false);
    const [newKey, setNewKey] = useState("");
    const [newType, setNewType] = useState("string");
    const [isExpanded, setIsExpanded] = useState(level < 2);
    const [isEditingKey, setIsEditingKey] = useState(false);
    const [editedKey, setEditedKey] = useState(String(label));
    const [childHasMatch, setChildHasMatch] = useState(false);

    useEffect(() => {
        setEditedKey(String(label));
    }, [label]);

    useEffect(() => {
        if (forceExpandState !== null && forceExpandState !== undefined) {
            if (forceExpandState === true && level >= maxExpandDepth) {
                setIsExpanded(false);
            } else {
                setIsExpanded(forceExpandState);
            }
        }
    }, [forceExpandState, level, maxExpandDepth]);

    // --- SEARCH FILTERING LOGIC ---
    const isSearchActive = searchQuery.length > 0;

    // Synchronous lookahead to prevent render deadlock
    const isVisible = React.useMemo(() => {
        if (forceVisible) return true;
        if (!isSearchActive) return true;
        const currentSchema = findSchemaNode(schemaData, path);
        return deepSearch(value, searchQuery, label, currentSchema);
    }, [value, searchQuery, label, isSearchActive, schemaData, path, forceVisible]);

    // Track self match for potential highlighting/auto-expand
    const hasMatch = React.useMemo(() => {
        if (!isSearchActive) return false;
        const q = normalize(searchQuery);
        return normalize(String(label)).includes(q) ||
            (isPrimitive && normalize(String(value)).includes(q));
    }, [label, value, searchQuery, isSearchActive, isPrimitive]);

    // Auto-expand if anything inside matches
    useEffect(() => {
        if (isSearchActive && isVisible) {
            setIsExpanded(true);
        }
    }, [isSearchActive, isVisible]);


    // STRICTER TABLE HEURISTIC:
    // Only use Table Mode if all items are objects AND all their values are primitives (string, number, boolean, null).
    const isTableMode = isArray && (
        value.length > 0
            ? value.every((item: unknown) =>
                item !== null &&
                typeof item === 'object' &&
                !Array.isArray(item) &&
                Object.values(item as Record<string, unknown>).every(val =>
                    val === null || val === undefined || typeof val !== 'object'
                )
            )
            : (schemaData ? (() => {
                const contextSchema = findSchemaNode(schemaData, path);
                const itemSchema = Array.isArray(contextSchema) ? contextSchema[0] : ((contextSchema as any)?.items || null);
                return itemSchema && typeof itemSchema === 'object' && !Array.isArray(itemSchema) &&
                    Object.values(itemSchema).every(v => v === null || typeof v !== 'object');
            })() : false)
    );


    const handleAddArrayItem = () => {
        if (!isArray) return;
        let newItem: Value = "";

        const contextSchema = schemaData ? findSchemaNode(schemaData, path) : null;
        const itemSchema = Array.isArray(contextSchema) ? contextSchema[0] : (contextSchema?.items || null);

        // 1. Try to clone existing item (Copying all data from the last item)
        if (value.length > 0) {
            const lastItem = value[value.length - 1];
            newItem = JSON.parse(JSON.stringify(lastItem));

            // 2. STRENGTHEN: Merge with schema to ensure all schema-defined fields exist 
            // (even if the cloned item was missing them)
            if (itemSchema) {
                newItem = mergeWithSchema(newItem, itemSchema);
            }
        }
        // 3. Fallback to pure Schema if empty
        else if (itemSchema) {
            newItem = generateFromSchema(itemSchema);
        }

        onChange(path, [...value, newItem]);
        if (setHighlightedPath) {
            setHighlightedPath([...path, value.length]);
            setIsExpanded(true);
        }
    };

    // AUTO-DETECT TYPE FROM SCHEMA
    useEffect(() => {
        if (!isAdding || !newKey.trim() || !schemaData) return;
        const contextSchema = findSchemaNode(schemaData, path);
        if (contextSchema && typeof contextSchema === 'object' && newKey in contextSchema) {
            const schemaVal = contextSchema[newKey];
            let detectedType = "string";
            if (Array.isArray(schemaVal)) detectedType = "array";
            else if (schemaVal === null) detectedType = "string";
            else if (typeof schemaVal === 'object') detectedType = "object";
            else if (typeof schemaVal === 'number') detectedType = "number";
            else if (typeof schemaVal === 'boolean') detectedType = "boolean";

            if (newType !== detectedType) {
                setNewType(detectedType);
            }
        }
    }, [newKey, isAdding]);

    const handleAddField = () => {
        if (!newKey.trim()) return;

        const contextSchema = schemaData ? findSchemaNode(schemaData, path) : null;
        const isInSchema = contextSchema && typeof contextSchema === 'object' && (newKey in contextSchema);

        if (schemaData && onSchemaUpdate && !Array.isArray(value) && !isInSchema) {
            const msg = `Warning: The field "${newKey}" does not exist in your active Schema Template.\n\nDo you want to add it to the Schema as well?`;
            showConfirm(msg, () => {
                const deepClone = (obj: Value | null) => JSON.parse(JSON.stringify(obj)) as Value;
                const newSchema = deepClone(schemaData);

                const setSchemaValue = (root: Value, p: (string | number)[], key: string, val: Value) => {
                    let current: Value = root;
                    for (const part of p) {
                        if (typeof part === 'number') {
                            if (Array.isArray(current) && current.length > 0) current = current[0];
                            else return;
                        } else {
                            if (current && typeof current === 'object' && !Array.isArray(current) && !(part in current)) {
                                (current as JsonMap)[part] = {};
                            }
                            current = current && typeof current === 'object' && !Array.isArray(current) ? (current as JsonMap)[part] : null;
                        }
                    }
                    if (current && typeof current === 'object' && !Array.isArray(current)) (current as JsonMap)[key] = val;
                };

                let initialSchemaValue: Value = "";
                switch (newType) {
                    case "string": initialSchemaValue = ""; break;
                    case "number": initialSchemaValue = 0; break;
                    case "boolean": initialSchemaValue = false; break;
                    case "array": initialSchemaValue = []; break;
                    case "object": initialSchemaValue = {}; break;
                }
                setSchemaValue(newSchema, path, newKey, initialSchemaValue);
                onSchemaUpdate(newSchema);
                completeAddField();
            });
            return;
        }

        completeAddField();
    };

    const completeAddField = () => {
        let initialValue: Value = "";
        switch (newType) {
            case "string": initialValue = ""; break;
            case "number": initialValue = 0; break;
            case "boolean": initialValue = false; break;
            case "array":
                initialValue = [];
                if (isObject) {
                    const existingArray = Object.values(value).find(v => Array.isArray(v));
                    if (existingArray) initialValue = JSON.parse(JSON.stringify(existingArray));
                }
                break;
            case "object":
                initialValue = {};
                if (isObject) {
                    const existingObj = Object.values(value).find(v => v !== null && typeof v === 'object' && !Array.isArray(v));
                    if (existingObj) initialValue = JSON.parse(JSON.stringify(existingObj));
                }
                break;
        }

        // Apply schema defaults if key is in schema
        const contextSchema = schemaData ? findSchemaNode(schemaData, path) : null;
        if (contextSchema && typeof contextSchema === 'object' && (newKey in contextSchema)) {
            initialValue = mergeWithSchema(initialValue, contextSchema[newKey]);
        }

        onChange([...path, newKey], initialValue);
        if (setHighlightedPath) {
            setHighlightedPath([...path, newKey]);
            setIsExpanded(true);
        }
        setIsAdding(false);
        setNewKey("");
        setNewType("string");
    };

    const getTypeLabel = () => {
        if (isArray && isTableMode) return 'Table';
        if (isArray) return 'Array';
        if (isObject) return 'Section';
        return typeof value;
    };

    const isHighlighted = highlightedPath &&
        path.length === highlightedPath.length &&
        path.every((val, index) => val === highlightedPath[index]);

    if (!isVisible) return null;

    return (
        <Box
            sx={{
                pl: isPrimitive ? 0 : 2,
                mt: 1,
                mb: 1,
                ml: level > 0 ? 1 : 0,
                position: 'relative',
                borderLeft: isPrimitive ? 'none' : '1px solid',
                borderColor: 'divider',
                backgroundColor: isHighlighted ? 'action.selected' : (hasMatch ? 'action.hover' : 'transparent'),
                borderRadius: 1,
                transition: 'all 0.5s ease',
                ...(isHighlighted && {
                    border: '1px solid',
                    borderColor: 'success.main',
                }),
                ...(hasMatch && {
                    border: '1px solid',
                    borderColor: 'primary.light',
                })
            }}
            ref={(el: HTMLDivElement | null) => {
                if (isHighlighted && el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }}
        >
            {!hideHeader && (
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1, p: 0.5, borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}>
                    {!isPrimitive && (
                        <IconButton
                            size="small"
                            onClick={() => setIsExpanded(!isExpanded)}
                            sx={{ p: 0.5 }}
                            aria-label={isExpanded ? "Collapse" : "Expand"}
                            title={isExpanded ? "Collapse" : "Expand"}
                        >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </IconButton>
                    )}

                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        {isEditingKey ? (
                            <TextField
                                autoFocus
                                variant="standard"
                                size="small"
                                value={editedKey}
                                onChange={(e) => setEditedKey(e.target.value)}
                                onBlur={() => {
                                    if (onRename) onRename(editedKey);
                                    setIsEditingKey(false);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        if (onRename) onRename(editedKey);
                                        setIsEditingKey(false);
                                    }
                                    if (e.key === 'Escape') {
                                        setEditedKey(String(label));
                                        setIsEditingKey(false);
                                    }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                sx={{ width: 120 }}
                            />
                        ) : (
                            <Typography
                                variant="subtitle2"
                                component="span"
                                onClick={(e) => {
                                    if (onRename && !lockedStructure) {
                                        e.preventDefault();
                                        setIsEditingKey(true);
                                    }
                                }}
                                sx={{
                                    cursor: (onRename && !lockedStructure) ? 'pointer' : 'default',
                                    fontWeight: 'bold',
                                    borderBottom: (onRename && !lockedStructure) ? '1px dashed' : 'none',
                                    borderColor: 'text.secondary'
                                }}
                            >
                                {label}
                            </Typography>
                        )}
                        {/* Type badge removed per user request */}
                    </Box>

                    {isArray && (
                        <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); handleAddArrayItem(); }}
                            color="primary"
                            title="Add Item"
                            aria-label="Add Item"
                        >
                            <Plus size={14} />
                        </IconButton>
                    )}

                    <IconButton
                        size="small"
                        onClick={(e) => {
                            e.stopPropagation();
                            const pathStr = path.join('.');
                            navigator.clipboard.writeText(pathStr);
                            showNotification(`Copied path: ${pathStr}`, "info");
                            if (setHighlightedPath) setHighlightedPath(path);
                        }}
                        title="Copy JSON Path"
                        aria-label="Copy JSON Path"
                        sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                    >
                        <Link size={14} />
                    </IconButton>

                    {onRemove && (!lockedStructure || isArrayItem) && (
                        <IconButton
                            size="small"
                            onClick={() => onRemove(path)}
                            color="error"
                            title={isArrayItem ? "Remove item" : "Remove field"}
                            aria-label={isArrayItem ? "Remove item" : "Remove field"}
                        >
                            <Trash2 size={14} />
                        </IconButton>
                    )}
                </Stack>
            )}

            {hideHeader && !isPrimitive && (
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <IconButton
                        size="small"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {isExpanded ? <Minus size={12} /> : <Plus size={12} />}
                    </IconButton>
                    {/* Type display removed */}
                </Stack>
            )}

            <Collapse in={isExpanded || isPrimitive} unmountOnExit timeout="auto">
                <Box
                    sx={{
                        pl: isPrimitive ? 0 : 2,
                        borderLeft: isPrimitive ? 'none' : '2px solid',
                        borderColor: (theme) => (level % 2 === 0 ? theme.palette.primary.main : theme.palette.divider)
                    }}
                >
                    {isPrimitive && (
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                            {typeof value === 'boolean' ? (
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <Switch
                                        checked={value}
                                        onChange={(e) => onChange(path, e.target.checked)}
                                        size="small"
                                    />
                                    <Typography variant="body2">{value ? 'True' : 'False'}</Typography>
                                </Stack>
                            ) : typeof value === 'number' ? (
                                <TextField
                                    type="number"
                                    value={value as number}
                                    onChange={(e) => onChange(path, parseFloat(e.target.value) || 0)}
                                    size="small"
                                    fullWidth
                                    variant="outlined"
                                    sx={{
                                        '& .MuiInputBase-input': { py: 0.5 }
                                    }}
                                />
                            ) : (
                                <TextField
                                    type="text"
                                    value={value ?? ''}
                                    onChange={(e) => onChange(path, e.target.value)}
                                    size="small"
                                    fullWidth
                                    multiline={String(value).length > 50}
                                    variant="outlined"
                                    sx={{
                                        '& .MuiInputBase-input': { py: 0.5 }
                                    }}
                                />
                            )}
                        </Box>
                    )}

                    {isObject && (
                        <Box>
                            {Object.entries(value).map(([key, val]) => (
                                <DynamicField
                                    key={key}
                                    label={key}
                                    value={val}
                                    path={[...path, key]}
                                    onChange={onChange}
                                    onRename={(newKeyName) => {
                                        if (newKeyName === key) return;
                                        if (!newKeyName.trim()) return;
                                        if (Object.keys(value).includes(newKeyName)) {
                                            showNotification("Key already exists!", "error");
                                            return;
                                        }
                                        const newObj = { ...value };
                                        const keys = Object.keys(newObj);
                                        const orderedObj: JsonMap = {};
                                        keys.forEach((k) => {
                                            if (k === key) {
                                                orderedObj[newKeyName] = val;
                                            } else {
                                                orderedObj[k] = newObj[k];
                                            }
                                        });
                                        onChange(path, orderedObj);
                                    }}
                                    onRemove={onRemove}
                                    level={level + 1}
                                    forceExpandState={forceExpandState}
                                    highlightedPath={highlightedPath}
                                    setHighlightedPath={setHighlightedPath}
                                    schemaData={schemaData}
                                    onSchemaUpdate={onSchemaUpdate}
                                    maxExpandDepth={maxExpandDepth}
                                    lockedStructure={lockedStructure}
                                    searchQuery={searchQuery}
                                    forceVisible={forceVisible || hasMatch}
                                />
                            ))}

                            {isAdding ? (
                                <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'center' }}>
                                    <TextField
                                        autoFocus
                                        placeholder="Key Name"
                                        value={newKey}
                                        onChange={(e) => setNewKey(e.target.value)}
                                        size="small"
                                        sx={{ flexGrow: 1 }}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddField()}
                                    />
                                    <Select
                                        value={newType}
                                        onChange={(e) => setNewType(e.target.value)}
                                        size="small"
                                        sx={{ minWidth: 100 }}
                                    >
                                        <MenuItem value="string">String</MenuItem>
                                        <MenuItem value="number">Number</MenuItem>
                                        <MenuItem value="boolean">Boolean</MenuItem>
                                        <MenuItem value="array">Array</MenuItem>
                                        <MenuItem value="object">Object</MenuItem>
                                    </Select>
                                    <IconButton onClick={handleAddField} color="primary" size="small" aria-label="Confirm add field" title="Confirm">
                                        <Check size={16} />
                                    </IconButton>
                                    <IconButton onClick={() => setIsAdding(false)} color="error" size="small" aria-label="Cancel add field" title="Cancel">
                                        <X size={16} />
                                    </IconButton>
                                </Stack>
                            ) : (
                                !lockedStructure && (
                                    <Button
                                        startIcon={<Plus size={14} />}
                                        onClick={() => setIsAdding(true)}
                                        size="small"
                                        sx={{ mt: 1, textTransform: 'none' }}
                                    >
                                        Add Field
                                    </Button>
                                )
                            )}
                        </Box>
                    )}

                    {isArray && (
                        isTableMode ? (
                            <Box sx={{ mt: 1 }}>
                                <TableContainer component={Paper} variant="outlined">
                                    <Table size="small">
                                        <TableHead sx={{ bgcolor: 'action.hover' }}>
                                            <TableRow>
                                                {(() => {
                                                    const tableKeys = Array.from(new Set([
                                                        ...value.flatMap((item: unknown) => (item && typeof item === 'object') ? Object.keys(item as Record<string, unknown>) : []),
                                                        ...(schemaData ? (() => {
                                                            const contextSchema = findSchemaNode(schemaData, path);
                                                            const itemSchema = Array.isArray(contextSchema) ? contextSchema[0] : (contextSchema?.items || null);
                                                            return (itemSchema && typeof itemSchema === 'object' && !Array.isArray(itemSchema)) ? Object.keys(itemSchema) : [];
                                                        })() : [])
                                                    ]));

                                                    return (
                                                        <>
                                                            {tableKeys.map(key => (
                                                                <TableCell key={key} sx={{ fontWeight: 'bold' }}>
                                                                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                                                                        <Box>{key}</Box>
                                                                        {!lockedStructure && (
                                                                            <IconButton
                                                                                size="small"
                                                                                color="error"
                                                                                onClick={() => {
                                                                                    showConfirm(`Delete column "${key}" from all items?`, () => {
                                                                                        const newValue = value.map((item: unknown) => {
                                                                                            const newItem = { ...(item as Record<string, Value>) };
                                                                                            delete newItem[key];
                                                                                            return newItem;
                                                                                        });
                                                                                        onChange(path, newValue);
                                                                                    });
                                                                                }}
                                                                                title="Delete Column"
                                                                                aria-label={`Delete column ${key}`}
                                                                            >
                                                                                <Trash2 size={12} />
                                                                            </IconButton>
                                                                        )}
                                                                    </Stack>
                                                                </TableCell>
                                                            ))}
                                                            <TableCell width={50}></TableCell>
                                                        </>
                                                    );
                                                })()}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {(() => {
                                                const tableKeys = Array.from(new Set([
                                                    ...value.flatMap((item: unknown) => (item && typeof item === 'object') ? Object.keys(item as Record<string, unknown>) : []),
                                                    ...(schemaData ? (() => {
                                                        const contextSchema = findSchemaNode(schemaData, path);
                                                        const itemSchema = Array.isArray(contextSchema) ? contextSchema[0] : (contextSchema?.items || null);
                                                        return (itemSchema && typeof itemSchema === 'object' && !Array.isArray(itemSchema)) ? Object.keys(itemSchema) : [];
                                                    })() : [])
                                                ]));

                                                return value.map((item: unknown, rowIndex: number) => (
                                                    <TableRow key={rowIndex} hover>
                                                        {tableKeys.map(key => (
                                                            <TableCell key={key} sx={{ verticalAlign: 'top' }}>
                                                                <TableDynamicField
                                                                    label={key}
                                                                    value={item?.[key] === undefined ? null : item[key]}
                                                                    path={[...path, rowIndex, key]}
                                                                    onChange={onChange}
                                                                    onRemove={onRemove}
                                                                    hideHeader={true}
                                                                    level={level + 1}
                                                                    forceExpandState={forceExpandState}
                                                                    highlightedPath={highlightedPath}
                                                                    setHighlightedPath={setHighlightedPath}
                                                                    onSchemaUpdate={onSchemaUpdate}
                                                                    maxExpandDepth={maxExpandDepth}
                                                                    lockedStructure={lockedStructure}
                                                                    schemaData={schemaData}
                                                                    searchQuery={searchQuery}
                                                                    forceVisible={forceVisible || hasMatch}
                                                                />
                                                            </TableCell>
                                                        ))}
                                                        <TableCell>
                                                            <IconButton
                                                                onClick={() => onRemove && onRemove([...path, rowIndex])}
                                                                color="error"
                                                                size="small"
                                                                title="Delete Row"
                                                                aria-label={`Delete row ${rowIndex + 1}`}
                                                            >
                                                                <Trash2 size={14} />
                                                            </IconButton>
                                                        </TableCell>
                                                    </TableRow>
                                                ));
                                            })()}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                <Button
                                    startIcon={<Plus size={16} />}
                                    onClick={handleAddArrayItem}
                                    fullWidth
                                    variant="outlined"
                                    sx={{ mt: 1, borderStyle: 'dashed' }}
                                >
                                    Add Row
                                </Button>
                            </Box>
                        ) : (
                            <Box>
                                {value.map((item, index) => (
                                    <Paper key={index} variant="outlined" sx={{ p: 1, mb: 1 }}>
                                        <DynamicField
                                            key={index}
                                            label={`Item ${index + 1}`}
                                            value={item}
                                            path={[...path, index]}
                                            onChange={onChange}
                                            onRemove={onRemove}
                                            level={level + 1}
                                            forceExpandState={forceExpandState}
                                            schemaData={schemaData}
                                            onSchemaUpdate={onSchemaUpdate}
                                            maxExpandDepth={maxExpandDepth}
                                            lockedStructure={lockedStructure}
                                            searchQuery={searchQuery}
                                            forceVisible={forceVisible || hasMatch}
                                        />
                                    </Paper>
                                ))}
                                <Button
                                    startIcon={<Plus size={16} />}
                                    onClick={handleAddArrayItem}
                                    fullWidth
                                    variant="outlined"
                                    sx={{ mt: 1, borderStyle: 'dashed' }}
                                >
                                    Add Item
                                </Button>
                            </Box>
                        )
                    )}
                </Box>
            </Collapse>

            {!isExpanded && !isPrimitive && (
                <Typography
                    variant="caption"
                    sx={{
                        display: 'block',
                        mt: 0.5,
                        pl: 2,
                        fontStyle: 'italic',
                        color: 'text.secondary',
                        cursor: 'pointer',
                        '&:hover': { color: 'text.primary' }
                    }}
                    onClick={() => setIsExpanded(true)}
                >
                    ... {isArray ? `${value.length} items` : `${Object.keys(value).length} keys`} collapsed
                </Typography>
            )}
        </Box>
    );
};

// Internal alias for recursive calls within table cells
const TableDynamicField = (props: DynamicFieldProps) => <DynamicFieldComponent {...props} />;

export const DynamicField = React.memo(DynamicFieldComponent);
