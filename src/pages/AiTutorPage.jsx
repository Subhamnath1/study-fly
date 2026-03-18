/**
 * @fileoverview AiTutorPage — AI-powered study assistant using Google Gemini.
 *
 * Features:
 * - Model selector dropdown
 * - Reasoning Mode (expands internal thoughts like Gemini app)
 * - Real-time chat with typing indicator
 * - Robust Markdown & LaTeX rendering (react-markdown + KaTeX)
 * - Smooth typewriter animation for new AI messages
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Send, Bot, User, ChevronDown, Loader2, Lightbulb, Zap, BrainCircuit, ChevronRight } from 'lucide-react';
import { streamGeminiChat, GEMINI_MODELS } from '@services/geminiService';

// Markdown & LaTeX Imports
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';

import TtsPlayer from '../components/atoms/TtsPlayer';

const SUGGESTIONS = [
    { icon: '🧠', label: 'Explain Electric Charges & Fields', prompt: 'Explain the concept of Electric Charges and Fields in simple terms with examples. Use LaTeX for formulas.' },
    { icon: '🎯', label: 'Practice: Types of Relations', prompt: 'Give me 5 practice questions on Types of Relations with answers.' },
    { icon: '📚', label: 'Summarize: Crystal Lattices', prompt: 'Summarize the chapter on Crystal Lattices and Unit Cells in a markdown table.' },
    { icon: '📊', label: 'Newton\'s Laws Deep Dive', prompt: 'Explain all three of Newton\'s Laws of Motion with real-world analogies.' },
];

/**
 * Extracts <think>...</think> blocks and the rest of the message separately.
 * Improved regex to handle case-insensitivity and unclosed tags.
 * @param {string} content
 * @returns {{thought: string|null, text: string}}
 */
function parseReasoning(content) {
    const thinkMatch = content.match(/<think>([\s\S]*?)(?:<\/think>|$)/i);
    if (thinkMatch) {
        let thought = thinkMatch[1].trim();
        let text = content.replace(/<think>([\s\S]*?)(?:<\/think>|$)/i, '').trim();
        return { thought, text };
    }
    return { thought: null, text: content.trim() };
}

/**
 * Animated accordion for the AI's internal thought process.
 */
