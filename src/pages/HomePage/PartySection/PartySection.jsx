import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuthContext } from '../../../contexts/AuthContext';
import { getExpProgressForCurrentLevel } from '../../../utils/playerStatsUtils';
import { PLAYER_CONFIG } from '../../../utils/playerStatsUtils';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import EditProfile from '../../../components/EditProfile/EditProfile';
import { usePartyContext } from '../../../contexts/PartyContext';
import InviteModal from './InviteModal';
import PartyInfoSection from './PartyInfoSection';
import { leaveParty, togglePartyPrivacy } from '../../../utils/partyUtils';
import LimitReachedModal from '../../../components/Modals/LimitReachedModal';
import { getAvatarPath } from '../../../configs/avatarConfig';
import AvatarWithPlatform from '../../../components/AvatarWithPlatform';
import { getDisplayTitle, getProgressionTitle } from '../../../configs/titlesConfig';

function PartySection() {

  const {user, refreshUserProfile, userProfile} = useAuthContext();

  // Profile in firestore
  const currentUserPersonalProfile = userProfile;
  const currentUserIsPro = currentUserPersonalProfile?.subscription?.tier === "pro";

  const [showLimitModal, setShowLimitModal] = useState(false);
  const {partyProfile, partyMembers, refreshPartyProfile} = usePartyContext();
  const [showModal, setShowModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);


  // Party Profile
  const currentUser = user?.uid ? partyMembers[user.uid] : null;
  const currentUserStreak = currentUser?.streak || 0;

  // Personal Profile


  // Title
  const currentProgressionTitle = getProgressionTitle(currentUserPersonalProfile?.level);
  const displayedTitle = currentUserPersonalProfile?.title 
  ? getDisplayTitle({
      level: currentUserPersonalProfile?.level,
      title: currentUserPersonalProfile?.title
    })
  : currentProgressionTitle;

  const navigate = useNavigate();

  // Handler for toggling privacy
  const handleTogglePrivacy = async () => {
    if (!partyProfile?.id || !user?.uid) return;
    

    // Make it so that the LimitModal is at the front
    if(!currentUserIsPro && partyProfile?.isPublic){
      setShowLimitModal(true);
      // setShowModal(false);
      return;
    }
    setIsLoading(true);
    try {
      const result = await togglePartyPrivacy(partyProfile.id, user.uid);
      
      // Refresh party profile to get updated data
      await refreshPartyProfile();
      
      // Show success message
      alert(result.message);
      
    } catch (error) {
      console.error('Failed to toggle privacy:', error);
      alert(error.message || 'Failed to change party privacy');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for leaving party
  const handleLeaveParty = async () => {
    if (!user?.uid || !userProfile) return;
    
    // Confirm before leaving
    const confirmed = window.confirm(
      'Are you sure you want to leave this party? You will be moved to a new party.'
    );
    
    if (!confirmed) return;
    
    setIsLoading(true);
    try {
      const result = await leaveParty(
        user.uid,
        userProfile.displayName,
        {
          level: userProfile.level,
          exp: userProfile.exp,
          health: userProfile.health,
          mana: userProfile.mana,
          avatar: userProfile.avatar
        }
      );
      
      window.location.href = "/"
      
    } catch (error) {
      console.error('Failed to leave party:', error);
      alert(error.message || 'Failed to leave party');
    } finally {
      setIsLoading(false);
    }
  };

  // Convert object to array of members with their userId
  const partyMembersArray = Object.entries(partyMembers).map(([userId, data]) => ({
    userId,
    ...data
  }));



  // Calculate EXP progress for current level
  const expProgress = currentUser 
    ? getExpProgressForCurrentLevel(currentUser.exp, currentUser.level)
    : { percentage: 0 };

  // Filter out current user from the list
  const otherMembers = partyMembersArray.filter(m => m.userId !== user?.uid);

  const openInviteModal = ()=>{
    setShowInviteModal(true);
  }
  const openModal = () => {
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  // Calculate exp progress for any member
  const getExpProgressForMember = (member) => {
    return getExpProgressForCurrentLevel(member.exp, member.level);
  };

  return (
    <>
    {showLimitModal && (
      <LimitReachedModal 
        limitType='party'
        onClose={setShowLimitModal}
      />

    )}
    <div>
      <div className="w-full h-30 flex bg-slate-800 rounded-t-lg md:rounded-lg p-4 flex items-center justify-between text-slate-100 relative">
        


        {/* User Profile */}
        <div className="flex flex-row w-full md:w-96 md:mr-8 items-center">
          {/* Avatar */}

          <AvatarWithPlatform
            avatar={currentUser?.avatar}
            displayName={currentUser?.displayName}
            tier={currentUser?.tier}
            streak={currentUserStreak}
            size="large"
            onClick={openModal}
          />
          
          <div className='flex flex-col w-full'>
            {/* User Info */}
            <div className="text-left">
              <div className='flex flex-row items-center align-center gap-1'>
                <p className={`text-xs font-medium text-blue-400`}>
                  {currentUser?.displayName}
                </p>
                <EditProfile />
              </div>

              <p className="text-xs text-slate-400">Lv.{currentUser?.level} - <span style={{color: displayedTitle?.color}}>{displayedTitle?.title}</span></p>

            </div>

            <div className='flex flex-col w-full gap-2'>
              {/* HP Bar */}
              <div className="flex items-center">
                <div className="flex-1 bg-slate-700 h-3 relative overflow-hidden">
                  <div 
                    className="h-full transition-all duration-300 bg-red-500"
                    style={{ width: `${currentUser?.health}%` }}
                  ></div>
                </div>
                <p className="text-xs text-slate-400 min-w-[60px] text-right">
                  {currentUser?.health}/{PLAYER_CONFIG.BASE_HEALTH}
                </p>
              </div>

              {/* EXP Bar */}
              <div className="flex items-center">
                <div className="flex-1 bg-slate-700 h-3 relative overflow-hidden">
                  <div 
                    className="h-full transition-all duration-300 bg-yellow-500"
                    style={{ width: `${Math.min(100, expProgress.percentage)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-slate-400 min-w-[60px] text-right">
                  {Math.floor(expProgress.current)}/{expProgress.required}
                </p>
              </div>

              {/* Mana Bar */}
              <div className="flex items-center">
                <div className="flex-1 bg-slate-700 h-3 relative overflow-hidden">
                  <div 
                    className="h-full transition-all duration-300 bg-blue-500"
                    style={{ width: `${currentUser?.mana}%` }}
                  ></div>
                </div>
                <p className="text-xs text-slate-400 min-w-[60px] text-right">
                  {currentUser?.mana}/{PLAYER_CONFIG.BASE_MANA}
                </p>
              </div>
            </div>
          </div>
        </div>
        

        {/* Party Members */}
        <div className="hidden md:flex flex-1 items-center gap-3 overflow-x-auto scrollbar-hide">         
          {Object.entries(partyMembers)
            .filter(([userId]) => userId !== user?.uid)
            .map(([userId, member]) => (
              <div 
                key={userId} 
                className="flex flex-row items-center cursor-pointer hover:opacity-80 transition-opacity"
                onClick={openModal}
              >
                {/* Avatar */}
                <AvatarWithPlatform
                  key={userId}
                  avatar={member?.avatar}
                  displayName={member?.displayName}
                  tier={member?.tier}
                  streak={member?.streak || 0}
                  size="large"
                  onClick={openModal}
                />
              </div>
            ))
          }
        </div>

        {/* Party Actions */}
        <div className="flex flex-col space-y-2">
          <button 
            onClick={openModal}
            className="hidden md:block px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded transition-colors"
          >
            View Party
          </button>
          <button 
            onClick={openInviteModal}
            className="hidden md:block px-3 py-1 bg-blue-700 hover:bg-blue-600 text-slate-200 text-sm rounded transition-colors"
          >
            Invite to Party
          </button>

        </div>
      </div>
      
      <button 
        onClick={openModal}
        className="md:hidden w-full flex justify-center items-center p-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-b-lg transition-colors"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>

      

      {/* Party Members Modal - Using Portal */}
      {showModal && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
          onClick={closeModal}
        >
          <div 
            className="bg-slate-800 rounded-lg max-w-xl w-full max-h-[80vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            

            <PartyInfoSection
              partyProfile={partyProfile}
              user={user}
              onInvite={() => {setShowInviteModal(true)}}
              onLeave={handleLeaveParty}
              onTogglePrivacy={handleTogglePrivacy}
              closeModal={closeModal}
              isLoading={isLoading}
            />

            {/* Members List */}
            <div className="p-4 flex flex-col gap-4">
              {partyMembersArray.map((member) => {
                const memberExpProgress = getExpProgressForMember(member);
                const isCurrentUser = member.userId === user?.uid;
                const memberTitle = getDisplayTitle({
                  level: member.level,
                  title: member.title,
                });
                return (
                  <div 
                    key={member.userId}
                    className={`flex flex-row items-center gap-4 p-3 rounded-lg bg-slate-700/50 border-2 border-slate-600`}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <AvatarWithPlatform
                        avatar={member?.avatar}
                        displayName={member?.displayName}
                        tier={member?.tier}
                        streak={member?.streak || 0}
                        size="large"
                      />
                    </div>

                    {/* Stats */}
                    <div className="flex-1 flex flex-col gap-2">
                      {/* Name and Level */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className='flex flex-row gap-1 items-center'>
                            <p className={`text-sm font-medium ${
                              isCurrentUser ? 'text-blue-400' : 'text-slate-200'
                            }`}>
                              {member.displayName}
                              
                              
                            </p>
                            {isCurrentUser && <span className="ml-2 text-xs text-blue-300">(You)</span>}
                            {member?.tier === "pro" ? 
                                <img
                                  src="/images/icons/pro-badge.png"
                                  className="w-8 h-8 hover:cursor-pointer"
                                  onClick={()=>navigate("/pricing")}
                                />
                                : ""
                              }
                          </div>
                          
                          <p className="text-xs text-slate-400">
                            Lv.{member.level} - 
                            {memberTitle && (
                              <span style={{ color: memberTitle.color }}>
                                {' '}{memberTitle.title}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* HP Bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-900 h-3 relative overflow-hidden rounded">
                          <div 
                            className="h-full transition-all duration-300 bg-red-500"
                            style={{ width: `${(member.health / PLAYER_CONFIG.BASE_HEALTH) * 100}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-slate-300 min-w-[70px] text-right">
                          {member.health}/{PLAYER_CONFIG.BASE_HEALTH}
                        </p>
                      </div>

                      {/* EXP Bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-900 h-3 relative overflow-hidden rounded">
                          <div 
                            className="h-full transition-all duration-300 bg-yellow-500"
                            style={{ width: `${Math.min(100, memberExpProgress.percentage)}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-slate-300 min-w-[70px] text-right">
                          {Math.floor(memberExpProgress.current)}/{memberExpProgress.required}
                        </p>
                      </div>

                      {/* Mana Bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-900 h-3 relative overflow-hidden rounded">
                          <div 
                            className="h-full transition-all duration-300 bg-blue-500"
                            style={{ width: `${(member.mana / PLAYER_CONFIG.BASE_MANA) * 100}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-slate-300 min-w-[70px] text-right">
                          {member.mana}/{PLAYER_CONFIG.BASE_MANA}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}

      <InviteModal 
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        partyId={partyProfile?.id}
        partyTitle={partyProfile?.title || "Your Party"}
      />
    </>
  );
}

export default PartySection;