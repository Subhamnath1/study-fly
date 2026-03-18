/**
 * @fileoverview useResult — Calculates exam analytics by comparing user answers
 * against the answer key from solutions.json.
 *
 * Marking Scheme: +4 Correct, −1 Wrong, 0 Unattempted
 */

import { useMemo } from 'react';
import solutionData from '@data/solutions.json';

/**
 * @typedef {Object} ExamStats
 * @property {string}  chapterName
 * @property {string}  subject
 * @property {number}  totalQuestions
 * @property {number}  totalMarks
 * @property {number}  attempted
 * @property {number}  correct
 * @property {number}  wrong
 * @property {number}  unattempted
 * @property {number}  score
 * @property {number}  maxScore
 * @property {number}  accuracy         - (correct / attempted) × 100
 * @property {number}  percentage       - (score / totalMarks) × 100
 * @property {Object}  markingScheme
 * @property {Record<string, { userAnswer: string|null, correctAnswer: string, status: 'correct'|'wrong'|'unattempted' }>} breakdown
 */

/**
 * Custom hook for computing exam result analytics.
 *
 * @param {string} examId    - e.g. "exam_ElectricChargesandFields"
 * @param {Record<string, string>} [userAnswersOverride] - Optionally pass answers directly
 * @returns {{ stats: ExamStats | null, loading: boolean, error: string | null }}
 */
export function useResult(examId, userAnswersOverride) {
    const result = useMemo(() => {
        if (!examId) return { stats: null, loading: false, error: 'No exam ID provided' };

        // Get correct answers from solutions
        const solutionEntry = solutionData[examId];
        if (!solutionEntry) {
            return { stats: null, loading: false, error: `No answer key found for ${examId}` };
        }

        // Get user answers — from override or localStorage
        let userAnswers = userAnswersOverride;
        if (!userAnswers) {
            try {
                const singleKey = `${examId}_omr`;
                const doubleKey = `exam_${examId}_omr`;
                const raw = localStorage.getItem(singleKey) || localStorage.getItem(doubleKey);
                userAnswers = raw ? JSON.parse(raw) : {};
            } catch {
                userAnswers = {};
            }
        }

        const { answers: correctAnswers, totalQuestions, totalMarks, markingScheme, chapterName, subject, basePath } = solutionEntry;
        const { correct: correctMark, wrong: wrongMark } = markingScheme;

        let correctCount = 0;
        let wrongCount = 0;
        let unattemptedCount = 0;
        /** @type {Record<string, { userAnswer: string|null, correctAnswer: string, status: 'correct'|'wrong'|'unattempted' }>} */
        const breakdown = {};

        for (let q = 1; q <= totalQuestions; q++) {
            const qKey = String(q);
            const correctAns = correctAnswers[qKey];
            const userAns = userAnswers[qKey] || null;

            if (!userAns) {
                unattemptedCount++;
                breakdown[qKey] = { userAnswer: null, correctAnswer: correctAns, status: 'unattempted' };
            } else if (userAns === correctAns) {
                correctCount++;
                breakdown[qKey] = { userAnswer: userAns, correctAnswer: correctAns, status: 'correct' };
            } else {
                wrongCount++;
                breakdown[qKey] = { userAnswer: userAns, correctAnswer: correctAns, status: 'wrong' };
            }
        }

        const attempted = correctCount + wrongCount;
        const score = Math.max(0, (correctCount * correctMark) + (wrongCount * wrongMark));
        const accuracy = attempted > 0 ? Math.round((correctCount / attempted) * 100) : 0;
        const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

        return {
            stats: {
                chapterName,
                subject,
                totalQuestions,
                totalMarks,
                attempted,
                correct: correctCount,
                wrong: wrongCount,
                unattempted: unattemptedCount,
                score,
                maxScore: totalMarks,
                accuracy,
                percentage,
                markingScheme,
                breakdown,
                basePath,
            },
            loading: false,
            error: null,
        };
    }, [examId, userAnswersOverride]);

    return result;
}
