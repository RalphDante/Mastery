import { useEffect, useState, useCallback, useRef } from "react";
import { Copy } from "lucide-react";
import { doc, getDoc, collection, query, where, getDocs, writeBatch, serverTimestamp, increment, updateDoc } from 'firebase/firestore';
import { authService } from "../../hooks/useAuth";
import styles from './FlashCardsPage.module.css';
import { Cloudinary } from '@cloudinary/url-gen';
import { AdvancedImage } from '@cloudinary/react';
import StudyTimeTracker from './StudyTimeTracker';

// Context
import { useAuthContext } from "../../contexts/AuthContext";
import { useDeckCache } from "../../contexts/DeckCacheContext";
import { useSessionTracking } from "../../hooks/useSessionTracking";

function FlashCardUI({
    knowAnswer, 
    dontKnowAnswer, 
    redoDeck, 
    setRedoDeck, 
    currentIndex, 
    setCurrentIndex,
    deckId, 
    db,
    publicDeckData,
    deckOwnerData
}) {
    // Context
    const { user, updateUserProfile } = useAuthContext();
    const { fetchDeckAndCards } = useDeckCache();

    const [isFinished, setIsFinished] = useState(false);
    const { trackCardReview } = useSessionTracking(user, db, isFinished);
    
    // Card animations
    const [cardAnimDirection, setCardAnimDirection] = useState("forward");
    const [cardAnimKey, setCardAnimKey] = useState(0);
    const [finalTime, setFinalTime] = useState("");

    // Main state
    const [flashCards, setFlashCards] = useState([]);
    const [deck, setDeck] = useState(null); 
    const [showAnswer, setShowAnswer] = useState(false);
    const [answers, setAnswers] = useState([]);
    const [processing, setProcessing] = useState(false); 
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const processingRef = useRef(false); 
    const processingIndexRef = useRef(null);

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

    // Helper: Create optimized Cloudinary image
    const createOptimizedImage = (publicId) => {
        return cld.image(publicId).format('auto').quality('auto');
    };

    // Helper: Shuffle cards
    const shuffleCards = useCallback((cards) => {
        let cardsCopy = [...cards];
        let shuffled = [];
        while (cardsCopy.length !== 0) {
            let randomNum = Math.floor(Math.random() * cardsCopy.length);
            shuffled.push(cardsCopy[randomNum]);
            cardsCopy.splice(randomNum, 1);
        }
        return shuffled;
    }, []);

    // Helper: Render content based on type
    const renderContent = (content, type, className) => {
        if (type === 'image' && content) {
            return <AdvancedImage cldImg={createOptimizedImage(content)} className={className} />;
        } else if (type === 'text' && content) {
            return <h2>{content}</h2>;
        }
        return <h2>Content not available</h2>;
    };

    // ==========================================
    // MAIN FETCH LOGIC (using context)
    // ==========================================
    
    const loadDeck = useCallback(async () => {
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
        setIsFinished(false);
        
        // Reset cramming mode tracking
        setOriginalDeckSize(0);
        setUniqueCardsAttempted(new Set());
        setReviewPhase('initial');
        setPhaseOneComplete(false);

        // Use the context function
        const result = await fetchDeckAndCards(deckId);

        if (result.error) {
            setError(result.error);
            setLoading(false);
            return;
        }

        // Set deck data
        setDeck(result.deck);
        publicDeckData(result.deck);
        setIsPublicDeck(result.isPublic || false);

        // Fetch owner info if public deck
        if (result.isPublic) {
            try {
                const ownerDoc = await getDoc(doc(db, 'users', result.deck.ownerId));
                if (ownerDoc.exists()) {
                    const ownerInfo = {
                        displayName: ownerDoc.data().displayName || 'Anonymous User',
                        email: ownerDoc.data().email
                    };
                    setDeckOwnerInfo(ownerInfo);
                    deckOwnerData(ownerInfo);
                }
            } catch (error) {
                console.log('Could not fetch owner info:', error);
            }
        }

        // Shuffle and set cards
        const shuffled = shuffleCards(result.cards);
        setFlashCards(shuffled);
        setOriginalDeckSize(shuffled.length);
        setLoading(false);

    }, [user, deckId, fetchDeckAndCards, shuffleCards, 
        setCurrentIndex, knowAnswer, dontKnowAnswer, publicDeckData, deckOwnerData, db]);

    // ==========================================
    // EFFECTS
    // ==========================================
    
    useEffect(() => {
        loadDeck();
    }, [deckId, user]);

    // Handle Redo Deck
    useEffect(() => {
        if (redoDeck) {
            loadDeck(); 
            setRedoDeck(false);
        }
    }, [redoDeck, setRedoDeck, loadDeck]);

    // Check if finished
    useEffect(() => {
        if (currentIndex >= flashCards.length && flashCards.length > 0) {
            setIsFinished(true);
        } else {
            setIsFinished(false);
        }
    }, [currentIndex, flashCards.length]);

    // ==========================================
    // HANDLERS
    // ==========================================
    
    const handleShuffle = useCallback(() => {
        // Remove duplicates
        const uniqueCards = flashCards.filter((card, index, self) => 
            index === self.findIndex(c => c.id === card.id)
        );
        
        const shuffled = shuffleCards(uniqueCards);
        setFlashCards(shuffled);
        setOriginalDeckSize(shuffled.length);
        setUniqueCardsAttempted(new Set());
        setReviewPhase('initial');
        setPhaseOneComplete(false);
        
        setShowAnswer(false);
        setCurrentIndex(0);
        knowAnswer(0); 
        dontKnowAnswer(0); 
        setAnswers([]);
        setProcessing(false);
        setIsFinished(false);
    }, [flashCards, shuffleCards, knowAnswer, dontKnowAnswer, setCurrentIndex]);

    const handleCrammingResponse = useCallback(async (isCorrect) => {
        if (processingRef.current || 
        processingIndexRef.current === currentIndex || 
        currentIndex >= flashCards.length) return;

        processingRef.current = true;
        processingIndexRef.current = currentIndex;
        setProcessing(true);
        const currentCard = flashCards[currentIndex];
      

        try {
            const newUniqueAttempted = new Set([...uniqueCardsAttempted, currentCard.id]);
            setUniqueCardsAttempted(newUniqueAttempted);

            const shouldCompletePhaseOne = newUniqueAttempted.size === originalDeckSize && !phaseOneComplete;

            if (isCorrect) {
                if (!phaseOneComplete || !uniqueCardsAttempted.has(currentCard.id)) {
                    knowAnswer(prev => prev + 1);
                }
                setAnswers(prev => [...prev, true]);
            } else {
                if (!phaseOneComplete || !uniqueCardsAttempted.has(currentCard.id)) {
                    dontKnowAnswer(prev => prev + 1);
                }
                setAnswers(prev => [...prev, false]);
                setFlashCards(prevCards => [...prevCards, currentCard]);

            }

            trackCardReview();
            


            setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
                setCardAnimDirection('forward');
                setCardAnimKey(prev => prev + 1);
                
                if (shouldCompletePhaseOne) {
                    setPhaseOneComplete(true);
                    setReviewPhase('reviewing');
                }
                setShowAnswer(false);
                setProcessing(false);
                processingRef.current = false;
                processingIndexRef.current = null;
            }, 200);

         
        } catch (error) {
            console.error("Error in cramming response:", error);
            setProcessing(false);
            processingRef.current = false;
            processingIndexRef.current = null;

        }
    }, [currentIndex, flashCards, knowAnswer, dontKnowAnswer, setCurrentIndex, processing, 
        originalDeckSize, uniqueCardsAttempted, phaseOneComplete, trackCardReview]);

    const handleShowAnswer = () => setShowAnswer(!showAnswer);

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
    }, [currentIndex, answers, knowAnswer, dontKnowAnswer, setCurrentIndex]);

    // ==========================================
    // RENDER HELPERS
    // ==========================================
    
    const currentCard = flashCards[currentIndex];
    const isComplete = currentIndex >= flashCards.length && flashCards.length > 0;

    const renderStudyButtons = () => {
        const isDisabled = processing || flashCards.length === 0 || currentIndex >= flashCards.length;

        return (
            <div className={`${styles.buttonsContainer} flex items-center justify-between gap-4`}>
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
                        disabled={isDisabled}
                        onClick={() => handleCrammingResponse(false)}
                    >
                        ✕ Incorrect
                    </button>

                    <button 
                        className="group relative px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-medium transition-all hover:-translate-y-1 hover:shadow-lg flex items-center gap-2"
                        disabled={isDisabled}
                        onClick={() => handleCrammingResponse(true)}
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
    };

    const CompletionMessage = () => (
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
    );

    // ==========================================
    // LOADING & ERROR STATES
    // ==========================================
    
    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <h2>Loading flashcards...</h2>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.errorContainer}>
                <h2>Error: {error}</h2>
                <button onClick={() => window.location.reload()}>Retry</button>
            </div>
        );
    }

    if (flashCards.length === 0) { 
        return (
            <div className={styles.emptyContainer}>
                <h2>No flashcards found in this deck.</h2>
                <p className="text-gray-400 mt-2">You can add new cards via the "Edit Deck" button.</p>
            </div>
        );
    }

    // ==========================================
    // MAIN RENDER
    // ==========================================
    
    return (
        <>
            <div
                key={cardAnimKey} 
                className={`${styles.flashCardTextContainer} ${
                    cardAnimDirection === "forward"
                        ? styles.cardTransitionForward
                        : styles.cardTransitionBackward
                }`} 
                onClick={handleShowAnswer}
            >
                <div className={`${styles.flipCardInner} ${showAnswer ? styles.flipped : ''}`}>
                    <div className={`${styles.flipCardFront} bg-white/5 border border-white/10`}>
                        {isComplete ? (
                            <CompletionMessage />
                        ) : (
                            renderContent(
                                currentCard?.question, 
                                currentCard?.question_type || 'text', 
                                styles.questionImage
                            )
                        )}
                    </div>
                    <div className={`${styles.flipCardBack} bg-white/5 border border-white/10`}>
                        {isComplete ? (
                            <CompletionMessage />
                        ) : (
                            renderContent(
                                currentCard?.answer, 
                                currentCard?.answer_type || 'text', 
                                styles.questionImage
                            )
                        )}
                    </div>
                </div>
            </div>
            
            {renderStudyButtons()}
        </>
    );
}

export default FlashCardUI;