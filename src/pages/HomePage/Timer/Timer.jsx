// TimerWithAutosave.jsx - REFACTORED
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { runTransaction, doc, increment, collection, getDocs, getDoc, updateDoc } from 'firebase/firestore';

import { calculateLevelUp, PLAYER_CONFIG } from '../../../utils/playerStatsUtils';
import { serverTimestamp } from 'firebase/firestore';
import { handleBossDefeat } from '../../../utils/bossUtils';

import { usePartyContext } from '../../../contexts/PartyContext';
import { useUserDataContext } from '../../../contexts/UserDataContext';
import { getLocalDateKey, isStreakAtRisk, updateUserAndPartyStreak } from '../../../utils/streakUtils';
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
  const {user, userProfile:authUserProfile} = useAuthContext();
  const {updateBossHealth, updateMemberDamage, updateLastBossResults, resetAllMembersBossDamage, updateUserProfile, partyProfile, partyMembers, refreshPartyProfile} = usePartyContext();
  const {refreshTodaySession, todaySession, setTodaySession} = useUserDataContext();

  const {isTutorialAtStep, loading} = useTutorials();
  const hasNotStartedATimerSession = isTutorialAtStep('start-timer', 1);

  const [showStreakFreezePrompt, setShowStreakFreezePrompt] = useState(false);
  const [streakAtRisk, setStreakAtRisk] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);

  const [selectedDuration, setSelectedDuration] = useState(25);
  const [isRunning, setIsRunning] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const [isLoadingPartyData, setIsLoadingPartyData] = useState(false);

  const [isResuming, setIsResuming] = useState(false);

  const memberProfile = user?.uid ? partyMembers[user.uid] : null;
  const currentPartyId = authUserProfile?.currentPartyId;

  const originalBossHealthRef = useRef(null);
  const originalMemberDamageRef = useRef(null);
  const lastSyncedMinuteRef = useRef(0);
  const lastIncrementedMinuteRef = useRef(0);
  const partyMembersRef = useRef(partyMembers);

  const navigate = useNavigate();
  
  // 🔥 SIMPLIFIED REFS - Only track start time!
  const startTimeRef = useRef(null);           // When timer started (timestamp)
  const sessionTimerRef = useRef(null);        // setInterval reference
  const hasResumedRef = useRef(false);         // Prevent duplicate resume
  const lastPauseTimeRef = useRef(null);
  const pausedTimeRef = useRef(null);
  const resumeInProgress = useRef(false);
  const handleCompletionRef = useRef(null);
  const selectedDurationRef = useRef(selectedDuration);

  const sessionStartTodayMinutesRef = useRef(0);
  const sessionStartTodayExpRef = useRef(0);
  const sessionStartTodayCardsRef = useRef(0);



  const sessionStartExpRef = useRef(0);
  const sessionStartHealthRef = useRef(0);
  const sessionStartManaRef = useRef(0);
  const sessionStartLevelRef = useRef(1);
  const activeUserProfileRef = useRef(null);

  const currentUser = memberProfile;
  const isPro = authUserProfile?.subscription?.tier === "pro";

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

 

  // 🔥 NEW: Predicted stats for real-time UI updates
  const [predictedStats, setPredictedStats] = useState({
    exp: 0,
    health: 0,
    mana: 0,
    damage: 0,
    level: 0
  });

 

  useEffect(() => {
    partyMembersRef.current = partyMembers;
  }, [partyMembers]);

  useEffect(() => {
    selectedDurationRef.current = selectedDuration;
  }, [selectedDuration]);


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
      console.log(`Booster active: ${activeBooster.multiplier}x (total: ${expMultiplier}x)`);
    }

    const expPerMinute = baseExpPerMinute * expMultiplier;
    const expEarned = minutesToSave * expPerMinute;

    let newBossHealth = null;
    let newMemberDamage = null;
    let newExp, newLevel, newHealth, newMana;
    let now;

    try {
      now = new Date();
      const dateKey = getLocalDateKey(now);
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

      await refreshPartyProfile();
      console.log("Refreshed party profile");

      await refreshTodaySession();
      console.log("Refreshed today session");

      if (onTimeUpdate) onTimeUpdate(minutesToSave);
      
      console.log(`Session saved: ${minutesToSave} minutes, ${expEarned} XP`);
    } catch (err) {
      console.error('Error saving study time:', err);
    }
  }, [authUser, db, isPro, hasActiveBooster, activeBooster, onTimeUpdate, updateBossHealth, updateMemberDamage, updateUserProfile, updateLastBossResults, resetAllMembersBossDamage,
    refreshPartyProfile, refreshTodaySession]);


  const saveCompletedSessionRef = useRef(saveCompletedSession);
  const handleTimerCompleteRef = useRef(handleTimerComplete);

  useEffect(() => {
    saveCompletedSessionRef.current = saveCompletedSession;
    handleTimerCompleteRef.current = handleTimerComplete;
  }, [saveCompletedSession, handleTimerComplete]);

  // ============================================================================
  // 🔥 SIMPLIFIED COMPLETION HANDLER
  // ============================================================================
  const handleCompletion = useCallback(async () => {
    console.log('Timer completed!');

    // ✅ FIX: Check if we already saved this session
    if (startTimeRef.current) {
      const savedSessionKey = `completed_${authUser.uid}_${startTimeRef.current}`;
      const alreadySaved = localStorage.getItem(savedSessionKey);
      
      if (alreadySaved === 'saved' || alreadySaved === 'saving') {
        console.log('Session already saved in resume, skipping duplicate');
        
        // Just show completion screen
        setShowCompletion(true);
        setIsRunning(false);
        if (sessionTimerRef.current) {
          clearInterval(sessionTimerRef.current);
          sessionTimerRef.current = null;
        }
        return;
      }
    }
    
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
    const totalElapsed = Date.now() - startTimeRef.current - (pausedTimeRef.current || 0);
    const totalSeconds = Math.floor(totalElapsed / 1000);
    const cappedSeconds = Math.min(totalSeconds, selectedDuration * 60);
    const minutesToSave = Math.floor(cappedSeconds / 60);
    await  handleTimerComplete?.();
    if (minutesToSave > 0) {

      await saveCompletedSession(minutesToSave);
      console.log(`Saved ${minutesToSave} minutes`);
    }

    // Increment session count for ads
    const count = (parseInt(localStorage.getItem('sessionCount') || '0') + 1);
    localStorage.setItem('sessionCount', count.toString());
    localStorage.removeItem('timerBackup');

    // Reset predicted stats
    setPredictedStats({ exp: 0, health: 0, mana: 0, damage: 0, level: 0 });

    setShowCompletion(true);
  

    if (!isPro) {
      setTimeout(() => {
        showInterstitialAd();
      }, 3000);
    }
  }, [saveCompletedSession, selectedDuration, isPro, handleTimerComplete]);

  useEffect(() => {
    handleCompletionRef.current = handleCompletion;
  }, [handleCompletion]);

  // ============================================================================
  // 🔥 SIMPLIFIED START TIMER
  // ============================================================================
  const startTimer = useCallback(async (
    skipStreakCheck = false, 
    isResuming = false, 
    resumeFromMinutes = 0, 
    freshBossHealth = null, // ← NEW
    freshMemberDamage = null,
    resumeStartTime = null,
    freshMemberProfile = null
    ) => {
    if (!authUser) return;
    if (!isResuming) {
      lastIncrementedMinuteRef.current = 0;
    }
     // 🔥 SAFETY: Clear any existing interval before starting
    if (sessionTimerRef.current) {
      console.warn('⚠️ Clearing existing interval before starting new timer');
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }

   
  
    const now = Date.now();
    
    // First start only
    if (!isResuming && startTimeRef.current === null) {
      correctSoundEffect.current.play().catch(err=>console.log(err));
      daggerWooshSFX.current.play().catch(err=>console.log(err));

      startTimeRef.current = now;
      pausedTimeRef.current = 0;
      lastPauseTimeRef.current = null;
      lastSyncedMinuteRef.current = 0;

      sessionStartTodayMinutesRef.current = todaySession.minutesStudied || 0;
      sessionStartTodayExpRef.current = todaySession.expEarned || 0;
      sessionStartTodayCardsRef.current = todaySession.cardsReviewed || 0;
      
      console.log('Captured today session start:', {
        minutes: sessionStartTodayMinutesRef.current,
        exp: sessionStartTodayExpRef.current,
        cards: sessionStartTodayCardsRef.current
      });

      // 🔥 CAPTURE ORIGINAL BOSS HEALTH
      if (partyProfile?.currentBoss) {
        originalBossHealthRef.current = partyProfile.currentBoss.currentHealth;
        console.log('Captured original boss health:', originalBossHealthRef.current);
      }

      if (partyMembers?.[authUser.uid]) {
        activeUserProfileRef.current = partyMembers[authUser.uid]; // ✅ Set it here
        sessionStartExpRef.current = partyMembers[authUser.uid].exp || 0;
        sessionStartHealthRef.current = partyMembers[authUser.uid].health || 0;
        sessionStartManaRef.current = partyMembers[authUser.uid].mana || 0;
        sessionStartLevelRef.current = partyMembers[authUser.uid].level || 1;
        console.log('Captured session start stats:', {
          exp: sessionStartExpRef.current,
          health: sessionStartHealthRef.current,
          mana: sessionStartManaRef.current,
          level: sessionStartLevelRef.current
        });
      }

      // ✅ Capture original member damage (0 for new session)
      if (partyMembers?.[authUser.uid]) {
        originalMemberDamageRef.current = partyMembers[authUser.uid].currentBossDamage || 0;
        console.log('Captured original member damage:', originalMemberDamageRef.current);
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
        console.log('Timer saved to database');
      }).catch(err => {
        console.error('Failed to save timer:', err);
      });

      // 🔥 Save to localStorage as backup
      localStorage.setItem('timerBackup', JSON.stringify({
        startedAt: now,
        duration: selectedDuration * 60
      }));
    } else if (isResuming && resumeStartTime !== null) {  // ← ADD THIS
      startTimeRef.current = resumeStartTime;
      pausedTimeRef.current = 0;
      lastPauseTimeRef.current = null;
      activeUserProfileRef.current = freshMemberProfile; // ✅ Set it here for resume
     } else if (lastPauseTimeRef.current !== null) {
      // 🔥 Resuming from pause - add paused time
      pausedTimeRef.current += now - lastPauseTimeRef.current;
      lastPauseTimeRef.current = null;
    }

    // 🔥 APPLY OPTIMISTIC UPDATES FOR ELAPSED MINUTES
    if (resumeFromMinutes > 0) {
      console.log(`Applying optimistic updates for ${resumeFromMinutes} elapsed minutes`);
      const bossHealthToUse = freshBossHealth ?? originalBossHealthRef.current;
      const memberDamageToUse = freshMemberDamage ?? originalMemberDamageRef.current;
      
      const currentUserProfile = activeUserProfileRef.current ?? (user?.uid ? partyMembersRef.current[user.uid] : null);
      
      if (currentUserProfile) {
        // Calculate XP multiplier
        const baseExpPerMinute = PLAYER_CONFIG.EXP_PER_MINUTE;
        let expMultiplier = isPro ? 2 : 1;
        if (hasActiveBooster) {
          expMultiplier += (activeBooster.multiplier - 1);
          expMultiplier = Math.min(expMultiplier, 5);
        }
        const expPerMinute = baseExpPerMinute * expMultiplier;
        const totalExpGain = resumeFromMinutes * expPerMinute;
        
        setTodaySession(prev => ({
          ...prev,
          minutesStudied: sessionStartTodayMinutesRef.current + resumeFromMinutes,
          expEarned: sessionStartTodayExpRef.current + totalExpGain
        }));
        
        // Calculate predicted stats
        const currentExp = currentUserProfile.exp || 0;
        const currentLevel = currentUserProfile.level || 1;
        const currentHealth = currentUserProfile.health || 0;
        const currentMana = currentUserProfile.mana || 0;
        
        const newTotalExp = currentExp + totalExpGain;
        const { newLevel } = calculateLevelUp(currentExp, newTotalExp, currentLevel);
        
        const baseDamage = resumeFromMinutes * 10;
        const levelMultiplier = 1 + (newLevel * 0.05);
        const predictedDamage = Math.floor(baseDamage * levelMultiplier);
        
        const healthGain = Math.min(
          PLAYER_CONFIG.BASE_HEALTH - currentHealth,
          resumeFromMinutes * PLAYER_CONFIG.HEALTH_PER_MINUTE
        );
        const manaGain = Math.min(
          PLAYER_CONFIG.BASE_MANA - currentMana,
          resumeFromMinutes * PLAYER_CONFIG.MANA_PER_MINUTE
        );
        
        // Update predicted stats for SessionStatsCard
        setPredictedStats({
          exp: Math.floor(totalExpGain),
          health: healthGain,
          mana: manaGain,
          damage: predictedDamage,
          level: newLevel
        });

        // Update user profile optimistically
        updateUserProfile({
          exp: newTotalExp,
          level: newLevel,
          health: Math.min(PLAYER_CONFIG.BASE_HEALTH, currentHealth + healthGain),
          mana: Math.min(PLAYER_CONFIG.BASE_MANA, currentMana + manaGain)
        });
        
        // Update boss health and member damage optimistically
        if (originalBossHealthRef.current !== null) {
          const newBossHealth = Math.max(0, bossHealthToUse - predictedDamage);
          updateBossHealth(newBossHealth);
          
          const totalMemberDamage = (memberDamageToUse || 0) + predictedDamage;
          updateMemberDamage(authUser.uid, totalMemberDamage);
        } else {
          console.log("OriginalBossHealthRef.current is null")
        }
        
        lastSyncedMinuteRef.current = resumeFromMinutes;
        console.log(`Optimistic updates applied: ${totalExpGain} XP, ${predictedDamage} DMG`);
      } else {
        console.warn('No userProfile found for optimistic updates');
      }
    }
    
    setIsRunning(true);
    setIsSessionActive(true);
    setShowCompletion(false);

    // 🔥 Start the interval (SIMPLE - just update display)
    if (!sessionTimerRef.current) {
      sessionTimerRef.current = setInterval(() => {
        const totalElapsed = Date.now() - startTimeRef.current - (pausedTimeRef.current || 0);
        const elapsedSeconds = Math.floor(totalElapsed / 1000);
        const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    
        setTimeElapsed(elapsedSeconds);
    
        if (elapsedMinutes > lastSyncedMinuteRef.current) {
          console.log(`Minute ${elapsedMinutes} hit - calculating stats`);
          
          const currentUserProfile = user?.uid ? partyMembersRef.current[user.uid] : null;
          
          if (currentUserProfile) {
            // Calculate XP multiplier
            const baseExpPerMinute = PLAYER_CONFIG.EXP_PER_MINUTE;
            let expMultiplier = isPro ? 2 : 1;
            if (hasActiveBooster) {
              expMultiplier += (activeBooster.multiplier - 1);
              expMultiplier = Math.min(expMultiplier, 5);
            }
            const expPerMinute = baseExpPerMinute * expMultiplier;
            
            // Calculate total session gains
            const totalExpGain = elapsedMinutes * expPerMinute;
            
            // 🔥 UPDATE TODAY'S SESSION (CALCULATED, NOT INCREMENTED)
            setTodaySession(prev => ({
              ...prev,
              minutesStudied: sessionStartTodayMinutesRef.current + elapsedMinutes,
              expEarned: sessionStartTodayExpRef.current + totalExpGain
            }));
            
            // Calculate predicted stats
            const currentExp = sessionStartExpRef.current;
            const currentLevel = sessionStartLevelRef.current;
            const currentHealth = sessionStartHealthRef.current;
            const currentMana = sessionStartManaRef.current;
    
            const newTotalExp = currentExp + totalExpGain;
            const { newLevel } = calculateLevelUp(currentExp, newTotalExp, currentLevel);
            
            const baseDamage = elapsedMinutes * 10;
            const levelMultiplier = 1 + (newLevel * 0.05);
            const predictedDamage = Math.floor(baseDamage * levelMultiplier);
            
            const healthGain = Math.min(
              PLAYER_CONFIG.BASE_HEALTH - currentHealth,
              elapsedMinutes * PLAYER_CONFIG.HEALTH_PER_MINUTE
            );
            const manaGain = Math.min(
              PLAYER_CONFIG.BASE_MANA - currentMana,
              elapsedMinutes * PLAYER_CONFIG.MANA_PER_MINUTE
            );
            
            // Update predicted stats for SessionStatsCard
            setPredictedStats({
              exp: Math.floor(totalExpGain),
              health: healthGain,
              mana: manaGain,
              damage: predictedDamage,
              level: newLevel
            });
    
            // Update user profile optimistically
            updateUserProfile({
              exp: newTotalExp,
              level: newLevel,
              health: Math.min(PLAYER_CONFIG.BASE_HEALTH, currentHealth + healthGain),
              mana: Math.min(PLAYER_CONFIG.BASE_MANA, currentMana + manaGain)
            });
            
            // Update boss health and member damage optimistically
            if (originalBossHealthRef.current !== null) {
              const newBossHealth = Math.max(0, originalBossHealthRef.current - predictedDamage);
              updateBossHealth(newBossHealth);
              
              const totalMemberDamage = (originalMemberDamageRef.current || 0) + predictedDamage;
              updateMemberDamage(authUser.uid, totalMemberDamage);
            }
            
            lastSyncedMinuteRef.current = elapsedMinutes;
            console.log(`Stats calculated for minute ${elapsedMinutes}`);
          }
        }
    
        // Timer complete?
        if (elapsedSeconds >= selectedDurationRef.current * 60) {
          console.log('Timer completion condition met!');
          handleCompletionRef.current?.()
        }
      }, 1000);
    }
  },[
    authUser, 
    isPro, 
    hasActiveBooster, 
    activeBooster, 
    selectedDuration,
    partyProfile?.id,
    partyProfile?.currentBoss,
    partyMembers,
    user?.uid,
    db,
    updateUserAndPartyStreak,
    updateUserProfile,
    handleTimerStart,
    updateBossHealth,
    updateMemberDamage,
    setTodaySession
  ]);

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
    // ✅ FIX: Don't save if completion screen is showing (already saved)
  if (showCompletion) {
    console.log('Completion screen showing, skipping save');
    
    // Just clear state without saving
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    
    setIsRunning(false);
    setIsSessionActive(false);
    setTimeElapsed(0);
    setShowCompletion(false);
    setSelectedDuration(25);
    
    startTimeRef.current = null;
    hasResumedRef.current = false;
    pausedTimeRef.current = 0;
    lastIncrementedMinuteRef.current = 0;
    lastPauseTimeRef.current = null;
    originalBossHealthRef.current = null;
    originalMemberDamageRef.current = null;
    lastSyncedMinuteRef.current = 0;
    sessionStartTodayMinutesRef.current = 0;
    sessionStartTodayExpRef.current = 0;
    sessionStartTodayCardsRef.current = 0;
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
    return; // ← Exit early!
  }
  
  // 🔥 Original save logic (only runs if NOT on completion screen)
  if (startTimeRef.current !== null && timeElapsed > 0) {
    const minutesElapsed = Math.floor(timeElapsed / 60);
    
    if (minutesElapsed > 0) {
      console.log(`Timer reset with ${minutesElapsed} minutes elapsed - saving...`);
      await saveCompletedSession(minutesElapsed);
      console.log(`Saved ${minutesElapsed} minutes from reset timer`);
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
      lastIncrementedMinuteRef.current = 0;
      setSelectedDuration(duration);
      setTimeElapsed(0);
      startTimeRef.current = null;
      pausedTimeRef.current = 0;
      lastPauseTimeRef.current = null;
      setPredictedStats({ exp: 0, health: 0, mana: 0, damage: 0, level: 0 });
    }
  };

