import React, { useState, useEffect } from 'react';
import { AlertCircle, AlertTriangle, Check, CheckCircle, Clock, Copy, FileCode, FolderInput, Play, Terminal, Upload, X, XCircle } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../UI/Card';
import { Button } from '../UI/Button';
import { PageHeader } from '../UI/PageHeader';
import { alpha, useTheme } from '@mui/material/styles';
import { Box, Typography } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';

export function TestRunnerView() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const { getAuthHeaders } = useAuth();
    const pomFetch = (input, init = {}) => {
        const headers = new Headers(init.headers || {});
        const authHeaders = getAuthHeaders();
        Object.entries(authHeaders).forEach(([key, value]) => headers.set(key, value));
        return fetch(input, { ...init, headers });
    };

    const [runningTest, setRunningTest] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);
    const [generatedFiles, setGeneratedFiles] = useState([]);

    // Live log streaming state
    const [liveLogs, setLiveLogs] = useState("");
    const [logOffset, setLogOffset] = useState(0);

    // Fetch generated files on mount
    useEffect(() => {
        pomFetch('/api/playwright-pom/generate/files')
            .then(res => res.json())
            .then(data => setGeneratedFiles(data.files || []))
            .catch(console.error);
    }, []);

    // Poll for live logs while test is running
    useEffect(() => {
        let interval;
        if (runningTest) {
            interval = setInterval(async () => {
                try {
                    const res = await pomFetch(`/api/playwright-pom/tests/logs?offset=${logOffset}`);
                    const data = await res.json();
                    if (data.content) {
                        setLiveLogs(prev => prev + data.content);
                        setLogOffset(data.offset);
                    }
                } catch (err) {
                    console.error('Failed to fetch logs:', err);
                }
            }, 500); // Poll every 500ms
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [runningTest, logOffset]);

    // Publish State
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [testName, setTestName] = useState("");
    const [folderName, setFolderName] = useState("");
    const [publishing, setPublishing] = useState(false);
    const [publishSuccess, setPublishSuccess] = useState(null);

    const runTest = async () => {
        try {
            // Reset logs for new test run
            setLiveLogs("");
            setLogOffset(0);
            setRunningTest(true);
            setTestResult(null);
            setError(null);
            const res = await pomFetch('/api/playwright-pom/tests/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.output || data.detail);
            setTestResult(data);
        } catch (e) {
            setError(e.message);
        }
        finally { setRunningTest(false); }
    };

    const handleCopy = () => {
        if (!testResult?.output) return;
        navigator.clipboard.writeText(testResult.output);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const publishTest = async () => {
        if (!testName.trim()) return;
        try {
            setPublishing(true);
            setError(null);
            const res = await pomFetch('/api/playwright-pom/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: testName,
                    folder_name: folderName.trim() || null
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail);

            setPublishSuccess(`Successfully published ${data.published_files.length} files to framework!`);
            setTimeout(() => {
                setShowPublishModal(false);
                setPublishSuccess(null);
                setTestName("");
                setFolderName("");
            }, 2000);
        } catch (e) {
            setError(e.message);
        } finally {
            setPublishing(false);
        }
    };

    return (
        <div className="relative">
            <PageHeader
                title="Pytest Runner"
                description="Execute generated Pytest scenarios and view reports."
            >
                <div className="flex gap-3">
                    <Button
                        variant="secondary"
                        onClick={() => setShowPublishModal(true)}
                        icon={Upload}
                        className=""
                    >
                        Publish to Framework
                    </Button>
                    <Button
                        variant="primary"
                        onClick={runTest}
                        loading={runningTest}
                        icon={Play}
                        disabled={runningTest}
                        className="pl-6 pr-8"
                    >
                        {runningTest ? "Running Test..." : "Run Latest Test"}
                    </Button>
                </div>
            </PageHeader>

            <div className="p-6 grid grid-cols-1 gap-6">
                {/* Latest Files Card */}
                {generatedFiles.length > 0 && (
                    <Card className={`${isDark ? '!bg-gray-900/30 !border-gray-800' : '!bg-white !border-gray-200 shadow-sm'}`}>
                        <div className="p-4 flex items-start gap-4">
                            <div className={`p-2 rounded-lg mt-1 ${isDark ? 'bg-red-600/10 text-red-400' : 'bg-blue-50 text-red-700'}`}>
                                <Clock size={20} />
                            </div>
                            <div className="flex-1">
                                <h3 className={`text-sm font-semibold mb-1 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>Staged Files</h3>
                                <p className={`text-xs mb-3 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>These files will be executed or published.</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {generatedFiles.map((file, i) => (
                                        <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded border text-xs font-mono truncated ${isDark ? 'bg-gray-950 border-gray-800 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                                            <FileCode size={12} className={isDark ? "text-red-600/50" : "text-red-600"} />
                                            <span className="truncate">{file}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                {error && (
                    <div className={`p-4 rounded-xl text-sm flex items-start gap-3 border ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-200' : 'bg-red-50 border-red-200 text-red-800'}`}>
                        <AlertTriangle size={20} className={`mt-0.5 shrink-0 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                        <div className="flex-1">
                            <h4 className={`font-bold mb-1 ${isDark ? 'text-red-400' : 'text-red-700'}`}>Error</h4>
                            <pre className="whitespace-pre-wrap font-mono text-xs opacity-80">{error}</pre>
                        </div>
                    </div>
                )}

                {testResult && (
                    <Card className={`border-l-4 ${testResult.status === 'success' ? 'border-l-green-500' : 'border-l-red-500'} ${isDark ? '!bg-[#161B22]' : '!bg-white shadow-sm'}`}>
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <div className={`flex items-center gap-3 ${testResult.status === 'success' ? (isDark ? 'text-green-400' : 'text-green-600') : (isDark ? 'text-red-400' : 'text-red-600')}`}>
                                    {testResult.status === 'success' ? <CheckCircle size={28} /> : <XCircle size={28} />}
                                    <div>
                                        <h3 className="text-xl font-bold">
                                            Test {testResult.status === 'success' ? 'Passed' : 'Failed'}
                                        </h3>
                                        <p className={`text-sm font-medium opacity-80 uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                                            Exit Code: {testResult.return_code}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-gray-950 border-gray-800' : 'bg-gray-900 border-gray-800'}`}>
                                <div className={`px-4 py-2 border-b flex justify-between items-center ${isDark ? 'bg-gray-900 border-gray-800 text-gray-400' : 'bg-gray-800 border-gray-700 text-gray-300'}`}>
                                    <div className="flex items-center gap-2">
                                        <Terminal size={14} />
                                        <span className="text-xs font-mono font-medium">Console Output</span>
                                    </div>
                                    <button
                                        onClick={handleCopy}
                                        className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide hover:text-white transition-colors"
                                    >
                                        {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                                        {copied ? "Copied" : "Copy"}
                                    </button>
                                </div>
                                <pre className="p-6 font-mono text-xs text-gray-300 overflow-auto whitespace-pre-wrap leading-relaxed max-h-[500px]">
                                    {testResult.output}
                                </pre>
                            </div>
                        </div>
                    </Card>
                )}


                {runningTest && !testResult && !error && (
                    <Card className={`border-red-600/20 ${isDark ? '!bg-blue-900/5' : '!bg-blue-50/50'}`}>
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="relative">
                                    <div className="w-8 h-8 border-2 border-red-600/20 border-t-red-600 rounded-full"></div>
                                    <Terminal size={14} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-red-400" />
                                </div>
                                <div>
                                    <p className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>Test Running...</p>
                                    <p className="text-xs text-gray-500">Streaming live execution logs</p>
                                </div>
                            </div>
                            <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-gray-950 border-gray-800' : 'bg-gray-900 border-gray-800'}`}>
                                <div className={`px-4 py-2 border-b flex items-center gap-2 ${isDark ? 'bg-gray-900 border-gray-800 text-gray-400' : 'bg-gray-800 border-gray-700 text-gray-300'}`}>
                                    <Terminal size={14} />
                                    <span className="text-xs font-mono font-medium">Live Console Output</span>
                                </div>
                                <div className="p-4 max-h-96 overflow-auto">
                                    <pre className="font-mono text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
                                        {liveLogs || "Initializing test execution..."}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                {!runningTest && !testResult && !error && (
                    <div className={`flex flex-col items-center justify-center p-20 border-2 border-dashed rounded-xl ${isDark ? 'border-gray-800 bg-gray-900/30 text-gray-600' : 'border-gray-200 bg-gray-50/50 text-gray-400'}`}>
                        <Play size={48} className="mb-4 opacity-20" />
                        <p className={`text-lg font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Ready to Execute</p>
                        <p className="text-sm opacity-60">Click "Run Latest Test" to start the Pytest runner.</p>
                    </div>
                )}
            </div>

            {/* Publish Modal */}
            {showPublishModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" onClick={() => { setShowPublishModal(false); setTestName(''); setFolderName(''); }} />
                    <div className={`relative w-[600px] max-h-[90vh] rounded-2xl border shadow-2xl overflow-hidden flex flex-col transform transition-all ${isDark ? 'bg-[#0D1117]/95 border-gray-800/60 shadow-black/80' : 'bg-white/95 border-gray-200 shadow-xl'} backdrop-blur-xl ring-1 ring-black/5`}>
                        {/* Premium Header */}
                        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-white/5 bg-gradient-to-r from-white/[0.02] to-transparent' : 'border-gray-100 bg-gradient-to-r from-gray-50 to-white'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${isDark ? 'from-red-600/20 to-red-600/20 ring-red-600/30' : 'from-purple-100 to-blue-100 ring-purple-200'} ring-1 shadow-inner`}>
                                    <Upload className="text-red-600" size={22} />
                                </div>
                                <div>
                                    <h3 className={`text-[17px] font-semibold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Publish to Framework</h3>
                                    <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-0.5`}>Add your generated code to the central repository</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setShowPublishModal(false); setTestName(''); setFolderName(''); }}
                                className={`p-2 rounded-xl transition-all ${isDark ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-thin scrollbar-thumb-gray-700">

                            {!publishSuccess ? (
                                <div className="space-y-6">
                                    {/* Name Configuration Group */}
                                    <div className={`p-5 rounded-xl border ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Folder Name Input (Optional) */}
                                            <div className="flex flex-col gap-1.5">
                                                <label className={`text-xs font-semibold tracking-wide uppercase ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                    Folder Name <span className="text-gray-500 font-normal capitalize">(optional)</span>
                                                </label>
                                                <div className="relative group">
                                                    <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors ${isDark ? 'text-gray-500 group-focus-within:text-yellow-500' : 'text-gray-400 group-focus-within:text-yellow-600'}`}>
                                                        <FolderInput size={15} />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={folderName}
                                                        onChange={(e) => setFolderName(e.target.value)}
                                                        placeholder="e.g., auth"
                                                        className={`w-full pl-9 pr-3 py-2.5 rounded-lg border text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600 ${isDark ? 'bg-black/40 border-gray-700 text-white placeholder-gray-600 hover:border-gray-600' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 hover:border-gray-400 shadow-sm'}`}
                                                        onKeyDown={(e) => e.key === 'Enter' && testName.trim() && publishTest()}
                                                    />
                                                </div>
                                            </div>

                                            {/* Scenario Name Input */}
                                            <div className="flex flex-col gap-1.5">
                                                <label className={`text-xs font-semibold tracking-wide uppercase ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                    Scenario Name <span className="text-red-500">*</span>
                                                </label>
                                                <div className="relative group">
                                                    <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors ${isDark ? 'text-gray-500 group-focus-within:text-red-400' : 'text-gray-400 group-focus-within:text-red-600'}`}>
                                                        <FileCode size={15} />
                                                    </div>
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        value={testName}
                                                        onChange={(e) => setTestName(e.target.value)}
                                                        placeholder="e.g., login_flow"
                                                        className={`w-full pl-9 pr-3 py-2.5 rounded-lg border text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600 ${isDark ? 'bg-black/40 border-gray-700 text-white placeholder-gray-600 hover:border-gray-600' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 hover:border-gray-400 shadow-sm'}`}
                                                        onKeyDown={(e) => e.key === 'Enter' && testName.trim() && publishTest()}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Preview Path */}
                                        <div className={`mt-4 pt-4 border-t ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
                                            <p className={`text-xs font-mono tracking-tight flex flex-wrap gap-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                <span className={isDark ? "text-gray-500" : "text-gray-400"}>Output Path:</span>
                                                <span>pages/</span>
                                                {folderName ? (
                                                    <>
                                                        <span className={isDark ? "text-yellow-400" : "text-yellow-600"}>{folderName.toLowerCase().replace(/[^\w-]/g, '_')}</span>
                                                        <span>/</span>
                                                    </>
                                                ) : null}
                                                <span className={testName ? (isDark ? "text-red-400" : "text-red-700") : (isDark ? "text-gray-600" : "text-gray-400")}>{testName ? testName.replace(/[^\w-]/g, '_') : '<name>'}_page.py</span>
                                                <span className="mx-1 text-gray-500">|</span>
                                                <span className={testName ? (isDark ? "text-red-400" : "text-red-700") : (isDark ? "text-gray-600" : "text-gray-400")}>{testName ? testName.replace(/[^\w-]/g, '_') : '<name>'}_test.py</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-10 space-y-5">
                                    <div className="relative inline-block">
                                        <div className={`absolute inset-0 rounded-full blur-xl opacity-50 ${isDark ? 'bg-green-500' : 'bg-green-400'}`}></div>
                                        <div className={`relative inline-flex p-4 rounded-full ${isDark ? 'bg-[#0D1117] border border-green-500/30' : 'bg-white border border-green-200 shadow-lg'} text-green-500`}>
                                            <CheckCircle size={48} className="animate-[pulse_2s_ease-in-out_infinite]" />
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Publish Successful!</h4>
                                        <p className={`font-medium text-sm ${isDark ? "text-green-400/80" : "text-green-600/80"}`}>{publishSuccess}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer Actions */}
                        <div className={`px-6 py-4 flex items-center justify-end gap-3 border-t ${isDark ? 'border-white/5 bg-gradient-to-r from-transparent to-white/[0.02]' : 'border-gray-100 bg-gray-50'}`}>
                            {!publishSuccess ? (
                                <>
                                    <button
                                        onClick={() => { setShowPublishModal(false); setTestName(''); setFolderName(''); }}
                                        className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
                                    >
                                        Cancel
                                    </button>
                                    <Button
                                        variant="primary"
                                        onClick={publishTest}
                                        disabled={!testName.trim() || publishing}
                                        className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${(!testName.trim() || publishing) ? 'opacity-50 cursor-not-allowed' : 'hover: hover:-translate-y-0.5'}`}
                                        loading={publishing}
                                        icon={Upload}
                                    >
                                        {publishing ? 'Publishing...' : 'Publish Framework'}
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    variant="primary"
                                    fullWidth
                                    onClick={() => { setShowPublishModal(false); setPublishSuccess(null); setTestName(''); setFolderName(''); }}
                                    className="px-6 py-3 rounded-xl font-semibold transition-all w-full !bg-green-500 hover:!bg-green-600 hover:"
                                    icon={Check}
                                >
                                    Done
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
