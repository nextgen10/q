import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { keyframes } from '@mui/system';

// Subtle pulse for the center dot
const pulseDot = keyframes`
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 10px rgba(255, 59, 48, 0.6);
  }
  50% {
    transform: scale(1.1);
    box-shadow: 0 0 20px rgba(255, 59, 48, 0.8);
  }
`;

export const AppleCompass = ({ size = 100 }) => {
    const [rotation, setRotation] = useState(0);

    useEffect(() => {
        // Simulate compass needle movement
        const interval = setInterval(() => {
            setRotation(prev => (prev + 1) % 360);
        }, 50);

        return () => clearInterval(interval);
    }, []);

    return (
        <Box
            sx={{
                width: size,
                height: size,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'compass-rotate 20s linear infinite',
                '@keyframes compass-rotate': {
                    '0%': {
                        transform: 'rotate(0deg)',
                    },
                    '100%': {
                        transform: 'rotate(360deg)',
                    },
                },
            }}
        >
            {/* Outer metallic bezel */}
            <Box
                sx={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #e8e8e8 0%, #b8b8b8 50%, #d0d0d0 100%)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 2px 8px rgba(255, 255, 255, 0.5), inset 0 -2px 8px rgba(0, 0, 0, 0.3)',
                    position: 'absolute',
                    border: '3px solid #a0a0a0',
                }}
            />

            {/* Inner compass face */}
            <Box
                sx={{
                    width: '88%',
                    height: '88%',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 30% 30%, #ffffff, #f5f5f5 60%, #e0e0e0)',
                    position: 'absolute',
                    boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {/* Degree markings ring */}
                <Box
                    sx={{
                        width: '92%',
                        height: '92%',
                        borderRadius: '50%',
                        position: 'absolute',
                        background: 'linear-gradient(to bottom, #2c2c2c 0%, #1a1a1a 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {/* Degree marks */}
                    {[...Array(72)].map((_, i) => (
                        <Box
                            key={i}
                            sx={{
                                position: 'absolute',
                                width: i % 6 === 0 ? '2px' : '1px',
                                height: i % 6 === 0 ? '8px' : '5px',
                                background: '#fff',
                                transformOrigin: 'center',
                                transform: `rotate(${i * 5}deg) translateY(-${size * 0.38}px)`,
                                opacity: i % 6 === 0 ? 1 : 0.6,
                            }}
                        />
                    ))}
                </Box>

                {/* Inner white face */}
                <Box
                    sx={{
                        width: '78%',
                        height: '78%',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle at 35% 35%, #ffffff, #f8f8f8 50%, #ececec)',
                        position: 'absolute',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    }}
                >
                    {/* Cardinal directions */}
                    <Box
                        sx={{
                            position: 'absolute',
                            top: '8%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            fontSize: size * 0.16,
                            fontWeight: 600,
                            color: '#2c2c2c',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        }}
                    >
                        N
                    </Box>
                    <Box
                        sx={{
                            position: 'absolute',
                            bottom: '8%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            fontSize: size * 0.16,
                            fontWeight: 600,
                            color: '#2c2c2c',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        }}
                    >
                        S
                    </Box>
                    <Box
                        sx={{
                            position: 'absolute',
                            left: '8%',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: size * 0.16,
                            fontWeight: 600,
                            color: '#2c2c2c',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        }}
                    >
                        W
                    </Box>
                    <Box
                        sx={{
                            position: 'absolute',
                            right: '8%',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: size * 0.16,
                            fontWeight: 600,
                            color: '#2c2c2c',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        }}
                    >
                        E
                    </Box>

                    {/* Decorative compass rose */}
                    <Box
                        sx={{
                            position: 'absolute',
                            width: '40%',
                            height: '40%',
                            top: '30%',
                            left: '30%',
                        }}
                    >
                        {/* 8-point star */}
                        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                            <Box
                                key={angle}
                                sx={{
                                    position: 'absolute',
                                    width: '2px',
                                    height: '100%',
                                    background: i % 2 === 0
                                        ? 'linear-gradient(to bottom, transparent 0%, #8b7355 20%, #5a4a3a 50%, #8b7355 80%, transparent 100%)'
                                        : 'linear-gradient(to bottom, transparent 0%, #a0a0a0 20%, #707070 50%, #a0a0a0 80%, transparent 100%)',
                                    left: '50%',
                                    top: '0',
                                    transformOrigin: 'center',
                                    transform: `translateX(-50%) rotate(${angle}deg)`,
                                    opacity: 0.6,
                                }}
                            />
                        ))}
                    </Box>
                </Box>

                {/* Rotating needle container */}
                <Box
                    sx={{
                        position: 'absolute',
                        width: '60%',
                        height: '60%',
                        transform: `rotate(${rotation}deg)`,
                        transition: 'transform 0.05s linear',
                    }}
                >
                    {/* North needle (Red) */}
                    <Box
                        sx={{
                            position: 'absolute',
                            width: 0,
                            height: 0,
                            top: '10%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            borderLeft: `${size * 0.04}px solid transparent`,
                            borderRight: `${size * 0.04}px solid transparent`,
                            borderBottom: `${size * 0.35}px solid #ff3b30`,
                            filter: 'drop-shadow(0 2px 4px rgba(255, 59, 48, 0.4))',
                        }}
                    />

                    {/* South needle (White/Silver) */}
                    <Box
                        sx={{
                            position: 'absolute',
                            width: 0,
                            height: 0,
                            bottom: '10%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            borderLeft: `${size * 0.04}px solid transparent`,
                            borderRight: `${size * 0.04}px solid transparent`,
                            borderTop: `${size * 0.35}px solid #f0f0f0`,
                            filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
                        }}
                    />
                </Box>

                {/* Center pivot point */}
                <Box
                    sx={{
                        position: 'absolute',
                        width: size * 0.12,
                        height: size * 0.12,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle at 30% 30%, #ff6b6b, #ff3b30, #cc0000)',
                        boxShadow: '0 0 10px rgba(255, 59, 48, 0.6), inset 0 1px 3px rgba(255, 255, 255, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        animation: `${pulseDot} 2s ease-in-out infinite`,
                        zIndex: 10,
                    }}
                />
            </Box>
        </Box>
    );
};
