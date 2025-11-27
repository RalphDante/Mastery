// avatarConfig.js - Single source of truth for all avatars
export const AVATARS = [
  // Free avatars
  { 
    id: "warrior_01", 
    name: "Warrior", 
    isPremium: false,
    format: "png"
  },
  { 
    id: "wizard_01", 
    name: "Wizard", 
    isPremium: false,
    format: "webp"
  },
  { 
    id: "wizard_02", 
    name: "Wizard", 
    isPremium: false,
    format: "webp"
  },
  { 
    id: "warrior_02", 
    name: "Warrior II", 
    isPremium: false,
    format: "webp"
  },
  { 
    id: "warrior_03", 
    name: "Warrior III", 
    isPremium: false,
    format: "webp"
  },
  { 
    id: "golem_01", 
    name: "Golem", 
    isPremium: true,
    format: "gif"
  },
  
  // Premium avatars
  { 
    id: "knight-idle", 
    name: "Knight", 
    isPremium: true,
    format: "gif"
  },
];

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