// ✅ ADD THIS: Reset on mount
useEffect(() => {
  hasResumedRef.current = false;
  console.log('Timer component mounted, reset hasResumedRef');
}, []);

// Resume effect with corrected hasResumedRef placement
useEffect(() => {
  const checkForActiveTimer = async () => {
    if (!authUser || hasResumedRef.current || resumeInProgress.current) return;

    if (isRunning || isSessionActive) {
      console.log('Timer already active, skipping resume check');
      return;
    }

    resumeInProgress.current = true;
    
    try {
      // ✅ SINGLE USER FETCH
      const userRef = doc(db, 'users', authUser.uid);
      const userDoc = await getDoc(userRef);
      const todaySession = await refreshTodaySession();
      
      if (!userDoc.exists()) {
        console.error('❌ User document not found');
        return;
      }
      
      const userData = userDoc.data();
      const activeTimer = userData?.activeTimer;

      if (activeTimer?.isActive && activeTimer.startedAt) {
        const startedAt = activeTimer.startedAt.toDate();
        const durationSeconds = activeTimer.duration;
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - startedAt.getTime()) / 1000);
        
        if (elapsedSeconds < 3) {
          console.log('Timer just started, skipping resume logic');
          return;
        }

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
          console.log(`Resuming timer: ${elapsedSeconds}s elapsed of ${durationSeconds}s`);

          setIsResuming(true);
          setIsLoadingPartyData(true);
          setSelectedDuration(Math.ceil(durationSeconds / 60));
          setTimeElapsed(elapsedSeconds);
          setIsSessionActive(true);
          setIsRunning(true);

          const minutesElapsed = Math.floor(elapsedSeconds / 60);
          lastSyncedMinuteRef.current = minutesElapsed;
          console.log(`Set last synced minute to: ${minutesElapsed}`);

          // ✅ CHECK PARTY ID FROM ALREADY-FETCHED DATA
          if (!userData.currentPartyId) {
            console.error('❌ User has no party, aborting resume');
            setIsResuming(false);
            setIsLoadingPartyData(false);
            hasResumedRef.current = false;
            return;
          }

          // ✅ FETCH PARTY DATA DIRECTLY FROM FIRESTORE
          const [freshPartyDoc, freshMemberDoc] = await Promise.all([
            getDoc(doc(db, 'parties', userData.currentPartyId)),
            getDoc(doc(db, 'parties', userData.currentPartyId, 'members', authUser.uid))
          ]);

          if (!freshMemberDoc.exists()) {
            console.error('❌ Member document not found');
            setIsResuming(false);
            setIsLoadingPartyData(false);
            hasResumedRef.current = false;
            return;
          }

          const freshMemberProfile = freshMemberDoc.data();
          const freshBossHealth = freshPartyDoc.exists() 
            ? freshPartyDoc.data()?.currentBoss?.currentHealth 
            : null;
          const freshMemberDamage = freshMemberProfile.currentBossDamage || 0;

          // ✅ SET SESSION START REFS
          sessionStartExpRef.current = freshMemberProfile.exp || 0;
          sessionStartHealthRef.current = freshMemberProfile.health || 0;
          sessionStartManaRef.current = freshMemberProfile.mana || 0;
          sessionStartLevelRef.current = freshMemberProfile.level || 1;
          
          sessionStartTodayMinutesRef.current = todaySession.minutesStudied || 0;
          sessionStartTodayExpRef.current = todaySession.expEarned || 0;
          sessionStartTodayCardsRef.current = todaySession.cardsReviewed || 0;

          console.log('Captured today session base for resume:', {
            minutes: sessionStartTodayMinutesRef.current,
            exp: sessionStartTodayExpRef.current
          });
          // ✅ UPDATE PARTY MEMBERS REF
          partyMembersRef.current = {
            ...partyMembersRef.current,
            [authUser.uid]: freshMemberProfile
          };
          
          console.log('Updated member profile with fresh stats:', freshMemberProfile);

          // ✅ SET ORIGINAL REFS
          originalBossHealthRef.current = freshBossHealth;
          originalMemberDamageRef.current = freshMemberDamage;

          console.log('Captured FRESH boss health:', freshBossHealth);
          console.log('Captured FRESH member damage:', freshMemberDamage);

          // ✅ START TIMER WITH ALL FRESH DATA
          timerStartRef?.current?.(
            true,                    // skipStreakCheck
            true,                    // isResuming
            minutesElapsed,          // resumeFromMinutes
            freshBossHealth,         // freshBossHealth
            freshMemberDamage,       // freshMemberDamage
            startedAt.getTime(),     // resumeStartTime
            freshMemberProfile       // freshMemberProfile
          );

          setTimeout(() => {
            setIsResuming(false);
            setIsLoadingPartyData(false);
            console.log('Boss updates re-enabled');
          }, 500);

        } else {
          // Timer completed while closed
          console.log('Timer completed while closed - awarding time');
          
          const minutesToSave = Math.floor(durationSeconds / 60);
          const savedSessionKey = `completed_${authUser.uid}_${startedAt.getTime()}`;
          const alreadySaved = localStorage.getItem(savedSessionKey);
          
          if (alreadySaved) {
            console.log('⚠️ Session already saved, skipping duplicate save');
            await updateDoc(userRef, { 'activeTimer.isActive': false });
          } else {
            localStorage.setItem(savedSessionKey, 'saving');
            
            try {
              await handleTimerCompleteRef.current?.();
              await saveCompletedSessionRef.current(minutesToSave);
              localStorage.setItem(savedSessionKey, 'saved');
              console.log('Session saved successfully');
              
              const allKeys = Object.keys(localStorage);
              const sessionKeys = allKeys
                .filter(k => k.startsWith(`completed_${authUser.uid}_`))
                .sort()
                .reverse();
              
              sessionKeys.slice(5).forEach(k => localStorage.removeItem(k));
            } catch (err) {
              console.error('❌ Failed to save session:', err);
            }
          }

          setIsRunning(false);
          setIsSessionActive(true);
          setTimeElapsed(0);
          startTimeRef.current = null;
          pausedTimeRef.current = 0;
          lastPauseTimeRef.current = null;
          originalBossHealthRef.current = null;
          originalMemberDamageRef.current = null;
          lastSyncedMinuteRef.current = 0;
          setPredictedStats({ exp: 0, health: 0, mana: 0, damage: 0, level: 0 });
          
          setShowCompletion(true);
          setSelectedDuration(Math.ceil(durationSeconds / 60));
        }
      }
    } catch (error) {
      console.error('Error checking active timer:', error);
      setIsResuming(false);
      setIsLoadingPartyData(false);
      hasResumedRef.current = false;
    } finally {
      resumeInProgress.current = false;
    }
  };

  checkForActiveTimer();
}, [authUser, db, timerStartRef]);  // ← MINIMAL DEPS
  // ============================================================================
  // 🔥 VISIBILITY CHANGE HANDLER
  // ============================================================================
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && startTimeRef.current && isRunning) {
        const totalElapsed = Date.now() - startTimeRef.current - pausedTimeRef.current;
        const elapsed = Math.floor(totalElapsed / 1000);
        
        if (elapsed >= selectedDuration * 60 && !showCompletion) {
          handleCompletionRef.current?.();  // ← Use ref instead
        } else {
          setTimeElapsed(elapsed);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isRunning, selectedDuration, showCompletion]);

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

  const getCurrentRewards = () => {
    // Special case for 1-minute tutorial timer
    if (selectedDuration === 1) {
      return {
        label: '1 min',
        value: 1,
        damage: 10,
        xp: 10,
        mana: 3,
        health: 1
      };
    }
    
    return durations.find(d => d.value === selectedDuration) || durations[1];
  };
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
                className={`w-full bg-red-600 hover:bg-red-500 text-white font-bold text-xl rounded-lg py-4 transition-all shadow-lg hover:shadow-xl`}
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
            userProfile={authUserProfile}
            userId={user?.uid}
            hasNotStartedATimerSession={hasNotStartedATimerSession}
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