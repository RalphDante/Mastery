import React from 'react';
import { Clock, TrendingUp, Zap, Award } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useStudyStats } from '../../../contexts/UserDataContext';
import { useAuthContext } from '../../../contexts/AuthContext';
import { usePartyContext } from '../../../contexts/PartyContext';
import { useNavigate } from 'react-router-dom';

function SingularMastery() {
    const { dailySessions, todaySession, currentStreak, longestStreak } = useStudyStats();
    const {userProfile, user} = useAuthContext();
    const {partyMembers} = usePartyContext();

    const currentUser = user?.uid ? partyMembers[user.uid] : null;
    const currentUserStreak = currentUser?.streak || 0;
    const currentUserLongestStreak = currentUser?.longestStreak || 0;

    const isPro = userProfile?.subscription?.tier === 'pro'; 

    const navigate = useNavigate();

   

    const todayStats = { 
        minutesStudied: todaySession?.minutesStudied ?? 0,
        cardsStudied: todaySession.spacedRep + todaySession.cramming,
        currentStreak,
        bestStreak: longestStreak
    };

  // Calculate weekly total and average
  const weeklyTotal = dailySessions.reduce((sum, day) => sum + day.minutesStudied, 0);
  const weeklyAverage = Math.round(weeklyTotal / 7);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataPoint = dailySessions.find(d => d.day === label);
      const isToday = dataPoint?.isToday;
      
      return (
        <div className="bg-slate-800/95 backdrop-blur-sm border border-purple-500/30 rounded-lg p-3 shadow-xl">
          <p className="text-white font-semibold mb-1">
            {label} {isToday && <span className="text-green-400 text-xs ml-1">● Today</span>}
          </p>
          <p className="text-green-400 text-sm font-medium">
            {payload[0].value} minutes
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50 shadow-2xl">
      {/* Header with stats pills */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-s lg:text-xl font-bold text-white flex items-center gap-2">
          {/* <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-white" />
          </div> */}
          Today's Progress
        </h3>
        
        <div className="flex gap-2">
          <div className="bg-purple-500/20 border border-purple-500/30 rounded-full px-3 py-1 flex items-center gap-1.5">
            <span className="text-xs font-semibold text-purple-300">{currentUserStreak} day streak</span>
          </div>
          <div className="bg-amber-500/20 border border-amber-500/30 rounded-full px-3 py-1 flex items-center gap-1.5">
            <span className="text-xs font-semibold text-amber-300">Best: {currentUserLongestStreak}</span>
          </div>
        </div>
      </div>

      {/* Giant minutes display with glow effect */}
      <div className="text-center mb-8 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-green-500/20 blur-3xl" />
        <div className="relative">
          <div className="text-8xl font-black bg-gradient-to-br from-green-400 via-emerald-400 to-green-500 bg-clip-text text-transparent mb-2 tracking-tight drop-shadow-2xl">
            {todayStats.minutesStudied}
          </div>
          <div className="text-lg text-slate-400 font-medium">minutes today</div>
          
          {/* Motivational message */}
          {/* <div className="mt-3 inline-flex items-center gap-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-full px-4 py-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-sm font-semibold text-green-300">
              {todayStats.minutesStudied > weeklyAverage ? "Above average! 🔥" : "Keep pushing! 💪"}
            </span>
          </div> */}
        </div>
      </div>

      {/* Weekly stats bar */}
      {/* <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600/50">
          <div className="text-slate-400 text-sm font-medium mb-1">Weekly Total</div>
          <div className="text-3xl font-bold text-white">{weeklyTotal}<span className="text-lg text-slate-400 ml-1">min</span></div>
        </div>
        <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600/50">
          <div className="text-slate-400 text-sm font-medium mb-1">Daily Average</div>
          <div className="text-3xl font-bold text-white">{weeklyAverage}<span className="text-lg text-slate-400 ml-1">min</span></div>
        </div>
      </div> */}

      {/* Chart section with paywall */}
      <div className="relative bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
        <h4 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">
          Last 7 Days
        </h4>
        
        {/* Chart - blurred if not pro */}
        <div className={!isPro ? "blur-sm opacity-40 pointer-events-none select-none" : ""}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dailySessions}>
              <defs>
                <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis 
                dataKey="day" 
                stroke="#9CA3AF" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={35}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#10B981', strokeWidth: 2, strokeDasharray: '5 5' }} />
              <Area
                type="monotone"
                dataKey="minutesStudied"
                stroke="#10B981"
                strokeWidth={3}
                fill="url(#colorMinutes)"
                animationDuration={1000}
              />
              <Line 
                type="monotone" 
                dataKey="minutesStudied" 
                stroke="#10B981" 
                strokeWidth={3}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  return (
                    <g>
                      {payload.isToday && (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={8}
                          fill="#10B981"
                          opacity={0.2}
                          className="animate-ping"
                        />
                      )}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={payload.isToday ? 6 : 4}
                        fill={payload.isToday ? '#34D399' : '#10B981'}
                        stroke={payload.isToday ? '#065F46' : '#047857'}
                        strokeWidth={2}
                      />
                    </g>
                  );
                }}
                activeDot={{ r: 8, fill: '#34D399', stroke: '#065F46', strokeWidth: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Upgrade CTA overlay - only show if not pro */}
        {!isPro && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-[2px] rounded-xl">
            <div className="text-center px-6 py-8">
             
              <h3 className="text-2xl font-bold text-white mb-2">
                See Your Progress Over Time
              </h3>
              <p className="text-slate-300 mb-6 max-w-sm">
                Track your study trends, identify patterns, and stay motivated with weekly insights
              </p>
              <button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold px-8 py-3 rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-purple-500/30"
                onClick={()=>{navigate('/pricing')}}
              >
                Upgrade to Pro
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SingularMastery;