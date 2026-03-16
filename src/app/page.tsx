"use client";

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  alpha,
  Stack,
  useTheme,
  TextField,
  Rating,
  Chip,
  Card,
  CardContent,
  Fade,
  Grow,
  IconButton,
  Skeleton,
  LinearProgress,
} from '@mui/material';
import {
  Activity,
  ShieldCheck,
  Zap,
  BarChart3,
  ArrowRight,
  Brain,
  FileSpreadsheet,
  GitCompare,
  FileJson,
  Download,
  Target,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  MessageCircle,
  Gauge,
  MessageSquare,
  Send,
  Star,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Clock,
  Sparkles,
  TrendingUp,
  Reply,
  ShieldCheck as ShieldAdmin,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

import ThemeToggle from '@/components/ThemeToggle';
import { UbsLogoFull } from '../components/UbsLogoFull';
import { BrandPipe } from '@/components/BrandPipe';
import { UnifiedNavBar } from '@/components/UnifiedNavBar';
import { useAuth } from '@/contexts/AuthContext';
import AppIdentityBadge from '@/components/AppIdentityBadge';
import { API_ROOT } from '@/utils/apiBase';
import { authFetch } from '@/features/agent-eval/utils/authFetch';
import { useCallback } from 'react';
import UBSSnackbar from '@/components/UBSSnackbar';
import AnimatedQualarisWord from '@/components/AnimatedQualarisWord';

const MotionPaper = motion(Paper);

export default function QualarisLanding() {
  const router = useRouter();
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const brandLetters = 'QUALARIS'.split('');
  const { isAuthenticated, session } = useAuth();
  return (
    <Box sx={{
        minHeight: '100vh',
        width: '100vw',
        bgcolor: 'background.default',
        color: 'text.primary',
        overflowX: 'hidden',
        position: 'relative'
      }}>

        <UnifiedNavBar
          title="QUALARIS"
          items={[
            { id: 'platforms', label: 'Use Cases', onClick: () => document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' }) },
            { id: 'methodology', label: 'Methodology', onClick: () => document.getElementById('methodology-section')?.scrollIntoView({ behavior: 'smooth' }) },
            { id: 'capabilities', label: 'Capabilities', onClick: () => document.getElementById('capabilities-section')?.scrollIntoView({ behavior: 'smooth' }) },
            { id: 'our-team', label: 'Our Team', onClick: () => router.push('/docs#our-team') },
          ]}
          onLogoClick={() => router.push('/')}
          actions={
            <>
              <Button
                variant="outlined"
                onClick={() => router.push('/docs')}
                sx={{
                  borderColor: 'divider',
                  color: 'text.primary',
                  '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(208,0,0,0.04)' }
                }}
              >
                Documentation
              </Button>
              {isAuthenticated && session ? (
                <AppIdentityBadge appName={session.app_name} appId={session.app_id} />
              ) : (
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => router.push('/login')}
                >
                  Sign In
                </Button>
              )}
              <ThemeToggle />
            </>
          }
        />

        {/* Hero Section */}
        <Box sx={{
          pt: { xs: 6, md: 4 },
          pb: { xs: 10, md: 16 },
          position: 'relative',
          bgcolor: (t) => t.palette.mode === 'light' ? '#F5F7FA' : 'background.default',
        }}>
          <Container maxWidth="xl" sx={{ px: { xs: 2, md: 3 } }}>
            <Grid container spacing={{ xs: 6, md: 8 }} alignItems="center">
              <Grid size={{ xs: 12, md: 6 }}>
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  {/* Badge */}
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}>
                    <Box sx={{
                      display: 'inline-flex', alignItems: 'center', gap: 1, px: 2, py: 0.75, mb: 4,
                      borderRadius: 5, border: '1px solid', borderColor: 'divider',
                      bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                    }}>
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#1F8A70', animation: 'pulse 2s infinite' }} />
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', letterSpacing: '0.04em', fontSize: '0.7rem' }}>
                        PRODUCTION AI QUALITY PLATFORM
                      </Typography>
                    </Box>
                  </motion.div>

                  <Typography variant="h1" sx={{
                    mb: 3, fontWeight: 700, letterSpacing: '-0.03em', color: 'text.primary',
                    fontSize: { xs: '2.25rem', sm: '2.75rem', md: '3.25rem' }, lineHeight: 1.15,
                  }}>
                    Production-Grade{' '}
                    <br />
                    Quality Engineering for{' '}
                    <Box component="span" sx={{ color: 'primary.main' }}>RAG Pipelines</Box>
                    {', '}
                    <Box component="span" sx={{ color: 'primary.main' }}>AI Agents</Box>
                    {', '}
                    <Box component="span" sx={{ color: 'primary.main' }}>Ground Truth Data</Box>
                    {' & '}
                    <Box component="span" sx={{ color: 'primary.main' }}>Playwright Automation</Box>.
                  </Typography>

                  <Typography variant="h6" sx={{
                    fontSize: { xs: '1rem', md: '1.15rem' }, maxWidth: 560, mb: 5,
                    color: 'text.secondary', fontWeight: 400, lineHeight: 1.7,
                  }}>
                    Build trusted datasets, benchmark Retrieval-Augmented Generation systems, evaluate autonomous agents, and operationalize browser automation.
                    Run end-to-end quality workflows from data creation to production reporting in one integrated suite.
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 6 }}>
                    <Button variant="contained" color="primary" size="large" sx={{
                      height: 52, px: 4.5, fontSize: '0.95rem', fontWeight: 600, borderRadius: 2,
                      boxShadow: '0 4px 14px rgba(208,0,0,0.25)',
                      '&:hover': { boxShadow: '0 6px 20px rgba(208,0,0,0.35)' },
                    }} onClick={() => {
                      document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}>
                    Get Started
                    </Button>
                  </Box>

                  {/* Trust stats */}
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.5 }}>
                    <Box sx={{ display: 'flex', gap: { xs: 3, md: 5 }, flexWrap: 'wrap' }}>
                      {[
                        { value: '4', label: 'Integrated Modules' },
                        { value: '15+', label: 'Evaluation Signals' },
                        { value: 'E2E', label: 'Integrated Quality Workflow' },
                      ].map((stat) => (
                        <Box key={stat.label}>
                          <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: '1.1rem', lineHeight: 1 }}>{stat.value}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>{stat.label}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </motion.div>
                </motion.div>
              </Grid>

              {/* Hero Visual — animated orbital visualization */}
              <Grid size={{ xs: 12, md: 6 }} sx={{ display: { xs: 'none', md: 'block' } }}>
                <Box sx={{ position: 'relative', width: '100%', height: 580, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

                  {/* Background sparkles */}
                  {Array.from({ length: 12 }).map((_, i) => (
                    <motion.div
                      key={`spark-${i}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 0.6, 0], scale: [0.5, 1.2, 0.5] }}
                      transition={{ duration: 3 + (i % 4), repeat: Infinity, delay: i * 0.7, ease: 'easeInOut' }}
                      style={{
                        position: 'absolute',
                        left: `${10 + (i * 7.3) % 80}%`,
                        top: `${5 + (i * 11.7) % 90}%`,
                        width: 3 + (i % 3),
                        height: 3 + (i % 3),
                        borderRadius: '50%',
                        background: i % 3 === 0 ? '#D00000' : i % 3 === 1 ? '#2D6CDF' : '#1F8A70',
                      }}
                    />
                  ))}

                  {/* Slowly rotating orbit rings with pulsing opacity */}
                  {[120, 180, 240].map((r, i) => (
                    <motion.div
                      key={r}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1, rotate: i % 2 === 0 ? 360 : -360 }}
                      transition={{
                        opacity: { delay: 0.2 + i * 0.15, duration: 0.6 },
                        scale: { delay: 0.2 + i * 0.15, duration: 0.6 },
                        rotate: { duration: 60 + i * 20, repeat: Infinity, ease: 'linear' },
                      }}
                      style={{ position: 'absolute', width: r * 2, height: r * 2, borderRadius: '50%', border: `1px dashed ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'}` }}
                    />
                  ))}

                  {/* Pulsing glow halos behind center */}
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={`glow-${i}`}
                      animate={{ scale: [1, 1.6 + i * 0.3, 1], opacity: [0.15, 0, 0.15] }}
                      transition={{ duration: 3 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 1 }}
                      style={{
                        position: 'absolute', zIndex: 1,
                        width: 110, height: 110, borderRadius: '50%',
                        background: `radial-gradient(circle, ${isLight ? 'rgba(208,0,0,0.12)' : 'rgba(208,0,0,0.2)'} 0%, transparent 70%)`,
                      }}
                    />
                  ))}

                  {/* Central hub — breathing + rotating border */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.5, type: 'spring' }}
                    style={{ position: 'absolute', zIndex: 5 }}
                  >
                    <motion.div
                      animate={{ scale: [1, 1.06, 1], rotate: [0, 360] }}
                      transition={{
                        scale: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
                        rotate: { duration: 40, repeat: Infinity, ease: 'linear' },
                      }}
                      style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: `2px dashed ${isLight ? 'rgba(208,0,0,0.15)' : 'rgba(208,0,0,0.25)'}` }}
                    />
                    <Box>
                      <Paper elevation={0} sx={{
                        width: 130, height: 130, borderRadius: '50%', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', border: '2px solid', borderColor: 'primary.main',
                        bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(208,0,0,0.1)' : 'rgba(208,0,0,0.04)',
                        boxShadow: (t) => `0 0 50px ${t.palette.mode === 'dark' ? 'rgba(208,0,0,0.3)' : 'rgba(208,0,0,0.15)'}`,
                      }}>
                        <Box sx={{ position: 'relative', width: 94, height: 94 }}>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
                            style={{ position: 'absolute', inset: 0 }}
                          >
                            {brandLetters.map((char, idx) => {
                              const angle = (idx / brandLetters.length) * Math.PI * 2 - Math.PI / 2;
                              const radius = 36;
                              const x = Math.cos(angle) * radius;
                              const y = Math.sin(angle) * radius;
                              return (
                                <Box
                                  key={`${char}-${idx}`}
                                  component="span"
                                  sx={{
                                    position: 'absolute',
                                    left: '50%',
                                    top: '50%',
                                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                                  }}
                                >
                                  <motion.span
                                    animate={{ rotate: -360, opacity: [0.9, 1, 0.9] }}
                                    transition={{
                                      rotate: { duration: 16, repeat: Infinity, ease: 'linear' },
                                      opacity: { duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: idx * 0.08 },
                                    }}
                                    style={{
                                      display: 'inline-block',
                                      fontWeight: 900,
                                      fontSize: '0.8rem',
                                      letterSpacing: '0.02em',
                                      lineHeight: 1,
                                      color: idx % 2 === 0 ? '#D00000' : (isLight ? '#111111' : '#FFFFFF'),
                                      textShadow: isLight
                                        ? '0 0 2px rgba(255,255,255,0.6), 0 0 8px rgba(208,0,0,0.12)'
                                        : '0 0 5px rgba(0,0,0,0.4), 0 0 7px rgba(208,0,0,0.15)',
                                    }}
                                  >
                                    {char}
                                  </motion.span>
                                </Box>
                              );
                            })}
                          </motion.div>
                          <Box
                            sx={{
                              position: 'absolute',
                              left: '50%',
                              top: '50%',
                              transform: 'translate(-50%, -50%)',
                              width: 16,
                              height: 16,
                              borderRadius: '50%',
                              bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.25 : 0.12),
                              border: '1px solid',
                              borderColor: (t) => alpha(t.palette.primary.main, 0.35),
                            }}
                          />
                        </Box>
                      </Paper>
                    </Box>
                  </motion.div>

                  {/* Floating metric & feature cards across 3 rings */}
                  {[
                    { icon: <FileSpreadsheet size={14} />, label: 'Upload',            angle: 45,  radius: 120, delay: 0.4, dur: 16, color: '#D9822B' },
                    { icon: <FileJson size={14} />,        label: 'Ingest',            angle: 135, radius: 120, delay: 0.6, dur: 18, color: '#673AB7' },
                    { icon: <GitCompare size={14} />,      label: 'Compare',           angle: 225, radius: 120, delay: 0.8, dur: 17, color: '#1F8A70' },
                    { icon: <Download size={14} />,        label: 'Export',            angle: 315, radius: 120, delay: 1.0, dur: 19, color: '#D9822B' },

                    { icon: <ShieldCheck size={14} />,     label: 'Faithfulness',      angle: 0,   radius: 180, delay: 0.5, dur: 20, color: '#D00000' },
                    { icon: <Target size={14} />,          label: 'Relevancy',         angle: 60,  radius: 180, delay: 0.7, dur: 22, color: '#D00000' },
                    { icon: <Gauge size={14} />,           label: 'Context Precision', angle: 120, radius: 180, delay: 0.9, dur: 21, color: '#D00000' },
                    { icon: <CheckCircle2 size={14} />,    label: 'Correctness',       angle: 180, radius: 180, delay: 1.1, dur: 23, color: '#D00000' },
                    { icon: <MessageCircle size={14} />,   label: 'Answer Relevancy',  angle: 240, radius: 180, delay: 1.3, dur: 20, color: '#D00000' },
                    { icon: <BarChart3 size={14} />,       label: 'RQS Score',         angle: 300, radius: 180, delay: 1.5, dur: 24, color: '#D00000' },

                    { icon: <Target size={14} />,          label: 'Accuracy',          angle: 30,  radius: 240, delay: 0.6, dur: 26, color: '#2D6CDF' },
                    { icon: <AlertTriangle size={14} />,   label: 'Hallucination',     angle: 90,  radius: 240, delay: 0.8, dur: 24, color: '#2D6CDF' },
                    { icon: <ShieldCheck size={14} />,     label: 'Safety Score',      angle: 150, radius: 240, delay: 1.0, dur: 28, color: '#2D6CDF' },
                    { icon: <CheckCircle2 size={14} />,    label: 'Task Completion',   angle: 210, radius: 240, delay: 1.2, dur: 22, color: '#2D6CDF' },
                    { icon: <Wrench size={14} />,          label: 'Tool Usage',        angle: 270, radius: 240, delay: 1.4, dur: 25, color: '#2D6CDF' },
                    { icon: <Brain size={14} />,           label: 'Reasoning',         angle: 330, radius: 240, delay: 1.6, dur: 23, color: '#2D6CDF' },
                  ].map((card) => {
                    const rad = (card.angle * Math.PI) / 180;
                    const x = Math.cos(rad) * card.radius;
                    const y = Math.sin(rad) * card.radius;
                    const sz = 56;
                    return (
                      <motion.div
                        key={card.label}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: card.delay, duration: 0.5, type: 'spring', stiffness: 120 }}
                        style={{ position: 'absolute', left: `calc(50% + ${x}px - ${sz / 2}px)`, top: `calc(50% + ${y}px - ${sz / 2}px)`, zIndex: 3 }}
                      >
                        <motion.div
                          animate={{
                            y: [0, -7, 0, 3, 0],
                            x: [0, 3, 0, -3, 0],
                            rotate: [0, 2, 0, -2, 0],
                            scale: [1, 1.04, 1, 0.97, 1],
                          }}
                          transition={{ duration: card.dur / 2.5, repeat: Infinity, ease: 'easeInOut', delay: card.delay * 0.4 }}
                        >
                          <Paper elevation={0} sx={{
                            width: sz, height: sz, borderRadius: 2, display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', border: '1px solid', borderColor: 'divider',
                            bgcolor: 'background.paper', cursor: 'default', transition: 'all 0.3s ease',
                            '&:hover': { borderColor: card.color, boxShadow: `0 0 20px ${card.color}44`, transform: 'scale(1.1)' },
                          }}>
                            <Box sx={{ color: card.color, display: 'flex' }}>{card.icon}</Box>
                            <Typography variant="caption" sx={{ fontSize: '0.45rem', fontWeight: 700, color: 'text.secondary', mt: 0.25, lineHeight: 1, textAlign: 'center', px: 0.25 }}>{card.label}</Typography>
                          </Paper>
                        </motion.div>
                      </motion.div>
                    );
                  })}

                  {/* Orbiting particles — multiple rings, both directions, varied sizes */}
                  {Array.from({ length: 8 }).map((_, i) => {
                    const ringSize = [240, 240, 360, 360, 480, 480, 300, 300][i];
                    const dotSize = [5, 4, 6, 3, 4, 5, 3, 4][i];
                    const colors = ['#D00000', '#2D6CDF', '#D00000', '#1F8A70', '#2D6CDF', '#D9822B', '#673AB7', '#D00000'];
                    return (
                      <motion.div
                        key={`orb-${i}`}
                        animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
                        transition={{ duration: 8 + i * 2.5, repeat: Infinity, ease: 'linear', delay: i * 0.8 }}
                        style={{ position: 'absolute', width: ringSize, height: ringSize }}
                      >
                        <motion.div
                          animate={{ opacity: [0.2, 0.6, 0.2], scale: [0.8, 1.3, 0.8] }}
                          transition={{ duration: 2 + i * 0.5, repeat: Infinity, ease: 'easeInOut' }}
                          style={{
                            position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                            width: dotSize, height: dotSize, borderRadius: '50%', background: colors[i],
                          }}
                        />
                      </motion.div>
                    );
                  })}

                  {/* Sweeping arc lines */}
                  {[0, 1].map((i) => (
                    <motion.div
                      key={`sweep-${i}`}
                      animate={{ rotate: i === 0 ? 360 : -360 }}
                      transition={{ duration: 15 + i * 10, repeat: Infinity, ease: 'linear' }}
                      style={{ position: 'absolute', width: 360, height: 360 }}
                    >
                      <Box sx={{
                        position: 'absolute', top: 0, left: '50%', width: '50%', height: 1,
                        background: `linear-gradient(to right, transparent, ${i === 0 ? 'rgba(208,0,0,0.15)' : 'rgba(45,108,223,0.12)'}, transparent)`,
                        transformOrigin: 'left center',
                      }} />
                    </motion.div>
                  ))}
                </Box>
              </Grid>
            </Grid>
          </Container>
        </Box>

        {/* Hero-to-content gradient fade */}
        <Box sx={{
          height: 80,
          mt: -10,
          position: 'relative',
          zIndex: 1,
          background: (t) => `linear-gradient(to bottom, ${t.palette.mode === 'light' ? '#F5F7FA' : t.palette.background.default}, ${t.palette.background.default})`,
        }} />

        {/* Products Section */}
        <Container id="products-section" maxWidth="xl" sx={{
          py: 2,
          px: { xs: 2, md: 3 },
          mt: -4,
          position: 'relative',
          zIndex: 10,
          scrollMarginTop: '80px'
        }}>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.5 }}>
            <Typography variant="overline" sx={{ display: 'block', mb: 4, letterSpacing: '0.08em', color: 'text.secondary', fontWeight: 600, fontSize: '0.75rem' }}>
              <AnimatedQualarisWord withDots={false} sx={{ fontSize: '0.75rem', fontWeight: 700, verticalAlign: 'middle' }} /> APPLICATION SUITE
            </Typography>
          </motion.div>
          <Grid container spacing={4}>

            {/* RAG EVAL Card */}
            <Grid size={{ xs: 12, md: 3 }}>
              <motion.div style={{ height: '100%' }} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, delay: 0.1 }}>
                <MotionPaper
                  whileHover={{ y: -4 }}
                  onClick={() => router.push('/rag-eval')}
                  elevation={0}
                  sx={{
                    p: 4,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 3,
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.25s ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                      boxShadow: (t) => t.palette.mode === 'light' ? '0 8px 30px rgba(208,0,0,0.1)' : '0 8px 30px rgba(208,0,0,0.2)',
                    }
                  }}
                >
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{
                      width: 48, height: 48, borderRadius: 2,
                      bgcolor: (t) => t.palette.mode === 'light' ? '#FFE5E5' : alpha(t.palette.primary.main, 0.15),
                      display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2,
                    }}>
                      <Activity size={24} color="#D00000" />
                    </Box>
                    <Typography variant="h4" sx={{ mb: 1, whiteSpace: 'nowrap', fontWeight: 600 }}>RAG <Box component="span" sx={{ color: 'primary.main' }}>EVAL</Box></Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                      Evaluate retrieval quality across multi-model RAG systems with run history, architecture-level leaderboards, and side-by-side comparisons.
                      Measure faithfulness, relevancy, correctness, context precision/recall, and toxicity with configurable scoring.
                    </Typography>
                  </Box>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid size={{ xs: 6 }}>
                      <Box sx={{ p: 2, borderRadius: 2, bgcolor: (t) => t.palette.mode === 'light' ? '#F5F7FA' : 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                        <FileSpreadsheet size={16} style={{ marginBottom: 8, color: '#5B6472' }} />
                        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>Data Input</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>Excel Upload</Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Box sx={{ p: 2, borderRadius: 2, bgcolor: (t) => t.palette.mode === 'light' ? '#F5F7FA' : 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                        <GitCompare size={16} style={{ marginBottom: 8, color: '#5B6472' }} />
                        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>Architecture</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>Model Leaderboard</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                  <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main', fontSize: '0.9rem', fontWeight: 600, transition: 'gap 0.2s', '&:hover': { gap: 1.5 } }}>
                    Launch<ArrowRight size={16} />
                  </Box>
                </MotionPaper>
              </motion.div>
            </Grid>

            {/* AGENT EVAL Card */}
            <Grid size={{ xs: 12, md: 3 }}>
              <motion.div style={{ height: '100%' }} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, delay: 0.2 }}>
                <MotionPaper
                  whileHover={{ y: -4 }}
                  onClick={() => router.push('/agent-eval/dashboard')}
                  elevation={0}
                  sx={{
                    p: 4,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 3,
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.25s ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                      boxShadow: (t) => t.palette.mode === 'light' ? '0 8px 30px rgba(208,0,0,0.1)' : '0 8px 30px rgba(208,0,0,0.2)',
                    }
                  }}
                >
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{
                      width: 48, height: 48, borderRadius: 2,
                      bgcolor: (t) => t.palette.mode === 'light' ? '#FFE5E5' : alpha(t.palette.primary.main, 0.15),
                      display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2,
                    }}>
                      <Brain size={24} color="#D00000" />
                    </Box>
                    <Typography variant="h4" sx={{ mb: 1, whiteSpace: 'nowrap', fontWeight: 600 }}>AGENT <Box component="span" sx={{ color: 'primary.main' }}>EVAL</Box></Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                      Validate autonomous agent outputs against structured ground truth through JSON and batch workflows.
                      Track accuracy, completeness, hallucination, consistency, and safety with weighted production thresholds and admin review loops.
                    </Typography>
                  </Box>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid size={{ xs: 6 }}>
                      <Box sx={{ p: 2, borderRadius: 2, bgcolor: (t) => t.palette.mode === 'light' ? '#F5F7FA' : 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                        <FileJson size={16} style={{ marginBottom: 8, color: '#5B6472' }} />
                        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>Evaluation Mode</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>JSON + Batch APIs</Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Box sx={{ p: 2, borderRadius: 2, bgcolor: (t) => t.palette.mode === 'light' ? '#F5F7FA' : 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                        <ShieldCheck size={16} style={{ marginBottom: 8, color: '#5B6472' }} />
                        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>Content Safety</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>Safety + Judge Signals</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                  <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main', fontSize: '0.9rem', fontWeight: 600, transition: 'gap 0.2s', '&:hover': { gap: 1.5 } }}>
                    Launch<ArrowRight size={16} />
                  </Box>
                </MotionPaper>
              </motion.div>
            </Grid>

            {/* GROUND TRUTH GENERATOR Card */}
            <Grid size={{ xs: 12, md: 3 }}>
              <motion.div style={{ height: '100%' }} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, delay: 0.3 }}>
                <MotionPaper
                  whileHover={{ y: -4 }}
                  onClick={() => router.push('/ground-truth')}
                  elevation={0}
                  sx={{
                    p: 4,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 3,
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.25s ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                      boxShadow: (t) => t.palette.mode === 'light' ? '0 8px 30px rgba(208,0,0,0.1)' : '0 8px 30px rgba(208,0,0,0.2)',
                    }
                  }}
                >
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{
                      width: 48, height: 48, borderRadius: 2,
                      bgcolor: (t) => t.palette.mode === 'light' ? '#FFE5E5' : alpha(t.palette.primary.main, 0.15),
                      display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2,
                    }}>
                      <Sparkles size={24} color="#D00000" />
                    </Box>
                    <Typography variant="h4" sx={{ mb: 1, whiteSpace: 'nowrap', fontWeight: 600 }}>GROUND TRUTH <Box component="span" sx={{ color: 'primary.main' }}>GENERATOR</Box></Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                      Create and maintain high-quality JSON/YAML datasets with schema-aware editing, validation, and reusable templates.
                      Supports Excel and HTML portability to directly feed RAG Eval and Agent Eval pipelines.
                    </Typography>
                  </Box>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid size={{ xs: 6 }}>
                      <Box sx={{ p: 2, borderRadius: 2, bgcolor: (t) => t.palette.mode === 'light' ? '#F5F7FA' : 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                        <FileJson size={16} style={{ marginBottom: 8, color: '#5B6472' }} />
                        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>Editor Modes</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>JSON / YAML / Form</Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Box sx={{ p: 2, borderRadius: 2, bgcolor: (t) => t.palette.mode === 'light' ? '#F5F7FA' : 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                        <Download size={16} style={{ marginBottom: 8, color: '#5B6472' }} />
                        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>Data Ops</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>Excel/HTML Portability</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                  <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main', fontSize: '0.9rem', fontWeight: 600, transition: 'gap 0.2s', '&:hover': { gap: 1.5 } }}>
                    Launch<ArrowRight size={16} />
                  </Box>
                </MotionPaper>
              </motion.div>
            </Grid>

            {/* PLAYWRIGHT COMPASS Card */}
            <Grid size={{ xs: 12, md: 3 }}>
              <motion.div style={{ height: '100%' }} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, delay: 0.4 }}>
                <MotionPaper
                  whileHover={{ y: -4 }}
                  onClick={() => router.push('/playwright-pom')}
                  elevation={0}
                  sx={{
                    p: 4,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 3,
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.25s ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                      boxShadow: (t) => t.palette.mode === 'light' ? '0 8px 30px rgba(208,0,0,0.1)' : '0 8px 30px rgba(208,0,0,0.2)',
                    }
                  }}
                >
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{
                      width: 48, height: 48, borderRadius: 2,
                      bgcolor: (t) => t.palette.mode === 'light' ? '#FFE5E5' : alpha(t.palette.primary.main, 0.15),
                      display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2,
                    }}>
                      <Wrench size={24} color="#D00000" />
                    </Box>
                    <Typography variant="h4" sx={{ mb: 1, whiteSpace: 'nowrap', fontWeight: 600 }}>PLAYWRIGHT <Box component="span" sx={{ color: 'primary.main' }}>COMPASS</Box></Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                      Design, run, and maintain Playwright browser automation workflows in one production module.
                      Includes AI-assisted studio, test design, execution, locator management, reusable flows, self-healing, architecture visibility, and ROI tracking.
                    </Typography>
                  </Box>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid size={{ xs: 6 }}>
                      <Box sx={{ p: 2, borderRadius: 2, bgcolor: (t) => t.palette.mode === 'light' ? '#F5F7FA' : 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                        <Target size={16} style={{ marginBottom: 8, color: '#5B6472' }} />
                        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>Automation Design</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>Studio + Reusable Flows</Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Box sx={{ p: 2, borderRadius: 2, bgcolor: (t) => t.palette.mode === 'light' ? '#F5F7FA' : 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                        <Activity size={16} style={{ marginBottom: 8, color: '#5B6472' }} />
                        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>Execution Ops</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>Runs + Self-Healing</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                  <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main', fontSize: '0.9rem', fontWeight: 600, transition: 'gap 0.2s', '&:hover': { gap: 1.5 } }}>
                    Launch<ArrowRight size={16} />
                  </Box>
                </MotionPaper>
              </motion.div>
            </Grid>

          </Grid>
        </Container>

        <Container maxWidth="xl" sx={{ py: 4, px: { xs: 2, md: 3 } }}>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.5 }}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 3, md: 4 },
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: '0.1em' }}>
                  PLATFORM AT A GLANCE
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 600, mt: 1.5, mb: 1.5 }}>
                  One Connected Workflow Across <Box component="span" sx={{ color: 'primary.main' }}>4 Applications</Box>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 900, mx: 'auto', lineHeight: 1.7 }}>
                  Qualaris is designed for real production teams: define trusted reference data, validate automation behavior,
                  evaluate RAG quality, and benchmark agent outcomes in a single operating model.
                </Typography>
              </Box>

              <Grid container spacing={2.5} sx={{ mb: 4 }}>
                {[
                  {
                    icon: <Sparkles size={18} />,
                    title: 'Ground Truth Generator',
                    desc: 'Create and maintain high-quality reference datasets in JSON/YAML/Form with schema validation and template support.',
                  },
                  {
                    icon: <Wrench size={18} />,
                    title: 'Playwright Compass',
                    desc: 'Build and operate browser automation with AI-assisted studio, reusable flows, locator governance, and self-healing.',
                  },
                  {
                    icon: <Activity size={18} />,
                    title: 'RAG Eval',
                    desc: 'Measure retrieval and answer quality across architectures using configurable scoring and leaderboard comparisons.',
                  },
                  {
                    icon: <Brain size={18} />,
                    title: 'Agent Eval',
                    desc: 'Benchmark autonomous agent outputs against expected results with safety, consistency, and completeness signals.',
                  },
                ].map((item) => (
                  <Grid key={item.title} size={{ xs: 12, md: 6, lg: 3 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.25,
                        borderRadius: 2.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        height: '100%',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: 'primary.main',
                          boxShadow: (t) => t.palette.mode === 'light' ? '0 6px 18px rgba(208,0,0,0.08)' : '0 6px 18px rgba(208,0,0,0.18)',
                        },
                      }}
                    >
                      <Box sx={{ p: 1, borderRadius: 2, bgcolor: (t) => t.palette.mode === 'light' ? '#FFE5E5' : alpha(t.palette.primary.main, 0.15), color: 'primary.main', display: 'inline-flex', mb: 1.25 }}>
                        {item.icon}
                      </Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>
                        {item.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
                        {item.desc}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              <Grid container spacing={2}>
                {[
                  {
                    icon: <ShieldCheck size={16} />,
                    title: 'Enterprise Governance',
                    desc: 'Role-aware operations, auditable workflows, and configurable quality thresholds for production programs.',
                  },
                  {
                    icon: <Gauge size={16} />,
                    title: 'Operational Reliability',
                    desc: 'Built for repeatable runs with deterministic scoring patterns, traceable outcomes, and reusable artifacts.',
                  },
                  {
                    icon: <Download size={16} />,
                    title: 'Reporting & Portability',
                    desc: 'Export-ready output for engineering, QA, and leadership with JSON, Excel, PDF, and dashboard views.',
                  },
                ].map((item) => (
                  <Grid key={item.title} size={{ xs: 12, md: 4 }}>
                    <Stack direction="row" spacing={1.25} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', height: '100%' }}>
                      <Box sx={{ mt: 0.2, color: 'primary.main' }}>{item.icon}</Box>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.25 }}>{item.title}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>{item.desc}</Typography>
                      </Box>
                    </Stack>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </motion.div>
        </Container>

        {/* Methodology Section */}
        <Container id="methodology-section" maxWidth="xl" sx={{ py: 10, px: { xs: 2, md: 3 }, scrollMarginTop: '80px' }}>
          <Stack spacing={6}>
            <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.5 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: '0.1em' }}>
                  METHODOLOGY
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 600, mt: 2, mb: 3 }}>
                  How We <Box component="span" sx={{ color: 'primary.main' }}>Evaluate</Box>
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 800, mx: 'auto', lineHeight: 1.7 }}>
                  Qualaris connects data preparation, automation, and evaluation in one workflow: Ground Truth Generator for dataset engineering,
                  Playwright Compass for browser automation operations, RAG Eval for retrieval benchmarking, and Agent Eval for output validation with configurable weighted metrics.
                </Typography>
              </Box>
            </motion.div>

            <Grid container spacing={4}>
              <Grid size={{ xs: 12, md: 6 }}>
                <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, delay: 0.1 }}>
                  <Paper elevation={0} sx={{ p: 4, borderRadius: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', height: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                      <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: (t) => t.palette.mode === 'light' ? '#FFE5E5' : 'rgba(208,0,0,0.15)', color: 'primary.main' }}>
                        <Activity size={24} />
                      </Box>
                      <Typography variant="h5" fontWeight={600}>RAG Metrics</Typography>
                    </Box>
                    <Stack spacing={3}>
                      <MetricItem
                        title="RQS (Retrieval Quality Score)"
                        desc="Weighted composite: RQS = α × Correctness + β × Faithfulness + γ × Relevancy. Configurable with context precision and context recall."
                      />
                      <MetricItem
                        title="Faithfulness & Relevancy"
                        desc="Faithfulness measures grounding in retrieved context. Relevancy scores how well the answer addresses the original query intent."
                      />
                      <MetricItem
                        title="Context Precision & Recall"
                        desc="Precision evaluates signal-to-noise in retrieved chunks. Recall measures whether the retrieval found the answer at all."
                      />
                    </Stack>
                  </Paper>
                </motion.div>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, delay: 0.2 }}>
                  <Paper elevation={0} sx={{ p: 4, borderRadius: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', height: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                      <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: (t) => t.palette.mode === 'light' ? '#FFE5E5' : 'rgba(208,0,0,0.15)', color: 'primary.main' }}>
                        <Brain size={24} />
                      </Box>
                      <Typography variant="h5" fontWeight={600}>Agent Metrics</Typography>
                    </Box>
                    <Stack spacing={3}>
                      <MetricItem
                        title="Accuracy & Completeness"
                        desc="Accuracy uses exact, numeric, or semantic matching against ground truth. Completeness checks all expected JSON keys are present."
                      />
                      <MetricItem
                        title="Hallucination Detection"
                        desc="Identifies output content not grounded in reference data. Scored 0-1 and inversely weighted in the Agent RQS formula."
                      />
                      <MetricItem
                        title="Consistency & Safety"
                        desc="Consistency measures output stability across identical runs. Safety uses LLM judge scoring to detect harmful or biased content."
                      />
                    </Stack>
                  </Paper>
                </motion.div>
              </Grid>
            </Grid>

            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.3 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => router.push('/docs')}
                  sx={{
                    borderRadius: 2, px: 4, py: 1.5,
                    borderColor: 'divider', color: 'text.primary',
                    '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(208,0,0,0.04)' }
                  }}
                >
                  View Full Documentation & Formulas
                </Button>
              </Box>
            </motion.div>
          </Stack>
        </Container>

        {/* Capabilities Section */}
        <Box id="capabilities-section" sx={{ borderTop: '1px solid', borderColor: 'divider', py: 10, bgcolor: (t) => t.palette.mode === 'light' ? '#EEF1F5' : 'action.hover', scrollMarginTop: '80px' }}>
          <Container maxWidth="xl" sx={{ px: { xs: 2, md: 3 } }}>
            <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.5 }}>
              <Typography variant="overline" sx={{ display: 'block', mb: 2, textAlign: 'center', color: 'primary.main', fontWeight: 800, letterSpacing: '0.1em', fontSize: '0.75rem' }}>
                CAPABILITIES
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 600, textAlign: 'center', mb: 6 }}>
                Built for <Box component="span" sx={{ color: 'primary.main' }}>Production Workflows</Box>
              </Typography>
            </motion.div>
            <Grid container spacing={3}>
              {[
                { icon: <FileSpreadsheet size={22} />, title: 'Excel-Driven Evaluation', desc: 'Upload .xlsx datasets with queries, ground truth, and multiple bot columns. Auto-detected architectures scored in parallel.' },
                { icon: <GitCompare size={22} />, title: 'Architecture Comparison', desc: 'Leaderboard ranking across Bot_A, Bot_B, Bot_C and more. Compare any two historical evaluations side-by-side.' },
                { icon: <FileJson size={22} />, title: 'JSON & Batch Workflows', desc: 'Paste JSON or provide file paths for agent evaluation. Configurable key mapping for query_id, expected, and actual outputs.' },
                { icon: <Sparkles size={22} />, title: 'Ground Truth Engineering', desc: 'Schema-aware JSON/YAML/Form editing with template libraries, validation workflows, and Excel/HTML portability.' },
                { icon: <Download size={22} />, title: 'Multi-Format Export', desc: 'Export evaluation reports as PDF, JSON, or Excel with production intelligence summaries, leaderboards, and transactional detail.' },
                { icon: <Zap size={22} />, title: 'Configurable RQS Engine', desc: 'Tune α, β, γ weights, semantic thresholds, judge models, strictness, temperature, and safety scoring per evaluation.' },
              ].map((item, idx) => (
                <Grid key={item.title} size={{ xs: 12, sm: 6, md: 4 }}>
                  <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.4, delay: 0.08 * idx }}
                  >
                    <Paper elevation={0} sx={{
                      p: 3, borderRadius: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
                      height: '100%', transition: 'all 0.25s ease',
                      '&:hover': { borderColor: 'primary.main', transform: 'translateY(-2px)', boxShadow: (t) => t.palette.mode === 'light' ? '0 6px 20px rgba(0,0,0,0.06)' : '0 6px 20px rgba(0,0,0,0.3)' }
                    }}>
                      <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: (t) => t.palette.mode === 'light' ? '#FFE5E5' : alpha(t.palette.primary.main, 0.15), color: 'primary.main', display: 'inline-flex', mb: 2 }}>
                        {item.icon}
                      </Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>{item.title}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>{item.desc}</Typography>
                    </Paper>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        {/* Feedback Section */}
        <Box id="feedback-section" sx={{ borderTop: '1px solid', borderColor: 'divider', py: 10, bgcolor: 'background.default', scrollMarginTop: '80px' }}>
          <Container maxWidth="xl" sx={{ px: { xs: 2, md: 3 } }}>
            <FeedbackSection />
          </Container>
        </Box>

        {/* Tech Stack Strip */}
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider', py: 6, bgcolor: 'background.default' }}>
          <Container maxWidth="xl" sx={{ px: { xs: 2, md: 3 } }}>
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
              <Typography variant="overline" sx={{ display: 'block', mb: 4, textAlign: 'center', color: 'text.secondary', fontWeight: 600, fontSize: '0.75rem' }}>
                POWERED BY
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: { xs: 2, md: 0 }, flexWrap: 'wrap', alignItems: 'center' }}>
                {['FastAPI', 'NEXT.js', 'RAGAS', 'Azure OpenAI', 'LLM Scoring'].map((tech, i, arr) => (
                  <Box key={tech} sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, letterSpacing: '-0.02em', color: 'text.secondary', fontSize: { xs: '0.85rem', md: '1rem' }, opacity: 0.75, px: { xs: 1, md: 3 } }}>{tech}</Typography>
                    {i < arr.length - 1 && <Box sx={{ width: '1px', height: 16, bgcolor: 'divider', display: { xs: 'none', md: 'block' } }} />}
                  </Box>
                ))}
              </Box>
            </motion.div>
          </Container>
        </Box>

        {/* Footer */}
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider', py: 8, bgcolor: (t) => t.palette.mode === 'light' ? '#F5F7FA' : 'background.paper' }}>
          <Container maxWidth="xl" sx={{ px: { xs: 2, md: 3 } }}>
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <UbsLogoFull
                    height={36}
                    keysColor={isLight ? theme.palette.text.primary : theme.palette.primary.main}
                    wordmarkColor={isLight ? theme.palette.primary.main : '#FFFFFF'}
                  />
                  <BrandPipe />
                  <Typography variant="h6" component="div" sx={{ whiteSpace: 'nowrap', fontSize: '1.125rem' }}>
                    <AnimatedQualarisWord />
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Public-facing quality engineering suite for ground truth engineering, Playwright automation, RAG benchmarking, and autonomous agent evaluation.
                </Typography>
              </Grid>
              <Grid size={{ xs: 6, md: 2 }}>
                <Typography variant="subtitle2" sx={{ color: 'text.primary', mb: 2, fontWeight: 600 }}>About</Typography>
                <Stack spacing={1.5}>
                  <Box component="a" href="/docs#rag-eval" sx={{ textDecoration: 'none', color: 'text.secondary', '&:hover': { color: 'primary.main' }, transition: 'color 0.2s', fontSize: '0.875rem', display: 'block' }}>RAG Eval</Box>
                  <Box component="a" href="/docs#agent-eval" sx={{ textDecoration: 'none', color: 'text.secondary', '&:hover': { color: 'primary.main' }, transition: 'color 0.2s', fontSize: '0.875rem', display: 'block' }}>Agent Eval</Box>
                  <Box component="a" href="/docs#ground-truth-application" sx={{ textDecoration: 'none', color: 'text.secondary', '&:hover': { color: 'primary.main' }, transition: 'color 0.2s', fontSize: '0.875rem', display: 'block' }}>Ground Truth Generator</Box>
                  <Box component="a" href="/docs#playwright-compass" sx={{ textDecoration: 'none', color: 'text.secondary', '&:hover': { color: 'primary.main' }, transition: 'color 0.2s', fontSize: '0.875rem', display: 'block' }}>Playwright Compass (POM)</Box>
                  <Box component="a" href="#feedback-section" sx={{ textDecoration: 'none', color: 'text.secondary', '&:hover': { color: 'primary.main' }, transition: 'color 0.2s', fontSize: '0.875rem', display: 'block' }}>Feedback</Box>
                  <Box component="a" href="/docs#contact-support" sx={{ textDecoration: 'none', color: 'text.secondary', '&:hover': { color: 'primary.main' }, transition: 'color 0.2s', fontSize: '0.875rem', display: 'block' }}>Contact</Box>
                </Stack>
              </Grid>
              <Grid size={{ xs: 6, md: 2 }}>
                <Typography variant="subtitle2" sx={{ color: 'text.primary', mb: 2, fontWeight: 600 }}>Resources</Typography>
                <Stack spacing={1.5}>
                  <Typography variant="body2" sx={{ cursor: 'pointer', color: 'text.secondary', '&:hover': { color: 'primary.main' }, transition: 'color 0.2s' }} onClick={() => router.push('/docs')}>Documentation</Typography>
                  <Typography variant="body2" sx={{ cursor: 'pointer', color: 'text.secondary', '&:hover': { color: 'primary.main' }, transition: 'color 0.2s' }} onClick={() => window.open(`${API_ROOT}/docs`, '_blank')}>API Reference</Typography>
                  <Typography variant="body2" sx={{ cursor: 'pointer', color: 'text.secondary', '&:hover': { color: 'primary.main' }, transition: 'color 0.2s' }} onClick={() => document.getElementById('feedback-section')?.scrollIntoView({ behavior: 'smooth' })}>Feedback</Typography>
                </Stack>
              </Grid>
            </Grid>
            <Box sx={{ mt: 8, pt: 4, borderTop: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                © 2026 UBS. Qualaris — Production AI Quality Platform.
              </Typography>
                            
            </Box>
          </Container>
        </Box>

      </Box>
  );
}

