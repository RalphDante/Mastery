import { useState } from "react";
import { Crown, Check } from "lucide-react";
import { useAuthContext } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { PROGRESSION_TITLES, SPECIAL_TITLES } from "../../configs/titlesConfig";

const getProgressionTitle = (level = 1) => {
  const rank = [...PROGRESSION_TITLES]
    .reverse()
    .find(t => level >= t.min && (t.max === Infinity || level <= t.max));
  return rank?.title || "Novice";
};



export default function TitlesSection({ selectedTitle, setSelectedTitle }) {
  const { userProfile } = useAuthContext();
  const navigate = useNavigate();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const user = userProfile;
  const level = user?.level || 1;
  const isPro = user?.subscription?.tier === "pro";
  const currentRankTitle = getProgressionTitle(level);


  // Helper: find which progression titles the user has unlocked
  const unlockedProgressionTitles = PROGRESSION_TITLES
  .filter(rank => level >= rank.min)
  .map(rank => ({
    ...rank, // Just spread the whole object - id is already there!
    subtitle: `Level ${rank.min}${rank.max === Infinity ? '+' : `–${rank.max}`}`,
    isProgression: true,
    isCurrent: rank.title === currentRankTitle,
    unlocked: true,
  }));

  const lockedProgressionTitles = PROGRESSION_TITLES
    .filter(rank => level < rank.min)
    .map(rank => ({
      ...rank, // id already included
      subtitle: `Requires Level ${rank.min}`,
      color: "#666",
      isProgression: true,
      unlocked: false,
      locked: true,
  }));

  const specialTitles = (user?.unlockedTitles || [])
    .map(key => {
      const special = SPECIAL_TITLES[key];
      if (!special) return null;
      
      return {
        ...special, // id already included
        isSpecial: true,
        unlocked: true,
      };
    })
    .filter(Boolean);


  const titles = [
  
    ...unlockedProgressionTitles,
    ...lockedProgressionTitles,
    ...specialTitles
  
  ];

  const handleTitleClick = (title) => {
    // Check for premium requirement
    if (title.isPremium && !isPro) {
      setShowUpgradeModal(true);
      return;
    }
    
    // Check if they meet level requirement for progression titles
    if (title.isProgression && title.locked) {
      // They clicked a locked progression title
      return; // Don't allow selection
    }
    
    // Allow selection of:
    // 1. Any progression title they've unlocked (level >= min)
    // 2. Any special title they have access to
    setSelectedTitle(title.id === selectedTitle ? null : title.id);
  };

  const handleUpgrade = () => {
    setShowUpgradeModal(false);
    navigate("/pricing");
  };


  const displayedTitleObj = titles.find(t => 
    t.id === selectedTitle
  );

  return (
    <div className="space-y-6">
      {/* Preview */}
      <div className="bg-slate-800/50 rounded-xl p-6 text-center border border-slate-700">
        <p className="text-slate-400 text-sm mb-2">Preview</p>
        <p 
          style={{ color: displayedTitleObj?.color }}
          className="text-3xl font-bold bg-clip-text text-transparent"
        >
          {displayedTitleObj?.title}
        </p>
      </div>

      {/* Title Grid */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-4">
          Choose Your Title
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {titles.map((title) => {
            const isSelected = 
              (title.id === "current" && !selectedTitle) || 
              selectedTitle === title.id;

            return (
              <button
                key={title.id}
                onClick={() => handleTitleClick(title)}
                disabled={!title.unlocked} // optional: disable locked ones
                className={`
                  relative group rounded-xl border-2 transition-all duration-300 overflow-hidden
                  ${title.unlocked 
                    ? isSelected
                      ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/30'
                      : 'border-slate-700 bg-slate-800/80 hover:border-slate-600'
                    : 'border-slate-800 bg-slate-900/50 opacity-60 cursor-not-allowed'
                  }
                  ${title.isPremium ? 'ring-2 ring-yellow-500/30' : ''}
                `}
              >
                {/* Dynamic Gradient Background (for special/premium titles) */}
                {title.gradient && title.unlocked && (
                  <div 
                    className="absolute inset-0 opacity-20"
                    style={{ background: title.gradient }}
                  />
                )}

                {/* Solid color overlay for progression titles */}
                {title.isProgression && title.unlocked && !title.isSpecial && (
                  <div 
                    className="absolute inset-0 opacity-10"
                    style={{ backgroundColor: title.color }}
                  />
                )}

                <div className="relative p-5 text-center">
                  {/* Icon */}
                  {title.icon && (
                    <div className="text-4xl mb-2">{title.icon}</div>
                  )}

                  {/* Title Name — NOW COLORED BY title.color */}
                  <p 
                    className={`font-semibold text-lg transition-colors ${
                      title.unlocked ? '' : 'text-slate-600'
                    }`}
                    style={{
                      color: title.unlocked 
                        ? title.color
                        : '#94a3b8' // slate-500 for locked
                    }}
                  >
                    {title.title}
                  </p>

                  {/* Subtitle */}
                  <p className={`text-xs mt-1 transition-colors ${
                    title.unlocked ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    {title.subtitle}
                    {title.isCurrent && !title.locked && " ← Current"}
                    {title.locked && " (Locked)"}
                  </p>

                  {/* Premium Crown */}
                  {title.isPremium && (
                    <Crown className="w-5 h-5 text-yellow-400 absolute top-2 right-2" />
                  )}

                  

                  {/* Lock icon for locked titles */}
                  {!title.unlocked && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

                {/* Same Upgrade Modal as before */}
                {showUpgradeModal && (
                  <div 
                    className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm"
                    onClick={() => setShowUpgradeModal(false)}
                >
                    <div 
                        className="bg-gradient-to-br from-slate-800 via-purple-900/20 to-slate-800 rounded-xl max-w-md w-full p-6 sm:p-8 relative shadow-2xl border border-purple-500/30"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Decorative elements */}
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-xl pointer-events-none"></div>
                        
                        {/* Close button */}
                        <button
                            onClick={() => setShowUpgradeModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-10"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Content */}
                        <div className="relative text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-yellow-500/50">
                                <Crown className="w-8 h-8 text-white" />
                            </div>
                            
                            <h3 className="text-2xl font-bold text-white mb-2">
                                Unlock Premium Avatars
                            </h3>
                            
                            <p className="text-slate-300 mb-6 text-sm sm:text-base">
                                Get access to exclusive animated avatars and premium features with Pro!
                            </p>

                            {/* Benefits */}
                            <div className="bg-slate-900/50 rounded-lg p-4 mb-6 text-left space-y-3 border border-slate-700/50">
                                <div className="flex items-start gap-3 text-slate-300">
                                    <div className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="text-sm">All animated premium avatars</span>
                                </div>
                                <div className="flex items-start gap-3 text-slate-300">
                                    <div className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="text-sm">Exclusive premium content & quests</span>
                                </div>
                                <div className="flex items-start gap-3 text-slate-300">
                                    <div className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="text-sm">Priority support & early access</span>
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => setShowUpgradeModal(false)}
                                    className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors order-2 sm:order-1"
                                >
                                    Maybe Later
                                </button>
                                <button
                                    onClick={handleUpgrade}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg font-semibold transition-all shadow-lg shadow-purple-500/50 order-1 sm:order-2"
                                >
                                    Upgrade to Pro
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
      )}
    </div>
  );
}