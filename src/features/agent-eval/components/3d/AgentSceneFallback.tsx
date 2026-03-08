'use client';
import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { AgentEvent } from '../../hooks/useAgentEvents';

interface AgentSceneFallbackProps {
    events?: AgentEvent[];
}

// Mock data (same as 3D scene)
const initialAgents = [
    { id: 'orchestrator', name: 'Orchestrator', x: 50, y: 20, status: 'idle' },
    { id: 'pdf_agent', name: 'PDF Agent', x: 30, y: 50, status: 'idle' },
    { id: 'web_agent', name: 'Web Agent', x: 70, y: 50, status: 'idle' },
    { id: 'evaluator', name: 'Evaluator', x: 50, y: 80, status: 'idle' },
];

const initialConnections = [
    { start: 'orchestrator', end: 'pdf_agent', active: false },
    { start: 'orchestrator', end: 'web_agent', active: false },
    { start: 'pdf_agent', end: 'evaluator', active: false },
    { start: 'web_agent', end: 'evaluator', active: false },
];

const colors: Record<string, string> = {
    idle: '#4fc3f7',    // Light Blue
    working: '#ffd740', // Amber
    error: '#ff5252',   // Red
    success: '#69f0ae'  // Green
};

export default function AgentSceneFallback({ events = [] }: AgentSceneFallbackProps) {
    const [agents, setAgents] = useState(initialAgents);
    const [connections, setConnections] = useState(initialConnections);

    // Process events to update state
    useEffect(() => {
        if (events.length === 0) return;

        const lastEvent = events[events.length - 1];
        const { agent_name, status } = lastEvent;

        // Map agent names to IDs
        let agentId = '';
        if (agent_name.includes('Orchestrator')) agentId = 'orchestrator';
        else if (agent_name.includes('PDF')) agentId = 'pdf_agent';
        else if (agent_name.includes('Web')) agentId = 'web_agent'; // Assuming Web Agent exists or maps to Target
        else if (agent_name.includes('Target')) agentId = 'web_agent'; // Mapping Target to Web for demo
        else if (agent_name.includes('Evaluator') || agent_name.includes('Match') || agent_name.includes('Rouge')) agentId = 'evaluator';

        if (agentId) {
            // Update Agent Status
            setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: status === 'working' ? 'working' : status === 'failed' ? 'error' : 'success' } : a));

            const timers: ReturnType<typeof setTimeout>[] = [];

            if (agentId !== 'orchestrator' && status === 'working') {
                setConnections(prev => prev.map(c =>
                    (c.start === 'orchestrator' && c.end === agentId) ? { ...c, active: true } : c
                ));

                timers.push(setTimeout(() => {
                    setConnections(prev => prev.map(c =>
                        (c.start === 'orchestrator' && c.end === agentId) ? { ...c, active: false } : c
                    ));
                }, 2000));
            }

            if (status === 'completed' || status === 'failed') {
                timers.push(setTimeout(() => {
                    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: 'idle' } : a));
                }, 3000));
            }

            return () => { timers.forEach(t => clearTimeout(t)); };
        }
    }, [events]);

    const getAgent = (id: string) => agents.find(a => a.id === id);

    return (
        <Box sx={{
            width: '100%',
            height: '100%',
            background: 'radial-gradient(circle at center, #1a1a1a 0%, #000000 100%)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Stars Background */}
            {[...Array(50)].map((_, i) => (
                <Box
                    key={i}
                    sx={{
                        position: 'absolute',
                        top: `${Math.random() * 100}%`,
                        left: `${Math.random() * 100}%`,
                        width: Math.random() * 3,
                        height: Math.random() * 3,
                        bgcolor: '#fff',
                        opacity: Math.random() * 0.5,
                        borderRadius: '50%',
                    }}
                />
            ))}

            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                {connections.map((conn, i) => {
                    const start = getAgent(conn.start);
                    const end = getAgent(conn.end);
                    if (!start || !end) return null;

                    return (
                        <g key={i}>
                            <line
                                x1={`${start.x}%`}
                                y1={`${start.y}%`}
                                x2={`${end.x}%`}
                                y2={`${end.y}%`}
                                stroke="#4fc3f7"
                                strokeWidth="1"
                                strokeOpacity="0.2"
                            />
                            {conn.active && (
                                <circle r="4" fill="#fff">
                                    <animateMotion
                                        dur="2s"
                                        repeatCount="indefinite"
                                        path={`M ${start.x * window.innerWidth / 100} ${start.y * window.innerHeight / 100} L ${end.x * window.innerWidth / 100} ${end.y * window.innerHeight / 100}`}
                                    // Note: SVG path coordinates need absolute values for animateMotion usually, 
                                    // but simple percentage lines are harder to animate along with standard SVG.
                                    // We'll use Framer Motion for the particle instead.
                                    />
                                </circle>
                            )}
                        </g>
                    );
                })}
            </svg>

            {/* Re-implementing connections with Framer Motion for better control */}
            {connections.map((conn, i) => {
                const start = getAgent(conn.start);
                const end = getAgent(conn.end);
                if (!start || !end || !conn.active) return null;

                return (
                    <motion.div
                        key={`particle-${i}`}
                        style={{
                            position: 'absolute',
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: '#fff',
                            boxShadow: '0 0 10px #fff',
                            top: 0, left: 0 // Reset for transform
                        }}
                        animate={{
                            x: [`${start.x}vw`, `${end.x}vw`],
                            y: [`${start.y}vh`, `${end.y}vh`],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "linear"
                        }}
                    />
                );
            })}

            {/* Agents */}
            {agents.map((agent) => (
                <Box
                    key={agent.id}
                    sx={{
                        position: 'absolute',
                        top: `${agent.y}%`,
                        left: `${agent.x}%`,
                        transform: 'translate(-50%, -50%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        zIndex: 2
                    }}
                >
                    <motion.div
                        animate={{
                            y: [0, -10, 0],
                        }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: Math.random() * 2
                        }}
                    >
                        <Box sx={{
                            width: 60,
                            height: 60,
                            borderRadius: '50%', // Circle instead of icosahedron
                            border: `2px solid ${colors[agent.status]}`,
                            bgcolor: 'rgba(0,0,0,0.8)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: `0 0 20px ${colors[agent.status]}40`,
                            position: 'relative'
                        }}>
                            {/* Inner Core */}
                            <Box sx={{
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                bgcolor: colors[agent.status],
                                boxShadow: `0 0 10px ${colors[agent.status]}`
                            }} />

                            {/* Pulse Ring */}
                            {agent.status === 'working' && (
                                <motion.div
                                    style={{
                                        position: 'absolute',
                                        width: '100%',
                                        height: '100%',
                                        borderRadius: '50%',
                                        border: `1px solid ${colors.working}`,
                                    }}
                                    animate={{ scale: [1, 1.5], opacity: [1, 0] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                />
                            )}
                        </Box>

                        {/* Label */}
                        <Box sx={{
                            mt: 2,
                            textAlign: 'center',
                            bgcolor: 'rgba(0,0,0,0.8)',
                            border: `1px solid ${colors[agent.status]}`,
                            borderRadius: 1,
                            px: 1,
                            py: 0.5,
                            backdropFilter: 'blur(4px)'
                        }}>
                            <Typography variant="caption" sx={{
                                color: colors[agent.status],
                                fontFamily: 'monospace',
                                fontWeight: 'bold',
                                display: 'block'
                            }}>
                                {agent.name}
                            </Typography>
                            <Typography variant="caption" sx={{
                                color: 'rgba(255,255,255,0.7)',
                                fontSize: '0.6rem'
                            }}>
                                {agent.status.toUpperCase()}
                            </Typography>
                        </Box>
                    </motion.div>
                </Box>
            ))}
        </Box>
    );
}
