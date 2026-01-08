// hooks/useSessionTracking.js
import { useEffect, useState, useCallback, useRef } from "react";
import { doc, setDoc, runTransaction, serverTimestamp, increment, collection, getDocs } from 'firebase/firestore';
import { useAuthContext } from "../contexts/AuthContext";
import { calculateLevelUp, PLAYER_CONFIG } from "../utils/playerStatsUtils";
import { handleBossDefeat } from "../utils/bossUtils";
import { usePartyContext } from "../contexts/PartyContext";
import { useUserDataContext } from "../contexts/UserDataContext";
import { getWeekId, getMonthId } from "../contexts/LeaderboardContext";

// Reward configuration for flashcard reviews
const CARD_REWARDS = PLAYER_CONFIG.FLASHCARD_REWARDS;

/**
 * Custom hook for batched session tracking to optimize Firestore writes
 * Now includes player stat updates (EXP, health, mana, boss damage)
 * 
 * @param {Object} user - Firebase auth user object
 * @param {Object} db - Firestore database instance
 * @param {boolean} isFinished - Whether the study session is complete
 * @returns {Object} - { trackCardReview, pendingCardReviews, forceWrite }
 */
export const useSessionTracking = (user, db, isFinished) => {
    const {
        updateBossHealth, 
        updateMemberDamage, 
        updateLastBossResults, 
        resetAllMembersBossDamage, 
        updateUserProfile,
        partyMembers,
        partyProfile
    } = usePartyContext();

    const { incrementMinutes } = useUserDataContext();

    // Refs for counters to avoid async state issues
    const pendingCorrectRef = useRef(0);
    const pendingIncorrectRef = useRef(0);
    const [displayCount, setDisplayCount] = useState(0);
    const [sessionStartTime, setSessionStartTime] = useState(null);
    const writeTimeoutRef = useRef(null);
    const hasWrittenRef = useRef(false);
    const trackingInProgressRef = useRef(false);
    
    // Configuration
    const BATCH_SIZE = 5; // Write after every 5 cards
    const WRITE_DELAY = 30000; // Write after 30 seconds of inactivity (optional)

    // Initialize session start time once
    useEffect(() => {
        if (!sessionStartTime && user) {
            setSessionStartTime(new Date());
        }
    }, [user, sessionStartTime]);

    const calculateImmediateRewards = useCallback((isCorrect) => {
        const baseReward = isCorrect ? CARD_REWARDS.CORRECT : CARD_REWARDS.INCORRECT;
        

        const estimatedLevel = partyMembers[user?.uid]?.level || 1;
        
        const levelMultiplier = 1 + (estimatedLevel * 0.05);
        const scaledDamage = Math.floor(baseReward.damage * levelMultiplier);
        
        return {
            exp: baseReward.exp,
            damage: scaledDamage,
            health: baseReward.health,
            mana: baseReward.mana
        };
    }, [partyMembers, user?.uid]);

    // Clear any pending timeout
    const clearWriteTimeout = useCallback(() => {
        if (writeTimeoutRef.current) {
            clearTimeout(writeTimeoutRef.current);
            writeTimeoutRef.current = null;
        }
    }, []);

    // Main function to write session data AND player stats to Firestore
    const writeSessionData = useCallback(async (correctCount, incorrectCount, isComplete = false) => {
        if (!user || (correctCount === 0 && incorrectCount === 0)) return;

        const totalCards = correctCount + incorrectCount;
        let newBossHealth = null;
        let newMemberDamage = null;
        let newExp, newLevel, newHealth, newMana;

        try {
            const now = new Date();
            const dateKey = now.toLocaleDateString('en-CA');


            const weekId = getWeekId(now);
            const monthId = getMonthId(now);

            const estimatedMinutes = Math.ceil(totalCards * 0.5);

            await runTransaction(db, async (transaction) => {
                const userRef = doc(db, 'users', user.uid);
                const dailySessionRef = doc(db, 'users', user.uid, 'dailySessions', dateKey);
                
                const weeklyLeaderboardRef = doc(
                    db, 
                    'leaderboards', 
                    'weekly', 
                    weekId, 
                    user.uid
                );
                
                const monthlyLeaderboardRef = doc(
                    db, 
                    'leaderboards', 
                    'monthly', 
                    monthId, 
                    user.uid
                );

                const userDoc = await transaction.get(userRef);
                const dailyDoc = await transaction.get(dailySessionRef);

                if (userDoc.exists()) {
                    const currentData = userDoc.data();

           

                    // Get party/member data if in party
                    let partyDoc = null;
                    let memberRef = null;
                    let memberDoc = null;
                    let partyRef = null;
                    let allMembersSnapshot = null;
                    
                    if (currentData.currentPartyId) {
                        partyRef = doc(db, 'parties', currentData.currentPartyId);
                        partyDoc = await transaction.get(partyRef);
                        
                        memberRef = doc(db, 'parties', currentData.currentPartyId, 'members', user.uid);
                        memberDoc = await transaction.get(memberRef);
                        
                        const membersRef = collection(db, 'parties', currentData.currentPartyId, 'members');
                        allMembersSnapshot = await getDocs(membersRef);
                    }

                    // Calculate base rewards (before level scaling)
                    const baseCorrectRewards = {
                        exp: correctCount * CARD_REWARDS.CORRECT.exp,
                        damage: correctCount * CARD_REWARDS.CORRECT.damage,
                        health: correctCount * CARD_REWARDS.CORRECT.health,
                        mana: correctCount * CARD_REWARDS.CORRECT.mana
                    };

                    const baseIncorrectRewards = {
                        exp: incorrectCount * CARD_REWARDS.INCORRECT.exp,
                        damage: incorrectCount * CARD_REWARDS.INCORRECT.damage,
                        health: incorrectCount * CARD_REWARDS.INCORRECT.health,
                        mana: incorrectCount * CARD_REWARDS.INCORRECT.mana
                    };

                    // Calculate total EXP first to determine level
                    const totalExpGained = baseCorrectRewards.exp + baseIncorrectRewards.exp;

                    // Update player stats (calculate new level first)
                    const currentExp = currentData.exp || 0;
                    const currentLevel = currentData.level || 1;
                    const currentHealth = currentData.health || 0;
                    const currentMana = currentData.mana || 0;

                    newExp = currentExp + totalExpGained;
                    
                    const { newLevel: calculatedLevel, leveledUp, coinBonus } = calculateLevelUp(
                        currentExp, 
                        newExp, 
                        currentLevel
                    );
                    newLevel = calculatedLevel;

                    // NOW apply level scaling to damage (using NEW level)
                    const baseDamage = baseCorrectRewards.damage + baseIncorrectRewards.damage;
                    const levelMultiplier = 1 + (newLevel * 0.05);
                    const scaledDamage = Math.floor(baseDamage * levelMultiplier);

                    // Final rewards with scaled damage
                    const totalRewards = {
                        exp: totalExpGained,
                        damage: scaledDamage,
                        health: baseCorrectRewards.health + baseIncorrectRewards.health,
                        mana: baseCorrectRewards.mana + baseIncorrectRewards.mana
                    };

                    newHealth = Math.min(
                        PLAYER_CONFIG.BASE_HEALTH, 
                        currentHealth + totalRewards.health
                    );
                    newMana = Math.min(
                        PLAYER_CONFIG.BASE_MANA, 
                        currentMana + totalRewards.mana
                    );

                    // Update user document
                    const updateData = {
                        lastStudyDate: now,
                        lastActiveAt: now,
                        exp: newExp,
                        level: newLevel,
                        health: newHealth,
                        mana: newMana,
                    };

                    if (leveledUp) {
                        updateData.coins = increment(coinBonus);
                    }

                    transaction.update(userRef, updateData);

                    transaction.set(weeklyLeaderboardRef, {
                        displayName: currentData.displayName || 'Anonymous',
                        minutes: increment(estimatedMinutes),
                        avatar: currentData.avatar || 'warrior_01',
                        level: newLevel || currentData.level || 1,
                        isPro: currentData.subscription?.tier === 'pro' || false,
                        updatedAt: serverTimestamp(),
                        title: currentData.title || null,
                        streak: currentData.stats?.currentStreak || 0,
                        exp: increment(totalExpGained)
                    }, { merge: true });
                    
                    transaction.set(monthlyLeaderboardRef, {
                        displayName: currentData.displayName || 'Anonymous',
                        minutes: increment(estimatedMinutes),
                        avatar: currentData.avatar || 'warrior_01',
                        level: newLevel || currentData.level || 1,
                        isPro: currentData.subscription?.tier === 'pro' || false,
                        updatedAt: serverTimestamp(),
                        title: currentData.title || null,
                        streak: currentData.stats?.currentStreak || 0,
                        exp: increment(totalExpGained)
                    }, { merge: true });
                    
                    console.log(`📊 Updated leaderboards: +${estimatedMinutes} minutes (from ${totalCards} flashcards)`);

                    // Handle party boss damage if in party
                    if (currentData.currentPartyId && partyDoc && partyDoc.exists()) {
                        const partyData = partyDoc.data();
                        const currentBoss = partyData.currentBoss;
                        
                        if (currentBoss) {
                            const isBossAlive = currentBoss.isAlive !== false && currentBoss.currentHealth > 0;
                            
                            const memberData = memberDoc?.exists() ? memberDoc.data() : null;
                            const currentMemberDamage = memberData?.currentBossDamage || 0;
                            newMemberDamage = currentMemberDamage + totalRewards.damage;
                            
                            if (isBossAlive) {
                                newBossHealth = Math.max(0, currentBoss.currentHealth - totalRewards.damage);
                                
                                transaction.update(partyRef, {
                                    'currentBoss.currentHealth': newBossHealth,
                                    'currentBoss.lastDamageAt': now,
                                });

                                if (memberDoc && memberDoc.exists()) {
                                    transaction.update(memberRef, {
                                        currentBossDamage: increment(totalRewards.damage),
                                        lastDamageAt: now,
                                        lastStudyAt: now,
                                        exp: newExp,
                                        level: newLevel,
                                        health: newHealth,
                                        mana: newMana
                                    });
                                } else {
                                    transaction.set(memberRef, {
                                        displayName: currentData.displayName || 'Anonymous',
                                        joinedAt: now,
                                        currentBossDamage: newMemberDamage,
                                        currentBossStudyMinutes: 0,
                                        lastDamageAt: now,
                                        lastStudyAt: now,
                                        exp: newExp,
                                        level: newLevel,
                                        health: newHealth,
                                        mana: newMana
                                    });
                                }

                                if (newBossHealth <= 0) {
                                    console.log('Boss defeated!', currentBoss.name);
                                    await handleBossDefeat(
                                        transaction, 
                                        partyRef, 
                                        partyDoc, 
                                        currentBoss, 
                                        now,
                                        allMembersSnapshot,
                                        user.uid,
                                        newMemberDamage,
                                        0, // studyMinutes for flashcards
                                        updateLastBossResults,
                                        resetAllMembersBossDamage
                                    );
                                }
                            } else {
                                // Boss already dead, just update member stats
                                if (memberDoc && memberDoc.exists()) {
                                    transaction.update(memberRef, {
                                        lastStudyAt: now,
                                        exp: newExp,
                                        level: newLevel,
                                        health: newHealth,
                                        mana: newMana
                                    });
                                } else {
                                    transaction.set(memberRef, {
                                        displayName: currentData.displayName || 'Anonymous',
                                        joinedAt: now,
                                        lastStudyAt: now,
                                        exp: newExp,
                                        level: newLevel,
                                        health: newHealth,
                                        mana: newMana
                                    });
                                }
                            }
                        }
                    }
                } else {
                    // New user - create user document
                    const totalRewards = {
                        exp: (correctCount * CARD_REWARDS.CORRECT.exp) + (incorrectCount * CARD_REWARDS.INCORRECT.exp),
                        health: (correctCount * CARD_REWARDS.CORRECT.health) + (incorrectCount * CARD_REWARDS.INCORRECT.health),
                        mana: (correctCount * CARD_REWARDS.CORRECT.mana) + (incorrectCount * CARD_REWARDS.INCORRECT.mana),
                    };

                    newExp = totalRewards.exp;
                    const { newLevel: calculatedNewLevel } = calculateLevelUp(0, newExp, 1);
                    newLevel = calculatedNewLevel;
                    newHealth = Math.min(PLAYER_CONFIG.BASE_HEALTH, totalRewards.health);
                    newMana = Math.min(PLAYER_CONFIG.BASE_MANA, totalRewards.mana);
                    
                    transaction.set(userRef, {
                        email: user.email,
                        displayName: user.displayName || 'Anonymous',
                        createdAt: now,
                        lastActiveAt: now,
                        lastStudyDate: now,
                        exp: newExp,
                        level: newLevel,
                        coins: 0,
                        stats: { 
                            totalReviews: 0, 
                            weeklyReviews: 0, 
                            currentStreak: 0, 
                            longestStreak: 0, 
                            totalDecks: 0, 
                            totalCards: 0 
                        },
                        health: newHealth,
                        mana: newMana,
                    });
                }

                // Update daily session
                if (dailyDoc.exists()) {
                    const existingData = dailyDoc.data();
                    transaction.update(dailySessionRef, {
                        cardsReviewed: (existingData.cardsReviewed || 0) + totalCards,
                        // Estimate study time: ~30 seconds per card = 0.5 minutes
                        minutesStudied: (existingData.minutesStudied || 0) + Math.ceil(totalCards * 0.5),
                        lastSessionAt: now,
                    });
                } else {
                    transaction.set(dailySessionRef, {
                        date: now,
                        firstSessionAt: now,
                        lastSessionAt: now,
                        minutesStudied: Math.ceil(totalCards * 0.5),
                        cardsReviewed: totalCards,
                    });
                }
            });

            // Update context state
            if (newBossHealth !== null) {
                updateBossHealth(newBossHealth);
            }
            if (newMemberDamage !== null) {
                updateMemberDamage(user.uid, newMemberDamage);
            }

            updateUserProfile({
                exp: newExp,
                level: newLevel,
                health: newHealth,
                mana: newMana,
                lastStudyDate: now,
                lastActiveAt: now
            });

            incrementMinutes(estimatedMinutes);
            
            // console.log(`✅ Session write: ${totalCards} cards (${correctCount} correct, ${incorrectCount} incorrect)`);
            // console.log(`   Base Rewards: +${totalExpGained} XP, +${baseDamage} base DMG`);
            // console.log(`   Level ${newLevel} (x${levelMultiplier.toFixed(2)} multiplier) → ${scaledDamage} total DMG`);
            // console.log(`   Stats: +${totalRewards.health} HP, +${totalRewards.mana} MANA`);
            
            // Reset pending counts after successful write
            pendingCorrectRef.current = 0;
            pendingIncorrectRef.current = 0;
            setDisplayCount(0);
            hasWrittenRef.current = true;
            
        } catch (error) {
            console.error('❌ Error writing session data:', error);
            // Keep pending counts if write failed - will retry on next batch
        }
    }, [user, db, updateBossHealth, updateMemberDamage, updateUserProfile, updateLastBossResults, resetAllMembersBossDamage, incrementMinutes]);

    // Main tracking function - call this when a card is reviewed
    const trackCardReview = useCallback((isCorrect) => {
        if (trackingInProgressRef.current) {
            console.log('⚠️ trackCardReview blocked - already in progress');
            return;
        }
        
        trackingInProgressRef.current = true;
        
        // Increment refs
        if (isCorrect) {
            pendingCorrectRef.current += 1;
        } else {
            pendingIncorrectRef.current += 1;
        }
        
        const totalPending = pendingCorrectRef.current + pendingIncorrectRef.current;
        setDisplayCount(totalPending);
        
        // 🎯 OPTIMISTIC UPDATE - Update context immediately for instant UI feedback
        const rewards = calculateImmediateRewards(isCorrect);
        
        // Get current values from partyMembers
        const currentMember = partyMembers[user.uid];
        const currentExp = currentMember?.exp || 0;
        const currentHealth = currentMember?.health || 0;
        const currentMana = currentMember?.mana || 0;
        
        // Update with new calculated values
        updateUserProfile({
            exp: currentExp + rewards.exp,
            health: Math.min(PLAYER_CONFIG.BASE_HEALTH, currentHealth + rewards.health),
            mana: Math.min(PLAYER_CONFIG.BASE_MANA, currentMana + rewards.mana),
            lastStudyDate: new Date()
        });
        
        // If in party, update boss health immediately too
        if (currentMember && partyProfile?.currentBoss) {
            const currentBossHealth = partyProfile.currentBoss.currentHealth || 0;
            const newBossHealth = Math.max(0, currentBossHealth - rewards.damage);
            
            updateBossHealth(newBossHealth);
            updateMemberDamage(user.uid, (currentMember?.currentBossDamage || 0) + rewards.damage);
        }
        
        console.log(`📝 Card tracked (${isCorrect ? 'correct' : 'incorrect'}). Pending: ${totalPending}/${BATCH_SIZE}`);
        console.log(`⚡ Optimistic update: +${rewards.exp} XP, +${rewards.health} HP, +${rewards.mana} MP, ${rewards.damage} DMG`);
        
        // Check if we need to write to database
        if (totalPending >= BATCH_SIZE) {
            const correctToWrite = pendingCorrectRef.current;
            const incorrectToWrite = pendingIncorrectRef.current;
            
            pendingCorrectRef.current = 0;
            pendingIncorrectRef.current = 0;
            setDisplayCount(0);
            
            // Write to database (this will reconcile with actual values)
            writeSessionData(correctToWrite, incorrectToWrite).finally(() => {
                trackingInProgressRef.current = false;
            });
        } else {
            trackingInProgressRef.current = false;
        }
    }, [calculateImmediateRewards, updateUserProfile, updateMemberDamage, user?.uid, partyMembers, BATCH_SIZE, writeSessionData, partyProfile]);

    // Force write function (useful for manual triggers)
    const forceWrite = useCallback(() => {
        const totalPending = pendingCorrectRef.current + pendingIncorrectRef.current;
        
        if (totalPending > 0) {
            console.log("🔄 Forced write triggered");
            clearWriteTimeout();
            const correctToWrite = pendingCorrectRef.current;
            const incorrectToWrite = pendingIncorrectRef.current;
            
            pendingCorrectRef.current = 0;
            pendingIncorrectRef.current = 0;
            setDisplayCount(0);
            
            writeSessionData(correctToWrite, incorrectToWrite, true);
        }
    }, [writeSessionData, clearWriteTimeout]);

    // Write pending reviews when deck is completed
    useEffect(() => {
        const totalPending = pendingCorrectRef.current + pendingIncorrectRef.current;
        
        if (isFinished && totalPending > 0) {
            console.log("✅ Deck finished - writing remaining cards");
            const correctToWrite = pendingCorrectRef.current;
            const incorrectToWrite = pendingIncorrectRef.current;
            
            pendingCorrectRef.current = 0;
            pendingIncorrectRef.current = 0;
            setDisplayCount(0);
            
            writeSessionData(correctToWrite, incorrectToWrite, true);
        }
    }, [isFinished, writeSessionData]);

    // Write when user switches tabs/minimizes window
    useEffect(() => {
        const handleVisibilityChange = () => {
            const totalPending = pendingCorrectRef.current + pendingIncorrectRef.current;
            
            if (document.hidden && totalPending > 0) {
                console.log("👁️ Tab hidden - writing pending cards");
                const correctToWrite = pendingCorrectRef.current;
                const incorrectToWrite = pendingIncorrectRef.current;
                
                pendingCorrectRef.current = 0;
                pendingIncorrectRef.current = 0;
                setDisplayCount(0);
                
                writeSessionData(correctToWrite, incorrectToWrite);
            }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [writeSessionData]);

    // Cleanup: Write any pending reviews when component unmounts
    useEffect(() => {
        return () => {
            clearWriteTimeout();
            const totalPending = pendingCorrectRef.current + pendingIncorrectRef.current;
            
            if (totalPending > 0 && !hasWrittenRef.current) {
                console.log("🚪 Component unmounting - writing pending cards");
                writeSessionData(pendingCorrectRef.current, pendingIncorrectRef.current, true);
            }
        };
    }, [writeSessionData, clearWriteTimeout]);

    return {
        trackCardReview,
        pendingCardReviews: displayCount,
        forceWrite,
        sessionStartTime
    };
};