// titlesConfig.js
export const PROGRESSION_TITLES = [
  { id: "progression-1",  min: 1,   max: 5,   title: "Novice",   color: "#9E9E9E", rarity: "common" },
  { id: "progression-6",  min: 6,   max: 10,  title: "Skilled",  color: "#4CAF50", rarity: "common" },
  { id: "progression-11", min: 11,  max: 15,  title: "Expert",   color: "#2196F3", rarity: "uncommon" },
  { id: "progression-16", min: 16,  max: 20,  title: "Master",   color: "#FF9800", rarity: "rare" },
  { id: "progression-21", min: 21,  max: 25,  title: "Legend",   color: "#9C27B0", rarity: "rare" },
  { id: "progression-26", min: 26,  max: Infinity, title: "Mythic", color: "#E91E63", rarity: "legendary" },
];

export const SPECIAL_TITLES = {
  // User-specific
  founder: { 
    id: "founder",
    title: "Founder", 
    color: "#FFD700", 
    icon: "👑", 
    rarity: "Legendary",
    isPremium: true,
    gradient: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)"
  },
  champion2025: { 
    id: "champion2025",
    title: "Champion 2025", 
    color: "#FF2D95", 
    icon: "🏆", 
    rarity: "Event Exclusive",
    gradient: "linear-gradient(135deg, #FF2D95 0%, #FF1744 100%)"
  },
  
  // Role-based
  moderator: { 
    id: "moderator",
    title: "Moderator", 
    color: "#00BCD4", 
    icon: "🔹", 
    rarity: "Staff"
  },
  partner: { 
    id: "partner",
    title: "Partner", 
    color: "#FF9800", 
    icon: "⭐", 
    rarity: "Exclusive",
    isPremium: true
  },
  vip: { 
    id: "vip",
    title: "VIP", 
    color: "#9C27B0", 
    icon: "💎", 
    rarity: "Premium",
    isPremium: true
  },
  
  // Event / seasonal
  halloween2025: { 
    id: "halloween2025",
    title: "Pumpkin King", 
    color: "#FF5722", 
    icon: "🎃", 
    rarity: "Seasonal 2025"
  },
  top1_monthly: { 
    id: "top1_monthly",
    title: "World #1", 
    color: "#E91E63", 
    // icon: "🌍", 
    rarity: "Achievement"
  },
  beta_tester: { 
    id: "beta_tester",
    title: "Beta Legend", 
    color: "#607D8B", 
    icon: "🧪", 
    rarity: "Early Supporter"
  },
  top1_weekly: { 
    id: "top1_weekly",
    title: "The Honored One", 
    color: "#b000e1ff", 
    // icon: "🌍", 
    rarity: "Achievement",
  }
};

export const LOOT_TITLES = {
  uncommon: [
    { id: "night-owl", title: "Night Owl", color: "#9C27B0", icon: "🦉", rarity: "uncommon" },
    { id: "early-bird", title: "Early Bird", color: "#FFC107", icon: "🐦", rarity: "uncommon" },
    { id: "persistent", title: "The Persistent", color: "#4CAF50", icon: "💪", rarity: "uncommon" },
    { id: "focused", title: "Focused Mind", color: "#2196F3", icon: "🎯", rarity: "uncommon" },
  ],
  rare: [
    { id: "cram-master", title: "Cram Master", color: "#FF5722", icon: "📚", rarity: "rare" },
    { id: "unstoppable", title: "The Unstoppable", color: "#E91E63", icon: "🔥", rarity: "rare" },
    { id: "midnight-scholar", title: "Midnight Scholar", color: "#673AB7", icon: "🌙", rarity: "rare" },
  ],
  legendary: [
    { id: "grand-scholar", title: "Grand Scholar", color: "#FFD700", icon: "👑", rarity: "legendary", gradient: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)" },
    { id: "eternal-student", title: "Eternal Student", color: "#00BCD4", icon: "✨", rarity: "legendary", gradient: "linear-gradient(135deg, #00BCD4 0%, #2196F3 100%)" },
  ]
};

// Helper function to get progression title based on level
export const getProgressionTitle = (level = 1) => {
  const rank = [...PROGRESSION_TITLES]
    .reverse()
    .find(t => level >= t.min && (t.max === Infinity || level <= t.max));
  return rank || PROGRESSION_TITLES[0]; // Return full rank object, not just title
};

export const ALL_LOOT_TITLES = Object.values(LOOT_TITLES).flat();


// Helper to get the current display title (checks for custom title override)
export const getDisplayTitle = (userProfile) => {
  const { level = 1, title } = userProfile;

  if (title) {
    // Special titles
    if (SPECIAL_TITLES[title]) {
      return SPECIAL_TITLES[title];
    }

    // Progression titles (only if unlocked)
    const progressionTitle = PROGRESSION_TITLES.find(t => t.id === title);
    if (progressionTitle && level >= progressionTitle.min) {
      return progressionTitle;
    }

    // Loot titles
    const lootTitle = ALL_LOOT_TITLES.find(t => t.id === title);
    if (lootTitle) {
      return lootTitle;
    }
  }

  // Fallback to level-based progression title
  return getProgressionTitle(level);
};

  
 
// Helper: Get droppable titles by rarity
export const getDroppableTitles = (rarity) => {
  return LOOT_TITLES[rarity] || [];
};