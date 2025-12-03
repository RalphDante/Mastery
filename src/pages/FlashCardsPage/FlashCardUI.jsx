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
import { useTutorials } from "../../contexts/TutorialContext";
import { useTutorialState } from "../../utils/tutorials/hooks";
import FeedbackPopup from "./FeedbackPopup";
import { updateUserAndPartyStreak } from "../../utils/streakUtils";
import { usePartyContext } from "../../contexts/PartyContext";

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

    deaths,
    onCreateWithAIModalClick,

    knowAnswer,
    dontKnowAnswer,
    isMuted,

    hasNotCreatedADeck,

    onSessionComplete
    
}) {
    const { user } = useAuthContext();
    const {updateUserProfile, partyProfile} = usePartyContext();

    const {advanceStep, updateTutorial, isTutorialAtStep, completeTutorial} = useTutorials();

    const [showFeedback, setShowFeedback] = useState(null); // 'correct' | 'incorrect' | null
    

    // const isFirstTime = isTutorialAtStep('create-deck', 1)
    const goingThroughCards = isTutorialAtStep('create-deck', 2)
    
    // ==========================================
    // STATE - UI & Study Logic (NO flashCards state!)
    // ==========================================
    const [showAnswer, setShowAnswer] = useState(false);
    const [answers, setAnswers] = useState([]);
    const [processing, setProcessing] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [finalTime, setFinalTime] = useState("");

    const isComplete = currentIndex >= flashCards.length && flashCards.length > 0;

    
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
    // SOUND EFFECTS REFS
    // ==========================================
    const correctSoundEffect = useRef();
    const wrongSoundEffect = useRef();
    const flipCardSoundEffect = useRef();
    const victorySoundEffect = useRef();
    const daggerWooshSFX = useRef();

    // ==========================================
    // SOUND EFFECTS
    // ==========================================
    useEffect(()=>{
        correctSoundEffect.current = new Audio("https://cdn.freesound.org/previews/270/270304_5123851-lq.mp3");
        correctSoundEffect.current.volume = 0.4;

        daggerWooshSFX.current = new Audio('/sfx/mixkit-dagger-woosh-1487.wav'); // your file path or CDN URL
        daggerWooshSFX.current.volume = 0.3;

        // ❌ Incorrect (buzzer tone)
        wrongSoundEffect.current = new Audio("https://cdn.freesound.org/previews/156/156859_2538033-lq.mp3");
        wrongSoundEffect.current.volume = 0.1

        // 🌀 Flip card (soft whoosh)
        flipCardSoundEffect.current = new Audio("/sfx/flipCard.mp3");
        flipCardSoundEffect.current.volume = 0.5

        victorySoundEffect.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3")
    },[])

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
            // if(isFirstTime){
            //     advanceStep('create-deck')
            // }
        }
    }, [flashCards.length]); // Watch for length changes

    useEffect(() => {

        if (isComplete && goingThroughCards) {
            advanceStep('create-deck');
            completeTutorial('create-deck')
            onSessionComplete?.();
        }
        if (isComplete){
            playSoundEffect(victorySoundEffect)
        }

       
    }, [isComplete]);

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


    const playSoundEffect = useCallback((soundRef) => {
        if (!isMuted && soundRef.current) {
            soundRef.current.currentTime = 0;
            soundRef.current.play().catch(err => console.log('Audio play failed:', err));
        }
    }, [isMuted]);

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
        

        setShowFeedback(isCorrect ? 'correct' : 'incorrect');

        processingRef.current = true;
        processingIndexRef.current = currentIndex;
        setProcessing(true);
        
        const currentCard = flashCards[currentIndex];

        try {
            console.log(partyProfile?.id)
            const streakResult = await updateUserAndPartyStreak(
                db, 
                user.uid, 
                partyProfile?.id
            );

            updateUserProfile({
                streak: streakResult.currentStreak || 1,
                longestStreak: streakResult.longestStreak || 1
                
            });
            
        if (streakResult.isNewStreak) {
            console.log(`🔥 Streak maintained! ${streakResult.currentStreak} days`);
        }

        } catch (streakError) {
        console.error('Error updating streak:', streakError);
        // Don't block timer start if streak update fails
        }

        try {
            const newUniqueAttempted = new Set([...uniqueCardsAttempted, currentCard.id]);
            setUniqueCardsAttempted(newUniqueAttempted);

            const shouldCompletePhaseOne = newUniqueAttempted.size === originalDeckSize && !phaseOneComplete;

            if (isCorrect) {
                if (!phaseOneComplete || !uniqueCardsAttempted.has(currentCard.id)) {
                    setKnowAnswer(prev => prev + 1);
                }
               
                playSoundEffect(correctSoundEffect)
                if(!isMuted){
                    daggerWooshSFX.current.play().catch(err=>console.log(err));
                 }

               
                setAnswers(prev => [...prev, true]);
            } else {
                if (!phaseOneComplete || !uniqueCardsAttempted.has(currentCard.id)) {
                    setDontKnowAnswer(prev => prev + 1);
                    
                }
                playSoundEffect(wrongSoundEffect);
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

    const handleShowAnswer = () => {
        setShowAnswer(!showAnswer)
        // playSoundEffect(flipCardSoundEffect)
    };

    const handleGoBack = useCallback(() => {
        setProcessing(true);
        if (currentIndex > 0) {
            setTimeout(() => {
                const lastAnswerWasCorrect = answers[currentIndex - 1];
                const previousCard = flashCards[currentIndex - 1];
                
                if (lastAnswerWasCorrect) {
                    setKnowAnswer(prev => prev - 1);
                } else {
                    setDontKnowAnswer(prev => prev - 1);
                    
                    // Remove the duplicate that was added to the end when marked incorrect
                    setFlashCards(prevCards => {
                        const lastOccurrenceIndex = prevCards.map(card => card.id)
                            .lastIndexOf(previousCard.id);
                        if (lastOccurrenceIndex > currentIndex) {
                            return prevCards.filter((_, idx) => idx !== lastOccurrenceIndex);
                        }
                        return prevCards;
                    });
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
    }, [currentIndex, answers, flashCards, setKnowAnswer, setDontKnowAnswer, setCurrentIndex, setFlashCards]);

    // ==========================================
    // RENDER HELPERS
    // ==========================================
    const currentCard = flashCards[currentIndex];

    const renderStudyButtons = () => {
        const isInReviewPhase = phaseOneComplete || currentIndex >= originalDeckSize;

        const isDisabled = processing || flashCards.length === 0 || currentIndex >= flashCards.length || !showAnswer;
        if(!isComplete){
            return (
                <>
                    <div style={{ position: 'relative' }}>
                        {showFeedback && (
                            <FeedbackPopup 
                                isCorrect={showFeedback === 'correct'}
                                onComplete={() => setShowFeedback(null)}
                            />
                        )}

                        <div className={`${styles.buttonsContainer} flex items-center justify-between gap-4`}>
                            <button 
                                className="group relative min-w-12 min-h-12 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all hover:-translate-y-1 flex items-center justify-center text-white/80 hover:text-white"
                                disabled={isInReviewPhase || isDisabled || currentIndex === 0} 
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
                    </div>

                </>
                
            );
        } else {
            // advanceStep('create-deck')
            if(hasNotCreatedADeck){
                return;
            }
            return(
                <div className="flex justify-center items-center lg:hidden">
                    <button 
                    onClick={() => setRedoDeck(true)}
                    className="min-w-80 bg-violet-600 hover:bg-violet-700 px-4 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center"
                    >
                        <RotateCcw className="w-5 h-5 mr-2" />
                        <span>Rematch and Improve Grade</span>
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
                    onCreateWithAIModalClick={onCreateWithAIModalClick}
                    knowAnswer={knowAnswer}
                    dontKnowAnswer={dontKnowAnswer}
                />
        
            }
            
            
            {renderStudyButtons()}
        </>
    );
}

export default FlashCardUI;