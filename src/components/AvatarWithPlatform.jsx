import React from 'react';
import { AVATAR_FORMATS } from '../configs/avatarConfig';

function AvatarWithPlatform({ 
  avatar, 
  displayName, 
  tier, 
  streak, 
  size = 'large', // 'large' or 'small'
  onClick,
  showStreak = true,
  showProBadge = true 
}) {
  
  const sizeClasses = {
    large: 'w-28 h-28',
    small: 'w-20 h-20'
  };

  const streakSizeClasses = {
    large: 'w-8 h-8',
    small: 'w-6 h-6'
  };

  const brickHeightClasses = {
    large: 'h-5',
    small: 'h-4'
  };

  return (
    <div 
      className="relative cursor-pointer hover:opacity-80 transition-opacity"
      onClick={onClick}
    >
      <div className={`${sizeClasses[size]} relative border-2 bg-gradient-to-b from-sky-400 to-sky-300 mr-2 border-purple-500/50`}>
        {avatar && (
          <img 
            src={`/images/avatars/${avatar}.${AVATAR_FORMATS[avatar]}`}
            alt={displayName}
            className="w-full h-full p-2 object-cover brightness-110 contrast-105 relative z-10"
            style={{ imageRendering: 'pixelated' }}
          />
        )}
        
        {/* Brick floor at bottom */}
        <div 
          className={`absolute bottom-0 left-0 right-0 ${brickHeightClasses[size]} z-0`}
          style={{
            imageRendering: 'pixelated',
          }}
        >
          {/* Top brick layer - brownish stone */}
          <div 
            className="absolute top-0 left-0 right-0 h-2"
            style={{
              imageRendering: 'pixelated',
              backgroundImage: `
                repeating-linear-gradient(
                  90deg,
                  #8b7355 0px, #8b7355 10px,
                  #6b5745 10px, #6b5745 11px,
                  #9b8365 11px, #9b8365 21px,
                  #6b5745 21px, #6b5745 22px
                )
              `,
              backgroundSize: '22px 2px',
            }}
          />
          
          {/* Shadow line */}
          <div className="absolute top-2 left-0 right-0 h-px bg-black/40"></div>
          
          {/* Middle brick layer - offset pattern */}
          <div 
            className="absolute top-2 left-0 right-0 h-2"
            style={{
              imageRendering: 'pixelated',
              backgroundImage: `
                repeating-linear-gradient(
                  90deg,
                  #7a6345 0px, #7a6345 10px,
                  #5a4735 10px, #5a4735 11px,
                  #8a7355 11px, #8a7355 21px,
                  #5a4735 21px, #5a4735 22px
                )
              `,
              backgroundSize: '22px 2px',
              backgroundPosition: '11px 0',
            }}
          />
          
          {/* Bottom layer - darker foundation */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-b from-stone-800 to-stone-900"
          />
        </div>
      </div>
      
      {/* Pro badge on top right */}
      {showProBadge && tier === "pro" && (
        <img
          src="/images/icons/pro-badge.png"
          className={`absolute top-0 right-2 ${streakSizeClasses[size]} object-cover`}
        />
      )}
      
      {/* Streak badge with clipping container */}
      {showStreak && streak !== 0 && (
        <div className="absolute -top-2 left-0 right-0 h-8 overflow-hidden pointer-events-none">
          <div className="absolute top-2 left-3 -translate-x-1/2 bg-orange-500 px-2 py-0.5 rounded-full border-2 border-slate-900 flex items-center gap-1 pointer-events-auto">
            <span className="text-xs">🔥</span>
            <span className="text-xs font-bold text-white">{streak}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default AvatarWithPlatform;