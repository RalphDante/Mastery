// components/MiniLeaderboard.jsx
import { useLeaderboard } from "../contexts/LeaderboardContext";
import { useUserDataContext } from "../contexts/UserDataContext";
import { useNavigate } from "react-router-dom";
import { Users, Crown, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { getAvatarPath } from "../configs/avatarConfig";

const MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec"
];

export default function MiniLeaderboard() {
  const { weeklyData, loading } = useLeaderboard();
  const { todaySession } = useUserDataContext();
  const navigate = useNavigate();

  // ────── Countdown (same as full page) ──────
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const next = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0,0,0
      ));
      const diff = next.getTime() - now.getTime();
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      setTimeLeft(`${h}h ${m}m`);
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  const getLastUpdated = () => {
    const n = new Date();
    return `${MONTHS[n.getUTCMonth()]} ${n.getUTCDate()}, ${n.getUTCFullYear()} 00:00 UTC`;
  };

  // ────── User state ──────
  const isPro      = weeklyData?.currentUser?.isPro ?? false;
  const minsToday  = todaySession?.minutesStudied ?? 0;
  const expToday = todaySession?.expEarned ?? 0;
  const hasRank    = !!weeklyData?.currentUserRank;

  if (loading) {
    return (
      <div className="text-center py-2 text-slate-400 animate-pulse">
        Loading leaderboard...
      </div>
    );
  }

  // ────── Empty Leaderboard State ──────
  if (!weeklyData?.topUsers?.length) {
    const formatMinutes = (m) => `${m}exp`;
    
    return (
      <div className="mt-4 bg-slate-800/70 border border-slate-700 rounded-2xl p-4 shadow-md">
        {/* ────── Header ────── */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-purple-400 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            Leaderboard
          </h2>
          <button
            onClick={() => navigate("/leaderboard")}
            className="text-sm text-slate-300 hover:text-purple-300 transition-colors"
          >
            View All
          </button>
        </div>

        {/* ────── Motivational Empty State ────── */}
        <div className="text-center py-6 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full border border-purple-500/30">
            <Clock className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">
              Leaderboard starts {timeLeft.toLowerCase()}
            </span>
          </div>

          <div className="space-y-2">
            <h3 className="text-white font-bold text-lg">Be the first on the leaderboard!</h3>
            <p className="text-slate-400 text-sm">
              Your study time will count toward this week's rankings after the first update.
            </p>
          </div>

          {/* ────── Today's Progress ────── */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">Today's progress</span>
              <div className="text-right">
                <div className="text-2xl font-bold text-emerald-400">
                  {formatMinutes(expToday)}
                </div>
                <div className="text-xs text-slate-500">
                  {minsToday === 0 
                    ? "Get started now!" 
                    : `Great work today!`
                  }
                </div>
              </div>
            </div>
          </div>

          {/* ────── Pro Badge ────── */}
          {isPro && (
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <Crown className="w-3 h-3" />
                PRO READY
              </span>
            </div>
          )}

          {/* ────── CTA ────── */}
          <div className="pt-2">
          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="w-full border-2 border-purple-500/30 hover:border-purple-500/50 text-purple-300 hover:text-purple-200 font-medium py-2 px-4 rounded-xl transition-all duration-200 hover:bg-purple-500/10"
          >
            Start Studying Now
          </button>
          </div>
        </div>

        {/* ────── Update Info ────── */}
        <div className="bg-slate-800/30 rounded-xl p-2 border border-slate-700 mt-4">
          <div className="text-xs text-slate-500 text-center">
            <span>Updates every midnight UTC</span>
            <span className="mx-1">•</span>
            <span>First update: <strong>{getLastUpdated()}</strong></span>
          </div>
        </div>
      </div>
    );
  }

  // ────── Normal Leaderboard (existing code) ──────
  const top3 = weeklyData.topUsers.slice(0, 3);
  const format = (m) => (m != null ? `${m}exp` : "0exp");

  return (
    <div className="mt-4 bg-slate-800/70 border border-slate-700 rounded-2xl p-4 shadow-md">
      {/* ────── Header ────── */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-purple-400 flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-400" />
          Leaderboard
        </h2>
        <button
          onClick={() => navigate("/leaderboard")}
          className="text-sm text-slate-300 hover:text-purple-300 transition-colors"
        >
          View All
        </button>
      </div>
      {/* ────── Today's Progress Card ────── */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400 text-sm">Today's Progress</span>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-emerald-400">
              {expToday}exp
            </div>
            <div className="text-xs text-slate-500">
              {minsToday === 0 ? "Start studying!" : "Counts tomorrow"}
            </div>
          </div>
        </div>
      </div>
      

      {/* ────── Top 3 ────── */}
      <div className="space-y-2">
        {top3.map((u, i) => {
          const rankColors = ["text-yellow-400", "text-gray-300", "text-orange-400"];
          const bg = i === 0 ? "bg-slate-900/50" : "bg-slate-900/30";
          const avatarPath = getAvatarPath(u.avatar) || getAvatarPath("warrior_01");

          return (
            <div
              key={u.userId}
              className={`flex items-center justify-between ${bg} p-2 rounded-lg`}
            >
              <div className="flex items-center gap-3">
                <span className={`font-bold ${rankColors[i]}`}>#{i + 1}</span>

                {/* Avatar with Pro check */}
                {u.isPro ? (
                  <div className="relative">
                    <img
                      src={avatarPath}
                      alt={u.displayName}
                      className="w-6 h-6 rounded object-cover"
                    />
                    <Crown className="absolute -top-1 -right-1 w-3 h-3 text-yellow-400 drop-shadow" />
                  </div>
                ) : (
                  <img
                    src={avatarPath}
                    alt={u.displayName}
                    className="w-6 h-6 rounded object-cover"
                  />
                )}

                <span className="font-semibold text-slate-200 truncate max-w-[100px]">
                  {u.displayName || "Anonymous"}
                  {u.isPro && <Crown className="inline w-3 h-3 ml-1 text-yellow-400" />}
                </span>
              </div>

              <span className="text-yellow-300 font-semibold">
                {format(u.exp)}
              </span>
            </div>
          );
        })}
      </div>

      {/* ────── Current User ────── */}
      {hasRank && (
        <>
          <div className="border-t border-slate-700 my-3" />
          <div className="flex items-center justify-between bg-slate-900/40 p-2 rounded-lg border border-slate-700">
            <div className="flex items-center gap-3">
              <span className="font-bold text-purple-300">#{weeklyData.currentUserRank}</span>

              {/* Pro crown on your avatar */}
              {(() => {
                const userAvatarPath = getAvatarPath(weeklyData.currentUserData?.avatar) || getAvatarPath("warrior_01");
                
                return isPro ? (
                  <div className="relative">
                    <img
                      src={userAvatarPath}
                      alt="You"
                      className="w-6 h-6 rounded object-cover"
                    />
                    <Crown className="absolute -top-1 -right-1 w-3 h-3 text-yellow-400 drop-shadow" />
                  </div>
                ) : (
                  <img
                    src={userAvatarPath}
                    alt="You"
                    className="w-6 h-6 rounded object-cover"
                  />
                );
              })()}

              <span className="font-semibold text-slate-200 truncate max-w-[100px]">
                You
                {isPro && <Crown className="inline w-3 h-3 ml-1 text-yellow-400" />}
              </span>
            </div>

            <span className="text-yellow-300 font-semibold">
              {format(weeklyData.currentUserData?.exp)}
            </span>
          </div>
        </>
      )}

      {/* ────── Compact Update Bar (same as full page) ────── */}
      <div className="bg-slate-800/70 rounded-xl p-3 mt-3 border border-slate-700 mb-3">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-xs text-slate-400">
          

          <div className="flex items-center gap-3 text-right">
            {minsToday === 0 && !hasRank && (
              <span className="text-purple-300 italic">Study to rank up!</span>
            )}
            
            {isPro && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <Crown className="w-3 h-3" />
                PRO
              </span>
            )}
            {!isPro && hasRank && (
              <button
                onClick={() => navigate("/pricing")}
                className="text-indigo-400 hover:text-indigo-300 text-xs underline"
              >
                Pro: badge + more
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}