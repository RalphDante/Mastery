import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, setDoc, doc, getDoc } from 'firebase/firestore'; // Added setDoc, doc for initialization logic
import { app } from '../../api/firebase'; // Ensure app is imported if initializeCardsForSpacedRepetition is here
import { db } from '../../api/firebase';
import { createPortal } from 'react-dom';
import TutorialOverlay from '../../components/tutorials/TutorialOverlay';
import { useTutorials } from '../../contexts/TutorialContext';
import { getImmediateReviewTimestamp } from '../../utils/sm2';
import { Timestamp } from 'firebase/firestore';
import EditDeckBtn from './EditFlashCardBtn';


function StudyModeSelector({ 
    deckId, 
    db, 
    authUser, 
    currentMode, 
    onModeChange, 
    dueCardsCount,
    disableSpaced = false // New prop with default value
}) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const { isTutorialAtStep, advanceStep } = useTutorials();
    const chooseSmartReviewTutorial = isTutorialAtStep("smart-review", 1);

    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    
    const [isLoading, setIsLoading] = useState(false);

    const dropdownRef = useRef(null);

    // Check if we're on mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 640); // sm breakpoint
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Close dropdown when clicking outside
        useEffect(() => {
            const handleClickOutside = (event) => {
                if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                    setIsDropdownOpen(false);
                }
            };
            document.addEventListener('click', handleClickOutside);
            return () => {
                document.removeEventListener('click', handleClickOutside);
            };
        }, []);

    // Don't auto-open the menu - let user click it first during tutorial

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

    const handleMobileMenuClick = () => {
        if (chooseSmartReviewTutorial && !showMobileMenu) {
            // If tutorial is active and menu is closed, open it
            setShowMobileMenu(true);
        } else {
            // Normal behavior
            setShowMobileMenu(!showMobileMenu);
        }
    };
    
    return (
        <>
            {/* Desktop Tutorial Overlay */}
            {/* <TutorialOverlay isVisible={chooseSmartReviewTutorial && !isMobile}>
                <div className="relative bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 max-w-md w-full p-6 text-white animate-bounce">
                <span role="img" aria-label="sparkles">✨</span> 
                Let's add this deck for <span className="text-emerald-600">Smart Review</span>!
                </div>
            </TutorialOverlay> */}

            {/* Mobile Tutorial Overlay for Menu Button */}
            {/* <TutorialOverlay isVisible={chooseSmartReviewTutorial && isMobile && !showMobileMenu}>
                <div className="relative bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 max-w-md w-full p-6 text-white animate-bounce">
                <span role="img" aria-label="sparkles">✨</span> 
                Tap the menu to access <span className="text-emerald-600">Smart Review</span>!
                </div>
            </TutorialOverlay> */}

        
        <div className="relative">
            

            <div className=" items-center gap-3">
                {/* <span className="text-gray-400 text-sm">Study Mode:</span> */}
                
               
                    {/* <button
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
                    </button> */}

                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={()=>setIsDropdownOpen(isDropdownOpen ? false : true)}
                            className={`bg-gray-800 rounded-lg p-3 text-white hover:bg-gray-600 transition-all duration-200 relative`}
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <circle cx="5" cy="12" r="2"/>
                                <circle cx="12" cy="12" r="2"/>
                                <circle cx="19" cy="12" r="2"/>
                            </svg>
                        </button>
                        
                        <div className={`${isDropdownOpen ? 'block' : 'hidden'} absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5`}>
                            <EditDeckBtn 
                                deckId = {deckId}
                            />
                        </div>
                    </div>
                
               
            </div>
            
            
           
            
        </div>
        </>
        
    );
}

export default StudyModeSelector;