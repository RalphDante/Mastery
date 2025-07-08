import { useEffect, useState, useCallback } from "react";
import { auth, app } from '../../api/firebase';
import { getFirestore, doc, getDoc, collection, query, orderBy, onSnapshot, setDoc, where, getDocs } from 'firebase/firestore'; 
import { onAuthStateChanged } from "firebase/auth";
import styles from './FlashCardsPage.module.css';

import { Cloudinary } from '@cloudinary/url-gen';
import { AdvancedImage } from '@cloudinary/react';

import SetToPublic from "./SetToPublic";
import { calculateSM2 } from '../../utils/sm2'; 
import EditDeckBtn from "./EditFlashCardBtn";
import StudyModeSelector from "./StudyModeSelector"; // Ensure this import is correct

function FlashCardUI({
    knowAnswer, 
    dontKnowAnswer, 
    percent, 
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
    const [answers, setAnswers] = useState([]); // To track local session progress (for 'Go Back' and percentage calc)
    const [processing, setProcessing] = useState(false); 
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dueCardsCount, setDueCardsCount] = useState(0); // NEW: State to hold due cards count for selector

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

    // --- Fetch deck and flashcards from Firestore based on study mode ---
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
        percent(0); 
        setAnswers([]);
        setShowAnswer(false);
        setDueCardsCount(0); // Reset due cards count on new fetch
    
        try {
            if (studyMode === 'spaced') {
                let progressQuery;
                
                if (deckId) {
                    // Fetch cards due for review from specific deck
                    progressQuery = query(
                        collection(db, 'cardProgress'),
                        where('userId', '==', authUser.uid),
                        where('deckId', '==', deckId),
                        where('nextReviewDate', '<=', new Date().toISOString()),
                        orderBy('nextReviewDate', 'asc')
                    );
                } else {
                    // Global review - all due cards across all decks
                    progressQuery = query(
                        collection(db, 'cardProgress'),
                        where('userId', '==', authUser.uid),
                        where('nextReviewDate', '<=', new Date().toISOString()),
                        orderBy('nextReviewDate', 'asc')
                    );
                }
                
                const progressSnapshot = await getDocs(progressQuery);
                setDueCardsCount(progressSnapshot.size); // Set the count for display in StudyModeSelector
                const cardLookupPromises = [];
    
                progressSnapshot.forEach(docSnap => {
                    const progress = docSnap.data();
                    cardLookupPromises.push(
                        getDoc(doc(db, 'decks', progress.deckId, 'cards', progress.cardId))
                            .then(cardSnap => {
                                if (cardSnap.exists()) {
                                    return { 
                                        id: cardSnap.id, 
                                        ...cardSnap.data(), 
                                        deckId: progress.deckId, // Ensure deckId is always present
                                        progress: progress // Attach progress data
                                    };
                                }
                                return null;
                            })
                    );
                });
    
                const fetchedCards = (await Promise.all(cardLookupPromises)).filter(Boolean);
                setFlashCards(fetchedCards); 
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
                    
                    // Use onSnapshot for real-time updates in cramming mode, if desired.
                    // If you only want to fetch once, use getDocs instead of onSnapshot.
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
    }, [authUser, deckId, db, studyMode, knowAnswer, dontKnowAnswer, percent]);

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
            let flashCardsCopy = [...flashCards];
            let shuffledFlashCards = [];
            while (flashCardsCopy.length !== 0) {
                let randomNum = Math.floor(Math.random() * flashCardsCopy.length);
                shuffledFlashCards.push(flashCardsCopy[randomNum]);
                flashCardsCopy.splice(randomNum, 1);
            }
            setFlashCards(shuffledFlashCards);
        }
        setShowAnswer(false);
        setCurrentIndex(0);
        knowAnswer(0); 
        dontKnowAnswer(0); 
        percent(0); 
        setAnswers([]);
        setProcessing(false);
    }, [flashCards, knowAnswer, dontKnowAnswer, percent, setCurrentIndex, studyMode, fetchDeckAndCards]);

    // --- NEW: Handle card rating for SM-2 (ONLY FOR SPACED MODE) ---
    const handleSpacedCardRating = useCallback(async (quality) => {
        if (processing || currentIndex >= flashCards.length) return; 

        setProcessing(true);
        setShowAnswer(false); 

        const currentCard = flashCards[currentIndex];
        const cardId = currentCard.id;
        const currentDeckId = currentCard.deckId; // Should always be present for spaced review cards

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

            await setDoc(progressDocRef, {
                userId: authUser.uid,
                cardId: cardId,
                deckId: currentDeckId, 
                easeFactor: newEaseFactor,
                interval: newInterval,
                repetitions: newRepetitions,
                nextReviewDate: nextReviewDate, 
                lastReviewDate: new Date().toISOString(),
                totalReviews: (currentProgress.totalReviews || 0) + 1,
                correctStreak: quality >= 3 ? (currentProgress.correctStreak || 0) + 1 : 0
            }, { merge: true });

            // Update local stats
            if (quality >= 3) {
                knowAnswer(prev => {
                    let newKnow = prev + 1;
                    percent(Math.floor((newKnow / flashCards.length) * 100)); 
                    return newKnow;
                });
                setAnswers(prev => [...prev, true]);
            } else {
                dontKnowAnswer(prev => prev + 1);
                setAnswers(prev => [...prev, false]);
            }

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
    }, [currentIndex, flashCards, authUser, db, knowAnswer, dontKnowAnswer, percent, setCurrentIndex, processing]);

    // --- NEW: Handle card progression for CRAMMING MODE ---
    const handleCrammingResponse = useCallback((isCorrect) => {
        if (processing || currentIndex >= flashCards.length) return;

        setProcessing(true);
        setShowAnswer(false);

        const currentCard = flashCards[currentIndex];

        if (isCorrect) {
            knowAnswer(prev => {
                let newKnow = prev + 1;
                percent(Math.floor((newKnow / flashCards.length) * 100));
                return newKnow;
            });
            setAnswers(prev => [...prev, true]); // Record true for history
            
            // Move to next card
            setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
                setProcessing(false);
            }, 200);

        } else { // Incorrect
            dontKnowAnswer(prev => prev + 1);
            setAnswers(prev => [...prev, false]); // Record false for history

            // Re-add card to the end of the deck
            setFlashCards(prevCards => [...prevCards, currentCard]);

            // Move to next card (which is the next unique card, the current one will reappear later)
            setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
                setProcessing(false);
            }, 200);
        }
    }, [currentIndex, flashCards, knowAnswer, dontKnowAnswer, percent, setCurrentIndex, processing]);


    const handleShowAnswer = () => {
        setShowAnswer(!showAnswer);
    };

    // handleGoBack needs to be refactored to work correctly with the new cramming logic
    // For spaced mode, it's generally best not to undo SM2 progress, just local UI state.
    const handleGoBack = useCallback(() => {
        setProcessing(true);
        if (currentIndex > 0) {
            setShowAnswer(false);
            setTimeout(() => {
                const lastAnswerWasCorrect = answers[currentIndex - 1];
                if (lastAnswerWasCorrect) {
                    knowAnswer(prev => {
                        let newKnowAnswer = prev - 1;
                        percent(Math.floor((newKnowAnswer / flashCards.length) * 100)); 
                        return newKnowAnswer;
                    });
                } else {
                    dontKnowAnswer(prev => prev - 1);
                    // For cramming mode, if the last card was wrong, and we "go back", 
                    // we need to remove it from the end of the deck if it was re-added.
                    // This can get complex with multiple "wrong" answers. 
                    // A simpler approach for "Go Back" in cramming might just be to go to the previous card
                    // without trying to "undo" the re-addition or score.
                    // For now, let's just decrement local score.
                }
                setCurrentIndex(currentIndex - 1);
                setAnswers(answers.slice(0, -1)); 
                setProcessing(false);
            }, 200);
        } else {
            setProcessing(false);
        }
    }, [currentIndex, answers, knowAnswer, dontKnowAnswer, percent, flashCards.length, setCurrentIndex]);

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

    // Render different button sets based on study mode
    const renderStudyButtons = () => {
        const isDisabled = processing || flashCards.length === 0 || currentIndex >= flashCards.length;

        if (studyMode === 'spaced') {
            return (
                <div className={styles.buttonsContainer}>
                    <button className={styles.outerFlashCardButtons} disabled={isDisabled || currentIndex === 0} onClick={handleGoBack}>
                        <i className="fa-solid fa-arrow-rotate-right fa-flip-horizontal"></i>
                    </button>
                    
                    <button className={`${styles.innerFlashCardButtons} hover:bg-red-600 transition-all duration-200`} disabled={isDisabled} onClick={() => handleSpacedCardRating(0)}>
                        Again <br/> {getApproximateNextInterval(0)} 
                    </button>
                    <button className={`${styles.innerFlashCardButtons} hover:bg-orange-600 transition-all duration-200`} disabled={isDisabled} onClick={() => handleSpacedCardRating(3)}>
                        Hard <br/> {getApproximateNextInterval(3)}
                    </button>
                    <button className={`${styles.innerFlashCardButtons} hover:bg-blue-600 transition-all duration-200`} disabled={isDisabled} onClick={() => handleSpacedCardRating(4)}>
                        Good <br/> {getApproximateNextInterval(4)}
                    </button>
                    <button className={`${styles.innerFlashCardButtons} hover:bg-emerald-600 transition-all duration-200`} disabled={isDisabled} onClick={() => handleSpacedCardRating(5)}>
                        Easy <br/> {getApproximateNextInterval(5)}
                    </button>
                    
                    <button className={`${styles.outerFlashCardButtons}`} disabled={isDisabled} onClick={handleShuffle}>
                        <i className="fa-solid fa-repeat"></i>
                    </button>
                </div>
            );
        } else { // 'cramming' mode buttons
            return (
                <div className={styles.buttonsContainer}>
                    <button className={styles.outerFlashCardButtons} disabled={isDisabled || currentIndex === 0} onClick={handleGoBack}>
                        <i className="fa-solid fa-arrow-rotate-right fa-flip-horizontal"></i>
                    </button>
                    <button className={`${styles.innerFlashCardButtons} hover:bg-red-600 transition-all duration-200`} disabled={isDisabled} onClick={() => handleCrammingResponse(false)}> 
                        <i className="fa-solid fa-xmark" id="wrongButton"></i>
                    </button>
                    <div className={styles.scoreContainer}>
                        <h2 style={{ margin: '0px' }}>
                            {currentIndex < flashCards.length ? `${currentIndex + 1}/${flashCards.length}` : `${flashCards.length}/${flashCards.length}`}
                        </h2>
                    </div>
                    <button className={`${styles.innerFlashCardButtons} hover:bg-emerald-600 transition-all duration-200`} disabled={isDisabled} onClick={() => handleCrammingResponse(true)} style={{ padding: '10px 13px' }}> 
                        <i className="fa-solid fa-check" id="checkButton"></i>
                    </button>
                    <button className={`${styles.outerFlashCardButtons}`} disabled={isDisabled} onClick={handleShuffle}>
                        <i className="fa-solid fa-repeat"></i>
                    </button>
                </div>
            );
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <h2>Loading flashcards...</h2>
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
            <div className={styles.buttonsOptionsContainer}>
                {deckId && <EditDeckBtn deckId={deckId} />} 
                {deckId && deck && <SetToPublic deckId={deckId} deck={deck} />} 

                {/* This is where we integrate StudyModeSelector properly */}
                {authUser && ( // Only show if user is authenticated
                    <StudyModeSelector 
                        deckId={deckId} 
                        db={db} 
                        authUser={authUser} 
                        currentMode={studyMode} 
                        onModeChange={onStudyModeChange} 
                        dueCardsCount={dueCardsCount} // Pass the fetched due cards count
                    />
                )}
            </div>
            
            <div className={`${styles.flashCardTextContainer}`} onClick={handleShowAnswer}>
                <div className={`${styles.flipCardInner} ${showAnswer ? styles.flipped : ''}`}>
                    <div className={styles.flipCardFront}>
                        {currentIndex < flashCards.length ? (
                            renderContent(currentQuestion, currentQuestionType, styles.questionImage)
                        ) : (
                            <h2>You completed it!!!</h2>
                        )}
                    </div>
                    <div className={styles.flipCardBack}>
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