import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * @fileoverview HorizontalScroll — Netflix-style horizontal scroll container
 * with CSS Scroll Snap and interactive navigation buttons.
 */

/**
 * @param {Object} props
 * @param {import('react').ReactNode} props.children
 * @param {string} [props.label]  - Optional section heading above the scroller.
 * @returns {JSX.Element}
 */
export default function HorizontalScroll({ children, label }) {
    const trackRef = useRef(null);
    const [showLeft, setShowLeft] = useState(false);
    const [showRight, setShowRight] = useState(true);

    const handleScroll = () => {
        if (!trackRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = trackRef.current;
        setShowLeft(scrollLeft > 5);
        // Show right button if we haven't reached the end (with 5px margin of error)
        setShowRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 5);
    };

    useEffect(() => {
        handleScroll(); // initial check
        window.addEventListener('resize', handleScroll);
        return () => window.removeEventListener('resize', handleScroll);
    }, [children]);

    const scroll = (direction) => {
        if (trackRef.current) {
            const shift = direction === 'left' ? -350 : 350;
            trackRef.current.scrollBy({ left: shift, behavior: 'smooth' });
        }
    };

    return (
        <div style={styles.wrapper}>
            {label && <h3 style={styles.label}>{label}</h3>}

            <div style={styles.container}>
                {showLeft && (
                    <button 
                        style={{ ...styles.navBtn, left: -20 }} 
                        onClick={() => scroll('left')}
                        aria-label="Scroll left"
                    >
                        <ChevronLeft size={24} color="var(--primary, #6366F1)" />
                    </button>
                )}

                <div
                    ref={trackRef}
                    onScroll={handleScroll}
                    className="hide-scrollbar"
                    style={styles.track}
                >
                    {children}
                </div>

                {showRight && (
                    <button 
                        style={{ ...styles.navBtn, right: -20 }} 
                        onClick={() => scroll('right')}
                        aria-label="Scroll right"
                    >
                        <ChevronRight size={24} color="var(--primary, #6366F1)" />
                    </button>
                )}
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
    container: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
    },
    track: {
        display: 'flex',
        gap: 'var(--space-md)',
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollSnapType: 'x mandatory',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: 'var(--space-sm)',
        width: '100%',
    },
    navBtn: {
        position: 'absolute',
        zIndex: 10,
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: '#ffffff',
        border: '1px solid var(--border-light, #e2e8f0)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'transform 0.2s',
    }
};
