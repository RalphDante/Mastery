import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, setDoc, doc, getDoc } from 'firebase/firestore'; // Added setDoc, doc for initialization logic
import { app } from '../../api/firebase'; // Ensure app is imported if initializeCardsForSpacedRepetition is here
import { db } from '../../api/firebase';
import { createPortal } from 'react-dom';
import TutorialOverlay from '../../components/tutorials/TutorialOverlay';
import { useTutorials } from '../../contexts/TutorialContext';
import { getImmediateReviewTimestamp } from '../../utils/sm2';
import { Timestamp } from 'firebase/firestore';

function StudyModeSelector({ 
    deckId, 
    db, 
    authUser, 
    currentMode, 
    onModeChange, 
    dueCardsCount,
    disableSpaced = false // New prop with default value
}) {

    const { isTutorialAtStep, advanceStep } = useTutorials();
    const chooseSmartReviewTutorial = isTutorialAtStep("smart-review", 1);

    const [showMobileMenu, setShowMobileMenu] = useState(false);
    
    const [isLoading, setIsLoading] = useState(false);

    // Added for initialization if StudyModeSelector needs to handle it directly
    const initializeCardsForSpacedRepetition = async (deckIdToInit) => {
        if (!authUser || !deckIdToInit) return;

        try {
            // Fetch all cards in the deck
            const cardsQuery = query(collection(db, 'decks', deckIdToInit, 'cards'));
            const cardsSnapshot = await getDocs(cardsQuery);

            const maxNewCardsPerDay = 8; // or make this a prop/config

            // 1. Get all cards and sort (optional, but recommended for order)
            const cards = [];
            cardsSnapshot.forEach(cardDoc => {
            cards.push({ id: cardDoc.id, ...cardDoc.data() });
            });
            cards.sort((a, b) => (a.order || 0) - (b.order || 0));

            // 2. Loop and set nextReviewDate
            const batch = [];
            cards.forEach((card, index) => {
            const progressDocRef = doc(db, 'cardProgress', `${authUser.uid}_${card.id}`);
            let nextReviewDate;
            if (index < maxNewCardsPerDay) {
                nextReviewDate = getImmediateReviewTimestamp(); // Due now
            } else {
                // Schedule for future days
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const daysToWait = Math.floor(index / maxNewCardsPerDay);
                const futureDate = new Date(today);
                futureDate.setDate(today.getDate() + daysToWait);
                nextReviewDate = Timestamp.fromDate(futureDate);
            }
            batch.push(setDoc(progressDocRef, {
                userId: authUser.uid,
                cardId: card.id,
                deckId: deckIdToInit,
                easeFactor: 2.5,
                interval: 0,
                repetitions: 0,
                nextReviewDate,
                lastReviewDate: null,
                totalReviews: 0,
                correctStreak: 0
            }, { merge: true }));
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
        
        // Prevent switching to spaced mode if disabled
        if (newMode === 'spaced' && disableSpaced) {
            return; // Do nothing if spaced mode is disabled
        }

        if (chooseSmartReviewTutorial){
            advanceStep("smart-review");
        }
        
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
                // // No cards have been initialized for spaced repetition yet
                // const confirmInit = window.confirm(
                //     "This deck hasn't been set up for spaced repetition yet. " +
                //     "Would you like to add all cards to your spaced repetition schedule? " +
                //     "They will be available for review immediately."
                // );
                
                // if (!confirmInit) {
                //     setIsLoading(false);
                //     return; // User cancelled, stay in current mode
                // }
                
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
        <>

            <TutorialOverlay isVisible={chooseSmartReviewTutorial}>
                <div className="relative bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 max-w-md w-full p-6 text-white animate-bounce">
                <span role="img" aria-label="sparkles">✨</span> 
                Let's add this deck for <span className="text-emerald-600">Smart Review</span>!
                </div>
            </TutorialOverlay>

        
        <div className="relative">
            

            <div className="hidden sm:flex items-center gap-3">
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
                        disabled={isLoading || disableSpaced} // Disable button if disableSpaced is true
                        className={`group relative px-4 py-2 rounded-md font-medium transition-all duration-200 flex items-center gap-2 ${
                            currentMode === 'spaced' 
                                ? 'bg-emerald-600 text-white shadow-lg' 
                                : disableSpaced 
                                    ? 'text-gray-500 cursor-not-allowed bg-gray-600' // Disabled styles
                                    : 'bg-gray-600 text-gray-500 hover:text-white hover:bg-gray-600'
                        } ${chooseSmartReviewTutorial ? 'ring-4 ring-yellow-400 ring-offset-2 animate-pulse scale-110 z-50' : ''}
                        
                        `}
                    >
                        {/* Tooltip for disabled state */}
                        {disableSpaced && (
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black/90 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                                🔒 Copy this deck to unlock Smart Review
                            </div>
                        )}
                        
                        <i className="fa-solid fa-brain"></i>
                        Smart Review
                        {disableSpaced && <span className="ml-1">🔒</span>}
                        
                        {/* Only show dueCardsCount badge if deckId exists (i.e., not global review)
                            and if there are due cards and spaced mode is not disabled. */}
                        {deckId && dueCardsCount > 0 && !disableSpaced && (
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
            
            
            {/* Mobile Version */}
                <div className="sm:hidden">
                    <button
                        onClick={() => setShowMobileMenu(!showMobileMenu)}
                        className="bg-gray-700 rounded-lg p-3 text-white hover:bg-gray-600 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="5" cy="12" r="2"/>
                            <circle cx="12" cy="12" r="2"/>
                            <circle cx="19" cy="12" r="2"/>
                        </svg>
                    </button>
                </div>

                {/* Mobile Menu Overlay */}
                {showMobileMenu && (
                    <>
                        {/* Backdrop */}
                        <div 
                            className="sm:hidden fixed inset-0 bg-black/50 z-40"
                            onClick={() => setShowMobileMenu(false)}
                        />
                        
                        {/* Bottom Menu */}
                        <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-gray-800 rounded-t-2xl p-6 z-50 animate-in slide-in-from-bottom duration-300">
                            <div className="flex flex-col gap-3">
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
                                    disabled={isLoading || disableSpaced} // Disable button if disableSpaced is true
                                    className={`group relative px-4 py-2 rounded-md font-medium transition-all duration-200 flex items-center gap-2 ${
                                        currentMode === 'spaced' 
                                            ? 'bg-emerald-600 text-white shadow-lg' 
                                            : disableSpaced 
                                                ? 'text-gray-500 cursor-not-allowed bg-gray-600' // Disabled styles
                                                : 'text-gray-400 hover:text-white hover:bg-gray-600'
                                    }`}
                                >
                                    {/* Tooltip for disabled state */}
                                    {disableSpaced && (
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black/90 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                                            🔒 Copy this deck to unlock Smart Review
                                        </div>
                                    )}
                                    
                                    <i className="fa-solid fa-brain"></i>
                                    Smart Review
                                    {disableSpaced && <span className="ml-1">🔒</span>}
                                    
                                    {/* Only show dueCardsCount badge if deckId exists (i.e., not global review)
                                        and if there are due cards and spaced mode is not disabled. */}
                                    {deckId && dueCardsCount > 0 && !disableSpaced && (
                                        <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 ml-1">
                                            {dueCardsCount}
                                        </span>
                                    )}
                                </button>
                            </div>
                            
                            {/* Close indicator */}
                            <div className="absolute top-3 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gray-600 rounded-full" />
                        </div>
                    </>
                )}
            
        </div>
        </>
        
    );
}

export default StudyModeSelector;