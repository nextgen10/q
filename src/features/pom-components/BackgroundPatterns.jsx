import React, { useCallback } from 'react';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';
import { useTheme } from '@mui/material/styles';

export default function BackgroundPatterns() {
    const theme = useTheme();
    const isDarkMode = theme.palette.mode === 'dark';

    const particlesInit = useCallback(async (engine) => {
        await loadSlim(engine);
    }, []);

    const particlesLoaded = useCallback(async (container) => {
        await container;
    }, []);

    return (
        <Particles
            id="tsparticles"
            init={particlesInit}
            loaded={particlesLoaded}
            options={{
                fullScreen: {
                    enable: true,
                    zIndex: -1
                },
                background: {
                    color: {
                        value: isDarkMode ? "#121212" : "#f5f5f5",
                    },
                },
                fpsLimit: 100,
                interactivity: {
                    events: {
                        onClick: {
                            enable: false,
                            mode: "push",
                        },
                        onHover: {
                            enable: true,
                            mode: "repulse",
                        },
                        resize: true,
                    },
                    modes: {
                        push: {
                            quantity: 4,
                        },
                        repulse: {
                            distance: 200,
                            duration: 0.4,
                        },
                    },
                },
                particles: {
                    color: {
                        value: isDarkMode ? "#ffffff" : "#000000",
                    },
                    links: {
                        color: isDarkMode ? "#ffffff" : "#000000",
                        distance: 150,
                        enable: true,
                        opacity: isDarkMode ? 0.4 : 0.25,
                        width: 1,
                    },
                    move: {
                        direction: "none",
                        enable: true,
                        outModes: {
                            default: "bounce",
                        },
                        random: false,
                        speed: 1,
                        straight: false,
                    },
                    number: {
                        density: {
                            enable: true,
                            area: 800,
                        },
                        value: 80,
                    },
                    opacity: {
                        value: isDarkMode ? 0.6 : 0.4,
                    },
                    shape: {
                        type: "circle",
                    },
                    size: {
                        value: { min: 1, max: 3 },
                    },
                },
                detectRetina: true,
            }}
        />
    );
}
