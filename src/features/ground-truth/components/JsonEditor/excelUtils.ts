// @ts-nocheck
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import yaml from 'js-yaml';
import { validateAgainstSchema } from '../../utils/schemaValidator';
import { updateSchemaWithPaths } from '../../utils/schemaUpdates';
import { Value } from './types';
import { AlertColor } from '@mui/material';

// --- Type Definitions ---

interface RowData {
    type: 'field' | 'object' | 'array' | 'table-header' | 'table-row';
    path: string;
    level: number;
    label: string | number;
    value?: Value;
    columns?: string[]; // Used for table-header
}

// --- Helper Functions ---

const getExpectedType = (schema: Value | null, pathParts: string[]): string | undefined => {
    if (!schema) return undefined;
    let current: Value = schema;

    for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        if (!part || part === 'root') continue;

        const isIndexRaw = part.startsWith('[') && part.endsWith(']');
        const isIndex = isIndexRaw || !isNaN(Number(part));
        const cleanPart = isIndexRaw ? part.slice(1, -1) : part;

        if (isIndex && Array.isArray(current)) {
            if (current.length > 0) {
                current = current[0];
            } else {
                return undefined;
            }
        } else if (typeof current === 'object' && current !== null && !Array.isArray(current)) {
            const currentObj = current as Record<string, Value>;
            if (currentObj[cleanPart] !== undefined) {
                current = currentObj[cleanPart];
            } else {
                return undefined;
            }
        } else {
            return undefined;
        }
    }

    if (typeof current === 'string') return current;
    if (current === null) return 'null';
    return undefined;
};

/**
 * EXPORT EXCEL (Staircase / Tree Structure)
 * Single sheet with visual indentation and hidden metadata.
 */
