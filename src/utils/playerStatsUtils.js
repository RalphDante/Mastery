export const PLAYER_CONFIG = {
  BASE_EXP: 100,
  GROWTH_RATE: 1.15,
  EXP_PER_MINUTE: 10,
  LEVEL_UP_COIN_BONUS: 50,

  // HP
  BASE_HEALTH: 100,
  HEALTH_PER_MINUTE: 1,
  
  // Mana
  BASE_MANA: 100,
  MANA_PER_MINUTE: 3,

  // Flashcard Rewards ⚡
  FLASHCARD_REWARDS: {
    CORRECT: {
      exp: 15,
      damage: 15,
      health: 2,
      mana: 5
    },
    INCORRECT: {
      exp: 5,
      damage: 5,
      health: 0,
      mana: 2
    }
  }
};


export const getExpForLevel = (level) => {
  // EXP required to go from (level-1) to level
  if (level <= 1) return 0;
  return Math.floor(PLAYER_CONFIG.BASE_EXP * Math.pow(PLAYER_CONFIG.GROWTH_RATE, level - 2));
};

export const getTotalExpForLevel = (targetLevel) => {
  // Total accumulated EXP needed to reach this level
  let totalExp = 0;
  for (let i = 2; i <= targetLevel; i++) {
    totalExp += getExpForLevel(i);
  }
  return totalExp;
};

export const getLevelFromTotalExp = (totalExp) => {
  // Given total EXP, what level should the player be?
  let currentLevel = 1;
  let expAccumulated = 0;
  
  while (true) {
    const expNeededForNextLevel = getExpForLevel(currentLevel + 1);
    if (expAccumulated + expNeededForNextLevel > totalExp) {
      break;
    }
    expAccumulated += expNeededForNextLevel;
    currentLevel++;
  }
  
  return currentLevel;
};


export const getExpProgressForCurrentLevel = (totalExp, currentLevel) => {
  // How much EXP toward next level?
  const expForCurrentLevel = getTotalExpForLevel(currentLevel);
  const expForNextLevel = getTotalExpForLevel(currentLevel + 1);
  const progressExp = totalExp - expForCurrentLevel;
  const requiredExp = expForNextLevel - expForCurrentLevel;
  
  return {
    current: progressExp,
    required: requiredExp,
    percentage: (progressExp / requiredExp) * 100
  };
};

export const calculateLevelUp = (oldExp, newExp, oldLevel) => {
  // Returns level up info
  const newLevel = getLevelFromTotalExp(newExp);
  const leveledUp = newLevel > oldLevel;
  const levelsGained = leveledUp ? newLevel - oldLevel : 0;
  
  return {
    newLevel,
    leveledUp,
    levelsGained,
    coinBonus: levelsGained * PLAYER_CONFIG.LEVEL_UP_COIN_BONUS
  };
};