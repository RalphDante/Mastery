import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../api/firebase';
import { useAuthContext } from '../../contexts/AuthContext';

export function useTutorialState() {
  const [tutorials, setTutorials] = useState({});
  const [loading, setLoading] = useState(true);
  const {user} = useAuthContext();
  const authUser = user;

  // Fetch tutorial data on mount
  useEffect(() => {
    if (!authUser) {
      setLoading(false);
      return;
    }

    const fetchTutorials = async () => {
        const userDoc = await getDoc(doc(db, "users", authUser.uid));
        let tutorials = userDoc.data()?.tutorials;
       
        if (!tutorials) {
        tutorials = getDefaultTutorials();
        // Lazy write: add tutorials field when missing
        await updateDoc(doc(db, "users", authUser.uid), { tutorials });
        }
        
        setTutorials(tutorials);
        setLoading(false);
    };

    fetchTutorials();
  }, [authUser]);

  // Update tutorial state locally + Firestore
  const updateTutorial = async (tutorialName, updates) => {
    if (!authUser) return;

    let newTutorialState;
    setTutorials(prev => {
      newTutorialState = {
        ...(prev[tutorialName] || {}), // ← This is crucial
        ...updates
      };
      return {
        ...prev,
        [tutorialName]: newTutorialState
      };
    });

    try {
      await updateDoc(doc(db, "users", authUser.uid), {
        [`tutorials.${tutorialName}`]: newTutorialState
      });
    } catch (error) {
      console.error("Error updating tutorial:", error);
    }
  };

  return { 
    tutorials, 
    loading,
    // Generic check - is tutorial active and not completed
    isInTutorial: (name) => tutorials[name] && !tutorials[name].completed,
    
    // Specific step check
    isTutorialAtStep: (name, step) => tutorials[name] && !tutorials[name].completed && tutorials[name].step === step,
    
    // Check if tutorial should show (step >= minStep)
    shouldShowTutorial: (name, minStep = 1) => tutorials[name] && !tutorials[name].completed && tutorials[name].step >= minStep,
    
    updateTutorial,
    
    // FIXED: No more double updates or async in setState
    advanceStep: async (name) => {
      if (!authUser) return;
      
      // Use functional update to get current state
      let currentStep;
      setTutorials(prev => {
        if (!prev[name]) return prev;
        currentStep = prev[name].step;
        return prev;
      });
      
      if (currentStep !== undefined) {
        await updateTutorial(name, { step: currentStep + 1 });
      }
    },
    
    goBackAStep: async (name) => {
      if (!tutorials[name]) return;
      const newStep = tutorials[name].step - 1;
      await updateTutorial(name, { step: newStep });
    },
    
    completeTutorial: (name) => updateTutorial(name, { completed: true })
  };
}

function getDefaultTutorials() {
  return {
    "create-deck": { completed: false, step: 1 },
    "global-review": { completed: false, step: 1 },
    "deck-sharing": { completed: false, step: 1 }
  };
}