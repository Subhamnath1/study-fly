/**
 * @fileoverview PdfViewer — Custom full-featured PDF viewer page.
 *
 * Route: /notes/:noteId
 * Features: Google Drive PDF embed, zoom controls, keyboard shortcuts,
 *           dark/light mode toggle, download button, fullscreen, breadcrumb nav.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Download, Maximize2, Minimize2, Sun, Moon,
    ZoomIn, ZoomOut, RotateCcw, Keyboard, ExternalLink
} from 'lucide-react';
import notesData from '@data/notes.json';

/**
 * Custom PDF Viewer page.
 * @returns {import('react').JSX.Element}
 */
export default function PdfViewer() {
    const { noteId } = useParams();
    const navigate = useNavigate();
    const iframeRef = useRef(null);
    const containerRef = useRef(null);

    const [zoom, setZoom] = useState(100);
    const [darkMode, setDarkMode] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [iframeLoaded, setIframeLoaded] = useState(false);

    const note = notesData[noteId];

    /* ── Zoom helpers ── */
    const zoomIn = useCallback(() => setZoom(z => Math.min(z + 15, 300)), []);
    const zoomOut = useCallback(() => setZoom(z => Math.max(z - 15, 50)), []);
    const resetZoom = useCallback(() => setZoom(100), []);

    /* ── Fullscreen toggle ── */
    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
    }, []);

    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    /* ── Keyboard shortcuts ── */
    useEffect(() => {
        const handler = (e) => {
            // Ctrl + scroll handled separately via wheel event
            if (e.key === 'f' || e.key === 'F') {
                if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    toggleFullscreen();
                }
            }
            if (e.key === 'Escape') {
                setShowShortcuts(false);
            }
            if (e.key === '=' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                zoomIn();
            }
            if (e.key === '-' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                zoomOut();
            }
            if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                resetZoom();
            }
            if (e.key === 'd' || e.key === 'D') {
                if (!e.ctrlKey && !e.metaKey) {
                    setDarkMode(prev => !prev);
                }
            }
            if (e.key === '?') {
                setShowShortcuts(prev => !prev);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [toggleFullscreen, zoomIn, zoomOut, resetZoom]);

    /* ── Ctrl + Scroll = Zoom ── */
    useEffect(() => {
        const handler = (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                if (e.deltaY < 0) zoomIn();
                else zoomOut();
            }
        };
        const el = containerRef.current;
        if (el) el.addEventListener('wheel', handler, { passive: false });
        return () => { if (el) el.removeEventListener('wheel', handler); };
    }, [zoomIn, zoomOut]);

    /* ── Download handler ── */
    const handleDownload = useCallback(() => {
        if (!note) return;
        const downloadUrl = `https://drive.google.com/uc?export=download&id=${note.driveFileId}`;
        window.open(downloadUrl, '_blank');
    }, [note]);

    if (!note) {
        return (
            <div style={styles.page}>
                <div style={styles.notFoundWrap}>
                    <div style={styles.notFoundIcon}>📄</div>
                    <h2 style={styles.notFoundTitle}>Note Not Found</h2>
                    <p style={styles.notFoundText}>
                        The note <code style={styles.codeInline}>{noteId}</code> does not exist.
                    </p>
                    <button style={styles.goBackBtn} onClick={() => navigate(-1)}>
                        <ArrowLeft size={16} /> Go Back
                    </button>
                </div>
            </div>
        );
    }

    const embedUrl = `https://drive.google.com/file/d/${note.driveFileId}/preview`;

    return (
        <div ref={containerRef} style={{ ...styles.page, background: darkMode ? '#1a1a2e' : '#F0F2F5' }}>
            {/* ── Top Toolbar ── */}
            <header style={{ ...styles.toolbar, background: darkMode ? 'rgba(15,17,30,0.95)' : 'rgba(255,255,255,0.92)' }}>
                {/* Left: Back + Breadcrumb */}
                <div style={styles.toolbarLeft}>
                    <button
                        style={{ ...styles.toolBtn, color: darkMode ? '#94A3B8' : '#64748B' }}
                        onClick={() => navigate(-1)}
                        title="Go back"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div style={styles.breadcrumb}>
                        <span style={{ ...styles.breadcrumbSub, color: darkMode ? '#818CF8' : '#6366F1' }}>
                            {note.subject}
                        </span>
                        <span style={{ ...styles.breadcrumbSep, color: darkMode ? '#475569' : '#CBD5E1' }}>›</span>
                        <span style={{ ...styles.breadcrumbChap, color: darkMode ? '#CBD5E1' : '#475569' }}>
                            {note.chapter}
                        </span>
                        <span style={{ ...styles.breadcrumbSep, color: darkMode ? '#475569' : '#CBD5E1' }}>›</span>
                        <span style={{ ...styles.breadcrumbNote, color: darkMode ? '#F1F5F9' : '#1E293B' }}>
                            {note.title}
                        </span>
                    </div>
                </div>

                {/* Center: Zoom Controls */}
                <div style={styles.toolbarCenter}>
                    <button
                        style={{ ...styles.toolBtn, color: darkMode ? '#CBD5E1' : '#475569' }}
                        onClick={zoomOut}
                        title="Zoom out (Ctrl+-)"
                    >
                        <ZoomOut size={17} />
                    </button>
                    <div style={{
                        ...styles.zoomBadge,
                        background: darkMode ? 'rgba(99,102,241,0.15)' : '#EEF2FF',
                        color: darkMode ? '#A5B4FC' : '#6366F1'
                    }}>
                        {zoom}%
                    </div>
                    <button
                        style={{ ...styles.toolBtn, color: darkMode ? '#CBD5E1' : '#475569' }}
                        onClick={zoomIn}
                        title="Zoom in (Ctrl++)"
                    >
                        <ZoomIn size={17} />
                    </button>
                    <button
                        style={{ ...styles.toolBtn, color: darkMode ? '#CBD5E1' : '#475569' }}
                        onClick={resetZoom}
                        title="Reset zoom (Ctrl+0)"
                    >
                        <RotateCcw size={15} />
                    </button>
                </div>

                {/* Right: Actions */}
                <div style={styles.toolbarRight}>
                    <button
                        style={{ ...styles.toolBtn, color: darkMode ? '#CBD5E1' : '#475569' }}
                        onClick={() => setDarkMode(d => !d)}
                        title="Toggle dark mode (D)"
                    >
                        {darkMode ? <Sun size={17} /> : <Moon size={17} />}
                    </button>
                    <button
                        style={{ ...styles.toolBtn, color: darkMode ? '#CBD5E1' : '#475569' }}
                        onClick={() => setShowShortcuts(s => !s)}
                        title="Keyboard shortcuts (?)"
                    >
                        <Keyboard size={17} />
                    </button>
                    <button
                        style={{ ...styles.toolBtn, color: darkMode ? '#CBD5E1' : '#475569' }}
                        onClick={toggleFullscreen}
                        title="Toggle fullscreen (F)"
                    >
                        {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
                    </button>
                    <a
                        href={note.driveUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ ...styles.toolBtn, color: darkMode ? '#CBD5E1' : '#475569' }}
                        title="Open in Google Drive"
                    >
                        <ExternalLink size={16} />
                    </a>
                    <button style={styles.downloadBtn} onClick={handleDownload} title="Download PDF">
                        <Download size={16} /> Download
                    </button>
                </div>
            </header>

            {/* ── PDF Viewer Area ── */}
            <div style={styles.viewerWrap}>
                {!iframeLoaded && (
                    <div style={styles.loadingOverlay}>
                        <div className="spinner" />
                        <span style={{ color: darkMode ? '#94A3B8' : '#64748B', fontSize: '0.85rem' }}>
                            Loading PDF…
                        </span>
                    </div>
                )}
                <div style={{
                    ...styles.iframeScaler,
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: 'top center',
                    width: `${10000 / zoom}%`,
                }}>
                    <iframe
                        ref={iframeRef}
                        src={embedUrl}
                        style={styles.iframe}
                        allow="autoplay"
                        allowFullScreen
                        title={note.title}
                        onLoad={() => setIframeLoaded(true)}
                    />
                </div>
            </div>

            {/* ── Shortcuts Modal ── */}
            {showShortcuts && (
                <div style={styles.shortcutsOverlay} onClick={() => setShowShortcuts(false)}>
                    <div
                        style={{
                            ...styles.shortcutsModal,
                            background: darkMode ? '#1E293B' : '#FFFFFF',
                            color: darkMode ? '#E2E8F0' : '#1E293B'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 style={styles.shortcutsTitle}>⌨️ Keyboard Shortcuts</h3>
                        <div style={styles.shortcutsGrid}>
                            {[
                                ['Ctrl + Scroll', 'Zoom in / out'],
                                ['Ctrl + +', 'Zoom in'],
                                ['Ctrl + -', 'Zoom out'],
                                ['Ctrl + 0', 'Reset zoom (100%)'],
                                ['F', 'Toggle fullscreen'],
                                ['D', 'Toggle dark / light mode'],
                                ['?', 'Show / hide shortcuts'],
                                ['Esc', 'Close this modal'],
                            ].map(([key, desc]) => (
                                <div key={key} style={styles.shortcutRow}>
                                    <kbd style={{
                                        ...styles.kbd,
                                        background: darkMode ? '#334155' : '#F1F5F9',
                                        color: darkMode ? '#E2E8F0' : '#1E293B',
                                        border: `1px solid ${darkMode ? '#475569' : '#E2E8F0'}`
                                    }}>
                                        {key}
                                    </kbd>
                                    <span style={{ fontSize: '0.85rem', color: darkMode ? '#94A3B8' : '#64748B' }}>
                                        {desc}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <button
                            style={{
                                ...styles.closeShortcutsBtn,
                                background: darkMode ? '#334155' : '#F1F5F9',
                                color: darkMode ? '#CBD5E1' : '#475569'
                            }}
                            onClick={() => setShowShortcuts(false)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

/** @type {Record<string, import('react').CSSProperties>} */
const styles = {
    page: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        transition: 'background 0.3s ease',
    },

    /* Toolbar */
    toolbar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        gap: 12,
        minHeight: 52,
        transition: 'background 0.3s ease',
    },
    toolbarLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flex: 1,
        minWidth: 0,
    },
    toolbarCenter: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        flexShrink: 0,
    },
    toolbarRight: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        flexShrink: 0,
    },

    /* Breadcrumb */
    breadcrumb: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: '0.82rem',
        fontWeight: 500,
        minWidth: 0,
        overflow: 'hidden',
    },
    breadcrumbSub: { fontWeight: 700, whiteSpace: 'nowrap' },
    breadcrumbSep: { fontSize: '0.9rem' },
    breadcrumbChap: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    breadcrumbNote: { fontWeight: 700, whiteSpace: 'nowrap' },

    /* Tool buttons */
    toolBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 34,
        height: 34,
        borderRadius: 8,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        transition: 'background 0.15s ease',
        textDecoration: 'none',
    },
    zoomBadge: {
        fontSize: '0.75rem',
        fontWeight: 800,
        padding: '4px 10px',
        borderRadius: 6,
        minWidth: 48,
        textAlign: 'center',
        letterSpacing: '0.02em',
    },
    downloadBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 14px',
        borderRadius: 8,
        background: 'linear-gradient(135deg, #6366F1, #818CF8)',
        color: '#FFFFFF',
        border: 'none',
        fontSize: '0.8rem',
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'opacity 0.15s ease',
        whiteSpace: 'nowrap',
    },

    /* Viewer */
    viewerWrap: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'auto',
        position: 'relative',
    },
    iframeScaler: {
        width: '100%',
        height: '100%',
        transition: 'transform 0.2s ease',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
    },
    iframe: {
        width: '100%',
        flex: 1,
        border: 'none',
        minHeight: 'calc(100vh - 60px)',
    },
    loadingOverlay: {
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        zIndex: 5,
    },

    /* Not Found */
    notFoundWrap: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        gap: 12,
    },
    notFoundIcon: { fontSize: '3rem' },
    notFoundTitle: { fontSize: '1.3rem', fontWeight: 800, color: '#1E293B' },
    notFoundText: { fontSize: '0.9rem', color: '#64748B' },
    codeInline: {
        background: '#F1F5F9',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: '0.85rem',
        fontWeight: 600,
    },
    goBackBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '10px 20px',
        borderRadius: 10,
        background: '#6366F1',
        color: '#fff',
        border: 'none',
        fontWeight: 700,
        fontSize: '0.88rem',
        cursor: 'pointer',
        marginTop: 8,
    },

    /* Shortcuts Modal */
    shortcutsOverlay: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 500,
        backdropFilter: 'blur(4px)',
    },
    shortcutsModal: {
        borderRadius: 16,
        padding: '28px 32px',
        maxWidth: 420,
        width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    },
    shortcutsTitle: {
        fontSize: '1.1rem',
        fontWeight: 800,
        marginBottom: 20,
    },
    shortcutsGrid: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
    },
    shortcutRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
    },
    kbd: {
        fontFamily: "'Inter', monospace",
        fontSize: '0.72rem',
        fontWeight: 700,
        padding: '4px 10px',
        borderRadius: 6,
        minWidth: 90,
        textAlign: 'center',
        whiteSpace: 'nowrap',
    },
    closeShortcutsBtn: {
        display: 'block',
        width: '100%',
        padding: '10px',
        borderRadius: 10,
        border: 'none',
        fontWeight: 700,
        fontSize: '0.85rem',
        cursor: 'pointer',
        marginTop: 20,
        textAlign: 'center',
    },
};
