// Firestore

import { 
    getFirestore, 
    collection, 
    doc, 
    setDoc, 
    addDoc, 
    writeBatch, 
    serverTimestamp,
    increment,
    getDoc 
} from 'firebase/firestore';

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

// Sign-in card component
const SignInCard = ({ handleSaveDeck }) => (
    <div className="bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 p-6 rounded-xl mb-8 relative z-10">
        <h3 className="text-emerald-400 text-xl font-semibold mb-2">
            Don't lose your progress!
        </h3>
        <p className="text-white/90 mb-4">
            Sign in to save your study session and track your learning over time.
        </p>
        <button 
            onClick={handleSaveDeck}
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
        >
            Sign In to Save Cards
        </button>
    </div>
);

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
    const [showEmphasisToSignUp, setShowEmphasisToSignUp] = useState(false);
    const [studyStartTime, setStudyStartTime] = useState(null);
    const [studyElapsedTime, setStudyElapsedTime] = useState(0);
    const [timerInterval, setTimerInterval] = useState(null);
    
    // Quick Study Mode state variables
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [wrongCards, setWrongCards] = useState([]);
    const [reviewAnswers, setReviewAnswers] = useState([]);
    const [reviewIndex, setReviewIndex] = useState(0);
    const [showReviewComplete, setShowReviewComplete] = useState(false);

    const [studySessionCompleted, setStudySessionCompleted] = useState(false); // New state to manage overall completion

    const [hasWrongAnswer, setHasWrongAnswer] = useState(false);

    useEffect(() => {
        if (location.state?.flashcards) {
          setFlashCards(location.state.flashcards);
        }
    }, [location.state]);

    // Helper function to format time
    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    

    // Optional: Even better approach would be to check if user exists first
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
            
            const db = getFirestore();
            const userRef = doc(db, 'users', uid);
            
            // Check if user document exists
            const userDoc = await getDoc(userRef);
            const isNewUser = !userDoc.exists();
            
            if (isNewUser) {
                // Create new user with default values
                await setDoc(userRef, {
                    email: user.email,
                    displayName: user.displayName || 'Anonymous User',
                    createdAt: serverTimestamp(),
                    lastActiveAt: serverTimestamp(),
                    lastStudyDate: null,
                    stats: {
                        totalReviews: 0,
                        weeklyReviews: 0,
                        currentStreak: 0,
                        longestStreak: 0,
                        totalDecks: 0,
                        totalCards: 0
                    },
                    subscription: {
                        tier: "free",
                        expiresAt: null
                    }
                });
            }
            
            // Now use batch for the rest of the operations
            const batch = writeBatch(db);
            
            // Update user stats and last active time
            batch.update(userRef, {
                'stats.totalDecks': increment(1),
                'stats.totalCards': increment(flashCards.length),
                lastActiveAt: serverTimestamp(),
                // Update display name in case it changed
                displayName: user.displayName || 'Anonymous User'
            });
            
            // Create folder
            const folderRef = doc(collection(db, 'folders'));
            const folderName = "First Folder";
            
            batch.set(folderRef, {
                name: folderName,
                ownerId: uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                subscriptionTier: "free",
                isPublic: false,
                deckCount: 1
            });
            
            // Create deck
            const deckRef = doc(collection(db, 'decks'));
            const now = new Date();
            const deckTitle = `Deck ${now.toLocaleDateString().replace(/\//g, '-')} ${now.toLocaleTimeString()}`;
            
            batch.set(deckRef, {
                title: deckTitle,
                description: "Add a description",
                ownerId: uid,
                folderId: folderRef.id,
                isPublic: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                cardCount: flashCards.length,
                tags: []
            });
            
            // Add flashcards
            flashCards.forEach((card, index) => {
                const cardRef = doc(collection(db, 'decks', deckRef.id, 'cards'));
                batch.set(cardRef, {
                    question: card.question || card.front || '',
                    answer: card.answer || card.back || '',
                    question_type: "text",
                    answer_type: "text",
                    createdAt: serverTimestamp(),
                    order: index + 1
                });
            });
            
            // Execute batch
            await batch.commit();
            
            console.log('Deck saved successfully');
            navigate(`/flashcards/${deckRef.id}`);
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
        setShowEmphasisToSignUp(false);
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
            setShowEmphasisToSignUp(false)
            handleShuffle();
            setRedoDeck(false);
        }
    }, [redoDeck, setRedoDeck]);

    // Start Quick Study Mode
    const startQuickStudy = () => {
        setHasWrongAnswer(false);
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
        setHasWrongAnswer(true);
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
        // Don't allow flipping if we're finished and not authenticated
        if (isFinished && !authUser) {
            return;
        }
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

    // Check if we're in a finished state
    const isFinished = flashCards.length > 0 && cardContent.isFinished;;
    const isMainModeFinished = !isReviewMode && currentIndex >= flashCards.length;
    const isReviewModeFinished = isReviewMode && reviewIndex >= wrongCards.length;

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

    const currentMode = "cramming"

    // Helper function to get content for finished state
    const getFinishedContent = () => {
        if (!authUser && !hasWrongAnswer) {

            return <SignInCard handleSaveDeck={handleSaveDeck} />;
        } else {
            return (
                <h2>
                    {isReviewMode ? "Review Complete!" : "You completed it!!!"}
                </h2>
            );
        }
    };

    // useEffect to start the timer when component mounts and flashcards are loaded
    useEffect(() => {
        if (flashCards.length > 0 && !studyStartTime && !isFinished) {
            const startTime = Date.now();
            setStudyStartTime(startTime);
            
            // Start the interval to update elapsed time every second
            const interval = setInterval(() => {
                const currentTime = Date.now();
                const elapsed = Math.floor((currentTime - startTime) / 1000);
                setStudyElapsedTime(elapsed);
            }, 1000);
            
            setTimerInterval(interval);
        }
        
        // Cleanup interval on unmount
        return () => {
            if (timerInterval) {
                clearInterval(timerInterval);
            }
        };
    }, [flashCards.length, studyStartTime, isFinished]);

    // Add this useEffect to stop the timer when study session is finished
    useEffect(() => {
        if (isFinished && timerInterval) {
            clearInterval(timerInterval);
            setTimerInterval(null);
            console.log(`Study session completed in ${formatTime(studyElapsedTime)}`);
        }
    }, [isFinished, timerInterval, studyElapsedTime]);

    // Add this useEffect to handle shuffle/restart - reset the timer
    useEffect(() => {
        if (redoDeck) {
            // Reset timer when deck is shuffled/restarted
            if (timerInterval) {
                clearInterval(timerInterval);
            }
            setStudyStartTime(null);
            setStudyElapsedTime(0);
            setTimerInterval(null);
        }
    }, [redoDeck, timerInterval]);

  
    useEffect(() => {
        if (isFinished && !authUser && !hasWrongAnswer) {
            setShowEmphasisToSignUp(true);
        }
    }, [isFinished, authUser, hasWrongAnswer]);

    return (
        <>
            <div className="flex justify-end mb-1">
                

                <div className="flex bg-gray-700 rounded-lg p-1">
                    <button
                        // onClick={() => handleModeSwitch('cramming')}
                        // disabled={isLoading}
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
                        onClick={handleSaveDeck}
                        disabled={authLoading}
                        className={`group relative px-4 py-2 rounded-md font-medium transition-all duration-200 flex items-center gap-2 ${
                            currentMode === 'spaced' 
                                ? 'bg-emerald-600 text-white shadow-lg' 
                                : 'bg-gray-600 text-gray-500 hover:text-white hover:bg-gray-600'
                        }`}
                    >
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black/90 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                            Sign up to use Spaced Repetition
                        </div>

                        <i className="fa-solid fa-brain"></i>
                        Smart Review
                    </button>
                </div>
            </div>

            <div class="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg shadow-xl border border-purple-500/50">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <p class="font-semibold">🎉 Great progress! Save your {formatTime(studyElapsedTime)} study session & {flashCards.length} cards</p>
                    </div>
                    <button class="bg-white text-purple-600 font-semibold px-5 py-2 rounded-lg hover:bg-gray-100 transition-colors text-sm shadow-md flex-shrink-0 ml-4"
                        onClick={handleSaveDeck}
                    >
                        Keep Progress
                    </button>
                </div>
            </div>

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
                        <div>
                             <div className="text-center text-white/70 text-sm my-3">
                                Card {Math.min(currentIndex + 1, flashCards.length)} of {flashCards.length}
                            </div>
                        </div>
                       
                    )}
                </div>
            </div>

            <div className={`study-time-tracker`}>
                <div className="flex items-center gap-2 text-sm text-white/70">
                    {isFinished ? (
                        <>
                            <span>Finished - Timer Stopped: {formatTime(studyElapsedTime)}</span>
                        </>
                    ) : (
                        <>
                            <div className={`w-2 h-2 rounded-full bg-green-400 animate-pulse`}></div>
                            <span>Study Time: {formatTime(studyElapsedTime)}</span>
                        </>
                    )}
                </div>
            </div>

            <div className={`${styles.flashCardTextContainer}`} onClick={handleShowAnswer}>
                <div className={`${styles.flipCardInner} ${showAnswer ? styles.flipped : ''}`}>
                    <div className={`${styles.flipCardFront} bg-white/5 border border-white/10`}>
                        {isFinished ? (
                            getFinishedContent()
                        ) : cardContent.question ? (
                            cardContent.question.startsWith('https://firebasestorage.googleapis.com') ? (
                                <img src={cardContent.question} alt="question" className={styles.questionImage} />
                            ) : (
                                <h2>{cardContent.question}</h2>   
                            )
                        ) : (
                            <h2>Loading...</h2>
                        )}
                    </div>
                    <div className={`${styles.flipCardBack} bg-white/5 border border-white/10`}>
                        {isFinished ? (
                            getFinishedContent()
                        ) : cardContent.answer ? (
                            cardContent.answer.startsWith('https://firebasestorage.googleapis.com') ? (
                                <img src={cardContent.answer} alt="answer" className={styles.questionImage} />
                            ) : (
                                <h2>{cardContent.answer}</h2>
                            )
                        ) : (
                            <h2>Loading...</h2>
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
                        className={showEmphasisToSignUp ? 
                            "group relative px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 opacity-40 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-medium transition-all hover:-translate-y-1 hover:shadow-lg flex items-center gap-2" :
                            "group relative px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-medium transition-all hover:-translate-y-1 hover:shadow-lg flex items-center gap-2" 
                        }
                        disabled={processing || isFinished}
                        onClick={isReviewMode ? handleReviewDontKnow : handleDontKnow}
                    >
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black/90 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            Mark as Incorrect
                        </div>
                        ✕ Incorrect
                    </button>

                    <button 
                        className={showEmphasisToSignUp ? 
                            "group relative px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 opacity-40 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-medium transition-all hover:-translate-y-1 hover:shadow-lg flex items-center gap-2" :
                            "group relative px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-medium transition-all hover:-translate-y-1 hover:shadow-lg flex items-center gap-2"
                        }
                        disabled={processing || isFinished}
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
                        Shuffle Deck
                    </div>
                    <i class="fas fa-shuffle"></i>
                </button>
            </div>
        </>
    );
}

export default FlashCardUI;