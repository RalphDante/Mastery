// src/pages/Leaderboard/LeaderboardPage.jsx
import { Trophy, Clock, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLeaderboard } from "../../contexts/LeaderboardContext";
import { useUserDataContext } from "../../contexts/UserDataContext"; // ← Add this
import LeaderboardList from "./LeaderboardList";
import { useEffect, useState } from "react";
import { useAuthContext } from "../../contexts/AuthContext";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export default function LeaderboardPage() {
  const {
    activeTab,
    setActiveTab,
    weeklyData,
    monthlyData,
    loading,
    loadMore,
  } = useLeaderboard();

  const { todaySession } = useUserDataContext(); // ← Add this
  const navigate = useNavigate();
  const data = activeTab === "weekly" ? weeklyData : monthlyData;
  const {userProfile} = useAuthContext();

  // ────── Countdown to next midnight UTC ──────
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const nextMidnightUTC = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0, 0, 0
      ));
      const diff = nextMidnightUTC.getTime() - now.getTime();
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${hours}h ${minutes}m`);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, []);

  // ────── User state ──────
  const isPro = userProfile?.subscription?.tier === 'pro';
  const minutesToday = todaySession?.minutesStudied ?? 0; // ← Use real-time today data
  const hasRank = !!data?.currentUserRank;

  // ────── Last updated ──────
  const getLastUpdated = () => {
    const now = new Date();
    return `${MONTHS[now.getUTCMonth()]} ${now.getUTCDate()}, ${now.getUTCFullYear()} 00:00 UTC`;
  };

  // ────── LOADING STATE ──────
  if (loading && !data?.topUsers?.length) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-slate-400">
        Loading leaderboard...
      </div>
    );
  }

  // ────── EMPTY STATE (First day of week/month) ──────
  if (!data?.topUsers?.length) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-purple-400 flex items-center gap-2">
                <Trophy className="w-7 h-7 text-yellow-400" />
                Hall of Heroes
              </h1>
              <p className="text-slate-400 text-sm">
                Top scholars battling their way to mastery!
              </p>
            </div>
            <button
              onClick={() => navigate("/")}
              className="text-slate-400 hover:text-purple-300 transition-colors text-sm self-start sm:self-center"
            >
              Back to Dashboard
            </button>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {["weekly", "monthly"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  activeTab === tab
                    ? "bg-purple-600 text-white"
                    : "bg-slate-800 border border-slate-700 text-slate-300 hover:bg-purple-600 hover:text-white"
                }`}
              >
                {tab === "weekly" ? "This Week" : "This Month"}
              </button>
            ))}
          </div>

          {/* Motivational Empty State */}
          <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-8 text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full border border-purple-500/30">
              <Clock className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-300">
                Leaderboard starts {timeLeft.toLowerCase()}
              </span>
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-white">
                Be the First to Claim the Throne!
              </h2>
              <p className="text-slate-400 max-w-md mx-auto">
                The {activeTab === "weekly" ? "week" : "month"} just started. 
                Your study time today will count toward rankings after the first update at midnight UTC.
              </p>
            </div>

            {/* Today's Progress */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 max-w-sm mx-auto">
              <div className="text-slate-400 text-sm mb-1">Your progress today</div>
              <div className="text-4xl font-bold text-emerald-400">
                {minutesToday}m
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {minutesToday === 0 
                  ? "Start now to lead the pack!" 
                  : "You're already on your way!"}
              </div>
            </div>

            {/* Pro Badge */}
            {isPro && (
              <div className="flex justify-center">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                  <Crown className="w-3 h-3" />
                  PRO READY TO DOMINATE
                </span>
              </div>
            )}

            {/* CTA */}
            <button
              onClick={() => navigate("/")}
              className="w-full max-w-sm mx-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg text-lg"
            >
              Start Studying Now
            </button>
          </div>

          {/* Update Info */}
          <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700 text-center">
            <p className="text-xs text-slate-500">
              Updates every midnight UTC • First update: <strong>{getLastUpdated()}</strong>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ────── NORMAL LEADERBOARD (existing) ──────
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-purple-400 flex items-center gap-2">
              <Trophy className="w-7 h-7 text-yellow-400" />
              Hall of Heroes
            </h1>
            <p className="text-slate-400 text-sm">
              Top scholars battling their way to mastery!
            </p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="text-slate-400 hover:text-purple-300 transition-colors text-sm self-start sm:self-center"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {["weekly", "monthly"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                activeTab === tab
                  ? "bg-purple-600 text-white"
                  : "bg-slate-800 border border-slate-700 text-slate-300 hover:bg-purple-600 hover:text-white"
              }`}
            >
              {tab === "weekly" ? "This Week" : "This Month"}
            </button>
          ))}
        </div>

        {/* Compact Update Bar */}
        <div className="bg-slate-800/70 rounded-xl p-3 border border-slate-700">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-xs text-slate-400">
            <div className="flex items-center gap-2 flex-wrap">
              <span>Last updated: <strong>{getLastUpdated()}</strong></span>
              <span className="hidden sm:inline">•</span>
              <span className="text-purple-400">
                Next update in <strong>{timeLeft}</strong>
              </span>
            </div>

            <div className="flex items-center gap-3 text-right">
              {minutesToday > 0 && !hasRank && (
                <span className="text-emerald-400 italic">
                  {minutesToday} min today — check tomorrow!
                </span>
              )}
              {minutesToday === 0 && !hasRank && (
                <span className="text-purple-300 italic">
                  Study to rank up!
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

        {/* Leaderboard List */}
        <LeaderboardList
          users={data.topUsers}
          currentUserRank={data.currentUserRank}
          periodId={data.periodId}
          loadingMore={loading && data.topUsers.length > 0}
          hasMore={data.hasMore}
        />

        {/* Load More */}
        <div className="text-center">
          <button
            onClick={loadMore}
            disabled={loading || !data.hasMore}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition"
          >
            {loading 
              ? "Loading..." 
              : !data.hasMore && !isPro && data.topUsers.length >= 25
              ? "Upgrade to Pro for full leaderboard"
              : !data.hasMore
              ? "No more players to show"
              : "Load More"}
          </button>
        </div>
      </div>
    </div>
  );
}