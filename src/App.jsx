// Main App component - just wraps with AuthProvider
import AppContent from "./AppContent";
import { AuthProvider, useAuthContext } from "./contexts/AuthContext";
import { DeckCacheProvider } from "./contexts/DeckCacheContext";
import { LeaderboardProvider } from "./contexts/LeaderboardContext.jsx";
import { PartyProvider } from "./contexts/PartyContext";
import { UserDataProvider } from "./contexts/UserDataContext";
import { useEffect } from "react";

// Component that loads ads only for free users
function AdLoader() {
  const { userProfile } = useAuthContext();
  const isPro = userProfile?.subscription?.tier === "pro";

  useEffect(() => {
    if (isPro) {
      console.log('⭐ Pro user - skipping banner ads');
      return;
    }

    console.log('📺 Loading banner ads for free user');
    const script = document.createElement('script');
    script.dataset.zone = '10293511';
    script.src = 'https://nap5k.com/tag.min.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
        console.log('🧹 Banner ad script removed');
      }
    };
  }, [isPro]);

  return null;
}


function App() {

  // Load In-Page Push Banner on app mount
  useEffect(() => {
    const script = document.createElement('script');
    script.dataset.zone = '10293511';
    script.src = 'https://nap5k.com/tag.min.js';
    script.async = true;
    document.body.appendChild(script);

    // Cleanup when component unmounts
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []); // Empty array = runs once on mount

  return (
    <AuthProvider>
      <PartyProvider>
        <UserDataProvider>
          <DeckCacheProvider>
            <LeaderboardProvider>
              <AdLoader />
              <AppContent />
            </LeaderboardProvider>
          </DeckCacheProvider>
        </UserDataProvider>
      </PartyProvider>
    </AuthProvider>
  );
}

export default App;