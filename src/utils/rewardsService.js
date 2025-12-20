import { doc, setDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '../api/firebase';
import { awardWithXP } from './giveAwardUtils.js';

export async function applyRewardsToUser(userId, rewards, incrementExp) {
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

    if (rewards.boosters.length > 0) {
      updates.savedBoosters = arrayUnion(
        ...rewards.boosters.map(b => ({
          ...b,
          savedAt: Timestamp.now(),
          expiresAt: Timestamp.fromMillis(
            Date.now() + b.expiresIn * 60 * 60 * 1000
          )
        }))
      );
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
