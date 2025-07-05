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
        percent(0);
    }

    useEffect(() => {
        if (redoDeck) {
            handleShuffle();
            setRedoDeck(false);
        }
    }, [redoDeck, setRedoDeck]);

    const handleKnow = ()=>{
        setProcessing(true)

        if(currentIndex < flashCards.length){
            setShowAnswer(false)
            setTimeout(()=>{
                setCurrentIndex(currentIndex+1)
                knowAnswer(prev => {
                    let newKnowAnswer =  prev + 1;
                    percent(Math.floor((newKnowAnswer/flashCards.length)*100));
                    return newKnowAnswer;
                })
                setAnswers([...answers, true])
                setProcessing(false)
            },  200)             
        } else {
            setProcessing(false)
        }
    }
    
    const handleDontKnow = ()=>{
        setProcessing(true)
   
        if(currentIndex < flashCards.length){
            setShowAnswer(false)
            setTimeout(()=>{
                setCurrentIndex(currentIndex+1)
                dontKnowAnswer(prev => prev+1)
                setAnswers([...answers, false])
                setProcessing(false)
            },200)
        } else {
            setProcessing(false);
        }
    }

    const handleShowAnswer = ()=>{
        setShowAnswer(!showAnswer);
    }

    const handleGoBack = ()=>{
        setProcessing(true)
        if(currentIndex > 0){
            setShowAnswer(false)
            setTimeout(()=>{
                const lastAnswer = answers[currentIndex-1]
                if(lastAnswer){
                    knowAnswer(knowAnswer=> {
                        let newKnowAnswer = knowAnswer - 1;
                        percent(Math.floor((newKnowAnswer/flashCards.length)*100));
                        return newKnowAnswer;
                    })
                }else{
                    dontKnowAnswer(dontKnowAnswer => {
                        let newDontKnowAnswer = dontKnowAnswer - 1;
                        return newDontKnowAnswer;
                    })
                }
                setCurrentIndex(currentIndex-1)
                setAnswers(answers.slice(0, -1));
                setProcessing(false)
            },200)
        } else {
            setProcessing(false)
        }
    }

    useEffect(()=>{
        if(flashCards && flashCards.length > 0){
            setCurrentQuestion(flashCards[currentIndex]?.question);
            setCurrentAnswer(flashCards[currentIndex]?.answer);
        }
    },[flashCards, currentIndex])

    return(
        <>
            <div className={styles.buttonsOptionsContainer}>
                <button 
                    onClick={handleSaveDeck} 
                    className="px-4 py-2 bg-green-600 rounded hover:bg-green-500"
                    disabled={authLoading}
                >
                    {authLoading ? 'Loading...' : authUser ? 'Save Deck' : 'Sign In & Save'}
                </button>
                
                {/* Debug info - remove this in production */}
                
                {/* <div style={{fontSize: '12px', marginTop: '5px', color: '#666'}}>
                    Debug: {debugInfo}
                    <br />
                    User: {authUser ? authUser.email : 'Not signed in'}
                    <br />
                    Pending: {pendingSave ? 'Yes' : 'No'}
                </div> */}
            </div>
            <div className={`${styles.flashCardTextContainer} `} onClick={handleShowAnswer}>
                <div className={`${styles.flipCardInner} ${showAnswer? styles.flipped : ''} `}>
                    <div className={styles.flipCardFront}>
                        {currentQuestion ? (currentQuestion.startsWith('https://firebasestorage.googleapis.com') ? (
                            <img src={currentQuestion} alt="question" className={styles.questionImage}/>
                        ) : (
                            <h2>{currentIndex != flashCards.length? currentQuestion: "You completed it!!!"}</h2>
                        )) : <h2>YOU FINISHED IT!</h2>}
                    </div>
                    <div className={styles.flipCardBack}>
                        {currentAnswer ? currentAnswer.startsWith('https://firebasestorage.googleapis.com') ? (
                            <img src={currentAnswer} alt="answer" className={styles.questionImage} />
                        ) : (
                            <h2>{currentIndex != flashCards.length? currentAnswer: "You completed it!!!"}</h2>
                        ) : (
                            <h2>YOU FINISHED IT!</h2>
                        )}
                    </div>
                </div>
            </div>
            
            <div className={styles.buttonsContainer}>
                <button className={styles.outerFlashCardButtons} disabled={processing} onClick={()=>handleGoBack()}><i className="fa-solid fa-arrow-rotate-right fa-flip-horizontal"></i></button>
                <button className={`${styles.innerFlashCardButtons} hover:bg-red-600 transition-all duration-200`} disabled={processing} onClick={()=>handleDontKnow()}><i className="fa-solid fa-xmark" id="wrongButton"></i></button>
                <div className={styles.scoreContainer}>
                    <h2 style={{margin: '0px'}}>{currentIndex < flashCards.length? `${currentIndex+1}/${flashCards.length}`: `${flashCards.length}/${flashCards.length}`}</h2>
                </div>
                <button className={`${styles.innerFlashCardButtons} hover:bg-emerald-600 transition-all duration-200`} disabled={processing} onClick={()=>handleKnow()} style={{padding: '10px 13px'}}><i className="fa-solid fa-check" id="checkButton"></i></button>
                <button className={`${styles.outerFlashCardButtons}`} onClick={()=>handleShuffle()}><i className="fa-solid fa-repeat"></i></button>
            </div>
        </>
    )
}

export default FlashCardUI;