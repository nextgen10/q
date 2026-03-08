"use client";

import { motion } from "framer-motion";
import { Bot, CheckCircle, FileJson, Brain } from "lucide-react";
import { Box, Paper, Typography, useTheme, alpha } from "@mui/material";

interface AgentVisualizerProps {
    logs: any[];
    isLoading?: boolean;
}

export function AgentVisualizer({ logs, isLoading }: AgentVisualizerProps) {
    const theme = useTheme();
    const paperBg = theme.palette.background.paper;
    const dividerColor = theme.palette.divider;
    const activeColor = theme.palette.info.main;
    const activeBg = alpha(theme.palette.info.main, 0.15);
    const inactiveBg = theme.palette.action.hover;
    const textPrimary = theme.palette.text.primary;
    const textSecondary = theme.palette.text.secondary;

    const steps = [
        { id: "input", label: "User Input", icon: FileJson },
        { id: "target", label: "Target Agent", icon: Bot },
        { id: "evaluator", label: "Evaluator Agent", icon: Brain },
        { id: "result", label: "Final Result", icon: CheckCircle },
    ];

    const activeStepIndex = logs.length > 0 ? Math.min(logs.length, steps.length - 1) : 0;

    return (
        <Paper
            variant="outlined"
            sx={{
                p: 3,
                border: 1,
                borderColor: dividerColor,
                borderRadius: 2,
            }}
        >
            <Typography variant="h6" sx={{ mb: 3, color: textPrimary, fontWeight: 600 }}>
                Agent Workflow
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
                <Box
                    sx={{
                        position: "absolute",
                        top: "50%",
                        left: 0,
                        width: "100%",
                        height: 4,
                        bgcolor: dividerColor,
                        transform: "translateY(-50%)",
                        zIndex: 0,
                    }}
                />
                {steps.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = index <= activeStepIndex;
                    const isCurrent = index === activeStepIndex;

                    return (
                        <Box
                            key={step.id}
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 1,
                                bgcolor: paperBg,
                                px: 0.5,
                                position: "relative",
                                zIndex: 1,
                            }}
                        >
                            <Box
                                component={motion.div}
                                initial={false}
                                animate={{
                                    scale: isCurrent ? 1.1 : 1,
                                    borderColor: isActive ? activeColor : dividerColor,
                                    backgroundColor: isActive ? activeBg : inactiveBg,
                                }}
                                sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: "50%",
                                    border: 2,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: isActive ? activeColor : textSecondary,
                                    transition: "all 0.3s ease",
                                }}
                            >
                                <Icon size={20} />
                            </Box>
                            <Typography
                                variant="body2"
                                sx={{
                                    fontWeight: 500,
                                    color: isActive ? textPrimary : textSecondary,
                                }}
                            >
                                {step.label}
                            </Typography>
                        </Box>
                    );
                })}
            </Box>

            <Box
                sx={{
                    mt: 3,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    maxHeight: 240,
                    overflowY: "auto",
                    "&::-webkit-scrollbar": { width: 8 },
                    "&::-webkit-scrollbar-thumb": { borderRadius: 4, bgcolor: dividerColor },
                }}
            >
                {logs.map((log, idx) => (
                    <Box
                        component={motion.div}
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        sx={{
                            p: 1.5,
                            borderRadius: 1,
                            bgcolor: theme.palette.mode === "dark" ? "rgba(0,0,0,0.2)" : theme.palette.grey[100],
                            border: 1,
                            borderColor: dividerColor,
                            fontFamily: "monospace",
                            fontSize: "0.875rem",
                        }}
                    >
                        <Box component="span" sx={{ color: activeColor, fontWeight: 700 }}>
                            [{log.role}]
                        </Box>
                        :{" "}
                        <Box component="span" sx={{ color: textPrimary }}>
                            {log.content.substring(0, 200)}...
                        </Box>
                    </Box>
                ))}
            </Box>
        </Paper>
    );
}
