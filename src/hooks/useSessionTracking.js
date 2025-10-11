// hooks/useSessionTracking.js
import { useEffect, useState, useCallback, useRef } from "react";
import { doc, setDoc, serverTimestamp, increment } from 'firebase/firestore';
import { useAuthContext } from "../contexts/AuthContext";
import { calculateLevelUp, PLAYER_CONFIG } from "../utils/playerStatsUtils";
import { handleBossDefeat } from "../utils/bossUtils";

/**
 * Custom hook for batched session tracking to optimize Firestore writes
 * 
 * @param {Object} user - Firebase auth user object
 * @param {Object} db - Firestore database instance
 * @param {boolean} isFinished - Whether the study session is complete
 * @returns {Object} - { trackCardReview, pendingCardReviews, forceWrite }
 */
export const useSessionTracking = (user, db, isFinished) => {

    const {updateBossHealth, updateMemberDamage, updateLastBossResults, resetAllMembersBossDamage, updateUserProfile} = useAuthContext();

    // Use REF for the counter to avoid async state issues with Strict Mode
    const pendingCountRef = useRef(0);
    const [displayCount, setDisplayCount] = useState(0); // Just for UI if needed
    const [sessionStartTime, setSessionStartTime] = useState(null);
    const writeTimeoutRef = useRef(null);
    const hasWrittenRef = useRef(false);
    const trackingInProgressRef = useRef(false);
    
    // Configuration
    const BATCH_SIZE = 5; // Write after every 5 cards
    const WRITE_DELAY = 30000; // Write after 30 seconds of inactivity
    const FINAL_WRITE_DELAY = 2000; // Write 2 seconds after deck completion

    // Initialize session start time once
    useEffect(() => {
        if (!sessionStartTime && user) {
            setSessionStartTime(new Date());
        }
    }, [user, sessionStartTime]);

    // Clear any pending timeout
    const clearWriteTimeout = useCallback(() => {
        if (writeTimeoutRef.current) {
            clearTimeout(writeTimeoutRef.current);
            writeTimeoutRef.current = null;
        }
    }, []);

    // Main function to write session data to Firestore
    const writeSessionData = useCallback(async (cardsCount, isComplete = false) => {
        if (!user || cardsCount === 0) return;

        try {
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const sessionRef = doc(db, 'users', user.uid, 'dailySessions', today);
            
            const now = serverTimestamp();
            
            // Build session data
            const sessionData = {
                date: now,
                lastSessionAt: now,
                cardsReviewed: increment(cardsCount),
                // Estimate study time: ~30 seconds per card = 0.5 minutes
                minutesStudied: increment(Math.ceil(cardsCount * 0.5)),
                // Firestore won't overwrite if it already exists due to merge: true
                firstSessionAt: now
            };

            await setDoc(sessionRef, sessionData, { merge: true });
            
            console.log(`✅ Session write: ${cardsCount} cards tracked`);
            
            // Reset pending count after successful write
            pendingCountRef.current = 0;
            setDisplayCount(0);
            hasWrittenRef.current = true;
            
        } catch (error) {
            console.error('❌ Error writing session data:', error);
            // Keep pending count if write failed - will retry on next batch
        }
    }, [user, db]);

    // Main tracking function - call this when a card is reviewed
    const trackCardReview = useCallback(() => {
        // STRICT MODE PROTECTION: Check if already processing
        if (trackingInProgressRef.current) {
            console.log('⚠️ trackCardReview blocked - already in progress');
            return;
        }
        
        // Set lock IMMEDIATELY (synchronous)
        trackingInProgressRef.current = true;
        
        // Increment using REF (synchronous, not async like setState)
        pendingCountRef.current += 1;
        setDisplayCount(pendingCountRef.current); // Update UI
        
        console.log(`📝 Card tracked. Pending: ${pendingCountRef.current}/${BATCH_SIZE}`);
        
        // Check if we need to write
        if (pendingCountRef.current >= BATCH_SIZE) {
            const countToWrite = pendingCountRef.current;
            pendingCountRef.current = 0; // Reset immediately
            setDisplayCount(0);
            
            writeSessionData(countToWrite).finally(() => {
                trackingInProgressRef.current = false;
            });
        } else {
            // Not writing yet, release lock immediately
            trackingInProgressRef.current = false;
        }
    }, [writeSessionData, BATCH_SIZE]);

    // Force write function (useful for manual triggers)
    const forceWrite = useCallback(() => {
        console.log("Forced write")
        if (pendingCountRef.current > 0) {  // ✅ Changed from pendingCardReviews
            clearWriteTimeout();
            const count = pendingCountRef.current;
            pendingCountRef.current = 0;
            setDisplayCount(0);
            writeSessionData(count, true);
        }
    }, [writeSessionData, clearWriteTimeout]);

    // Write pending reviews when deck is completed
    useEffect(() => {
        if (isFinished && pendingCountRef.current > 0) {  // ✅ Changed from pendingCardReviews
            console.log("is finished")
            const count = pendingCountRef.current;
            pendingCountRef.current = 0;
            setDisplayCount(0);
            writeSessionData(count, true);
        }
    }, [isFinished, writeSessionData]);  // ✅ Removed pendingCardReviews from dependencies

    // Write when user switches tabs/minimizes window
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && pendingCountRef.current > 0) {  // ✅ Changed from pendingCardReviews
                console.log("Switched tabs")
                const count = pendingCountRef.current;
                pendingCountRef.current = 0;
                setDisplayCount(0);
                writeSessionData(count);
            }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [writeSessionData]);  // ✅ Removed pendingCardReviews from dependencies

    // Cleanup: Write any pending reviews when component unmounts
    useEffect(() => {
        return () => {
            clearWriteTimeout();
            if (pendingCountRef.current > 0 && !hasWrittenRef.current) {  // ✅ Changed from pendingCardReviews
                writeSessionData(pendingCountRef.current, true);
            }
        };
    }, [writeSessionData, clearWriteTimeout]);  // ✅ Removed pendingCardReviews from dependencies

    return {
        trackCardReview,
        pendingCardReviews: displayCount,  // ✅ Changed to return displayCount
        forceWrite,
        sessionStartTime
    };
};