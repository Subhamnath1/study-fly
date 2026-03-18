/**
 * @fileoverview ProtectedRoute — Higher-Order Component that redirects
 * unauthenticated users to the Login page. 
 */

import { useAuthContext } from '@context/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

/**
 * @typedef {Object} ProtectedRouteProps
 * @property {import('react').ReactNode} children - Component to render if auth'd.
 */

/**
 * Wraps routes that require authentication.
 *
 * @param {ProtectedRouteProps} props
 * @returns {JSX.Element}
 */
export default function ProtectedRoute({ children }) {
    const { user, loading } = useAuthContext();
    const location = useLocation();

    if (loading) {
        return (
            <div style={styles.container}>
                <Loader2 size={40} className="spin" color="var(--primary)" />
                <p style={styles.text}>Verifying session…</p>
            </div>
        );
    }

    if (!user) {
        // Redirect them to the /login page, but save the current location they were
        // trying to go to in state. This allows us to redirect them back after login.
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
}

/** @type {Record<string, import('react').CSSProperties>} */
const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        gap: 'var(--space-md)',
    },
    text: {
        fontSize: '0.9rem',
        color: 'var(--text-secondary)',
        fontWeight: 500,
        letterSpacing: '0.04em',
    },
};
