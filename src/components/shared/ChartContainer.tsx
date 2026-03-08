'use client';

import React from 'react';
import { Box, Paper, Typography } from '@mui/material';

export interface ChartContainerProps {
  children: React.ReactNode;
  /** Optional chart title */
  title?: string;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Fixed height for the chart area (e.g. 300, 400) */
  height?: number;
  /** Disable background/paper styling */
  transparent?: boolean;
}

/**
 * Shared wrapper for charts and data visualizations.
 * Standard spacing, clean background, consistent title/label alignment.
 * Preserves existing chart logic—only wraps for visual consistency.
 */
export const ChartContainer: React.FC<ChartContainerProps> = ({
  children,
  title,
  subtitle,
  height = 300,
  transparent = false,
}) => {
  const content = (
    <Box sx={{ width: '100%', height, minHeight: height, position: 'relative' }}>
      {children}
    </Box>
  );

  return (
    <Box
      sx={{
        width: '100%',
        p: 3,
        borderRadius: '8px',
        ...(transparent
          ? {}
          : {
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: (t) => t.palette.mode === 'light' ? '0 1px 3px rgba(0,0,0,0.04)' : 'none',
            }),
      }}
    >
      {(title || subtitle) && (
        <Box sx={{ mb: 2 }}>
          {title && (
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
              {title}
            </Typography>
          )}
          {subtitle && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      )}
      {content}
    </Box>
  );
};
