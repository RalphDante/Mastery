import { createPortal } from "react-dom";
import { generateBonusLoot } from "../../configs/rewardsConfig";
import { useState } from "react";
import { applyRewardsToUser } from "../../utils/rewardsService";

const RARITY_COLORS = {
  uncommon: {
    text: 'text-green-400',
    bg: 'from-green-500 to-emerald-600',
    glow: 'shadow-green-500/50'
  },
  rare: {
    text: 'text-blue-400',
    bg: 'from-blue-500 to-cyan-600',
    glow: 'shadow-blue-500/50'
  },
  legendary: {
    text: 'text-purple-400',
    bg: 'from-purple-500 to-pink-600',
    glow: 'shadow-purple-500/50'
  }
};

function RewardDisplay({ reward }) {
  const rarityStyle = reward.rarity ? RARITY_COLORS[reward.rarity] : null;
  
  return (
    <div className="flex flex-col items-center gap-4 my-8 animate-in fade-in zoom-in duration-500">
      {/* Main reward display */}
      {reward.cosmetic && (
        <>
          <div className={`w-32 h-32 bg-gradient-to-br ${rarityStyle?.bg || 'from-amber-500 to-orange-600'} rounded-2xl flex items-center justify-center shadow-2xl ${rarityStyle?.glow} transform hover:rotate-3 transition-all`}>
            <div className="text-6xl">
              {reward.cosmeticType === 'title' ? '🏆' : '👤'}
            </div>
          </div>
          
          <div className="text-center max-w-sm">
            <p className="text-gray-400 text-sm uppercase tracking-wider mb-1">
              {reward.cosmeticType === 'title' ? 'Title' : 'Avatar'}
            </p>
            <p className={`text-3xl font-bold ${rarityStyle?.text || 'text-amber-400'} mb-2`}>
              {reward.cosmetic.title || reward.cosmetic.name}
            </p>
            {reward.cosmetic.animated && (
              <span className="inline-block px-3 py-1 bg-pink-500/20 text-pink-300 rounded-full text-xs uppercase tracking-wide mb-2">
                ✨ Animated
              </span>
            )}
            <div className="flex items-center justify-center gap-2">
              <span className={`inline-block px-3 py-1 ${rarityStyle?.bg ? `bg-gradient-to-r ${rarityStyle.bg}` : 'bg-amber-500'} text-white rounded-full text-xs uppercase tracking-wide font-semibold`}>
                {reward.rarity || 'Common'}
              </span>
            </div>
          </div>
        </>
      )}
      
      {/* Bonus XP (only show if no cosmetic or as bonus with cosmetic) */}
      {reward.bonusXP > 0 && !reward.cosmetic && (
        <>
          <div className="w-32 h-32 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-yellow-500/50 transform hover:rotate-3 transition-all">
            <div className="text-6xl">⭐</div>
          </div>
          <div className="text-center">
            <p className="text-gray-400 text-sm uppercase tracking-wider">Bonus XP</p>
            <p className="text-4xl font-bold text-yellow-400">+{reward.bonusXP}</p>
          </div>
        </>
      )}
      
      {/* Booster */}
      {reward.booster && (
        <>
          <div className="w-32 h-32 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-orange-500/50 transform hover:rotate-3 transition-all">
            <div className="text-6xl">🚀</div>
          </div>
          <div className="text-center">
            <p className="text-gray-400 text-sm uppercase tracking-wider">XP Booster</p>
            <p className="text-4xl font-bold text-orange-400">{reward.booster.multiplier}x XP</p>
            <p className="text-sm text-gray-400 mt-1">{reward.booster.duration} minutes</p>
          </div>
        </>
      )}
      
      {/* Duplicate conversion notice */}
      {reward.wasDuplicate && (
        <div className="mt-4 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-blue-300">
            Duplicate "{reward.duplicateName}" converted to +{reward.bonusXP} XP
          </p>
        </div>
      )}
      
      {/* Bonus XP with cosmetic */}
      {reward.bonusXP > 0 && reward.cosmetic && (
        <div className="mt-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-sm text-yellow-300">
            ✨ Bonus: +{reward.bonusXP} XP
          </p>
        </div>
      )}
    </div>
  );
}

