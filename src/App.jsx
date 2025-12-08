// Main App component - just wraps with AuthProvider
import AppContent from "./AppContent";
import { AuthProvider, useAuthContext } from "./contexts/AuthContext";
import { DeckCacheProvider } from "./contexts/DeckCacheContext";
import { LeaderboardProvider } from "./contexts/LeaderboardContext.jsx";
import { PartyProvider } from "./contexts/PartyContext";
import { UserDataProvider } from "./contexts/UserDataContext";
import { useEffect, useState } from "react";

// Component that loads ads only for free users
function AdLoader() {
  const { userProfile } = useAuthContext();
  const [isBigScreen, setIsBigScreen] = useState(window.innerWidth >= 992);

  useEffect(() => {
    const handleResize = () => setIsBigScreen(window.innerWidth >= 992);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

 
  useEffect(() => {
    // This effect MUST react to BOTH userProfile and screen size
    if (!isBigScreen) {
      console.log('Mobile/small screen → removing banner ads');
      const existing = document.querySelector('script[src="https://nap5k.com/tag.min.js"]');
      if (existing) existing.remove();
      return;
    }

    // Clean any old script first
    const existingScript = document.querySelector('script[src="https://nap5k.com/tag.min.js"]');
    if (existingScript) existingScript.remove();

    // Pro user?
    if (userProfile?.subscription?.tier === "pro") {
      console.log('Pro user - no ads');
      return;
    }

    // Profile not loaded yet?
    if (!userProfile?.createdAt) {
      console.log('Profile not loaded - skipping ads');
      return;
    }

    // 24h protection?
    const createdAt = userProfile.createdAt.toDate?.() ?? new Date(userProfile.createdAt);
    const hoursOld = (Date.now() - createdAt.getTime()) / 36e5; // 1000*60*60
    if (hoursOld < 24) {
      console.log(`New user protection: ${(24 - hoursOld).toFixed(1)}h left`);
      return;
    }

    // All checks passed → load ads
    console.log('Loading banner ads (big screen + free + >24h)');
    const script = document.createElement('script');
    script.src = 'https://nap5k.com/tag.min.js';
    script.dataset.zone = '10293511';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) script.remove();
    };
  }, [userProfile, isBigScreen]);

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