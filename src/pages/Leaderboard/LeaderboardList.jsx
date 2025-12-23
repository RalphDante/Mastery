// components/LeaderboardList.jsx
import { Trophy, Flame, X, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';
import { getAvatarPath } from '../../configs/avatarConfig';
import { getDisplayTitle } from '../../configs/titlesConfig';
import { useState } from 'react';


function PlayerDetailModal({ player, rank, onClose }) {
  if (!player) return null;

  const hoursPlayed = Math.floor((player.minutes || 0) / 60);
  const minutesRemainder = (player.minutes || 0) % 60;
  const avatarPath = getAvatarPath(player.avatar);


  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-slate-800 border-2 border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        

        {/* Header */}
        <div className="relative flex items-center gap-4 mb-6">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-1 right-1 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="relative">
            {player.avatar ? (
              <img
                src={avatarPath}
                alt={player.displayName}
                className="w-20 h-20 rounded-full border-4 border-purple-500"
              />
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full border-4 border-purple-500 flex items-center justify-center text-3xl font-bold text-white">
                {player.displayName?.charAt(0) || '?'}
              </div>
            )}
            {player.isPro && (
              <div className="absolute -bottom-1 -right-1 w-8 h-8">
                <div className="w-full h-full bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-xs font-bold border-2 border-slate-800">
                  PRO
                </div>
              </div>
            )}
          </div>

          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-100 mb-1">
              {player.displayName || 'Anonymous'}
            </h2>
            <div className="flex items-center gap-2 text-slate-400">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span>Rank #{rank}</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Level */}
          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
            <div className="text-slate-400 text-sm mb-1">Level</div>
            <div className="text-2xl font-bold text-purple-400">
              {player.level || 0}
            </div>
          </div>

          {/* EXP */}
          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
            <div className="text-slate-400 text-sm mb-1">Experience</div>
            <div className="text-2xl font-bold text-yellow-400">
              {player.exp?.toLocaleString() || 0}
            </div>
          </div>

          {/* Streak */}
          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
            <div className="text-slate-400 text-sm mb-1 flex items-center gap-1">
              <Flame className="w-4 h-4" />
              Streak
            </div>
            <div className="text-2xl font-bold text-orange-400">
              {player.streak || 0} days
            </div>
          </div>

          {/* Time Played */}
          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
            <div className="text-slate-400 text-sm mb-1 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Time Played
            </div>
            <div className="text-2xl font-bold text-blue-400">
              {hoursPlayed}h {minutesRemainder}m
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-4 border border-purple-700/50">
          <div className="text-center">
            <div className="text-slate-300 text-sm mb-1">Total Minutes Played</div>
            <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              {player.minutes?.toLocaleString() || 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeaderboardList({ users, currentUserRank, periodId, loadingMore = false }) {
  const navigate = useNavigate();

  const { userProfile } = useAuthContext();
  const isPro = userProfile?.subscription?.tier === 'pro';
  
  const MAX_FREE_USERS = 25;
  const canLoadMore = isPro || users.length < MAX_FREE_USERS;

  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedRank, setSelectedRank] = useState(null);

  const handlePlayerClick = (player, rank) => {
    setSelectedPlayer(player);
    setSelectedRank(rank);
  };

  const handleCloseModal = () => {
    setSelectedPlayer(null);
    setSelectedRank(null);
  };

  if (!users || users.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        No players yet. Be the first!
      </div>
    );
  }

  const handleProClick = (e) => {
    e.stopPropagation();
    navigate('/pricing');
  };

  return (
    <div className="bg-slate-800/70 border border-slate-700 rounded-2xl shadow-lg overflow-hidden">
      {/* Header - Hidden on mobile, shown on md+ */}
      <div className="hidden md:grid md:grid-cols-[80px_1fr_120px_100px_120px] px-4 py-3 text-sm font-semibold text-slate-400 border-b border-slate-700">
        <span>Rank</span>
        <span>Player</span>
        <span>Level</span>
        <span className="text-center">Streak</span>
        <span className="text-right">Exp</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-700">
        {users.map((player, i) => {
          const isTop3 = i < 3;
          const rank = i + 1;
          const isPro = player.isPro;
          const isTopPro = isPro && isTop3;
          const avatarPath = getAvatarPath(player.avatar);
          
          // Get player's title
          const playerTitle = getDisplayTitle({
            level: player.level,
            title: player.title
          });

          return (
            <div
              key={player.userId}
              onClick={() => handlePlayerClick(player, rank)}
                className={`
                  flex flex-col md:grid md:grid-cols-[80px_1fr_120px_100px_120px] gap-3 md:gap-4 px-4 py-4 md:py-3 items-start md:items-center
                  transition-all cursor-pointer hover:bg-slate-700/50
                  ${isTop3 ? 'bg-gradient-to-r from-purple-800/20 to-transparent' : ''}
                  ${isPro && !isTop3 ? 'bg-gradient-to-r from-purple-900/10 to-transparent' : ''}
                  ${isTopPro ? 'ring-2 ring-yellow-500/70' : ''}
                `}
            >
              {/* Rank + Trophy */}
              <div className="flex items-center gap-2 font-semibold w-full md:w-auto">
                {isTop3 && (
                  <Trophy
                    className={`w-5 h-5 md:w-4 md:h-4 ${
                      i === 0
                        ? 'text-yellow-400'
                        : i === 1
                        ? 'text-gray-300'
                        : 'text-amber-600'
                    }`}
                  />
                )}
                <span className="text-slate-200 text-lg md:text-base">#{rank}</span>
              </div>

              {/* Avatar + Name + Title */}
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-shrink-0">
                  {avatarPath ? (
                    <img
                      src={avatarPath}
                      alt={player?.displayName}
                      className="w-14 h-14 md:w-12 md:h-12 object-cover rounded-full border-2 border-slate-600"
                    />
                  ) : (
                    <div className="w-14 h-14 md:w-12 md:h-12 bg-slate-700 rounded-full border-2 border-slate-600" />
                  )}

                  {/* Pro Badge */}
                  {isPro && (
                    <button
                      onClick={handleProClick}
                      className="absolute -top-1 -right-3 w-8 h-8 md:w-7 md:h-7 transform transition-all hover:scale-110 active:scale-95"
                      title="Upgrade to Pro"
                    >
                      <img
                        src="/images/icons/pro-badge.png"
                        alt="PRO"
                        className="w-full h-full object-contain drop-shadow-md"
                      />
                    </button>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-100 truncate">
                    {player.displayName || 'Anonymous'}
                  </p>
                  {/* Title below name */}
                  {playerTitle && (
                    <p 
                      className="text-xs font-medium truncate"
                      style={{ color: playerTitle.color }}
                    >
                      {playerTitle.icon && `${playerTitle.icon} `}
                      {playerTitle.title}
                    </p>
                  )}
                  {/* Show level on mobile only */}
                  <p className="text-xs text-slate-400 md:hidden mt-0.5">
                    Level {player.level || '-'}
                  </p>
                </div>
              </div>

              {/* Level - Hidden on mobile */}
              <span className="hidden md:block text-slate-300 text-center">
                {player.level || '-'}
              </span>

              {/* Streak */}
              <div className="flex items-center justify-center gap-1.5 w-full md:w-auto">
                <Flame 
                  className={`w-5 h-5 md:w-4 md:h-4 ${
                    (player.streak || 0) > 0 ? 'text-orange-500' : 'text-slate-600'
                  }`}
                />
                <span className={`font-semibold ${
                  (player.streak || 0) > 0 ? 'text-orange-400' : 'text-slate-500'
                }`}>
                  {player.streak || 0}
                </span>
                <span className="text-xs text-slate-500 md:hidden">day streak</span>
              </div>

              {/* EXP */}
              <div className="flex justify-between md:justify-end w-full md:w-auto text-right">
                <span className="md:hidden text-slate-400 text-sm">EXP</span>
                <span className="text-yellow-300 font-semibold text-lg md:text-base">
                  {player.exp?.toLocaleString() || 0}
                </span>
              </div>
            </div>
          );
        })}

        {/* Loading More */}
        {loadingMore && (
          <div className="px-4 py-3 text-sm text-slate-500 italic text-center">
            Loading more heroes...
          </div>
        )}
      </div>

      {/* Your Rank Footer */}
      {currentUserRank && (
        <div className="px-4 py-3 bg-slate-900/50 border-t border-slate-700 text-sm text-slate-400 text-center">
          You're ranked{' '}
          <span className="text-purple-400 font-bold">#{currentUserRank}</span>{' '}
          this {periodId?.includes('W') ? 'week' : 'month'}. Keep climbing!
        </div>
      )}

      {!isPro && users.length >= 25 && (
        <div className="px-4 py-3 bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-t border-slate-700 text-center">
          <p className="text-sm text-slate-300 mb-2">
            Only <strong>Top 25</strong> shown for free. 
            <strong className="text-purple-300"> Pro unlocks the full leaderboard.</strong>
          </p>
          <button
            onClick={() => navigate('/pricing')}
            className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs font-medium transition"
          >
            Unlock Full Leaderboard
          </button>
        </div>
      )}


      {/* Player Detail Modal */}
      {selectedPlayer && (
        <PlayerDetailModal
          player={selectedPlayer}
          rank={selectedRank}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

export default LeaderboardList;