import React from 'react';
import { Clock, Brain, Flame, Trophy } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const OverallMastery = () => {
  // Sample data for the week
  const weekData = [
    { day: 'Mon', minutes: 25, spacedRep: 45, cramming: 20 },
    { day: 'Tue', minutes: 45, spacedRep: 80, cramming: 30 },
    { day: 'Wed', minutes: 35, spacedRep: 60, cramming: 25 },
    { day: 'Thu', minutes: 55, spacedRep: 90, cramming: 35 },
    { day: 'Fri', minutes: 40, spacedRep: 70, cramming: 40 },
    { day: 'Sat', minutes: 65, spacedRep: 100, cramming: 50 },
    { day: 'Sun', minutes: 30, spacedRep: 55, cramming: 15 }
  ];

  // Today's stats (Sunday in this example)
  const todayStats = {
    minutesStudied: 30,
    cardsStudied: 70, // 55 spaced + 15 cramming
    currentStreak: 7,
    bestStreak: 25
  };

  const StatCard = ({ icon: Icon, label, value, subtext, color = "#8B5CF6" }) => (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-all">
      <div className="flex items-center mb-3">
        <Icon className="w-5 h-5 mr-2" style={{ color }} />
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      {subtext && <div className="text-xs text-gray-500">{subtext}</div>}
    </div>
  );

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

  return (
    <div className="bg-slate-900 text-white p-6 rounded-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Overall Mastery</h2>
        <p className="text-gray-400">Track your daily progress and maintain your learning momentum</p>
      </div>

      {/* Main Stats - Today's Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          icon={Clock} 
          label="Minutes Today" 
          value={`${todayStats.minutesStudied}m`}
          subtext="Keep it up!"
          color="#10B981"
        />
        <StatCard 
          icon={Brain} 
          label="Cards Today" 
          value={todayStats.cardsStudied}
          subtext="Great progress!"
          color="#8B5CF6"
        />
        <div className="md:col-span-2">
          <StreakCard current={todayStats.currentStreak} best={todayStats.bestStreak} />
        </div>
      </div>

      {/* Weekly Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          <div className="flex items-center justify-center mt-4 space-x-6">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-purple-500 rounded mr-2"></div>
              <span className="text-sm text-gray-400">Spaced Repetition</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-pink-500 rounded mr-2"></div>
              <span className="text-sm text-gray-400">Cramming</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverallMastery;