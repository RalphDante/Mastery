// OptimizedOverallMastery
import React from 'react';
import { Trophy, Flame, Target, TrendingUp, Clock, Brain, Star, Zap, BookOpen } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

function OverallMasteryV2(){
  const { dailySessions, todaySession, currentStreak, longestStreak } = useStudyStats();

  const todayStats = {
    minutesStudied: Math.round(todaySession.minutes),
    cardsStudied: todaySession.spacedRep + todaySession.cramming,
    currentStreak,
    bestStreak: longestStreak
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataPoint = dailySessions.find(d => d.day === label);
      const isToday = dataPoint?.isToday;
      
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">
            {label} {isToday && <span className="text-green-400 text-xs">(Today)</span>}
          </p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900 text-white rounded-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Overall Mastery</h2>
        <p className="text-gray-400">Your learning journey at a glance - keep up the momentum!</p>
      </div>

      {/* Main Progress Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Minutes Studied Today - Main Focus */}
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-white mb-2">Today's Progress</h3>
          </div>
          
          {/* Main Minutes Display */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-green-400" />
              <span className="text-sm text-gray-400">Minutes Today</span>
            </div>
            <div className="text-5xl font-bold text-white mb-1">{todayStats.minutesStudied}</div>
            <div className="text-sm text-gray-400">Keep it up!</div>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-700/50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <BookOpen className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-white">{todayStats.cardsStudied}</div>
              <div className="text-xs text-gray-400">Cards Today</div>
              <div className="text-xs text-gray-500">Great progress!</div>
            </div>
            
            <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-lg p-3 text-center border border-orange-500/30">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Flame className="w-4 h-4 text-orange-400" />
              </div>
              <div className="text-2xl font-bold text-white">{todayStats.currentStreak}</div>
              <div className="text-xs text-gray-400">Day Streak</div>
              <div className="text-xs text-orange-400">🔥 Personal Best: {todayStats.bestStreak}</div>
            </div>
          </div>
        </div>

        {/* Cards Studied Chart */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Brain className="w-5 h-5 mr-2 text-purple-400" />
            Last 7 Days - Cards Reviewed
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dailySessions}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="day" stroke="#9CA3AF" fontSize={12} />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
                label={{ value: 'Cards', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="spacedRep" stackId="a" fill="#8B5CF6" name="Spaced Repetition" radius={[0, 0, 4, 4]} />
              <Bar dataKey="cramming" stackId="a" fill="#EC4899" name="Cramming" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Minutes Studied Chart */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-green-400" />
            Last 7 Days - Study Time
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dailySessions}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="day" stroke="#9CA3AF" fontSize={12} />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
                label={{ value: 'Minutes', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="minutes" 
                stroke="#10B981" 
                strokeWidth={3}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={payload.isToday ? 6 : 4}
                      fill={payload.isToday ? '#34D399' : '#10B981'}
                      stroke={payload.isToday ? '#10B981' : '#065F46'}
                      strokeWidth={payload.isToday ? 3 : 2}
                    />
                  );
                }}
                activeDot={{ r: 8, stroke: '#10B981' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default OverallMasteryV2;