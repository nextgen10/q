'use client';
import React, { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Environment } from '@react-three/drei';
import AgentNode from './AgentNode';
import ConnectionLine from './ConnectionLine';
import { AgentEvent } from '../../hooks/useAgentEvents';

interface AgentSceneProps {
    events?: AgentEvent[];
}

export default function AgentScene({ events = [] }: AgentSceneProps) {
    // Initial State
    const [agents, setAgents] = useState<{
        id: string;
        name: string;
        position: number[];
        status: 'idle' | 'working' | 'error' | 'success';
    }[]>([
        { id: 'orchestrator', name: 'Orchestrator', position: [0, 2, 0], status: 'idle' },
        { id: 'pdf_agent', name: 'PDF Agent', position: [-2, 0, 0], status: 'idle' },
        { id: 'web_agent', name: 'Web Agent', position: [2, 0, 0], status: 'idle' },
        { id: 'evaluator', name: 'Evaluator', position: [0, -2, 0], status: 'idle' },
    ]);

    const [connections, setConnections] = useState([
        { start: 'orchestrator', end: 'pdf_agent', active: false },
        { start: 'orchestrator', end: 'web_agent', active: false },
        { start: 'pdf_agent', end: 'evaluator', active: false },
        { start: 'web_agent', end: 'evaluator', active: false },
    ]);

    // Process events
    useEffect(() => {
        if (events.length === 0) return;

        const lastEvent = events[events.length - 1];
        const { agent_name, status } = lastEvent;

        let agentId = '';
        if (agent_name.includes('Orchestrator')) agentId = 'orchestrator';
        else if (agent_name.includes('PDF')) agentId = 'pdf_agent';
        else if (agent_name.includes('Web')) agentId = 'web_agent';
        else if (agent_name.includes('Target')) agentId = 'web_agent';
        else if (agent_name.includes('Evaluator') || agent_name.includes('Match') || agent_name.includes('Rouge')) agentId = 'evaluator';

        const timers: ReturnType<typeof setTimeout>[] = [];

        if (agentId) {
            setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: (status === 'working' ? 'working' : status === 'failed' ? 'error' : status === 'completed' ? 'success' : 'idle') as 'idle' | 'working' | 'error' | 'success' } : a));

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
        }

        return () => { timers.forEach(t => clearTimeout(t)); };
    }, [events]);

    const getPosition = (id: string) => agents.find(a => a.id === id)?.position || [0, 0, 0];

    return (
        <div style={{ width: '100%', height: '100vh', background: '#050505' }}>
            <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
                <Suspense fallback={null}>
                    {/* Environment & Lighting */}
                    <color attach="background" args={['#050505']} />
                    <fog attach="fog" args={['#050505', 5, 20]} />
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={1} />
                    <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

                    {/* Controls */}
                    <OrbitControls enablePan={false} minDistance={4} maxDistance={15} />

                    {/* Agents */}
                    {agents.map(agent => (
                        <AgentNode
                            key={agent.id}
                            position={agent.position as [number, number, number]}
                            name={agent.name}
                            status={agent.status}
                        />
                    ))}

                    {/* Connections */}
                    {connections.map((conn, i) => (
                        <ConnectionLine
                            key={i}
                            start={getPosition(conn.start) as [number, number, number]}
                            end={getPosition(conn.end) as [number, number, number]}
                            active={conn.active}
                        />
                    ))}
                </Suspense>
            </Canvas>
        </div>
    );
}
