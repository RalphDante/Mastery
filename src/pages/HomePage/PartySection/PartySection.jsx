import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../../contexts/AuthContext';
import { getExpProgressForCurrentLevel } from '../../../utils/playerStatsUtils';
import { PLAYER_CONFIG } from '../../../utils/playerStatsUtils';

function PartySection() {
  const {partyProfile, partyMembers, user} = useAuthContext();

  
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

  return (
    <div className="w-full h-30 bg-slate-800 rounded-lg p-4 flex items-center justify-between text-slate-100 relative">
      
      

      {/* Party Members Grid */}
      {/* <div className="flex-1 grid grid-cols-6 gap-3 mx-6"> */}
        <div className="flex flex-row w-96 items-center gap-4 mr-8">
            {/* Avatar */}
            <div className="relative">
              <div className={`w-28 h-28 border-2 overflow-hidden bg-slate-700 mr-2 border-purple-500/50`}>
                {
                  currentUser?.avatar ? 
                    <img 
                    src={`/images/avatars/${currentUser?.avatar}.png`}
                    alt={currentUser?.displayName}x
                    className="w-full h-full object-cover"
                    // onError={(e) => {
                    //   // Fallback to colored circle with initial
                    //   e.target.style.display = 'none';
                    //   e.target.nextSibling.style.display = 'flex';
                    // }}
                  /> :
                  ""
                }
                
                {/* <div 
                  className={`w-full h-full rounded-full flex items-center justify-center text-white font-bold text-sm bg-blue-600`}
                  style={{ display: 'none' }}
                >
                  {currentUser?.displayName.charAt(0)}
                </div> */}
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
            <div key={userId} className="flex flex-row items-center">
                {/* Avatar */}
              <div className="relative">
                <div className={`w-28 h-28 border-2 overflow-hidden mr-2 bg-slate-700 border-slate-600`}>
                    
                  <img 
                    src={`/images/avatars/${member.avatar}.png`} 
                    alt={member.displayName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to colored circle with initial
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div 
                    className={`w-full h-full rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      member.isCurrentUser ? 'bg-blue-600' : 'bg-slate-600'
                    }`}
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
        <button className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded transition-colors">
          View Party
        </button>
        {/* <button className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors">
          Invite Member
        </button> */}
      </div>
    </div>
  );
}

export default PartySection;