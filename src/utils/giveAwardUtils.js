import { increment, runTransaction, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../api/firebase";
import { getLevelFromTotalExp, calculateLevelUp, PLAYER_CONFIG } from "./playerStatsUtils";
import { getMonthId, getWeekId } from "../contexts/LeaderboardContext"; // Import these helpers

export const awardWithXP = async (userId, expAmt, updateUserProfile, userProfile, incrementExp) => {
  try {
    const xpGain = expAmt;
    let levelUpInfo = null;
    

    await runTransaction(db, async (transaction) => {
      // ═══════════════════════════════════════════════════════════
      // 🔥 STEP 1: DO ALL READS FIRST
      // ═══════════════════════════════════════════════════════════
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await transaction.get(userDocRef);

      if (!userDoc.exists()) {
        throw new Error("User does not exist.");
      }

      const userData = userDoc.data();
      
      // Read daily session doc
      const now = new Date();
      const dateKey = now.toLocaleDateString('en-CA');
      const dailySessionRef = doc(db, 'users', userId, 'dailySessions', dateKey);
      const dailyDoc = await transaction.get(dailySessionRef);
      
      // Read party member if exists
      let partyMemberRef = null;
      let memberDoc = null;

      if (userData.currentPartyId) {
        partyMemberRef = doc(db, 'parties', userData.currentPartyId, 'members', userId);
        memberDoc = await transaction.get(partyMemberRef);
      }

      // ═══════════════════════════════════════════════════════════
      // 🔥 STEP 2: CALCULATE EVERYTHING
      // ═══════════════════════════════════════════════════════════
      const oldExp = userData.exp || 0;
      const oldLevel = userData.level || 1;
      const newExp = oldExp + xpGain;
      
      // Calculate if level up occurred
      levelUpInfo = calculateLevelUp(oldExp, newExp, oldLevel);

      // ═══════════════════════════════════════════════════════════
      // 🔥 STEP 3: DO ALL WRITES
      // ═══════════════════════════════════════════════════════════
      
      // Update user with exp AND level if leveled up
      const userUpdates = {
        exp: increment(xpGain)
      };
      
      if (levelUpInfo.leveledUp) {
        userUpdates.level = levelUpInfo.newLevel;
        // Award coin bonus for level up
        if (levelUpInfo.coinBonus > 0) {
          userUpdates.coins = increment(levelUpInfo.coinBonus);
        }
      }
      
      transaction.update(userDocRef, userUpdates);

      // Update party member if exists
      if (memberDoc && memberDoc.exists()) {
        const memberUpdates = {
          exp: increment(xpGain)
        };
        
        if (levelUpInfo.leveledUp) {
          memberUpdates.level = levelUpInfo.newLevel;
        }
        
        transaction.update(partyMemberRef, memberUpdates);
      }

      // Update dailySessions with bonus exp
      if (dailyDoc.exists()) {
        const existingData = dailyDoc.data();
        transaction.update(dailySessionRef, {
          expEarned: (existingData.expEarned || 0) + xpGain,
          lastSessionAt: now
        });
      } else {
        transaction.set(dailySessionRef, {
          date: now,
          firstSessionAt: now,
          lastSessionAt: now,
          minutesStudied: 0,
          cardsReviewed: 0,
          expEarned: xpGain
        });
      }

      // Update leaderboards with bonus exp
      const weekId = getWeekId(now);
      const monthId = getMonthId(now);

      const weeklyLeaderboardRef = doc(
        db, 
        'leaderboards', 
        'weekly', 
        weekId, 
        userId
      );
      
      const monthlyLeaderboardRef = doc(
        db, 
        'leaderboards', 
        'monthly', 
        monthId, 
        userId
      );

      // Update both leaderboards with bonus exp
      transaction.set(weeklyLeaderboardRef, {
        displayName: userData.displayName || 'Anonymous',
        exp: increment(xpGain),
        avatar: userData.avatar || 'warrior_01',
        level: levelUpInfo.leveledUp ? levelUpInfo.newLevel : oldLevel,
        isPro: userData.subscription?.tier === 'pro' || false,
        updatedAt: serverTimestamp(),
        title: userData.title || null,
        streak: userData.stats?.currentStreak || 0
      }, { merge: true });
      
      transaction.set(monthlyLeaderboardRef, {
        displayName: userData.displayName || 'Anonymous',
        exp: increment(xpGain),
        avatar: userData.avatar || 'warrior_01',
        level: levelUpInfo.leveledUp ? levelUpInfo.newLevel : oldLevel,
        isPro: userData.subscription?.tier === 'pro' || false,
        updatedAt: serverTimestamp(),
        title: userData.title || null,
        streak: userData.stats?.currentStreak || 0
      }, { merge: true });
      
      console.log(`📊 Updated leaderboards & daily session: +${xpGain} bonus exp`);
    });

    // Update local state if callback provided
    if (updateUserProfile && levelUpInfo) {
      const stateUpdates = { 
        exp: (userProfile?.exp || 0) + xpGain 
      };
      
      if (levelUpInfo.leveledUp) {
        stateUpdates.level = levelUpInfo.newLevel;
        if (levelUpInfo.coinBonus > 0) {
          stateUpdates.coins = (userProfile?.coins || 0) + levelUpInfo.coinBonus;
        }
      }
      
      updateUserProfile(stateUpdates);
    }
    
    if (levelUpInfo?.leveledUp) {
      console.log(`🎉 LEVEL UP! Level ${levelUpInfo.newLevel} (+${levelUpInfo.levelsGained} levels, +${levelUpInfo.coinBonus} coins)`);
    }
    
    // Only call incrementExp if it was passed
    if (incrementExp) {
      incrementExp(expAmt);
    }
    
    console.log(`✅ XP awarded: +${xpGain} XP`);
    
    return { 
      success: true, 
      xpGain,
      ...levelUpInfo
    };
    
  } catch (error) {
    console.error('❌ Error awarding XP:', error);
    return { success: false, error };
  }
};