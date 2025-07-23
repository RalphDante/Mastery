import React, { useState, useEffect } from 'react'; // Add missing imports
import { Trophy, Flame, Target, TrendingUp, Clock, Brain, Star, Zap, BookOpen } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

import { db, auth } from '../../../api/firebase';
import { doc, getDoc, collection, getDocs, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

const OverallMasteryV2 = () => {
  // Add missing state variables
  const [userData, setUserData] = useState(null);
  const [weekData, setWeekData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [user, loadingAuth, errorAuth] = useAuthState(auth);
  const currentUserId = user?.uid;

  // Helper function to format date as YYYY-MM-DD in user's local timezone
  const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Move useEffect inside component
  useEffect(() => {
    if (!currentUserId) return;

    const userDocRef = doc(db, 'users', currentUserId);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        setUserData(doc.data());
      }
    });

    // Call fetchUserData when component mounts
    fetchUserData();

    return () => unsubscribe();
  }, [currentUserId]);

  // Function to generate last 7 days including today (previous 6 + current day)
  const generateLast7Days = () => {
    const today = new Date(); // Uses user's local timezone automatically
    const last7Days = [];
    
    // Mock data - in real app this would come from your database
    const mockStudyData = {
      // Previous 6 days with real data
      6: { minutes: 0, spacedRep: 0, cramming: 0 },
      5: { minutes: 0, spacedRep: 0, cramming: 0 },
      4: { minutes: 0, spacedRep: 0, cramming: 0 },
      3: { minutes: 0, spacedRep: 0, cramming: 0 },
      2: { minutes: 0, spacedRep: 0, cramming: 0 },
      1: { minutes: 0, spacedRep: 0, cramming: 0 },
      0: { minutes: 30, spacedRep: 55, cramming: 15 } // Today - will update in real-time
    };
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dayName = date.toLocaleDateString('en', { weekday: 'short' });
      const isToday = i === 0;
      
      const dayData = mockStudyData[i] || { minutes: 0, spacedRep: 0, cramming: 0 };
      
      last7Days.push({
        day: dayName,
        minutes: dayData.minutes,
        spacedRep: dayData.spacedRep,
        cramming: dayData.cramming,
        isToday
      });
    }
    
    return last7Days;
  };

  const fetchLast7DaysSessions = async () => {
    if (!currentUserId) return [];
    
    const last7Days = [];
    const today = new Date(); // Uses user's local timezone automatically
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      // Use local date string instead of UTC
      const dateStr = getLocalDateString(date);
      const dayName = date.toLocaleDateString('en', { weekday: 'short' });
      const isToday = i === 0;
      
      try {
        // Query the dailySessions subcollection based on your structure
        const sessionDocRef = doc(db, 'users', currentUserId, 'dailySessions', dateStr);
        const sessionDoc = await getDoc(sessionDocRef);
        
        let sessionData = { minutes: 0, spacedRep: 0, cramming: 0 };
        
        if (sessionDoc.exists()) {
          const data = sessionDoc.data();
          sessionData = {
            minutes: data.minutesStudied || 0,
            spacedRep: data.spacedSessions || 0,
            cramming: data.crammingSessions || 0
          };
        }
        
        last7Days.push({
          day: dayName,
          date: dateStr,
          minutes: Math.round(sessionData.minutes),
          spacedRep: sessionData.spacedRep,
          cramming: sessionData.cramming,
          isToday
        });
      } catch (error) {
        console.error(`Error fetching data for ${dateStr}:`, error);
        // Add default data for this day
        last7Days.push({
          day: dayName,
          date: dateStr,
          minutes: 0,
          spacedRep: 0,
          cramming: 0,
          isToday
        });
      }
    }
    
    return last7Days;
  };

  const fetchUserData = async () => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }
    
    try {
      // Get user stats from /users/{userId}
      const userDocRef = doc(db, 'users', currentUserId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserData(userData);
      }
  
      // Get last 7 days of daily sessions
      const last7DaysData = await fetchLast7DaysSessions();
      setWeekData(last7DaysData);
      
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Use mock data if weekData is empty (fallback)
  const displayWeekData = weekData.length > 0 ? weekData : generateLast7Days();
  
  // Get today's data (last item in the array)
  const todayData = displayWeekData[displayWeekData.length - 1] || { minutes: 0, spacedRep: 0, cramming: 0 };
  const todayStats = {
    minutesStudied: Math.round(todayData.minutes),
    cardsStudied: todayData.spacedRep + todayData.cramming,
    currentStreak: userData?.stats?.currentStreak || 0,
    bestStreak: userData?.stats?.longestStreak || 0
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
      // Check if this is today's data
      const dataPoint = displayWeekData.find(d => d.day === label);
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

  // Show loading state
  if (loading || loadingAuth) {
    return (
      <div className="bg-slate-900 text-white rounded-lg p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  // Show error state
  if (error || errorAuth) {
    return (
      <div className="bg-slate-900 text-white rounded-lg p-6">
        <div className="text-center text-red-400">Error: {error || errorAuth?.message}</div>
      </div>
    );
  }

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
            <BarChart data={displayWeekData}>
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
        </div>

        {/* Minutes Studied Chart */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-green-400" />
            Last 7 Days - Study Time
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={displayWeekData}>
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