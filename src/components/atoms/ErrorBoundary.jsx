import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * @typedef {Object} ErrorBoundaryProps
 * @property {import('react').ReactNode} children - Child components to wrap.
 * @property {import('react').ReactNode} [fallback]  - Optional custom fallback UI.
 */

/**
 * @typedef {Object} ErrorBoundaryState
 * @property {boolean} hasError
 * @property {Error|null} error
 * @property {string|null} errorInfo
 */

/**
 * React Error Boundary — catches rendering errors in the component tree
 * and displays a "System Malfunction" screen instead of a white crash page.
 *
 * @extends {Component<ErrorBoundaryProps, ErrorBoundaryState>}
 */
class ErrorBoundary extends Component {
    /** @param {ErrorBoundaryProps} props */
    constructor(props) {
        super(props);
        /** @type {ErrorBoundaryState} */
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    /**
     * Derive error state when a child component throws.
     *
     * @param {Error} error
     * @returns {Partial<ErrorBoundaryState>}
     */
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    /**
     * Log the error details for debugging.
     *
     * @param {Error} error
     * @param {import('react').ErrorInfo} errorInfo
     */
    componentDidCatch(error, errorInfo) {
        console.error('[ErrorBoundary] Caught error:', error);
        console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
        this.setState({ errorInfo: errorInfo.componentStack });
    }

    /** Reset the error state and re-render children. */
    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div style={styles.container}>
                    <div style={styles.card}>
                        <div style={styles.iconWrap}>
                            <AlertTriangle size={48} color="#e17055" strokeWidth={1.5} />
                        </div>

                        <h1 style={styles.title}>System Malfunction</h1>

                        <p style={styles.subtitle}>
                            An unexpected error crashed this section of the application.
                            Your data is safe — try reloading.
                        </p>

                        {this.state.error && (
                            <pre style={styles.errorBox}>
                                {this.state.error.toString()}
                            </pre>
                        )}

                        <button style={styles.button} onClick={this.handleRetry}>
                            <RefreshCw size={18} />
                            <span>Retry</span>
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

/** @type {Record<string, import('react').CSSProperties>} */
const styles = {
    container: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '24px',
        background: 'var(--bg)',
    },
    card: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        maxWidth: '480px',
        padding: '48px 32px',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)',
        textAlign: 'center',
    },
    iconWrap: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: 'var(--error-muted)',
    },
    title: {
        fontSize: '1.5rem',
        fontWeight: 700,
        color: 'var(--text)',
        margin: 0,
    },
    subtitle: {
        fontSize: '0.925rem',
        color: 'var(--text-secondary)',
        lineHeight: 1.6,
        margin: 0,
    },
    errorBox: {
        width: '100%',
        maxHeight: '120px',
        overflow: 'auto',
        padding: '12px',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--error-muted)',
        color: 'var(--error)',
        fontSize: '0.8rem',
        textAlign: 'left',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
    },
    button: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 28px',
        borderRadius: 'var(--radius-full)',
        background: 'var(--primary)',
        color: '#fff',
        fontSize: '0.925rem',
        fontWeight: 600,
        border: 'none',
        cursor: 'pointer',
        transition: 'background 250ms ease',
    },
};

export default ErrorBoundary;
