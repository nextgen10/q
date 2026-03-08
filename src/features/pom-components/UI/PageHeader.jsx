"use client";
import React from 'react';
import { Box, Typography, alpha } from '@mui/material';
import { ThemeToggle } from './ThemeToggle';

export function PageHeader({ title, description, children }) {
    return (
        <Box sx={{
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 40,
            borderBottom: '1px solid',
            borderColor: 'divider',
            px: 4,
            bgcolor: 'background.paper',
        }}>
            <Box>
                <Typography
                    variant="h5"
                    sx={{
                        fontWeight: 700,
                        background: 'linear-gradient(45deg, #D00000, #D00000)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '-0.02em',
                        fontSize: '1.25rem'
                    }}
                >
                    {title}
                </Typography>
                {description && (
                    <Typography
                        variant="body2"
                        sx={{
                            mt: 0.25,
                            color: 'text.secondary',
                            fontWeight: 500,
                            fontSize: '0.8125rem'
                        }}
                    >
                        {description}
                    </Typography>
                )}
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                {children}
            </Box>
        </Box>
    );
}
