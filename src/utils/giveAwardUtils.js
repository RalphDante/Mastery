import { increment, runTransaction, doc } from "firebase/firestore";
import { db } from "../api/firebase";
import { getLevelFromTotalExp, calculateLevelUp, PLAYER_CONFIG } from "./playerStatsUtils"; // adjust path as needed

export const awardWithXP = async (userId, expAmt, updateUserProfile, userProfile) => {
    try {
      const xpGain = expAmt;
      let levelUpInfo = null;
      
      await runTransaction(db, async (transaction) => {
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await transaction.get(userDocRef);

        if (!userDoc.exists()) {
          throw new Error("User does not exist.");
        }

        const userData = userDoc.data();
        const oldExp = userData.exp || 0;
        const oldLevel = userData.level || 1;
        const newExp = oldExp + xpGain;
        
        // Calculate if level up occurred
        levelUpInfo = calculateLevelUp(oldExp, newExp, oldLevel);
        
        let partyMemberRef = null;
        let memberDoc = null;

        if (userData.currentPartyId) {
          partyMemberRef = doc(db, 'parties', userData.currentPartyId, 'members', userId);
          memberDoc = await transaction.get(partyMemberRef);
        }

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