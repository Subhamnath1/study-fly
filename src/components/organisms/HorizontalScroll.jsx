/**
 * @fileoverview HorizontalScroll — Netflix-style horizontal scroll container
 * with CSS Scroll Snap and hidden scrollbar.
 */

/**
 * @param {Object} props
 * @param {import('react').ReactNode} props.children
 * @param {string} [props.label]  - Optional section heading above the scroller.
 * @returns {JSX.Element}
 */
export default function HorizontalScroll({ children, label }) {
    return (
        <div style={styles.wrapper}>
            {label && <h3 style={styles.label}>{label}</h3>}

            <div
                className="hide-scrollbar"
                style={styles.track}
            >
                {children}
            </div>
        </div>
    );
}

/** @type {Record<string, import('react').CSSProperties>} */
const styles = {
    wrapper: {
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-sm)',
    },
    label: {
        fontSize: '1rem',
        fontWeight: 600,
        color: 'var(--text-secondary)',
        paddingLeft: 4,
    },
    track: {
        display: 'flex',
        gap: 'var(--space-md)',
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollSnapType: 'x mandatory',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: 'var(--space-sm)',
    },
};
