import React from 'react';
import MuiButton from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { useTheme } from '@mui/material/styles';

export function Button({
    children,
    onClick,
    variant = 'primary', // primary, secondary, danger, ghost
    size = 'md', // sm, md, lg
    icon: Icon,
    disabled = false,
    loading = false,
    className = "",
    fullWidth = false,
    ...props
}) {
    const theme = useTheme();

    // Map custom variants to MUI variants/colors
    let muiVariant = 'contained';
    let muiColor = 'primary';
    let sx = {};

    switch (variant) {
        case 'primary':
            muiVariant = 'contained';
            muiColor = 'primary';
            break;
        case 'secondary':
            muiVariant = 'outlined';
            muiColor = 'secondary';
            break;
        case 'danger':
            muiVariant = 'contained';
            muiColor = 'error';
            break;
        case 'success':
            muiVariant = 'contained';
            muiColor = 'success';
            sx = { bgcolor: theme.palette.success.main, '&:hover': { bgcolor: theme.palette.success.dark } };
            break;
        case 'warning':
            muiVariant = 'contained';
            muiColor = 'warning';
            break;
        case 'ghost':
            muiVariant = 'text';
            muiColor = 'inherit';
            break;
        case 'danger-outline':
            muiVariant = 'outlined';
            muiColor = 'error';
            break;
        default:
            muiVariant = 'contained';
            muiColor = 'primary';
    }

    // Map sizes
    const muiSize = size === 'sm' ? 'small' : size === 'lg' ? 'large' : 'medium';

    return (
        <MuiButton
            variant={muiVariant}
            color={muiColor}
            size={muiSize}
            onClick={onClick}
            disabled={disabled || loading}
            startIcon={!loading && Icon ? <Icon size={size === 'sm' ? 16 : 20} /> : null}
            fullWidth={fullWidth}
            sx={{
                ...sx,
                textTransform: 'none',
                boxShadow: variant === 'primary' ? '0 4px 14px 0 rgba(0, 0, 0, 0.1)' : undefined,
            }}
            className={className}
            {...props}
        >
            {loading && <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />}
            {children}
        </MuiButton>
    );
}
