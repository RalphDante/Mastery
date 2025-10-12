// FlashCardUI.jsx - Now just handles presentation & study logic

import { useEffect, useState, useCallback, useRef } from "react";
import { Cloudinary } from '@cloudinary/url-gen';
import { AdvancedImage } from '@cloudinary/react';
import styles from './FlashCardsPage.module.css';
import { useAuthContext } from "../../contexts/AuthContext";
import { useSessionTracking } from "../../hooks/useSessionTracking";
import { db } from "../../api/firebase";

function FlashCardUI({
    // Data from parent
    flashCards: initialCards,
    deckData,
    
    // Progress setters
    setKnowAnswer,
    setDontKnowAnswer,
    
    // Control props
    redoDeck,
    setRedoDeck,
    currentIndex,
    setCurrentIndex,
    
    // Reload function
    onReload
}) {
    const { user } = useAuthContext();
    
    // ==========================================
    // STATE - UI & Study Logic
    // ==========================================
    const [flashCards, setFlashCards] = useState([]);
    const [showAnswer, setShowAnswer] = useState(false);
    const [answers, setAnswers] = useState([]);
    const [processing, setProcessing] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [finalTime, setFinalTime] = useState("");
    
    // Card animations
    const [cardAnimDirection, setCardAnimDirection] = useState("forward");
    const [cardAnimKey, setCardAnimKey] = useState(0);
    
    // Cramming mode tracking
    const [originalDeckSize, setOriginalDeckSize] = useState(0);
    const [uniqueCardsAttempted, setUniqueCardsAttempted] = useState(new Set());
    const [phaseOneComplete, setPhaseOneComplete] = useState(false);
    
    // Refs for processing guard
    const processingRef = useRef(false);
    const processingIndexRef = useRef(null);
    
    // Session tracking (pass db if needed)
    const { trackCardReview } = useSessionTracking(user, db, isFinished);
    
    // Cloudinary
    const cld = new Cloudinary({ cloud: { cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME } });

    // ==========================================
    // EFFECT - Initialize cards from parent
    // ==========================================
    useEffect(() => {
        if (initialCards && initialCards.length > 0) {
            const shuffled = shuffleCards(initialCards);
            setFlashCards(shuffled);
            setOriginalDeckSize(shuffled.length);
            
            // Reset study state
            setCurrentIndex(0);
            setShowAnswer(false);
            setAnswers([]);
            setKnowAnswer(0);
            setDontKnowAnswer(0);
            setUniqueCardsAttempted(new Set());
            setPhaseOneComplete(false);
            setIsFinished(false);
        }
    }, [initialCards]); // Only re-run when parent provides new cards

    // ==========================================
    // EFFECT - Handle redo deck
    // ==========================================
    useEffect(() => {
        if (redoDeck && initialCards.length > 0) {
            handleShuffle();
            setRedoDeck(false);
        }
    }, [redoDeck]);

    // ==========================================
    // EFFECT - Check if finished
    // ==========================================
    useEffect(() => {
        setIsFinished(currentIndex >= flashCards.length && flashCards.length > 0);
    }, [currentIndex, flashCards.length]);

    // ==========================================
    // HELPER - Shuffle cards
    // ==========================================
    const shuffleCards = useCallback((cards) => {
        const cardsCopy = [...cards];
        const shuffled = [];
        while (cardsCopy.length !== 0) {
            const randomNum = Math.floor(Math.random() * cardsCopy.length);
            shuffled.push(cardsCopy[randomNum]);
            cardsCopy.splice(randomNum, 1);
        }
        return shuffled;
    }, []);

    // ==========================================
    // HELPER - Render content
    // ==========================================
    const createOptimizedImage = (publicId) => {
        return cld.image(publicId).format('auto').quality('auto');
    };

    const renderContent = (content, type, className) => {
        if (type === 'image' && content) {
            return <AdvancedImage cldImg={createOptimizedImage(content)} className={className} />;
        } else if (type === 'text' && content) {
            return <h2>{content}</h2>;
        }
        return <h2>Content not available</h2>;
    };

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
        setPhaseOneComplete(false);
        
        setShowAnswer(false);
        setCurrentIndex(0);
        setKnowAnswer(0);
        setDontKnowAnswer(0);
        setAnswers([]);
        setProcessing(false);
        setIsFinished(false);
    }, [flashCards, shuffleCards, setCurrentIndex, setKnowAnswer, setDontKnowAnswer]);

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
                    setKnowAnswer(prev => prev + 1);
                }
                setAnswers(prev => [...prev, true]);
            } else {
                if (!phaseOneComplete || !uniqueCardsAttempted.has(currentCard.id)) {
                    setDontKnowAnswer(prev => prev + 1);
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
    }, [currentIndex, flashCards, setKnowAnswer, setDontKnowAnswer, 
        originalDeckSize, uniqueCardsAttempted, phaseOneComplete, 
        trackCardReview, setCurrentIndex]);

    const handleShowAnswer = () => setShowAnswer(!showAnswer);

    const handleGoBack = useCallback(() => {
        setProcessing(true);
        if (currentIndex > 0) {
            setTimeout(() => {
                const lastAnswerWasCorrect = answers[currentIndex - 1];
                if (lastAnswerWasCorrect) {
                    setKnowAnswer(prev => prev - 1);
                } else {
                    setDontKnowAnswer(prev => prev - 1);
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
    }, [currentIndex, answers, setKnowAnswer, setDontKnowAnswer, setCurrentIndex]);

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
                {finalTime && (
                    <div className="flex justify-between text-lg">
                        <span>Time: <span className="text-blue-400 font-bold">{finalTime}</span></span>
                    </div>
                )}
            </div>
            <p className="text-sm text-gray-400">
                Great job! The hard work will be worth it.
            </p>
        </div>
    );

    // ==========================================
    // LOADING & ERROR STATES
    // ==========================================
    if (!initialCards || initialCards.length === 0) {
        return (
            <div className={styles.emptyContainer}>
                <h2>No flashcards available.</h2>
                <p className="text-gray-400 mt-2">Add cards to start studying!</p>
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