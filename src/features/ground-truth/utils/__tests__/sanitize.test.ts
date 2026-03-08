import { validateJSONStructure, sanitizeString, validateAndSanitizeJSON, isWithinSizeLimit } from '../sanitize';

describe('sanitize utilities', () => {
    describe('validateJSONStructure', () => {
        it('should accept safe JSON objects', () => {
            const safeObject = { name: 'John', age: 30, hobbies: ['reading', 'coding'] };
            expect(validateJSONStructure(safeObject)).toBe(true);
        });

        it('should reject objects with __proto__', () => {
            const dangerousObject = { __proto__: { isAdmin: true } };
            expect(validateJSONStructure(dangerousObject)).toBe(false);
        });

        it('should reject objects with constructor', () => {
            const dangerousObject = { constructor: { prototype: {} } };
            expect(validateJSONStructure(dangerousObject)).toBe(false);
        });

        it('should reject objects with prototype', () => {
            const dangerousObject = { prototype: { isAdmin: true } };
            expect(validateJSONStructure(dangerousObject)).toBe(false);
        });

        it('should handle nested objects', () => {
            const nestedObject = {
                user: {
                    name: 'John',
                    settings: {
                        theme: 'dark'
                    }
                }
            };
            expect(validateJSONStructure(nestedObject)).toBe(true);
        });

        it('should reject deeply nested dangerous keys', () => {
            const dangerousNested = {
                user: {
                    settings: {
                        __proto__: { isAdmin: true }
                    }
                }
            };
            expect(validateJSONStructure(dangerousNested)).toBe(false);
        });

        it('should handle primitives', () => {
            expect(validateJSONStructure('string')).toBe(true);
            expect(validateJSONStructure(123)).toBe(true);
            expect(validateJSONStructure(true)).toBe(true);
            expect(validateJSONStructure(null)).toBe(true);
        });
    });

    describe('sanitizeString', () => {
        it('should remove control characters', () => {
            const input = 'Hello\x00World\x1F';
            const result = sanitizeString(input);
            expect(result).toBe('HelloWorld');
        });

        it('should preserve normal characters', () => {
            const input = 'Hello World! 123';
            const result = sanitizeString(input);
            expect(result).toBe(input);
        });

        it('should preserve newlines and tabs', () => {
            const input = 'Hello\nWorld\t!';
            const result = sanitizeString(input);
            expect(result).toBe(input);
        });
    });

    describe('validateAndSanitizeJSON', () => {
        it('should parse valid JSON', () => {
            const input = '{"name": "John", "age": 30}';
            const result = validateAndSanitizeJSON(input);
            expect(result.valid).toBe(true);
            expect(result.data).toEqual({ name: 'John', age: 30 });
        });

        it('should reject invalid JSON', () => {
            const input = '{invalid json}';
            const result = validateAndSanitizeJSON(input);
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should reject JSON with dangerous keys', () => {
            const input = '{"__proto__": {"isAdmin": true}}';
            const result = validateAndSanitizeJSON(input);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('dangerous keys');
        });

        it('should sanitize control characters', () => {
            const input = '{"name": "John\x00Doe"}';
            const result = validateAndSanitizeJSON(input);
            expect(result.valid).toBe(true);
            expect(result.data.name).toBe('JohnDoe');
        });
    });

    describe('isWithinSizeLimit', () => {
        it('should accept small objects', () => {
            const smallObject = { name: 'John' };
            expect(isWithinSizeLimit(smallObject)).toBe(true);
        });

        it('should reject objects exceeding size limit', () => {
            const largeString = 'x'.repeat(6 * 1024 * 1024); // 6MB
            const largeObject = { data: largeString };
            expect(isWithinSizeLimit(largeObject)).toBe(false);
        });

        it('should respect custom size limit', () => {
            const object = { data: 'x'.repeat(1000) };
            expect(isWithinSizeLimit(object, 500)).toBe(false);
            expect(isWithinSizeLimit(object, 2000)).toBe(true);
        });
    });
});
