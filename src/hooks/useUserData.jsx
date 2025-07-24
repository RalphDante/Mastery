import { useState, useEffect, createContext, useContext } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../api/firebase';
import { 
  doc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  getDocs,
  getDoc 
} from 'firebase/firestore';

// Create contexts
const UserDataContext = createContext();

// Provider component
export const UserDataProvider = ({ children }) => {
  const [user, loading, error] = useAuthState(auth);
  const [userData, setUserData] = useState(null);
  const [folders, setFolders] = useState([]);
  const [cardProgress, setCardProgress] = useState([]);
  const [dailySessions, setDailySessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataError, setDataError] = useState(null);

  // Single user data subscription
  useEffect(() => {
    if (!user) {
      // Clear all data when user logs out
      setUserData(null);
      setFolders([]);
      setCardProgress([]);
      setDailySessions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribes = [];

    try {
      // 1. Subscribe to user document
      const userDocRef = doc(db, 'users', user.uid);
      const unsubUser = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          setUserData(doc.data());
        }
      });
      unsubscribes.push(unsubUser);

      // 2. Subscribe to folders
      const foldersRef = collection(db, 'folders');
      const foldersQuery = query(foldersRef, where('ownerId', '==', user.uid));
      const unsubFolders = onSnapshot(foldersQuery, (snapshot) => {
        const fetchedFolders = [];
        snapshot.forEach((doc) => {
          fetchedFolders.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort by updatedAt
        fetchedFolders.sort((a, b) => {
          const dateA = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(0);
          const dateB = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
        
        setFolders(fetchedFolders);
      });
      unsubscribes.push(unsubFolders);

      // 3. Subscribe to card progress (for due cards calculation)
      const cardProgressRef = collection(db, 'cardProgress');
      const cardProgressQuery = query(cardProgressRef, where('userId', '==', user.uid));
      const unsubCardProgress = onSnapshot(cardProgressQuery, (snapshot) => {
        const progress = [];
        snapshot.forEach((doc) => {
          progress.push({ id: doc.id, ...doc.data() });
        });
        setCardProgress(progress);
      });
      unsubscribes.push(unsubCardProgress);

      // 4. Fetch last 7 days of daily sessions (less frequent updates)
      fetchDailySessions(user.uid);

      setIsLoading(false);
    } catch (err) {
      setDataError(err.message);
      setIsLoading(false);
    }

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [user]);

  const fetchDailySessions = async (userId) => {
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
    }
  };

  const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Computed values
  const computedData = {
    // Cards due calculation
    cardsDue: (() => {
      const now = new Date();
      return cardProgress.filter(card => {
        if (!card.nextReviewDate) return false;
        try {
          const nextReviewDate = card.nextReviewDate.toDate();
          return nextReviewDate <= now;
        } catch (error) {
          return false;
        }
      }).length;
    })(),

    // Cards reviewed today
    cardsReviewedToday: (() => {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      return cardProgress.filter(card => {
        if (!card.lastReviewDate) return false;
        try {
          const lastReviewDate = card.lastReviewDate.toDate();
          const lastReviewDay = new Date(
            lastReviewDate.getFullYear(), 
            lastReviewDate.getMonth(), 
            lastReviewDate.getDate()
          );
          return lastReviewDay.getTime() === todayStart.getTime();
        } catch (error) {
          return false;
        }
      }).length;
    })(),

    // Today's session data
    todaySession: dailySessions.find(session => session.isToday) || 
      { minutes: 0, spacedRep: 0, cramming: 0 }
  };

  const value = {
    // Auth state
    user,
    loading: loading || isLoading,
    error: error || dataError,
    
    // User data
    userData,
    folders,
    cardProgress,
    dailySessions,
    
    // Computed values
    ...computedData,
    
    // Utility functions
    refreshDailySessions: () => fetchDailySessions(user?.uid)
  };

  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  );
};

// Hook to use the context
export const useUserData = () => {
  const context = useContext(UserDataContext);
  if (!context) {
    throw new Error('useUserData must be used within a UserDataProvider');
  }
  return context;
};

// Specialized hooks for specific data
export const useAuth = () => {
  const { user, loading, error } = useUserData();
  return { user, loading, error };
};

export const useFolders = () => {
  const { folders } = useUserData();
  return folders;
};

export const useCardsDue = () => {
  const { cardsDue, cardsReviewedToday } = useUserData();
  return { cardsDue, cardsReviewedToday };
};

export const useStudyStats = () => {
  const { userData, dailySessions, todaySession } = useUserData();
  return {
    currentStreak: userData?.stats?.currentStreak || 0,
    longestStreak: userData?.stats?.longestStreak || 0,
    dailySessions,
    todaySession
  };
};