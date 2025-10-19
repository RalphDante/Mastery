// Main App component - just wraps with AuthProvider
import AppContent from "./AppContent";
import { AuthProvider } from "./contexts/AuthContext";
import { DeckCacheProvider } from "./contexts/DeckCacheContext";
import { PartyProvider } from "./contexts/PartyContext";
import { UserDataProvider } from "./contexts/UserDataContext";

function App() {
  return (
    <AuthProvider>
      <PartyProvider>
        <UserDataProvider>
          <DeckCacheProvider>
            <AppContent />
          </DeckCacheProvider>
        </UserDataProvider>
      </PartyProvider>
    </AuthProvider>
  );
}

export default App;