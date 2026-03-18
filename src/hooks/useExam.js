/**
 * @fileoverview useExam — core logic for managing time-locked tests and OMR state.
 *
 * Exam States:
 * - 'upcoming': Current time is < (startTime - 10 minutes).
 * - 'ready'   : Within 10 mins of startTime. Can "Enter Hall" but not start.
 * - 'live'    : Within the [startTime, endTime] window.
 * - 'missed'  : Exam time ended, user never started.
 * - 'completed': Exam submitted successfully.
 *
 * Features:
 * - `getServerNow()` ensures tamper-proof timing.
 * - `omrAnswers` state persists securely in localStorage across refreshes.
 * - Enforces auto-submission if time expires.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getServerNow } from '@services/timeService';
import { schedulePush } from '@services/cloudSync';

/**
 * @typedef {'upcoming' | 'ready' | 'live' | 'missed' | 'completed'} ExamStatus
 */

/**
 * Parses "hh:mm AM/PM" to a Date object reflecting today's date.
 * @param {string} timeStr - e.g. "11:00 PM"
 * @param {Date} [baseDate]
 * @returns {Date}
 */
function parseTime(timeStr, baseDate) {
    const d = new Date(baseDate || getServerNow());
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    if (hours === 12) {
        hours = 0;
    }
    if (modifier === 'PM') {
        hours = hours + 12;
    }

    d.setHours(hours, minutes, 0, 0);
    return d;
}

export function useExam(examId, unlockTimeStr, durationMins) {
    const LS_KEY = `${examId}_omr`;
    const SUBMIT_KEY = `${examId}_submitted`;

    const [status, setStatus] = useState(/** @type {ExamStatus} */('upcoming'));
    const [secondsLeft, setSecondsLeft] = useState(0);

    // OMR answers: { 1: 'A', 2: 'C', ... }
    const [answers, setAnswers] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(LS_KEY) || '{}');
        } catch {
            return {};
        }
    });

    const isSubmitted = localStorage.getItem(SUBMIT_KEY) === 'true';

    // Core timing bounds
    const now = getServerNow();
    const startTime = parseTime(unlockTimeStr, now);
    const endTime = new Date(startTime.getTime() + durationMins * 60000);

    const updateStateRef = useRef(null);

    updateStateRef.current = () => {
        if (!examId) return;

        if (isSubmitted) {
            setStatus('completed');
            setSecondsLeft(0);
            return;
        }

        const tick = getServerNow();

        if (tick < startTime) {
            const diffMins = (startTime.getTime() - tick.getTime()) / 60000;
            if (diffMins <= 10) {
                setStatus('ready');
            } else {
                setStatus('upcoming');
            }
            setSecondsLeft(Math.floor((startTime.getTime() - tick.getTime()) / 1000));
        } else if (tick >= startTime && tick <= endTime) {
            setStatus('live');
            setSecondsLeft(Math.floor((endTime.getTime() - tick.getTime()) / 1000));
        } else {
            // tick > endTime
            const hasAnswers = Object.keys(answers).length > 0;
            setStatus(hasAnswers ? 'completed' : 'missed');
            setSecondsLeft(0);

            // Auto-submit if they had answers but time ran out
            if (hasAnswers && !isSubmitted) {
                localStorage.setItem(SUBMIT_KEY, 'true');
            }
        }
    };

    /* ── Interval Loop ── */
    useEffect(() => {
        if (!examId) return;
        updateStateRef.current(); // initial run
        const interval = setInterval(() => {
            updateStateRef.current();
        }, 1000);
        return () => clearInterval(interval);
    }, [examId]); // eslint-disable-line react-hooks/exhaustive-deps

    /**
     * Mark a bubble
     */
    const setAnswer = useCallback((qNum, option) => {
        if (status !== 'live') return;
        setAnswers((prev) => {
            const next = { ...prev };
            if (next[qNum] === option) {
                delete next[qNum]; // toggle off
            } else {
                next[qNum] = option;
            }
            localStorage.setItem(LS_KEY, JSON.stringify(next));
            return next;
        });
    }, [status, LS_KEY]);

    /**
     * Clear an answer
     */
    const clearAnswer = useCallback((qNum) => {
        if (status !== 'live') return;
        setAnswers((prev) => {
            const next = { ...prev };
            delete next[qNum];
            localStorage.setItem(LS_KEY, JSON.stringify(next));
            return next;
        });
    }, [status, LS_KEY]);

    /**
     * Manual Submit
     */
    const submitExam = useCallback(async () => {
        localStorage.setItem(SUBMIT_KEY, 'true');
        // Sync to cloud
        schedulePush();
        updateStateRef.current();
    }, [SUBMIT_KEY]);

    return {
        status,
        secondsLeft,
        answers,
        setAnswer,
        clearAnswer,
        submitExam,
        isSubmitted
    };
}
