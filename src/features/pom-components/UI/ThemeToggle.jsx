import React, { useContext } from 'react';
import { IconButton, useTheme, Tooltip } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { ColorModeContext } from '@/contexts/ColorModeContext';

export function ThemeToggle() {
    const theme = useTheme();
    const colorMode = useContext(ColorModeContext);

    return (
        <Tooltip title={theme.palette.mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
            <IconButton onClick={colorMode.toggleColorMode} color="inherit">
                {theme.palette.mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
        </Tooltip>
    );
}
