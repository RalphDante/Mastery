import { useEffect, useState, useCallback } from "react";
import { auth, app } from '../../api/firebase';
import { getFirestore, doc, getDoc, collection, query, orderBy, onSnapshot, setDoc, where, getDocs, deleteDoc } from 'firebase/firestore'; 
import { onAuthStateChanged } from "firebase/auth";
import styles from './FlashCardsPage.module.css';

import { Cloudinary } from '@cloudinary/url-gen';
import { AdvancedImage } from '@cloudinary/react';

import SetToPublic from "./SetToPublic";
import EditDeckBtn from "./EditFlashCardBtn";
import StudyModeSelector from "./StudyModeSelector";

// Utils
import { updateFlashCardUIStreaks } from '../../utils/streakUtils';
import { calculateSM2 } from '../../utils/sm2'; 


// FiresStore

import { Timestamp } from 'firebase/firestore';
import { getCurrentTimestamp, getImmediateReviewTimestamp } from '../../utils/sm2'; 

function FlashCardUI({
    knowAnswer, 
    dontKnowAnswer, 
    redoDeck, 
    setRedoDeck, 
    studyMode, 
    onStudyModeChange, 
    currentIndex, 
    setCurrentIndex,
    deckId, 
    db 
}) {
    const [authUser, setAuthUser] = useState(null);
    const [flashCards, setFlashCards] = useState([]);
    const [deck, setDeck] = useState(null); 
    const [currentQuestion, setCurrentQuestion] = useState();
    const [currentAnswer, setCurrentAnswer] = useState();
    const [currentQuestionType, setCurrentQuestionType] = useState('text');
    const [currentAnswerType, setCurrentAnswerType] = useState('text');
    const [showAnswer, setShowAnswer] = useState(false);
    const [answers, setAnswers] = useState([]);
    const [processing, setProcessing] = useState(false); 
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dueCardsCount, setDueCardsCount] = useState(0);
    const [orphanedProgressCount, setOrphanedProgressCount] = useState(0);

    // Cramming mode tracking states
    const [originalDeckSize, setOriginalDeckSize] = useState(0);
    const [uniqueCardsAttempted, setUniqueCardsAttempted] = useState(new Set());
    const [reviewPhase, setReviewPhase] = useState('initial');
    const [phaseOneComplete, setPhaseOneComplete] = useState(false);

    // Initialize Cloudinary
    const cld = new Cloudinary({ cloud: { cloudName: 'dph28fehb' } });

    // Helper function to create optimized Cloudinary image
    const createOptimizedImage = (publicId) => {
        return cld
            .image(publicId)
            .format('auto')
            .quality('auto');
    };

    // Helper function to render content based on type
    const renderContent = (content, type, className) => {
        if (type === 'image' && content) {
            return (
                <AdvancedImage 
                    cldImg={createOptimizedImage(content)} 
                    className={className}
                />
            );
        } else if (type === 'text' && content) {
            return <h2>{content}</h2>;
        }
        return <h2>Content not available</h2>;
    };

    // Auth state listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setAuthUser(user);
        });
        return () => unsubscribe();
    }, []);

    // --- NEW: Clean up orphaned progress documents ---
    const cleanupOrphanedProgress = useCallback(async (progressDocuments) => {
        if (!authUser) return [];

        const validCards = [];
        const orphanedProgressIds = [];

        for (const progressDoc of progressDocuments) {
            const progress = progressDoc.data();
            try {
                const cardDoc = await getDoc(doc(db, 'decks', progress.deckId, 'cards', progress.cardId));
                if (cardDoc.exists()) {
                    validCards.push({
                        id: cardDoc.id,
                        ...cardDoc.data(),
                        deckId: progress.deckId,
                        progress: progress
                    });
                } else {
                    // Card doesn't exist anymore, mark progress for deletion
                    orphanedProgressIds.push(progressDoc.id);
                }
            } catch (error) {
                console.error(`Error checking card ${progress.cardId}:`, error);
                // If there's an error accessing the card, also mark for deletion
                orphanedProgressIds.push(progressDoc.id);
            }
        }

        // Clean up orphaned progress documents
        if (orphanedProgressIds.length > 0) {
            console.log(`Found ${orphanedProgressIds.length} orphaned progress documents. Cleaning up...`);
            setOrphanedProgressCount(orphanedProgressIds.length);
            
            const deletePromises = orphanedProgressIds.map(progressId => 
                deleteDoc(doc(db, 'cardProgress', progressId))
            );
            
            try {
                await Promise.all(deletePromises);
                console.log(`Successfully cleaned up ${orphanedProgressIds.length} orphaned progress documents.`);
            } catch (error) {
                console.error("Error cleaning up orphaned progress:", error);
            }
        } else {
            setOrphanedProgressCount(0);
        }

        return validCards;
    }, [authUser, db]);

    // New Cards Handling
    const initializeNewCardsProgress = useCallback(async (deckId) => {
        if (!authUser || !deckId) return;
        
        try {
            // Get all cards in the deck
            const cardsRef = collection(db, 'decks', deckId, 'cards');
            const cardsSnapshot = await getDocs(cardsRef);
            
            // Get existing progress for this deck
            const progressQuery = query(
                collection(db, 'cardProgress'),
                where('userId', '==', authUser.uid),
                where('deckId', '==', deckId)
            );
            const progressSnapshot = await getDocs(progressQuery);
            
            // Create a Set of card IDs that already have progress
            const existingProgressCardIds = new Set();
            progressSnapshot.forEach(doc => {
                const progress = doc.data();
                existingProgressCardIds.add(progress.cardId);
            });
            
            // Find cards without progress and initialize them
            const newCardsToInitialize = [];
            cardsSnapshot.forEach(cardDoc => {
                if (!existingProgressCardIds.has(cardDoc.id)) {
                    newCardsToInitialize.push(cardDoc.id);
                }
            });
            
            // Initialize progress for new cards (mark them as due immediately)
            const initPromises = newCardsToInitialize.map(cardId => {
                const progressDocRef = doc(db, 'cardProgress', `${authUser.uid}_${cardId}`);
                return setDoc(progressDocRef, {
                    userId: authUser.uid,
                    cardId: cardId,
                    deckId: deckId,
                    easeFactor: 2.5,
                    interval: 0,
                    repetitions: 0,
                    nextReviewDate: getImmediateReviewTimestamp(), // Due immediately
                    lastReviewDate: null,
                    totalReviews: 0,
                    correctStreak: 0
                });
            });
            
            if (initPromises.length > 0) {
                await Promise.all(initPromises);
                console.log(`Initialized progress for ${initPromises.length} new cards`);
            }
            
        } catch (error) {
            console.error("Error initializing new cards progress:", error);
        }
    }, [authUser, db]);

    // --- Enhanced fetch function with cleanup ---
    // --- Enhanced fetch function with cleanup ---
    const fetchDeckAndCards = useCallback(async () => {
        if (!authUser) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        setCurrentIndex(0); 
        knowAnswer(0); 
        dontKnowAnswer(0); 
        setAnswers([]);
        setShowAnswer(false);
        setDueCardsCount(0);
        setOrphanedProgressCount(0);
        
        // Reset cramming mode tracking
        setOriginalDeckSize(0);
        setUniqueCardsAttempted(new Set());
        setReviewPhase('initial');
        setPhaseOneComplete(false);

        try {
            if (studyMode === 'spaced') {
                let progressQuery;
                
                if (deckId) {
                    // Initialize new flashcards first
                    await initializeNewCardsProgress(deckId);
                    
                    // Then create the query for this specific deck
                    progressQuery = query(
                        collection(db, 'cardProgress'),
                        where('userId', '==', authUser.uid),
                        where('deckId', '==', deckId),
                        where('nextReviewDate', '<=', getCurrentTimestamp()),
                        orderBy('nextReviewDate', 'asc')
                    );
                } else {
                    // Global review - all due cards across all decks
                    progressQuery = query(
                        collection(db, 'cardProgress'),
                        where('userId', '==', authUser.uid),
                       where('nextReviewDate', '<=', getCurrentTimestamp()),
                        orderBy('nextReviewDate', 'asc')
                    );
                }
                
                const progressSnapshot = await getDocs(progressQuery);
                const progressDocuments = [];
                progressSnapshot.forEach(doc => {
                    progressDocuments.push(doc);
                });

                // Clean up orphaned progress and get valid cards
                const validCards = await cleanupOrphanedProgress(progressDocuments);
                
                setDueCardsCount(validCards.length); // Set the actual count after cleanup
                setFlashCards(validCards); 
                setLoading(false);

            } else { // 'cramming' mode (specific deck)
                if (deckId) { 
                    const deckDoc = await getDoc(doc(db, 'decks', deckId));
                    if (!deckDoc.exists()) {
                        setError('Deck not found');
                        setLoading(false);
                        return;
                    }
                    const deckData = { id: deckDoc.id, ...deckDoc.data() };
                    
                    if (deckData.ownerId !== authUser.uid && !deckData.isPublic) {
                        setError('You do not have access to this deck');
                        setLoading(false);
                        return;
                    }
                    setDeck(deckData);

                    const cardsRef = collection(db, 'decks', deckId, 'cards');
                    const cardsQuery = query(cardsRef, orderBy('order', 'asc'));
                    
                    const unsubscribe = onSnapshot(cardsQuery, (snapshot) => {
                        const cardsData = [];
                        snapshot.forEach((doc) => {
                            cardsData.push({
                                id: doc.id,
                                ...doc.data(),
                                deckId: deckId 
                            });
                        });
                        
                        // Shuffle cards for cramming mode on initial load/redo
                        let flashCardsCopy = [...cardsData];
                        let shuffledFlashCards = [];
                        while (flashCardsCopy.length !== 0) {
                            let randomNum = Math.floor(Math.random() * flashCardsCopy.length);
                            shuffledFlashCards.push(flashCardsCopy[randomNum]);
                            flashCardsCopy.splice(randomNum, 1);
                        }
                        setFlashCards(shuffledFlashCards);
                        setOriginalDeckSize(shuffledFlashCards.length);
                        setLoading(false);
                    }, (error) => {
                        console.error("Error fetching cards:", error);
                        setError('Failed to load flashcards');
                        setLoading(false);
                    });
                    return unsubscribe; 
                } else {
                    setError('No deck selected for cramming mode.');
                    setLoading(false);
                }
            }
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load data');
            setLoading(false);
        }
    }, [authUser, deckId, db, studyMode, knowAnswer, dontKnowAnswer, cleanupOrphanedProgress, initializeNewCardsProgress]);

    // Effect to trigger data fetching when dependencies change
    useEffect(() => {
        let unsubscribe;
        const setupData = async () => {
            if (unsubscribe) {
                unsubscribe();
            }
            unsubscribe = await fetchDeckAndCards();
        };
        setupData();
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [fetchDeckAndCards]);

    // Handle Redo Deck / Re-fetch on study mode toggle
    useEffect(() => {
        if (redoDeck) {
            fetchDeckAndCards(); 
            setRedoDeck(false);
        }
    }, [redoDeck, setRedoDeck, fetchDeckAndCards]);

    // This shuffle is mainly for cramming mode's "Redo Deck" button
    const handleShuffle = useCallback(() => {
        if (studyMode === 'spaced') {
            // For spaced mode, 'redo deck' means re-fetching due cards, not re-shuffling what's currently loaded
            fetchDeckAndCards(); 
        } else { // Cramming mode shuffle
            // Remove duplicates before shuffling by using a Set based on card IDs
            const uniqueCards = flashCards.filter((card, index, self) => 
                index === self.findIndex(c => c.id === card.id)
            );
            
            // Shuffle the unique cards
            let flashCardsCopy = [...uniqueCards];
            let shuffledFlashCards = [];
            while (flashCardsCopy.length !== 0) {
                let randomNum = Math.floor(Math.random() * flashCardsCopy.length);
                shuffledFlashCards.push(flashCardsCopy[randomNum]);
                flashCardsCopy.splice(randomNum, 1);
            }
            setFlashCards(shuffledFlashCards);
            setOriginalDeckSize(shuffledFlashCards.length);
            setUniqueCardsAttempted(new Set());
            setReviewPhase('initial');
            setPhaseOneComplete(false);
        }
        setShowAnswer(false);
        setCurrentIndex(0);
        knowAnswer(0); 
        dontKnowAnswer(0); 
        setAnswers([]);
        setProcessing(false);
    }, [flashCards, knowAnswer, dontKnowAnswer, setCurrentIndex, studyMode, fetchDeckAndCards]);

    // --- Handle card rating for SM-2 (ONLY FOR SPACED MODE) ---
    const handleSpacedCardRating = useCallback(async (quality) => {
        if (processing || currentIndex >= flashCards.length) return; 
    
        setProcessing(true);
        setShowAnswer(false); 
    
        const currentCard = flashCards[currentIndex];
        const cardId = currentCard.id;
        const currentDeckId = currentCard.deckId;
        const isCorrect = quality >= 3; // Consider 3+ as correct for streak purposes
    
        let currentProgress = {};
        const progressDocRef = doc(db, 'cardProgress', `${authUser.uid}_${cardId}`);
    
        try {
            const progressSnap = await getDoc(progressDocRef);
            if (progressSnap.exists()) {
                currentProgress = progressSnap.data();
            } else {
                currentProgress = {
                    easeFactor: 2.5,
                    interval: 0,
                    repetitions: 0,
                    lastReviewDate: null,
                    totalReviews: 0,
                    correctStreak: 0
                };
            }
    
            const { easeFactor: newEaseFactor, interval: newInterval, repetitions: newRepetitions, nextReviewDate } = calculateSM2(
                quality,
                currentProgress.easeFactor,
                currentProgress.interval,
                currentProgress.repetitions
            );
    
            // Update card progress
            await setDoc(progressDocRef, {
                userId: authUser.uid,
                cardId: cardId,
                deckId: currentDeckId, 
                easeFactor: newEaseFactor,
                interval: newInterval,
                repetitions: newRepetitions,
                nextReviewDate: nextReviewDate,     
                lastReviewDate: getCurrentTimestamp(),
                totalReviews: (currentProgress.totalReviews || 0) + 1,
                correctStreak: quality >= 3 ? (currentProgress.correctStreak || 0) + 1 : 0
            }, { merge: true });
    
            // Update streak system (NEW)
            const streakResult = await updateFlashCardUIStreaks(db, authUser.uid, isCorrect);
            
            if (streakResult && streakResult.isFirstSessionToday && streakResult.isNewStreak) {
                // Optional: Show streak notification
                console.log(`🔥 New streak milestone! ${streakResult.currentStreak} days`);
                // You could set a state here to show a toast notification
            }
    
            // Update local stats
            if (quality >= 3) {
                knowAnswer(prev => prev + 1);
            } else {
                dontKnowAnswer(prev => prev + 1);
            }
            setAnswers(prev => [...prev, quality >= 3]);
    
            setTimeout(() => {
                const newIndex = currentIndex + 1;
                setCurrentIndex(newIndex);
                setProcessing(false);
            }, 200);
    
        } catch (error) {
            console.error("Error updating card progress:", error);
            setError("Failed to update card progress.");
            setProcessing(false);
        }
    }, [currentIndex, flashCards, authUser, db, knowAnswer, dontKnowAnswer, setCurrentIndex, processing]);

    // --- Handle card progression for CRAMMING MODE ---
    const handleCrammingResponse = useCallback(async (isCorrect) => {
    if (processing || currentIndex >= flashCards.length) return;

    setProcessing(true);
    setShowAnswer(false);

    const currentCard = flashCards[currentIndex];
    const currentCardId = currentCard.id;

    try {
        // Track streak for cramming mode too (NEW)
        const streakResult = await updateFlashCardUIStreaks(db, authUser.uid, isCorrect);
        
        if (streakResult && streakResult.isFirstSessionToday && streakResult.isNewStreak) {
            console.log(`🔥 New streak milestone! ${streakResult.currentStreak} days`);
        }

        // Rest of your existing cramming logic...
        const newUniqueAttempted = new Set([...uniqueCardsAttempted, currentCardId]);
        setUniqueCardsAttempted(newUniqueAttempted);

        const shouldCompletePhaseOne = newUniqueAttempted.size === originalDeckSize && !phaseOneComplete;

        if (isCorrect) {
            if (!phaseOneComplete || !uniqueCardsAttempted.has(currentCardId)) {
                knowAnswer(prev => prev + 1);
            }
            
            setAnswers(prev => [...prev, true]);
            
            setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
                setProcessing(false);
                
                if (shouldCompletePhaseOne) {
                    setPhaseOneComplete(true);
                    setReviewPhase('reviewing');
                }
            }, 200);

        } else {
            if (!phaseOneComplete || !uniqueCardsAttempted.has(currentCardId)) {
                dontKnowAnswer(prev => prev + 1);
            }
            
            setAnswers(prev => [...prev, false]);
            setFlashCards(prevCards => [...prevCards, currentCard]);

            setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
                setProcessing(false);
                
                if (shouldCompletePhaseOne) {
                    setPhaseOneComplete(true);
                    setReviewPhase('reviewing');
                }
            }, 200);
        }
    } catch (error) {
        console.error("Error in cramming response:", error);
        setProcessing(false);
    }
}, [currentIndex, flashCards, knowAnswer, dontKnowAnswer, setCurrentIndex, processing, 
    originalDeckSize, uniqueCardsAttempted, phaseOneComplete, db, authUser]);


    const handleShowAnswer = () => {
        setShowAnswer(!showAnswer);
    };

    const handleGoBack = useCallback(() => {
        setProcessing(true);
        if (currentIndex > 0) {
            setShowAnswer(false);
            setTimeout(() => {
                const lastAnswerWasCorrect = answers[currentIndex - 1];
                if (lastAnswerWasCorrect) {
                    knowAnswer(prev => prev - 1);
                } else {
                    dontKnowAnswer(prev => prev - 1);
                }
                setCurrentIndex(currentIndex - 1);
                setAnswers(answers.slice(0, -1)); 
                setProcessing(false);
            }, 200);
        } else {
            setProcessing(false);
        }
    }, [currentIndex, answers, knowAnswer, dontKnowAnswer, setCurrentIndex, processing]);

    // Update current question/answer when flashCards or currentIndex changes
    useEffect(() => {
        if (flashCards.length > 0 && currentIndex < flashCards.length) {
            const currentCard = flashCards[currentIndex];
            setCurrentQuestion(currentCard?.question);
            setCurrentAnswer(currentCard?.answer);
            setCurrentQuestionType(currentCard?.question_type || 'text');
            setCurrentAnswerType(currentCard?.answer_type || 'text');
        } else if (flashCards.length > 0 && currentIndex >= flashCards.length) {
            setShowAnswer(false); 
        }
    }, [flashCards, currentIndex]);

    // Helper to calculate approximate next interval for display on buttons
    const getApproximateNextInterval = (quality) => {
        if (!flashCards[currentIndex] || !flashCards[currentIndex].progress) {
            return '?d'; 
        }
        const { easeFactor, interval, repetitions } = flashCards[currentIndex].progress;
        const { interval: approxInterval } = calculateSM2(quality, easeFactor, interval, repetitions);
        return `${approxInterval}d`;
    };

    // Render Score Container
    const renderScoreContainer = () => {
        if (studyMode === 'cramming') {
            const remainingCards = flashCards.length - currentIndex;
            const progressThroughOriginal = Math.min(currentIndex + 1, originalDeckSize);
            
            return (
                <div className={`${styles.scoreContainer}`}>
                    <div style={{ margin: '0px', textAlign: 'center' }}>
                        {phaseOneComplete ? (
                            <>
                                <span className="text-white/70 text-sm">Review Phase</span>
                                <div style={{ 
                                    fontSize: '0.7rem', 
                                    color: '#F59E0B', 
                                    marginTop: '0.5px'
                                }}>
                                    {remainingCards} left
                                </div>
                            </>
                        ) : (
                            <div className="text-center text-white/70 text-sm my-3">
                                Card {progressThroughOriginal} of {originalDeckSize}
                            </div>
                        )}
                    </div>
                </div>
            );
        } else {
            // Spaced mode - simpler display
            return (
                <div className={styles.scoreContainer}>
                    <div className="text-center text-white/70 text-sm my-3">
                        {currentIndex < flashCards.length ? 
                            `Card ${currentIndex + 1} of ${flashCards.length}` : 
                            `Card ${flashCards.length} of ${flashCards.length}`
                        }
                    </div>
                </div>
            );
        }
    };

    // Render different button sets based on study mode
    const renderStudyButtons = () => {
        const isDisabled = processing || flashCards.length === 0 || currentIndex >= flashCards.length;

        if (studyMode === 'spaced') {
            return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                    <button
                        className="w-full py-2 px-4 bg-red-600 text-white border-2 border-red-600 rounded-full font-semibold shadow-sm hover:bg-red-700 hover:border-red-700 transition-all duration-150 disabled:opacity-50"
                        disabled={isDisabled}
                        onClick={() => handleSpacedCardRating(0)}
                    >
                        Again
                    </button>

                    <button
                        className="w-full py-2 px-4 bg-orange-600 text-white border-2 border-orange-600 rounded-full font-semibold shadow-sm hover:bg-orange-700 hover:border-orange-700 transition-all duration-150 disabled:opacity-50"
                        disabled={isDisabled}
                        onClick={() => handleSpacedCardRating(3)}
                    >
                        Hard
                    </button>

                    <button
                        className="w-full py-2 px-4 bg-blue-600 text-white border-2 border-blue-600 rounded-full font-semibold shadow-sm hover:bg-blue-700 hover:border-blue-700 transition-all duration-150 disabled:opacity-50"
                        disabled={isDisabled}
                        onClick={() => handleSpacedCardRating(4)}
                    >
                        Good
                    </button>

                    <button
                        className="w-full py-2 px-4 bg-green-600 text-white border-2 border-green-600 rounded-full font-semibold shadow-sm hover:bg-green-700 hover:border-green-700 transition-all duration-150 disabled:opacity-50"
                        disabled={isDisabled}
                        onClick={() => handleSpacedCardRating(5)}
                    >
                        Easy
                    </button>
                </div>
            );
        } else { // 'cramming' mode buttons
            return (
                <div className={`${styles.buttonsContainer} gap-4`}>
                    {/* <button className={`${styles.outerFlashCardButtons} border-slate-700`} disabled={isDisabled || currentIndex === 0} onClick={handleGoBack}>
                        <i class="fas fa-arrow-left"></i>
                    </button> */}
                    <button 
                        className="group relative min-w-12 min-h-12 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all hover:-translate-y-1 flex items-center justify-center text-white/80 hover:text-white"
                        disabled={isDisabled || currentIndex === 0} 
                        onClick={handleGoBack}
                    >
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black/90 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Previous Card
                        </div>
                        ←
                    </button>


                    <div className="flex gap-2">
                        <button 
                            className="group relative px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-medium transition-all hover:-translate-y-1 hover:shadow-lg flex items-center gap-2"
                            // disabled={isDisabled}
                            onClick={()=>{handleCrammingResponse(false)}}
                        >
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black/90 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            Mark as Incorrect
                            </div>
                            ✕ Incorrect
                        </button>
                        {/* <button className={`${styles.innerFlashCardButtons} hover:bg-red-600 transition-all duration-200`} disabled={isDisabled} onClick={() => handleCrammingResponse(false)}> 
                            <i className="fa-solid fa-xmark " id="wrongButton"></i>
                        </button> */}
                    


                        {/* <button className={`${styles.innerFlashCardButtons} hover:bg-emerald-600 transition-all duration-200`} disabled={isDisabled} onClick={() => handleCrammingResponse(true)} style={{ padding: '10px 13px' }}> 
                            <i className="fa-solid fa-check" id="checkButton"></i>
                        </button> */}
                        <button 
                            className="group relative px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-medium transition-all hover:-translate-y-1 hover:shadow-lg flex items-center gap-2"
                            disabled={isDisabled}
                            onClick={()=>{handleCrammingResponse(true)}}
                        >
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black/90 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            Mark as Correct
                            </div>
                            ✓ Correct
                        </button>
                    </div>
                    
                        <button 
                            className="group relative min-w-12 min-h-12 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all hover:-translate-y-1 flex items-center justify-center text-white/80 hover:text-white"
                            disabled={isDisabled} 
                            onClick={handleShuffle}
                        >
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black/90 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            Shuffle Deck
                            </div>
                            🔀
                        </button>
                    
{/*                     
                    <button className={`${styles.outerFlashCardButtons}`} disabled={isDisabled} onClick={handleShuffle}>
                        <i class="fas fa-random"></i>
                    </button> */}
                </div>
            );
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <h2>Loading flashcards...</h2>
                {orphanedProgressCount > 0 && (
                    <p className="text-yellow-400 text-sm mt-2">
                        Cleaning up {orphanedProgressCount} orphaned progress records...
                    </p>
                )}
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className={styles.errorContainer}>
                <h2>Error: {error}</h2>
                <button onClick={() => window.location.reload()}>Retry</button>
            </div>
        );
    }

    // No cards state based on study mode
    if (flashCards.length === 0) { 
        if (studyMode === 'cramming' && deckId) {
            return (
                <div className={styles.emptyContainer}>
                    <h2>No flashcards found in this deck.</h2>
                    <p className="text-gray-400 mt-2">You can add new cards via the "Edit Deck" button.</p>
                </div>
            );
        } else if (studyMode === 'spaced') {
            return (
                <div className={styles.emptyContainer}>
                    <h2>You have no cards due for review today! 🎉</h2>
                    <p className="text-gray-400 mt-2">Check back later or try "Quick Study" mode to drill your decks.</p>
                    {orphanedProgressCount > 0 && (
                        <p className="text-green-400 text-sm mt-2">
                            ✅ Cleaned up {orphanedProgressCount} orphaned progress records.
                        </p>
                    )}
                </div>
            );
        } else {
            return (
                <div className={styles.emptyContainer}>
                    <h2>No flashcards to display.</h2>
                </div>
            );
        }
    }

    return (
        <>  
            {/* Buttons */}
            <div className={`flex justify-between mb-1`}>
                <div>
                    {deckId && <EditDeckBtn deckId={deckId} />} 
                    {/* {deckId && deck && <SetToPublic deckId={deckId} deck={deck} />}  */}
                </div>
             
                <div>
                    {authUser && (
                        <StudyModeSelector 
                            deckId={deckId} 
                            db={db} 
                            authUser={authUser} 
                            currentMode={studyMode} 
                            onModeChange={onStudyModeChange} 
                            dueCardsCount={dueCardsCount}
                        />
                    )}
                </div>
                
            </div>

            <div >
                {renderScoreContainer()}
            </div>

            {/* Show cleanup notification if orphaned progress was found */}
            {orphanedProgressCount > 0 && (
                <div className="bg-green-900/50 border border-green-700 rounded-lg p-3 mb-4">
                    <p className="text-green-200 text-sm">
                        ✅ Cleaned up {orphanedProgressCount} orphaned progress records from deleted cards.
                    </p>
                </div>
            )}
            
            <div className={`${styles.flashCardTextContainer}`} onClick={handleShowAnswer}>
                <div className={`${styles.flipCardInner} ${showAnswer ? styles.flipped : ''}`}>
                    <div className={`${styles.flipCardFront} bg-white/5 border border-white/10`}>
                        {currentIndex < flashCards.length ? (
                            renderContent(currentQuestion, currentQuestionType, styles.questionImage)
                        ) : (
                            <h2>You completed it!!!</h2>
                        )}
                    </div>
                    <div className={`${styles.flipCardBack} bg-white/5 border border-white/10`}>
                        {currentIndex < flashCards.length ? (
                            renderContent(currentAnswer, currentAnswerType, styles.questionImage)
                        ) : (
                            <h2>You completed it!!!</h2>
                        )}
                    </div>
                </div>
            </div>
            
            {renderStudyButtons()}
        </>
    );
}

export default FlashCardUI;