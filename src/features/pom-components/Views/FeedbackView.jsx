import React, { useState, useEffect } from 'react';
import { Box, Chip, Grid, Paper, Rating, TextField, Typography } from '@mui/material';
import { AlertCircle, Bot, Bug, CheckCircle, Lightbulb, MessageSquare, Send, Star, ThumbsUp, Zap } from 'lucide-react';
import SendIcon from '@mui/icons-material/Send';
import { ThemeToggle } from '../UI/ThemeToggle';
import { Button } from '../UI/Button';
import { StatusSnackbar } from '../UI/StatusSnackbar';
import { alpha, useTheme } from '@mui/material/styles';

export function FeedbackView() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    const [feedback, setFeedback] = useState({
        category: 'general',
        rating: 0,
        title: '',
        message: ''
    });

    const [submittedFeedback, setSubmittedFeedback] = useState([]);

    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState(null); // { message, severity }

    const categories = [
        { id: 'general', label: 'General', icon: MessageSquare, color: '#D00000' },
        { id: 'feature', label: 'Feature Request', icon: Lightbulb, color: '#ff9800' },
        { id: 'bug', label: 'Bug', icon: Bug, color: '#f44336' },
        { id: 'improvement', label: 'Improvement', icon: Zap, color: '#9c27b0' },
        { id: 'ai_generation', label: 'Test Design', icon: Bot, color: '#00bcd4' },
    ];

    // Fetch feedback from backend
    const fetchFeedback = async () => {
        try {
            const response = await fetch('/api/playwright-pom/feedback/list');
            if (response.ok) {
                const data = await response.json();
                setSubmittedFeedback(data);
            }
        } catch (error) {
            console.error('Error fetching feedback:', error);
        }
    };

    // Load feedback on mount
    useEffect(() => {
        fetchFeedback();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (feedback.rating === 0) {
            showSnackbar("Please provide a rating", "error");
            return;
        }

        setSubmitting(true);

        try {
            const response = await fetch('/api/playwright-pom/feedback/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(feedback),
            });

            if (response.ok) {
                const newFeedback = await response.json();
                setSubmittedFeedback(prev => [newFeedback, ...prev]);
                showSnackbar("Thank you for your feedback! We appreciate your input.", "success");

                // Reset form
                setFeedback({
                    category: 'general',
                    rating: 0,
                    title: '',
                    message: ''
                });
            } else {
                showSnackbar("Failed to submit feedback. Please try again.", "error");
            }
        } catch (error) {
            console.error('Error submitting feedback:', error);
            showSnackbar("Failed to submit feedback. Please try again.", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const showSnackbar = (msg, severity) => {
        setStatus({ message: msg, severity: severity });
        setTimeout(() => setStatus(null), 4000);
    };

    const updateFeedback = (key, value) => {
        setFeedback(prev => ({ ...prev, [key]: value }));
    };

    const selectedCategory = categories.find(cat => cat.id === feedback.category);

    return (
        <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            <StatusSnackbar status={status} onClose={() => setStatus(null)} />


            {/* Content Area */}
            <Box sx={{ flex: 1, p: 2, minHeight: 0, overflow: 'hidden', transition: 'background-color 0.3s' }}>
                <Paper
                    component="form"
                    onSubmit={handleSubmit}
                    sx={{
                        p: 2,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        border: '1px solid',
                        borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#d1d5db',
                        bgcolor: (theme) => theme.palette.mode === 'dark' ? '#161B22' : '#ffffff',
                        transition: 'all 0.3s ease',
                        overflow: 'hidden',
                        borderRadius: 1,
                    }}
                >
                    <Box sx={{ display: 'flex', gap: 2, height: '100%', overflow: 'hidden' }}>
                        {/* Left Column - Feedback Form */}
                        <Box sx={{ flex: '0 0 400px', display: 'flex', flexDirection: 'column' }}>
                            {/* Category */}
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="caption" sx={{ mb: 1, fontWeight: 'bold', color: 'text.primary', display: 'block', fontSize: '0.875rem' }}>
                                    Category
                                </Typography>
                                <Grid container spacing={2} justifyContent="space-between">
                                    {categories.filter(c => c.id !== 'ai_generation').map((cat) => {
                                        const Icon = cat.icon;
                                        const isSelected = feedback.category === cat.id;
                                        return (
                                            <Grid item xs={3} key={cat.id}>
                                                <Paper
                                                    onClick={() => updateFeedback('category', cat.id)}
                                                    sx={{
                                                        p: 1.5,
                                                        cursor: 'pointer',
                                                        textAlign: 'center',
                                                        border: '1px solid',
                                                        borderColor: isSelected ? cat.color : 'transparent',
                                                        background: isSelected ? alpha(cat.color, 0.1) : 'transparent',
                                                        transition: 'all 0.3s ease',
                                                        minHeight: '70px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        borderRadius: '8px',
                                                        '&:hover': {
                                                            borderColor: cat.color,
                                                            transform: 'translateY(-2px)',
                                                            boxShadow: `0 4px 12px ${alpha(cat.color, 0.3)}`,
                                                        }
                                                    }}
                                                >
                                                    <Icon size={24} style={{ color: cat.color, marginBottom: '6px' }} />
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            fontWeight: isSelected ? 'bold' : 'normal',
                                                            color: isSelected ? cat.color : 'text.secondary',
                                                            display: 'block'
                                                        }}
                                                    >
                                                        {cat.label.split(' ')[0]}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                        );
                                    })}
                                </Grid>
                            </Box>

                            {/* Rating */}
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 'bold', color: 'text.primary', display: 'block', fontSize: '0.875rem' }}>
                                    Rating <Box component="span" sx={{ color: 'error.main' }}>*</Box>
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                                    <Rating
                                        name="rating"
                                        value={feedback.rating}
                                        onChange={(event, newValue) => updateFeedback('rating', newValue)}
                                        size="medium"
                                        sx={{
                                            '& .MuiRating-iconFilled': { color: '#ffc107' },
                                            '& .MuiRating-iconHover': { color: '#ffb300' }
                                        }}
                                    />
                                    {feedback.rating > 0 && (
                                        <Chip
                                            size="small"
                                            label={
                                                feedback.rating === 5 ? 'Excellent!' :
                                                    feedback.rating === 4 ? 'Great!' :
                                                        feedback.rating === 3 ? 'Good' :
                                                            feedback.rating === 2 ? 'Fair' : 'Poor'
                                            }
                                            sx={{
                                                height: '20px',
                                                fontSize: '0.75rem',
                                                backgroundColor: alpha(
                                                    feedback.rating >= 4 ? '#10b981' : // Green for 4-5 stars
                                                        feedback.rating >= 2 ? '#fbbf24' : // Yellow for 2-3 stars
                                                            '#ef4444', // Red for 1 star
                                                    0.1
                                                ),
                                                color: feedback.rating >= 4 ? '#10b981' :
                                                    feedback.rating >= 2 ? '#fbbf24' :
                                                        '#ef4444',
                                                fontWeight: 'bold',
                                                backdropFilter: 'blur(10px)'
                                            }}
                                        />
                                    )}
                                </Box>
                            </Box>

                            {/* Title */}
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 'bold', color: 'text.primary', display: 'block', fontSize: '0.875rem' }}>
                                    Title
                                </Typography>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Brief summary"
                                    value={feedback.title}
                                    onChange={(e) => updateFeedback('title', e.target.value)}
                                    sx={{
                                        '& .MuiOutlinedInput-input': { py: 0.5 },
                                        '& .MuiOutlinedInput-root': {
                                            '&:hover fieldset': { borderColor: selectedCategory?.color },
                                            '&.Mui-focused fieldset': { borderColor: selectedCategory?.color }
                                        }
                                    }}
                                />
                            </Box>

                            {/* Details */}
                            <Box sx={{ mb: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.primary', display: 'block', fontSize: '0.875rem' }}>
                                        Details
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            fontSize: '0.75rem',
                                            color: feedback.message.length > 450
                                                ? (feedback.message.length >= 500 ? 'error.main' : 'warning.main')
                                                : 'text.disabled'
                                        }}
                                    >
                                        {feedback.message.length}/500
                                    </Typography>
                                </Box>
                                <TextField
                                    fullWidth
                                    multiline
                                    placeholder="Share your thoughts..."
                                    value={feedback.message}
                                    onChange={(e) => {
                                        if (e.target.value.length <= 500) {
                                            updateFeedback('message', e.target.value);
                                        }
                                    }}
                                    sx={{
                                        flexGrow: 1,
                                        '& .MuiOutlinedInput-root': {
                                            height: '100%',
                                            alignItems: 'flex-start',
                                            '&:hover fieldset': { borderColor: selectedCategory?.color },
                                            '&.Mui-focused fieldset': { borderColor: selectedCategory?.color }
                                        },
                                        '& .MuiOutlinedInput-input': {}
                                    }}
                                />
                            </Box>

                            {/* Submit Button */}
                            <Box sx={{
                                pt: 1,
                                borderTop: '1px solid',
                                borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#d1d5db',
                                display: 'flex',
                                justifyContent: 'flex-end'
                            }}>
                                <Button
                                    type="submit"
                                    variant="primary-glass"
                                    disabled={submitting}
                                    className=" px-6"
                                >
                                    {submitting ? 'Submitting...' : 'Submit'}
                                </Button>
                            </Box>
                        </Box>

                        {/* Right Column - Submitted Feedback */}
                        <Box sx={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            borderLeft: '1px solid',
                            borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#d1d5db',
                            pl: 2
                        }}>
                            <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.primary', display: 'block', fontSize: '0.875rem', mb: 1 }}>
                                Submitted Feedback ({submittedFeedback.length})
                            </Typography>
                            <Box sx={{
                                flex: 1,
                                overflowY: 'auto',
                                pr: 1,
                                '&::-webkit-scrollbar': { width: '6px' },
                                '&::-webkit-scrollbar-thumb': {
                                    backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                                    borderRadius: '3px'
                                }
                            }}>
                                {submittedFeedback.length === 0 ? (
                                    <Box sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        height: '100%',
                                        color: 'text.secondary'
                                    }}>
                                        <MessageSquare size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                                        <Typography variant="body2" sx={{ opacity: 0.7 }}>
                                            No feedback submitted yet
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {submittedFeedback.map((item) => {
                                            const cat = categories.find(c => c.id === item.category);
                                            const Icon = cat?.icon || MessageSquare;
                                            return (
                                                <Paper
                                                    key={item.id}
                                                    sx={{
                                                        p: 1.5,
                                                        border: '1px solid',
                                                        borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#e0e0e0',
                                                        background: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#fafafa',
                                                        transition: 'all 0.2s ease',
                                                        '&:hover': {
                                                            borderColor: cat?.color || '#D00000',
                                                            boxShadow: `0 2px 8px ${alpha(cat?.color || '#D00000', 0.2)}`
                                                        }
                                                    }}
                                                >
                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                            <Icon size={14} style={{ color: cat?.color || '#D00000' }} />
                                                            <Chip
                                                                label={cat?.label || item.categoryLabel}
                                                                size="small"
                                                                sx={{
                                                                    height: '16px',
                                                                    fontSize: '0.6875rem',
                                                                    backgroundColor: alpha(cat?.color || '#D00000', 0.1),
                                                                    color: cat?.color || '#D00000',
                                                                    fontWeight: 'bold'
                                                                }}
                                                            />
                                                        </Box>
                                                        <Rating value={item.rating} size="small" readOnly />
                                                    </Box>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, fontSize: '0.75rem', color: 'text.primary', opacity: 0.75 }}>
                                                        {item.title}
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5, opacity: 0.8 }}>
                                                        {item.message}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ fontSize: '0.6875rem', color: 'text.disabled' }}>
                                                        {new Date(item.timestamp).toLocaleString()}
                                                    </Typography>
                                                </Paper>
                                            );
                                        })}
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    </Box>
                </Paper>
            </Box>


        </Box >
    );
}
