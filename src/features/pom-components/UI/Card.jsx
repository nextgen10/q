import React from 'react';
import MuiCard from '@mui/material/Card';
import MuiCardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export function Card({ children, className = "", ...props }) {
    return (
        <MuiCard className={className} {...props}>
            {children}
        </MuiCard>
    );
}

export function CardHeader({ title, subtitle, icon: Icon, action }) {
    return (
        <Box sx={{
            p: 3,
            borderBottom: '1px solid rgba(255,255,255,0.12)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start'
        }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
                {Icon && (
                    <Box sx={{
                        p: 1,
                        borderRadius: 1,
                        bgcolor: 'rgba(208, 0, 0, 0.1)',
                        color: 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Icon size={20} />
                    </Box>
                )}
                <Box>
                    <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
                        {title}
                    </Typography>
                    {subtitle && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {subtitle}
                        </Typography>
                    )}
                </Box>
            </Box>
            {action && <Box>{action}</Box>}
        </Box>
    );
}

export function CardContent({ children, className = "" }) {
    return (
        <MuiCardContent className={className} sx={{ p: 3, '&:last-child': { pb: 3 } }}>
            {children}
        </MuiCardContent>
    );
}
