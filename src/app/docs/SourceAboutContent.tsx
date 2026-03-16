import React from 'react';
import {
  Avatar,
  Box,
  Button,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { AlertTriangle, CheckCircle2, Compass, Grid, Layers, Mail, ShieldCheck, Target } from 'lucide-react';
import { MetricExplanationCard } from './MetricExplanationCard';

export function SourceAboutContent() {
  return (
    <Box sx={{ width: '100%' }}>
      <Box
        sx={{
          pt: 1,
          minWidth: 0,
          width: '100%',
          overflowY: 'visible',
          overflowX: 'hidden',
          '&::-webkit-scrollbar': { width: '8px' },
          '&::-webkit-scrollbar-track': { background: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.03)') },
          '&::-webkit-scrollbar-thumb': {
            background: (theme) => (theme.palette.mode === 'dark' ? 'rgba(120,120,128,0.3)' : 'rgba(120,120,128,0.3)'),
            borderRadius: '10px',
            border: (theme) => (theme.palette.mode === 'dark' ? 'none' : '2px solid transparent'),
            backgroundClip: 'padding-box',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: (theme) => (theme.palette.mode === 'dark' ? 'rgba(120,120,128,0.5)' : 'rgba(120,120,128,0.5)'),
            backgroundClip: 'padding-box',
          },
        }}
      >
        <Stack spacing={4} sx={{ pb: 2, pt: 2 }}>
          <MetricExplanationCard
            title="RQS (Retrieval Quality Score)"
            description="A single production score used to rank bots in Multi RAG EVAL."
            details="Formula used in this app: RQS = (alpha * AnswerCorrectness) + (beta * Faithfulness) + (gamma * AnswerRelevancy) + (delta * ((ContextPrecision + ContextRecall) / 2)), where delta = max(0, 1 - alpha - beta - gamma)."
            example="If alpha+beta+gamma = 0.80, then delta = 0.20 and that 0.20 is applied to average retrieval health ((precision + recall)/2)."
            color="#E60000"
            icon={<Target size={24} />}
          />

          <MetricExplanationCard
            title="Faithfulness (Groundedness)"
            description="RAGAS metric that measures whether answer claims are supported by retrieved context."
            details="RAGAS formula (faithfulness): F = N_supported_claims / N_total_claims. High F means the answer stays grounded in retrieved evidence."
            example="If 4 claims are made and 3 are supported by context, faithfulness = 3/4 = 0.75."
            color="#B71C1C"
            icon={<ShieldCheck size={24} />}
          />

          <MetricExplanationCard
            title="Answer Relevancy"
            description="LLM-judge metric in this app that scores how directly the answer addresses the question."
            details="Implemented as deterministic LLM scoring (temperature=0) with normalized output in [0,1]. This replaces embedding-based relevancy in the current pipeline."
            example="Question asks for a direct policy value, but the answer is mostly unrelated narrative -> low answer relevancy."
            color="#E60000"
            icon={<Target size={24} />}
          />

          <MetricExplanationCard
            title="Context Precision vs. Recall"
            description="RAGAS retrieval diagnostics: precision = signal quality, recall = evidence coverage."
            details="RAGAS context recall: CR = |RelevantClaims_retrieved| / |RelevantClaims_reference|. RAGAS context precision@K: CP = (1/R) * sum_{k=1..K}(Precision@k * rel_k), where rel_k in {0,1} and R = sum rel_k."
            example="High recall + low precision means you retrieved needed evidence but mixed it with noise. Low recall means required evidence was missing."
            color="#5A5A5A"
            icon={<Compass size={24} />}
          />

          <MetricExplanationCard
            title="Answer Correctness (GT Alignment)"
            description="LLM-judge metric in this app for factual and semantic alignment with ground truth."
            details="Implemented as deterministic LLM scoring (temperature=0) with normalized output in [0,1]. This score is used directly in RQS as AnswerCorrectness."
            example="Ground truth says '$40M' and answer says '$40 million in Q3' -> high correctness even with paraphrasing."
            color="#8C1D1D"
            icon={<Layers size={24} />}
          />

          <MetricExplanationCard
            title="Confusion Matrix"
            description="A per-bot diagnostic that cross-tabulates retrieval quality against generation quality across all test cases."
            details="Axes: Retrieval = context_recall ≥ threshold (good/poor). Generation = answer_correctness ≥ threshold (correct/wrong). Only cases with ground_truth are placed in the matrix; cases without are counted separately as skipped. Precision, Recall, F1, and Accuracy are derived from the four quadrant counts."
            example="10 cases: TP=6, FN=2, FP=1, TN=1 → Precision=6/(6+1)=0.86, Recall=6/(6+2)=0.75, F1=0.80. The 2 FN cases tell you retrieval is working but generation is the bottleneck."
            color="#B71C1C"
            icon={<Grid size={24} />}
          />

          <Box sx={{ mt: 1, mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 8, height: 24, bgcolor: '#E60000', borderRadius: 1 }} />
              Confusion Matrix - Quadrant Reference
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, maxWidth: 600 }}>
              Each test case is placed in one of four quadrants based on whether retrieval and generation both meet their configured thresholds.
              The <span style={{ fontWeight: 800, color: '#E60000' }}>restaurant analogy</span> - waiter = retrieval, chef = LLM generation - maps directly onto each outcome.
            </Typography>

            <TableContainer
              component={Paper}
              sx={{
                borderRadius: 3,
                bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : '#ffffff'),
                border: (theme) => `1px solid ${theme.palette.divider}`,
                overflow: 'hidden',
              }}
            >
              <Table size="small">
                <TableHead sx={{ bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(242,242,247,1)') }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, color: 'text.primary', py: 2, width: '10%' }}>QUADRANT</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: 'text.primary', width: '15%' }}>RETRIEVAL</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: 'text.primary', width: '15%' }}>GENERATION</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: 'text.primary', width: '25%' }}>RESTAURANT ANALOGY</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: 'text.primary' }}>WHAT TO DO</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    {
                      label: 'TP', color: '#047857', bg: (dark: boolean) => dark ? 'rgba(6,95,70,0.15)' : '#f0fdf4',
                      retrieval: 'Good (>= threshold)', generation: 'Correct (>= threshold)',
                      analogy: 'Great waiter, great chef - right ingredients, great dish',
                      action: 'Pipeline working end-to-end. No action needed.',
                    },
                    {
                      label: 'FN', color: '#b45309', bg: (dark: boolean) => dark ? 'rgba(120,53,15,0.15)' : '#fffbeb',
                      retrieval: 'Good (>= threshold)', generation: 'Wrong (< threshold)',
                      analogy: 'Great waiter, bad chef - right ingredients, ruined dish',
                      action: 'Retrieval is fine. Fix LLM prompt, system message, or generation parameters.',
                    },
                    {
                      label: 'FP', color: '#c2410c', bg: (dark: boolean) => dark ? 'rgba(124,45,18,0.15)' : '#fff7ed',
                      retrieval: 'Poor (< threshold)', generation: 'Correct (>= threshold)',
                      analogy: 'Bad waiter, somehow tasty - wrong ingredients, lucky dish',
                      action: 'Bot used prior knowledge or got lucky. Treat as hallucination risk even if correct.',
                    },
                    {
                      label: 'TN', color: '#dc2626', bg: (dark: boolean) => dark ? 'rgba(127,29,29,0.15)' : '#fef2f2',
                      retrieval: 'Poor (< threshold)', generation: 'Wrong (< threshold)',
                      analogy: 'Bad waiter, bad chef - wrong ingredients, bad dish',
                      action: 'Fix the retrieval layer first - improve chunking, embedding model, or index.',
                    },
                  ].map((row) => (
                    <TableRow key={row.label} sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell sx={{ py: 2, bgcolor: (theme) => row.bg(theme.palette.mode === 'dark') }}>
                        <Typography sx={{ fontWeight: 900, color: row.color, fontSize: '1rem', letterSpacing: '-0.02em' }}>
                          {row.label}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{row.retrieval}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{row.generation}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.78rem', fontStyle: 'italic', color: 'text.secondary' }}>
                          {row.analogy}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.78rem', color: 'text.primary' }}>
                          {row.action}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          <Box sx={{ mt: 1, mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 8, height: 24, bgcolor: '#E60000', borderRadius: 1 }} />
              Metrics Derived from Confusion Matrix
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, maxWidth: 600 }}>
              Using TP, TN, FP, FN we calculate four standard evaluation metrics. Each answers a different question about the bot's performance.
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              {[
                { number: '1', title: 'Accuracy', subtitle: 'Overall correctness of the model.', color: '#E60000', numerator: 'TP + TN', denominator: 'TP + TN + FP + FN', note: 'Good baseline measure, but can be misleading on imbalanced datasets.' },
                { number: '2', title: 'Precision', subtitle: 'How many predicted positives were actually correct.', color: '#B71C1C', numerator: 'TP', denominator: 'TP + FP', note: 'Use when false positives are costly - e.g. confidently wrong answers erode user trust.' },
                { number: '3', title: 'Recall  (Sensitivity)', subtitle: 'How many actual positives were detected.', color: '#6B6B6B', numerator: 'TP', denominator: 'TP + FN', note: 'Use when missing positives is dangerous - e.g. failing to surface a critical answer.' },
                {
                  number: '4',
                  title: 'F1 Score',
                  subtitle: 'Harmonic mean - balances precision and recall.',
                  color: '#8C1D1D',
                  numeratorNode: (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography sx={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.95rem' }}>
                        Precision
                      </Typography>
                      <Typography sx={{ fontWeight: 900, fontSize: '1rem', mx: 0.25 }}>x</Typography>
                      <Typography sx={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.95rem' }}>
                        Recall
                      </Typography>
                    </Box>
                  ),
                  denominatorNode: (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography sx={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.95rem' }}>
                        Precision
                      </Typography>
                      <Typography sx={{ fontWeight: 900, fontSize: '1rem', mx: 0.25 }}>+</Typography>
                      <Typography sx={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.95rem' }}>
                        Recall
                      </Typography>
                    </Box>
                  ),
                  prefixNode: (
                    <Typography sx={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.95rem', mr: 0.5 }}>
                      2 x
                    </Typography>
                  ),
                  note: 'Single number to compare models when both precision and recall matter.',
                },
              ].map((m) => (
                <Paper
                  key={m.title}
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                    transition: 'all 0.25s ease',
                    '&:hover': {
                      borderColor: m.color,
                      boxShadow: `0 8px 30px -8px ${m.color}44`,
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Box sx={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${m.color}20`, border: `1px solid ${m.color}55` }}>
                      <Typography sx={{ fontSize: '0.7rem', fontWeight: 900, color: m.color }}>{m.number}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: 'text.primary', lineHeight: 1.2 }}>
                        {m.title}
                      </Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>{m.subtitle}</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.04)', borderLeft: `3px solid ${m.color}`, borderRadius: '0 8px 8px 0', py: 1.5, px: 2, mb: 1.5 }}>
                    {'prefixNode' in m && m.prefixNode}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                      <Box sx={{ pb: 0.4 }}>
                        {'numeratorNode' in m && m.numeratorNode ? m.numeratorNode : (
                          <Typography sx={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.95rem', color: m.color }}>
                            {(m as any).numerator}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ width: '100%', height: '2px', bgcolor: m.color, borderRadius: 1, opacity: 0.7 }} />
                      <Box sx={{ pt: 0.4 }}>
                        {'denominatorNode' in m && m.denominatorNode ? m.denominatorNode : (
                          <Typography sx={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.95rem', color: 'text.secondary' }}>
                            {(m as any).denominator}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ p: 1.25, borderRadius: 1.5, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: (theme) => `1px dashed ${theme.palette.divider}` }}>
                    <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', lineHeight: 1.5, fontStyle: 'italic' }}>
                      {m.note}
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </Box>
          </Box>

          <MetricExplanationCard
            title="Hallucination Risk"
            description="Derived safety metric shown in Experiments for quick red/green risk interpretation."
            details="Formula in this app: HallucinationRisk = 1 - Faithfulness. Since faithfulness is RAGAS-grounded, hallucination risk rises when unsupported claims increase."
            example="Faithfulness = 0.22 implies HallucinationRisk = 0.78 (high risk)."
            color="#B71C1C"
            icon={<AlertTriangle size={24} />}
          />

          <Box sx={{ mt: 1, mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 8, height: 24, bgcolor: '#E60000', borderRadius: 1 }} />
              Pass Rate by Metric
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75, maxWidth: 640 }}>
              For each metric, pass rate measures the fraction of <strong>all</strong> test cases (including those without ground truth) where the score meets
              or exceeds the configured threshold.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, maxWidth: 640, fontFamily: 'monospace', fontSize: '0.8rem', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', px: 1.5, py: 1, borderRadius: 2, display: 'inline-block' }}>
              pass_rate = cases where score &gt;= threshold / total_cases
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 1.5, mb: 2.5 }}>
              {[
                { label: 'RQS', color: '#E60000', note: 'Composite production score. Passes when RQS >= threshold.' },
                { label: 'Faithfulness', color: '#B71C1C', note: 'Fraction of answer claims supported by retrieved context.' },
                { label: 'Answer Correctness', color: '#8C1D1D', note: 'LLM-judged factual alignment with ground truth.' },
                { label: 'Answer Relevancy', color: '#5A5A5A', note: 'LLM-judged how directly the answer addresses the question.' },
                { label: 'Context Recall', color: '#6B6B6B', note: 'Coverage of reference claims in retrieved context.' },
                { label: 'Context Precision', color: '#3E3E3E', note: 'Signal quality - how much retrieved context is relevant.' },
              ].map(({ label, color, note }) => (
                <Paper key={label} sx={{ p: 2, borderRadius: 2.5, border: (theme) => `1px solid ${theme.palette.divider}`, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', transition: 'all 0.2s ease', '&:hover': { borderColor: color, boxShadow: `0 6px 24px -6px ${color}44`, transform: 'translateY(-2px)' } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                    <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', color }}>{label}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', lineHeight: 1.5 }}>{note}</Typography>
                </Paper>
              ))}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              <strong>Colour coding</strong> in the pass rate bars follows a traffic-light scheme:
            </Typography>
            <Box sx={{ display: 'flex', gap: 3 }}>
              {[
                { color: '#34C759', label: '>= 80%', desc: 'Healthy' },
                { color: '#FF9500', label: '60 - 79%', desc: 'Needs attention' },
                { color: '#FF3B30', label: '< 60%', desc: 'Critical' },
              ].map(({ color, label, desc }) => (
                <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: 99, bgcolor: color, flexShrink: 0 }} />
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color }}>{label}</Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>- {desc}</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          <Box sx={{ mt: 4, mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 8, height: 24, bgcolor: '#E60000', borderRadius: 1 }} />
              Metric Architecture Matrix
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 600 }}>
              A technical breakdown of the signals required to compute each benchmark. Note that{' '}
              <span style={{ fontWeight: 800, color: '#E60000' }}>Retrieved Context</span> is the most critical element for RAG-specific diagnostics.
            </Typography>

            <TableContainer
              component={Paper}
              sx={{
                borderRadius: 3,
                bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : '#ffffff'),
                border: (theme) => `1px solid ${theme.palette.divider}`,
                overflow: 'hidden',
              }}
            >
              <Table size="small">
                <TableHead sx={{ bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(242,242,247,1)') }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, color: 'text.primary', py: 2 }}>METRIC</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, color: 'text.primary' }}>
                      QUESTION
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, color: 'primary.main' }}>
                      CONTEXT
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, color: 'text.primary' }}>
                      BOT ANSWER
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, color: 'text.primary' }}>
                      GROUND TRUTH
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    { name: 'Faithfulness', q: true, c: 'CRUCIAL', a: true, gt: false },
                    { name: 'Contextual Recall', q: true, c: 'CRUCIAL', a: false, gt: true },
                    { name: 'Contextual Precision', q: true, c: 'CRUCIAL', a: false, gt: true },
                    { name: 'Answer Relevancy (LLM)', q: true, c: false, a: true, gt: false },
                    { name: 'Answer Correctness (LLM)', q: true, c: false, a: true, gt: true },
                    { name: 'Toxicity (LLM)', q: true, c: false, a: true, gt: false },
                  ].map((row) => (
                    <TableRow key={row.name} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell component="th" scope="row" sx={{ fontWeight: 700, py: 2 }}>
                        {row.name}
                      </TableCell>
                      <TableCell align="center">{row.q ? <Box sx={{ color: '#10b981', display: 'flex', justifyContent: 'center' }}><CheckCircle2 size={18} /></Box> : '-'}</TableCell>
                      <TableCell align="center">
                        {row.c === 'CRUCIAL' ? (
                          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.5 }}>
                            <CheckCircle2 size={18} color="#E60000" />
                            <Typography sx={{ fontSize: '0.6rem', fontWeight: 900, color: 'primary.main', border: '1px solid', borderColor: 'primary.main', px: 0.5, borderRadius: 0.5 }}>
                              REQUIRED
                            </Typography>
                          </Box>
                        ) : row.c ? (
                          <CheckCircle2 size={18} color="#10b981" />
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell align="center">{row.a ? <Box sx={{ color: '#10b981', display: 'flex', justifyContent: 'center' }}><CheckCircle2 size={18} /></Box> : '-'}</TableCell>
                      <TableCell align="center">{row.gt ? <Box sx={{ color: '#10b981', display: 'flex', justifyContent: 'center' }}><CheckCircle2 size={18} /></Box> : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