function ThoughtProcess({ children, forceOpen }) {
    // If it's actively generating thoughts, keep it open automatically
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (forceOpen) setIsOpen(true);
    }, [forceOpen]);

    return (
        <div style={styles.thoughtBox}>
            <button style={styles.thoughtToggle} onClick={() => setIsOpen(!isOpen)}>
                <ChevronRight size={14} style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                <span>Thought process</span>
            </button>
            <div style={{
                maxHeight: isOpen ? '4000px' : '0px',
                overflow: 'hidden',
                transition: 'max-height 0.4s ease-in-out',
                opacity: isOpen ? 1 : 0.6,
            }}>
                <div style={styles.thoughtContent}>
                    <div className="ai-markdown-container">
                        <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
                            {(() => {
                                if (!children) return '';
                                let processed = children;
                                processed = processed.replace(/\\\((.*?)\\\)/gs, '$$$1$$');
                                processed = processed.replace(/\\\[(.*?)\\\]/gs, '$$$$$1$$$$');
                                processed = processed.replace(/(^|[^\$])\\boxed{([^}]+)}/g, '$1$\\boxed{$2}$');
                                return processed;
                            })()}
                        </ReactMarkdown>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AiTutorPage() {
    const [messages, setMessages] = useState(/** @type {Array<{role: 'assistant' | 'user', content: string, isError?: boolean, isGenerating?: boolean}>} */([
        { role: 'assistant', content: 'Hi! 👋 I\'m **Study Fly AI**, your personal tutor for Physics, Chemistry, and Mathematics.\n\nAsk me to explain concepts, generate practice questions, summarize chapters, or help with problem-solving. Select your preferred AI model from the dropdown above!' },
    ]));
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedModel, setSelectedModel] = useState(GEMINI_MODELS[0].id);
    const [showModelMenu, setShowModelMenu] = useState(false);
    const [reasoningMode, setReasoningMode] = useState(false);
    const [error, setError] = useState(null);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        const timeout = setTimeout(() => {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        return () => clearTimeout(timeout);
    }, [messages, isLoading]);

    const selectedModelInfo = GEMINI_MODELS.find((m) => m.id === selectedModel) || GEMINI_MODELS[0];

    const handleSend = useCallback(async (text) => {
        const query = (text || input).trim();
        if (!query || isLoading) return;

        setError(null);
        setInput('');

        // Add user message
        /** @type {{role: 'user', content: string}} */
        const userMsg = { role: 'user', content: query };
        setMessages((prev) => [...prev, userMsg]);
        setIsLoading(true);

        try {
            // Build conversation history
            const history = [...messages.filter((m, i) => i > 0), userMsg];

            // Add an empty assistant message as a placeholder for streaming
            setMessages((prev) => [...prev, { role: 'assistant', content: '', isGenerating: true }]);

            const stream = streamGeminiChat(history, selectedModel, reasoningMode);

            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk;
                // Update the last message smoothly
                setMessages((prev) => {
                    const newMsgs = [...prev];
                    newMsgs[newMsgs.length - 1] = { role: 'assistant', content: fullResponse, isGenerating: true };
                    return newMsgs;
                });
            }

            // Mark generation as complete
            setMessages((prev) => {
                const newMsgs = [...prev];
                newMsgs[newMsgs.length - 1].isGenerating = false;
                return newMsgs;
            });

        } catch (err) {
            console.error('[AiTutor] Error:', err);
            const errorMsg = err.message?.includes('exhausted')
                ? '⚠️ All API keys have hit their rate limit. Please wait a minute and try again.'
                : `⚠️ ${err.message || 'Something went wrong. Please try again.'}`;

            setMessages((prev) => {
                const newMsgs = [...prev];
                // If it crashed mid-stream, append the error
                if (newMsgs[newMsgs.length - 1].role === 'assistant' && newMsgs[newMsgs.length - 1].isGenerating) {
                    newMsgs[newMsgs.length - 1] = { role: 'assistant', content: errorMsg, isError: true, isGenerating: false };
                } else {
                    newMsgs.push({ role: 'assistant', content: errorMsg, isError: true });
                }
                return newMsgs;
            });
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    }, [input, isLoading, messages, selectedModel, reasoningMode]);

    return (
        <div style={styles.page}>
            {/* Inject minimal CSS for markdown formatting globally for this component */}
            <style>{`
                .ai-markdown-container {
                    font-size: 0.9rem;
                    line-height: 1.7;
                }
                .ai-markdown-container p { margin-bottom: 0.8em; margin-top: 0; }
                .ai-markdown-container p:last-child { margin-bottom: 0; }
                .ai-markdown-container ul, .ai-markdown-container ol { margin-top: 0; margin-bottom: 0.8em; padding-left: 1.5em; }
                .ai-markdown-container li { margin-bottom: 0.3em; }
                .ai-markdown-container h1, .ai-markdown-container h2, .ai-markdown-container h3, .ai-markdown-container h4 {
                    margin-top: 1.2em;
                    margin-bottom: 0.6em;
                    font-weight: 700;
                    color: var(--text-main);
                }
                .ai-markdown-container h1 { font-size: 1.3em; }
                .ai-markdown-container h2 { font-size: 1.2em; }
                .ai-markdown-container h3 { font-size: 1.1em; }
                .ai-markdown-container code {
                    background: var(--primary-muted, rgba(124, 107, 240, 0.15));
                    padding: 0.2em 0.4em;
                    border-radius: 4px;
                    font-family: monospace;
                    font-size: 0.9em;
                }
                .ai-markdown-container pre {
                    background: #1e1e1e;
                    color: #d4d4d4;
                    padding: 1em;
                    border-radius: 8px;
                    overflow-x: auto;
                    margin-bottom: 0.8em;
                }
                .ai-markdown-container pre code {
                    background: transparent;
                    color: inherit;
                    padding: 0;
                }
                .ai-markdown-container table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 1em;
                }
                .ai-markdown-container th, .ai-markdown-container td {
                    border: 1px solid var(--border-light);
                    padding: 8px 12px;
                    text-align: left;
                }
                .ai-markdown-container th {
                    background: var(--bg-app);
                    font-weight: 600;
                }
                .ai-markdown-container strong {
                    font-weight: 700;
                }
            `}</style>

            <div style={styles.headerRow}>
                <h2 style={styles.pageTitle}>
                    <Sparkles size={22} color="var(--primary)" />
                    AI Tutor
                </h2>

                <div style={styles.headerControls}>
                    {/* Reasoning Toggle */}
                    <button
                        style={{ ...styles.reasoningBtn, background: reasoningMode ? 'var(--primary-muted)' : 'transparent', color: reasoningMode ? 'var(--primary)' : 'var(--text-muted)' }}
                        onClick={() => setReasoningMode(!reasoningMode)}
                        title="Enable Reasoning Mode to see the AI's step-by-step thinking process"
                    >
                        <BrainCircuit size={16} />
                        <span>Reasoning</span>
                    </button>

                    {/* Model Selector Dropdown */}
                    <div style={styles.modelSelector}>
                        <button
                            style={styles.modelBtn}
                            onClick={() => setShowModelMenu((v) => !v)}
                        >
                            <Zap size={14} color="var(--primary)" />
                            <span>{selectedModelInfo.label}</span>
                            <ChevronDown size={14} style={{ opacity: 0.5 }} />
                        </button>

                        {showModelMenu && (
                            <div style={styles.modelMenu}>
                                {GEMINI_MODELS.map((model) => (
                                    <button
                                        key={model.id}
                                        style={{
                                            ...styles.modelOption,
                                            background: model.id === selectedModel ? 'var(--primary-muted)' : 'transparent',
                                        }}
                                        onClick={() => {
                                            setSelectedModel(model.id);
                                            setShowModelMenu(false);
                                        }}
                                    >
                                        <span style={styles.modelName}>{model.label}</span>
                                        <span style={styles.modelDesc}>{model.description}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div style={styles.chatLayout}>
                {/* Chat Area */}
                <div style={styles.chatCard}>
                    <div style={styles.chatMessages}>
                        {messages.map((msg, i) => {
                            const { thought, text } = msg.role === 'assistant' && !msg.isError
                                ? parseReasoning(msg.content)
                                : { thought: null, text: msg.content };

                            return (
                                <div key={i} style={{ ...styles.msgRow, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                    {msg.role === 'assistant' && (
                                        <div style={styles.botAvatar}><Bot size={16} color="#fff" /></div>
                                    )}

                                    <div style={msg.role === 'user' ? styles.userBubble : (msg.isError ? styles.errorBubble : styles.botBubble)}>
                                        {thought && <ThoughtProcess forceOpen={msg.isGenerating}>{thought}</ThoughtProcess>}

                                        {msg.role === 'assistant' ? (
                                            msg.isError ? (
                                                <span>{text}</span>
                                            ) : (
                                                <div className="ai-markdown-container">
                                                    <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
                                                        {(() => {
                                                            if (!text) return '';
                                                            let processed = text;
                                                            processed = processed.replace(/\\\((.*?)\\\)/gs, '$$$1$$');
                                                            processed = processed.replace(/\\\[(.*?)\\\]/gs, '$$$$$1$$$$');
                                                            processed = processed.replace(/(^|[^\$])\\boxed{([^}]+)}/g, '$1$\\boxed{$2}$');
                                                            return processed;
                                                        })()}
                                                    </ReactMarkdown>
                                                </div>
                                            )
                                        ) : (
                                            <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>
                                        )}

                                        {/* Inject Audio Player for AI Messages */}
                                        {msg.role === 'assistant' && !msg.isError && msg.content && !msg.isGenerating && (
                                            <TtsPlayer text={msg.content} isGenerating={msg.isGenerating} />
                                        )}
                                    </div>

                                    {msg.role === 'user' && (
                                        <div style={styles.userAvatar}><User size={16} color="#fff" /></div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Typing Indicator */}
                        {isLoading && (
                            <div style={styles.msgRow}>
                                <div style={styles.botAvatar}><Bot size={16} color="#fff" /></div>
                                <div style={styles.typingBubble}>
                                    <Loader2 size={16} className="spin" color="var(--primary)" />
                                    <span style={styles.typingText}>{reasoningMode ? 'Thinking deeply...' : 'Thinking...'}</span>
                                </div>
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <form
                        style={styles.inputRow}
                        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    >
                        <Sparkles size={18} color="var(--primary)" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={isLoading ? 'Waiting for response...' : 'Ask your study question...'}
                            style={styles.input}
                            disabled={isLoading}
                        />
                        <button type="submit" style={{ ...styles.sendBtn, opacity: isLoading ? 0.5 : 1 }} disabled={isLoading}>
                            {isLoading ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
                        </button>
                    </form>
                </div>

                {/* Sidebar */}
                <div style={styles.sidebar}>
                    {/* Quick Actions */}
                    <div style={styles.suggestCard}>
                        <h4 style={styles.suggestTitle}>⚡ Quick Actions</h4>
                        <div style={styles.suggestList}>
                            {SUGGESTIONS.map((s, i) => (
                                <button
                                    key={i}
                                    style={styles.suggestBtn}
                                    onClick={() => handleSend(s.prompt)}
                                    disabled={isLoading}
                                >
                                    <span style={styles.suggestEmoji}>{s.icon}</span>
                                    <span>{s.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Model Info Card */}
                    <div style={styles.infoCard}>
                        <Lightbulb size={16} color="var(--warning)" />
                        <div>
                            <p style={styles.infoTitle}>Active Model</p>
                            <p style={styles.infoValue}>{selectedModelInfo.label}</p>
                            <p style={styles.infoDesc}>{selectedModelInfo.description}</p>
                            <p style={styles.infoHint}>Reasoning mode is {reasoningMode ? 'ON (deep thinking)' : 'OFF'}.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/** @type {Record<string, import('react').CSSProperties>} */
const styles = {
    page: { padding: '24px 28px 40px', maxWidth: 1200, margin: '0 auto' },

    headerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    pageTitle: { fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 10 },
    headerControls: { display: 'flex', alignItems: 'center', gap: 12 },

    // Reasoning Toggle
    reasoningBtn: {
        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 'var(--radius-full)',
        border: '1px solid var(--border-light)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
        transition: 'all var(--transition-fast)'
    },

    // Model Selector
    modelSelector: { position: 'relative' },
    modelBtn: {
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
        borderRadius: 'var(--radius-full)', background: 'var(--bg-card)', border: '1px solid var(--border-light)',
        fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer',
        boxShadow: 'var(--shadow-sm)', transition: 'all var(--transition-fast)',
    },
    modelMenu: {
        position: 'absolute', top: '100%', right: 0, marginTop: 6,
        background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-md)', zIndex: 100, minWidth: 240, overflow: 'hidden',
    },
    modelOption: {
        display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 16px', width: '100%',
        border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
    },
    modelName: { fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' },
    modelDesc: { fontSize: '0.72rem', color: 'var(--text-muted)' },

    // Chat Layout
    chatLayout: { display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' },

    chatCard: {
        background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)',
    },
    chatMessages: { flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 },

    msgRow: { display: 'flex', gap: 10, alignItems: 'flex-start' },
    botAvatar: {
        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
        background: 'linear-gradient(135deg, var(--primary), #7C6BF0)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    userAvatar: {
        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
        background: 'linear-gradient(135deg, #34D399, #059669)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    botBubble: {
        background: 'var(--bg-app)', padding: '12px 16px', borderRadius: '4px 14px 14px 14px',
        fontSize: '0.88rem', lineHeight: 1.7, color: 'var(--text-main)', maxWidth: '78%', whiteSpace: 'pre-wrap',
    },
    errorBubble: {
        background: 'var(--error-muted, #FEF2F2)', padding: '12px 16px', borderRadius: '4px 14px 14px 14px',
        fontSize: '0.88rem', lineHeight: 1.7, color: 'var(--error, #DC2626)', maxWidth: '78%', whiteSpace: 'pre-wrap',
    },
    userBubble: {
        background: 'var(--primary)', color: '#fff', padding: '12px 16px', borderRadius: '14px 14px 4px 14px',
        fontSize: '0.88rem', lineHeight: 1.6, maxWidth: '78%',
    },

    // Thought Accordion
    thoughtBox: {
        background: 'rgba(0,0,0,0.02)', borderLeft: '3px solid var(--primary-muted)',
        borderRadius: '0 8px 8px 0', marginBottom: 12, overflow: 'hidden',
    },
    thoughtToggle: {
        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', width: '100%',
        background: 'transparent', border: 'none', cursor: 'pointer',
        fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'left',
    },
    thoughtContent: {
        padding: '0 12px 12px 32px', fontSize: '0.82rem', color: 'var(--text-secondary)',
        lineHeight: 1.6, fontStyle: 'italic',
    },

    // Typing indicator
    typingBubble: {
        display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-app)',
        padding: '10px 16px', borderRadius: '4px 14px 14px 14px',
    },
    typingText: { fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' },

    // Input
    inputRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderTop: '1px solid var(--border-light)' },
    input: { flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '0.88rem', color: 'var(--text-main)' },
    sendBtn: {
        width: 36, height: 36, borderRadius: 10, background: 'var(--primary)', color: '#fff',
        border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    },

    // Sidebar
    sidebar: { display: 'flex', flexDirection: 'column', gap: 16 },

    suggestCard: {
        background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)',
        padding: 16, boxShadow: 'var(--shadow-sm)',
    },
    suggestTitle: { fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 12 },
    suggestList: { display: 'flex', flexDirection: 'column', gap: 6 },
    suggestBtn: {
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        borderRadius: 'var(--radius-md)', background: 'var(--bg-app)', border: '1px solid var(--border-light)',
        cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-main)', textAlign: 'left',
        transition: 'all var(--transition-fast)',
    },
    suggestEmoji: { fontSize: '1rem' },

    // Info Card
    infoCard: {
        display: 'flex', gap: 10, alignItems: 'flex-start', padding: 14,
        borderRadius: 'var(--radius-md)', background: 'var(--warning-muted, #FFFBEB)',
        border: '1px solid var(--border-light)',
    },
    infoTitle: { fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' },
    infoValue: { fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', marginTop: 2 },
    infoDesc: { fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 },
    infoHint: { fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.4 },
};
