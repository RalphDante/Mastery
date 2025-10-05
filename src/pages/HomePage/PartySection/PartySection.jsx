import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuthContext } from '../../../contexts/AuthContext';
import { getExpProgressForCurrentLevel } from '../../../utils/playerStatsUtils';
import { PLAYER_CONFIG } from '../../../utils/playerStatsUtils';
import { X } from 'lucide-react';

function PartySection() {
  const {partyProfile, partyMembers, user} = useAuthContext();
  const [showModal, setShowModal] = useState(false);

  // Convert object to array of members with their userId
  const partyMembersArray = Object.entries(partyMembers).map(([userId, data]) => ({
    userId,
    ...data
  }));

  const currentUser = user?.uid ? partyMembers[user.uid] : null;

  // Calculate EXP progress for current level
  const expProgress = currentUser 
    ? getExpProgressForCurrentLevel(currentUser.exp, currentUser.level)
    : { percentage: 0 };

  // Filter out current user from the list
  const otherMembers = partyMembersArray.filter(m => m.userId !== user?.uid);

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
      <div className="w-full h-30 bg-slate-800 rounded-lg p-4 flex items-center justify-between text-slate-100 relative">
        
        <div className="flex flex-row w-96 items-center gap-4 mr-8">
          {/* Avatar */}
          <div 
            className="relative cursor-pointer hover:opacity-80 transition-opacity"
            onClick={openModal}
          >
            <div className={`w-28 h-28 border-2 overflow-hidden bg-slate-700 mr-2 border-purple-500/50`}>
              {
                currentUser?.avatar ? 
                  <img 
                  src={`/images/avatars/${currentUser?.avatar}.png`}
                  alt={currentUser?.displayName}
                  className="w-full h-full object-cover"
                /> :
                ""
              }
            </div>
          </div>
          
          <div className='flex flex-col w-full'>
            {/* Member Info */}
            <div className="text-left">
              <p className={`text-xs font-medium text-blue-400`}>
                {currentUser?.displayName}
              </p>
              <p className="text-xs text-slate-400">Lv.{currentUser?.level}</p>
            </div>

            <div className='flex flex-col w-full gap-2'>
              {/* HP Bar */}
              <div className="flex items-center gap-2">
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
              <div className="flex items-center gap-2">
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
              <div className="flex items-center gap-2">
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
        
        <div className="flex-1 flex items-center gap-3 overflow-x-auto scrollbar-hide">         
          {Object.entries(partyMembers)
            .filter(([userId]) => userId !== user?.uid)
            .map(([userId, member]) => (
              <div 
                key={userId} 
                className="flex flex-row items-center cursor-pointer hover:opacity-80 transition-opacity"
                onClick={openModal}
              >
                {/* Avatar */}
                <div className="relative">
                  <div className={`w-28 h-28 border-2 overflow-hidden mr-2 bg-slate-700 border-slate-600`}>
                    <img 
                      src={`/images/avatars/${member.avatar}.png`} 
                      alt={member.displayName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div 
                      className={`w-full h-full rounded-full flex items-center justify-center text-white font-bold text-sm bg-slate-600`}
                      style={{ display: 'none' }}
                    >
                      {member.displayName.charAt(0)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          }
        </div>

        {/* Party Actions */}
        <div className="flex flex-col space-y-2">
          <button 
            onClick={openModal}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded transition-colors"
          >
            View Party
          </button>
        </div>
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
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 z-10 flex items-center justify-between">
              <h2 className="text-xl font-bold text-purple-400">Party Members</h2>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Members List */}
            <div className="p-4 flex flex-col gap-4">
              {partyMembersArray.map((member) => {
                const memberExpProgress = getExpProgressForMember(member);
                const isCurrentUser = member.userId === user?.uid;
                
                return (
                  <div 
                    key={member.userId}
                    className={`flex flex-row items-center gap-4 p-3 rounded-lg bg-slate-700/50 border-2 border-slate-600`}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-20 h-20 border-2 overflow-hidden bg-slate-700 border-slate-600">
                        {member.avatar ? (
                          <img 
                            src={`/images/avatars/${member.avatar}.png`}
                            alt={member.displayName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div 
                          className="w-full h-full flex items-center justify-center text-white font-bold text-lg bg-slate-600"
                          style={{ display: member.avatar ? 'none' : 'flex' }}
                        >
                          {member.displayName.charAt(0)}
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex-1 flex flex-col gap-2">
                      {/* Name and Level */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-sm font-medium ${
                            isCurrentUser ? 'text-blue-400' : 'text-slate-200'
                          }`}>
                            {member.displayName}
                            {isCurrentUser && <span className="ml-2 text-xs text-blue-300">(You)</span>}
                          </p>
                          <p className="text-xs text-slate-400">Lv.{member.level}</p>
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
    </>
  );
}

export default PartySection;