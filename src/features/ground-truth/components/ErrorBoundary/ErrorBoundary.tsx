'use client';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
        this.setState({ errorInfo });
        // TODO: Send to error reporting service (e.g., Sentry)
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        minHeight: '100vh',
                        p: 3,
                        bgcolor: 'background.default'
                    }}
                >
                    <Paper
                        sx={{
                            p: 4,
                            maxWidth: 600,
                            textAlign: 'center',
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            boxShadow: 3
                        }}
                    >
                        <Box sx={{ mb: 2, fontSize: 64 }}>⚠️</Box>
                        <Typography variant="h5" gutterBottom fontWeight={600}>
                            Something went wrong
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            {this.state.error?.message || 'An unexpected error occurred'}
                        </Typography>
                        {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                            <Box
                                sx={{
                                    mt: 2,
                                    p: 2,
                                    bgcolor: 'action.hover',
                                    borderRadius: 1,
                                    textAlign: 'left',
                                    maxHeight: 200,
                                    overflow: 'auto',
                                    fontFamily: 'monospace',
                                    fontSize: 12
                                }}
                            >
                                <Typography variant="caption" component="pre">
                                    {this.state.errorInfo.componentStack}
                                </Typography>
                            </Box>
                        )}
                        <Button
                            variant="contained"
                            onClick={this.handleReset}
                            sx={{ mt: 2 }}
                        >
                            Try Again
                        </Button>
                    </Paper>
                </Box>
            );
        }

        return this.props.children;
    }
}
