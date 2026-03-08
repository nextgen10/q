/**
 * Security utilities for input sanitization and validation
 */
import { Value } from '@/features/ground-truth/components/JsonEditor/types';

/**
 * Validates JSON structure to prevent prototype pollution attacks
 * @param json - The parsed JSON object to validate
 * @returns true if the structure is safe, false otherwise
 */
export function validateJSONStructure(json: unknown): boolean {
    if (json && typeof json === 'object') {
        const dangerousKeys = ['__proto__', 'constructor', 'prototype'];

        const checkObject = (obj: unknown, depth = 0): boolean => {
            // Prevent deep recursion attacks
            if (depth > 100) {
                return false;
            }
            if (!obj || typeof obj !== 'object') return true;

            for (const key in obj as Record<string, unknown>) {
                if (dangerousKeys.includes(key)) {
                    return false;
                }

                const value = (obj as Record<string, unknown>)[key];
                if (typeof value === 'object' && value !== null) {
                    if (!checkObject(value, depth + 1)) {
                        return false;
                    }
                }
            }
            return true;
        };

        return checkObject(json);
    }
    return true;
}

/**
 * Sanitizes string input by removing potentially dangerous characters
 * @param input - The string to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
    // Remove null bytes and other control characters
    return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Validates and sanitizes JSON input
 * @param input - The JSON string to validate
 * @returns Object with validation result and sanitized/parsed data
 */
export function validateAndSanitizeJSON(input: string): {
    valid: boolean;
    data?: Value;
    error?: string;
} {
    try {
        const sanitized = sanitizeString(input);
        const parsed = JSON.parse(sanitized);

        if (!validateJSONStructure(parsed)) {
            return {
                valid: false,
                error: 'Invalid JSON structure: Potentially dangerous keys detected'
            };
        }

        return {
            valid: true,
            data: parsed
        };
    } catch (error) {
        return {
            valid: false,
            error: error instanceof Error ? error.message : 'Invalid JSON'
        };
    }
}

/**
 * Checks if a value is within safe size limits
 * @param value - The value to check
 * @param maxSizeBytes - Maximum size in bytes (default 5MB)
 * @returns true if within limits, false otherwise
 */
export function isWithinSizeLimit(value: unknown, maxSizeBytes = 5 * 1024 * 1024): boolean {
    const jsonString = JSON.stringify(value);
    const sizeInBytes = new Blob([jsonString]).size;
    return sizeInBytes <= maxSizeBytes;
}
