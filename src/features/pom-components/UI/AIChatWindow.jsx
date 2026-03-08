import React, { useRef, useEffect, useState } from 'react';
import {
    Bot,
    X,
    Send,
    Trash2,
    User,
    Sparkles,
    Check,
    Copy,
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';

export const AIChatWindow = ({
    isDark,
    showChat,
    setShowChat,
    chatMessages,
    setChatMessages,
    isChatTyping,
    includeContext,
    setIncludeContext,
    onSendMessage
}) => {
    const chatEndRef = useRef(null);
    const inputRef = useRef(null);
    const [copiedId, setCopiedId] = useState(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (showChat) {
            scrollToBottom();
            inputRef.current?.focus();
        }
    }, [showChat, chatMessages, isChatTyping]);

    if (!showChat) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        const value = inputRef.current.value.trim();
        if (!value || isChatTyping) return;

        onSendMessage(value);
        inputRef.current.value = '';
    };

    const handleCopy = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className={`fixed bottom-24 right-6 w-[560px] h-[600px] flex flex-col rounded-3xl border transition-all duration-300 transform animate-in fade-in slide-in-from-bottom-4 ${isDark
            ? 'bg-[#1e1e1e] border-red-500/35 ring-1 ring-white/10 shadow-2xl'
            : 'bg-white border-red-200 ring-1 ring-black/5 shadow-2xl'
            } z-[100] overflow-hidden`}>

            {/* Header: Pure Modernist */}
            <div className={`flex items-center justify-between border-b ${isDark ? 'bg-[#252526] border-[#333]' : 'bg-gray-50 border-gray-200'}`} style={{ minHeight: 66, padding: '12px 20px' }}>
                <div className="flex items-center" style={{ gap: 10 }}>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-br from-[#D00000] via-[#D00000] to-[#D00000] text-white shadow-lg shadow-red-500/20`}>
                        <Bot size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h3 className={`font-semibold text-sm leading-tight mb-0 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                            Playwright Coding Assistant
                        </h3>
                        <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            <span className={`text-xs opacity-50 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                Online
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center" style={{ gap: 6 }}>
                    <button
                        onClick={() => setChatMessages([])}
                        className={`rounded-full transition-colors ${isDark ? 'hover:bg-zinc-800 text-zinc-500' : 'hover:bg-zinc-100 text-zinc-400'}`} style={{ padding: 7 }}
                        title="Clear History"
                    >
                        <Trash2 size={16} />
                    </button>
                    <button
                        onClick={() => setShowChat(false)}
                        className={`rounded-full transition-colors ${isDark ? 'hover:bg-zinc-800 text-zinc-500' : 'hover:bg-zinc-100 text-zinc-400'}`} style={{ padding: 7 }}
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Chat Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                {chatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${isDark ? 'bg-[#252526]' : 'bg-zinc-50'}`}>
                            <Sparkles size={32} className="text-red-500" />
                        </div>
                        <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>How can I help you?</h2>
                        <p className={`text-sm opacity-60 leading-relaxed max-w-[280px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            Ask me anything about playwright pom framework, I can help fix your tests.
                        </p>
                    </div>
                ) : (
                    chatMessages.map((msg, idx) => (
                        <div key={idx} className={`group flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            {/* Simple Circle Avatars */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-transparent ${msg.role === 'user'
                                ? 'bg-[#D00000] text-white shadow-sm'
                                : 'bg-[#D00000] text-white shadow-sm'
                                }`}>
                                {msg.role === 'user' ? <User size={14} strokeWidth={2.5} /> : <Bot size={14} strokeWidth={2.5} />}
                            </div>

                            <div className={`max-w-[85%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`rounded-2xl text-[13.5px] leading-relaxed ${msg.role === 'user'
                                    ? (isDark ? 'bg-[#2a2323] border border-[#493434] text-zinc-100' : 'bg-[#fff7f7] border border-[#f4dede] text-zinc-900 shadow-sm')
                                    : (isDark ? 'bg-[#232629] border border-[#33383f] text-zinc-200' : 'bg-[#f7f7f7] border border-[#e5e7eb] text-zinc-800 shadow-sm')
                                    }`} style={{ padding: '10px 14px' }}>
                                    {msg.content && msg.content.includes('```') ? (
                                        <div className="space-y-3">
                                            {msg.content.split('```').map((block, i) => {
                                                if (i % 2 === 1) {
                                                    // Robust extraction: if the first line looks like a language tag (no spaces), strip it.
                                                    // Otherwise, keep the whole block.
                                                    const lines = block.split('\n');
                                                    const firstLine = lines[0].trim();
                                                    const hasLanguageTag = firstLine && !firstLine.includes(' ') && lines.length > 1;
                                                    const content = hasLanguageTag ? lines.slice(1).join('\n') : block;

                                                    return (
                                                        <div key={i} className="relative rounded-xl overflow-hidden my-3 border border-transparent group/code">
                                                            <div className="absolute z-10" style={{ left: 6, bottom: 6 }}>
                                                                <button
                                                                    onClick={() => handleCopy(content, `code-${idx}-${i}`)}
                                                                    className={`p-1.5 rounded-full transition-all flex items-center gap-1.5 ${isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'}`}
                                                                    title="Copy Code Snippet"
                                                                >
                                                                    {copiedId === `code-${idx}-${i}` ? (
                                                                        <Check size={14} className="text-red-500" />
                                                                    ) : (
                                                                        <Copy size={14} />
                                                                    )}
                                                                </button>
                                                            </div>
                                                            <SyntaxHighlighter
                                                                language="python"
                                                                style={isDark ? vscDarkPlus : vs}
                                                                codeTagProps={{
                                                                    style: {
                                                                        fontSize: 'inherit',
                                                                        fontFamily: 'inherit',
                                                                        lineHeight: 'inherit',
                                                                    }
                                                                }}
                                                                customStyle={{
                                                                    margin: 0,
                                                                    padding: '1rem',
                                                                    paddingBottom: '2.5rem',
                                                                    fontSize: isDark ? '12.5px' : '13.5px',
                                                                    lineHeight: '1.6',
                                                                    backgroundColor: isDark ? '#09090b' : '#f8f9fa',
                                                                    fontFamily: '"Fira Code", "Fira Mono", "Roboto Mono", monospace',
                                                                }}
                                                            >
                                                                {content}
                                                            </SyntaxHighlighter>
                                                        </div>
                                                    );
                                                }
                                                return <p key={i} className="whitespace-pre-wrap">{block}</p>;
                                            })}
                                        </div>
                                    ) : (
                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                    )}
                                </div>
                                {msg.role !== 'user' && (
                                    <button
                                        onClick={() => handleCopy(msg.content, `msg-${idx}`)}
                                        className={`mt-1 p-1.5 rounded-full transition-all flex items-center gap-1.5 ${isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'}`}
                                        title="Copy Response"
                                    >
                                        {copiedId === `msg-${idx}` ? (
                                            <>
                                                <Check size={14} className="text-red-500" />

                                            </>
                                        ) : (
                                            <Copy size={14} />
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}

                {isChatTyping && (
                    <div className="flex gap-2.5 animate-in fade-in">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-[#D00000] text-white shadow-sm`}>
                            <Bot size={14} strokeWidth={2.5} />
                        </div>
                        <div className={`rounded-2xl ${isDark ? 'bg-[#252526] border border-[#333]' : 'bg-white border border-gray-200 shadow-sm'}`} style={{ padding: '10px 14px' }}>
                            <div className="flex gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-red-500 animate-bounce" />
                                <span className="w-1 h-1 rounded-full bg-red-500 animate-bounce [animation-delay:0.2s]" />
                                <span className="w-1 h-1 rounded-full bg-red-500 animate-bounce [animation-delay:0.4s]" />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Input Block */}
            <div className={`border-t ${isDark ? 'border-[#333] bg-[#252526]/50' : 'border-zinc-100 bg-gray-50'}`} style={{ padding: '14px 20px' }}>
                <div className="flex items-center gap-2 mb-4">
                    <button
                        onClick={() => setIncludeContext(!includeContext)}
                        className={`flex items-center gap-2 rounded-full border transition-all ${includeContext
                            ? (isDark ? 'bg-red-500/10 border-red-500/50 text-red-400' : 'bg-red-50 border-red-200 text-red-700')
                            : (isDark ? 'border-zinc-800 text-zinc-500 hover:border-zinc-700' : 'border-zinc-200 text-zinc-400 hover:border-zinc-300')
                            }`} style={{ padding: '6px 10px' }}
                    >
                        <div className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center border ${includeContext ? 'border-transparent bg-current' : 'border-current'}`}>
                            {includeContext && <Check size={10} strokeWidth={4} className={isDark ? 'text-zinc-900' : 'text-white'} />}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Add Current Recording as context</span>
                    </button>
                </div>

                <form
                    autoComplete="off"
                    style={{ marginTop: 10 }}
                    className={`relative flex items-center gap-1.5 bg-white rounded-2xl border transition-all focus-within:ring-2 focus-within:ring-red-500/20 ${isDark
                        ? 'bg-zinc-950 border-zinc-800 focus-within:border-red-500/50 shadowed-input'
                        : 'bg-white border-zinc-200 focus-within:border-red-500 shadow-sm'
                        }`}
                    onSubmit={handleSubmit}
                >
                    <input
                        ref={inputRef}
                        placeholder="Message..."
                        className={`flex-1 bg-transparent border-none outline-none text-sm ${isDark ? 'text-zinc-100 placeholder-zinc-600' : 'text-zinc-900 placeholder-zinc-400'}`} style={{ padding: "10px 14px" }}
                    />
                    <button
                        type="submit"
                        disabled={isChatTyping}
                        className={`mr-1 rounded-xl transition-all hover:scale-105 active:scale-95 bg-gradient-to-br from-[#D00000] via-[#D00000] to-[#D00000] text-white disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed shadow-md shadow-red-500/20`} style={{ padding: 8 }}
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
};
