import React from 'react';
import { Trophy, Flame, Target, TrendingUp, Clock, Brain, Star, Zap, BookOpen } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const OverallMasteryV2 = () => {

  const weekData = [
    { day: 'Mon', minutes: 25, spacedRep: 45, cramming: 20 },
    { day: 'Tue', minutes: 45, spacedRep: 80, cramming: 30 },
    { day: 'Wed', minutes: 35, spacedRep: 60, cramming: 25 },
    { day: 'Thu', minutes: 55, spacedRep: 90, cramming: 35 },
    { day: 'Fri', minutes: 40, spacedRep: 70, cramming: 40 },
    { day: 'Sat', minutes: 65, spacedRep: 100, cramming: 50 },
    { day: 'Sun', minutes: 30, spacedRep: 55, cramming: 15 }
  ];

  const todayStats = {
    minutesStudied: 30,
    cardsStudied: 70, // 55 spaced + 15 cramming
    currentStreak: 7,
    bestStreak: 25
  };

  const stats = {
    totalDecks: 12,
    totalCards: 480,
    totalReviews: 1256,
    currentStreak: 7,
    longestStreak: 25,
    masteryScore: 78,
    todayCards: 42,
    weeklyMinutes: 285,
    accuracyRate: 89,
    level: 'Intermediate',
    rankPosition: 3,
    totalUsers: 28
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{label}</p>
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

  const StreakCard = ({ current, best }) => (
    <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-4 text-white">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center mb-2">
            <Flame className="w-5 h-5 mr-2" />
            <span className="font-semibold text-sm">Current Streak</span>
          </div>
          <div className="text-3xl font-bold">{current}</div>
          <div className="text-sm opacity-90">days</div>
        </div>
        <div className="text-right">
          <div className="flex items-center mb-2">
            <Trophy className="w-4 h-4 mr-1" />
            <span className="text-xs opacity-75">Personal Best</span>
          </div>
          <div className="text-xl font-bold">{best}</div>
        </div>
      </div>
    </div>
  );

  const CircularProgress = ({ percentage, size = 120, strokeWidth = 8, color = "#8B5CF6" }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;
    
    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#374151"
            strokeWidth={strokeWidth}
            fill="none"
            className="opacity-20"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{percentage}%</div>
            <div className="text-xs text-gray-400">Mastery</div>
          </div>
        </div>
      </div>
    );
  };

  const StatCard = ({ icon: Icon, label, value, subtext, color = "#8B5CF6", trend }) => (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-all">
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-5 h-5" style={{ color }} />
        {trend && (
          <div className="flex items-center text-green-400 text-xs">
            <TrendingUp className="w-3 h-3 mr-1" />
            {trend}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
      {subtext && <div className="text-xs text-gray-500 mt-1">{subtext}</div>}
    </div>
  );

  const StreakBadge = ({ current, longest }) => (
    <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-4 text-white">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center mb-2">
            <Flame className="w-5 h-5 mr-2" />
            <span className="font-semibold">Fire Streak</span>
          </div>
          <div className="text-3xl font-bold">{current}</div>
          <div className="text-sm opacity-90">days strong</div>
        </div>
        <div className="text-right">
          <div className="text-xs opacity-75">Personal Best</div>
          <div className="text-xl font-bold">{longest}</div>
        </div>
      </div>
    </div>
  );

  const LevelBadge = ({ level, rank, totalUsers }) => (
    <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl p-4 text-white">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center mb-2">
            <Star className="w-5 h-5 mr-2" />
            <span className="font-semibold">{level}</span>
          </div>
          <div className="text-sm opacity-90">Rank #{rank} of {totalUsers}</div>
        </div>
        <div className="text-right">
          <Trophy className="w-8 h-8 opacity-80" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-slate-900 text-white  rounded-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Overall Mastery</h2>
        <p className="text-gray-400">Your learning journey at a glance - keep up the momentum!</p>
      </div>

      {/* Main Progress Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Mastery Progress Circle */}
        {/* Minutes Studied Today - Main Focus */}
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-white mb-2">Mastery Progress</h3>
            </div>
            
            {/* Main Minutes Display */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-green-400" />
                <span className="text-sm text-gray-400">Minutes Today</span>
              </div>
              <div className="text-5xl font-bold text-white mb-1">30</div>
              <div className="text-sm text-gray-400">Keep it up!</div>
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <BookOpen className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl font-bold text-white">70</div>
                <div className="text-xs text-gray-400">Cards Today</div>
                <div className="text-xs text-gray-500">Great progress!</div>
              </div>
              
              <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-lg p-3 text-center border border-orange-500/30">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Flame className="w-4 h-4 text-orange-400" />
                </div>
                <div className="text-2xl font-bold text-white">7</div>
                <div className="text-xs text-gray-400">Day Streak</div>
                <div className="text-xs text-orange-400">🔥 Personal Best: 25</div>
              </div>
            </div>
          </div>
        

        {/* Streak Card */}
        
        {/* <StreakBadge current={stats.currentStreak} longest={stats.longestStreak} /> */}
        {/* Cards Studied Chart */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Brain className="w-5 h-5 mr-2 text-purple-400" />
            Daily Cards Reviewed
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weekData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="day" 
                stroke="#9CA3AF"
                fontSize={12}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
                label={{ value: 'Cards', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="spacedRep" 
                stackId="a" 
                fill="#8B5CF6" 
                name="Spaced Repetition"
                radius={[0, 0, 4, 4]}
              />
              <Bar 
                dataKey="cramming" 
                stackId="a" 
                fill="#EC4899" 
                name="Cramming"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          {/* <div className="flex items-center justify-center mt-4 space-x-6">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-purple-500 rounded mr-2"></div>
              <span className="text-sm text-gray-400">Spaced Repetition</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-pink-500 rounded mr-2"></div>
              <span className="text-sm text-gray-400">Cramming</span>
            </div>
          </div> */}
        </div>

        {/* Minutes Studied Chart */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-green-400" />
            Daily Study Time
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={weekData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="day" 
                stroke="#9CA3AF"
                fontSize={12}
              />
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
                dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#10B981' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Level & Rank */}
        {/* <LevelBadge 
          level={stats.level} 
          rank={stats.rankPosition} 
          totalUsers={stats.totalUsers} 
        /> */}
      </div>

      {/* Stats Grid */}
      {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard 
          icon={Brain} 
          label="Cards Today" 
          value={stats.todayCards}
          subtext="Great progress!"
          color="#10B981"
          trend="+12%"
        />
        <StatCard 
          icon={Clock} 
          label="This Week" 
          value={`${stats.weeklyMinutes}m`}
          subtext="Study time"
          color="#F59E0B"
        />
        <StatCard 
          icon={Target} 
          label="Accuracy" 
          value={`${stats.accuracyRate}%`}
          subtext="Getting better!"
          color="#EF4444"
          trend="+3%"
        />
        <StatCard 
          icon={Zap} 
          label="Total Decks" 
          value={stats.totalDecks}
          subtext={`${stats.totalCards} cards`}
          color="#8B5CF6"
        />
      </div> */}

      {/* Achievement Banner */}
      {/* <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Trophy className="w-6 h-6 mr-3" />
            <div>
              <div className="font-semibold">Achievement Unlocked!</div>
              <div className="text-sm opacity-90">Week Warrior - 7 days of consistent study</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs opacity-75">Next Goal</div>
            <div className="text-sm font-semibold">Study Streak: 10 days</div>
          </div>
        </div>
      </div> */}
    </div>
  );
};

export default OverallMasteryV2;