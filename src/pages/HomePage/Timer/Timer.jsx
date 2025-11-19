// TimerWithAutosave.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { runTransaction, doc, increment, collection, query, getDocs, getDoc, updateDoc } from 'firebase/firestore';

import { calculateLevelUp, PLAYER_CONFIG } from '../../../utils/playerStatsUtils';
import { serverTimestamp } from 'firebase/firestore';
import { handleBossDefeat } from '../../../utils/bossUtils';

import ServerCostBanner from '../ServerCostBanner';
import { usePartyContext } from '../../../contexts/PartyContext';
import { useUserDataContext } from '../../../contexts/UserDataContext';
import { updateUserAndPartyStreak } from '../../../utils/streakUtils';
import { useTutorials } from '../../../contexts/TutorialContext';

function Timer({
  authUser,
  db,
  handleTimerStart,
  handleTimerComplete,
  deckId = null,
  onTimeUpdate = null,
}) {
  const {updateBossHealth, updateMemberDamage, updateLastBossResults, resetAllMembersBossDamage, updateUserProfile, partyProfile} = usePartyContext();
  const {incrementMinutes} = useUserDataContext();
  
  const startTimeRef = useRef(null);           // NEW: When timer actually started
  const pausedTimeRef = useRef(0);             // NEW: Total time spent paused
  const lastPauseTimeRef = useRef(null);       // NEW: When last pause began
  const sessionTimerRef = useRef(null);
  const lastSaveRef = useRef(0);               // Track last save in SECONDS not ref ticks
  const isSavingRef = useRef(false);
  const audioRef = useRef(null);

  const hasResumedRef = useRef(false);



  const durations = [
    { label: '1 min', value: 1, damage: 10, xp: 10, mana: 3, health: 1 },
    { label: '5 min', value: 5, damage: 50, xp: 50, mana: 15, health: 5 },
    { label: '15 min', value: 15, damage: 150, xp: 150, mana: 45, health: 15 },
    { label: '25 min', value: 25, damage: 250, xp: 250, mana: 75, health: 25  },
    { label: '45 min', value: 45, damage: 450, xp: 450, mana: 135, health: 45  },
    { label: '60 min', value: 60, damage: 600, xp: 600, mana: 180, health: 60  },
  ];


  const [selectedDuration, setSelectedDuration] = useState(5);
  const [isRunning, setIsRunning] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);

  const {isTutorialAtStep, isInTutorial, advanceStep, } = useTutorials();




  // Initialize alarm sound
  useEffect(() => {
    // Using a free alarm sound from freesound.org via CDN
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.volume = 0.5;
  }, []);

  // Save logic (unchanged)
  const saveStudyTime = useCallback(async (secondsToSave) => {
    if (!authUser || secondsToSave < 60 || isSavingRef.current) return;

    const MAX_MINUTES_PER_SAVE = 180; // 3 hours max
    const fullMinutes = Math.floor(secondsToSave / 60);
    
    // 🔥 CRITICAL: Add minimum validation too
    if (fullMinutes <= 0 || fullMinutes > MAX_MINUTES_PER_SAVE) {
      console.error('Invalid minutes to save:', fullMinutes, 'from seconds:', secondsToSave);
      return;
    }

    // 🔥 CRITICAL: Additional sanity check
    if (fullMinutes > selectedDuration + 5) {
      console.error('⚠️ Attempted to save more minutes than timer duration!');
      console.error('Minutes:', fullMinutes, 'Duration:', selectedDuration);
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

          newExp = currentExp + (fullMinutes * PLAYER_CONFIG.EXP_PER_MINUTE);
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
            'activeTimer.lastSavedAt': serverTimestamp()   // ← ADD THIS
          });

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
          });
        } else {
          transaction.set(dailySessionRef, {
            date: now,
            firstSessionAt: now,
            lastSessionAt: now,
            minutesStudied: fullMinutes,
            cardsReviewed: 0,
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
      
      if (onTimeUpdate) onTimeUpdate(fullMinutes);
    } catch (err) {
      console.error('Error saving study time:', err);
    } finally {
      isSavingRef.current = false;
    }
  }, [authUser, db, selectedDuration, onTimeUpdate, updateBossHealth, updateMemberDamage, updateUserProfile, updateLastBossResults, resetAllMembersBossDamage, incrementMinutes]);

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
    
    const totalElapsed = Date.now() - startTimeRef.current - pausedTimeRef.current;
    const totalSeconds = Math.floor(totalElapsed / 1000);
    const cappedSeconds = Math.min(totalSeconds, selectedDuration * 60);
    const remainingSeconds = cappedSeconds - lastSaveRef.current;

    const finalMinutes = Math.min(Math.floor(remainingSeconds / 60), 60);

    if (finalMinutes > 0) {
      await saveStudyTime(finalMinutes * 60);
      console.log(`Final save: +${finalMinutes} minute(s)`);
    }
    
    // Clear timer from database
    if (authUser) {
      try {
        const userRef = doc(db, 'users', authUser.uid);
        await updateDoc(userRef, {
          'activeTimer.isActive': false,
          'activeTimer.lastSavedAt': null
        });
      } catch (err) {
        console.error('Error clearing timer:', err);
      }
    }
    setShowCompletion(true);

    handleTimerComplete?.();
    
}, [saveStudyTime, authUser, db, handleTimerComplete, selectedDuration]);

  const startTimer = async () => {
    if (!authUser) return;
    
   


    const now = Date.now();
    
    // Initialize or resume timer
    if (startTimeRef.current === null) {
      // First start
      startTimeRef.current = now;
      pausedTimeRef.current = 0;
      
      try {
        console.log(partyProfile?.id)
        const streakResult = await updateUserAndPartyStreak(
          db, 
          authUser.uid, 
          partyProfile?.id
        );

        updateUserProfile({
          streak: streakResult.currentStreak || 1
          
        });
        
        if (streakResult.isNewStreak) {
          console.log(`🔥 Streak maintained! ${streakResult.currentStreak} days`);
        }

      } catch (streakError) {
        console.error('Error updating streak:', streakError);
        // Don't block timer start if streak update fails
      }

      // Save to database that timer started
      try {
        const userRef = doc(db, 'users', authUser.uid);
        await updateDoc(userRef, {
          activeTimer: {
            startedAt: serverTimestamp(),
            lastSavedAt: serverTimestamp(),
            duration: selectedDuration * 60,
            isActive: true
          }
        });
        console.log('Timer saved to database');
      } catch (err) {
        console.error('Error saving timer start:', err);
      }
    } else if (lastPauseTimeRef.current !== null) {
      // Resuming from pause
      pausedTimeRef.current += now - lastPauseTimeRef.current;
      lastPauseTimeRef.current = null;
    }
    
    setIsRunning(true);
    setIsSessionActive(true);
    setShowCompletion(false);

    handleTimerStart?.();


    // Start the interval
    if (!sessionTimerRef.current) {
      sessionTimerRef.current = setInterval(() => {
        const currentTime = Date.now();
        const totalElapsed = currentTime - startTimeRef.current - pausedTimeRef.current;
        const totalSeconds = Math.floor(totalElapsed / 1000);

        // Prevent insane time jumps (clock changed, dev tools, etc.)
        const MAX_EXPECTED_ELAPSED = (selectedDuration * 60) + 120; // +2 min buffer
        if (totalSeconds > MAX_EXPECTED_ELAPSED) {
          console.warn('Time anomaly detected — forcing completion');
          handleCompletion();
          return;
        }

        setTimeElapsed(totalSeconds);

        // Timer finished
        if (totalSeconds >= selectedDuration * 60) {
          handleCompletion();
          return;
        }

        // SAVE LOGIC — fire-and-forget (no await in setInterval)
        if (!isSavingRef.current) {
          const secondsSinceLastSave = totalSeconds - lastSaveRef.current;

          if (secondsSinceLastSave >= 60) {
            const minutesToSave = Math.min(Math.floor(secondsSinceLastSave / 60), 60);
            if (minutesToSave > 0) {
              const secondsToSave = minutesToSave * 60;

              saveStudyTime(secondsToSave)
                .then(() => {
                  lastSaveRef.current += secondsToSave;

                  if (minutesToSave > 10) {
                    console.log(`Caught up — saved ${minutesToSave} minutes`);
                  }
                })
                .catch(err => {
                  console.error('Background save failed:', err);
                });
            }
          }
        }
      }, 1000);
    }
  };

  const pauseTimer = () => {
    setIsRunning(false);
    lastPauseTimeRef.current = Date.now();
    
    if (sessionTimerRef.current) { 
      clearInterval(sessionTimerRef.current); 
      sessionTimerRef.current = null; 
    }

    // Save remaining unsaved time
    const totalElapsed = Date.now() - startTimeRef.current - pausedTimeRef.current;
    const totalSeconds = Math.floor(totalElapsed / 1000);
    const remaining = totalSeconds - lastSaveRef.current;
    
    if (remaining > 0) {
      saveStudyTime(remaining);
      lastSaveRef.current = totalSeconds;
    }
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
    
    // Reset timestamp refs
    startTimeRef.current = null;
    pausedTimeRef.current = 0;
    lastPauseTimeRef.current = null;
    lastSaveRef.current = 0;
    hasResumedRef.current = false;

    // Clear from database
    if (authUser) {
      try {
        const userRef = doc(db, 'users', authUser.uid);
        await updateDoc(userRef, {
          'activeTimer.isActive': false,
          'activeTimer.lastSavedAt': null
        });
      } catch (err) {
        console.error('Error clearing timer:', err);
      }
    }
  };

  const selectDuration = (duration) => {
    if (!isSessionActive) {
      setSelectedDuration(duration);
      setTimeElapsed(0);
      startTimeRef.current = null;
      pausedTimeRef.current = 0;
      lastSaveRef.current = 0;
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
      if (!document.hidden && startTimeRef.current) {
        const totalElapsed = Date.now() - startTimeRef.current - pausedTimeRef.current;
        const totalSeconds = Math.floor(totalElapsed / 1000);
        
        // Check if timer should have completed while away
        if (totalSeconds >= selectedDuration * 60 && !showCompletion) {
          handleCompletion();
        } else if (isRunning) {
          setTimeElapsed(totalSeconds);
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

      await new Promise(resolve => setTimeout(resolve, 100));

      try {
        const userRef = doc(db, 'users', authUser.uid);
        const userDoc = await getDoc(userRef);
        const activeTimer = userDoc.data()?.activeTimer;

        if (activeTimer?.isActive && activeTimer.startedAt) {
          // ✅ Check if we already resumed (Options just switched us here)
          if (hasResumedRef.current) return;

         
          const startedAt = activeTimer.startedAt.toDate();
          const durationSeconds = activeTimer.duration;
          const now = Date.now();
          const elapsedSeconds = Math.floor((now - startedAt.getTime()) / 1000);

          // 🔥 Check if started time is in the future (clock skew)
          if (elapsedSeconds < -300) { // more than 5 min behind
            console.warn('Extreme clock skew detected, clearing timer');
            await updateDoc(userRef, { 'activeTimer.isActive': false });
            return;
          }

          if (elapsedSeconds < 0) {
            console.log('Minor clock skew, syncing start time forward by', -elapsedSeconds, 's');
            startTimeRef.current = Date.now();
          }

          // 🔥 KEY FIX: Validate elapsed time is reasonable
          const MAX_REASONABLE_ELAPSED = durationSeconds + (60 * 60); // duration + 1 hour buffer
          
          if (elapsedSeconds > MAX_REASONABLE_ELAPSED) {
            // Timer is way overdue - likely app was closed for extended period
            console.warn('Timer elapsed time unreasonable:', elapsedSeconds, 'seconds');
            console.log('Clearing stale timer instead of processing');
            
            // Just clear the timer, don't award insane study time
            await updateDoc(userRef, { 'activeTimer.isActive': false });
            return;
          }

          if (elapsedSeconds < durationSeconds) {
            // Timer still running - resume it
            console.log('Resuming timer from', elapsedSeconds, 'seconds');
            hasResumedRef.current = true; // 🔥 Mark as resumed to prevent duplicates

            startTimeRef.current = startedAt.getTime();
            pausedTimeRef.current = 0;
            // ──────────────────────────────────────────────────────────────
            // CORRECT WAY: Calculate saved time from lastSavedAt (server time!)
            // ──────────────────────────────────────────────────────────────
            let secondsAlreadySaved = 0;

            if (activeTimer.lastSavedAt) {
              const lastSavedAtDate = activeTimer.lastSavedAt.toDate();
              const startedAtDate = activeTimer.startedAt.toDate();

              const elapsedAtLastSave = Math.floor((lastSavedAtDate.getTime() - startedAtDate.getTime()) / 1000);
              secondsAlreadySaved = Math.floor(elapsedAtLastSave / 60) * 60; // round down to completed minutes
            } else {
              // No saves yet — be conservative
              secondsAlreadySaved = 0;
            }

            lastSaveRef.current = secondsAlreadySaved;
            setSelectedDuration(Math.ceil(durationSeconds / 60));
            setTimeElapsed(elapsedSeconds);
            setIsSessionActive(true);
            
            // 🔥 AUTO-RESUME: Start the timer immediately
            setIsRunning(true);
            
            // Start the interval
            if (!sessionTimerRef.current) {
              sessionTimerRef.current = setInterval(() => {
                const currentTime = Date.now();
                const totalElapsed = currentTime - startTimeRef.current - pausedTimeRef.current;
                const totalSeconds = Math.floor(totalElapsed / 1000);
                
                const MAX_EXPECTED_ELAPSED = (Math.ceil(durationSeconds / 60) * 60) + 60;
                if (totalSeconds > MAX_EXPECTED_ELAPSED) {
                  console.error('⚠️ Time anomaly detected:', totalSeconds, 'seconds');
                  handleCompletion();
                  return;
                }
                
                setTimeElapsed(totalSeconds);
                
                if (totalSeconds >= Math.ceil(durationSeconds / 60) * 60) {
                  handleCompletion();
                  return;
                }

                if (!isSavingRef.current) {
                  const secondsSinceLastSave = totalSeconds - lastSaveRef.current;

                  if (secondsSinceLastSave >= 60) {
                    const minutesToSave = Math.min(Math.floor(secondsSinceLastSave / 60), 60);
                    if (minutesToSave > 0) {
                      const secondsToSave = minutesToSave * 60;

                      saveStudyTime(secondsToSave)
                        .then(() => {
                          lastSaveRef.current += secondsToSave;
                        })
                        .catch(err => {
                          console.error('Resume save failed:', err);
                        });
                    }
                  }
                }
              }, 1000);
            }
          } else {
            // Timer completed while app was closed
            console.log('Timer completed while app was closed');
            hasResumedRef.current = true;

            // Calculate how much time is UNSAVED
            let secondsAlreadySaved = 0;
            if (activeTimer.lastSavedAt) {
              const lastSavedAtDate = activeTimer.lastSavedAt.toDate();
              const startedAtDate = activeTimer.startedAt.toDate();
              const elapsedAtSave = Math.floor((lastSavedAtDate.getTime() - startedAtDate.getTime()) / 1000);
              secondsAlreadySaved = Math.floor(elapsedAtSave / 60) * 60;
            }

            const totalElapsedSeconds = Math.floor((Date.now() - startedAt.getTime()) / 1000);
            const cappedSeconds = Math.min(totalElapsedSeconds, durationSeconds);
            const remaining = cappedSeconds - lastSaveRef.current;
            const finalMinutesToSave = Math.min(Math.floor(remaining / 60), 60);

            if (finalMinutesToSave > 0) {
              await saveStudyTime(finalMinutesToSave * 60);
              console.log(`Final save: awarded ${finalMinutesToSave} minutes of study time`);
            }

            await updateDoc(userRef, {
              'activeTimer.isActive': false,
              'activeTimer.lastSavedAt': null
            });

            setShowCompletion(true);
            setSelectedDuration(Math.ceil(durationSeconds / 60));
            setIsSessionActive(true);
            handleTimerComplete?.()
          }
        }
      } catch (error) {
        console.error('Error checking active timer:', error);
      }
    };

    checkForActiveTimer();
  }, [authUser, db, saveStudyTime, handleCompletion]);

  // Cleanup on unmount
  // useEffect(() => () => resetTimer(), []);

  // Render
  return (
    <div className="w-full h-full min-h-[450px] bg-slate-800 rounded-lg p-6 flex flex-col justify-between text-slate-100 relative">
      {!isSessionActive ? (
        <>
          <div className="flex-1 flex flex-col justify-center items-center space-y-4">
            <p className="text-slate-400 text-sm text-center max-w-md">
              <span className='text-yellow-400'>Pro tip:</span> Bookmark screen for instant battles - quick access = more XP!
            </p>
            <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
              {durations.map(d => (
                <button key={d.value} onClick={() => selectDuration(d.value)}
                  className={`p-3 rounded-lg font-medium ${selectedDuration===d.value?'bg-slate-600 text-slate-100 border border-2 border-slate-900/20':'bg-slate-900 text-slate-300 hover:bg-slate-700'}`}>
                  {d.label}
                </button>
              ))}
            </div>

            <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg">
              <p className="text-sm text-center text-slate-400 mb-2">Session rewards:</p>
              <div className="flex justify-between space-x-2 items-center">
                <div className="flex items-center space-x-1">
                  <span className="text-yellow-400 font-medium">+{getCurrentRewards().xp}</span>
                  <span className="text-slate-400 text-xs">XP</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-red-500 font-medium">+{getCurrentRewards().health}</span>
                  <span className="text-slate-400 text-xs">HP</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-blue-500 font-medium">+{getCurrentRewards().mana}</span>
                  <span className="text-slate-400 text-xs">MANA</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-red-400 font-medium">{getCurrentRewards().damage}</span>
                  <span className="text-slate-400 text-xs">DMG</span>
                </div>
              </div>
            </div>
          </div>

          <button onClick={startTimer} className="w-full bg-red-600 hover:bg-red-500 text-white font-medium py-3 rounded-lg">Start Session</button>
        </>
      ) : showCompletion ? (
        <>
          <div className="text-center flex-1 flex flex-col justify-center items-center space-y-1">
            <div>
                <img 
                  src="/images/sword-x.png"
                  alt="sword-x image"
                  className="w-24 h-24 object-contain"
                />

            </div>
            <h2 className="text-2xl font-bold text-green-400">Session Complete!</h2>
            <p className="text-slate-300">Great work on your {selectedDuration} minute session</p>
            
            <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg w-full max-w-xs">
              <p className="text-sm text-slate-400 mb-3">Rewards Earned:</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Experience</span>
                  <span className="text-yellow-500 font-bold">+{getCurrentRewards().xp} XP</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Health</span>
                  <span className="text-red-500 font-bold">+{getCurrentRewards().health} HP</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Mana</span>
                  <span className="text-blue-500 font-bold">+{getCurrentRewards().mana} MANA</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Boss Damage</span>
                  <span className="text-red-400 font-bold">{getCurrentRewards().damage} DMG</span>
                </div>
              </div>
            </div>
          </div>

          {/* <ServerCostBanner /> */}

          <button onClick={resetTimer} className="w-full bg-green-600 hover:bg-green-500 text-white font-medium py-3 rounded-lg">
            Start New Session
          </button>
        </>
      ) : (
        <>
          <div className="text-left">
            <h2 className="text-lg font-semibold mb-1">Session Active</h2>
            <p className="text-slate-400 text-sm">Stay focused to maximize rewards</p>
          </div>

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

            <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg w-full max-w-xs">
              <p className="text-sm text-slate-400 mb-2 text-center">Earning per minute:</p>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center space-x-1">
                  <span className="text-yellow-500 font-medium">{Math.round(getCurrentRewards().xp/selectedDuration)}</span>
                  <span className="text-slate-400">XP</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-blue-500 font-medium">{Math.round(getCurrentRewards().mana/selectedDuration)}</span>
                  <span className="text-slate-400">MANA</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-green-400 font-medium">{Math.round(getCurrentRewards().health/selectedDuration)}</span>
                  <span className="text-slate-400">HP</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-red-400 font-medium">{Math.round(getCurrentRewards().damage/selectedDuration)}</span>
                  <span className="text-slate-400">DMG</span>
                </div>
              </div>
            </div>
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
  );
}

export default Timer;