export const handleExportExcel = async (parsedData: Value | null, lockExcel: boolean = false) => {
    if (!parsedData) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Ground Truth');

    const rows: RowData[] = [];

    const traverse = (data: Value, path: string, label: string | number, level: number) => {
        const isArray = Array.isArray(data);
        const isObject = data !== null && typeof data === 'object' && !isArray;

        if (isArray) {
            const isTableMode = data.length > 0 &&
                data.every(item => item !== null && typeof item === 'object' && !Array.isArray(item)) &&
                data.every(item => Object.values(item as any).every(v => v === null || typeof v !== 'object'));

            if (isTableMode) {
                const headers = Array.from(new Set(data.flatMap(item => Object.keys(item))));
                rows.push({ type: 'table-header', path, level, label, columns: headers });
                data.forEach((item, index) => {
                    // Skip the "Row X" label for table rows as well
                    rows.push({ type: 'table-row', path: `${path}~[${index}]`, level, label: "", value: item, columns: headers });
                });
            } else {
                rows.push({ type: 'array', path, level, label });
                data.forEach((item, index) => {
                    traverse(item, `${path}~[${index}]`, `Item ${index + 1}`, level + 1);
                });
            }
        } else if (isObject) {
            // If the label starts with "Item ", this is a generic container for an array element.
            // We skip the label row to keep the spreadsheet dense.
            const isAutoItem = typeof label === 'string' && label.startsWith('Item ');
            if (!isAutoItem) {
                rows.push({ type: 'object', path, level, label });
            }

            Object.entries(data).forEach(([key, val]) => {
                // If we skipped the "Item X" row, keep the same level for the children
                traverse(val, path ? `${path}~${key}` : key, key, isAutoItem ? level : level + 1);
            });
        } else {
            rows.push({ type: 'field', path, level, label, value: data });
        }
    };

    if (parsedData && typeof parsedData === 'object' && !Array.isArray(parsedData)) {
        Object.entries(parsedData).forEach(([key, val]) => {
            traverse(val, `root~${key}`, key, 0);
        });
    } else if (Array.isArray(parsedData)) {
        parsedData.forEach((item, index) => {
            traverse(item, `root~[${index}]`, `Item ${index + 1}`, 0);
        });
    } else {
        traverse(parsedData, 'root', 'Value', 0);
    }

    // Headers (Hidden for clean view, but formatted for completeness)
    const headerRow = worksheet.addRow(['Metadata (Hidden)', 'Field / Keys', 'Value']);
    headerRow.hidden = true;
    headerRow.font = { bold: true, name: 'Segoe UI', size: 10 };
    headerRow.eachCell(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    });

    // Configure grouping behavior for the "+" signs
    worksheet.properties.outlineProperties = {
        summaryBelow: false,
        summaryRight: false,
    };

    if (lockExcel) {
        await worksheet.protect('gt-lock', {
            selectLockedCells: true,
            selectUnlockedCells: true,
            formatCells: false,
            formatColumns: true, // Allow resizing columns
            formatRows: true,    // Allow resizing rows
            insertColumns: false,
            insertRows: false,
            insertHyperlinks: false,
            deleteColumns: false,
            deleteRows: false,
            sort: false,
            autoFilter: false,
            pivotTables: false,
        });
    }

    let lastTableHeader: string | null = null;

    rows.forEach((r, idx) => {
        // We consider a header a "Duplicate" if another header with the exact same 
        // columns and level has already been printed.
        const currentTableHeaderKey = r.type === 'table-header' ? `${r.level}|${r.columns?.join(',')}` : null;
        const isDuplicateHeader = r.type === 'table-header' && currentTableHeaderKey === lastTableHeader;

        if (r.type === 'table-header') {
            lastTableHeader = currentTableHeaderKey;
        } else if (r.type === 'field' || (r.type === 'object' && r.level >= (parseInt(lastTableHeader?.split('|')[0] || "999")))) {
            // Only reset if we hit a leaf field or a deeper structural change.
            // Parent markers like "Item 1", "Item 2" shouldn't reset the "Sticky Header" 
            // of their children.
            lastTableHeader = null;
        }

        // If it's a duplicate header, skip adding the row to Excel entirely
        if (isDuplicateHeader) return;

        const metaString = `${r.type}|${r.path}|${r.level}${r.columns ? `|${r.columns.join(',')}` : ''}`;
        const rowValues: (string | number | boolean | null)[] = [metaString];

        // Visual Indentation: Add empty cells before the label
        for (let i = 0; i < r.level; i++) {
            rowValues.push("");
        }

        if (r.type === 'table-header') {
            rowValues.push(r.label);
            r.columns?.forEach(col => rowValues.push(col));
        } else if (r.type === 'table-row') {
            rowValues.push(""); // Label padding
            r.columns?.forEach(col => {
                let val = r.value[col];
                if (typeof val === 'boolean') val = val ? "TRUE" : "FALSE";
                if (val === null) val = "null";
                if (val === "") val = '""';
                rowValues.push(val);
            });
        } else {
            rowValues.push(r.label);
            if (r.type === 'field') {
                let outVal = r.value;
                if (typeof outVal === 'boolean') outVal = outVal ? "TRUE" : "FALSE";
                if (outVal === null) outVal = "null";
                if (outVal === "") outVal = '""';
                rowValues.push(outVal);
            }
        }

        const excelRow = worksheet.addRow(rowValues);
        excelRow.outlineLevel = r.level;

        // Unified Font and Styling
        excelRow.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF334155' } };

        // Alignment & Interaction
        excelRow.eachCell((cell, colNumber) => {
            cell.alignment = { vertical: 'middle', wrapText: true, horizontal: 'left' };
            // By default everything is locked
            cell.protection = { locked: true };
        });

        const labelCell = excelRow.getCell(r.level + 2);
        const valueCell = excelRow.getCell(r.level + 3);

        if (r.type === 'table-header') {
            labelCell.font = { bold: true, color: { argb: 'FF1E293B' }, name: 'Segoe UI' };
            r.columns?.forEach((col, i) => {
                const headerCell = excelRow.getCell(r.level + 3 + i);
                headerCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI' };
                headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };
                headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
            });
        } else if (r.type === 'table-row') {
            excelRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
            r.columns?.forEach((col, i) => {
                const cell = excelRow.getCell(r.level + 3 + i);
                if (lockExcel) cell.protection = { locked: false };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                };
            });
        } else if (r.type !== 'field') {
            labelCell.font = { bold: true, color: { argb: 'FF1E293B' }, name: 'Segoe UI' };
            excelRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        } else {
            // Primitive Field Value
            if (lockExcel) valueCell.protection = { locked: false };
            valueCell.font = { color: { argb: 'FF0F172A' }, name: 'Segoe UI' };
            valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
            valueCell.border = {
                top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
            };
        }

        // 4. Border Accents for the 'Staircase'
        for (let i = 0; i < r.level; i++) {
            const indentCell = excelRow.getCell(i + 2);
            indentCell.border = {
                left: { style: 'thin', color: { argb: 'FFCBD5E1' } }
            };
        }
    });

    // Finalize worksheet
    // Auto-size columns based on content
    // Note: worksheet.columns is 0-indexed relative to the array, so idx 0 is Column A.
    worksheet.columns.forEach((col, idx) => {
        if (!col) return;

        if (idx === 0) {
            col.hidden = true; // Hide metadata column
            return;
        }
        if (idx === 1) {
            col.width = 15; // Keep indentation column fixed
            return;
        }

        let maxLength = 0;
        if (col.eachCell) {
            col.eachCell({ includeEmpty: true }, (cell) => {
                const val = cell.value ? String(cell.value) : "";
                if (val.length > maxLength) maxLength = val.length;
            });
        }

        // Add a little padding, but cap at 50 to avoid massive columns
        col.width = Math.min(Math.max(maxLength + 2, 12), 50);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, "GroundTruth_Tree.xlsx");
};

