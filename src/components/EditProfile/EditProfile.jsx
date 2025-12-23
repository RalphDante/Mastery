import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuthContext } from "../../contexts/AuthContext";
import { getExpProgressForCurrentLevel, PLAYER_CONFIG } from "../../utils/playerStatsUtils";
import AvatarSelection from "./AvatarSection";
import { db } from "../../api/firebase";
import { setDoc, doc } from "firebase/firestore";
import { usePartyContext } from "../../contexts/PartyContext";
import { useEffect } from "react";
import { useTutorials } from "../../contexts/TutorialContext";
import { X } from "lucide-react";
import { getAvatarPath } from "../../configs/avatarConfig";
import TitlesSection from "./TitlesSection";
import BoostersSection from "./BoostersSection";

function EditProfile() {
    const {user, userProfile, updateUserProfile} = useAuthContext();
    const { updateUserProfile: updatePartyProfile } = usePartyContext();
    const {isTutorialAtStep} = useTutorials();
    const [selectedAvatar, setSelectedAvatar] = useState(userProfile?.avatar || "");
    const [selectedTitle, setSelectedTitle] = useState(userProfile?.title || "");
    const [displayName, setDisplayName] = useState(userProfile?.displayName || "");
    const [showModal, setShowModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [showCustomizeTip, setShowCustomizeTip] = useState(null)
    const tooltipPopupSFX = useRef(null);

    const currentUser = userProfile;

    const expProgress = currentUser 
        ? getExpProgressForCurrentLevel(currentUser.exp, currentUser.level)
        : { percentage: 0 };

    const closeModal = () => setShowModal(false);
    const openModal = () => {setShowModal(true); setDisplayName(userProfile?.displayName)};

    const shouldShowTip = isTutorialAtStep('start-timer', 2);

    useEffect(() => {
      tooltipPopupSFX.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3");
      tooltipPopupSFX.current.volume = 1.0; // Keep it subtle, like your dagger woosh

    }, []);

    useEffect(() => {
        if (shouldShowTip) {
            // Wait 3 seconds before showing the tip
            const showTimer = setTimeout(() => {
              tooltipPopupSFX.current?.play().catch(console.error); // Play on show
              setShowCustomizeTip(true);
            }, 15000);

            // Auto-hide after 3s + 15s = 18s total
            const hideTimer = setTimeout(() => {
                setShowCustomizeTip(false);
            }, 18000);

            return () => {
                clearTimeout(showTimer);
                clearTimeout(hideTimer);
            };
        } else {
            // Hide immediately if condition becomes false
            setShowCustomizeTip(false);
        }
    }, [shouldShowTip]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const currentDisplayName = userProfile?.displayName || "";
        const currentAvatar = userProfile?.avatar || "";
        const userId = user?.uid;
        const lastNameChangeAt = userProfile?.lastNameChangeAt;
        const currentTitle = userProfile?.title;

        // Validate user ID exists
        if (!userId) {
            setSaveError("User ID not found. Please try logging in again.");
            return;
        }

        // Build update object
        let updates = {};
        let hasChanges = false;

        // Check if display name changed (and is valid)
        const trimmedName = displayName?.trim() || "";
        if (trimmedName && currentDisplayName !== trimmedName) {
            // ✅ Validate length (3-10 characters)
            if (trimmedName.length < 3) {
                setSaveError("Display name must be at least 3 characters long.");
                return;
            }
            if (trimmedName.length > 16) {
                setSaveError("Display name must be 10 characters or less.");
                return;
            }
            
            // ✅ Check 7-day cooldown for name changes
            if (lastNameChangeAt) {
                const lastChangeDate = lastNameChangeAt.toDate ? lastNameChangeAt.toDate() : lastNameChangeAt;
                const daysSinceLastChange = (new Date() - lastChangeDate) / (1000 * 60 * 60 * 24);
                const daysRemaining = Math.ceil(7 - daysSinceLastChange);
                
                if (daysSinceLastChange < 7) {
                    setSaveError(`You can change your display name again in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}.`);
                    return;
                }
            }
            
            // ✅ Add both displayName AND timestamp
            updates.displayName = trimmedName;
            updates.lastNameChangeAt = new Date();
            hasChanges = true;
        }

        // Check if avatar changed (and is valid) - NO cooldown for avatar
        if (selectedAvatar && currentAvatar !== selectedAvatar) {
            updates.avatar = selectedAvatar;
            hasChanges = true;
        }

        if (selectedTitle && currentTitle !== selectedTitle) {
            updates.title = selectedTitle;
            hasChanges = true;
        }

        // If no changes, just close
        if (!hasChanges) {
            console.log("No changes detected");
            closeModal();
            return;
        }

        // Save changes
        setIsSaving(true);
        setSaveError(null);
        
        try {
            console.log("Saving updates:", updates);
            const userRef = doc(db, "users", userId);
            await setDoc(userRef, updates, { merge: true });
            
            // ✅ Update the context so UI reflects changes immediately
            updateUserProfile(updates);
            updatePartyProfile(updates);
            
            console.log(`✅ Profile updated successfully`, updates);
            closeModal();
        } catch (error) {
            console.error("❌ Error updating profile:", error);
            setSaveError(error.message || "Failed to save changes. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
    <>  
      <div className="relative">
        <button
          onClick={openModal}
          className={`p-2 hover:bg-slate-700 rounded-lg transition-colors`}
          aria-label="Edit Profile"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-auto" viewBox="0 0 256 256">
            <path fill="currentColor" d="m230.14 70.54l-44.68-44.69a20 20 0 0 0-28.29 0L33.86 149.17A19.85 19.85 0 0 0 28 163.31V208a20 20 0 0 0 20 20h44.69a19.86 19.86 0 0 0 14.14-5.86L230.14 98.82a20 20 0 0 0 0-28.28M93 180l71-71l11 11l-71 71Zm-17-17l-11-11l71-71l11 11Zm-24 10l15.51 15.51L83 204H52Zm140-70l-39-39l18.34-18.34l39 39Z"/>
          </svg>
        </button>

        {/* Chat bubble tooltip */}
        {showCustomizeTip && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 z-30 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="relative bg-slate-900 text-white rounded-xl p-2 shadow-lg shadow-purple-500/20 border border-slate-700 min-w-[160px]">
              
              {/* Better spaced text */}
              <p className="text-slate-200 text-sm text-center leading-normal">
                <span className="block font-medium">Let's customize</span>
                <span className="block text-slate-300">your character!</span>
              </p>

              {/* Speech bubble tail */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-900 border-l border-t border-slate-700 transform rotate-45"></div>
            </div>
          </div>
        )}
      </div>

      {showModal && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div 
            className="bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative shadow-2xl border border-slate-700 scale-90 sm:scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between z-10">
              <h2 className="text-lg sm:text-xl font-bold text-white">Edit Profile</h2>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-white transition-colors p-1"
                aria-label="Close"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* User Profile Card */}
              <div className="bg-slate-900/50 rounded-lg p-4 sm:p-6 border border-slate-700/50">
                <div className="flex flex-col md:flex-row gap-4 sm:gap-6">
                  {/* Avatar Section */}
                  <div className="flex flex-col items-center gap-2 sm:gap-3">
                    <div className="relative group">
                      <div className="w-24 h-24 sm:w-32 sm:h-32 border-2 border-purple-500/50 rounded-lg overflow-hidden bg-slate-700 flex items-center justify-center hover:border-purple-400 transition-colors">
                        {selectedAvatar && (
                          <img 
                            src={getAvatarPath(selectedAvatar)}
                            alt={currentUser?.displayName}
                            className="w-full h-full p-2 object-cover"
                          />
                        )}
                      </div>
                      
                      {/* Pro badge */}
                      {currentUser?.subscription?.tier === "pro" && (
                        <img
                          src="/images/icons/pro-badge.png"
                          alt="Pro"
                          className="absolute -top-2 -right-2 w-10 h-10 object-cover"
                        />
                      )}
                      
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-lg flex items-center justify-center">
                        <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">
                      Preview
                    </p>
                  </div>

                  {/* Stats Section */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <p className="text-lg font-semibold text-blue-400">
                        {displayName || currentUser?.displayName}
                      </p>
                      <span className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300">
                        Lv.{currentUser?.level}
                      </span>
                    </div>

                    {/* Stat Bars */}
                    <div className="space-y-3">
                      {/* HP Bar */}
                      <div>
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                          <span className="font-medium">Health</span>
                          <span>{currentUser?.health}/{PLAYER_CONFIG.BASE_HEALTH}</span>
                        </div>
                        <div className="bg-slate-700 h-4 rounded-full overflow-hidden">
                          <div 
                            className="h-full transition-all duration-300 bg-gradient-to-r from-red-600 to-red-500 rounded-full"
                            style={{ width: `${currentUser?.health}%` }}
                          />
                        </div>
                      </div>

                      {/* EXP Bar */}
                      <div>
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                          <span className="font-medium">Experience</span>
                          <span>{Math.floor(expProgress.current)}/{expProgress.required}</span>
                        </div>
                        <div className="bg-slate-700 h-4 rounded-full overflow-hidden">
                          <div 
                            className="h-full transition-all duration-300 bg-gradient-to-r from-yellow-600 to-yellow-500 rounded-full"
                            style={{ width: `${Math.min(100, expProgress.percentage)}%` }}
                          />
                        </div>
                      </div>

                      {/* Mana Bar */}
                      <div>
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                          <span className="font-medium">Mana</span>
                          <span>{currentUser?.mana}/{PLAYER_CONFIG.BASE_MANA}</span>
                        </div>
                        <div className="bg-slate-700 h-4 rounded-full overflow-hidden">
                          <div 
                            className="h-full transition-all duration-300 bg-gradient-to-r from-blue-600 to-blue-500 rounded-full"
                            style={{ width: `${currentUser?.mana}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Edit Section */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-300">
                      What should we call you?
                    </label>
                    {userProfile?.lastNameChangeAt && (() => {
                      const lastChangeDate = userProfile.lastNameChangeAt.toDate 
                        ? userProfile.lastNameChangeAt.toDate() 
                        : userProfile.lastNameChangeAt;
                      const daysSinceLastChange = (new Date() - lastChangeDate) / (1000 * 60 * 60 * 24);
                      const daysRemaining = Math.ceil(7 - daysSinceLastChange);
                      
                      if (daysSinceLastChange < 7) {
                        return (
                          <span className="text-xs text-amber-400 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            Can change in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={16}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Enter your display name"
                  />
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-slate-500">3-16 characters</span>
                    <span className={`text-xs ${displayName.length === 16 ? 'text-red-400' : displayName.length > 8 ? 'text-amber-400' : 'text-slate-500'}`}>
                      {displayName.length}/16
                    </span>
                  </div>
                </div>
                
                <TitlesSection 
                  selectedTitle={selectedTitle}
                  setSelectedTitle={setSelectedTitle}
                />
                {/* Avatar Selection Preview */}
                <AvatarSelection 
                    selectedAvatar={selectedAvatar}
                    setSelectedAvatar={setSelectedAvatar}
                />

                <BoostersSection />


              

                {/* Error Message */}
                {saveError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
                    <p className="text-sm text-red-400">{saveError}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isSaving}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSaving}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      , document.body)}
    </>
  );
}

export default EditProfile;