// src/utils/sm2.js

import { Timestamp } from 'firebase/firestore';

/**
 * Calculates the next SM-2 spaced repetition parameters for a flashcard.
 * @param {number} quality - User's rating of the card's difficulty (0-5, where 0-2 is 'Again', 3 is 'Hard', 4 is 'Good', 5 is 'Easy').
 * @param {number} currentEaseFactor - The current ease factor for the card (defaults to 2.5).
 * @param {number} currentInterval - The current interval in days for the card (defaults to 0).
 * @param {number} currentRepetitions - The current number of consecutive correct repetitions (defaults to 0).
 * @returns {{easeFactor: number, interval: number, repetitions: number, nextReviewDate: Timestamp}} - New SM-2 parameters and the next review date as Firestore Timestamp.
 */
export const calculateSM2 = (quality, currentEaseFactor = 2.5, currentInterval = 0, currentRepetitions = 0, debugMode = false) => {
    let easeFactor = currentEaseFactor;
    let interval = currentInterval;
    let repetitions = currentRepetitions;

    // Learning steps for failed cards (in days): 10min, 1hr, 6hr
    // In debug mode: 10sec, 1min, 6min
    const LEARNING_STEPS = debugMode 
        ? [0.000116, 0.000694, 0.00417] // 10sec, 1min, 6min in days
        : [0.007, 0.042, 0.25]; // 10min, 1hr, 6hr in days

    // Adjust ease factor based on quality
    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easeFactor < 1.3) {
        easeFactor = 1.3; // Minimum ease factor
    }

    if (quality < 3) { // Incorrect or difficult (Again, Hard)
        repetitions = 0;
        
        // Find current step in learning progression
        let stepIndex = LEARNING_STEPS.indexOf(currentInterval);
        
        if (stepIndex === -1 || quality === 0) {
            // Reset to first step if not in learning or if pressed "Again"
            interval = LEARNING_STEPS[0];
        } else if (stepIndex < LEARNING_STEPS.length - 1) {
            // Move to next learning step
            interval = LEARNING_STEPS[stepIndex + 1];
        } else {
            // Graduate to day-based intervals
            interval = 1;
        }
    } else { // Correct (Good, Easy)
        if (repetitions === 0) {
            interval = debugMode ? 0.000694 : 1; // First correct answer (1min in debug, 1day in prod)
        } else if (repetitions === 1) {
            interval = debugMode ? 0.00417 : 6; // Second consecutive correct answer (6min in debug, 6days in prod)
        } else {
            interval = Math.round(interval * easeFactor);
        }
        repetitions++;
    }

    const nextReviewDate = new Date();
    
    // Handle both fractional days (minutes/hours) and full days
    if (interval < 1) {
        // Handle fractional days (convert to minutes)
        const minutesToAdd = Math.round(interval * 1440); // Convert fraction of day to minutes
        nextReviewDate.setMinutes(nextReviewDate.getMinutes() + minutesToAdd);
    } else {
        // Handle full days
        if (debugMode) {
            // In debug mode, treat "days" as minutes for faster testing
            nextReviewDate.setMinutes(nextReviewDate.getMinutes() + interval);
        } else {
            nextReviewDate.setDate(nextReviewDate.getDate() + interval);
            nextReviewDate.setHours(0, 0, 0, 0);
        }
    }

    return {
        easeFactor,
        interval,
        repetitions,
        nextReviewDate: Timestamp.fromDate(nextReviewDate), // Return as Firestore Timestamp
    };
};

// Helper function to get current timestamp for queries
export const getCurrentTimestamp = () => {
    return Timestamp.now();
};

// Helper function to create a timestamp for immediate review
export const getImmediateReviewTimestamp = () => {
    return Timestamp.fromDate(new Date());
};