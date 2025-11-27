import { useState } from "react";
import { Crown } from "lucide-react";
import { useAuthContext } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { AVATARS, getAvatarPath } from "../../configs/avatarConfig";

function AvatarSelection({selectedAvatar, setSelectedAvatar}) {
    const {userProfile} = useAuthContext();
    const currentUser = userProfile;

    const navigate = useNavigate();
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    
    const isPro = currentUser.subscription?.tier === "pro";

    const handleAvatarClick = (avatar) => {
        // Check if avatar is premium and user is not pro
        if (avatar.isPremium && !isPro) {
            setShowUpgradeModal(true);
            return;
        }
        
        setSelectedAvatar(avatar.id);
        console.log("Avatar selected:", avatar.id);
    };

    const handleUpgrade = () => {
        console.log("Redirecting to upgrade page...");
        setShowUpgradeModal(false);
        navigate('/pricing');
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                    Choose Your Avatar
                </label>
                
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                    {AVATARS.map((avatar) => (
                        <button
                            key={avatar.id}
                            type="button"
                            onClick={() => handleAvatarClick(avatar)}
                            className={`
                                relative aspect-square rounded-lg border-2 transition-all
                                hover:scale-105 hover:shadow-lg
                                ${selectedAvatar === avatar.id 
                                    ? 'border-purple-500 bg-purple-500/20' 
                                    : 'border-slate-700 bg-slate-800 hover:border-slate-600'
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
                                <p className="text-[10px] text-white text-center font-medium truncate">
                                    {avatar.name}
                                </p>
                            </div>

                            {/* Premium Badge */}
                            {avatar.isPremium && (
                                <div className="absolute top-1 right-1">
                                    <Crown className="w-3 h-3 text-yellow-400" />
                                </div>
                            )}

                            {/* Selected Indicator */}
                            {selectedAvatar === avatar.id && (
                                <div className="absolute top-1 left-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Upgrade Modal */}
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

export default AvatarSelection;