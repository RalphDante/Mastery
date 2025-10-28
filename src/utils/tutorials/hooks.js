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
    
    advanceStep: async (name) => {
      if (!authUser) return;
      
      // Calculate the new state BEFORE setState
      const currentTutorial = tutorials[name];
      const newTutorialState = currentTutorial 
        ? { ...currentTutorial, step: currentTutorial.step + 1 }
        : { completed: false, step: 2 }; // If missing, start at step 2
      
      // Update local state
      setTutorials(prev => ({
        ...prev,
        [name]: newTutorialState
      }));
      
      // Update Firestore
      try {
        await updateDoc(doc(db, "users", authUser.uid), {
          [`tutorials.${name}`]: newTutorialState
        });
      } catch (error) {
        console.error("Error updating tutorial:", error);
      }
    },

    goBackAStep: async (name) => {
      if (!authUser) return;
      const currentTutorial = tutorials[name];
      if (!currentTutorial) return;
      
      const newTutorialState = {
        ...currentTutorial,
        step: currentTutorial.step - 1
      };
      
      setTutorials(prev => ({
        ...prev,
        [name]: newTutorialState
      }));
      
      try {
        await updateDoc(doc(db, "users", authUser.uid), {
          [`tutorials.${name}`]: newTutorialState
        });
      } catch (error) {
        console.error("Error updating tutorial:", error);
      }
    },

    completeTutorial: async (name) => {
      if (!authUser) return;
      
      const newTutorialState = {
        ...(tutorials[name] || {}),
        completed: true
      };
      
      setTutorials(prev => ({
        ...prev,
        [name]: newTutorialState
      }));
      
      try {
        await updateDoc(doc(db, "users", authUser.uid), {
          [`tutorials.${name}`]: newTutorialState
        });
      } catch (error) {
        console.error("Error updating tutorial:", error);
      }
    }

  };
}

function getDefaultTutorials() {
  return {
    "create-deck": { completed: false, step: 1 },
    "global-review": { completed: false, step: 1 },
    "deck-sharing": { completed: false, step: 1 },
    "create-ai": { completed: false, step: 1 }
  };
}