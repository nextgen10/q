import { validateAgainstSchema, convertToJSONSchema, validateFieldConstraints } from '../schemaValidator';

describe('schemaValidator', () => {
    describe('validateAgainstSchema', () => {
        it('should validate matching data and schema', () => {
            const schema = { name: '', age: 0 };
            const data = { name: 'John', age: 30 };
            const result = validateAgainstSchema(data, schema);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should detect type mismatches', () => {
            const schema = { name: '', age: 0 };
            const data = { name: 'John', age: 'thirty' };
            const result = validateAgainstSchema(data, schema);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        it('should detect missing required fields', () => {
            const schema = { name: '', age: 0, email: '' };
            const data = { name: 'John', age: 30 };
            const result = validateAgainstSchema(data, schema);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('email'))).toBe(true);
        });

        it('should detect unknown fields', () => {
            const schema = { name: '', age: 0 };
            const data = { name: 'John', age: 30, extra: 'field' };
            const result = validateAgainstSchema(data, schema);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('extra'))).toBe(true);
        });

        it('should validate arrays', () => {
            const schema = { items: [{ id: 0, name: '' }] };
            const data = { items: [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }] };
            const result = validateAgainstSchema(data, schema);
            expect(result.valid).toBe(true);
        });

        it('should validate nested objects', () => {
            const schema = {
                user: {
                    name: '',
                    address: {
                        street: '',
                        city: ''
                    }
                }
            };
            const data = {
                user: {
                    name: 'John',
                    address: {
                        street: '123 Main St',
                        city: 'New York'
                    }
                }
            };
            const result = validateAgainstSchema(data, schema);
            expect(result.valid).toBe(true);
        });

        it('should handle null values', () => {
            const schema = { value: null };
            const data = { value: null };
            const result = validateAgainstSchema(data, schema);
            expect(result.valid).toBe(true);
        });
    });

    describe('convertToJSONSchema', () => {
        it('should convert simple object to JSON Schema', () => {
            const template = { name: '', age: 0 };
            const schema = convertToJSONSchema(template);
            expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
            expect(schema.type).toBe('object');
            expect(schema.properties.name.type).toBe('string');
            expect(schema.properties.age.type).toBe('number');
        });

        it('should handle arrays in schema', () => {
            const template = { items: [{ id: 0 }] };
            const schema = convertToJSONSchema(template);
            expect(schema.properties.items.type).toBe('array');
            expect(schema.properties.items.items.type).toBe('object');
        });

        it('should handle nested objects', () => {
            const template = {
                user: {
                    name: '',
                    settings: {
                        theme: ''
                    }
                }
            };
            const schema = convertToJSONSchema(template);
            expect(schema.properties.user.type).toBe('object');
            expect(schema.properties.user.properties.settings.type).toBe('object');
        });

        it('should handle all primitive types', () => {
            const template = {
                str: '',
                num: 0,
                bool: true,
                nil: null
            };
            const schema = convertToJSONSchema(template);
            expect(schema.properties.str.type).toBe('string');
            expect(schema.properties.num.type).toBe('number');
            expect(schema.properties.bool.type).toBe('boolean');
            expect(schema.properties.nil.type).toBe('null');
        });
    });

    describe('validateFieldConstraints', () => {
        it('should validate required fields', () => {
            const result = validateFieldConstraints('', { required: true });
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('required'))).toBe(true);
        });

        it('should validate number min/max', () => {
            let result = validateFieldConstraints(5, { min: 10 });
            expect(result.valid).toBe(false);

            result = validateFieldConstraints(15, { max: 10 });
            expect(result.valid).toBe(false);

            result = validateFieldConstraints(10, { min: 5, max: 15 });
            expect(result.valid).toBe(true);
        });

        it('should validate string length', () => {
            let result = validateFieldConstraints('hi', { minLength: 5 });
            expect(result.valid).toBe(false);

            result = validateFieldConstraints('hello world', { maxLength: 5 });
            expect(result.valid).toBe(false);

            result = validateFieldConstraints('hello', { minLength: 3, maxLength: 10 });
            expect(result.valid).toBe(true);
        });

        it('should validate pattern', () => {
            const emailPattern = '^[^@]+@[^@]+\\.[^@]+$';

            let result = validateFieldConstraints('invalid-email', { pattern: emailPattern });
            expect(result.valid).toBe(false);

            result = validateFieldConstraints('valid@email.com', { pattern: emailPattern });
            expect(result.valid).toBe(true);
        });
    });
});
