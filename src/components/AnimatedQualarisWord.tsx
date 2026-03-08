'use client';

import React from 'react';
import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

interface AnimatedQualarisWordProps {
    withDots?: boolean;
    sx?: SxProps<Theme>;
}

export default function AnimatedQualarisWord({ withDots = true, sx }: AnimatedQualarisWordProps) {
    const letters = 'QUALARIS'.split('');

    return (
        <Box
            component="span"
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                fontWeight: 700,
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
                ...sx,
            }}
        >
            {letters.map((char, idx) => (
                <React.Fragment key={`${char}-${idx}`}>
                    <Box
                        component="span"
                        sx={{
                            display: 'inline-block',
                            color: idx % 2 === 0 ? 'primary.main' : 'text.primary',
                            '@keyframes qualarisWave': {
                                '0%, 100%': { transform: 'translateY(0px)', opacity: 0.95 },
                                '50%': { transform: 'translateY(-1.5px)', opacity: 1 },
                            },
                            animation: 'qualarisWave 1.6s ease-in-out infinite',
                            animationDelay: `${idx * 0.08}s`,
                        }}
                    >
                        {char}
                    </Box>
                    {withDots && idx < letters.length - 1 && (
                        <Box
                            component="span"
                            sx={{
                                display: 'inline-block',
                                mx: 0.18,
                                color: idx % 2 === 0 ? 'text.primary' : 'primary.main',
                                opacity: 0.85,
                                fontWeight: 700,
                            }}
                        >
                            &middot;
                        </Box>
                    )}
                </React.Fragment>
            ))}
        </Box>
    );
}
