
import Dexie, { Table } from 'dexie';
import { Template } from './components/JsonEditor/types';

export class GroundTruthDatabase extends Dexie {
    templates!: Table<Template>;

    constructor(dbName = 'GroundTruthDB') {
        super(dbName);
        this.version(1).stores({
            templates: 'id, name, date' // Primary key and indexed props
        });
        this.version(2).stores({
            templates: 'id, name, date, appScope'
        });
    }
}

export const db = new GroundTruthDatabase();
const scopedDbCache = new Map<string, GroundTruthDatabase>();

export const getScopedGroundTruthDb = (appScope: string) => {
    const safeScope = (appScope || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '_');
    const dbName = `GroundTruthDB_${safeScope}`;
    const existing = scopedDbCache.get(dbName);
    if (existing) return existing;
    const instance = new GroundTruthDatabase(dbName);
    scopedDbCache.set(dbName, instance);
    return instance;
};

// Merge templates from legacy unscoped DB into the scoped DB for this app.
// Uses bulkPut for idempotent upserts and tags all migrated rows with appScope.
export const migrateLegacyTemplatesToScope = async (
    appScope: string,
    targetDb: GroundTruthDatabase
): Promise<number> => {
    const normalizedScope = appScope || 'anonymous';
    const legacyRows = await db.templates.toArray();
    if (legacyRows.length === 0) return 0;

    const migratedRows: Template[] = legacyRows
        .filter((row) => row && row.id && row.name)
        .map((row) => ({
            ...row,
            appScope: normalizedScope,
        }));

    if (migratedRows.length === 0) return 0;

    const byId = new Map<string, Template>();
    migratedRows.forEach((row) => byId.set(String(row.id), row));
    const deduped = Array.from(byId.values());

    await targetDb.templates.bulkPut(deduped);
    return deduped.length;
};
