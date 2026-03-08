import { JsonObject, Value } from './types';

const toObject = (value: Value | undefined): JsonObject =>
    value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};

export const setValue = (obj: Value, path: (string | number)[], value: Value): Value => {
    if (path.length === 0) return value;
    const [head, ...tail] = path;
    if (Array.isArray(obj)) {
        const newArr = [...obj];
        const index = Number(head);
        newArr[index] = setValue(obj[index] as Value, tail, value);
        return newArr;
    }
    const source = toObject(obj);
    return { ...source, [head]: setValue((source[head as string] ?? {}) as Value, tail, value) };
};

export const removeValue = (obj: Value, path: (string | number)[]): Value | undefined => {
    if (path.length === 0) return undefined;
    const [head, ...tail] = path;
    if (path.length === 1) {
        if (Array.isArray(obj)) return obj.filter((_, i) => i !== head);
        const source = toObject(obj);
        const newObj: JsonObject = { ...source };
        delete newObj[head];
        return newObj;
    }
    if (Array.isArray(obj)) {
        const newArr = [...obj];
        const index = Number(head);
        newArr[index] = removeValue(obj[index] as Value, tail) as Value;
        return newArr;
    }
    const source = toObject(obj);
    return { ...source, [head]: removeValue(source[head as string] as Value, tail) as Value };
};
