// Main App component - just wraps with AuthProvider
import AppContent from "./AppContent";
import { AuthProvider, useAuthContext } from "./contexts/AuthContext";
import { DeckCacheProvider } from "./contexts/DeckCacheContext";
import { LeaderboardProvider } from "./contexts/LeaderboardContext.jsx";
import { PartyProvider } from "./contexts/PartyContext";
import { UserDataProvider } from "./contexts/UserDataContext";

function App() {
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