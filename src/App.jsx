// Main App component - just wraps with AuthProvider
import AppContent from "./AppContent";
import { AuthProvider } from "./contexts/AuthContext";

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;