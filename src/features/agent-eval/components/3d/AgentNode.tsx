'use client';
import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Html } from '@react-three/drei';
import * as THREE from 'three';

interface AgentNodeProps {
    position: [number, number, number];
    name: string;
    status: 'idle' | 'working' | 'error' | 'success';
    onClick?: () => void;
}

export default function AgentNode({ position, name, status, onClick }: AgentNodeProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    // Color mapping based on status
    const colors = {
        idle: '#4fc3f7',    // Light Blue
        working: '#ffd740', // Amber
        error: '#ff5252',   // Red
        success: '#69f0ae'  // Green
    };

    const activeColor = colors[status];

    useFrame((state, delta) => {
        if (meshRef.current) {
            // Gentle floating animation
            meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.1;

            // Rotation animation
            meshRef.current.rotation.x += delta * 0.2;
            meshRef.current.rotation.y += delta * 0.3;

            // Pulse effect when working
            if (status === 'working') {
                const scale = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.1;
                meshRef.current.scale.set(scale, scale, scale);
            } else {
                meshRef.current.scale.set(1, 1, 1);
            }
        }
    });

    return (
        <group position={position}>
            {/* Core Node */}
            <mesh
                ref={meshRef}
                onClick={onClick}
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
            >
                <icosahedronGeometry args={[0.5, 1]} />
                <meshStandardMaterial
                    color={activeColor}
                    emissive={activeColor}
                    emissiveIntensity={hovered ? 2 : 0.5}
                    wireframe={true}
                />
            </mesh>

            {/* Inner Glow Core */}
            <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[0.2, 16, 16]} />
                <meshBasicMaterial color={activeColor} />
            </mesh>

            {/* Label */}
            <Html position={[0, -0.8, 0]} center distanceFactor={10}>
                <div style={{
                    color: activeColor,
                    background: 'rgba(0,0,0,0.8)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    border: `1px solid ${activeColor}`,
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    opacity: 0.8
                }}>
                    {name}
                    <div style={{ fontSize: '10px', opacity: 0.7 }}>{status.toUpperCase()}</div>
                </div>
            </Html>
        </group>
    );
}
