import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore'; // Added setDoc, doc for initialization logic
import { app } from '../../api/firebase'; // Ensure app is imported if initializeCardsForSpacedRepetition is here

function StudyModeSelector({ 
    deckId, 
    db, 
    authUser, 
    currentMode, 
    onModeChange, 
    dueCardsCount 
}) {
    const [isLoading, setIsLoading] = useState(false);

    // Added for initialization if StudyModeSelector needs to handle it directly
    const initializeCardsForSpacedRepetition = async (deckIdToInit) => {
        if (!authUser || !deckIdToInit) return;

        try {
            // Fetch all cards in the deck
            const cardsQuery = query(collection(db, 'decks', deckIdToInit, 'cards'));
            const cardsSnapshot = await getDocs(cardsQuery);

            const batch = []; // Use a batch for efficiency
            cardsSnapshot.forEach(cardDoc => {
                const cardId = cardDoc.id;
                const progressDocRef = doc(db, 'cardProgress', `${authUser.uid}_${cardId}`);
                batch.push(setDoc(progressDocRef, {
                    userId: authUser.uid,
                    cardId: cardId,
                    deckId: deckIdToInit,
                    easeFactor: 2.5,
                    interval: 0,
                    repetitions: 0,
                    nextReviewDate: new Date().toISOString(), // Set for immediate review
                    lastReviewDate: null,
                    totalReviews: 0,
                    correctStreak: 0
                }, { merge: true })); // Use merge to avoid overwriting if progress exists
            });

            await Promise.all(batch); // Execute all setDoc operations concurrently
            console.log("Cards initialized for spaced repetition.");
        } catch (error) {
            console.error("Error initializing cards for spaced repetition:", error);
            // Handle error appropriately
        }
    };
    
    const handleModeSwitch = async (newMode) => {
        if (newMode === currentMode) return;
        
        setIsLoading(true);
        
        // Enhanced logic to handle spaced repetition initialization
        if (newMode === 'spaced' && deckId) { // Only check if switching to spaced and on a specific deck
            // First, check if ANY cards exist in cardProgress for this deck and user
            const allProgressQuery = query(
                collection(db, 'cardProgress'),
                where('userId', '==', authUser.uid),
                where('deckId', '==', deckId)
            );
            
            const allProgressSnapshot = await getDocs(allProgressQuery);
            
            if (allProgressSnapshot.empty) {
                // No cards have been initialized for spaced repetition yet
                const confirmInit = window.confirm(
                    "This deck hasn't been set up for spaced repetition yet. " +
                    "Would you like to add all cards to your spaced repetition schedule? " +
                    "They will be available for review immediately."
                );
                
                if (!confirmInit) {
                    setIsLoading(false);
                    return; // User cancelled, stay in current mode
                }
                
                await initializeCardsForSpacedRepetition(deckId);
            } else {
                // Cards exist in progress, but check if any are due today
                const dueCardsQuery = query(
                    collection(db, 'cardProgress'),
                    where('userId', '==', authUser.uid),
                    where('deckId', '==', deckId),
                    where('nextReviewDate', '<=', new Date().toISOString())
                );
                
                const dueCardsSnapshot = await getDocs(dueCardsQuery);
                
                if (dueCardsSnapshot.empty) {
                    // Cards exist but none are due today - this is the correct behavior
                    // Just proceed with the mode switch, FlashCardUI will handle the empty state properly
                    console.log("No cards due for review today in this deck.");
                }
            }
        }
        
        await onModeChange(newMode); // Now passes the newMode to the parent handler
        setIsLoading(false);
    };
    
    return (
        <div className="flex items-center gap-3">
            {/* <span className="text-gray-400 text-sm">Study Mode:</span> */}
            
            <div className="flex bg-gray-700 rounded-lg p-1">
                <button
                    onClick={() => handleModeSwitch('cramming')}
                    disabled={isLoading}
                    className={`px-4 py-1 rounded-md font-medium transition-all duration-200 flex items-center gap-2 ${
                        currentMode === 'cramming' 
                            ? 'bg-violet-600 text-white shadow-lg' 
                            : 'text-gray-400 hover:text-white hover:bg-gray-600'
                    }`}
                >
                    <i className="fa-solid fa-bolt"></i>
                    Quick Study
                </button>
                
                <button
                    onClick={() => handleModeSwitch('spaced')}
                    disabled={isLoading}
                    className={`px-4 py-2 rounded-md font-medium transition-all duration-200 flex items-center gap-2 ${
                        currentMode === 'spaced' 
                            ? 'bg-emerald-600 text-white shadow-lg' 
                            : 'text-gray-400 hover:text-white hover:bg-gray-600'
                    }`}
                >
                    <i className="fa-solid fa-brain"></i>
                    Smart Review
                    {/* Only show dueCardsCount badge if deckId exists (i.e., not global review)
                        and if there are due cards. */}
                    {deckId && dueCardsCount > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 ml-1">
                            {dueCardsCount}
                        </span>
                    )}
                </button>
            </div>
            
            {isLoading && (
                <div className="text-gray-400 text-sm">
                    <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                    Switching modes...
                </div>
            )}
        </div>
    );
}

export default StudyModeSelector;