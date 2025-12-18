// avatarConfig.js
export const AVATARS = [
  // Starter avatars (given at signup, not droppable)
  { 
    id: "warrior_01", 
    name: "Warrior", 
    isPremium: false,
    format: "png",
    rarity: "starter",
    droppable: false
  },
  { 
    id: "warrior_02", 
    name: "Warrior II", 
    isPremium: false,
    format: "webp",
    rarity: "starter",
    droppable: false
  },
  { 
    id: "warrior_03", 
    name: "Warrior", 
    isPremium: false,
    format: "webp",
    rarity: "starter",
    droppable: false
  },
  { 
    id: "wizard_01", 
    name: "Wizard", 
    isPremium: false,
    format: "webp",
    rarity: "starter",
    droppable: false
  },
  { 
    id: "wizard_02", 
    name: "Wizard", 
    isPremium: false,
    format: "webp",
    rarity: "starter",
    droppable: false
  },


  // Droppable avatars - FREE TIER
  {
    id: "skeleton_01", 
    name: "Skeleton", 
    isPremium: false,
    format: "webp",
    rarity: "rare",
    droppable: true
  },
  {
    id: "necromancer_01", 
    name: "Dark Wizard", 
    isPremium: false,
    format: "webp",
    rarity: "legendary",
    droppable: true
  },

  // Droppable avatars - PRO ONLY (animated)
  { 
    id: "golem_01", 
    name: "Golem", 
    isPremium: true,
    format: "webp",
    rarity: "rare",
    droppable: false,
    animated: true
  },
  { 
    id: "knight-idle", 
    name: "Knight", 
    isPremium: true,
    format: "gif",
    rarity: "legendary",
    droppable: false,
    animated: true
  },
  { 
    id: "wizard_ruined", 
    name: "Wizard", 
    isPremium: true,
    format: "webp",
    rarity: "legendary",
    droppable: true,
    animated: true
  }
];

// Helper: Get droppable avatars by rarity and premium status
export const getDroppableAvatars = (rarity, isPro = false) => {
  return AVATARS.filter(avatar => 
    avatar.droppable === true &&
    avatar.rarity === rarity &&
    (isPro || !avatar.isPremium) // If not pro, exclude premium avatars
  );
};


// Helper function to get avatar format by ID
export const getAvatarFormat = (avatarId) => {
  const avatar = AVATARS.find(a => a.id === avatarId);
  return avatar?.format || 'png'; // default to png if not found
};

// Helper function to get avatar by ID
export const getAvatarById = (avatarId) => {
  return AVATARS.find(a => a.id === avatarId);
};

// Helper function to get avatar path
export const getAvatarPath = (avatarId) => {
  const avatar = getAvatarById(avatarId);
  if (!avatar) return null;
  
  return `/images/avatars/${avatarId}.${avatar.format}`;
};

// Export for backward compatibility (if needed elsewhere)
export const AVATAR_FORMATS = AVATARS.reduce((acc, avatar) => {
  acc[avatar.id] = avatar.format;
  return acc;
}, {});

