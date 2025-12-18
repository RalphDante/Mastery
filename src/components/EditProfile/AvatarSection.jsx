import { useState } from "react";
import { Crown } from "lucide-react";
import { useAuthContext } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { AVATARS, getAvatarPath } from "../../configs/avatarConfig";
import LimitReachedModal from "../Modals/LimitReachedModal";

function AvatarSelection({selectedAvatar, setSelectedAvatar}) {
    const {userProfile} = useAuthContext();
    const currentUser = userProfile;

    const navigate = useNavigate();
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [hoveredAvatar, setHoveredAvatar] = useState(null);
    
    const isPro = currentUser?.subscription?.tier === "pro";
    const unlockedAvatars = currentUser?.unlockedAvatars || [];

    // Helper function to check if avatar is unlocked
    const isAvatarUnlocked = (avatar) => {
        // Starter avatars are always unlocked
        if (avatar.rarity === "starter") return true;
        
        // Premium avatars require pro subscription
        if (avatar.isPremium && !isPro) return false;
        
        // Droppable avatars need to be in unlockedAvatars array
        if (avatar.droppable) {
            return unlockedAvatars.includes(avatar.id);
        }
        
        // Non-droppable, non-premium avatars are unlocked
        return true;
    };

    // Helper function to get tooltip text for locked avatars
    const getTooltipText = (avatar) => {
        if (avatar.isPremium && !isPro) {
            return "Obtainable by upgrading to Pro";
        }
        if (avatar.droppable && !unlockedAvatars.includes(avatar.id)) {
            return "Obtainable through loot boxes from session completions";
        }
        return null;
    };

    const handleAvatarClick = (avatar) => {
        const unlocked = isAvatarUnlocked(avatar);
        
        // If locked and premium, show upgrade modal
        if (avatar.isPremium && !isPro) {
            setShowUpgradeModal(true);
            return;
        }
        
        // If locked and droppable (not yet obtained), don't allow selection
        if (!unlocked) {
            return;
        }
        
        setSelectedAvatar(avatar.id);
        console.log("Avatar selected:", avatar.id);
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                    Choose Your Avatar
                </label>
                
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                    {AVATARS.map((avatar) => {
                        const unlocked = isAvatarUnlocked(avatar);
                        const isSelected = selectedAvatar === avatar.id;
                        const tooltipText = getTooltipText(avatar);
                        const isHovered = hoveredAvatar === avatar.id;
                        
                        return (
                            <div
                                key={avatar.id}
                                className="relative"
                                onMouseEnter={() => setHoveredAvatar(avatar.id)}
                                onMouseLeave={() => setHoveredAvatar(null)}
                            >
                                <button
                                    type="button"
                                    onClick={() => handleAvatarClick(avatar)}
                                    className={`
                                        relative aspect-square rounded-lg border-2 transition-all w-full
                                        ${unlocked 
                                            ? 'hover:scale-105 hover:shadow-lg cursor-pointer' 
                                            : avatar.isPremium && !isPro
                                                ? 'cursor-pointer hover:scale-105 hover:border-purple-500/50'
                                                : 'cursor-not-allowed'
                                        }
                                        ${isSelected && unlocked
                                            ? 'border-purple-500 bg-purple-500/20' 
                                            : unlocked
                                                ? 'border-slate-700 bg-slate-800 hover:border-slate-600'
                                                : 'border-slate-800 bg-slate-900/50'
                                        }
                                    `}
                                >
                                    {/* Avatar Preview */}
                                    <div className="w-full h-full flex items-center justify-center">
                                        <div className={`
                                            w-full h-auto flex items-center justify-center text-xl
                                            ${avatar.isPremium 
                                                ? 'bg-gradient-to-br from-purple-600 to-pink-600' 
                                                : 'bg-slate-700'
                                            }
                                            ${!unlocked && !avatar.isPremium ? 'grayscale opacity-40' : ''}
                                        `}>
                                            <img 
                                                src={getAvatarPath(avatar.id)}
                                                alt={avatar.name}
                                                className="w-full h-full p-2 object-cover"
                                            /> 
                                        </div>
                                    </div>
                                    
                                    {/* Avatar Name */}
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-1.5">
                                        <p className={`text-[10px] text-center font-medium truncate ${
                                            unlocked ? 'text-white' : 'text-slate-500'
                                        }`}>
                                            {avatar.name}
                                        </p>
                                    </div>

                                    {/* Premium Badge */}
                                    {avatar.isPremium && (
                                        <div className="absolute top-1 right-1">
                                            <Crown className="w-3 h-3 text-yellow-400" />
                                        </div>
                                    )}

                                    {/* Lock Icon for locked avatars (only non-premium) */}
                                    {!unlocked && !avatar.isPremium && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                                            <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                        </div>
                                    )}

                                    {/* Selected Indicator */}
                                    {isSelected && unlocked && (
                                        <div className="absolute top-1 left-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                </button>

                                {/* Tooltip */}
                                {!unlocked && !avatar.isPremium && tooltipText && isHovered && (
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 pointer-events-none">
                                        <div className="bg-slate-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-xl border border-slate-700">
                                            {tooltipText}
                                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                                <div className="border-4 border-transparent border-t-slate-900"></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Upgrade Modal */}
            {showUpgradeModal && (
                 <LimitReachedModal 
                    limitType="avatars"
                    onClose={() => setShowUpgradeModal(false)}
                />
                
            )}
        </div>
    );
}

export default AvatarSelection;