/**
 * @fileoverview OmrSheet — A responsive grid of 4-option circular bubbles.
 *
 * PW style: minimalist white card, gray borders, solid purple for selected answers.
 */

const OPTIONS = ['A', 'B', 'C', 'D'];

/**
 * @param {Object} props
 * @param {number} props.totalQuestions - e.g. 30
 * @param {Record<number, string>} props.answers - { 1: 'A', 2: 'C' }
 * @param {(q: number, opt: string) => void} props.onSelect
 * @param {(q: number) => void} props.onClear
 * @param {boolean} [props.disabled=false]
 * @returns {JSX.Element}
 */
export default function OmrSheet({
    totalQuestions,
    answers,
    onSelect,
    onClear,
    disabled = false,
    questionTypes = {}
}) {
    const questions = Array.from({ length: totalQuestions }, (_, i) => i + 1);

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h3 style={styles.title}>OMR Sheet</h3>
                <span style={styles.counter}>
                    {Object.keys(answers).length} / {totalQuestions} Answered
                </span>
            </div>

            <div style={styles.gridList}>
                {questions.map((qNum) => (
                    <div key={qNum} style={styles.row}>
                        <div style={styles.qNumWrapper}>
                            <span style={styles.qNum}>{qNum}.</span>
                            {answers[qNum] && !disabled && (
                                <button
                                    style={styles.clearBtn}
                                    onClick={() => onClear(qNum)}
                                    title="Clear Answer"
                                >
                                    clear
                                </button>
                            )}
                        </div>

                        <div style={styles.bubbles}>
                            {questionTypes[qNum] === 'integer' ? (
                                <input
                                    type="text"
                                    value={answers[qNum] || ''}
                                    placeholder="Enter answer"
                                    disabled={disabled}
                                    style={styles.integerInput}
                                    onChange={(e) => onSelect(qNum, e.target.value)}
                                />
                            ) : (
                                OPTIONS.map((opt) => {
                                    const isSelected = answers[qNum] === opt;
                                    return (
                                        <button
                                            key={opt}
                                            disabled={disabled}
                                            style={{
                                                ...styles.bubble,
                                                ...(isSelected ? styles.bubbleSelected : {}),
                                                ...(disabled ? styles.bubbleDisabled : {})
                                            }}
                                            onClick={() => onSelect(qNum, opt)}
                                        >
                                            {opt}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/** @type {Record<string, import('react').CSSProperties>} */
const styles = {
    container: {
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%', // Fill parent column
        overflow: 'hidden',
    },
    header: {
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-light)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--bg-secondary)',
    },
    title: {
        fontSize: '1rem',
        fontWeight: 700,
        color: 'var(--text-main)',
    },
    counter: {
        fontSize: '0.8rem',
        fontWeight: 600,
        color: 'var(--primary)',
        background: 'var(--primary-muted)',
        padding: '4px 10px',
        borderRadius: 'var(--radius-full)',
    },
    gridList: {
        flex: 1,
        overflowY: 'auto',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
    },
    row: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-app)',
    },
    qNumWrapper: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: 40,
    },
    qNum: {
        fontSize: '0.95rem',
        fontWeight: 700,
        color: 'var(--text-main)',
    },
    clearBtn: {
        fontSize: '0.65rem',
        color: 'var(--text-muted)',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        textDecoration: 'underline',
        marginTop: 2,
        padding: 0,
    },
    bubbles: {
        display: 'flex',
        gap: 12,
    },
    bubble: {
        width: 36,
        height: 36,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.9rem',
        fontWeight: 600,
        color: 'var(--text-secondary)',
        background: 'var(--bg-card)',
        border: '1.5px solid var(--border)',
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
    },
    bubbleSelected: {
        background: 'var(--primary)',
        borderColor: 'var(--primary)',
        color: '#fff',
        boxShadow: '0 2px 8px rgba(90, 75, 218, 0.3)',
    },
    bubbleDisabled: {
        cursor: 'default',
        opacity: 0.6,
    },
    integerInput: {
        width: 120,
        padding: '8px 12px',
        border: '1.5px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.95rem',
        textAlign: 'center',
        color: 'var(--text-main)',
        background: 'var(--bg-card)',
        outline: 'none',
    }
};
