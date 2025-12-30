// contexts/UserDataContext.js - STUDY DATA & STATS
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../api/firebase';
import { useAuthContext } from './AuthContext';


const UserDataContext = createContext();

const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

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
    const [extendedSessions, setExtendedSessions] = useState([]);

    const [todaySession, setTodaySession] = useState({ 
        minutesStudied: 0, 
        cardsReviewed: 0,
        expEarned: 0,
        date: getLocalDateString()
    });

    const fetchTodaySession = useCallback(async (userId) => {
        if (!userId) return;

        try {
            const todayStr = getLocalDateString();
            const sessionDocRef = doc(db, 'users', userId, 'dailySessions', todayStr);
            const sessionDoc = await getDoc(sessionDocRef);
            
            let sessionData = { minutesStudied: 0, cardsReviewed: 0 };
            if (sessionDoc.exists()) {
                const data = sessionDoc.data();
                sessionData = {
                    minutesStudied: data.minutesStudied || 0,
                    cardsReviewed: data.spacedSessions || 0,
                    expEarned: data.expEarned || 0
                };
            }
            
            setTodaySession({
                ...sessionData,
                date: todayStr
            });

            return {
                ...sessionData
            }
        } catch (error) {
            console.error('Error fetching today session:', error);
        }
    }, []);

    // Functions to increment UI values (optimistic updates)
    const incrementMinutes = useCallback((amount) => {
        setTodaySession(prev => ({
            ...prev,
            minutesStudied: prev.minutesStudied + amount
        }));
    }, []);

    const incrementExp = useCallback((amount) => {
        setTodaySession(prev => ({
            ...prev,
            expEarned: (prev.expEarned || 0) + amount  // ✅ Fallback to 0 if undefined
        }));
    }, []);

    const incrementReviewedCards = useCallback(() => {
        setTodaySession(prev => ({
            ...prev,
            cardsReviewed: prev.cardsReviewed + 1
        }));
    }, []);



    

  

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
                        minutesStudied: data.minutesStudied || 0,
                        cardsReviewed: data.cardsReviewed || 0
                    };
                }
                
                last7Days.push({
                    day: dayName,
                    date: dateStr,
                    label: `${dayName} ${dateStr.slice(5)}`, // e.g., "Sat 12-06"
                    minutesStudied: Math.round(sessionData.minutesStudied) || 0,
                    cardsReviewed: sessionData.cardsReviewed,
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

    const fetchExtendedSessions = useCallback(async (userId) => {
        if (!userId) return;

        setIsLoading(true);
        try {
            const extended = [];
            const today = new Date();
            
            // Start at day 7 (yesterday was day 6), go back to day 29
            for (let i = 29; i >= 7; i--) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                const dateStr = getLocalDateString(date);
                const dayName = date.toLocaleDateString('en', { weekday: 'short' });
                
                const sessionDocRef = doc(db, 'users', userId, 'dailySessions', dateStr);
                const sessionDoc = await getDoc(sessionDocRef);
                
                let sessionData = { minutesStudied: 0, cardsReviewed: 0 };
                if (sessionDoc.exists()) {
                    const data = sessionDoc.data();
                    sessionData = {
                        minutesStudied: data.minutesStudied || 0,
                        cardsReviewed: data.cardsReviewed || 0
                    };
                }
                
                extended.push({
                    day: dayName,
                    date: dateStr,
                    label: `${dayName} ${dateStr.slice(5)}`, // e.g., "Fri 11-07"
                    minutesStudied: Math.round(sessionData.minutesStudied) || 0,
                    cardsReviewed: sessionData.cardsReviewed,
                    isToday: false
                });
            }
            
            setExtendedSessions(extended);
        } catch (error) {
            console.error('Error fetching extended sessions:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Only fetch extended sessions for pro users
    useEffect(() => {
        if (user?.uid && userProfile?.subscription?.tier === 'pro') {
            fetchExtendedSessions(user.uid);
        } else {
            setExtendedSessions([]);
        }
    }, [user?.uid, userProfile?.subscription?.tier, fetchExtendedSessions]);

    // Sync todaySession changes into dailySessions array
    const dailySessionsWithToday = useMemo(() => {
        if (!dailySessions.length) return dailySessions;
        
        return dailySessions.map(day => 
            day.isToday 
                ? { 
                    ...day, 
                    minutesStudied: Math.round(todaySession.minutesStudied) || 0,
                    cardsReviewed: todaySession.cardsReviewed 
                }
                : day
        );
    }, [dailySessions, todaySession.minutesStudied, todaySession.cardsReviewed]);

    // Helper to get combined 30-day data
    const getFullThirtyDays = useMemo(() => {
        return [...extendedSessions, ...dailySessionsWithToday];
    }, [extendedSessions, dailySessionsWithToday]);

    // Fetch today's session on mount
    useEffect(() => {
        if (user?.uid) {
            fetchTodaySession(user.uid);
        } else {
            setTodaySession({ 
                minutesStudied: 0,  
                cardsReviewed: 0,  
                date: getLocalDateString(),
                expEarned: 0
            });
        }
    }, [user?.uid, fetchTodaySession]);

    // Fetch daily sessions when user changes
    useEffect(() => {
        if (user?.uid) {
            fetchDailySessions(user.uid);
        } else {
            setDailySessions([]);
        }
    }, [user?.uid, fetchDailySessions]);

   

    const value = {
        dailySessionsWithToday,
        extendedSessions,           // Days 8-30 (pro only)
        getFullThirtyDays,  
        incrementMinutes,
        incrementExp,
        incrementReviewedCards,
        setTodaySession,
        todaySession,
        isLoading,
        refreshDailySessions: () => fetchDailySessions(user?.uid),
        refreshTodaySession: () => fetchTodaySession(user?.uid), 
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
    const { dailySessionsWithToday, todaySession } = useUserDataContext();
    
    return {
        currentStreak: userProfile?.stats?.currentStreak || 0,
        longestStreak: userProfile?.stats?.longestStreak || 0,
        dailySessions: dailySessionsWithToday,
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