// FlashCardUI.jsx - Now just handles presentation & study logic

import { useEffect, useState, useCallback, useRef } from "react";
import { Cloudinary } from '@cloudinary/url-gen';
import { AdvancedImage } from '@cloudinary/react';
import styles from './FlashCardsPage.module.css';
import { useAuthContext } from "../../contexts/AuthContext";
import { useSessionTracking } from "../../hooks/useSessionTracking";
import { db } from "../../api/firebase";
import BattleResult from "./BattleResult";
import { RotateCcw } from "lucide-react";

function FlashCardUI({
    // Data from parent
    flashCards,  // ✅ Use directly from parent, no local state
    setFlashCards,  // ✅ Modify parent's state
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
    onReload,

    phaseOneComplete,
    setPhaseOneComplete,

    originalDeckSize,
    setOriginalDeckSize,

    result,

    deaths
}) {
    const { user } = useAuthContext();
    
    // ==========================================
    // STATE - UI & Study Logic (NO flashCards state!)
    // ==========================================
    const [showAnswer, setShowAnswer] = useState(false);
    const [answers, setAnswers] = useState([]);
    const [processing, setProcessing] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [finalTime, setFinalTime] = useState("");
    
    // Card animations
    const [cardAnimDirection, setCardAnimDirection] = useState("forward");
    const [cardAnimKey, setCardAnimKey] = useState(0);
    
    // Cramming mode tracking
    const [uniqueCardsAttempted, setUniqueCardsAttempted] = useState(new Set());
    
    // Refs for processing guard
    const processingRef = useRef(false);
    const processingIndexRef = useRef(null);
    
    // Session tracking
    const { trackCardReview } = useSessionTracking(user, db, isFinished);
    
    // Cloudinary
    const cld = new Cloudinary({ cloud: { cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME } });

    // ==========================================
    // EFFECT - Initialize when flashCards change
    // ==========================================
    useEffect(() => {
        if (flashCards && flashCards.length > 0) {
            // Reset study state when new cards arrive
            setShowAnswer(false);
            setAnswers([]);
            setUniqueCardsAttempted(new Set());
            setPhaseOneComplete(false);
            setIsFinished(false);
        }
    }, [flashCards.length]); // Watch for length changes

    // ==========================================
    // EFFECT - Handle redo deck
    // ==========================================
    useEffect(() => {
        if (redoDeck && flashCards.length > 0) {
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
        setFlashCards(shuffled);  // ✅ Update parent state
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
    }, [flashCards, shuffleCards, setFlashCards, setOriginalDeckSize, 
        setCurrentIndex, setKnowAnswer, setDontKnowAnswer, setPhaseOneComplete]);

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
                
            }

            trackCardReview(isCorrect);

            setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
                setCardAnimDirection('forward');
                setCardAnimKey(prev => prev + 1);
                
                if (shouldCompletePhaseOne) {
                    setPhaseOneComplete(true);
                }
                setShowAnswer(false);

                if(!isCorrect){
                    setFlashCards(prevCards => [...prevCards, currentCard]);
                }
                
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
    }, [currentIndex, flashCards, setFlashCards, setKnowAnswer, setDontKnowAnswer, 
        originalDeckSize, uniqueCardsAttempted, phaseOneComplete, 
        trackCardReview, setCurrentIndex, setPhaseOneComplete]);

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
        const isDisabled = processing || flashCards.length === 0 || currentIndex >= flashCards.length || !showAnswer;
        if(!isComplete){
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
                            className={`group justify-center min-w-24 relative px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-medium transition-all hover:-translate-y-1 hover:shadow-lg flex items-center gap-2 ${!showAnswer ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={isDisabled}
                            onClick={() => handleCrammingResponse(false)}
                        >
                            ✕ <span className="hidden sm:block">Incorrect</span>
                        </button>

                        <button 
                            className={`group justify-center min-w-24 relative px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-medium transition-all hover:-translate-y-1 hover:shadow-lg flex items-center gap-2 ${!showAnswer ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={isDisabled}
                            onClick={() => handleCrammingResponse(true)}
                        >
                            ✓ <span className="hidden sm:block">Correct</span>
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
        } else {
            return(
                <div className="flex justify-center items-center">
                    <button 
                    onClick={() => setRedoDeck(true)}
                    className="min-w-80 bg-violet-600 hover:bg-violet-700 px-4 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center"
                    >
                        <RotateCcw className="w-5 h-5 mr-2" />
                        <span>Rematch</span>
                    </button>
                </div>
               
            )
        }
      
    };

    // ==========================================
    // LOADING & ERROR STATES
    // ==========================================
    if (!flashCards || flashCards.length === 0) {
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
            {!isComplete ? 
                <div
                    key={cardAnimKey}
                    className={`${styles.flashCardTextContainer} ${
                        cardAnimDirection === "forward"
                            ? styles.cardTransitionForward
                            : styles.cardTransitionBackward
                    }`}
                    style={isComplete ? { pointerEvents: "none" } : {}}
                    onClick={handleShowAnswer}
                >
                    <div className={`${styles.flipCardInner} ${showAnswer ? styles.flipped : ''}`}>
                        <div className={`${styles.flipCardFront} bg-white/5 border border-white/10`}>
                            
                                {renderContent(
                                    currentCard?.question,
                                    currentCard?.question_type || 'text',
                                    styles.questionImage
                                )}

                                {currentIndex === 0 && !showAnswer && (
                                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white/40 text-sm pointer-events-none">
                                        Tap to reveal answer
                                    </div>
                                )}
                           
                        </div>
                        <div className={`${styles.flipCardBack} bg-white/5 border border-white/10`}>
                           
                                {renderContent(
                                    currentCard?.answer,
                                    currentCard?.answer_type || 'text',
                                    styles.questionImage
                                )}

                                {currentIndex === 0 && showAnswer && (
                                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white/40 text-sm pointer-events-none">
                                        Tap to flip back
                                    </div>
                                )}
                                                    
                        </div>
                    </div>
                </div> :

                <BattleResult 
                    result={result}
                    currentIndex={currentIndex}
                    deaths={deaths}
                />
        
            }
            
            
            {renderStudyButtons()}
        </>
    );
}

export default FlashCardUI;