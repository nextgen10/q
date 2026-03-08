import { Backdrop, CircularProgress, Typography, Box } from '@mui/material';

interface LoadingOverlayProps {
    open: boolean;
    message?: string;
}

export function LoadingOverlay({ open, message = 'Loading...' }: LoadingOverlayProps) {
    return (
        <Backdrop
            sx={{
                color: 'primary.contrastText',
                zIndex: (theme) => theme.zIndex.drawer + 1,
                flexDirection: 'column',
                gap: 2,
                backdropFilter: 'blur(4px)',
                backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(8, 8, 8, 0.72)' : 'rgba(18, 18, 18, 0.6)'
            }}
            open={open}
        >
            <CircularProgress color="inherit" size={48} />
            <Typography variant="body1" fontWeight={500}>{message}</Typography>
        </Backdrop>
    );
}
