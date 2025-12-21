import { doc, setDoc, getDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '../api/firebase';
import { awardWithXP } from './giveAwardUtils.js';

export async function applyRewardsToUser(userId, rewards, incrementExp, refetchUserProfile) {
  try {
    /* -----------------------------
       1. XP (delegate to authority)
    ----------------------------- */
    if (rewards.bonusXP > 0) {
      await awardWithXP(userId, rewards.bonusXP, null, null, incrementExp);
    }

    /* -----------------------------
       2. Non-XP rewards
    ----------------------------- */
    const userRef = doc(db, 'users', userId);
    const updates = {};

    const newTitles = rewards.cosmetics
      .filter(c => c.type === 'title')
      .map(c => c.id);

    const newAvatars = rewards.cosmetics
      .filter(c => c.type === 'avatar')
      .map(c => c.id);

    if (newTitles.length > 0) {
      updates.unlockedTitles = arrayUnion(...newTitles);
    }

    if (newAvatars.length > 0) {
      updates.unlockedAvatars = arrayUnion(...newAvatars);
    }

    /* -----------------------------
       3. Boosters (with 3-cap logic)
    ----------------------------- */
    if (rewards.boosters.length > 0) {
      // Fetch current boosters to check limit
      const userSnap = await getDoc(userRef);
      const currentBoosters = userSnap.data()?.savedBoosters || [];
      
      // Filter out expired boosters
      const validBoosters = currentBoosters.filter(
        b => b.expiresAt.toMillis() > Date.now()
      );
      
      const MAX_BOOSTERS = 3;
      const slotsAvailable = MAX_BOOSTERS - validBoosters.length;
      
      // Add unique timestamp to each booster to prevent deduplication
      const now = Date.now();
      const newBoosters = rewards.boosters.map((b, index) => ({
        ...b,
        savedAt: Timestamp.fromMillis(now + index),
        expiresAt: Timestamp.fromMillis(
          now + b.expiresIn * 60 * 60 * 1000
        )
      }));
      
      if (slotsAvailable > 0) {
        const boostersToAdd = newBoosters.slice(0, slotsAvailable);
        const excessBoosters = newBoosters.slice(slotsAvailable);
        
        // ✅ Replace entire array (removes expired automatically)
        updates.savedBoosters = [...validBoosters, ...boostersToAdd];
        
        // Convert excess to XP
        if (excessBoosters.length > 0) {
          const conversionXP = excessBoosters.length * 100;
          await awardWithXP(userId, conversionXP, null, null, incrementExp);
          console.log(`💰 ${excessBoosters.length} excess booster(s) → +${conversionXP} XP`);
        }
      } else {
        // Inventory full - convert all to XP, but still clean up expired
        updates.savedBoosters = validBoosters; // Clean array
        
        const conversionXP = newBoosters.length * 100;
        await awardWithXP(userId, conversionXP, null, null, incrementExp);
        console.log(`💰 Inventory full. ${newBoosters.length} booster(s) → +${conversionXP} XP`);
      }
    }

    if (Object.keys(updates).length > 0) {
      await setDoc(userRef, updates, { merge: true });
    }

    console.log('✅ Rewards applied successfully');
  } catch (error) {
    console.error('❌ Failed to apply rewards:', error);
    throw error;
  }
}
