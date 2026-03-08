"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import {
    Box,
    Paper,
    TextField,
    FormControlLabel,
    Checkbox,
    Button,
    CircularProgress,
} from "@mui/material";

interface TestInputProps {
    onRunTest: (prompt: string, expectedKeys: string[], expectedOutput: string, enableLlmJudge: boolean) => Promise<void>;
    isLoading: boolean;
}

export function TestInput({ onRunTest, isLoading }: TestInputProps) {
    const [prompt, setPrompt] = useState("Generate a user profile for John Doe, age 30, software engineer.");
    const [expectedKeys, setExpectedKeys] = useState("name, age, occupation");
    const [expectedOutput, setExpectedOutput] = useState("");
    const [enableLlmJudge, setEnableLlmJudge] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const keys = expectedKeys.split(",").map(k => k.trim()).filter(k => k);
        onRunTest(prompt, keys, expectedOutput, enableLlmJudge);
    };

    return (
        <Paper
            variant="outlined"
            component="form"
            onSubmit={handleSubmit}
            sx={{
                p: 3,
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
            }}
        >
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField
                    label="Test Prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    multiline
                    rows={4}
                    placeholder="Enter instructions for the agent..."
                    fullWidth
                    size="small"
                />
                <TextField
                    label="Ground Truth JSON Keys (comma separated)"
                    value={expectedKeys}
                    onChange={(e) => setExpectedKeys(e.target.value)}
                    placeholder="name, age, email..."
                    fullWidth
                    size="small"
                />
                <TextField
                    label="Ground Truth Output (Optional - for NLP Metrics)"
                    value={expectedOutput}
                    onChange={(e) => setExpectedOutput(e.target.value)}
                    multiline
                    rows={4}
                    placeholder='{"name": "John Doe", "age": 30} ...'
                    fullWidth
                    size="small"
                />
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={enableLlmJudge}
                            onChange={(e) => setEnableLlmJudge(e.target.checked)}
                            color="primary"
                        />
                    }
                    label="Enable LLM Judge (Requires API Key)"
                />
                <Button
                    type="submit"
                    variant="contained"
                    disabled={isLoading}
                    fullWidth
                    startIcon={
                        isLoading ? (
                            <CircularProgress size={18} color="inherit" />
                        ) : (
                            <Play size={18} />
                        )
                    }
                    sx={{ py: 1.5 }}
                >
                    {isLoading ? "Running Evaluation..." : "Run Test"}
                </Button>
            </Box>
        </Paper>
    );
}
