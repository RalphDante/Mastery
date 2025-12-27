// TimerWithAutosave.jsx - REFACTORED
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { runTransaction, doc, increment, collection, getDocs, getDoc, updateDoc } from 'firebase/firestore';

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
  const {user} = useAuthContext();
  const {updateBossHealth, updateMemberDamage, updateLastBossResults, resetAllMembersBossDamage, updateUserProfile, partyProfile, partyMembers, refreshPartyProfile} = usePartyContext();
  const {incrementMinutes, incrementExp} = useUserDataContext();

  const {isTutorialAtStep, loading} = useTutorials();
  const hasNotStartedATimerSession = isTutorialAtStep('start-timer', 1);

  const [showStreakFreezePrompt, setShowStreakFreezePrompt] = useState(false);
  const [streakAtRisk, setStreakAtRisk] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);

  const [isResuming, setIsResuming] = useState(false);

  const userProfile = user?.uid ? partyMembers[user.uid] : null;

  const originalBossHealthRef = useRef(null);
  const originalMemberDamageRef = useRef(null);
  const lastSyncedMinuteRef = useRef(0);

  const navigate = useNavigate();
  
  // 🔥 SIMPLIFIED REFS - Only track start time!
  const startTimeRef = useRef(null);           // When timer started (timestamp)
  const sessionTimerRef = useRef(null);        // setInterval reference
  const hasResumedRef = useRef(false);         // Prevent duplicate resume
  const lastPauseTimeRef = useRef(null);
  const pausedTimeRef = useRef(null);

  const currentUser = userProfile;
  const isPro = currentUser?.subscription?.tier === "pro";

  const audioRef = useRef(null);
  const correctSoundEffect = useRef(null);
  const daggerWooshSFX = useRef(null);

  const activeBooster = currentUser?.activeBooster;
  const hasActiveBooster = activeBooster && activeBooster.endsAt > Date.now();

  const durations = [
    { label: '1 min', value: 1, damage: 10, xp: 10, mana: 3, health: 1 },
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
  const [isLoadingPartyData, setIsLoadingPartyData] = useState(false);

  // 🔥 NEW: Predicted stats for real-time UI updates
  const [predictedStats, setPredictedStats] = useState({
    exp: 0,
    health: 0,
    mana: 0,
    damage: 0,
    level: 0
  });

  useEffect(() => {
    if (!loading && isTutorialAtStep('start-timer', 1)) {
      setSelectedDuration(5);
    }
  }, [loading, isTutorialAtStep]);



  // Initialize alarm sound
  useEffect(()=>{
    correctSoundEffect.current = new Audio("https://cdn.freesound.org/previews/270/270304_5123851-lq.mp3");
    correctSoundEffect.current.volume = 0.4;

    daggerWooshSFX.current = new Audio('/sfx/mixkit-dagger-woosh-1487.wav');
    daggerWooshSFX.current.volume = 0.3;

    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.volume = 0.5;
  },[])

  // ============================================================================
  // 🔥 NEW: SINGLE SAVE FUNCTION - Only called on completion
  // ============================================================================
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


      if (onTimeUpdate) onTimeUpdate(minutesToSave);
      
      console.log(`✅ Session saved: ${minutesToSave} minutes, ${expEarned} XP`);
    } catch (err) {
      console.error('Error saving study time:', err);
    }
  }, [authUser, db, isPro, hasActiveBooster, activeBooster, onTimeUpdate, updateBossHealth, updateMemberDamage, updateUserProfile, updateLastBossResults, resetAllMembersBossDamage, incrementMinutes, incrementExp]);

  // ============================================================================
  // 🔥 SIMPLIFIED COMPLETION HANDLER
  // ============================================================================
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
    
    // 🔥 Calculate total time and save (accounting for paused time)
    const totalElapsed = Date.now() - startTimeRef.current - pausedTimeRef.current;
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
    localStorage.removeItem('timerBackup');

    // Reset predicted stats
    setPredictedStats({ exp: 0, health: 0, mana: 0, damage: 0, level: 0 });

    setShowCompletion(true);
    handleTimerComplete?.();

    if (!isPro) {
      setTimeout(() => {
        showInterstitialAd();
      }, 3000);
    }
  }, [saveCompletedSession, selectedDuration, isPro, handleTimerComplete]);

  // ============================================================================
  // 🔥 SIMPLIFIED START TIMER
  // ============================================================================
  const startTimer = async (skipStreakCheck = false) => {
    if (!authUser) return;
    
    correctSoundEffect.current.play().catch(err=>console.log(err));
    daggerWooshSFX.current.play().catch(err=>console.log(err));
   
    const now = Date.now();
    
    // First start only
    if (startTimeRef.current === null) {
      startTimeRef.current = now;
      pausedTimeRef.current = 0;
      lastPauseTimeRef.current = null;
      lastSyncedMinuteRef.current = 0;

      // 🔥 CAPTURE ORIGINAL BOSS HEALTH
      if (partyProfile?.currentBoss) {
        originalBossHealthRef.current = partyProfile.currentBoss.currentHealth;
        console.log('✅ Captured original boss health:', originalBossHealthRef.current);
      }

      // ✅ Capture original member damage (0 for new session)
      if (partyMembers?.[authUser.uid]) {
        originalMemberDamageRef.current = partyMembers[authUser.uid].currentBossDamage || 0;
        console.log('✅ Captured original member damage:', originalMemberDamageRef.current);
      } else {
        originalMemberDamageRef.current = 0;
      }
      
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
    } else if (lastPauseTimeRef.current !== null) {
      // 🔥 Resuming from pause - add paused time
      pausedTimeRef.current += now - lastPauseTimeRef.current;
      lastPauseTimeRef.current = null;
    }
    
    setIsRunning(true);
    setIsSessionActive(true);
    setShowCompletion(false);
    handleTimerStart?.();

    // 🔥 Start the interval (SIMPLE - just update display)
    if (!sessionTimerRef.current) {
      sessionTimerRef.current = setInterval(() => {
        const totalElapsed = Date.now() - startTimeRef.current - (pausedTimeRef.current || 0);
        const elapsedSeconds = Math.floor(totalElapsed / 1000);
        const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    
        setTimeElapsed(elapsedSeconds);
    
        // === PER-MINUTE OPTIMISTIC UI UPDATE (only when a new minute completes) ===
        if (elapsedMinutes > lastSyncedMinuteRef.current && userProfile) {
          const minutesDelta = elapsedMinutes - lastSyncedMinuteRef.current;
    
          // Calculate XP multiplier
          const baseExpPerMinute = PLAYER_CONFIG.EXP_PER_MINUTE;
          let expMultiplier = isPro ? 2 : 1;
          if (hasActiveBooster) {
            expMultiplier += (activeBooster.multiplier - 1);
            expMultiplier = Math.min(expMultiplier, 5);
          }
          const expPerMinute = baseExpPerMinute * expMultiplier;
          const expGained = minutesDelta * expPerMinute;
    
          // Optimistically update global charts/stats
          incrementMinutes(minutesDelta);
          incrementExp(expGained);
    
          // Calculate predicted stats for this session
          const totalMinutes = elapsedMinutes;
          const totalExpGain = totalMinutes * expPerMinute;
    
          const currentExp = userProfile.exp || 0;
          const currentLevel = userProfile.level || 1;
          const newTotalExp = currentExp + totalExpGain;
          const { newLevel } = calculateLevelUp(currentExp, newTotalExp, currentLevel);
    
          const baseDamage = totalMinutes * 10;
          const levelMultiplier = 1 + (newLevel * 0.05);
          const predictedDamage = Math.floor(baseDamage * levelMultiplier);
    
          const healthGain = Math.min(
            PLAYER_CONFIG.BASE_HEALTH - (userProfile.health || 0),
            totalMinutes * PLAYER_CONFIG.HEALTH_PER_MINUTE
          );
          const manaGain = Math.min(
            PLAYER_CONFIG.BASE_MANA - (userProfile.mana || 0),
            totalMinutes * PLAYER_CONFIG.MANA_PER_MINUTE
          );
    
          // Update predicted stats for SessionStatsCard
          setPredictedStats({
            exp: Math.floor(totalExpGain),
            health: healthGain,
            mana: manaGain,
            damage: predictedDamage,
            level: newLevel
          });

          updateUserProfile({
            exp: newTotalExp,
            level: newLevel,
            health: Math.min(PLAYER_CONFIG.BASE_HEALTH, (userProfile.health || 0) + healthGain),
            mana: Math.min(PLAYER_CONFIG.BASE_MANA, (userProfile.mana || 0) + manaGain)
          });
    
          // Update boss health and member damage optimistically
          if (originalBossHealthRef.current !== null) {
            const newBossHealth = Math.max(0, originalBossHealthRef.current - predictedDamage);
            updateBossHealth(newBossHealth);
    
            const totalMemberDamage = (originalMemberDamageRef.current || 0) + predictedDamage;
            updateMemberDamage(authUser.uid, totalMemberDamage);
          }
    
          lastSyncedMinuteRef.current = elapsedMinutes;
    
          console.log(`Live update: +${minutesDelta} min, +${expGained} XP`);
        }
    
        // Timer complete?
        if (elapsedSeconds >= selectedDuration * 60) {
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

  // ============================================================================
  // 🔥 PAUSE/RESET - Now with proper pause tracking
  // ============================================================================
  const pauseTimer = () => {
    setIsRunning(false);
    lastPauseTimeRef.current = Date.now(); // Record when we paused
    
    if (sessionTimerRef.current) { 
      clearInterval(sessionTimerRef.current); 
      sessionTimerRef.current = null; 
    }
  };

  const resetTimer = async () => {
    // 🔥 SAVE elapsed time before resetting
    if (startTimeRef.current !== null && timeElapsed > 0) {
      const minutesElapsed = Math.floor(timeElapsed / 60);
      
      if (minutesElapsed > 0) {
        console.log(`⚠️ Timer reset with ${minutesElapsed} minutes elapsed - saving...`);
        await saveCompletedSession(minutesElapsed);
        console.log(`✅ Saved ${minutesElapsed} minutes from reset timer`);
      }
    }
    
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
    pausedTimeRef.current = 0;
    lastPauseTimeRef.current = null;
    originalBossHealthRef.current = null;
    originalMemberDamageRef.current = null;
    lastSyncedMinuteRef.current = 0;
    setPredictedStats({ exp: 0, health: 0, mana: 0, damage: 0, level: 0 });
  
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
      pausedTimeRef.current = 0;
      lastPauseTimeRef.current = null;
      setPredictedStats({ exp: 0, health: 0, mana: 0, damage: 0, level: 0 });
    }
  };

  // ============================================================================
// 🔥 SIMPLIFIED RESUME LOGIC
// ============================================================================
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
          console.log(`✅ Resuming timer: ${elapsedSeconds}s elapsed of ${durationSeconds}s`);

          setIsResuming(true);
          setIsLoadingPartyData(true);
          
          startTimeRef.current = startedAt.getTime();
          pausedTimeRef.current = 0;
          lastPauseTimeRef.current = null;
          setSelectedDuration(Math.ceil(durationSeconds / 60));
          setTimeElapsed(elapsedSeconds);
          setIsSessionActive(true);
          setIsRunning(true);

          // ✅ Calculate elapsed minutes and update context
          const minutesElapsed = Math.floor(elapsedSeconds / 60);
          
          // 🔥 Calculate exp for elapsed minutes and increment context
          const baseExpPerMinute = PLAYER_CONFIG.EXP_PER_MINUTE;
          let expMultiplier = isPro ? 2 : 1;
          if (hasActiveBooster) {
            expMultiplier += (activeBooster.multiplier - 1);
            expMultiplier = Math.min(expMultiplier, 5);
          }
          const expPerMinute = baseExpPerMinute * expMultiplier;
          const totalExpEarned = minutesElapsed * expPerMinute;
          
          // Update context with elapsed time
          if (minutesElapsed > 0) {
            incrementMinutes(minutesElapsed);
            incrementExp(totalExpEarned);
            console.log(`📊 Resumed session: +${minutesElapsed} min, +${totalExpEarned} XP added to context`);
          }
          
          // Set lastSyncedMinute to the current elapsed minutes
          lastSyncedMinuteRef.current = minutesElapsed;
          console.log(`✅ Set last synced minute to: ${minutesElapsed}`);

          // 🔥 ADD THIS - Calculate predicted stats for resumed session
          if (minutesElapsed > 0 && userDoc.exists()) {
            const userData = userDoc.data();  // ← THIS IS REQUIRED

            const baseExpPerMinute = PLAYER_CONFIG.EXP_PER_MINUTE;
            let expMultiplier = isPro ? 2 : 1;
            if (hasActiveBooster) {
              expMultiplier += (activeBooster.multiplier - 1);
              expMultiplier = Math.min(expMultiplier, 5);
            }
            const expPerMinute = baseExpPerMinute * expMultiplier;
            const totalExpGain = minutesElapsed * expPerMinute;

            const currentExp = userData?.exp || 0;
            const currentLevel = userData?.level || 1;
            const newTotalExp = currentExp + totalExpGain;
            const { newLevel } = calculateLevelUp(currentExp, newTotalExp, currentLevel);

            const baseDamage = minutesElapsed * 10;
            const levelMultiplier = 1 + (newLevel * 0.05);
            const predictedDamage = Math.floor(baseDamage * levelMultiplier);

            const healthGain = Math.min(
              PLAYER_CONFIG.BASE_HEALTH - (userProfile.health || 0),
              minutesElapsed * PLAYER_CONFIG.HEALTH_PER_MINUTE
            );
            const manaGain = Math.min(
              PLAYER_CONFIG.BASE_MANA - (userProfile.mana || 0),
              minutesElapsed * PLAYER_CONFIG.MANA_PER_MINUTE
            );

            // Update predicted stats for display
            setPredictedStats({
              exp: Math.floor(totalExpGain),
              health: healthGain,
              mana: manaGain,
              damage: predictedDamage,
              level: newLevel
            });

            // Update userProfile context for UI
            updateUserProfile({
              exp: newTotalExp,
              level: newLevel,
              health: Math.min(PLAYER_CONFIG.BASE_HEALTH, (userProfile.health || 0) + healthGain),
              mana: Math.min(PLAYER_CONFIG.BASE_MANA, (userProfile.mana || 0) + manaGain)
            });

            console.log(`✅ Resumed with predicted stats: ${totalExpGain} XP, ${predictedDamage} DMG`);
          }

          // ✅ WAIT for party profile to load fresh boss data
          if (userProfile?.currentPartyId && refreshPartyProfile) {
            await refreshPartyProfile();
            console.log('✅ Party data refreshed');
          }

          // 🔥 NOW capture the FRESH boss health AND member damage after refresh
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // ✅ Get fresh party data directly from database
          if (userProfile?.currentPartyId) {
            const partyRef = doc(db, 'parties', userProfile.currentPartyId);
            const freshPartyDoc = await getDoc(partyRef);
            if (freshPartyDoc.exists()) {
              const freshBossHealth = freshPartyDoc.data()?.currentBoss?.currentHealth;
              originalBossHealthRef.current = freshBossHealth;
              console.log('✅ Captured FRESH boss health:', freshBossHealth);
            }

            // ✅ Get fresh member damage from database
            const memberRef = doc(db, 'parties', userProfile.currentPartyId, 'members', authUser.uid);
            const freshMemberDoc = await getDoc(memberRef);
            if (freshMemberDoc.exists()) {
              const freshMemberDamage = freshMemberDoc.data()?.currentBossDamage || 0;
              originalMemberDamageRef.current = freshMemberDamage;
              console.log('✅ Captured FRESH member damage:', freshMemberDamage);
            } else {
              originalMemberDamageRef.current = 0;
            }
          }

          // Start interval
          if (!sessionTimerRef.current) {
            sessionTimerRef.current = setInterval(() => {
              const totalElapsed = Date.now() - startTimeRef.current - (pausedTimeRef.current || 0);
              const elapsed = Math.floor(totalElapsed / 1000);
              setTimeElapsed(elapsed);
              
              // Timer complete?
              if (elapsed >= durationSeconds) {
                handleCompletion();
              }
            }, 1000);
          }

          // ✅ Allow boss updates after data is loaded
          setTimeout(() => {
            setIsResuming(false);
            setIsLoadingPartyData(false);
            console.log('✅ Boss updates re-enabled');
          }, 500);

        }  else {
          // 🔥 Timer COMPLETED - Save with localStorage backup
          console.log('✅ Timer completed while closed - awarding time');
          
          const minutesToSave = Math.floor(durationSeconds / 60);
          
          // 🔥 NEW: Check if we already saved this session
          const savedSessionKey = `completed_${authUser.uid}_${startedAt.getTime()}`;
          const alreadySaved = localStorage.getItem(savedSessionKey);
          
          if (alreadySaved) {
            console.log('⚠️ Session already saved, skipping duplicate save');
            await updateDoc(userRef, { 'activeTimer.isActive': false });
          } else {
            // 🔥 Mark as "being saved" BEFORE the save
            localStorage.setItem(savedSessionKey, 'saving');
            
            try {
              await saveCompletedSession(minutesToSave);
              
              // 🔥 Mark as "saved" AFTER successful save
              localStorage.setItem(savedSessionKey, 'saved');
              console.log('✅ Session saved successfully');
              
              // 🔥 Clean up old saved session markers (keep last 5)
              const allKeys = Object.keys(localStorage);
              const sessionKeys = allKeys
                .filter(k => k.startsWith(`completed_${authUser.uid}_`))
                .sort()
                .reverse();
              
              sessionKeys.slice(5).forEach(k => localStorage.removeItem(k));
            } catch (err) {
              console.error('❌ Failed to save session:', err);
              // Don't remove the marker - retry next reload
            }
          }

          setShowCompletion(true);
          setSelectedDuration(Math.ceil(durationSeconds / 60));
          setIsSessionActive(true);
          handleTimerComplete?.();
        }
      }
    } catch (error) {
      console.error('Error checking active timer:', error);
      setIsResuming(false);
      setIsLoadingPartyData(false);
    }
  };

  checkForActiveTimer();
}, [authUser, db, saveCompletedSession, handleCompletion, handleTimerComplete, userProfile?.currentPartyId, refreshPartyProfile, isPro, hasActiveBooster, activeBooster, incrementMinutes, incrementExp]);
  // ============================================================================
  // 🔥 VISIBILITY CHANGE HANDLER
  // ============================================================================
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && startTimeRef.current && isRunning) {
        const totalElapsed = Date.now() - startTimeRef.current - pausedTimeRef.current;
        const elapsed = Math.floor(totalElapsed / 1000);
        
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

  const getCurrentRewards = () => durations.find(d => d.value === selectedDuration) || durations[1];
  const progress = Math.min((timeElapsed / (selectedDuration * 60)) * 100, 100);
  const timeLeft = Math.max(selectedDuration * 60 - timeElapsed, 0);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
  };

  // Render
  return (
    <>
      {showStreakModal && (
        <StreakModal 
          streak={(user?.uid ? partyMembers[user.uid]?.streak : null) || 1}
          onClose={setShowStreakModal}
          user={user}
        />
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
                  <span className="text-orange-400 font-semibold whitespace-nowrap">
                    {getCurrentRewards().damage} DMG
                  </span>
                </div>
                <p className="text-center text-slate-400 text-xs mt-2.5 leading-relaxed">
                  Return when timer ends to claim rewards
                </p>
                
                {!isPro && (
                  <div className="mt-3 pt-3 border-t border-slate-700/50">
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <Trophy className="w-4 h-4 text-yellow-400" />
                      <span className="text-slate-300 text-xs">
                        <button 
                          onClick={()=>{navigate('/pricing')}}
                          className="text-purple-400 hover:text-purple-300 font-semibold underline decoration-dotted"
                        >
                          Pro Members
                        </button>{' '}earn double XP
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : showCompletion ? (
          <SessionCompleteScreen 
            selectedDuration={selectedDuration}
            rewards={getCurrentRewards()}
            onReset={resetTimer}
            userProfile={userProfile}
            userId={user?.uid}
          />
        ) : (
          <>
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
                          `${2 + (activeBooster.multiplier - 1)}x XP Active!`
                        ) : hasActiveBooster ? (
                          `${activeBooster.multiplier}x XP Boost Active!`
                        ) : (
                          `2x Pro XP Active!`
                        )}
                      </span>
                      {hasActiveBooster && (
                        <span className="text-slate-300 text-sm">
                          ({Math.floor((activeBooster.endsAt - Date.now()) / 60000)}m left)
                        </span>
                      )}
                    </div>
                    
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
                predictedStats={predictedStats}
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