import React from 'react';
import { Box, Typography, LinearProgress, alpha } from '@mui/material';

interface MetricSubRowProps {
    label: string;
    value?: any;
    color: string;
}

export const MetricSubRow: React.FC<MetricSubRowProps> = ({ label, value, color }) => {
    const safeVal = (v: any) => {
        const n = parseFloat(v);
        return isNaN(n) ? 0 : n;
    };
    const val = safeVal(value);

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: color }} />
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>{label}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1, justifyContent: 'flex-end', ml: 2 }}>
                <LinearProgress
                    variant="determinate"
                    value={val * 100}
                    sx={{
                        width: 40,
                        height: 4,
                        borderRadius: 2,
                        bgcolor: alpha(color, 0.1),
                        '& .MuiLinearProgress-bar': { bgcolor: color }
                    }}
                />
                <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 700, minWidth: 24, textAlign: 'right' }}>
                    {val.toFixed(2)}
                </Typography>
            </Box>
        </Box>
    );
};
