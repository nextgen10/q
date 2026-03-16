import React from 'react';
import { Box, Paper, Typography, alpha } from '@mui/material';

interface MetricExplanationCardProps {
  title: string;
  description: string;
  details: string;
  example?: string;
  color: string;
  icon: React.ReactNode;
}

export function MetricExplanationCard({
  title,
  description,
  details,
  example,
  color,
  icon,
}: MetricExplanationCardProps) {
  return (
    <Paper
      sx={{
        minHeight: 200,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        maxWidth: '96%',
        mx: 'auto',
        p: 3,
        borderRadius: 3,
        bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'),
        border: (theme) => `1px solid ${theme.palette.divider}`,
        transition: 'all 0.3s ease',
        '&:hover': {
          bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'),
          borderColor: alpha(color, 0.4),
          transform: 'translateY(-2px)',
          boxShadow: `0 10px 40px -10px ${alpha(color, 0.2)}`,
        },
      }}
    >
      <Box sx={{ display: 'flex', gap: 3 }}>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: alpha(color, 0.1),
            color,
            height: 'fit-content',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, color: 'text.primary' }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6, fontSize: '0.9rem' }}>
            {description}
          </Typography>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)'),
              borderLeft: `3px solid ${color}`,
            }}
          >
            <Typography
              variant="caption"
              sx={{ color, fontWeight: 900, textTransform: 'uppercase', display: 'block', mb: 0.5 }}
            >
              Architectural Note
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.8rem', opacity: 0.8, fontStyle: 'italic' }}>
              {details}
            </Typography>
          </Box>
          {example && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                borderRadius: 2,
                bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'),
                border: (theme) => `1px dashed ${theme.palette.divider}`,
              }}
            >
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase', display: 'block', mb: 1 }}
              >
                Real-World Application Example
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.5 }}>
                {example}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Paper>
  );
}
