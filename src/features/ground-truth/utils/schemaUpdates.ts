
import { JsonObject, Value } from '@/features/ground-truth/components/JsonEditor/types';

/**
 * Utility to identify keys in data that are not present in the schema
 */
export const getUnknownPaths = (obj: unknown, schema: unknown, path: string = ""): string[] => {
    const errs: string[] = [];
    if (obj === null || typeof obj !== 'object') return [];
    if (schema === null || typeof schema !== 'object') return [];

    if (Array.isArray(obj)) {
        if (Array.isArray(schema) && schema.length > 0) {
            const schemaItem = schema[0];
            obj.forEach((item, idx) => {
                errs.push(...getUnknownPaths(item, schemaItem, path ? `${path}[${idx}]` : `[${idx}]`));
            });
        }
        return errs;
    }

    const keys = Object.keys(obj);
    const schemaKeys = Object.keys(schema);

    keys.forEach(k => {
        const currentPath = path ? `${path}.${k}` : k;
        if (!schemaKeys.includes(k)) {
            errs.push(currentPath);
        } else {
            errs.push(...getUnknownPaths((obj as Record<string, unknown>)[k], (schema as Record<string, unknown>)[k], currentPath));
        }
    });

    return errs;
};

/**
 * Utility to update a schema by adding unknown paths found in data
 */
export const updateSchemaWithPaths = (schema: Value | null, data: Value | null, unknownPaths: string[]): Value => {
    // Start with a clean deep copy
    let newSchema: unknown = JSON.parse(JSON.stringify(schema || {}));

    unknownPaths.forEach(fullPath => {
        let cleanPath = fullPath;
        if (cleanPath === 'root') return;

        // 1. Strip the "root" prefix
        if (cleanPath.startsWith('root.')) cleanPath = cleanPath.slice(5);
        else if (cleanPath.startsWith('root[')) cleanPath = cleanPath.slice(4);

        // 2. Normalize array access: [0] -> .0
        cleanPath = cleanPath.replace(/\[(\d+)\]/g, '.$1');
        if (cleanPath.startsWith('.')) cleanPath = cleanPath.slice(1);

        const pathParts = cleanPath.split('.').filter(p => p !== "");
        if (pathParts.length === 0) return;

        // 3. Handle Root Level Array mismatch
        // If the path starts with an index (e.g., "0.field") but schema is an object, fix it
        if (!isNaN(Number(pathParts[0])) && !Array.isArray(newSchema)) {
            newSchema = [{}];
        }

        let schemaCursor: unknown = newSchema;
        let dataCursor: unknown = data;

        for (let i = 0; i < pathParts.length; i++) {
            const part = pathParts[i];
            const isLast = i === pathParts.length - 1;
            const isPartNum = !isNaN(Number(part));

            // Traverse Data Cursor to get the value for type inference
            if (dataCursor !== null && typeof dataCursor === 'object') {
                if (isPartNum && Array.isArray(dataCursor)) {
                    dataCursor = dataCursor[Number(part)];
                } else {
                    dataCursor = (dataCursor as Record<string, unknown>)[part];
                }
            } else {
                dataCursor = null; // Path doesn't exist in data
            }

            if (isLast) {
                // Leaf Node: Assign inferred type
                if (isPartNum && Array.isArray(schemaCursor)) {
                    schemaCursor[0] = inferSchema(dataCursor as Value);
                } else {
                    (schemaCursor as Record<string, Value>)[part] = inferSchema(dataCursor as Value);
                }
            } else {
                // Intermediate Node: Ensure structure exists
                const nextPart = pathParts[i + 1];
                const isNextNum = !isNaN(Number(nextPart));

                if (isPartNum && Array.isArray(schemaCursor)) {
                    // We are at an array index. The schema definition is at index 0.
                    if (!schemaCursor[0] || typeof schemaCursor[0] !== 'object' || (isNextNum !== Array.isArray(schemaCursor[0]))) {
                        schemaCursor[0] = isNextNum ? [{}] : {};
                    }
                    schemaCursor = schemaCursor[0];
                } else {
                    // Object key
                    const schemaObject = schemaCursor as Record<string, unknown>;
                    if (!schemaObject[part] || typeof schemaObject[part] !== 'object' || (isNextNum !== Array.isArray(schemaObject[part]))) {
                        schemaObject[part] = isNextNum ? [{}] : {};
                    }
                    schemaCursor = schemaObject[part];
                }
            }
        }
    });

    return newSchema as Value;
};

/**
 * Utility to recursively infer a schema template (type skeleton) from data
 */
/**
 * Utility to recursively infer a schema template (type skeleton) from data
 * Upgraded to "Smart Merge": Scans ALL array items to build a superset schema.
 */
export const inferSchema = (data: Value): Value => {
    if (data === null) return null;

    if (Array.isArray(data)) {
        if (data.length === 0) return ["string"]; // Default for empty array

        // Merge schema of ALL items in the array to create a comprehensive template
        let mergedSchema: Value | null = null;

        for (const item of data) {
            const itemSchema = inferSchema(item);
            if (!mergedSchema) {
                mergedSchema = itemSchema;
            } else {
                mergedSchema = mergeSchemas(mergedSchema, itemSchema);
            }
        }
        return [mergedSchema];
    }

    if (typeof data === 'object') {
        const schema: JsonObject = {};
        for (const key in data) {
            schema[key] = inferSchema((data as JsonObject)[key]);
        }
        return schema;
    }

    // Return the type name
    return typeof data;
};

/**
 * Helper to merge two schemas (union of keys)
 */
const mergeSchemas = (a: Value, b: Value): Value => {
    // If types match exactly, or one is null (which is a placeholder match), try to merge deeper
    if (a === null && b !== null) return b;
    if (b === null && a !== null) return a;
    if (a === null && b === null) return null;

    // If both are objects, merge their keys
    if (typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
        const merged: JsonObject = { ...(a as JsonObject) };
        for (const key in (b as JsonObject)) {
            if (key in merged) {
                // Recursive merge for existing keys
                merged[key] = mergeSchemas(merged[key], (b as JsonObject)[key]);
            } else {
                // Add new key from b
                merged[key] = (b as JsonObject)[key];
            }
        }
        return merged;
    }

    // If both are arrays, merge their inner structure
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length > 0 && b.length > 0) {
            return [mergeSchemas(a[0], b[0])];
        }
        return a.length > 0 ? a : b;
    }

    // If types mismatch (e.g. number vs string), prefer the more specific one or default to 'string'
    // For this simple generator, if they differ, we simply keep 'a' (the incumbent) unless 'a' is null.
    // Ideally we could return 'mixed' or a union type, but we keep it simple for now.
    return a;
};
