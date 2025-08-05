import { createContext, useContext } from 'react';
import { useTutorialState } from '../utils/tutorials/hooks';

const TutorialContext = createContext();

export function TutorialProvider({ children, authUser }) {
  const tutorialState = useTutorialState(authUser); // Only called ONCE
  
  return (
    <TutorialContext.Provider value={tutorialState}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorials() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorials must be used within TutorialProvider');
  }
  return context;
}