'use client';

import React from 'react';
import { Box, Paper, Typography, alpha, useTheme } from '@mui/material';

export interface MetricCardProps {
  /** Label (secondary text, e.g. "Total Evaluations") */
  label: string;
  /** Primary value to display */
  value: React.ReactNode;
  /** Optional icon */
  icon?: React.ReactNode;
  /** Optional subtitle below value */
  subtitle?: string;
  /** Optional trend indicator (e.g. "+12%", "-5%") */
  trend?: string | null;
  /** Optional custom color for trend */
  trendColor?: 'success' | 'error' | 'warning' | 'info';
}

/**
 * Unified metric / KPI card for dashboards.
 * Clean surface, clear typography hierarchy, consistent spacing.
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  icon,
  subtitle,
  trend,
  trendColor,
}) => {
  const theme = useTheme();

  const resolveTrendColor = () => {
    if (trendColor) return `${trendColor}.main`;
    if (!trend) return 'text.secondary';
    if (trend.startsWith('+')) return 'success.main';
    if (trend.startsWith('-')) return 'error.main';
    return 'text.secondary';
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        height: '100%',
        minHeight: 84,
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: 'primary.main',
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
          boxShadow: theme.palette.mode === 'light' 
            ? '0 4px 12px rgba(0,0,0,0.08)' 
            : '0 4px 12px rgba(0,0,0,0.3)',
          '& .metric-icon': {
            transform: 'scale(1.1)',
          }
        },
      }}
    >
      {/* Background gradient accent */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 80,
          height: 80,
          background: `radial-gradient(circle at top right, ${alpha(theme.palette.primary.main, 0.05)}, transparent)`,
          pointerEvents: 'none',
        }}
      />

      <Box sx={{ position: 'relative', zIndex: 1, pl: 1.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
          <Typography
            variant="overline"
            sx={{
              color: 'text.secondary',
              fontWeight: 700,
              letterSpacing: '0.05em',
              fontSize: { xs: '0.62rem', md: '0.68rem' },
              lineHeight: 1,
              textTransform: 'uppercase',
            }}
          >
            {label}
          </Typography>
          {icon && (
            <Box 
              className="metric-icon"
              sx={{ 
                color: 'primary.main',
                display: 'flex',
                opacity: 0.8,
                transition: 'transform 0.2s ease',
                pr: 0.5,
              }}
            >
              {React.isValidElement(icon)
                ? React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 24 })
                : icon}
            </Box>
          )}
        </Box>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            color: 'text.primary',
            fontSize: { xs: '1.15rem', md: '1.35rem' },
            mb: 0.35,
            lineHeight: 1.15,
          }}
        >
          {value}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 'auto', flexWrap: 'wrap', position: 'relative', zIndex: 1, pl: 1.25 }}>
        {trend && (
          <Typography
            variant="caption"
            sx={{
              color: resolveTrendColor(),
              fontWeight: 700,
              bgcolor: (t) =>
                alpha(
                  trend.startsWith('+')
                    ? t.palette.success.main
                    : trend.startsWith('-')
                      ? t.palette.error.main
                      : t.palette.text.secondary,
                  0.12
                ),
              px: 0.65,
              py: 0.2,
              borderRadius: 0.75,
              fontSize: { xs: '0.64rem', md: '0.68rem' },
            }}
          >
            {trend}
          </Typography>
        )}
        {subtitle && (
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontSize: { xs: '0.64rem', md: '0.68rem' },
              fontWeight: 500,
              lineHeight: 1.25,
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};