function RewardsSummary({ rewards }) {
  const totalXP = rewards.reduce((sum, r) => sum + (r.bonusXP || 0), 0);
  const cosmetics = rewards.filter(r => r.cosmetic && !r.wasDuplicate);
  const boosters = rewards.filter(r => r.booster);
  const duplicates = rewards.filter(r => r.wasDuplicate);

  return (
    <div className="w-full max-w-md bg-slate-800/50 rounded-xl p-6 border border-slate-700 mb-6">
      <h3 className="text-xl font-bold text-center mb-4 text-green-400">Total Rewards</h3>
      <div className="space-y-3">
        {/* Total XP */}
        {totalXP > 0 && (
          <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
            <span className="text-gray-300 flex items-center gap-2">
              <span className="text-2xl">⭐</span>
              Bonus XP
            </span>
            <span className="text-xl font-bold text-yellow-400">+{totalXP}</span>
          </div>
        )}
        
        {/* Cosmetics */}
        {cosmetics.length > 0 && (
          <div className="py-2 border-b border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300 flex items-center gap-2">
                <span className="text-2xl">🎨</span>
                Cosmetics
              </span>
              <span className="text-xl font-bold text-purple-400">{cosmetics.length}</span>
            </div>
            <div className="space-y-1 ml-8">
              {cosmetics.map((reward, idx) => (
                <div key={idx} className="text-sm text-gray-400 flex items-center justify-between">
                  <span>
                    {reward.cosmeticType === 'title' ? '🏆' : '👤'} 
                    {reward.cosmetic.title || reward.cosmetic.name}
                    {reward.cosmetic.animated && ' ✨'}
                  </span>
                  <span className={`text-xs uppercase ${RARITY_COLORS[reward.rarity]?.text || 'text-gray-500'}`}>
                    {reward.rarity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Boosters */}
        {boosters.length > 0 && (
          <div className="py-2 border-b border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300 flex items-center gap-2">
                <span className="text-2xl">🚀</span>
                Boosters
              </span>
              <span className="text-xl font-bold text-orange-400">{boosters.length}</span>
            </div>
            <div className="space-y-1 ml-8">
              {boosters.map((reward, idx) => (
                <div key={idx} className="text-sm text-gray-400">
                  {reward.booster.multiplier}x XP for {reward.booster.duration} min
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Duplicates converted */}
        {duplicates.length > 0 && (
          <div className="py-2">
            <span className="text-gray-400 text-sm">
              💎 {duplicates.length} duplicate{duplicates.length > 1 ? 's' : ''} converted to XP
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function LootRevealModal({ numRolls, userCollection, userId, isPro, onClose }) {
  const [currentRoll, setCurrentRoll] = useState(0);
  const [allRewards, setAllRewards] = useState([]);
  const [isRolling, setIsRolling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  
  const handleRoll = () => {
    setIsRolling(true);
    
    // Chest opening animation (1-1.5 seconds)
    setTimeout(() => {
      const reward = generateBonusLoot(userCollection, isPro);
      // Don't save yet - just collect the reward
      setAllRewards(prev => [...prev, reward]);
      setIsRolling(false);
      setCurrentRoll(prev => prev + 1);
    }, 1500);
  };
  
  const handleClaimRewards = async () => {
    setIsSaving(true);
    setError(null);
    
    try {
      // Aggregate all rewards
      const aggregatedRewards = {
        bonusXP: 0,
        cosmetics: [],
        boosters: [],
        numRolls: allRewards.length,
        duplicatesConverted: 0
      };
      
      allRewards.forEach(reward => {
        aggregatedRewards.bonusXP += reward.bonusXP || 0;
        
        if (reward.cosmetic && !reward.wasDuplicate) {
          aggregatedRewards.cosmetics.push(reward.cosmetic);
        }
        
        if (reward.booster) {
          aggregatedRewards.boosters.push(reward.booster);
        }
        
        if (reward.wasDuplicate) {
          aggregatedRewards.duplicatesConverted++;
        }
      });
      
      // Save to Firestore
      await applyRewardsToUser(userId, aggregatedRewards);
      
      // Close modal after successful save
      onClose();
    } catch (err) {
      console.error('Failed to save rewards:', err);
      setError('Failed to save rewards. Please try again.');
      setIsSaving(false);
    }
  };
  
  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
      <div className="bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 border border-slate-700">
        {currentRoll < numRolls ? (
          // Still have rolls left
          <div className="flex flex-col items-center">
            <h2 className="text-3xl font-bold text-white mb-2">
              Bonus Loot! ({currentRoll + 1}/{numRolls})
            </h2>
            <p className="text-gray-400 mb-6">
              You earned {numRolls} roll{numRolls > 1 ? 's' : ''} for completing your session!
            </p>
            
            {isRolling ? (
              <div className="flex flex-col items-center gap-4 my-8">
                <div className="w-32 h-32 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-amber-500/50">
                  <img 
                    src="/images/icons/chest.webp"
                    alt="A chest opening"
                    className="w-full p-2 h-full object-cover"
                  />
                </div>
                <p className="text-xl text-gray-300 animate-pulse">Opening chest...</p>
              </div>
            ) : (
              <>
                {/* Show current reward */}
                {allRewards[currentRoll - 1] && (
                  <RewardDisplay reward={allRewards[currentRoll - 1]} />
                )}
                
                <button 
                  onClick={handleRoll}
                  className="mt-8 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold text-lg rounded-xl hover:scale-105 transition-transform shadow-lg shadow-purple-500/50"
                >
                  {currentRoll === 0 ? 'Open Chest' : 'Next Roll'}
                </button>
              </>
            )}
          </div>
        ) : (
          // All rolls complete
          <div className="flex flex-col items-center">
            <h2 className="text-3xl font-bold text-white mb-6">
              All Rewards Claimed!
            </h2>
            
            <RewardsSummary rewards={allRewards} />
            
            {error && (
              <div className="w-full max-w-md mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-300 text-center">{error}</p>
              </div>
            )}
            
            <div className="flex gap-4">
              <button 
                onClick={handleClaimRewards}
                disabled={isSaving}
                className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-lg rounded-xl hover:scale-105 transition-transform shadow-lg shadow-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Claim All Rewards'}
              </button>
            </div>
            
            <p className="text-sm text-gray-500 mt-4">
              Your rewards will be added to your inventory
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default LootRevealModal;