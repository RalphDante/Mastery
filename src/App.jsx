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

 
  useEffect(() => {
    // Always clean up any existing nap5k script first
    const existingScript = document.querySelector('script[src="https://nap5k.com/tag.min.js"]');
    if (existingScript) {
      document.body.removeChild(existingScript);
      console.log('🧹 Removed existing ad script');
    }

    // 1. Pro users → no ads ever
    const isPro = userProfile?.subscription?.tier === "pro";
    if (isPro) {
      console.log('⭐ Pro user - no ads');
      return;
    }

    // 2. No userProfile yet → assume not ready, don't load ads (safe default)
    if (!userProfile?.createdAt) {
      console.log('⏳ User profile not loaded yet - skipping ads');
      return;
    }

    // 3. Calculate account age
    const createdAt = userProfile.createdAt.toDate ? userProfile.createdAt.toDate() : new Date(userProfile.createdAt);
    const hoursSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceCreation < 24) {
      const hoursLeft = (24 - hoursSinceCreation).toFixed(1);
      console.log(`🛡️ New user protection active: ${hoursLeft} hours remaining`);
      return;
    }

    // 4. Free user + older than 24h → load ads
    console.log('📺 Loading ads for free user (24h grace period over)');

    const script = document.createElement('script');
    script.src = 'https://nap5k.com/tag.min.js';
    script.dataset.zone = '10293511';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
        console.log('🧹 Ad script cleaned up');
      }
    };
  }, [userProfile]);

  return null;
}


function App() {
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