/**
 * IMPORT EXCEL (Staircase / Tree Structure)
 * Deterministic reconstruction using metadata.
 */
export const handleImportExcel = async (
    file: File,
    setParsedData: (value: Value | null) => void,
    setJsonInput: (value: string) => void,
    setYamlInput: (value: string) => void,
    schemaData: Value | null,
    setSchemaData: (value: Value | null) => void,
    setSchemaInput: (value: string) => void,
    setError: (value: string | null) => void,
    showNotification: (message: string, severity: AlertColor) => void,
    showConfirmAsync: (message: string) => Promise<boolean>
) => {
    const reader = new FileReader();
    reader.onload = async (evt) => {
        try {
            const buffer = evt.target?.result as ArrayBuffer;
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer);
            const worksheet = workbook.getWorksheet(1);
            if (!worksheet) return;

            let newData: Value | undefined = undefined;
            const activeSchema = schemaData;
            const arrayIndexMap = new Map<string, { realIndex: number, lastSeenExcelIndex: number }>();

            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return; // Header

                const metaCell = row.getCell(1).value;
                if (!metaCell || typeof metaCell !== 'string') return;

                const [type, rawPath, levelStr, columnsStr] = metaCell.split('|');
                if (!rawPath) return;
                const level = parseInt(levelStr || '0');
                const tableColumns = columnsStr ? columnsStr.split(',') : [];

                // Determine Col index for Label and Value
                // Label = level + 2, Value = level + 3
                const labelCol = level + 2;
                const valueCol = level + 3;

                const getCellValue = (col: number) => {
                    const cell = row.getCell(col);
                    const v = cell.value;
                    if (v === undefined) return undefined;
                    return (typeof v === 'object' && v !== null && 'text' in v) ? (v as { text?: string | number | boolean | null }).text : v;
                };

                // Strip root prefix for internal logic
                let path = rawPath;
                if (path.startsWith('root~')) path = path.slice(5);
                else if (path === 'root' && type !== 'field') return;

                // Ensure the structure exists even if there's no value (handles empty arrays/objects)
                const ensureStructure = (rootMap: Record<string, unknown>, rawPath: string) => {
                    const parts = rawPath.split('~');
                    let current = rootMap;
                    let currentPathPrefix = "";

                    for (let i = 0; i < parts.length; i++) {
                        let part = decodeURIComponent(parts[i]);

                        if (part.startsWith('[') && part.endsWith(']')) {
                            const arrayMapKey = currentPathPrefix;
                            let mapping = arrayIndexMap.get(arrayMapKey);
                            const excelIdx = parseInt(part.slice(1, -1));

                            if (!mapping) {
                                mapping = { realIndex: 0, lastSeenExcelIndex: excelIdx };
                                arrayIndexMap.set(arrayMapKey, mapping);
                            } else if (excelIdx !== mapping.lastSeenExcelIndex) {
                                mapping.realIndex++;
                                mapping.lastSeenExcelIndex = excelIdx;
                            }
                            part = "" + mapping.realIndex;
                        }

                        currentPathPrefix += (currentPathPrefix ? "~" : "") + part;

                        if (i < parts.length - 1) {
                            const nextPart = decodeURIComponent(parts[i + 1]);
                            const isNextArray = nextPart.startsWith('[') && nextPart.endsWith(']');
                            if (current[part] === undefined) {
                                current[part] = isNextArray ? [] : {};
                            }
                            current = current[part];
                        } else if (current[part] === undefined) {
                            // Leaf node but no value yet - initialize based on type
                            if (type === 'array') current[part] = [];
                            else if (type === 'object') current[part] = {};
                        }
                    }
                };

                const setValue = (rootMap: Record<string, unknown>, rawPath: string, val: unknown) => {
                    if (val === undefined) return;

                    const parts = rawPath.split('~');
                    let current = rootMap;
                    let currentPathPrefix = "";

                    for (let i = 0; i < parts.length - 1; i++) {
                        let part = decodeURIComponent(parts[i]);

                        if (part.startsWith('[') && part.endsWith(']')) {
                            const arrayMapKey = currentPathPrefix;
                            let mapping = arrayIndexMap.get(arrayMapKey);
                            const excelIdx = parseInt(part.slice(1, -1));

                            if (!mapping) {
                                mapping = { realIndex: 0, lastSeenExcelIndex: excelIdx };
                                arrayIndexMap.set(arrayMapKey, mapping);
                            } else if (excelIdx !== mapping.lastSeenExcelIndex) {
                                mapping.realIndex++;
                                mapping.lastSeenExcelIndex = excelIdx;
                            }
                            part = "" + mapping.realIndex;
                        }

                        currentPathPrefix += (currentPathPrefix ? "~" : "") + part;

                        const nextPart = decodeURIComponent(parts[i + 1]);
                        const isNextArray = nextPart.startsWith('[') && nextPart.endsWith(']');

                        if (current[part] === undefined) {
                            current[part] = isNextArray ? [] : {};
                        }
                        current = current[part];
                    }

                    let lastPart = decodeURIComponent(parts[parts.length - 1]);
                    if (lastPart.startsWith('[') && lastPart.endsWith(']')) {
                        // Array item value
                        const arrayMapKey = currentPathPrefix;
                        let mapping = arrayIndexMap.get(arrayMapKey);
                        const excelIdx = parseInt(lastPart.slice(1, -1));

                        if (!mapping) {
                            mapping = { realIndex: 0, lastSeenExcelIndex: excelIdx };
                            arrayIndexMap.set(arrayMapKey, mapping);
                        } else if (excelIdx !== mapping.lastSeenExcelIndex) {
                            mapping.realIndex++;
                            mapping.lastSeenExcelIndex = excelIdx;
                        }
                        lastPart = "" + mapping.realIndex;
                    }

                    // Process final value (parsing boolean/number strings)
                    let finalVal = val;
                    if (typeof finalVal === 'string') {
                        const t = finalVal.trim();
                        if (t.toUpperCase() === 'TRUE') finalVal = true;
                        else if (t.toUpperCase() === 'FALSE') finalVal = false;
                        else if (t === 'null') finalVal = null;
                        else if (t === '""') finalVal = "";
                    }

                    current[lastPart] = finalVal;
                };

                // Initialize Root
                if (newData === undefined) {
                    newData = path.startsWith('[') ? [] : {};
                }

                // Initial pass to set up keys for all rows (including empty containers)
                ensureStructure(newData, path);

                if (type === 'field') {
                    const rawVal = getCellValue(valueCol);
                    const labelVal = getCellValue(labelCol);

                    let val: unknown = undefined;
                    if (rawVal !== undefined) val = rawVal;
                    else if (labelVal !== undefined && path.includes('~[')) val = labelVal; // Unlabeled array item

                    // Schema-Aware Coercion
                    const expectedType = getExpectedType(activeSchema, path.split('~'));
                    if (val !== undefined && val !== null) {
                        if (expectedType === 'number' && isNaN(Number(val)) === false) val = Number(val);
                        if (expectedType === 'boolean') {
                            const sv = String(val).toUpperCase();
                            if (sv === 'TRUE') val = true;
                            if (sv === 'FALSE') val = false;
                        }
                    }

                    setValue(newData, path, val);
                }
                else if (type === 'table-row') {
                    // Extract multiple values horizontally based on provided columns
                    tableColumns.forEach((colName, idx) => {
                        // Coercion Info
                        const expectedType = getExpectedType(activeSchema, [...path.split('~'), colName]);

                        let val = getCellValue(level + 3 + idx); // Value starts after label column

                        // Skip empty cells (undefined, null, or empty string) to preserve sparse structure.
                        // UNLESS schema explicitly defines it as 'null' (placeholder).
                        if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
                            if (expectedType === 'null') {
                                setValue(newData, `${path}~${colName}`, null);
                            }
                            return;
                        }

                        if (val !== null) {
                            if (expectedType === 'number' && isNaN(Number(val)) === false) val = Number(val);
                            if (expectedType === 'boolean') {
                                const sv = String(val).toUpperCase();
                                if (sv === 'TRUE') val = true;
                                if (sv === 'FALSE') val = false;
                            }
                        }

                        setValue(newData, `${path}~${colName}`, val);
                    });
                }
            });

            // Schema-driven validation and update logic
            if (activeSchema && newData) {
                const result = validateAgainstSchema(newData, activeSchema);
                if (!result.valid) {
                    const errors = result.errors.filter(e => e.includes("Unknown field") || e.includes("Expected"));
                    if (errors.length > 0) {
                        const msg = `Imported data has ${errors.length} structural differences. Update schema?`;
                        if (await showConfirmAsync(msg)) {
                            const paths = errors.map(e => {
                                const p = e.split(":")[0].trim();
                                return p.startsWith('root.') ? p.slice(5) : (p === 'root' ? "" : p);
                            }).filter(p => p !== "");
                            const updated = updateSchemaWithPaths(activeSchema, newData, paths);
                            setSchemaData(updated);
                            setSchemaInput(JSON.stringify(updated, null, 2));
                        }
                    }
                }
            }

            setParsedData(newData);
            setJsonInput(JSON.stringify(newData, null, 2));
            setYamlInput(yaml.dump(newData));
            showNotification("Staircase Import Successful!", "success");

        } catch (err) {
            console.error("Import Error", err);
            showNotification("Error: " + String(err), "error");
        }
    };
    reader.readAsArrayBuffer(file);
};
