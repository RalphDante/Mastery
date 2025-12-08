// Main App component - just wraps with AuthProvider
import AppContent from "./AppContent";
import { AuthProvider } from "./contexts/AuthContext";
import { DeckCacheProvider } from "./contexts/DeckCacheContext";
import { LeaderboardProvider } from "./contexts/LeaderboardContext.jsx";
import { PartyProvider } from "./contexts/PartyContext";
import { UserDataProvider } from "./contexts/UserDataContext";
import { useEffect } from "react";

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
              <AppContent />
            </LeaderboardProvider>
          </DeckCacheProvider>
        </UserDataProvider>
      </PartyProvider>
    </AuthProvider>
  );
}

export default App;