// components/LeaderboardList.jsx
import { Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';

function LeaderboardList({ users, currentUserRank, periodId, loadingMore = false }) {
  const navigate = useNavigate();

  const { userProfile } = useAuthContext();
  const isPro = userProfile?.subscription?.tier === 'pro';
  
  const MAX_FREE_USERS = 25;
  const canLoadMore = isPro || users.length < MAX_FREE_USERS;

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
      <div className="hidden md:grid md:grid-cols-4 px-4 py-3 text-sm font-semibold text-slate-400 border-b border-slate-700">
        <span>Rank</span>
        <span>Player</span>
        <span>Level</span>
        <span className="text-right">Minutes</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-700">
        {users.map((player, i) => {
          const isTop3 = i < 3;
          const rank = i + 1;
          const isPro = player.isPro;
          const isTopPro = isPro && isTop3;

          return (
            <div
              key={player.userId}
              className={`
                flex flex-col md:grid md:grid-cols-4 gap-3 md:gap-0 px-4 py-4 md:py-3 items-start md:items-center
                transition-all cursor-default
                ${isTop3 ? 'bg-gradient-to-r from-purple-800/20 to-transparent' : ''}
                ${isPro && !isTop3 ? 'bg-gradient-to-r from-purple-900/10 to-transparent' : ''}
                ${isTopPro ? 'ring-2 ring-yellow-500/70' : ''}
              `}
            >
              {/* Mobile: Rank + Trophy at top */}
              <div className="flex items-center gap-2 font-semibold w-full md:w-auto md:justify-start">
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

              {/* Avatar + Name + Pro Badge */}
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-shrink-0">
                  {player.avatar === 'knight-idle' ? (
                    <img
                      src={`/images/premium-avatars/knight-idle.gif`}
                      alt={player?.displayName}
                      className="w-14 h-14 md:w-12 md:h-12 object-cover rounded-full border-2 border-slate-600"
                    />
                  ) : (
                    <img
                      src={`/images/avatars/${player.avatar}.png`}
                      alt={player?.displayName}
                      className="w-14 h-14 md:w-12 md:h-12 object-cover rounded-full border-2 border-slate-600"
                    />
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
                  <p className="text-xs text-slate-400 md:hidden">
                    Level {player.level || '-'}
                  </p>
                </div>
              </div>

              {/* Level - Hidden on mobile (shown in name block) */}
              <span className="hidden md:block text-slate-300">{player.level || '-'}</span>

              {/* Minutes */}
              <div className="flex justify-between md:justify-end w-full md:w-auto text-right">
                <span className="md:hidden text-slate-400 text-sm">Minutes</span>
                <span className="text-purple-300 font-semibold text-lg md:text-base">
                  {player.minutes?.toLocaleString() || 0}
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
          You’re ranked{' '}
          <span className="text-purple-400 font-bold">#{currentUserRank}</span>{' '}
          this {periodId?.includes('W') ? 'week' : 'month'}. Keep climbing!
        </div>
      )}

      {!isPro && users.length >= 25 && (
        <div className="px-4 py-3 bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-t border-slate-700 text-center">
          <p className="text-sm text-slate-300 mb-2">
            Only <strong>Top 25</strong> shown for free. 
            <strong className="text-purple-300">Pro unlocks the full leaderboard.</strong>
          </p>
          <button
            onClick={() => navigate('/pricing')}
            className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs font-medium transition"
          >
            Unlock Full Leaderboard
          </button>
        </div>
      )}
    </div>
  );
}

export default LeaderboardList;