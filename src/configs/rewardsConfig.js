import { LOOT_TITLES } from "./titlesConfig.js";
import { getDroppableAvatars } from "./avatarConfig.js";

// Reward Configuration
const REWARDS_CONFIG = {
  bonusXP: {
    small: 50,
    medium: 100,
    large: 250
  }
};

// 🔥 TEMP: Disable boosters until logic is ready
const BOOSTERS_ENABLED = false;

export function generateBonusLoot(userCollection, isPro = false) {
  const roll = Math.random() * 100; // 0-100
  let rewards = {
    bonusXP: 0,
    cosmetic: null,
    cosmeticType: null, // 'title' or 'avatar'
    rarity: null,
    booster: null,
    wasDuplicate: false,
    duplicateName: null,
    duplicateId: null
  };

  // 70% chance: Bonus XP or Booster
  if (roll < 70) {    
    // 80% flat XP, 20% booster
    if (!BOOSTERS_ENABLED || Math.random() < 0.8) {
      // Flat bonus XP
      const xpRoll = Math.random();
      if (xpRoll < 0.6) {
        rewards.bonusXP = REWARDS_CONFIG.bonusXP.small;
      } else if (xpRoll < 0.9) {
        rewards.bonusXP = REWARDS_CONFIG.bonusXP.medium;
      } else {
        rewards.bonusXP = REWARDS_CONFIG.bonusXP.large;
      }
    } else {
      // XP Booster (20% of the 70% = 14% per roll)
      rewards.booster = {
        type: '2x_xp',
        duration: 20,
        multiplier: 2,
        expiresIn: 48
      };
    }
  }
  // 20% chance: Uncommon title or avatar
  else if (roll < 90) {
    rewards.rarity = 'uncommon';
    const cosmetic = getRandomCosmetic('uncommon', userCollection, isPro);
    
    if (cosmetic.isDuplicate) {
      // Convert duplicate to bonus XP
      rewards.bonusXP = REWARDS_CONFIG.bonusXP.medium;
      rewards.wasDuplicate = true;
      rewards.duplicateName = cosmetic.title || cosmetic.name;
      rewards.duplicateId = cosmetic.id;
    } else {
      rewards.cosmetic = cosmetic;
      rewards.cosmeticType = cosmetic.type;
    }
  }
  // 8% chance: Rare title or avatar
  else if (roll < 98) {
    rewards.rarity = 'rare';
    const cosmetic = getRandomCosmetic('rare', userCollection, isPro);
    
    if (cosmetic.isDuplicate) {
      rewards.bonusXP = REWARDS_CONFIG.bonusXP.large;
      rewards.wasDuplicate = true;
      rewards.duplicateName = cosmetic.title || cosmetic.name;
      rewards.duplicateId = cosmetic.id;
    } else {
      rewards.cosmetic = cosmetic;
      rewards.cosmeticType = cosmetic.type;
      // Rare drops also give bonus XP
      rewards.bonusXP = REWARDS_CONFIG.bonusXP.small;
    }
  }
  // 2% chance: Legendary title or avatar
  else {
    rewards.rarity = 'legendary';
    const cosmetic = getRandomCosmetic('legendary', userCollection, isPro);
    
    if (cosmetic.isDuplicate) {
      rewards.bonusXP = REWARDS_CONFIG.bonusXP.large * 2;
      rewards.wasDuplicate = true;
      rewards.duplicateName = cosmetic.title || cosmetic.name;
      rewards.duplicateId = cosmetic.id;
    } else {
      rewards.cosmetic = cosmetic;
      rewards.cosmeticType = cosmetic.type;
      // Legendary drops give large bonus XP
      rewards.bonusXP = REWARDS_CONFIG.bonusXP.large;
      
      // 🔥 Only give booster if enabled
      if (BOOSTERS_ENABLED) {
        rewards.booster = {
          type: '3x_xp',
          duration: 30,
          multiplier: 3,
          expiresIn: 48
        };
      }
    }
  }

  return rewards;
}


