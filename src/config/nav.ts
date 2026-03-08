/**
 * Central navigation configuration for the unified application.
 * Single source of truth for menu structure across layouts.
 */

import type { LucideIcon } from 'lucide-react';

export interface NavItem {
    id: string;
    label: string;
    path: string;
    icon?: LucideIcon;
}

// Agent Eval section navigation
export const agentEvalNavItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', path: '/agent-eval/dashboard' },
    { id: 'test-evaluations', label: 'Experiments', path: '/agent-eval/test-evaluations' },
    { id: 'history', label: 'History', path: '/agent-eval/history' },
    { id: 'prompts', label: 'Prompts', path: '/agent-eval/prompts' },
    { id: 'configuration', label: 'Configuration', path: '/agent-eval/configuration' },
];
