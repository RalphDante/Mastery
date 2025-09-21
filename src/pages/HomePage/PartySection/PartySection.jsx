import React, { useState, useEffect } from 'react';

function PartySection() {
  // Mock party data - replace with real data from your backend
  const [partyMembers, setPartyMembers] = useState([
    { 
      id: 1, 
      name: "You", 
      level: 12, 
      hp: 85, 
      maxHP: 100, 
      isOnline: true,
      streak: 5,
      isCurrentUser: true,
      exp: 10,
      mana: 10
    },
    { 
      id: 2, 
      name: "Sarah", 
      level: 15, 
      hp: 100, 
      maxHP: 100, 
      isOnline: true,
      streak: 12,
      exp: 10,
      mana: 10
    },
    { 
      id: 3, 
      name: "Mike", 
      level: 8, 
      hp: 65, 
      maxHP: 100, 
      isOnline: false,
      streak: 3,
      exp: 10,
      mana: 10
    },
    { 
      id: 4, 
      name: "Alex", 
      level: 10, 
      hp: 90, 
      maxHP: 100, 
      isOnline: true,
      streak: 7 
    },
    { 
      id: 5, 
      name: "Lisa", 
      level: 6, 
      hp: 45, 
      maxHP: 100, 
      isOnline: false,
      streak: 1 
    },
    // { 
    //   id: 6, 
    //   name: "Tom", 
    //   level: 4, 
    //   hp: 30, 
    //   maxHP: 100, 
    //   isOnline: false,
    //   streak: 0 
    // }
  ]);

  return (
    <div className="w-full h-40 bg-slate-800 rounded-lg p-4 flex items-center justify-between text-slate-100 relative">
      
      

      {/* Party Members Grid */}
      {/* <div className="flex-1 grid grid-cols-6 gap-3 mx-6"> */}
        <div className="flex flex-row w-96 items-center space-y-2">
            {/* Avatar */}
            <div className="relative">
              <div className={`w-24 h-24 border-2 overflow-hidden mr-2 ${
                partyMembers[0].isCurrentUser 
                  ? 'border-blue-400' 
                  : partyMembers[0].isOnline 
                    ? 'border-green-400' 
                    : 'border-slate-600'
              }`}>
                <img 
                  src="/images/avatars/default-avatar.png" 
                  alt={partyMembers[0].name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to colored circle with initial
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div 
                  className={`w-full h-full rounded-full flex items-center justify-center text-white font-bold text-sm ${
                    partyMembers[0].isCurrentUser ? 'bg-blue-600' : 'bg-slate-600'
                  }`}
                  style={{ display: 'none' }}
                >
                  {partyMembers[0].name.charAt(0)}
                </div>
              </div>
              
              
            </div>
            
            <div className='flex flex-col w-full'>
                {/* Member Info */}
                <div className="text-center">
                <p className={`text-xs font-medium ${
                    partyMembers[0].isCurrentUser ? 'text-blue-400' : 'text-slate-300'
                }`}>
                    {partyMembers[0].name}
                </p>
                <p className="text-xs text-slate-400">Lv.{partyMembers[0].level}</p>
                </div>

                
                <div className="w-full flex flex-col gap-3">
                    {/* HP Bar */}
                    <div className="w-full bg-slate-700 rounded-full h-1.5">
                        <div 
                        className={`h-full rounded-full transition-all duration-300 bg-red-500`}
                        style={{ width: `${partyMembers[0].hp}%` }}
                        ></div>
                    </div>
                    {/* EXP */}
                    <div className="w-full bg-slate-700 rounded-full h-1.5">
                        <div 
                        className={`h-full rounded-full transition-all duration-300 bg-yellow-500`}
                        style={{ width: `${partyMembers[0].exp}%` }}
                        ></div>
                    </div>
                    {/* Mana */}
                    <div className="w-full bg-slate-700 rounded-full h-1.5">
                        <div 
                        className={`h-full rounded-full transition-all duration-300 bg-blue-500`}
                        style={{ width: `${partyMembers[0].mana}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-slate-500 text-center mt-1">
                        {partyMembers[0].streak > 0 ? `${partyMembers[0].streak} day streak` : 'No streak'}
                    </p>
                </div>
            </div>
            
          </div>
        
        
        {partyMembers.map((member) => (
          <div key={member.id} className="flex flex-row items-center space-y-2">
            {/* Avatar */}
            <div className="relative">
              <div className={`w-24 h-24 border-2 overflow-hidden mr-2 ${
                member.isCurrentUser 
                  ? 'border-blue-400' 
                  : member.isOnline 
                    ? 'border-green-400' 
                    : 'border-slate-600'
              }`}>
                <img 
                  src="/images/avatars/default-avatar.png" 
                  alt={member.name}
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
                  {member.name.charAt(0)}
                </div>
              </div>
              
              
            </div>
            
            
            
          </div>
        ))}
      {/* </div> */}

      {/* Party Actions */}
      <div className="flex flex-col space-y-2">
        <button className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded transition-colors">
          Party Chat
        </button>
        <button className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors">
          Invite Member
        </button>
      </div>
    </div>
  );
}

export default PartySection;