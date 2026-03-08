'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import JsonEditor from '@/features/ground-truth/components/JsonEditor/JsonEditor';
import { ErrorBoundary } from '@/features/ground-truth/components/ErrorBoundary/ErrorBoundary';
import { NotificationProvider } from '@/features/ground-truth/components/Notifications/NotificationProvider';

export default function GroundTruthPage() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <Box sx={{ mb: 2, flexShrink: 0 }}>
        <Typography sx={{ fontWeight: 800, fontSize: { xs: '0.95rem', md: '1.1rem' }, letterSpacing: '-0.02em', mb: 0.5, color: 'text.primary' }}>
          Ground Truth Generator
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.85rem' } }}>
          Create and validate high-quality JSON/YAML datasets with schema-aware editing and Excel import/export.
        </Typography>
      </Box>

      <ErrorBoundary>
        <NotificationProvider>
          <JsonEditor />
        </NotificationProvider>
      </ErrorBoundary>
    </Box>
  );
}
