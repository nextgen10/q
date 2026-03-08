'use client';
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ConnectionLineProps {
    start: [number, number, number];
    end: [number, number, number];
    active?: boolean;
}

export default function ConnectionLine({ start, end, active = false }: ConnectionLineProps) {
    const lineRef = useRef<THREE.Line>(null);
    const particleRef = useRef<THREE.Mesh>(null);

    const points = useMemo(() => [new THREE.Vector3(...start), new THREE.Vector3(...end)], [start, end]);
    const lineGeometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

    useFrame((state) => {
        if (active && particleRef.current) {
            // Move particle along the line
            const t = (state.clock.elapsedTime % 1); // 0 to 1 loop
            const pos = new THREE.Vector3().lerpVectors(new THREE.Vector3(...start), new THREE.Vector3(...end), t);
            particleRef.current.position.copy(pos);
        }
    });

    return (
        <group>
            {/* The static connection line */}
            {/* @ts-ignore */}
            <line geometry={lineGeometry}>
                <lineBasicMaterial color="#4fc3f7" transparent opacity={0.2} />
            </line>

            {/* Animated data packet */}
            {active && (
                <mesh ref={particleRef}>
                    <sphereGeometry args={[0.05, 8, 8]} />
                    <meshBasicMaterial color="#ffffff" />
                </mesh>
            )}
        </group>
    );
}
