import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../api/firebase';

export function useTutorialState(authUser) {
  const [tutorials, setTutorials] = useState({});
  const [loading, setLoading] = useState(true);

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
        setLoading(false); // Don't forget to set loading to false
    };

    fetchTutorials();
  }, [authUser]);

  // Update tutorial state locally + Firestore
  const updateTutorial = async (tutorialName, updates) => {
    if (!authUser) return;

    // Calculate the new state first
    let newTutorialState;
    setTutorials(prev => {
      newTutorialState = {
        ...prev[tutorialName],
        ...updates
      };
      return {
        ...prev,
        [tutorialName]: newTutorialState
      };
    });

    // Update Firestore in background using the calculated new state
    try {
      await updateDoc(doc(db, "users", authUser.uid), {
        [`tutorials.${tutorialName}`]: newTutorialState
      });
    } catch (error) {
      console.error("Error updating tutorial:", error);
      // Could revert local state here if needed
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
    // Fix: Use functional update to ensure we have the latest state
    advanceStep: (name) => {
      setTutorials(prev => {
        if (!prev[name]) return prev;
        const newStep = prev[name].step + 1;
        updateTutorial(name, { step: newStep });
        return {
          ...prev,
          [name]: { ...prev[name], step: newStep }
        };
      });
    },
    goBackAStep: (name) => {
      setTutorials(prev => {
        if (!prev[name]) return prev;
        const newStep = prev[name].step - 1;
        updateTutorial(name, { step: newStep });
        return {
          ...prev,
          [name]: { ...prev[name], step: newStep }
        };
      });
    },
    completeTutorial: (name) => updateTutorial(name, { completed: true })
  };
}

function getDefaultTutorials() {
  return {
    "create-deck": { completed: false, step: 1 },
    "smart-review": { completed: false, step: 1 },
    "global-review": { completed: false, step: 1 },
    "deck-sharing": { completed: false, step: 1 }
  };
}