function getRandomCosmetic(rarity, userCollection, isPro = false) {
  // Randomly choose between title or avatar
  const type = Math.random() < 0.5 ? 'title' : 'avatar';
  
  let item;
  let pool;
  
  if (type === 'title') {
    pool = LOOT_TITLES[rarity] || [];
    if (pool.length === 0) {
      // Fallback to uncommon if rarity not found
      pool = LOOT_TITLES.uncommon;
    }
    item = pool[Math.floor(Math.random() * pool.length)];
  } else {
    // Avatar
    pool = getDroppableAvatars(rarity, isPro);
    
    // If no avatars available (e.g., free user rolling legendary), give title instead
    if (pool.length === 0) {
      const titlePool = LOOT_TITLES[rarity] || LOOT_TITLES.uncommon;
      item = titlePool[Math.floor(Math.random() * titlePool.length)];
      return {
        ...item,
        type: 'title',
        isDuplicate: userCollection.titles?.includes(item.id) || false
      };
    }
    
    item = pool[Math.floor(Math.random() * pool.length)];
  }
  
  // Check if user already owns it
  const collectionKey = type === 'title' ? 'titles' : 'avatars';
  const unlockedKey = type === 'title' ? 'unlockedTitles' : 'unlockedAvatars';
  
  const userItems = userCollection[collectionKey] || userCollection[unlockedKey] || [];
  const isDuplicate = userItems.includes(item.id);
  
  return {
    ...item,
    type,
    isDuplicate
  };
}

export function getSessionRewards(durationMinutes, userCollection, isPro = false) {
  let numRolls = 1; // default
  
  if (durationMinutes >= 60) numRolls = 4;
  else if (durationMinutes >= 45) numRolls = 3;
  else if (durationMinutes >= 25) numRolls = 2;
  
  let allRewards = {
    bonusXP: 0,
    cosmetics: [],
    boosters: [],
    numRolls: numRolls,
    duplicatesConverted: 0
  };
  
  // Roll multiple times
  for (let i = 0; i < numRolls; i++) {
    let roll = generateBonusLoot(userCollection, isPro);
    
    // Aggregate XP
    allRewards.bonusXP += roll.bonusXP;
    
    // Collect cosmetics
    if (roll.cosmetic && !roll.wasDuplicate) {
      allRewards.cosmetics.push(roll.cosmetic);
    }
    
    // Collect boosters
    if (roll.booster) {
      allRewards.boosters.push(roll.booster);
    }
    
    // Track duplicates
    if (roll.wasDuplicate) {
      allRewards.duplicatesConverted++;
    }
  }
  
  return allRewards;
}

export function formatRewardsDisplay(rewards) {
  let display = '🎉 Bonus Loot!\n';
  
  if (rewards.bonusXP > 0) {
    display += `• +${rewards.bonusXP} Bonus XP\n`;
  }
  
  if (rewards.booster) {
    display += `• ${rewards.booster.multiplier}x XP Booster (${rewards.booster.duration} min) [Activate] [Save]\n`;
  }
  
  if (rewards.cosmetic) {
    const emoji = rewards.rarity === 'legendary' ? '✨' : rewards.rarity === 'rare' ? '⭐' : '🎖️';
    const itemType = rewards.cosmeticType === 'title' ? 'Title' : 'Avatar';
    const name = rewards.cosmetic.title || rewards.cosmetic.name;
    const animated = rewards.cosmetic.animated ? ' (Animated)' : '';
    display += `• ${emoji} New ${itemType}: "${name}"${animated} (${rewards.rarity})\n`;
  }
  
  if (rewards.wasDuplicate) {
    display += `• (Duplicate "${rewards.duplicateName}" converted to XP)\n`;
  }
  
  return display;
}

// Example Usage (for testing):
if (typeof window === 'undefined') {
  // Only run in Node.js environment (not browser)
  const userCollection = {
    titles: ['night-owl'], 
    avatars: ['warrior_01', 'skeleton_01'],
  };

  const isPro = false;

  console.log('=== SESSION 1 (25 min - 2 rolls) ===');
  let rewards1 = getSessionRewards(25, userCollection, isPro);
  console.log('Rolls:', rewards1.numRolls);
  console.log('Total Bonus XP:', rewards1.bonusXP);
  console.log('Cosmetics:', rewards1.cosmetics);
  console.log('Boosters:', rewards1.boosters); 

  console.log('\n=== SESSION 2 (60 min - 4 rolls) ===');
  let rewards2 = getSessionRewards(60, userCollection, true); // Pro user
  console.log('Rolls:', rewards2.numRolls);
  console.log('Total Bonus XP:', rewards2.bonusXP);
  console.log('Cosmetics:', rewards2.cosmetics);
  console.log('Boosters:', rewards2.boosters);
}