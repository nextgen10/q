import React from 'react';
import { Box, Pagination, PaginationItem, alpha } from '@mui/material';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface PaginationControlProps {
    count: number;
    page: number;
    onChange: (event: React.ChangeEvent<unknown>, value: number) => void;
    sx?: any;
}

export const PaginationControl: React.FC<PaginationControlProps> = ({ count, page, onChange, sx }) => {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2, ...sx }}>
            <Pagination
                count={count}
                page={page}
                onChange={onChange}
                renderItem={(item) => (
                    <PaginationItem
                        slots={{ previous: () => <ArrowLeft size={16} />, next: () => <ArrowRight size={16} /> }}
                        {...item}
                        sx={{
                            color: 'text.secondary',
                            '&.Mui-selected': {
                                bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
                                color: 'primary.main',
                                border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.3)}`,
                                '&:hover': {
                                    bgcolor: (t) => alpha(t.palette.primary.main, 0.18),
                                }
                            },
                            '&:hover': {
                                bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
                            }
                        }}
                    />
                )}
                sx={{
                    '& .MuiPagination-ul': { gap: 1 }
                }}
            />
        </Box>
    );
};