function MetricItem({ title, desc }: { title: string; desc: string }) {
  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>{title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>{desc}</Typography>
    </Box>
  );
}

/* ─── Feedback Section ─── */

const FEEDBACK_API = `${API_ROOT}/agent-eval/feedback`;
const TEST_DESIGN_FEEDBACK_API = '/api/playwright-pom/feedback/list';

const RATING_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Needs Work', color: '#C23030' },
  2: { label: 'Below Average', color: '#E67E22' },
  3: { label: 'Average', color: '#F1C40F' },
  4: { label: 'Good', color: '#27AE60' },
  5: { label: 'Excellent', color: '#2D6CDF' },
};

interface FeedbackEntry {
  id: number; timestamp: string; rating: number; suggestion: string;
  admin_response?: string | null; admin_responded_at?: string | null;
  source?: 'agent_eval' | 'test_design';
}

function formatTimeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function FeedbackSection() {
  const theme = useTheme();
  const { isAuthenticated, getAuthHeaders } = useAuth();
  const [rating, setRating] = useState<number | null>(0);
  const [hoverRating, setHoverRating] = useState(-1);
  const [suggestion, setSuggestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedbacks, setFeedbacks] = useState<FeedbackEntry[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');
  const [snackSev, setSnackSev] = useState<'success' | 'error'>('success');
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { setIsAdminUser(false); return; }
    authFetch(`${FEEDBACK_API}/admin-check`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setIsAdminUser(d.is_admin); })
      .catch(() => {});
  }, [isAuthenticated]);

  const fetchFeedback = useCallback(async () => {
    try {
      const testDesignRequest = isAuthenticated
        ? fetch(TEST_DESIGN_FEEDBACK_API, { headers: getAuthHeaders() })
        : Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
      const [agentEvalRes, testDesignRes] = await Promise.all([
        fetch(FEEDBACK_API),
        testDesignRequest,
      ]);

      const merged: FeedbackEntry[] = [];

      if (agentEvalRes.ok) {
        const data = await agentEvalRes.json();
        if (Array.isArray(data)) {
          merged.push(
            ...data.map((item: FeedbackEntry) => ({
              ...item,
              source: 'agent_eval' as const,
            })),
          );
        }
      }

      if (testDesignRes.ok) {
        const data = await testDesignRes.json();
        if (Array.isArray(data)) {
          merged.push(
            ...data
              .filter((item: any) => item?.category === 'ai_generation')
              .map((item: any) => ({
                id: 1000000 + Number(item.id || 0),
                timestamp: item.timestamp || new Date().toISOString(),
                rating: Number(item.rating || 0),
                suggestion: item.message || '',
                source: 'test_design' as const,
              })),
          );
        }
      }

      merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setFeedbacks(merged);
    } catch { /* silent */ } finally { setFetchLoading(false); }
  }, [getAuthHeaders, isAuthenticated]);

  useEffect(() => { fetchFeedback(); }, [fetchFeedback]);

  const handleSubmit = async () => {
    if (!rating) { setSnackMsg('Please select a rating.'); setSnackSev('error'); setSnackOpen(true); return; }
    if (loading) return;
    setLoading(true);
    try {
      const res = await authFetch(FEEDBACK_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, suggestion }),
      });
      if (!res.ok) throw new Error();
      setSnackMsg('Thank you for your feedback!'); setSnackSev('success'); setSnackOpen(true);
      setRating(0); setSuggestion('');
      setSubmitted(true); setTimeout(() => setSubmitted(false), 2500);
      fetchFeedback();
    } catch { setSnackMsg('Failed to submit. Please try again.'); setSnackSev('error'); setSnackOpen(true); }
    finally { setLoading(false); }
  };

  const handleReply = async (feedbackId: number) => {
    if (!replyText.trim() || replyLoading) return;
    setReplyLoading(true);
    try {
      const res = await authFetch(`${FEEDBACK_API}/${feedbackId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: replyText.trim() }),
      });
      if (!res.ok) throw new Error();
      setReplyingTo(null); setReplyText('');
      setSnackMsg('Response posted.'); setSnackSev('success'); setSnackOpen(true);
      fetchFeedback();
    } catch { setSnackMsg('Failed to post response.'); setSnackSev('error'); setSnackOpen(true); }
    finally { setReplyLoading(false); }
  };

  const avgRating = feedbacks.length > 0 ? feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length : 0;
  const positive = feedbacks.filter(f => f.rating >= 4).length;
  const activeLabel = RATING_LABELS[hoverRating > 0 ? hoverRating : (rating || 0)];

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.5 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: '0.1em' }}>
            FEEDBACK
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 600, mt: 2, mb: 2 }}>
            Help Us <Box component="span" sx={{ color: 'primary.main' }}>Improve</Box>
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 700, mx: 'auto', lineHeight: 1.7 }}>
            Your feedback directly shapes our roadmap. We review product feedback across all applications and prioritize recurring themes for future releases.
          </Typography>
        </Box>
      </motion.div>

      {/* Stats Row */}
          {feedbacks.length > 0 && (
            <Grid container spacing={2} sx={{ mb: 4 }}>
              {[
                { icon: <Star size={20} />, label: 'Avg Rating', value: avgRating.toFixed(1), color: '#F1C40F' },
                { icon: <BarChart3 size={20} />, label: 'Total Responses', value: feedbacks.length, color: theme.palette.primary.main },
                { icon: <TrendingUp size={20} />, label: 'Positive', value: `${Math.round((positive / feedbacks.length) * 100)}%`, color: '#27AE60' },
                { icon: <Sparkles size={20} />, label: 'With Comments', value: feedbacks.filter(f => f.suggestion).length, color: '#9B59B6' },
              ].map((s, i) => (
                <Grid key={s.label} size={{ xs: 6, md: 3 }}>
                  <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.4 }}>
                    <Paper sx={{
                      p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider',
                      display: 'flex', alignItems: 'center', gap: 2,
                      transition: 'all 0.2s', '&:hover': { borderColor: s.color, transform: 'translateY(-2px)' },
                    }}>
                      <Box sx={{
                        p: 1.5, borderRadius: 2,
                        bgcolor: alpha(s.color, theme.palette.mode === 'dark' ? 0.15 : 0.08),
                        color: s.color, display: 'flex',
                      }}>
                        {s.icon}
                      </Box>
                      <Box>
                        <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.2 }}>{s.value}</Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>{s.label}</Typography>
                      </Box>
                    </Paper>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          )}

          <Grid container spacing={4}>
            {/* Form */}
            <Grid size={{ xs: 12, md: 5 }}>
              <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}>
                <Stack spacing={3}>
                  {/* Rating Distribution */}
                  {feedbacks.length > 0 && (
                    <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: 230 }}>
                      <Typography variant="subtitle1" fontWeight={800} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <BarChart3 size={18} /> Rating Distribution
                      </Typography>
                      <Stack spacing={1} sx={{ mt: 2 }}>
                        {[5, 4, 3, 2, 1].map((stars) => {
                          const count = feedbacks.filter(f => f.rating === stars).length;
                          const pct = (count / feedbacks.length) * 100;
                          const cfg = RATING_LABELS[stars];
                          return (
                            <Box key={stars} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Typography variant="caption" fontWeight={700} sx={{ minWidth: 12, textAlign: 'right' }}>{stars}</Typography>
                              <Star size={14} fill={cfg.color} color={cfg.color} />
                              <LinearProgress variant="determinate" value={pct} sx={{
                                flex: 1, height: 8, borderRadius: 4,
                                bgcolor: alpha(cfg.color, theme.palette.mode === 'dark' ? 0.1 : 0.08),
                                '& .MuiLinearProgress-bar': { bgcolor: cfg.color, borderRadius: 4 },
                              }} />
                              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ minWidth: 28, textAlign: 'right' }}>{count}</Typography>
                            </Box>
                          );
                        })}
                      </Stack>
                    </Paper>
                  )}

                  <Paper sx={{
                    p: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider',
                    position: 'relative', overflow: 'hidden', height: 430,
                  }}>
                    {submitted && (
                      <Fade in>
                        <Box sx={{
                          position: 'absolute', inset: 0, display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          bgcolor: alpha(theme.palette.background.paper, 0.95), zIndex: 10, borderRadius: 3,
                        }}>
                          <Stack alignItems="center" spacing={1}>
                            <CheckCircle2 size={48} color="#27AE60" />
                            <Typography variant="h6" fontWeight={700} color="#27AE60">Thank you!</Typography>
                          </Stack>
                        </Box>
                      </Fade>
                    )}

                    <Typography variant="h6" fontWeight={800} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Send size={18} /> Share Your Experience
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Your input directly influences our priorities and roadmap.
                    </Typography>

                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>How would you rate Qualaris?</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Rating
                          value={rating}
                          onChange={(_, v) => setRating(v)}
                          onChangeActive={(_, v) => setHoverRating(v)}
                          size="large"
                          sx={{
                            '& .MuiRating-iconFilled': { color: activeLabel?.color || '#F1C40F' },
                            '& .MuiRating-iconHover': { color: activeLabel?.color || '#F1C40F' },
                          }}
                        />
                        {activeLabel && (
                          <Fade in key={activeLabel.label}>
                            <Chip label={activeLabel.label} size="small" sx={{
                              fontWeight: 700, fontSize: '0.7rem',
                              bgcolor: alpha(activeLabel.color, theme.palette.mode === 'dark' ? 0.15 : 0.08),
                              color: activeLabel.color,
                            }} />
                          </Fade>
                        )}
                      </Box>
                    </Box>

                    <TextField
                      fullWidth label="Comments or Suggestions" multiline rows={4}
                      value={suggestion} onChange={(e) => setSuggestion(e.target.value)}
                      placeholder="What do you like? What could be better? Any feature requests?"
                      sx={{ mb: 3 }}
                    />

                    <Button variant="contained" size="large" onClick={handleSubmit}
                      disabled={loading || !rating} endIcon={<Send size={16} />}
                      fullWidth sx={{ fontWeight: 700, borderRadius: 2, py: 1.5 }}
                    >
                      {loading ? 'Submitting...' : 'Submit Feedback'}
                    </Button>
                  </Paper>
                </Stack>
              </motion.div>
            </Grid>

            {/* Recent Feedback */}
            <Grid size={{ xs: 12, md: 7 }}>
              <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}>
                <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: 684, overflow: 'auto' }}>
                  <Typography variant="subtitle1" fontWeight={800} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Clock size={18} /> Recent Feedback
                  </Typography>

                  {fetchLoading ? (
                    <Stack spacing={2}>
                      {[1, 2, 3].map(i => <Skeleton key={i} variant="rounded" height={90} sx={{ borderRadius: 3 }} />)}
                    </Stack>
                  ) : feedbacks.length === 0 ? (
                    <Box sx={{ py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, opacity: 0.6 }}>
                      <MessageSquare size={48} strokeWidth={1} />
                      <Typography variant="body1" fontWeight={600}>No feedback yet</Typography>
                      <Typography variant="body2" color="text.secondary">Be the first to share your thoughts!</Typography>
                    </Box>
                  ) : (
                    <Stack spacing={2}>
                      {feedbacks.map((fb, idx) => {
                        const cfg = RATING_LABELS[fb.rating] || RATING_LABELS[3];
                        const sentColor = fb.rating >= 4 ? '#27AE60' : fb.rating <= 2 ? '#C23030' : '#F1C40F';
                        return (
                          <Grow in key={fb.id} timeout={300 + idx * 50}>
                            <Card variant="outlined" sx={{
                              borderRadius: 3, transition: 'all 0.2s',
                              '&:hover': { borderColor: cfg.color, boxShadow: `0 0 0 1px ${alpha(cfg.color, 0.3)}` },
                            }}>
                              <CardContent sx={{ '&:last-child': { pb: 2 }, p: 2.5 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Rating value={fb.rating} readOnly size="small" />
                                    <Chip
                                      icon={fb.rating >= 4 ? <ThumbsUp size={14} /> : fb.rating <= 2 ? <ThumbsDown size={14} /> : <Minus size={14} />}
                                      label={cfg.label} size="small"
                                      sx={{
                                        fontWeight: 700, fontSize: '0.65rem', height: 22,
                                        bgcolor: alpha(sentColor, theme.palette.mode === 'dark' ? 0.15 : 0.08),
                                        color: sentColor, '& .MuiChip-icon': { color: sentColor },
                                      }}
                                    />
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Clock size={12} />
                                    <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                      {formatTimeAgo(fb.timestamp)}
                                    </Typography>
                                  </Box>
                                </Box>
                                {fb.suggestion ? (
                                  <Typography variant="body2" sx={{
                                    lineHeight: 1.6, fontStyle: 'italic', pl: 1.5,
                                    borderLeft: `3px solid ${alpha(cfg.color, 0.4)}`,
                                  }}>
                                    &ldquo;{fb.suggestion}&rdquo;
                                  </Typography>
                                ) : (
                                  <Typography variant="body2" color="text.disabled" fontStyle="italic">No comment provided</Typography>
                                )}

                                {/* Admin response display */}
                                {fb.admin_response && (
                                  <Box sx={{
                                    mt: 1.5, p: 1.5, borderRadius: 2,
                                    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.08 : 0.04),
                                    border: '1px solid', borderColor: alpha(theme.palette.primary.main, 0.15),
                                  }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                      <ShieldAdmin size={12} color={theme.palette.primary.main} />
                                      <Typography variant="caption" fontWeight={700} color="primary.main">Admin</Typography>
                                      {fb.admin_responded_at && (
                                        <Typography variant="caption" color="text.disabled" sx={{ ml: 'auto' }}>
                                          {formatTimeAgo(fb.admin_responded_at)}
                                        </Typography>
                                      )}
                                    </Box>
                                    <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                                      {fb.admin_response}
                                    </Typography>
                                  </Box>
                                )}

                                {/* Admin reply UI */}
                                {isAdminUser && fb.source !== 'test_design' && !fb.admin_response && (
                                  replyingTo === fb.id ? (
                                    <Box sx={{ mt: 1.5, display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                                      <TextField
                                        size="small" fullWidth multiline maxRows={3}
                                        placeholder="Write a response..."
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(fb.id); } }}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.8rem' } }}
                                      />
                                      <IconButton
                                        size="small"
                                        disabled={replyLoading || !replyText.trim()}
                                        onClick={() => handleReply(fb.id)}
                                        sx={{
                                          bgcolor: 'primary.main', color: '#fff',
                                          '&:hover': { bgcolor: 'primary.dark' },
                                          '&.Mui-disabled': { bgcolor: alpha(theme.palette.primary.main, 0.3), color: alpha('#fff', 0.5) },
                                          width: 32, height: 32,
                                        }}
                                      >
                                        <Send size={15} />
                                      </IconButton>
                                      <IconButton
                                        size="small"
                                        onClick={() => { setReplyingTo(null); setReplyText(''); }}
                                        sx={{ width: 32, height: 32, border: '1px solid', borderColor: 'divider' }}
                                      >
                                        <X size={15} />
                                      </IconButton>
                                    </Box>
                                  ) : (
                                    <Button
                                      size="small" startIcon={<Reply size={14} />}
                                      onClick={() => { setReplyingTo(fb.id); setReplyText(''); }}
                                      sx={{ mt: 1, fontWeight: 600, fontSize: '0.7rem', textTransform: 'none', color: 'text.secondary' }}
                                    >
                                      Reply
                                    </Button>
                                  )
                                )}
                              </CardContent>
                            </Card>
                          </Grow>
                        );
                      })}
                    </Stack>
                  )}
                </Paper>
              </motion.div>
            </Grid>
          </Grid>

      <UBSSnackbar open={snackOpen} message={snackMsg} severity={snackSev} onClose={() => setSnackOpen(false)} />
    </>
  );
}
