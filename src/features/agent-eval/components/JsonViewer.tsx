import React, { useState } from 'react';
import { Fab, Tooltip, Dialog, DialogTitle, DialogContent, IconButton, Box, Typography, useTheme } from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import CloseIcon from '@mui/icons-material/Close';

interface JsonViewerProps {
    data: any;
}

export default function JsonViewer({ data }: JsonViewerProps) {
    const [open, setOpen] = useState(false);
    const theme = useTheme();

    const jsonString = JSON.stringify(data, null, 2);
    const previewString = jsonString.slice(0, 500) + (jsonString.length > 500 ? '...' : '');

    return (
        <>
            <Tooltip
                title={
                    <Box sx={{ p: 1, maxHeight: 300, overflow: 'hidden' }}>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                            {previewString}
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ mt: 1, fontStyle: 'italic' }}>
                            Click to view full JSON
                        </Typography>
                    </Box>
                }
                placement="left"
                arrow
            >
                <Fab
                    color="primary"
                    aria-label="view-json"
                    onClick={() => setOpen(true)}
                    sx={{ position: 'fixed', bottom: 32, right: 32 }}
                >
                    <CodeIcon />
                </Fab>
            </Tooltip>

            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                maxWidth="lg"
                fullWidth
                scroll="paper"
            >
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" component="div">Full Results JSON</Typography>
                    <IconButton
                        aria-label="close"
                        onClick={() => setOpen(false)}
                        sx={{ color: (theme) => theme.palette.grey[500] }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Box
                        component="pre"
                        sx={{
                            p: 2,
                            m: 0,
                            bgcolor: 'background.paper',
                            borderRadius: 1,
                            overflow: 'auto',
                            fontFamily: 'monospace',
                            fontSize: '0.875rem'
                        }}
                    >
                        {jsonString}
                    </Box>
                </DialogContent>
            </Dialog>
        </>
    );
}
