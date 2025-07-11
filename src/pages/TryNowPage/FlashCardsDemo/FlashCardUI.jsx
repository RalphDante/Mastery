import { useEffect, useState, useCallback } from "react";

// Saving
import { getDatabase, ref, onValue, set, push } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { useLocation, useNavigate } from "react-router-dom";
import styles from './FlashCardsPage.module.css'
import { useParams } from "react-router-dom";

// Authentication - ADD signInWithRedirect and getRedirectResult
import { 
    signInWithPopup, 
    signInWithRedirect, 
    getRedirectResult,
    GoogleAuthProvider 
} from "firebase/auth";
import { app, auth } from "../../../api/firebase";

import EditFlashCardBtn from './EditFlashCardBtn'
import SetToPublic from "./SetToPublic";

// Helper function to detect if user is on mobile
const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

function FlashCardUI({knowAnswer, dontKnowAnswer, percent, redoDeck, setRedoDeck}){

    const location = useLocation();
    const [authUser, setAuthUser] = useState(null);
    const {fileName} = useParams();
    const navigate = useNavigate();
    const [flashCards, setFlashCards] = useState([]);
    const [pendingSave, setPendingSave] = useState(false);
    const [authLoading, setAuthLoading] = useState(true); // Add loading state
    const [debugInfo, setDebugInfo] = useState(''); // Add debug info

    // Other state variables
    const [currentQuestion, setCurrentQuestion] = useState();
    const [currentAnswer, setCurrentAnswer] = useState();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [answers, setAnswers] = useState([]);
    const [processing, setProcessing] = useState(false);

    // Quick Study Mode state variables
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [wrongCards, setWrongCards] = useState([]);
    const [reviewAnswers, setReviewAnswers] = useState([]);
    const [reviewIndex, setReviewIndex] = useState(0);
    const [showReviewComplete, setShowReviewComplete] = useState(false);

    useEffect(() => {
        if (location.state?.flashcards) {
          setFlashCards(location.state.flashcards);
        }
    }, [location.state]);

    // Create saveDeckToDatabase with useCallback to prevent recreation on every render
    const saveDeckToDatabase = useCallback(async (user = authUser) => {
        try {
            console.log('Attempting to save deck...', { user: user?.email, flashCardsLength: flashCards.length });
            
            const uid = user?.uid;
            if (!uid) {
                throw new Error('User not authenticated');
            }
            
            if (!flashCards || flashCards.length === 0) {
                throw new Error('No flashcards to save');
            }
            
            const db = getDatabase(app);

            const now = new Date();
            const deckName = `Deck ${now.toLocaleDateString().replace(/\//g, '-')} ${now.toLocaleTimeString()}`;

            const newFileRef = ref(db, `QuizletsFolders/${uid}/First Folder/${deckName}`);
            const newDocRef = push(newFileRef);
    
            await set(newDocRef, {
                Description: "Add a description",
                Flashcards: flashCards
            });
            
            console.log('Deck saved successfully, navigating...');
            navigate(`/flashcards/${encodeURIComponent(`First Folder/${deckName}`)}`);
            alert('Deck saved successfully!');
            
        } catch (error) {
            console.error('Error saving deck:', error);
            alert(`Error saving deck: ${error.message}`);
        }
    }, [authUser, flashCards, navigate]);

    // Enhanced onAuthStateChanged listener with better debugging
    useEffect(() => {
        console.log('Setting up auth state listener...');
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            console.log('🔥 Auth state changed:', {
                user: user ? {
                    email: user.email,
                    uid: user.uid,
                    displayName: user.displayName
                } : null,
                pendingSave,
                timestamp: new Date().toISOString()
            });
            
            setAuthUser(user);
            setAuthLoading(false);
            setDebugInfo(`Auth: ${user ? user.email : 'Not signed in'} at ${new Date().toLocaleTimeString()}`);
            
            // If we were waiting to save after redirect, save now
            if (user && pendingSave) {
                console.log('✅ Pending save detected, saving deck...');
                setPendingSave(false);
                saveDeckToDatabase(user);
            }
        });
    
        return () => {
            console.log('Cleanup: Auth state listener unsubscribed');
            unsubscribe();
        };
    }, [pendingSave, saveDeckToDatabase]);

    // Enhanced redirect result check with better error handling
    useEffect(() => {
        const checkRedirectResult = async () => {
            try {
                console.log('🔍 Checking redirect result...');
                setDebugInfo('Checking redirect result...');
                
                const result = await getRedirectResult(auth);
                
                if (result) {
                    const user = result.user;
                    console.log('✅ User signed in via redirect:', {
                        displayName: user.displayName,
                        email: user.email,
                        uid: user.uid
                    });
                    setDebugInfo(`Redirect success: ${user.email}`);
                    // The onAuthStateChanged will handle the rest
                } else {
                    console.log('ℹ️ No redirect result found');
                    setDebugInfo('No redirect result found');
                }
            } catch (error) {
                console.error('❌ Error getting redirect result:', error);
                setDebugInfo(`Redirect error: ${error.message}`);
                
                // More specific error handling
                if (error.code === 'auth/unauthorized-domain') {
                    alert('Domain not authorized. Please add your domain to Firebase Console.');
                } else if (error.code === 'auth/operation-not-allowed') {
                    alert('Google sign-in not enabled. Please enable it in Firebase Console.');
                } else {
                    alert(`Error completing sign-in: ${error.message}`);
                }
                
                setPendingSave(false);
            }
        };

        // Only check redirect result once when component mounts
        checkRedirectResult();
    }, []); // Empty dependency array - only run once

    const handleSaveDeck = async () => {
        try {
            console.log('💾 Save deck clicked', { 
                authUser: authUser?.email, 
                isMobileDevice: isMobile(),
                authLoading 
            });
            
            // Don't proceed if auth is still loading
            if (authLoading) {
                console.log('⏳ Auth still loading, please wait...');
                alert('Authentication loading, please wait...');
                return;
            }
            
            // Check if user is already authenticated
            if (authUser) {
                console.log('✅ User already authenticated, saving directly');
                await saveDeckToDatabase();
                return;
            }

            const provider = new GoogleAuthProvider();
            
            // Add scopes and custom parameters
            provider.addScope('email');
            provider.addScope('profile');
            provider.setCustomParameters({
                prompt: 'select_account'
            });
            
            console.log('🔐 Starting authentication flow...');
            setDebugInfo('Starting sign-in...');
            
            // SOLUTION: Always use popup for now to avoid web-storage issues
            // Mobile browsers often have storage restrictions that break redirect flow
            try {
                console.log('🔄 Using popup (universal approach)...');
                setDebugInfo('Using popup authentication...');
                
                const result = await signInWithPopup(auth, provider);
                const user = result.user;
                console.log('✅ User signed in via popup:', user.displayName, user.email);
                await saveDeckToDatabase(user);
                
            } catch (popupError) {
                console.log('❌ Popup failed, trying redirect as fallback...');
                setDebugInfo('Popup failed, trying redirect...');
                
                // If popup fails, try redirect as fallback
                if (popupError.code === 'auth/popup-blocked' || 
                    popupError.code === 'auth/popup-closed-by-user' ||
                    popupError.code === 'auth/web-storage-unsupported') {
                    
                    console.log('📱 Falling back to redirect...');
                    setPendingSave(true);
                    
                    // Try to store in sessionStorage instead of localStorage
                    try {
                        sessionStorage.setItem('pendingSave', 'true');
                        sessionStorage.setItem('pendingSaveTimestamp', Date.now().toString());
                    } catch (storageError) {
                        console.log('⚠️ Storage unavailable, continuing without backup');
                    }
                    
                    await signInWithRedirect(auth, provider);
                } else {
                    throw popupError; // Re-throw if it's a different error
                }
            }
            
        } catch (error) {
            console.error('❌ Error during sign-in:', error);
            setPendingSave(false);
            setDebugInfo(`Sign-in error: ${error.message}`);
            
            // Clear storage backup
            try {
                localStorage.removeItem('pendingSave');
                localStorage.removeItem('pendingSaveTimestamp');
                sessionStorage.removeItem('pendingSave');
                sessionStorage.removeItem('pendingSaveTimestamp');
            } catch (e) {
                console.log('⚠️ Could not clear storage');
            }
            
            let errorMessage = 'Error signing in. Please try again.';
            
            if (error.code === 'auth/popup-closed-by-user') {
                errorMessage = 'Sign-in was cancelled. Please try again to save your deck.';
            } else if (error.code === 'auth/popup-blocked') {
                errorMessage = 'Pop-up was blocked. Please allow pop-ups for this site or try again.';
            } else if (error.code === 'auth/unauthorized-domain') {
                errorMessage = 'Domain not authorized. Please add your domain to Firebase Console.';
            } else if (error.code === 'auth/web-storage-unsupported') {
                errorMessage = 'Your browser has storage restrictions. Please:\n1. Enable cookies\n2. Disable private/incognito mode\n3. Try a different browser';
            } else if (error.message) {
                errorMessage = `Error: ${error.message}`;
            }
            
            alert(errorMessage);
        }
    };

    // Check for pending save in storage (backup mechanism)
    useEffect(() => {
        const checkPendingSave = () => {
            // Try both localStorage and sessionStorage
            const pendingSaveFromLocal = localStorage.getItem('pendingSave');
            const pendingSaveFromSession = sessionStorage.getItem('pendingSave');
            const pendingSaveExists = pendingSaveFromLocal || pendingSaveFromSession;
            
            const timestampLocal = localStorage.getItem('pendingSaveTimestamp');
            const timestampSession = sessionStorage.getItem('pendingSaveTimestamp');
            const timestamp = timestampLocal || timestampSession;
            
            if (pendingSaveExists === 'true' && authUser && !pendingSave) {
                console.log('📦 Found pending save in storage, processing...');
                
                // Check if it's not too old (5 minutes max)
                const now = Date.now();
                const saveTime = parseInt(timestamp || '0');
                if (now - saveTime < 5 * 60 * 1000) { // 5 minutes
                    setPendingSave(true);
                    // Clear both storage types
                    try {
                        localStorage.removeItem('pendingSave');
                        localStorage.removeItem('pendingSaveTimestamp');
                        sessionStorage.removeItem('pendingSave');
                        sessionStorage.removeItem('pendingSaveTimestamp');
                    } catch (e) {
                        console.log('⚠️ Could not clear storage');
                    }
                } else {
                    console.log('⏰ Pending save expired, clearing...');
                    try {
                        localStorage.removeItem('pendingSave');
                        localStorage.removeItem('pendingSaveTimestamp');
                        sessionStorage.removeItem('pendingSave');
                        sessionStorage.removeItem('pendingSaveTimestamp');
                    } catch (e) {
                        console.log('⚠️ Could not clear storage');
                    }
                }
            }
        };
        
        if (authUser) {
            checkPendingSave();
        }
    }, [authUser, pendingSave]);

    const fetchFlashCards = useCallback(()=>{
        // Empty function - you can implement this later
    }, [authUser, fileName]);

    useEffect(() => {
        const unsubscribe = fetchFlashCards();
        if(unsubscribe){
            return () => unsubscribe();
        }
    }, [fetchFlashCards]);

    const handleShuffle = ()=>{
        setProcessing(false)
        let flashCardsCopy = [...flashCards];
        let shuffledFlashCards = [];
        while(flashCardsCopy.length != 0){
            let randomNum = Math.floor(Math.random() * flashCardsCopy.length)        
            shuffledFlashCards.push(flashCardsCopy[randomNum])
            flashCardsCopy.splice(randomNum, 1)
        }

        setFlashCards(shuffledFlashCards)
        setShowAnswer(false)
        setCurrentIndex(0)
        knowAnswer(0);
        dontKnowAnswer(0);
        percent(0);
        
        setAnswers([]);
        
        // Reset review mode
        setIsReviewMode(false);
        setWrongCards([]);
        setReviewAnswers([]);
        setReviewIndex(0);
        setShowReviewComplete(false);
    }

    useEffect(() => {
        if (redoDeck) {
            handleShuffle();
            setRedoDeck(false);
        }
    }, [redoDeck, setRedoDeck]);

    // Start Quick Study Mode
    const startQuickStudy = () => {
        // Filter out the cards that were answered incorrectly
        const incorrectCards = flashCards.filter((card, index) => answers[index] === false);
        
        if (incorrectCards.length === 0) {
            alert('Great job! You got all cards correct. No need for review!');
            return;
        }

        setWrongCards(incorrectCards);
        setIsReviewMode(true);
        setReviewIndex(0);
        setReviewAnswers([]);
        setShowAnswer(false);
        setShowReviewComplete(false);
    };

    // Handle review mode responses (these don't increment main counters)
    const handleReviewKnow = () => {
        setProcessing(true);
        
        if (reviewIndex < wrongCards.length) {
            setShowAnswer(false);
            setTimeout(() => {
                setWrongCards(prev => prev.filter((_, idx) => idx !== reviewIndex));
                setReviewAnswers(prev => [...prev, true]);
    
                // Don't increment if we removed the last card
                setReviewIndex(prev => Math.max(0, Math.min(prev, wrongCards.length - 2)));
                setProcessing(false);
            }, 200);
        } else {
            setProcessing(false);
        }
    };
    const handleReviewDontKnow = () => {
        setProcessing(true);
        
        if (reviewIndex < wrongCards.length) {
            setShowAnswer(false);
            setTimeout(() => {
                const currentCard = wrongCards[reviewIndex];
                // Re-add the card to the end of the deck
                setWrongCards(prev => [...prev.slice(0, reviewIndex), ...prev.slice(reviewIndex + 1), currentCard]);
                setReviewAnswers(prev => [...prev, false]);
    
                // Don't increment reviewIndex, just move to the next one in the updated list
                setProcessing(false);
            }, 200);
        } else {
            setProcessing(false);
        }
    };

    // Handle main mode responses (these increment counters)
    const handleKnow = () => {
        setProcessing(true);

        if (currentIndex < flashCards.length) {
            setShowAnswer(false);
            setTimeout(() => {
                setCurrentIndex(currentIndex + 1);
                knowAnswer(prev => {
                    let newKnowAnswer = prev + 1;
                    percent(Math.floor((newKnowAnswer / flashCards.length) * 100));
                    return newKnowAnswer;
                });
                setAnswers([...answers, true]);
                setProcessing(false);
            }, 200);
        } else {
            setProcessing(false);
        }
    };
    
    const handleDontKnow = () => {
        setProcessing(true);
   
        if (currentIndex < flashCards.length) {
            setShowAnswer(false);
            setTimeout(() => {
                setCurrentIndex(currentIndex + 1);
                dontKnowAnswer(prev => prev + 1);
                setAnswers([...answers, false]);
                setProcessing(false);
            }, 200);
        } else {
            setProcessing(false);
        }
    };

    const handleShowAnswer = () => {
        setShowAnswer(!showAnswer);
    };

    const handleGoBack = () => {
        setProcessing(true);
        
        if (isReviewMode) {
            // Review mode go back
            if (reviewIndex > 0) {
                setShowAnswer(false);
                setTimeout(() => {
                    setReviewIndex(reviewIndex - 1);
                    setReviewAnswers(reviewAnswers.slice(0, -1));
                    setProcessing(false);
                }, 200);
            } else {
                setProcessing(false);
            }
        } else {
            // Main mode go back
            if (currentIndex > 0) {
                setShowAnswer(false);
                setTimeout(() => {
                    const lastAnswer = answers[currentIndex - 1];
                    if (lastAnswer) {
                        knowAnswer(knowAnswer => {
                            let newKnowAnswer = knowAnswer - 1;
                            percent(Math.floor((newKnowAnswer / flashCards.length) * 100));
                            return newKnowAnswer;
                        });
                    } else {
                        dontKnowAnswer(dontKnowAnswer => {
                            let newDontKnowAnswer = dontKnowAnswer - 1;
                            return newDontKnowAnswer;
                        });
                    }
                    setCurrentIndex(currentIndex - 1);
                    setAnswers(answers.slice(0, -1));
                    setProcessing(false);
                }, 200);
            } else {
                setProcessing(false);
            }
        }
    };

    // Exit review mode
    const exitReviewMode = () => {
        setIsReviewMode(false);
        setShowReviewComplete(true);
    };

    // Get current card content based on mode
    const getCurrentCardContent = () => {
        if (isReviewMode) {
            const card = wrongCards[reviewIndex];
            return {
                question: card?.question,
                answer: card?.answer,
                currentIndex: reviewIndex,
                totalCards: wrongCards.length,
                isFinished: reviewIndex >= wrongCards.length
            };
        } else {
            return {
                question: flashCards[currentIndex]?.question,
                answer: flashCards[currentIndex]?.answer,
                currentIndex: currentIndex,
                totalCards: flashCards.length,
                isFinished: currentIndex >= flashCards.length
            };
        }
    };

    const cardContent = getCurrentCardContent();

    useEffect(() => {
        const finishedInitialRun = !isReviewMode && currentIndex >= flashCards.length;
        const hasIncorrectAnswers = answers.some(answer => answer === false);
    
        if (finishedInitialRun && hasIncorrectAnswers) {
            startQuickStudy();
        }
    }, [currentIndex, isReviewMode, answers]);

    // Check if review is complete
    useEffect(() => {
        if (isReviewMode && reviewIndex >= wrongCards.length) {
            setShowReviewComplete(true);
        }
    }, [isReviewMode, reviewIndex, wrongCards.length]);

    useEffect(() => {
        if (flashCards && flashCards.length > 0) {
            setCurrentQuestion(cardContent.question);
            setCurrentAnswer(cardContent.answer);
        }
    }, [flashCards, currentIndex, reviewIndex, isReviewMode]);

    return (
        <>
            <div className="flex justify-between mt-4 mb-1">
                <button
                    onClick={handleSaveDeck} 
                    className="px-4 py-2 bg-green-600 rounded hover:bg-green-500"
                    disabled={authLoading}
                >
                    {authLoading ? 'Loading...' : authUser ? 'Save Deck' : 'Sign In & Save'}
                </button>
                
                {/* Review Mode Indicator */}
                {isReviewMode && (
                    <div className="px-4 py-2 bg-blue-600 text-white rounded">
                        Quick Study Mode - Reviewing Wrong Answers
                    </div>
                )}
            </div>

            {/* Progress indicator */}
            {/* <div className="text-center mb-4">
                <div className="text-white/60 text-sm">
                    {isReviewMode ? (
                        <span>Review: {Math.min(reviewIndex + 1, wrongCards.length)}/{wrongCards.length}</span>
                    ) : (
                        <span>Card {Math.min(currentIndex + 1, flashCards.length)} of {flashCards.length}</span>
                    )}
                </div>
            </div> */}

            <div className={`${styles.scoreContainer}`}>
                <div style={{ margin: '0px', textAlign: 'center' }}>
                    {isReviewMode ? (
                        <>
                            <span className="text-white/70 text-sm">Review Phase</span>
                            <div style={{ 
                                fontSize: '0.7rem', 
                                color: '#F59E0B', 
                                marginTop: '0.5px'
                            }}>
                                {wrongCards.length - reviewIndex} left
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-white/70 text-sm my-3">
                            Card {Math.min(currentIndex + 1, flashCards.length)} of {flashCards.length}
                        </div>
                    )}
                </div>
            </div>

            {/* Review Complete Message */}
            {/* {showReviewComplete && (
                <div className="text-center my-4 p-4 bg-green-900/20 border border-green-600 rounded-lg">
                    <h3 className="text-green-400 font-medium mb-2">Review Complete!</h3>
                    <p className="text-white/80">
                        You've finished reviewing your incorrect answers. Great job studying!
                    </p>
                    <button 
                        onClick={() => {
                            setShowReviewComplete(false);
                            setIsReviewMode(false);
                        }}
                        className="mt-3 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
                    >
                        Continue
                    </button>
                </div>
            )} */}

            <div className={`${styles.flashCardTextContainer}`} onClick={handleShowAnswer}>
                <div className={`${styles.flipCardInner} ${showAnswer ? styles.flipped : ''}`}>
                    <div className={`${styles.flipCardFront} bg-white/5 border border-white/10`}>
                        {cardContent.question ? (
                            cardContent.question.startsWith('https://firebasestorage.googleapis.com') ? (
                                <img src={cardContent.question} alt="question" className={styles.questionImage} />
                            ) : (
                                <h2>
                                    {cardContent.isFinished ? 
                                        (isReviewMode ? "Review Complete!" : "You completed it!!!") : 
                                        cardContent.question
                                    }
                                </h2>   
                            )
                        ) : (
                            <h2>{isReviewMode ? "Review Complete!" : "YOU FINISHED IT!"}</h2>
                        )}
                    </div>
                    <div className={`${styles.flipCardBack} bg-white/5 border border-white/10`}>
                        {cardContent.answer ? (
                            cardContent.answer.startsWith('https://firebasestorage.googleapis.com') ? (
                                <img src={cardContent.answer} alt="answer" className={styles.questionImage} />
                            ) : (
                                <h2>
                                    {cardContent.isFinished ? 
                                        (isReviewMode ? "Review Complete!" : "You completed it!!!") : 
                                        cardContent.answer
                                    }
                                </h2>
                            )
                        ) : (
                            <h2>{isReviewMode ? "Review Complete!" : "YOU FINISHED IT!"}</h2>
                        )}
                    </div>
                </div>
            </div>

            <div className={`${styles.buttonsContainer} gap-4`}>
                <button 
                    className="group relative min-w-12 min-h-12 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all hover:-translate-y-1 flex items-center justify-center text-white/80 hover:text-white"
                    disabled={processing || (isReviewMode ? reviewIndex === 0 : currentIndex === 0)}
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
                        disabled={processing || cardContent.isFinished}
                        onClick={isReviewMode ? handleReviewDontKnow : handleDontKnow}
                    >
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black/90 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            Mark as Incorrect
                        </div>
                        ✕ Incorrect
                    </button>

                    <button 
                        className="group relative px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-medium transition-all hover:-translate-y-1 hover:shadow-lg flex items-center gap-2"
                        disabled={processing || cardContent.isFinished}
                        onClick={isReviewMode ? handleReviewKnow : handleKnow}
                    >
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black/90 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            Mark as Correct
                        </div>
                        ✓ Correct
                    </button>
                </div>
                
                <button 
                    className="group relative min-w-12 min-h-12 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all hover:-translate-y-1 flex items-center justify-center text-white/80 hover:text-white"
                    disabled={processing} 
                    onClick={handleShuffle}
                >
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black/90 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        'Shuffle Deck'
                    </div>
                    🔀
                </button>
            </div>

            
        </>
    );
}

export default FlashCardUI;