import { alpha } from '@mui/material/styles';
import { AlertCircle, CheckCircle } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Container, Paper, Stack, Typography } from '@mui/material';
import { keyframes } from '@mui/system';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import { AppleCompass } from '../AppleCompass';

// Comet animation
const cometTrail = keyframes`
  0% {
    transform: translate(-100vw, -100vh) rotate(45deg);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    transform: translate(100vw, 100vh) rotate(45deg);
    opacity: 0;
  }
`;

const floatAnimation = keyframes`
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-30px);
  }
`;

const shimmer = keyframes`
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
`;

const pulseGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.5),
                0 0 40px rgba(139, 92, 246, 0.3),
                0 0 60px rgba(139, 92, 246, 0.1);
  }
  50% {
    box-shadow: 0 0 30px rgba(139, 92, 246, 0.7),
                0 0 60px rgba(139, 92, 246, 0.5),
                0 0 90px rgba(139, 92, 246, 0.3);
  }
`;

const starTwinkle = keyframes`
  0%, 100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.3);
  }
`;

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const rotateGradient = keyframes`
  0% {
    filter: hue-rotate(0deg);
  }
  100% {
    filter: hue-rotate(360deg);
  }
`;

export const LandingView = ({ onGetStarted }) => {
    const canvasRef = useRef(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [testDesignFeedback, setTestDesignFeedback] = useState([]);

    // Animated background with particles
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles = [];
        const particleCount = 150;

        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 2.5 + 0.5;
                this.speedX = Math.random() * 0.5 - 0.25;
                this.speedY = Math.random() * 0.5 - 0.25;
                this.opacity = Math.random() * 0.6 + 0.2;
            }

            update() {
                this.x += this.speedX;
                this.y += this.speedY;

                if (this.x > canvas.width) this.x = 0;
                if (this.x < 0) this.x = canvas.width;
                if (this.y > canvas.height) this.y = 0;
                if (this.y < 0) this.y = canvas.height;
            }

            draw() {
                ctx.fillStyle = `rgba(139, 92, 246, ${this.opacity})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw connections
            particles.forEach((particle, i) => {
                particle.update();
                particle.draw();

                particles.slice(i + 1).forEach(otherParticle => {
                    const dx = particle.x - otherParticle.x;
                    const dy = particle.y - otherParticle.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 150) {
                        ctx.strokeStyle = `rgba(139, 92, 246, ${0.2 * (1 - distance / 150)})`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(particle.x, particle.y);
                        ctx.lineTo(otherParticle.x, otherParticle.y);
                        ctx.stroke();
                    }
                });
            });

            requestAnimationFrame(animate);
        }

        animate();

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Mouse tracking for interactive effects
    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // Pull latest Test Design feedback so Landing shows fresh submissions directly.
    useEffect(() => {
        let isMounted = true;

        const loadFeedback = async () => {
            try {
                const response = await fetch('/api/playwright-pom/feedback/list');
                if (!response.ok) return;
                const data = await response.json();
                const aiFeedback = (Array.isArray(data) ? data : [])
                    .filter((item) => {
                        const category = String(item?.category || '').toLowerCase();
                        const categoryLabel = String(item?.categoryLabel || item?.category_label || '').toLowerCase();
                        const title = String(item?.title || '').toLowerCase();
                        return (
                            category === 'ai_generation' ||
                            categoryLabel === 'ai generation' ||
                            title.includes('test design')
                        );
                    })
                    .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
                    .slice(0, 3);

                if (isMounted) {
                    setTestDesignFeedback(aiFeedback);
                }
            } catch (error) {
                console.error('Failed to load landing feedback:', error);
            }
        };

        loadFeedback();
        const intervalId = setInterval(loadFeedback, 15000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, []);

    return (
        <Box
            sx={{
                position: 'relative',
                height: 'calc(100vh - 64px)',
                width: '100%',
                background: '#000000',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            {/* Animated Canvas Background */}
            <canvas
                ref={canvasRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 1,
                }}
            />

            {/* Comet Elements */}
            {[...Array(4)].map((_, i) => (
                <Box
                    key={i}
                    sx={{
                        position: 'absolute',
                        width: '500px',
                        height: '3px',
                        background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.9), rgba(99, 102, 241, 0.6), transparent)',
                        animation: `${cometTrail} ${12 + i * 4}s linear infinite`,
                        animationDelay: `${i * 3}s`,
                        zIndex: 2,
                        filter: 'blur(0.5px)',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            right: '25%',
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, rgba(255, 255, 255, 1), rgba(139, 92, 246, 0.8), rgba(139, 92, 246, 0))',
                            boxShadow: '0 0 30px rgba(139, 92, 246, 1), 0 0 60px rgba(139, 92, 246, 0.5)',
                        },
                    }}
                />
            ))}

            {/* Twinkling Stars */}
            {[...Array(80)].map((_, i) => (
                <Box
                    key={`star-${i}`}
                    sx={{
                        position: 'absolute',
                        width: `${Math.random() * 3 + 1}px`,
                        height: `${Math.random() * 3 + 1}px`,
                        borderRadius: '50%',
                        background: '#fff',
                        top: `${Math.random() * 100}%`,
                        left: `${Math.random() * 100}%`,
                        animation: `${starTwinkle} ${Math.random() * 3 + 2}s ease-in-out infinite`,
                        animationDelay: `${Math.random() * 2}s`,
                        zIndex: 2,
                        boxShadow: '0 0 4px rgba(255, 255, 255, 0.8)',
                    }}
                />
            ))}

            {/* Gradient Orbs */}
            <Box
                sx={{
                    position: 'absolute',
                    top: '5%',
                    right: '10%',
                    width: '600px',
                    height: '600px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.2), transparent 70%)',
                    filter: 'blur(80px)',
                    zIndex: 1,
                    animation: `${floatAnimation} 10s ease-in-out infinite`,
                }}
            />
            <Box
                sx={{
                    position: 'absolute',
                    bottom: '5%',
                    left: '5%',
                    width: '700px',
                    height: '700px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2), transparent 70%)',
                    filter: 'blur(100px)',
                    zIndex: 1,
                    animation: `${floatAnimation} 12s ease-in-out infinite`,
                    animationDelay: '1s',
                }}
            />

            {/* Main Content */}
            <Container
                maxWidth="lg"
                sx={{
                    position: 'relative',
                    zIndex: 10,
                    textAlign: 'center',
                    height: 'calc(100vh - 64px)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: testDesignFeedback.length > 0 ? 'flex-start' : 'center',
                    overflowY: 'auto',
                    py: testDesignFeedback.length > 0 ? 2 : 0,
                    gap: 3,
                }}
            >
                {/* Tool Logo */}
                <Box
                    sx={{
                        mb: 1,
                        animation: `${floatAnimation} 6s ease-in-out infinite, ${fadeInUp} 0.6s ease-out`,
                    }}
                >
                    <Box
                        sx={{
                            width: { xs: '80px', md: '100px' },
                            height: { xs: '80px', md: '100px' },
                            mx: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '24px',
                            background: 'rgba(139, 92, 246, 0.1)',
                            border: '1px solid rgba(139, 92, 246, 0.45)',
                            backdropFilter: 'blur(10px)',
                            boxShadow: '0 0 40px rgba(139, 92, 246, 0.3), 0 0 80px rgba(139, 92, 246, 0.1)',
                            transition: 'all 0.4s ease',
                            '&:hover': {
                                transform: 'scale(1.1)',
                                boxShadow: '0 0 60px rgba(139, 92, 246, 0.5), 0 0 100px rgba(139, 92, 246, 0.2)',
                                border: '1px solid rgba(139, 92, 246, 0.7)',
                            },
                        }}
                    >
                        <AppleCompass size={70} />
                    </Box>
                </Box>

                {/* Logo/Badge */}
                <Box
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 3,
                        py: 1,
                        mx: 'auto',
                        borderRadius: '50px',
                        background: 'rgba(139, 92, 246, 0.15)',
                        border: '1px solid rgba(139, 92, 246, 0.55)',
                        backdropFilter: 'blur(10px)',
                        animation: `${pulseGlow} 3s ease-in-out infinite, ${fadeInUp} 0.8s ease-out`,
                    }}
                >
                    <AutoAwesomeIcon sx={{ color: '#a78bfa', fontSize: 20 }} />
                    <Typography
                        sx={{
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            background: 'linear-gradient(135deg, #a78bfa, #818cf8)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            letterSpacing: '0.5px',
                        }}
                    >
                        AI-Powered Playwright Test Automation
                    </Typography>
                </Box>

                {/* Main Heading */}
                <Box sx={{ mt: -0.5 }}>
                    <Typography
                        variant="h1"
                        sx={{
                            fontSize: { xs: '3rem', md: '4rem', lg: '3rem' },
                            fontWeight: 900,
                            background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 40%, #c7d2fe 70%, #a78bfa 100%)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            letterSpacing: '0.3em',
                            lineHeight: 1,
                            textShadow: '0 0 100px rgba(139, 92, 246, 0.4)',
                            animation: `${fadeInUp} 1s ease-out 0.2s backwards`,
                        }}
                    >
                        COMPASS
                    </Typography>

                    {/* COMPASS Acronym Expansion */}
                    <Typography
                        sx={{
                            fontSize: { xs: '0.7rem', md: '0.7rem' },
                            fontWeight: 400,
                            color: 'rgba(255, 255, 255, 0.5)',
                            letterSpacing: '0.15em',
                            textTransform: 'uppercase',
                            mt: 2.5,
                            animation: `${fadeInUp} 1s ease-out 0.3s backwards`,
                        }}
                    >
                        Comprehensive Object Model Playwright Automation with AI-Smart Solutions
                    </Typography>
                </Box>

                {/* Subtitle */}
                <Box sx={{ mb: 1, mt: -1.5 }}>
                    <Typography
                        variant="h5"
                        sx={{
                            fontSize: { xs: '1.1rem', md: '1.35rem' },
                            fontWeight: 500,
                            color: 'rgba(255, 255, 255, 0.85)',
                            maxWidth: '800px',
                            mx: 'auto',
                            lineHeight: 1.5,
                            animation: `${fadeInUp} 1s ease-out 0.4s backwards`,
                        }}
                    >
                        Next-Generation Playwright Page Object Model Framework
                    </Typography>
                </Box>

                {/* Animated Line */}
                <Box
                    sx={{
                        width: '100%',
                        maxWidth: '400px',
                        height: '2px',
                        mx: 'auto',
                        mt: 1,
                        position: 'relative',
                        overflow: 'hidden',
                        background: 'rgba(139, 92, 246, 0.2)',
                        borderRadius: '2px',
                        boxShadow: '0 0 10px rgba(139, 92, 246, 0.3)',
                        animation: `${fadeInUp} 1s ease-out 0.6s backwards`,
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: '-100%',
                            width: '100%',
                            height: '100%',
                            background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 1), rgba(99, 102, 241, 1), transparent)',
                            animation: `${shimmer} 3s infinite`,
                        },
                    }}
                />


                {/* CTA Button */}
                <Box sx={{ animation: `${fadeInUp} 1s ease-out 0.8s backwards`, mt: -1 }}>
                    <Button
                        onClick={onGetStarted}
                        variant="contained"
                        size="large"
                        endIcon={<RocketLaunchIcon />}
                        sx={{
                            px: 6,
                            py: 1.8,
                            fontSize: '1.05rem',
                            fontWeight: 600,
                            borderRadius: '50px',
                            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                            color: '#fff',
                            textTransform: 'none',
                            boxShadow: '0 10px 40px rgba(139, 92, 246, 0.5), 0 0 60px rgba(139, 92, 246, 0.2)',
                            transition: 'all 0.3s ease',
                            position: 'relative',
                            overflow: 'hidden',
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                left: '-100%',
                                width: '100%',
                                height: '100%',
                                background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
                                animation: `${shimmer} 3s infinite`,
                            },
                            '&:hover': {
                                transform: 'translateY(-3px) scale(1.02)',
                                boxShadow: '0 20px 60px rgba(139, 92, 246, 0.7), 0 0 80px rgba(139, 92, 246, 0.3)',
                                background: 'linear-gradient(135deg, #9d6fff, #7c3aed)',
                            },
                            '&:active': {
                                transform: 'translateY(-1px) scale(1)',
                            },
                        }}
                    >
                        Get Started
                    </Button>
                </Box>

                {/* Feature Pills */}
                <Box
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        gap: 2.5,
                        maxWidth: '900px',
                        mx: 'auto',
                        animation: `${fadeInUp} 1s ease-out 1s backwards`,
                    }}
                >
                    {[
                        { icon: <AutoAwesomeIcon />, text: 'AI-Powered Generation' },
                        { icon: <SpeedIcon />, text: 'Lightning Fast' },
                        { icon: <SecurityIcon />, text: 'Self-Healing Tests' },
                    ].map((feature, index) => (
                        <Box
                            key={index}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                px: 3,
                                py: 1.5,
                                borderRadius: '50px',
                                background: 'rgba(139, 92, 246, 0.08)',
                                border: '1px solid rgba(139, 92, 246, 0.4)',
                                backdropFilter: 'blur(10px)',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    background: 'rgba(139, 92, 246, 0.15)',
                                    border: '1px solid rgba(139, 92, 246, 0.65)',
                                    transform: 'translateY(-3px)',
                                    boxShadow: '0 10px 30px rgba(139, 92, 246, 0.3)',
                                },
                            }}
                        >
                            <Box sx={{ color: '#a78bfa', display: 'flex' }}>
                                {feature.icon}
                            </Box>
                            <Typography
                                sx={{
                                    fontSize: '0.9rem',
                                    fontWeight: 500,
                                    color: 'rgba(255, 255, 255, 0.9)',
                                }}
                            >
                                {feature.text}
                            </Typography>
                        </Box>
                    ))}
                </Box>

                {/* Live Test Design Feedback */}
                <Box
                    sx={{
                        width: '100%',
                        maxWidth: '980px',
                        mx: 'auto',
                        animation: `${fadeInUp} 1s ease-out 1.1s backwards`,
                    }}
                >
                    <Typography
                        sx={{
                            textAlign: 'center',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: 'rgba(255,255,255,0.62)',
                            letterSpacing: '1.4px',
                            textTransform: 'uppercase',
                            mb: 1.2,
                        }}
                    >
                        Live Test Design Feedback
                    </Typography>
                    {testDesignFeedback.length === 0 ? (
                        <Paper
                            elevation={0}
                            sx={{
                                p: 1.2,
                                borderRadius: 2,
                                bgcolor: 'rgba(139, 92, 246, 0.08)',
                                border: '1px solid rgba(139, 92, 246, 0.4)',
                                color: 'rgba(255,255,255,0.68)',
                                fontSize: '0.78rem',
                            }}
                        >
                            No Test Design feedback yet. Submit feedback from Test Design and it will appear here.
                        </Paper>
                    ) : (
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2}>
                            {testDesignFeedback.map((entry, index) => (
                                <Paper
                                    key={entry.id || `${entry.timestamp || 'fb'}-${index}`}
                                    elevation={0}
                                    sx={{
                                        flex: 1,
                                        p: 1.2,
                                        borderRadius: 2,
                                        bgcolor: 'rgba(139, 92, 246, 0.08)',
                                        border: '1px solid rgba(139, 92, 246, 0.4)',
                                        backdropFilter: 'blur(10px)',
                                    }}
                                >
                                    <Typography sx={{ fontSize: '0.74rem', color: '#fbbf24', letterSpacing: '0.5px' }}>
                                        {'★'.repeat(Math.max(1, Math.min(5, Number(entry.rating) || 0)))}
                                        <Box component="span" sx={{ color: 'rgba(255,255,255,0.45)', ml: 0.6 }}>
                                            {entry.categoryLabel || entry.category_label || 'Test Design'}
                                        </Box>
                                    </Typography>
                                    <Typography
                                        sx={{
                                            mt: 0.4,
                                            fontSize: '0.8rem',
                                            color: 'rgba(255,255,255,0.9)',
                                            fontWeight: 600,
                                            lineHeight: 1.35,
                                        }}
                                    >
                                        {entry.title || 'Test Design Feedback'}
                                    </Typography>
                                    <Typography
                                        sx={{
                                            mt: 0.45,
                                            fontSize: '0.74rem',
                                            color: 'rgba(255,255,255,0.68)',
                                            lineHeight: 1.45,
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                            minHeight: '2.2em',
                                        }}
                                    >
                                        {entry.message || 'No additional comments.'}
                                    </Typography>
                                </Paper>
                            ))}
                        </Stack>
                    )}
                </Box>

                {/* Architect Profile */}
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2,
                        mt: 1,
                        animation: `${fadeInUp} 1s ease-out 1.2s backwards`,
                    }}
                >
                    <Typography
                        sx={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            color: 'rgba(255, 255, 255, 0.35)',
                            letterSpacing: '2px',
                            textTransform: 'uppercase',
                        }}
                    >
                        Designed & Built By
                    </Typography>

                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2.5,
                            px: 3.5,
                            py: 2,
                            borderRadius: '20px',
                            background: 'rgba(139, 92, 246, 0.08)',
                            border: '1px solid rgba(139, 92, 246, 0.4)',
                            backdropFilter: 'blur(20px)',
                            transition: 'all 0.4s ease',
                            position: 'relative',
                            overflow: 'hidden',
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(99, 102, 241, 0.15))',
                                opacity: 0,
                                transition: 'opacity 0.4s ease',
                            },
                            '&:hover': {
                                transform: 'translateY(-5px)',
                                border: '1px solid rgba(139, 92, 246, 0.65)',
                                boxShadow: '0 20px 60px rgba(139, 92, 246, 0.3)',
                                '&::before': {
                                    opacity: 1,
                                },
                            },
                        }}
                    >
                        {/* Profile Image */}
                        <Box
                            sx={{
                                position: 'relative',
                                width: '65px',
                                height: '65px',
                                borderRadius: '50%',
                                overflow: 'hidden',
                                border: '3px solid rgba(139, 92, 246, 0.5)',
                                boxShadow: '0 0 30px rgba(139, 92, 246, 0.4), inset 0 0 20px rgba(139, 92, 246, 0.1)',
                                transition: 'all 0.4s ease',
                                '&:hover': {
                                    transform: 'scale(1.08) rotate(5deg)',
                                    boxShadow: '0 0 50px rgba(139, 92, 246, 0.6)',
                                },
                            }}
                        >
                            <img
                                src="/Aniket.jpeg"
                                alt="Aniket Marwadi"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                }}
                            />
                        </Box>

                        {/* Name and Title */}
                        <Box sx={{ textAlign: 'left', position: 'relative', zIndex: 1 }}>
                            <Typography
                                sx={{
                                    fontSize: '1.15rem',
                                    fontWeight: 700,
                                    background: 'linear-gradient(135deg, #ffffff, #e0e7ff)',
                                    backgroundClip: 'text',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    letterSpacing: '0.3px',
                                    mb: 0.3,
                                }}
                            >
                                Aniket Marwadi
                            </Typography>
                            <Typography
                                sx={{
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                    color: '#a78bfa',
                                    letterSpacing: '0.5px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                }}
                            >
                                <AutoAwesomeIcon sx={{ fontSize: 13 }} />
                                Lead AI Architect
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </Container>

            {/* Interactive Cursor Glow */}
            <Box
                sx={{
                    position: 'fixed',
                    width: '700px',
                    height: '700px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12), transparent 70%)',
                    pointerEvents: 'none',
                    zIndex: 5,
                    transition: 'transform 0.15s ease-out',
                    transform: `translate(${mousePosition.x - 350}px, ${mousePosition.y - 350}px)`,
                    filter: 'blur(80px)',
                }}
            />
        </Box>
    );
};
