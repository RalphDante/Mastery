// contexts/UserDataContext.js - STUDY DATA & STATS
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../api/firebase';
import { useAuthContext } from './AuthContext';

const UserDataContext = createContext();

export const useUserDataContext = () => {
    const context = useContext(UserDataContext);
    if (!context) {
        throw new Error('useUserDataContext must be used within a UserDataProvider');
    }
    return context;
};

export const UserDataProvider = ({ children }) => {
    const { user, userProfile } = useAuthContext();
    const [dailySessions, setDailySessions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const getLocalDateString = (date = new Date()) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Fetch daily sessions
    const fetchDailySessions = useCallback(async (userId) => {
        if (!userId) return;

        setIsLoading(true);
        try {
            const last7Days = [];
            const today = new Date();
            
            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                const dateStr = getLocalDateString(date);
                const dayName = date.toLocaleDateString('en', { weekday: 'short' });
                
                const sessionDocRef = doc(db, 'users', userId, 'dailySessions', dateStr);
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
                    isToday: i === 0
                });
            }
            
            setDailySessions(last7Days);
        } catch (error) {
            console.error('Error fetching daily sessions:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch daily sessions when user changes
    useEffect(() => {
        if (user?.uid) {
            fetchDailySessions(user.uid);
        } else {
            setDailySessions([]);
        }
    }, [user?.uid, fetchDailySessions]);

    const todaySession = dailySessions.find(session => session.isToday) || 
        { minutes: 0, spacedRep: 0, cramming: 0 };

    const value = {
        dailySessions,
        todaySession,
        isLoading,
        refreshDailySessions: () => fetchDailySessions(user?.uid),
    };

    return (
        <UserDataContext.Provider value={value}>
            {children}
        </UserDataContext.Provider>
    );
};

// Specialized hooks
export const useStudyStats = () => {
    const { userProfile } = useAuthContext();
    const { dailySessions, todaySession } = useUserDataContext();
    
    return {
        currentStreak: userProfile?.stats?.currentStreak || 0,
        longestStreak: userProfile?.stats?.longestStreak || 0,
        dailySessions,
        todaySession
    };
};

export const getTimeUntilNextReview = (nextReviewTime) => {
    if (!nextReviewTime) return "No upcoming reviews";
    
    const now = new Date();
    const diffMs = nextReviewTime.getTime() - now.getTime();
    
    if (diffMs <= 0) return "Ready now";
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
};

export default UserDataContext;