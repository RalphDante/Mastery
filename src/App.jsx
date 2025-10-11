// Main App component - just wraps with AuthProvider
import AppContent from "./AppContent";
import { AuthProvider } from "./contexts/AuthContext";
import { DeckCacheProvider } from "./contexts/DeckCacheContext";

function App() {
  return (
    <AuthProvider>
      <DeckCacheProvider>
        <AppContent />
      </DeckCacheProvider>
    </AuthProvider>
  );
}

export default App;