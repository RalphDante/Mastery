// TimerWithAutosave.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { runTransaction, doc, increment, collection, query, getDocs, getDoc, updateDoc } from 'firebase/firestore';

import { calculateLevelUp, PLAYER_CONFIG } from '../../../utils/playerStatsUtils';
import { serverTimestamp } from 'firebase/firestore';
import { handleBossDefeat } from '../../../utils/bossUtils';

import { usePartyContext } from '../../../contexts/PartyContext';
import { useUserDataContext } from '../../../contexts/UserDataContext';
import { isStreakAtRisk, updateUserAndPartyStreak } from '../../../utils/streakUtils';
import { useTutorials } from '../../../contexts/TutorialContext';
import LimitReachedModal from '../../../components/Modals/LimitReachedModal';
import { showInterstitialAd } from '../../../components/InterstitialAd';
import { useAuthContext } from '../../../contexts/AuthContext';
import SessionCompleteScreen from './SessionCompleteScreen';
import { getMonthId, getWeekId } from '../../../contexts/LeaderboardContext';
import { Zap, Trophy } from 'lucide-react';
import StreakModal from '../../../components/Modals/StreakModal';
import SessionStatsCard from './SessionStatsCard';
import { useNavigate } from 'react-router-dom';

function Timer({
  authUser,
  db,
  handleTimerStart,
  handleTimerComplete,
  deckId = null,
  onTimeUpdate = null,
  timerStartRef
}) {
  const {userProfile, user} = useAuthContext();
  const {updateBossHealth, updateMemberDamage, updateLastBossResults, resetAllMembersBossDamage, updateUserProfile, partyProfile, partyMembers} = usePartyContext();
  const {incrementMinutes, incrementExp} = useUserDataContext();

  const {isTutorialAtStep, isInTutorial, advanceStep, } = useTutorials();
  const hasNotStartedATimerSession = isTutorialAtStep('start-timer', 1);

  const [showStreakFreezePrompt, setShowStreakFreezePrompt] = useState(false);
  const [streakAtRisk, setStreakAtRisk] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);

  const navigate = useNavigate();
  const startTimeRef = useRef(null);           // NEW: When timer actually started
  const pausedTimeRef = useRef(0);             // NEW: Total time spent paused
  const lastPauseTimeRef = useRef(null);       // NEW: When last pause began
  const sessionTimerRef = useRef(null);
  const lastSaveRef = useRef(0);               // Track last save in SECONDS not ref ticks

  const currentUser = userProfile;
  const isPro = currentUser?.subscription?.tier === "pro";

  const isSavingRef = useRef(false);
  const audioRef = useRef(null);

  const hasResumedRef = useRef(false);
  const correctSoundEffect = useRef(null);
  const daggerWooshSFX = useRef(null);

  const activeBooster = currentUser?.activeBooster;
  const hasActiveBooster = activeBooster && activeBooster.endsAt > Date.now();

  const durations = [
    // { label: '1 min', value: 1, damage: 10, xp: 10, mana: 3, health: 1 },
    { label: '5 min', value: 5, damage: 50, xp: 50, mana: 15, health: 5 },
    { label: '15 min', value: 15, damage: 150, xp: 150, mana: 45, health: 15 },
    { label: '25 min', value: 25, damage: 250, xp: 250, mana: 75, health: 25  },
    { label: '45 min', value: 45, damage: 450, xp: 450, mana: 135, health: 45  },
    { label: '60 min', value: 60, damage: 600, xp: 600, mana: 180, health: 60  },
  ];


  const [selectedDuration, setSelectedDuration] = useState(25);
  const [isRunning, setIsRunning] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);





  // Initialize alarm sound
  useEffect(()=>{
      correctSoundEffect.current = new Audio("https://cdn.freesound.org/previews/270/270304_5123851-lq.mp3");
      correctSoundEffect.current.volume = 0.4;

      daggerWooshSFX.current = new Audio('/sfx/mixkit-dagger-woosh-1487.wav'); // your file path or CDN URL
      daggerWooshSFX.current.volume = 0.3;

      audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audioRef.current.volume = 0.5;

  },[])
  


  const saveCompletedSession = useCallback(async (minutesToSave) => {
    if (!authUser || minutesToSave <= 0) return;

    const MAX_MINUTES_PER_SAVE = 180; // 3 hours max
    
    if (minutesToSave > MAX_MINUTES_PER_SAVE) {
      console.error('Invalid minutes to save:', minutesToSave);
      return;
    }

    // Calculate exp based on tier
    const baseExpPerMinute = PLAYER_CONFIG.EXP_PER_MINUTE;
    let expMultiplier = isPro ? 2 : 1;

    if (hasActiveBooster) {
      expMultiplier += (activeBooster.multiplier - 1);
      expMultiplier = Math.min(expMultiplier, 5);
      console.log(`🔥 Booster active: ${activeBooster.multiplier}x (total: ${expMultiplier}x)`);
    }

    const expPerMinute = baseExpPerMinute * expMultiplier;
    const expEarned = minutesToSave * expPerMinute;

    let newBossHealth = null;
    let newMemberDamage = null;
    let newExp, newLevel, newHealth, newMana;
    let now;

    try {
      now = new Date();
      const dateKey = now.toLocaleDateString('en-CA');
      const weekId = getWeekId(now);
      const monthId = getMonthId(now);

      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', authUser.uid);
        const dailySessionRef = doc(db, 'users', authUser.uid, 'dailySessions', dateKey);

        const userDoc = await transaction.get(userRef);
        const dailyDoc = await transaction.get(dailySessionRef);

        if (userDoc.exists()) {
          const currentData = userDoc.data();

          let partyDoc = null;
          let memberRef = null;
          let memberDoc = null;
          let partyRef = null;
          
          if (currentData.currentPartyId) {
            partyRef = doc(db, 'parties', currentData.currentPartyId);
            partyDoc = await transaction.get(partyRef);
            memberRef = doc(db, 'parties', currentData.currentPartyId, 'members', authUser.uid);
            memberDoc = await transaction.get(memberRef);
          }

          const currentExp = currentData.exp || 0;
          const currentLevel = currentData.level || 1;
          const currentHealth = currentData.health || 0;
          const currentMana = currentData.mana || 0;

          newExp = currentExp + expEarned;
          newHealth = Math.min(
            PLAYER_CONFIG.BASE_HEALTH, 
            currentHealth + (minutesToSave * PLAYER_CONFIG.HEALTH_PER_MINUTE)
          );

          newMana = Math.min(
            PLAYER_CONFIG.BASE_MANA, 
            currentMana + (minutesToSave * PLAYER_CONFIG.MANA_PER_MINUTE)
          );

          const {newLevel: calculatedLevel, leveledUp, coinBonus} = calculateLevelUp(currentExp, newExp, currentLevel);
          newLevel = calculatedLevel;

          const baseDamage = minutesToSave * 10;
          const levelMultiplier = 1 + (newLevel * 0.05);
          const totalDamage = Math.floor(baseDamage * levelMultiplier);

          // 🔥 Update user stats
          const updateData = {
            lastStudyDate: now,
            lastActiveAt: now,
            exp: newExp,
            level: newLevel,
            health: newHealth,
            mana: newMana,
            'activeTimer.isActive': false, // 🔥 Clear active timer
            'activeTimer.lastSavedAt': null
          };

          if (leveledUp) {
            updateData.coins = increment(coinBonus);
          }

          transaction.update(userRef, updateData);

          // 🔥 Update leaderboards
          const weeklyLeaderboardRef = doc(db, 'leaderboards', 'weekly', weekId, authUser.uid);
          const monthlyLeaderboardRef = doc(db, 'leaderboards', 'monthly', monthId, authUser.uid);

          transaction.set(weeklyLeaderboardRef, {
            displayName: currentData.displayName || 'Anonymous',
            minutes: increment(minutesToSave),
            exp: increment(expEarned),
            avatar: currentData.avatar || 'warrior_01',
            level: newLevel || currentData.level || 1,
            isPro: currentData.subscription?.tier === 'pro' || false,
            updatedAt: serverTimestamp(),
            title: currentData.title || null,
            streak: currentData.stats?.currentStreak || 0
          }, { merge: true });
          
          transaction.set(monthlyLeaderboardRef, {
            displayName: currentData.displayName || 'Anonymous',
            minutes: increment(minutesToSave),
            exp: increment(expEarned),
            avatar: currentData.avatar || 'warrior_01',
            level: newLevel || currentData.level || 1,
            isPro: currentData.subscription?.tier === 'pro' || false,
            updatedAt: serverTimestamp(),
            title: currentData.title || null,
            streak: currentData.stats?.currentStreak || 0
          }, { merge: true });

          // 🔥 Handle party boss damage
          if (currentData.currentPartyId && partyDoc && partyDoc.exists()) {
            const partyData = partyDoc.data();
            const currentBoss = partyData.currentBoss;
            
            if (currentBoss) {
              const isBossAlive = currentBoss.isAlive !== false && currentBoss.currentHealth > 0;
              
              const memberData = memberDoc?.exists() ? memberDoc.data() : null;
              newMemberDamage = (memberData?.currentBossDamage || 0) + totalDamage;
              const newMemberStudyMinutes = (memberData?.currentBossStudyMinutes || 0) + minutesToSave;
              
              if (isBossAlive) {
                newBossHealth = Math.max(0, currentBoss.currentHealth - totalDamage);
                
                transaction.update(partyRef, {
                  'currentBoss.currentHealth': newBossHealth,
                  'currentBoss.lastDamageAt': now,
                });

                if (memberDoc && memberDoc.exists()) {
                  transaction.update(memberRef, {
                    currentBossDamage: newMemberDamage,
                    currentBossStudyMinutes: newMemberStudyMinutes,
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
                    currentBossStudyMinutes: newMemberStudyMinutes,
                    lastDamageAt: now,
                    lastStudyAt: now,
                    exp: newExp,        
                    level: newLevel,    
                    health: newHealth,  
                    mana: newMana
                  });
                }

                if (newBossHealth <= 0) {
                  const membersRef = collection(db, 'parties', currentData.currentPartyId, 'members');
                  const allMembersSnapshot = await getDocs(membersRef);
                  
                  console.log('Boss defeated!', currentBoss.name);
                  await handleBossDefeat(
                    transaction, 
                    partyRef, 
                    partyDoc, 
                    currentBoss, 
                    now,
                    allMembersSnapshot,
                    authUser.uid,
                    newMemberDamage,
                    newMemberStudyMinutes,
                    updateLastBossResults,
                    resetAllMembersBossDamage
                  );
                }
              } else {
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
          // New user
          newExp = expEarned;
          const { newLevel: calculatedNewLevel } = calculateLevelUp(0, newExp, 1);
          newLevel = calculatedNewLevel;
          
          transaction.set(userRef, {
            email: authUser.email,
            displayName: authUser.displayName || 'Anonymous',
            createdAt: now,
            lastActiveAt: now,
            lastStudyDate: now,
            exp: newExp,
            level: newLevel,
            coins: 0,
            stats: { totalReviews:0, weeklyReviews:0, currentStreak:0, longestStreak:0, totalDecks:0, totalCards:0 },
            health: PLAYER_CONFIG.BASE_HEALTH,      
            mana: PLAYER_CONFIG.BASE_MANA,
            'activeTimer.isActive': false
          });
        }

        // Update daily session
        if (dailyDoc.exists()) {
          const existingData = dailyDoc.data();
          transaction.update(dailySessionRef, {
            minutesStudied: (existingData.minutesStudied || 0) + minutesToSave,
            lastSessionAt: now,
            expEarned: (existingData.expEarned || 0) + expEarned
          });
        } else {
          transaction.set(dailySessionRef, {
            date: now,
            firstSessionAt: now,
            lastSessionAt: now,
            minutesStudied: minutesToSave,
            cardsReviewed: 0,
            expEarned: expEarned
          });
        }
      });

      // 🔥 Update local context state
      if (newBossHealth !== null) {
        updateBossHealth(newBossHealth);
      }
      if (newMemberDamage !== null) {
        updateMemberDamage(authUser.uid, newMemberDamage);
      }

      updateUserProfile({
        exp: newExp,
        level: newLevel,
        health: newHealth,
        mana: newMana,
        lastStudyDate: now,
        lastActiveAt: now
      });

      incrementMinutes(minutesToSave);
      incrementExp(expEarned);

      if (onTimeUpdate) onTimeUpdate(minutesToSave);
      
      console.log(`✅ Session saved: ${minutesToSave} minutes, ${expEarned} XP`);
    } catch (err) {
      console.error('Error saving study time:', err);
    }
  }, [authUser, db, isPro, hasActiveBooster, activeBooster, onTimeUpdate, updateBossHealth, updateMemberDamage, updateUserProfile, updateLastBossResults, resetAllMembersBossDamage, incrementMinutes, incrementExp]);

  const handleCompletion = useCallback(async () => {
    console.log('Timer completed!');
    
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    
    setIsRunning(false);
    
    // Play alarm sound
    if (audioRef.current) {
      audioRef.current.play().catch(err => console.log('Audio play failed:', err));
    }
    
    // 🔥 Calculate total time and save
    const totalElapsed = Date.now() - startTimeRef.current;
    const totalSeconds = Math.floor(totalElapsed / 1000);
    const cappedSeconds = Math.min(totalSeconds, selectedDuration * 60);
    const minutesToSave = Math.floor(cappedSeconds / 60);

    if (minutesToSave > 0) {
      await saveCompletedSession(minutesToSave);
      console.log(`✅ Saved ${minutesToSave} minutes`);
    }

    // Increment session count for ads
    const count = (parseInt(localStorage.getItem('sessionCount') || '0') + 1);
    localStorage.setItem('sessionCount', count.toString());

    setShowCompletion(true);
    handleTimerComplete?.();

    if (!isPro) {
      setTimeout(() => {
        showInterstitialAd();
      }, 3000);
    }
  }, [saveCompletedSession, selectedDuration, isPro, handleTimerComplete]);

  // Save logic (unchanged)
  const saveStudyTime = useCallback(async (secondsToSave, overrideDuration = null) => {
    if (!authUser || secondsToSave < 60 || isSavingRef.current) return;

    const MAX_MINUTES_PER_SAVE = 180; // 3 hours max
    const fullMinutes = Math.floor(secondsToSave / 60);
     // Calculate exp based on tier

    const baseExpPerMinute = PLAYER_CONFIG.EXP_PER_MINUTE; // Base for free users
    let expMultiplier = isPro ? 2 : 1;

    const activeBooster = currentUser?.activeBooster;
    const hasActiveBooster = activeBooster && activeBooster.endsAt > Date.now();
    if (hasActiveBooster) {
      // Additive stacking (Pro 2x + Booster 2x = 4x total)
      expMultiplier += (activeBooster.multiplier - 1);
      
      // Cap at 5x to prevent abuse
      expMultiplier = Math.min(expMultiplier, 5);
      console.log(`🔥 Booster active: ${activeBooster.multiplier}x (total: ${expMultiplier}x)`);
    }

    const expPerMinute = baseExpPerMinute * expMultiplier;
    const expEarned = fullMinutes * expPerMinute;
  
    // 🔥 CRITICAL: Add minimum validation too
    if (fullMinutes <= 0 || fullMinutes > MAX_MINUTES_PER_SAVE) {
      console.error('Invalid minutes to save:', fullMinutes, 'from seconds:', secondsToSave);
      return;
    }
    
    // 🔥 CRITICAL: Use overrideDuration if provided (for resume), otherwise use selectedDuration
    const durationToCheck = overrideDuration !== null ? overrideDuration : selectedDuration;

    // 🔥 CRITICAL: Additional sanity check
    if (fullMinutes > durationToCheck + 5) {
      console.error('⚠️ Attempted to save more minutes than timer duration!');
      console.error('Minutes:', fullMinutes, 'Duration:', durationToCheck);
      return;
    }


    isSavingRef.current = true;

    let newBossHealth = null;
    let newMemberDamage = null;
    let newExp, newLevel, newHealth, newMana;
    let now;

    try {
      now = new Date();
      const dateKey = now.toLocaleDateString('en-CA');

      const weekId = getWeekId(now);
      const monthId = getMonthId(now);


      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', authUser.uid);
        const dailySessionRef = doc(db, 'users', authUser.uid, 'dailySessions', dateKey);

        const userDoc = await transaction.get(userRef);
        const dailyDoc = await transaction.get(dailySessionRef);

        if (userDoc.exists()) {
          const currentData = userDoc.data();

          let partyDoc = null;
          let memberRef = null;
          let memberDoc = null;
          let partyRef = null;
          let allMembersSnapshot = null;
          
          if (currentData.currentPartyId) {
            partyRef = doc(db, 'parties', currentData.currentPartyId);
            partyDoc = await transaction.get(partyRef);
            
            memberRef = doc(db, 'parties', currentData.currentPartyId, 'members', authUser.uid);
            memberDoc = await transaction.get(memberRef);
            
            
          }

          const currentExp = currentData.exp || 0;
          const currentLevel = currentData.level || 1;
          const currentHealth = currentData.health || 0;
          const currentMana = currentData.mana || 0;

          newExp = currentExp + (fullMinutes * expPerMinute);
          newHealth = Math.min(
            PLAYER_CONFIG.BASE_HEALTH, 
            currentHealth + (fullMinutes * PLAYER_CONFIG.HEALTH_PER_MINUTE)
          );

          newMana = Math.min(
            PLAYER_CONFIG.BASE_MANA, 
            currentMana + (fullMinutes * PLAYER_CONFIG.MANA_PER_MINUTE)
          );

          const {newLevel: calculatedLevel, leveledUp, coinBonus} = calculateLevelUp(currentExp, newExp, currentLevel);
          newLevel = calculatedLevel;

          const baseDamage = fullMinutes * 10;
          const levelMultiplier = 1 + (newLevel * 0.05);
          const totalDamage = Math.floor(baseDamage * levelMultiplier);

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

          transaction.update(userRef, {
            'activeTimer.lastSavedAt': serverTimestamp()  
          });

          const weeklyLeaderboardRef = doc(
            db, 
            'leaderboards', 
            'weekly', 
            weekId, 
            authUser.uid
          );
          
          const monthlyLeaderboardRef = doc(
            db, 
            'leaderboards', 
            'monthly', 
            monthId, 
            authUser.uid
          );

         


          transaction.set(weeklyLeaderboardRef, {
            displayName: currentData.displayName || 'Anonymous',
            minutes: increment(fullMinutes),
            exp: increment(expEarned), // ← ADD THIS LINE
            avatar: currentData.avatar || 'warrior_01',
            level: newLevel || currentData.level || 1,
            isPro: currentData.subscription?.tier === 'pro' || false,
            updatedAt: serverTimestamp(),
            title: currentData.title || null,
            streak: currentData.stats?.currentStreak || 0
          }, { merge: true });
          
          transaction.set(monthlyLeaderboardRef, {
            displayName: currentData.displayName || 'Anonymous',
            minutes: increment(fullMinutes),
            exp: increment(expEarned), // ← ADD THIS LINE
            avatar: currentData.avatar || 'warrior_01',
            level: newLevel || currentData.level || 1,
            isPro: currentData.subscription?.tier === 'pro' || false,
            updatedAt: serverTimestamp(),
            title: currentData.title || null,
            streak: currentData.stats?.currentStreak || 0
          }, { merge: true });
          
          console.log(`📊 Updated leaderboards: +${fullMinutes} minutes, +${expEarned} exp`);

          if (currentData.currentPartyId && partyDoc && partyDoc.exists()) {
            const partyData = partyDoc.data();
            const currentBoss = partyData.currentBoss;
            
            if (currentBoss) {
              const isBossAlive = currentBoss.isAlive !== false && currentBoss.currentHealth > 0;
              
              const memberData = memberDoc?.exists() ? memberDoc.data() : null;
              newMemberDamage = (memberData?.currentBossDamage || 0) + totalDamage;
              const newMemberStudyMinutes = (memberData?.currentBossStudyMinutes || 0) + fullMinutes;
              
              if (isBossAlive) {
                newBossHealth = Math.max(0, currentBoss.currentHealth - totalDamage);
                
                transaction.update(partyRef, {
                  'currentBoss.currentHealth': newBossHealth,
                  'currentBoss.lastDamageAt': now,
                });

                if (memberDoc && memberDoc.exists()) {
                  transaction.update(memberRef, {
                    currentBossDamage: newMemberDamage,
                    currentBossStudyMinutes: newMemberStudyMinutes,
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
                    currentBossStudyMinutes: newMemberStudyMinutes,
                    lastDamageAt: now,
                    lastStudyAt: now,
                    exp: newExp,        
                    level: newLevel,    
                    health: newHealth,  
                    mana: newMana
                  });
                }

                if (newBossHealth <= 0) {
                  const membersRef = collection(db, 'parties', currentData.currentPartyId, 'members');
                  allMembersSnapshot = await getDocs(membersRef);
                  
                  console.log('Boss defeated!', currentBoss.name);
                  await handleBossDefeat(
                    transaction, 
                    partyRef, 
                    partyDoc, 
                    currentBoss, 
                    now,
                    allMembersSnapshot,
                    authUser.uid,
                    newMemberDamage,
                    newMemberStudyMinutes,
                    updateLastBossResults,
                    resetAllMembersBossDamage
                  );
                }
              } else {
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
          newExp = fullMinutes * PLAYER_CONFIG.EXP_PER_MINUTE;
          const { newLevel: calculatedNewLevel } = calculateLevelUp(0, newExp, 1);
          newLevel = calculatedNewLevel;
          
          transaction.set(userRef, {
            email: authUser.email,
            displayName: authUser.displayName || 'Anonymous',
            createdAt: now,
            lastActiveAt: now,
            lastStudyDate: now,
            exp: newExp,
            level: newLevel,
            coins: 0,
            stats: { totalReviews:0, weeklyReviews:0, currentStreak:0, longestStreak:0, totalDecks:0, totalCards:0 },
            health: PLAYER_CONFIG.BASE_HEALTH,      
            mana: PLAYER_CONFIG.BASE_MANA, 
          });
        }

        if (dailyDoc.exists()) {
          const existingData = dailyDoc.data();
          transaction.update(dailySessionRef, {
            minutesStudied: (existingData.minutesStudied || 0) + fullMinutes,
            lastSessionAt: now,
            expEarned: (existingData.expEarned || 0) + expEarned
          });
        } else {
          transaction.set(dailySessionRef, {
            date: now,
            firstSessionAt: now,
            lastSessionAt: now,
            minutesStudied: fullMinutes,
            cardsReviewed: 0,
            expEarned: expEarned

          });
        }
      });

      if (newBossHealth !== null) {
        updateBossHealth(newBossHealth);
      }
      if (newMemberDamage !== null) {
        updateMemberDamage(authUser.uid, newMemberDamage);
      }

      updateUserProfile({
        exp: newExp,
        level: newLevel,
        health: newHealth,
        mana: newMana,
        lastStudyDate: now,
        lastActiveAt: now
      });

      incrementMinutes(fullMinutes);
      incrementExp(expEarned);

      
      if (onTimeUpdate) onTimeUpdate(fullMinutes);
    } catch (err) {
      console.error('Error saving study time:', err);
    } finally {
      isSavingRef.current = false;
    }
  }, [authUser, db, selectedDuration, onTimeUpdate, updateBossHealth, updateMemberDamage, updateUserProfile, updateLastBossResults, resetAllMembersBossDamage, incrementMinutes]);

  

  const startTimer = async (skipStreakCheck = false) => {
    if (!authUser) return;
    
    correctSoundEffect.current.play().catch(err=>console.log(err));
    daggerWooshSFX.current.play().catch(err=>console.log(err));
   
    const now = Date.now();
    
    // First start only
    if (startTimeRef.current === null) {
      startTimeRef.current = now;
      
      // Handle streak check
      try {
        if (!skipStreakCheck) {
          const userRef = doc(db, 'users', authUser.uid);
          const userDoc = await getDoc(userRef);
          const userData = userDoc.data();
          const lastStudyDate = userData?.lastStudyDate?.toDate() || null;
          
          if (isStreakAtRisk(lastStudyDate)) {
            const hasFreeze = (userData?.stats?.freezesAvailable || 0) > 0;
            
            if (!hasFreeze && !isPro) {
              setStreakAtRisk(true);
              setShowStreakFreezePrompt(true);
              startTimeRef.current = null;
              return;
            }
          }
        }

        const streakResult = await updateUserAndPartyStreak(db, authUser.uid, partyProfile?.id);
        updateUserProfile({
          streak: streakResult.currentStreak || 1,
          longestStreak: streakResult.longestStreak || 1
        });
        
        if (streakResult.isNewStreak) {
          setShowStreakModal(true);
        }
      } catch (streakError) {
        console.error('Error updating streak:', streakError);
      }

      // 🔥 Save to database (OPTIMISTIC - don't wait)
      const userRef = doc(db, 'users', authUser.uid);
      updateDoc(userRef, {
        activeTimer: {
          startedAt: serverTimestamp(),
          duration: selectedDuration * 60,
          isActive: true
        }
      }).then(() => {
        console.log('✅ Timer saved to database');
      }).catch(err => {
        console.error('❌ Failed to save timer:', err);
        // Continue anyway - we'll save at completion
      });

      // 🔥 Save to localStorage as backup
      localStorage.setItem('timerBackup', JSON.stringify({
        startedAt: now,
        duration: selectedDuration * 60
      }));
    }
    
    setIsRunning(true);
    setIsSessionActive(true);
    setShowCompletion(false);
    handleTimerStart?.();

    // 🔥 Start the interval (SIMPLE - just update display)
    if (!sessionTimerRef.current) {
      sessionTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setTimeElapsed(elapsed);

        // Timer finished
        if (elapsed >= selectedDuration * 60) {
          handleCompletion();
        }
      }, 1000);
    }
  };

  useEffect(() => {
    if (timerStartRef) {
      timerStartRef.current = startTimer;
    }
  }, [startTimer, timerStartRef]);

  const pauseTimer = () => {
    setIsRunning(false);
    
    if (sessionTimerRef.current) { 
      clearInterval(sessionTimerRef.current); 
      sessionTimerRef.current = null; 
    }
    
    // Note: We DON'T save anything on pause
    // User can resume and continue from where they left off
  };

  const resetTimer = async () => {
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    
    setIsRunning(false);
    setIsSessionActive(false);
    setTimeElapsed(0);
    setShowCompletion(false);
    
    startTimeRef.current = null;
    hasResumedRef.current = false;

    // Clear from database
    if (authUser) {
      try {
        const userRef = doc(db, 'users', authUser.uid);
        await updateDoc(userRef, {
          'activeTimer.isActive': false
        });
      } catch (err) {
        console.error('Error clearing timer:', err);
      }
    }

    localStorage.removeItem('timerBackup');
  };

  const selectDuration = (duration) => {
    if (!isSessionActive) {
      setSelectedDuration(duration);
      setTimeElapsed(0);
      startTimeRef.current = null;
    }
  };



  const getCurrentRewards = () => durations.find(d => d.value === selectedDuration) || durations[1];

  const progress = Math.min((timeElapsed / (selectedDuration * 60)) * 100, 100);
  const timeLeft = Math.max(selectedDuration * 60 - timeElapsed, 0);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && startTimeRef.current && isRunning) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        
        if (elapsed >= selectedDuration * 60 && !showCompletion) {
          handleCompletion();
        } else {
          setTimeElapsed(elapsed);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isRunning, selectedDuration, handleCompletion, showCompletion]);

   // Add this useEffect to check for active timer when component mounts
   useEffect(() => {
    const checkForActiveTimer = async () => {
      if (!authUser || hasResumedRef.current) return;

      try {
        const userRef = doc(db, 'users', authUser.uid);
        const userDoc = await getDoc(userRef);
        const activeTimer = userDoc.data()?.activeTimer;

        if (activeTimer?.isActive && activeTimer.startedAt) {
          if (hasResumedRef.current) return;

          const startedAt = activeTimer.startedAt.toDate();
          const durationSeconds = activeTimer.duration;
          const now = Date.now();
          const elapsedSeconds = Math.floor((now - startedAt.getTime()) / 1000);

          // Validate elapsed time
          if (elapsedSeconds < -300) {
            console.warn('Clock skew detected, clearing timer');
            await updateDoc(userRef, { 'activeTimer.isActive': false });
            return;
          }

          const MAX_REASONABLE_ELAPSED = durationSeconds + (60 * 60);
          if (elapsedSeconds > MAX_REASONABLE_ELAPSED) {
            console.warn('Stale timer detected, clearing');
            await updateDoc(userRef, { 'activeTimer.isActive': false });
            return;
          }

          hasResumedRef.current = true;

          if (elapsedSeconds < durationSeconds) {
            // 🔥 Timer still running - RESUME IT
            console.log(`✅ Resuming timer: ${elapsedSeconds}s elapsed of ${durationSeconds}s`);
            
            startTimeRef.current = startedAt.getTime();
            setSelectedDuration(Math.ceil(durationSeconds / 60));
            setTimeElapsed(elapsedSeconds);
            setIsSessionActive(true);
            setIsRunning(true);

            // Start interval
            if (!sessionTimerRef.current) {
              sessionTimerRef.current = setInterval(() => {
                const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
                setTimeElapsed(elapsed);
                
                if (elapsed >= durationSeconds) {
                  handleCompletion();
                }
              }, 1000);
            }
          } else {
            // 🔥 Timer COMPLETED while app was closed
            console.log('✅ Timer completed while closed - awarding time');
            
            const minutesToSave = Math.floor(durationSeconds / 60);
            await saveCompletedSession(minutesToSave);

            setShowCompletion(true);
            setSelectedDuration(Math.ceil(durationSeconds / 60));
            setIsSessionActive(true);
            handleTimerComplete?.();
          }
        }
      } catch (error) {
        console.error('Error checking active timer:', error);
      }
    };

    checkForActiveTimer();
  }, [authUser, db, saveCompletedSession, handleCompletion, handleTimerComplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  // Render
  return (
    <>
      {showStreakModal && (
        <>
          <StreakModal 
            streak={(user?.uid ? partyMembers[user.uid]?.streak : null) || 1}
            onClose={setShowStreakModal}
            user={user}
          />
        </>
       
      )}
  
      {showStreakFreezePrompt && (
        <LimitReachedModal 
          limitType="streak"
          onClose={() => {
            setShowStreakFreezePrompt(false);
            startTimer(true);
            setShowStreakModal(true);
          }}
        />
      )}

      <div className="w-full h-full bg-slate-800 rounded-lg p-3 flex flex-col justify-between text-slate-100 relative">
        {!isSessionActive ? (
          <>
            <div className="flex-1 flex flex-col justify-center items-center space-y-4">
              {/* <p className="text-slate-400 text-sm text-center max-w-md">
                <span className='text-yellow-400'>Pro tip:</span> Come back after the timer ends to collect your rewards!
              </p> */}
              <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
                {durations.map(d => (
                  <button key={d.value} onClick={() => selectDuration(d.value)}
                    className={`p-3 rounded-lg font-medium ${selectedDuration===d.value?'bg-slate-600 text-slate-100 border border-2 border-slate-900/20':'bg-slate-900 text-slate-300 hover:bg-slate-700'}`}>
                    {d.label}
                  </button>
                ))}
              </div>

              <button 
                onClick={()=>startTimer()} 
                className={`${hasNotStartedATimerSession ? 'animate-pulse' : ''} w-full bg-red-600 hover:bg-red-500 text-white font-bold text-xl rounded-lg py-4 transition-all shadow-lg hover:shadow-xl`}
              >
                Start {selectedDuration} Min Session
              </button>
              
              <div className="mt-3 bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-3">
                <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-2 text-sm">
                  <span className="text-yellow-400 font-semibold whitespace-nowrap">+{getCurrentRewards().xp} XP</span>
                  <span className="text-red-400 font-semibold whitespace-nowrap">+{getCurrentRewards().health} HP</span>
                  <span className="text-blue-400 font-semibold whitespace-nowrap">+{getCurrentRewards().mana} MP</span>
                  <span className="text-orange-400 font-semibold whitespace-nowrap ">
                    {getCurrentRewards().damage} DMG
                  </span>
                </div>
                <p className="text-center text-slate-400 text-xs mt-2.5 leading-relaxed">
                  Return when timer ends to claim rewards
                </p>
                
                {/* NEW: Pro CTA */}
                {!isPro && (
                  <div className="mt-3 pt-3 border-t border-slate-700/50">
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <Trophy className="w-4 h-4 text-yellow-400" />
                      <span className="text-slate-300 text-xs">
                        <span className="text-purple-400 font-semibold">
                          <button 
                            onClick={()=>{navigate('/pricing')}}
                            className="text-purple-400 hover:text-purple-300 font-semibold underline decoration-dotted"
                          >
                            Pro Members
                          </button>{' '}</span> 
                          earn double XP
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            
          
          </>
        ) : showCompletion ? (
          <>
            {showCompletion && (
              <SessionCompleteScreen 
                selectedDuration={selectedDuration}
                rewards={getCurrentRewards()}
                onReset={resetTimer}
                userProfile={userProfile}
                userId={user?.uid}
              />
            )}
          </>
        ) : (
          <>
            {/* <div className="text-left">
              <h2 className="text-lg font-semibold mb-1">Session Active</h2>
              <p className="mb-2 text-slate-400 text-sm text-center max-w-md">
              <span className='text-yellow-400'>Pro tip:</span> Work for 15+ mins and something special might drop when you finish... 🎁
              </p>
            </div> */}

            <div className="flex-1 flex flex-col justify-center items-center">
              <div className="relative mb-6">
                <div className="w-48 h-48 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-5xl font-bold">{formatTime(timeLeft)}</div>
                    <div className="text-slate-400 text-sm mt-2">{Math.round(progress)}%</div>
                  </div>
                </div>
                <svg className="absolute inset-0 w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" stroke="transparent" strokeWidth="4" fill="none"/>
                  <circle cx="50" cy="50" r="46" stroke="#ef4444" strokeWidth="4" fill="none" strokeLinecap="round"
                    strokeDasharray={`${2*Math.PI*46}`} strokeDashoffset={`${2*Math.PI*46*(1-progress/100)}`}
                    className="transition-all duration-1000 ease-out"/>
                </svg>
              </div>

                 
              {isSessionActive && (hasActiveBooster || isPro) && (
                <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-purple-500 rounded-lg p-3 mb-3">
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-purple-400 animate-pulse" />
                      <span className="text-white font-semibold">
                        {hasActiveBooster && isPro ? (
                          // Both Pro + Booster
                          `${2 + (activeBooster.multiplier - 1)}x XP Active!`
                        ) : hasActiveBooster ? (
                          // Just Booster
                          `${activeBooster.multiplier}x XP Boost Active!`
                        ) : (
                          // Just Pro
                          `2x Pro XP Active!`
                        )}
                      </span>
                      {hasActiveBooster && (
                        <span className="text-slate-300 text-sm">
                          ({Math.floor((activeBooster.endsAt - Date.now()) / 60000)}m left)
                        </span>
                      )}
                    </div>
                    
                    {/* Breakdown for Pro + Booster */}
                    {hasActiveBooster && isPro && (
                      <span className="text-slate-400 text-xs">
                        (Pro 2x + Booster {activeBooster.multiplier}x)
                      </span>
                    )}
                  </div>
                </div>
              )}

                
              <SessionStatsCard 
                rewards={getCurrentRewards()}
                selectedDuration={selectedDuration}
                isPro={isPro}
                hasActiveBooster={hasActiveBooster}
                onProClick={() => {navigate('/pricing')}}
              />
            </div>

            <div className="flex space-x-3">
              <button onClick={isRunning ? pauseTimer : startTimer}
                className={`flex-1 font-medium py-3 rounded-lg ${isRunning?'bg-slate-700 text-slate-200':'bg-green-600 text-white hover:bg-green-500'}`}>
                {isRunning?'Pause':'Resume'}
              </button>
              <button onClick={resetTimer} className="flex-1 bg-slate-700 text-slate-200 hover:bg-slate-600 py-3 rounded-lg">Reset</button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default Timer;