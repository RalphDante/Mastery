// src/utils/sm2.js

/**
 * Calculates the next SM-2 spaced repetition parameters for a flashcard.
 * @param {number} quality - User's rating of the card's difficulty (0-5, where 0-2 is 'Again', 3 is 'Hard', 4 is 'Good', 5 is 'Easy').
 * @param {number} currentEaseFactor - The current ease factor for the card (defaults to 2.5).
 * @param {number} currentInterval - The current interval in days for the card (defaults to 0).
 * @param {number} currentRepetitions - The current number of consecutive correct repetitions (defaults to 0).
 * @returns {{easeFactor: number, interval: number, repetitions: number, nextReviewDate: string}} - New SM-2 parameters and the next review date.
 */
export const calculateSM2 = (quality, currentEaseFactor = 2.5, currentInterval = 0, currentRepetitions = 0) => {
    let easeFactor = currentEaseFactor;
    let interval = currentInterval;
    let repetitions = currentRepetitions;

    // Adjust ease factor based on quality
    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easeFactor < 1.3) {
        easeFactor = 1.3; // Minimum ease factor
    }

    if (quality < 3) { // Incorrect or difficult (Again, Hard)
        repetitions = 0;
        interval = 1; // Interval resets to 1 day
    } else { // Correct (Good, Easy)
        if (repetitions === 0) {
            interval = 1; // First correct answer
        } else if (repetitions === 1) {
            interval = 6; // Second consecutive correct answer
        } else {
            interval = Math.round(interval * easeFactor);
        }
        repetitions++;
    }

    const nextReviewDate = new Date();
    // Set the date to the beginning of the day to avoid timezone issues with review dates
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);
    nextReviewDate.setHours(0, 0, 0, 0); 

    return {
        easeFactor,
        interval,
        repetitions,
        nextReviewDate: nextReviewDate.toISOString(), // Store as ISO string
    };
};