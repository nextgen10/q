// @ts-nocheck
/**
 * JSON Schema validation utilities
 * Note: This is a lightweight implementation. For production, consider using Ajv library.
 */
import { JsonObject, Value } from '@/features/ground-truth/components/JsonEditor/types';

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

export interface ValidationError {
    path: string;
    message: string;
    expected?: string;
    received?: string;
}

/**
 * Validates data against a schema template
 * @param data - The data to validate
 * @param schema - The schema template to validate against
 * @returns Validation result with errors if any
 */
export function validateAgainstSchema(data: Value, schema: Value): ValidationResult {
    const errors: string[] = [];

    function validate(value: Value, template: Value, path: string = 'root'): void {
        // Handle null values
        if (template === null) {
            if (value !== null) {
                errors.push(`${path}: Expected null, got ${typeof value}`);
            }
            return;
        }

        // Type checking
        let templateType = Array.isArray(template) ? 'array' : typeof template;
        const valueType = Array.isArray(value) ? 'array' : typeof value;

        // Support type keywords in template (e.g., "number", "boolean")
        const typeKeywords = ['string', 'number', 'boolean', 'object', 'array'];
        if (templateType === 'string' && typeKeywords.includes(template)) {
            templateType = template;
        }

        if (templateType !== valueType) {
            errors.push(`${path}: Expected ${templateType}, got ${valueType}`);
            return;
        }

        // Validate arrays
        if (Array.isArray(template) && Array.isArray(value)) {
            if (template.length === 0) {
                return; // Empty array template accepts any array
            }

            const itemTemplate = template[0];
            value.forEach((item, index) => {
                validate(item, itemTemplate, `${path}[${index}]`);
            });
            return;
        }

        // Validate objects
        if (typeof template === 'object' && template !== null) {
            if (typeof value !== 'object' || value === null) {
                errors.push(`${path}: Expected object, got ${typeof value}`);
                return;
            }

            // Check for required keys
            for (const key in template) {
                if (!(key in value)) {
                    errors.push(`${path}.${key}: Missing required field`);
                } else {
                    validate(value[key], template[key], `${path}.${key}`);
                }
            }

            // Check for unknown keys
            for (const key in value) {
                if (!(key in template)) {
                    errors.push(`${path}.${key}: Unknown field (not in schema)`);
                }
            }
        }
    }

    try {
        validate(data, schema);
        return {
            valid: errors.length === 0,
            errors
        };
    } catch (error) {
        return {
            valid: false,
            errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
        };
    }
}

/**
 * Converts a simple template to JSON Schema format (draft-07)
 * @param template - The template object to convert
 * @returns JSON Schema object
 */
export function convertToJSONSchema(template: Value): Record<string, unknown> {
    function convertValue(value: Value): Record<string, unknown> {
        if (value === null) {
            return { type: 'null' };
        }

        if (typeof value === 'string') {
            const typeKeywords = ['string', 'number', 'boolean', 'object', 'array'];
            if (typeKeywords.includes(value)) {
                return { type: value };
            }
            return { type: 'string' };
        }

        if (typeof value === 'number') {
            return { type: 'number' };
        }

        if (typeof value === 'boolean') {
            return { type: 'boolean' };
        }

        if (Array.isArray(value)) {
            return {
                type: 'array',
                items: value.length > 0 ? convertValue(value[0]) : {}
            };
        }

        if (typeof value === 'object') {
            const properties: Record<string, unknown> = {};
            const required: string[] = [];

            for (const key in value as JsonObject) {
                properties[key] = convertValue((value as JsonObject)[key]);
                required.push(key);
            }

            return {
                type: 'object',
                properties,
                required,
                additionalProperties: false
            };
        }

        return {};
    }

    return {
        $schema: 'http://json-schema.org/draft-07/schema#',
        ...convertValue(template)
    };
}

/**
 * Gets a human-readable type name
 * @param value - The value to get type for
 * @returns Type name as string
 */
export function getTypeName(value: Value): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
}

/**
 * Validates field-level constraints (for future enhancement)
 * @param value - The value to validate
 * @param constraints - Validation constraints
 * @returns Validation result
 */
export function validateFieldConstraints(
    value: Value,
    constraints: {
        required?: boolean;
        min?: number;
        max?: number;
        pattern?: string;
        minLength?: number;
        maxLength?: number;
    }
): ValidationResult {
    const errors: string[] = [];

    if (constraints.required && (value === null || value === undefined || value === '')) {
        errors.push('This field is required');
    }

    if (typeof value === 'number') {
        if (constraints.min !== undefined && value < constraints.min) {
            errors.push(`Value must be at least ${constraints.min}`);
        }
        if (constraints.max !== undefined && value > constraints.max) {
            errors.push(`Value must be at most ${constraints.max}`);
        }
    }

    if (typeof value === 'string') {
        if (constraints.minLength !== undefined && value.length < constraints.minLength) {
            errors.push(`Length must be at least ${constraints.minLength} characters`);
        }
        if (constraints.maxLength !== undefined && value.length > constraints.maxLength) {
            errors.push(`Length must be at most ${constraints.maxLength} characters`);
        }
        if (constraints.pattern) {
            const regex = new RegExp(constraints.pattern);
            if (!regex.test(value)) {
                errors.push(`Value does not match required pattern`);
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
