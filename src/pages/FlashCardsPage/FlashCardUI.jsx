import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Copy } from "lucide-react";
import { auth, app } from '../../api/firebase';
import { 
    getFirestore, 
    doc, 
    getDoc, 
    collection, 
    query, 
    orderBy, 
    onSnapshot, 
    setDoc, 
    where, 
    getDocs, 
    deleteDoc,
    writeBatch,
    serverTimestamp,
    increment,
    updateDoc
} from 'firebase/firestore'; 

import { authService } from "../../hooks/useAuth";

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

import StudyTimeTracker from './StudyTimeTracker';

// FiresStore

import { Timestamp } from 'firebase/firestore';
import { getCurrentTimestamp, getImmediateReviewTimestamp } from '../../utils/sm2'; 

// Tutorials
import { useTutorials } from "../../contexts/TutorialContext";
import TutorialOverlay from "../../components/tutorials/TutorialOverlay";
import SmartReviewButtons from "../../components/tutorials/CustomTutorials/SmartReviewButtons";
import { EncourageBanner } from "../../components/tutorials/CustomTutorials/EncourageBanner";
import { useNavigate } from "react-router-dom";

// Context
import { useAuthContext } from "../../contexts/AuthContext";

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
    db,
    publicDeckData,
    deckOwnerData
}) {

    // Context
    const { 
        getFolderLimits,
        getDeckLimits,
        getCardLimits,
        user
    } = useAuthContext()

    // Card animations
    const [cardAnimDirection, setCardAnimDirection] = useState("forward");
    const [cardAnimKey, setCardAnimKey] = useState(0);
    

  

    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [finalTime, setFinalTime] = useState("");

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
    const navigate = useNavigate();

    const [isFinished, setIsFinished] = useState(false);

      // Tutorials
    const { isTutorialAtStep, advanceStep, completeTutorial, isInTutorial } = useTutorials();
    const welcomeUserToSmartReview = isTutorialAtStep('smart-review', 2);
    const firstSmartReviewSession = isTutorialAtStep('smart-review', 3);
    const completedFirstReviewSession = isInTutorial('smart-review');
    const goToDashBoard = isTutorialAtStep('smart-review', 4);
    const shouldShowOverlay = completedFirstReviewSession && isFinished;

    // Cramming mode tracking states
    const [originalDeckSize, setOriginalDeckSize] = useState(0);
    const [uniqueCardsAttempted, setUniqueCardsAttempted] = useState(new Set());
    const [reviewPhase, setReviewPhase] = useState('initial');
    const [phaseOneComplete, setPhaseOneComplete] = useState(false);

    // Public Deck states
    const [isPublicDeck, setIsPublicDeck] = useState(false);
    const [deckOwnerInfo, setDeckOwnerInfo] = useState(null);
    const [showSignUpPrompt, setShowSignUpPrompt] = useState(false);

    // Initialize Cloudinary
    const cld = new Cloudinary({ cloud: { cloudName: `${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}` } });

    

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


    // Tutorial
    useEffect(() => {
        if (!deckId || isPublicDeck === undefined) return;
        if (!isPublicDeck) {
            completeTutorial('create-deck');
        }
    }, [deckId, isPublicDeck]);

    

    

    

    // --- Enhanced fetch function with cleanup ---
    const fetchDeckAndCards = useCallback(async () => {

        if (user === undefined) {
            console.log('Auth state still loading, waiting...');
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
        setIsFinished(false);
        
        // Reset cramming mode tracking
        setOriginalDeckSize(0);
        setUniqueCardsAttempted(new Set());
        setReviewPhase('initial');
        setPhaseOneComplete(false);

        try {
            if (deckId) { 
                const deckDoc = await getDoc(doc(db, 'decks', deckId));
                if (!deckDoc.exists()) {
                    setError('Deck not found');
                    setLoading(false);
                    return;
                }
                const deckData = { id: deckDoc.id, ...deckDoc.data() };
                
                // Enhanced access control logic - FIXED
                const userOwnsTheDeck = deckData.ownerId === user?.uid;
                const deckIsPublic = deckData.isPublic;
                const hasAccess = userOwnsTheDeck || deckIsPublic;
                
                if (!hasAccess) {
                    setError('The owner of this deck has set it to private.');
                    setLoading(false);
                    return;
                }
                // Set public deck state - FIXED LOGIC
                const viewingAsPublic = deckIsPublic && !userOwnsTheDeck;
                setIsPublicDeck(viewingAsPublic);
                
                // If it's a public deck viewed by non-owner, fetch owner info for attribution
                if (viewingAsPublic) {
                    try {
                        const ownerDoc = await getDoc(doc(db, 'users', deckData.ownerId));
                        if (ownerDoc.exists()) {
                            setDeckOwnerInfo({
                                displayName: ownerDoc.data().displayName || 'Anonymous User',
                                email: ownerDoc.data().email
                            });
                            deckOwnerData({
                                displayName: ownerDoc.data().displayName || 'Anonymous User',
                                email: ownerDoc.data().email
                            })
                        }
                    } catch (error) {
                        console.log('Could not fetch owner info:', error);
                        // Don't fail the whole operation if we can't get owner info
                    }
                }
                setDeck(deckData);
                publicDeckData(deckData);

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
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load data');
            setLoading(false);
        }
    }, [user, deckId, db, studyMode, knowAnswer, dontKnowAnswer]);

    // FIX 3: Add a loading check in the main effect
    useEffect(() => {
        let unsubscribe;
        const setupData = async () => {
            // Wait for auth state to be determined
            if (user === undefined) {
                console.log('Waiting for auth state...');
                return;
            }
            
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
        setIsFinished(false)
    }, [flashCards, knowAnswer, dontKnowAnswer, setCurrentIndex, studyMode, fetchDeckAndCards]);

    // --- Handle card rating for SM-2 (ONLY FOR SPACED MODE) ---
    const handleSpacedCardRating = useCallback(async (quality) => {
        if (processing || currentIndex >= flashCards.length) return; 
    
        setProcessing(true);
    
        const currentCard = flashCards[currentIndex];
        const cardId = currentCard.id;
        const currentDeckId = currentCard.deckId;
        const isCorrect = quality >= 3; // Consider 3+ as correct for streak purposes
    
        let currentProgress = {};
        const progressDocRef = doc(db, 'cardProgress', `${user.uid}_${cardId}`);
    
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
                userId: user.uid,
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
            const isCramming = false;
            const streakResult = await updateFlashCardUIStreaks(db, user.uid, isCorrect, isCramming);
            
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
                setCardAnimDirection('forward')
                setCardAnimKey(prev => prev + 1);
                setShowAnswer(false);
                setProcessing(false);
            }, 200);
    
        } catch (error) {
            console.error("Error updating card progress:", error);
            setError("Failed to update card progress.");
            setProcessing(false);
        }
    }, [currentIndex, flashCards, user, db, knowAnswer, dontKnowAnswer, setCurrentIndex, processing]);

    // --- Handle card progression for CRAMMING MODE ---
    const handleCrammingResponse = useCallback(async (isCorrect) => {
    if (processing || currentIndex >= flashCards.length) return;

    setProcessing(true);
    

    const currentCard = flashCards[currentIndex];
    const currentCardId = currentCard.id;

    try {
        // Track streak for cramming mode too (NEW)
        // Only track streaks for authenticated users
        if (user) {
            const isCramming = true;
            const streakResult = await updateFlashCardUIStreaks(db, user.uid, isCorrect, isCramming);
            
            if (streakResult && streakResult.isFirstSessionToday && streakResult.isNewStreak) {
                console.log(`🔥 New streak milestone! ${streakResult.currentStreak} days`);
            }
        }

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
               setCardAnimDirection('forward')
                setCardAnimKey(prev => prev + 1);
                
                if (shouldCompletePhaseOne) {
                    setPhaseOneComplete(true);
                    setReviewPhase('reviewing');
                }
                setShowAnswer(false);
                setProcessing(false);
            }, 200);

        } else {
            if (!phaseOneComplete || !uniqueCardsAttempted.has(currentCardId)) {
                dontKnowAnswer(prev => prev + 1);
            }
            
            setAnswers(prev => [...prev, false]);
            setFlashCards(prevCards => [...prevCards, currentCard]);

            setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
                setCardAnimDirection('forward')
                setCardAnimKey(prev => prev + 1);
                
                if (shouldCompletePhaseOne) {
                    setPhaseOneComplete(true);
                    setReviewPhase('reviewing');
                }
                setShowAnswer(false);
                setProcessing(false);
            }, 200);
        }
    } catch (error) {
        console.error("Error in cramming response:", error);
        setProcessing(false);
    }
}, [currentIndex, flashCards, knowAnswer, dontKnowAnswer, setCurrentIndex, processing, 
    originalDeckSize, uniqueCardsAttempted, phaseOneComplete, db, user]);


    const handleShowAnswer = () => {
        setShowAnswer(!showAnswer);
    };

    const handleGoBack = useCallback(() => {
        setProcessing(true);
        if (currentIndex > 0) {
            setTimeout(() => {
                const lastAnswerWasCorrect = answers[currentIndex - 1];
                if (lastAnswerWasCorrect) {
                    knowAnswer(prev => prev - 1);
                } else {
                    dontKnowAnswer(prev => prev - 1);
                }
                setCurrentIndex(currentIndex - 1);
                setAnswers(answers.slice(0, -1));
                setCardAnimDirection("backward");
                setCardAnimKey(prev => prev + 1); 
                setShowAnswer(false);
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


    const CopyDeckBtn = ({ 
        deckId, 
        deckName, 
        user, 
        deck, 
        flashCards, 
        db, 
        onCopy, 
        onShowSignUp 
    }) => {
        const [copying, setCopying] = useState(false);
        const { getFolderLimits, getDeckLimits, getCardLimits, isPremium } = useAuthContext();

        const handleCopy = async () => {
            if (!user) {
                onShowSignUp();
                return;
            }

            if (!deck || !flashCards.length) {
                alert('No deck data available to copy');
                return;
            }

            // Check all limits
            const folderLimits = getFolderLimits();
            const deckLimits = getDeckLimits();
            const cardLimits = getCardLimits();
            const userIsPremium = isPremium();

            // Check deck limits
            if (!deckLimits.canGenerate) {
            const confirmMessage = userIsPremium
                ? `You've reached your deck limit (${deckLimits.maxDecks}).\n\nPress OK to contact support for higher limits, or Cancel to delete some decks first.`
                : `You've reached your deck limit (${deckLimits.maxDecks} decks).\n\nPress OK to upgrade to Premium for unlimited decks, or Cancel to delete some decks first.`;

            if (window.confirm(confirmMessage)) {
                if (userIsPremium) {
                window.location.href = "/contactme";
                } else {
                window.location.href = "/pricing";
                }
            }
            return; // always stop here if over the limit
            }

            // Check card limits
            const cardsToAdd = flashCards.length;
            const currentCards =
            cardLimits.maxCards === -1
                ? 0
                : (cardLimits.maxCards - (cardLimits.canGenerate ? cardLimits.maxCards : 0));

            if (cardLimits.maxCards !== -1 && currentCards + cardsToAdd > cardLimits.maxCards) {
            const confirmMessage = userIsPremium
                ? `Copying this deck would exceed your card limit.\n\nYou currently have space for ${cardLimits.maxCards - currentCards} more cards, but this deck contains ${cardsToAdd}.\n\nPress OK to contact support for higher limits, or Cancel to delete some cards first.`
                : `Copying this deck would exceed your card limit (${cardLimits.maxCards} cards).\n\nThis deck contains ${cardsToAdd} cards.\n\nPress OK to upgrade to Premium for unlimited cards, or Cancel to delete some cards first.`;

            if (window.confirm(confirmMessage)) {
                if (userIsPremium) {
                window.location.href = "/contactme";
                } else {
                window.location.href = "/pricing";
                }
            }
            return;
            }

            // Check folder limits
            if (!folderLimits.canGenerate) {
            const confirmMessage = userIsPremium
                ? `You've reached your folder limit (${folderLimits.maxFolders}).\n\nPress OK to contact support for higher limits, or Cancel to delete some folders first.`
                : `You've reached your folder limit (${folderLimits.maxFolders} folders).\n\nPress OK to upgrade to Premium for unlimited folders, or Cancel to delete some folders first.`;

            if (window.confirm(confirmMessage)) {
                if (userIsPremium) {
                window.location.href = "/contactme";
                } else {
                window.location.href = "/pricing";
                }
            }
            return;
            }

            // Final confirmation before copying
            const finalConfirm = window.confirm(
                `Are you sure you want to copy "${deckName}"? This will create a new deck with ${cardsToAdd} cards in your account.`
            );
            
            if (!finalConfirm) {
                return;
            }

            setCopying(true);
            try {
                await onCopy(user, deck, flashCards);
                // Success - the function already handles redirection
            } catch (error) {
                console.error('Error copying deck:', error);
                alert('Failed to copy deck. Please try again.');
            } finally {
                setCopying(false);
            }
        };

        return (
            <button
                onClick={handleCopy}
                disabled={copying}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg transition-all duration-300 font-semibold shadow-xl ring-4 ring-purple-500/30 hover:ring-purple-400/50 animate-pulse hover:animate-none hover:scale-105 active:scale-95"
            >
                <Copy className="w-5 h-5 text-white" />
                {copying ? 'Copying...' : 'Copy Deck'}
            </button>
        );
    };



    // Show if the deck is finished
    useEffect(()=>{
        if(!(currentIndex < flashCards.length)){
            setIsFinished(true);
        }
    },[currentIndex])

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
                    <StudyTimeTracker 
                        user={user}
                        db={db}
                        deckId={deckId}
                        isFinished={isFinished}
                        finalTime={(time)=>setFinalTime(`${time}`)}
                    />
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
                    <StudyTimeTracker 
                        user={user}
                        db={db}
                        deckId={deckId}
                        isFinished={isFinished}
                        finalTime={(time)=>setFinalTime(`${time}`)}
                    />
                </div>
            );
        }
    };

    // New component for public deck header
    const PublicDeckHeader = () => {
        if (!isPublicDeck) return null;
        
        return (
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-600/20 border border-blue-500/30 p-4 rounded-xl mb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-blue-400 text-lg font-semibold mb-1">
                            📚 Public Deck: {deck?.title}
                        </h3>
                        {deckOwnerInfo && (
                            <p className="text-white/70 text-sm">
                                Created by: {deckOwnerInfo.displayName}
                            </p>
                        )}
                    </div>
                    {!user && (
                        <button 
                            onClick={() => setShowSignUpPrompt(true)}
                            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold px-6 py-2 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
                        >
                            Save This Deck
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const SignUpPromptModal = () => {
        if (!showSignUpPrompt) return null;
        
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-gray-800 p-6 rounded-xl max-w-md mx-4 border border-gray-700">
                    <h3 className="text-xl font-semibold text-white mb-3">
                        Copy This Deck to Your Account
                    </h3>
                    <p className="text-gray-300 mb-4">
                        Sign up to copy this deck, track your progress with spaced repetition, and access all features!
                    </p>
                    <div className="flex gap-3">
                        <button 
                            onClick={handleCreateAccountAndSaveDeck}
                            className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition-all"
                        >
                            Sign Up & Save
                        </button>
                        <button 
                            onClick={() => setShowSignUpPrompt(false)}
                            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-all"
                        >
                            Continue Studying
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // New function to handle account creation and deck saving
    const handleCreateAccountAndSaveDeck = async () => {
        try {
            // Use the existing authService.signIn with custom success callback
            await authService.signIn({
                onSuccess: async (user) => {
                    try {
                        // Copy the public deck to user's account after successful sign-in
                        await copyPublicDeckToUserAccount(user, deck, flashCards);
                        setShowSignUpPrompt(false);
                        alert('Deck saved to your account!');
                    } catch (error) {
                        console.error('Error saving deck after sign-in:', error);
                        alert('Account created but error saving deck. Please try again.');
                    }
                },
                onError: (errorMessage) => {
                    console.error('Error during sign-in:', errorMessage);
                    alert(`Error creating account: ${errorMessage}`);
                }
                // Note: navigate is automatically included by the useAuth hook
            });
            
        } catch (error) {
            console.error('Error creating account and saving deck:', error);
            alert('Error saving deck. Please try again.');
        }
    };

    // New function to copy public deck to user's account
    const copyPublicDeckToUserAccount = async (user, deckData, cardsData) => {
        try {
            const batch = writeBatch(db);

            // Remove duplicates from cardsData by filtering unique card IDs
            const uniqueCards = cardsData.filter((card, index, self) => 
                index === self.findIndex(c => c.id === card.id)
            );
            // Update user document using updateDoc instead of batch for stats
            // We'll do this separately to avoid the dot notation issue with batches
            const userRef = doc(db, 'users', user.uid);
            
            // First, ensure the user document exists with basic info
            batch.set(userRef, {
                email: user.email,
                displayName: user.displayName || 'Anonymous User',
                lastActiveAt: serverTimestamp()
            }, { merge: true });
            
            // Check if "Saved Decks" folder already exists
            const foldersQuery = query(
                collection(db, 'folders'), 
                where('ownerId', '==', user.uid),
                where('name', '==', 'Saved Decks')
            );
            
            const existingFolders = await getDocs(foldersQuery);
            let folderRef;
            
            if (!existingFolders.empty) {
                // Use existing "Saved Decks" folder
                folderRef = existingFolders.docs[0].ref;
                // Update the deck count
                batch.update(folderRef, {
                    // deckCount: increment(1),
                    updatedAt: serverTimestamp()
                });
            } else {
                // Create new "Saved Decks" folder
                folderRef = doc(collection(db, 'folders'));
                batch.set(folderRef, {
                    name: "Saved Decks",
                    ownerId: user.uid,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    isPublic: false,
                    // deckCount: 1
                });
            }
            
            // Create new deck
            const newDeckRef = doc(collection(db, 'decks'));
            batch.set(newDeckRef, {
                title: `${deckData.title} (Copy)`,
                description: deckData.description || "Saved from public deck",
                ownerId: user.uid,
                folderId: folderRef.id,
                isPublic: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                // cardCount: uniqueCards.length,
                tags: deckData.tags || [],
                originalDeckId: deckData.id // Track where it came from
            });
            
            // Copy all cards
            uniqueCards.forEach((card, index) => {
                const cardRef = doc(collection(db, 'decks', newDeckRef.id, 'cards'));
                batch.set(cardRef, {
                    question: card.question,
                    answer: card.answer,
                    question_type: card.question_type || "text",
                    answer_type: card.answer_type || "text",
                    createdAt: serverTimestamp(),
                    order: index + 1
                });
            });

            // NEW: Increment the copies counter on the original deck
            const originalDeckRef = doc(db, 'decks', deckData.id);
            batch.update(originalDeckRef, {
                copies: increment(1)
            });
            
            // Commit the batch first
            await batch.commit();
            
            // Then update user stats separately using updateDoc
            await updateDoc(userRef, {
                'stats.totalDecks': increment(1),
                'stats.totalCards': increment(uniqueCards.length)
            });
            
            // Redirect to the new deck
            window.location.href = `/flashcards/${newDeckRef.id}`;
            
        } catch (error) {
            console.error('Error copying deck:', error);
            throw error;
        }
    };


    // NEW: Study mode selector
    const renderStudyModeSelector = () => {
        // Show for both authenticated and unauthenticated users
        if (isPublicDeck && !user) {
            // Special selector for unauthenticated users viewing public decks
            return (
                <>
                    <StudyModeSelector 
                    deckId={deckId} 
                    db={db} 
                    user={user} 
                    currentMode={studyMode} 
                    onModeChange={onStudyModeChange} 
                    dueCardsCount={dueCardsCount}
                    disableSpaced={isPublicDeck}
                />
                
                </>
            );
        } else if (user) {
            // Normal selector for authenticated users
            return (
                <StudyModeSelector 
                    deckId={deckId} 
                    db={db} 
                    user={user} 
                    currentMode={studyMode} 
                    onModeChange={onStudyModeChange} 
                    dueCardsCount={dueCardsCount}
                    disableSpaced={isPublicDeck}
                />
            );
        }
        return null;
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
                <div className={`${styles.buttonsContainer} flex items-center justify-between gap-4`}>
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
                            <i className="fas fa-shuffle"></i>
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
    // Add this debugging to see which condition is failing
    console.log('Tutorial State Debug:', {
    user,
    completedFirstReviewSession,
    goToDashBoard, 
    isFinished,
    // Also log the raw tutorial data
    tutorialStep: isTutorialAtStep('smart-review', 4),
    inTutorial: isInTutorial('smart-review'),
    allConditionsMet: completedFirstReviewSession && goToDashBoard && isFinished
    });

    return (
    <>  
        {/* <PublicDeckHeader /> */}
       
        {/* <TutorialOverlay isVisible={welcomeUserToSmartReview && !loading && flashCards.length > 0 && studyMode === 'spaced'}>
            <SmartReviewButtons onSuccess={() => {
                advanceStep('smart-review');
            }} />
        </TutorialOverlay>


        <TutorialOverlay isVisible={user && completedFirstReviewSession && goToDashBoard && isFinished}>
            <div className="relative space-y-4 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 max-w-lg w-full p-8">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Congratulations!
            </h2>
            <p className="text-gray-300 text-lg">
                You've completed your first Smart Review session!
            </p>
            <p className="text-gray-400">
                Let's view your progress in the dashboard!
            </p>
            <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                onClick={()=>{
                    navigate('/')
                    completeTutorial('smart-review')
                }}
            >
              Go to Dashboard →
            </button>
            <button 
                className="border border-white bg-transparent hover:bg-violet-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                onClick={() => completeTutorial('smart-review')}
                >
                Continue Studying
            </button>
            </div>
        </TutorialOverlay> */}

        
        

        
        <SignUpPromptModal />
        
        {/* Buttons */}
        <div className={`flex justify-between mb-1`}>
            <button
                onClick={() => navigate('/')}
                className="gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-all duration-200 shadow-md text-sm sm:text-base"

                >
                    <ArrowLeft className="w-4 h-4" />
                    
            </button>
            <div>
                <div className='flex w-full max-w-7xl justify-start  px-4 mt-2 mx-auto '>
                    
                </div>
                {/* Only show edit button if user owns the deck */}
                {/* {(!deckId || isPublicDeck) && (studyMode === 'cramming') && (
                    <CopyDeckBtn 
                        deckId={deckId} 
                        deckName={deck?.title || "Untitled Deck"}
                        user={user}
                        deck={deck}
                        flashCards={flashCards}
                        db={db}
                        onCopy={copyPublicDeckToUserAccount}
                        onShowSignUp={() => setShowSignUpPrompt(true)}
                    />
                )} */}


            </div>
         
            <div>
                {renderStudyModeSelector()}
            </div>
        </div>
        {firstSmartReviewSession && (
            <EncourageBanner
                currentCard={currentIndex}
                totalCards={flashCards.length}
                onSuccess={()=>{
                    advanceStep("smart-review")
                }}
            />
        )}

        <div>
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
        
        <div
            key={cardAnimKey} 
            className={`${styles.flashCardTextContainer} ${
            cardAnimDirection === "forward"
                ? styles.cardTransitionForward
                : styles.cardTransitionBackward
            }`} onClick={handleShowAnswer}>
            <div className={`${styles.flipCardInner} ${showAnswer ? styles.flipped : ''}`}>
                <div className={`${styles.flipCardFront} bg-white/5 border border-white/10`}>
                    {currentIndex < flashCards.length ? (
                        renderContent(currentQuestion, currentQuestionType, styles.questionImage)
                    ) : (
                        <div className="text-center py-8 space-y-4">
                            <div className="text-5xl animate-bounce">🏆</div>
                            <h2 className="text-2xl font-bold text-purple-400">
                                Session Complete!
                            </h2>
                            <div className="bg-white/10 rounded-lg p-4 max-w-sm mx-auto">
                                <div className="text-sm text-gray-300 mb-2">Your Progress:</div>
                                <div className="flex justify-between text-lg">
                                <span>Cards Studied: <span className="text-green-400 font-bold">{answers.length}</span></span>
                                </div>
                                <div className="flex justify-between text-lg">
                                <span>Time: <span className="text-blue-400 font-bold">{finalTime}</span></span>
                                </div>
                            </div>
                            <p className="text-sm text-gray-400">
                                Great job! The hard work will be worth it.
                            </p>
                        </div>
                    )}
                </div>
                <div className={`${styles.flipCardBack} bg-white/5 border border-white/10`}>
                    {currentIndex < flashCards.length ? (
                        renderContent(currentAnswer, currentAnswerType, styles.questionImage)
                    ) : (
                        <div className="text-center py-8 space-y-4">
                            <div className="text-5xl animate-bounce">🏆</div>
                            <h2 className="text-2xl font-bold text-purple-400">
                                Session Complete!
                            </h2>
                            <div className="bg-white/10 rounded-lg p-4 max-w-sm mx-auto">
                                <div className="text-sm text-gray-300 mb-2">Your Progress:</div>
                                <div className="flex justify-between text-lg">
                                <span>Cards Studied: <span className="text-green-400 font-bold">{answers.length}</span></span>
                                </div>
                                <div className="flex justify-between text-lg">
                                <span>Time: <span className="text-blue-400 font-bold">{finalTime}</span></span>
                                </div>
                            </div>
                            <p className="text-sm text-gray-400">
                                Great job! The hard work will be worth it.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
        
        {renderStudyButtons()}
    </>
    );
}

export default FlashCardUI;