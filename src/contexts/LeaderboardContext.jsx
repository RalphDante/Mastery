// contexts/LeaderboardContext.jsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
  where,
  getCountFromServer,
  startAfter
} from 'firebase/firestore';
import { db } from '../api/firebase';
import { useAuthContext } from './AuthContext';

const LeaderboardContext = createContext();

const PAGE_SIZE = 10;


export function useLeaderboard() {
  const ctx = useContext(LeaderboardContext);
  if (!ctx) throw new Error('useLeaderboard must be inside LeaderboardProvider');
  return ctx;
}

/* ---------- helpers ---------- */
function getWeekId(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

function getMonthId(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
}


// Add this helper function
const fetchLeaderboardPage = async (timeframe, lastDocSnapshot = null) => {
  const periodId = timeframe === 'weekly' ? getWeekId() : getMonthId();
  const colPath = `leaderboards/${timeframe}/${periodId}`;

  let q = query(
    collection(db, colPath),
    orderBy('minutes', 'desc'),
    limit(PAGE_SIZE)
  );

  if (lastDocSnapshot) {
    q = query(
      collection(db, colPath),
      orderBy('minutes', 'desc'),
      startAfter(lastDocSnapshot), // ✅ Pass the actual DocumentSnapshot
      limit(PAGE_SIZE)
    );
  }

  const snap = await getDocs(q);
  return {
    users: snap.docs.map(d => ({ userId: d.id, ...d.data() })),
    lastDoc: snap.docs[snap.docs.length - 1] // ✅ Return DocumentSnapshot
  };
};

/* ---------- provider ---------- */
export function LeaderboardProvider({ children }) {
  const { user, userProfile } = useAuthContext(); // ← Add userProfile here

  const [activeTab, setActiveTab] = useState('weekly'); 
  const [weeklyData, setWeeklyData] = useState({
    topUsers: [],
    currentUserRank: null,
    currentUserData: null,
    periodId: null,
    lastDoc: null, // ✅ Add this
    hasMore: true
  });

  const [monthlyData, setMonthlyData] = useState({
    topUsers: [],
    currentUserRank: null,
    currentUserData: null,
    periodId: null,
    lastDoc: null, // ✅ Add this
    hasMore: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* ---------- core fetch ---------- */
  const fetchLeaderboard = useCallback(
    async (timeframe, limitCount = 10) => {
      if (!user) return;

      if (timeframe !== 'weekly' && timeframe !== 'monthly') {
        throw new Error('timeframe must be "weekly" or "monthly"');
      }

      setLoading(true);
      setError(null);

      try {
        const periodId =
          timeframe === 'weekly' ? getWeekId() : getMonthId();
        const colPath = `leaderboards/${timeframe}/${periodId}`;

        // 1. Top N
        const q = query(
          collection(db, colPath),
          orderBy('minutes', 'desc'),
          limit(limitCount)
        );
        const snap = await getDocs(q);
        const topUsers = snap.docs.map((d) => ({
          userId: d.id,
          ...d.data(),
        }));

        // 2. Current user rank
        let currentUserRank = null;
        let currentUserData = null;

        const userInTop = topUsers.find((u) => u.userId === user.uid);
        if (userInTop) {
          currentUserData = userInTop;
          currentUserRank = topUsers.indexOf(userInTop) + 1;
        } else {
          const userSnap = await getDoc(doc(db, colPath, user.uid));

          if (userSnap.exists()) {
            currentUserData = { userId: user.uid, ...userSnap.data() };
            const countSnap = await getCountFromServer(
              query(
                collection(db, colPath),
                where('minutes', '>', currentUserData.minutes)
              )
            );
            currentUserRank = countSnap.data().count + 1;
          }
        }

        const result = {
          currentUserData,
          topUsers,
          currentUserRank,
          periodId,
          limit: limitCount,
          hasMore: topUsers.length === limitCount,
          lastDoc: snap.docs[snap.docs.length - 1] || null, // ✅ ADD THIS!
        };

        // push to the right state slice
        if (timeframe === 'weekly') setWeeklyData(result);
        else setMonthlyData(result);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  /* ---------- auto-fetch ---------- */
  // 1. on mount / user change → load the active tab
  // 2. on tab change → load the new tab
  useEffect(() => {
    if (user) {
      fetchLeaderboard(activeTab, 10);
    }
  }, [user, activeTab, fetchLeaderboard]);

  /* ---------- loadMore helper ---------- */
  const loadMore = async () => {
    if (loading) return;

    const currentData = activeTab === 'weekly' ? weeklyData : monthlyData;
    if (!currentData.hasMore) return;

    setLoading(true);

    const lastDoc = currentData.lastDoc; // ✅ Use DocumentSnapshot

    try {
      const { users: newUsers, lastDoc: newLastDoc } = await fetchLeaderboardPage(activeTab, lastDoc);

      const isPro = userProfile?.subscription?.tier === 'pro';
      const currentCount = currentData.topUsers.length;
      
      const moreDataExists = newUsers.length === PAGE_SIZE;
      
      let usersToAdd = newUsers;

      if (!isPro) {
        const remaining = 25 - currentCount;
        if (remaining <= 0) {
          usersToAdd = [];
        } else {
          usersToAdd = newUsers.slice(0, remaining);
        }
      }

      const totalLoaded = currentCount + usersToAdd.length;
      const hasMore = moreDataExists && (isPro || totalLoaded < 25);

      const setData = activeTab === 'weekly' ? setWeeklyData : setMonthlyData;
      setData(prev => ({
        ...prev,
        topUsers: [...prev.topUsers, ...usersToAdd],
        lastDoc: newLastDoc, // ✅ Store DocumentSnapshot
        hasMore,
      }));
    } catch (err) {
      console.error('Load more failed:', err);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- context value ---------- */
  const value = useMemo(
    () => ({
      activeTab,
      setActiveTab,
      weeklyData,
      monthlyData,
      loading,
      error,
      loadMore,
      refetch: () => fetchLeaderboard(activeTab, 10), // handy for pull-to-refresh
    }),
    [
      activeTab,
      weeklyData,
      monthlyData,
      loading,
      error,
      loadMore,
      fetchLeaderboard,
    ]
  );

  return (
    <LeaderboardContext.Provider value={value}>
      {children}
    </LeaderboardContext.Provider>
  );
}