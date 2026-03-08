export type Value = string | number | boolean | null | Value[] | { [key: string]: Value };
export type JsonObject = { [key: string]: Value };
export type SchemaTemplate = Value;
export type NotificationSeverity = 'success' | 'error' | 'warning' | 'info';

export interface Template {
    id: string;
    name: string;
    json: string;
    schema: string;
    date: string;
    appScope?: string;
}
