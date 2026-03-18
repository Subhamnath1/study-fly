import { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Loader2, Lightbulb, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';

import TtsPlayer from '../atoms/TtsPlayer';

/**
 * Slide-in panel for AI Hints and Solutions in the DPP Portal
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the panel is visible
 * @param {() => void} props.onClose - Function to close the panel
 * @param {'hint' | 'solution' | null} props.mode - Type of content being displayed
 * @param {string} props.content - The streamed markdown content from Gemini
 * @param {boolean} props.isLoading - Whether the AI is currently generating
 * @param {string} props.error - Any error message
 */
export default function AiSlidePanel({ isOpen, onClose, mode, content, isLoading, error }) {
    const contentRef = useRef(null);

    // Auto-scroll to bottom while generating
    useEffect(() => {
        if (isLoading && contentRef.current) {
            contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
    }, [content, isLoading]);

    return (
        <div style={{
            ...styles.panel,
            transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        }}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerTitle}>
                    {mode === 'hint' ? (
                        <>
                            <Lightbulb size={20} color="#F59E0B" />
                            <span style={{ color: '#F59E0B' }}>AI Hint</span>
                        </>
                    ) : (
                        <>
                            <CheckCircle2 size={20} color="#10B981" />
                            <span style={{ color: '#10B981' }}>AI Solution</span>
                        </>
                    )}
                </div>
                <button style={styles.closeBtn} onClick={onClose} aria-label="Close AI Panel">
                    <X size={20} />
                </button>
            </div>

            {/* Global markdown styles for this component */}
            <style>{`
                .dpp-ai-markdown {
                    font-size: 0.95rem;
                    line-height: 1.6;
                    color: #334155;
                }
                .dpp-ai-markdown p { margin-bottom: 1em; margin-top: 0; }
                .dpp-ai-markdown p:last-child { margin-bottom: 0; }
                .dpp-ai-markdown ul, .dpp-ai-markdown ol { margin-top: 0; margin-bottom: 1em; padding-left: 1.5em; }
                .dpp-ai-markdown li { margin-bottom: 0.4em; }
                .dpp-ai-markdown h1, .dpp-ai-markdown h2, .dpp-ai-markdown h3 {
                    margin-top: 1.2em;
                    margin-bottom: 0.6em;
                    font-weight: 700;
                    color: #1E293B;
                }
                .dpp-ai-markdown h3 { font-size: 1.1em; }
                .dpp-ai-markdown pre {
                    background: #F8FAFC;
                    border: 1px solid #E2E8F0;
                    padding: 1em;
                    border-radius: 8px;
                    overflow-x: auto;
                    margin-bottom: 1em;
                }
                .dpp-ai-markdown code {
                    font-family: monospace;
                    background: #F1F5F9;
                    padding: 0.2em 0.4em;
                    border-radius: 4px;
                    font-size: 0.9em;
                }
                .dpp-ai-markdown pre code { background: transparent; padding: 0; }
                .dpp-ai-markdown strong { font-weight: 700; color: #0F172A; }
            `}</style>

            {/* Content Area */}
            <div style={styles.content} ref={contentRef}>
                {!content && !isLoading && !error && (
                    <div style={styles.emptyState}>
                        <Sparkles size={32} color="#CBD5E1" />
                        <p style={styles.emptyText}>Select Hint or Solution for a question to see the AI analysis here.</p>
                    </div>
                )}

                {error && (
                    <div style={styles.errorBox}>
                        <strong>Error:</strong> {error}
                    </div>
                )}

                <div className="dpp-ai-markdown">
                    <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
                        {(() => {
                            if (!content) return '';
                            let processed = content;
                            // Convert \( \) and \[ \] to $ and $$
                            processed = processed.replace(/\\\((.*?)\\\)/gs, '$$$1$$');
                            processed = processed.replace(/\\\[(.*?)\\\]/gs, '$$$$$1$$$$');
                            // Catch stray \boxed{} that are outside of $ blocks
                            processed = processed.replace(/(^|[^\$])\\boxed{([^}]+)}/g, '$1$\\boxed{$2}$');
                            return processed;
                        })()}
                    </ReactMarkdown>
                </div>

                {!isLoading && !error && content && (
                    <TtsPlayer text={content} isGenerating={isLoading} />
                )}

                {isLoading && (
                    <div style={styles.loadingBox}>
                        <Loader2 size={16} className="spin" color="#6366F1" style={{ transformOrigin: 'center', display: 'inline-block' }} />
                        <span>AI is generating...</span>
                    </div>
                )}
            </div>
        </div>
    );
}

/** @type {Record<string, import('react').CSSProperties>} */
const styles = {
    panel: {
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 400,
        maxWidth: '100vw',
        background: '#fff',
        boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.1)',
        borderLeft: '1px solid #E2E8F0',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    header: {
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        borderBottom: '1px solid #E2E8F0',
        background: '#F8FAFC',
        flexShrink: 0,
    },
    headerTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontWeight: 700,
        fontSize: '1.1rem',
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        color: '#64748B',
        cursor: 'pointer',
        padding: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 4,
        transition: 'background 0.2s',
    },
    content: {
        flex: 1,
        padding: '24px 20px',
        overflowY: 'auto',
    },
    emptyState: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        opacity: 0.6,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: '0.9rem',
        color: '#64748B',
        maxWidth: 240,
    },
    loadingBox: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 16,
        padding: '12px 16px',
        background: '#EEECFF',
        color: '#4F46E5',
        borderRadius: 8,
        fontSize: '0.9rem',
        fontWeight: 500,
    },
    errorBox: {
        padding: '12px 16px',
        background: '#FEF2F2',
        color: '#DC2626',
        borderRadius: 8,
        marginBottom: 16,
        fontSize: '0.9rem',
    }
};
