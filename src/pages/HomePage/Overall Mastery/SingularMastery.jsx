import React, { useState } from 'react';
import { Clock, TrendingUp, Zap, Award, Crown, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useAuthContext } from '../../../contexts/AuthContext';
import { usePartyContext } from '../../../contexts/PartyContext';
import { useNavigate } from 'react-router-dom';
import { useUserDataContext } from '../../../contexts/UserDataContext';
import LimitReachedModal from '../../../components/Modals/LimitReachedModal';
import { createPortal } from 'react-dom';

function SingularMastery() {
  const { dailySessionsWithToday, todaySession, getFullThirtyDays } = useUserDataContext();
  const {userProfile, user} = useAuthContext();

  const [period, setPeriod] = useState('7d');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [show30DayModal, setShow30DayModal] = useState(false);
  const {partyMembers} = usePartyContext();

  // Get the full 30 days data
  const fullThirtyDays = getFullThirtyDays;
  
  const currentUser = user?.uid ? partyMembers[user.uid] : null;
  const currentUserStreak = currentUser?.streak || 0;
  const currentUserLongestStreak = currentUser?.longestStreak || 0;


  const isPro = userProfile?.subscription?.tier === 'pro'; 

  const navigate = useNavigate();

  


  // Calculate stats based on period
  const displayData = period === '7d' ? dailySessionsWithToday : fullThirtyDays;
  const periodTotal = displayData.reduce((sum, day) => sum + day.minutesStudied, 0);
  const periodAverage = Math.round(periodTotal / displayData.length);

  const handlePeriodChange = (newPeriod) => {
    if (newPeriod === '30d' && !isPro) {
      setShowUpgradeModal(true);
      return;
    }
    
    if (newPeriod === '30d' && isPro) {
      setShow30DayModal(true);
      return;
    }
    
    setPeriod(newPeriod);
  };

  const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    // Get data directly from the payload instead of searching by day name
    const value = payload[0].value;
    const isToday = payload[0].payload.isToday;
    
    return (
      <div className="bg-slate-800/95 backdrop-blur-sm border border-purple-500/30 rounded-lg p-3 shadow-xl">
        <p className="text-white font-semibold mb-1">
          {label} {isToday && <span className="text-green-400 text-xs ml-1">● Today</span>}
        </p>
        <p className="text-green-400 text-sm font-medium">
          {value} minutes
        </p>
      </div>
    );
  }
  return null;
};

  return (
    <>
      {showUpgradeModal && (
        <LimitReachedModal 
          limitType="analytics"  // You'll need to add this to the messages object
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
      <div className='bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl'>
        <div className="p-6">
          {/* Header with stats pills */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs lg:text-xl font-bold text-white flex items-center gap-2">
              Today's Progress
            </h3>
            
            <div className="flex gap-2">
              <div className="bg-purple-700 rounded-full px-3 py-1 flex items-center gap-1.5">
                <span className="text-xs font-semibold">{currentUserStreak} day streak</span>
              </div>
              <div className="bg-amber-700 rounded-full px-3 py-1 flex items-center gap-1.5">
                <span className="text-xs font-semibold">Best: {currentUserLongestStreak}</span>
              </div>
            </div>
          </div>

          {/* Giant minutes display */}
          <div className="text-center mb-4 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-green-500/20 blur-3xl" />
            <div className="relative">
              <div className="text-8xl font-black bg-gradient-to-br from-green-400 via-emerald-400 to-green-500 bg-clip-text text-transparent mb-2 tracking-tight drop-shadow-2xl">
                {todaySession.minutesStudied}
              </div>
              <div className="text-lg text-slate-400 font-medium">minutes today</div>
            </div>
          </div>

          
        </div>
        {/* Chart section */}
        <div className="relative bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
            {/* Period selector */}
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                {period === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
              </h4>
              
              <div className="flex gap-2">
                <button 
                  className={`px-4 py-2 rounded-full transition-all ${
                    period === '7d' 
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' 
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                  onClick={() => handlePeriodChange('7d')}
                >
                  7 Days
                </button>
                
                <button 
                  className="px-4 py-2 rounded-full bg-slate-700 text-slate-300 hover:bg-slate-600 relative flex items-center gap-2 transition-all"
                  onClick={() => handlePeriodChange('30d')}
                >
                  30 Days
                  {!isPro && <Crown className="w-4 h-4 text-yellow-400" />}
                </button>
              </div>
            </div>
            
            {/* Chart */}
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={displayData}>
                <defs>
                  <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis 
                  dataKey="date"  // Use date instead of day for unique identification
                  stroke="#9CA3AF" 
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('en', { weekday: 'short' });
                  }}
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

            {/* Period stats */}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-700/50">
              <div className="text-center">
                <div className="text-slate-400 text-xs font-medium mb-1">Total</div>
                <div className="text-xl font-bold text-white">{periodTotal}<span className="text-sm text-slate-400 ml-1">min</span></div>
              </div>
              <div className="text-center">
                <div className="text-slate-400 text-xs font-medium mb-1">Daily Avg</div>
                <div className="text-xl font-bold text-white">{periodAverage}<span className="text-sm text-slate-400 ml-1">min</span></div>
              </div>
            </div>
        </div>
      </div>

      {/* 30-Day Fullscreen Modal (Pro users only) */}
      {show30DayModal && isPro && createPortal(
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm"
          onClick={() => setShow30DayModal(false)}
        >
          <div 
            className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl max-w-5xl w-full p-6 relative shadow-2xl border border-slate-700/50 max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShow30DayModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-10 bg-slate-800/50 rounded-full p-2 hover:bg-slate-700/50"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Header */}
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-white mb-2">30-Day Analytics</h2>
              <p className="text-slate-400">Your complete monthly progress overview</p>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div className="text-slate-400 text-sm font-medium mb-1">Total Minutes</div>
                <div className="text-3xl font-bold text-white">
                  {fullThirtyDays.reduce((sum, day) => sum + day.minutesStudied, 0)}
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div className="text-slate-400 text-sm font-medium mb-1">Daily Average</div>
                <div className="text-3xl font-bold text-white">
                  {Math.round(fullThirtyDays.reduce((sum, day) => sum + day.minutesStudied, 0) / fullThirtyDays.length)}
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div className="text-slate-400 text-sm font-medium mb-1">Active Days</div>
                <div className="text-3xl font-bold text-white">
                  {fullThirtyDays.filter(d => d.minutesStudied > 0).length}
                </div>
              </div>
            </div>

            {/* Large chart */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={fullThirtyDays}>
                  <defs>
                    <linearGradient id="colorMinutes30" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                 <XAxis 
                    dataKey="date"  // Use date instead of day for unique identification
                    stroke="#9CA3AF" 
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('en', { weekday: 'short' });
                    }}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#10B981', strokeWidth: 2, strokeDasharray: '5 5' }} />
                  <Area
                    type="monotone"
                    dataKey="minutesStudied"
                    stroke="#10B981"
                    strokeWidth={3}
                    fill="url(#colorMinutes30)"
                    animationDuration={1200}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="minutesStudied" 
                    stroke="#10B981" 
                    strokeWidth={3}
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={payload.isToday ? 5 : 3}
                          fill={payload.isToday ? '#34D399' : '#10B981'}
                          stroke={payload.isToday ? '#065F46' : '#047857'}
                          strokeWidth={2}
                        />
                      );
                    }}
                    activeDot={{ r: 8, fill: '#34D399', stroke: '#065F46', strokeWidth: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      , document.body)}

    
    </>
  );
}

export default SingularMastery;