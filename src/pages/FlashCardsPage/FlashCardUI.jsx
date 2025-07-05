import { useEffect, useState, useCallback } from "react";
import {auth, app} from '../../api/firebase'
import { getDatabase, ref, onValue } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { useLocation } from "react-router-dom";
import styles from './FlashCardsPage.module.css'
import { useParams } from "react-router-dom";

import EditFlashCardBtn from './EditFlashCardBtn'
import SetToPublic from "./SetToPublic";

function FlashCardUI({
    knowAnswer, 
    dontKnowAnswer, 
    percent, 
    redoDeck, 
    setRedoDeck, 
    studyMode, 
    onStudyModeChange, 
    currentIndex, 
    setCurrentIndex
}){

    const location = useLocation();
    const [authUser, setAuthUser] = useState(null);
    const {fileName} = useParams();

    const [flashCards, setFlashCards] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState();
    const [currentAnswer, setCurrentAnswer] = useState();
    const [showAnswer, setShowAnswer] = useState(false)
    const [answers, setAnswers] = useState([]);
    const [processing, setProcessing] = useState(false)

    const db = getDatabase(app);

    useEffect(()=>{
        onAuthStateChanged(auth, (user)=>{
            if(user){
                setAuthUser(user)
            } else {
                setAuthUser(null)
            }
        })
    },[])

    const fetchFlashCards = useCallback(()=>{
        if (authUser) {
            const fileDocRef = ref(db, `QuizletsFolders/${authUser.uid}/${fileName}`);
    
            const unsubscribe = onValue(fileDocRef, (snapshot) => {
                const data = snapshot.val();

                if(data){
                    const descriptionUID = Object.keys(data);
                    const flashCardDocRef = ref(db, `QuizletsFolders/${authUser.uid}/${fileName}/${descriptionUID}/Flashcards`);

                    const secondUnsubscribe = onValue(flashCardDocRef, (snapshot)=>{
                        const secondData = snapshot.val()
                        setFlashCards(()=>{
                            return secondData});
                        console.log("Second Snapshot:", secondData)
                    },(error)=>{
                        console.error("Database read error:", error)
                    });

                return () => secondUnsubscribe;
                }
            },(error) => {
                console.error("Database read error:", error);
            });
    
            return () => unsubscribe();
        }
    }, [authUser, fileName, db])

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
                const newIndex = currentIndex + 1;
                setCurrentIndex(newIndex)
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
                const newIndex = currentIndex + 1;
                setCurrentIndex(newIndex)
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
                    knowAnswer(prev => {
                        let newKnowAnswer = prev - 1;
                        percent(Math.floor((newKnowAnswer/flashCards.length)*100));
                        return newKnowAnswer;
                    })
                }else{
                    dontKnowAnswer(prev => prev - 1)
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
        console.log("flashCards:", flashCards)
        if(flashCards){
            setCurrentQuestion(flashCards[currentIndex]?.question);
            setCurrentAnswer(flashCards[currentIndex]?.answer);
        }
    },[flashCards, currentIndex])

    // Render different button sets based on study mode
    const renderStudyButtons = () => {
        if (studyMode === 'spaced') {
            return (
                <div className={styles.buttonsContainer}>
                    <button className={styles.outerFlashCardButtons} disabled={processing} onClick={()=>handleGoBack()}>
                        <i className="fa-solid fa-arrow-rotate-right fa-flip-horizontal"></i>
                    </button>
                    
                    {/* Spaced repetition buttons */}
                    <button className={`${styles.innerFlashCardButtons} hover:bg-red-600 transition-all duration-200`} disabled={processing} onClick={()=>handleDontKnow()}>
                        Again
                    </button>
                    <button className={`${styles.innerFlashCardButtons} hover:bg-orange-600 transition-all duration-200`} disabled={processing} onClick={()=>handleDontKnow()}>
                        Hard
                    </button>
                    <button className={`${styles.innerFlashCardButtons} hover:bg-blue-600 transition-all duration-200`} disabled={processing} onClick={()=>handleKnow()}>
                        Good
                    </button>
                    <button className={`${styles.innerFlashCardButtons} hover:bg-emerald-600 transition-all duration-200`} disabled={processing} onClick={()=>handleKnow()}>
                        Easy
                    </button>
                    
                    <button className={`${styles.outerFlashCardButtons}`} onClick={()=>handleShuffle()}>
                        <i className="fa-solid fa-repeat"></i>
                    </button>
                </div>
            );
        } else {
            // Original cramming mode buttons
            return (
                <div className={styles.buttonsContainer}>
                    <button className={styles.outerFlashCardButtons} disabled={processing} onClick={()=>handleGoBack()}>
                        <i className="fa-solid fa-arrow-rotate-right fa-flip-horizontal"></i>
                    </button>
                    <button className={`${styles.innerFlashCardButtons} hover:bg-red-600 transition-all duration-200`} disabled={processing} onClick={()=>handleDontKnow()}>
                        <i className="fa-solid fa-xmark" id="wrongButton"></i>
                    </button>
                    <div className={styles.scoreContainer}>
                        <h2 style={{margin: '0px'}}>{currentIndex < flashCards.length? `${currentIndex+1}/${flashCards.length}`: `${flashCards.length}/${flashCards.length}`}</h2>
                    </div>
                    <button className={`${styles.innerFlashCardButtons} hover:bg-emerald-600 transition-all duration-200`} disabled={processing} onClick={()=>handleKnow()} style={{padding: '10px 13px'}}>
                        <i className="fa-solid fa-check" id="checkButton"></i>
                    </button>
                    <button className={`${styles.outerFlashCardButtons}`} onClick={()=>handleShuffle()}>
                        <i className="fa-solid fa-repeat"></i>
                    </button>
                </div>
            );
        }
    };

    return(
        <>
            <div className={styles.buttonsOptionsContainer}>
                <EditFlashCardBtn fileName={fileName} />
                <SetToPublic />
                
                {/* Study Mode Toggle Button */}
                <button
                    onClick={onStudyModeChange}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                        studyMode === 'cramming' 
                            ? 'bg-violet-600 hover:bg-violet-700 text-white' 
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                >
                    {studyMode === 'cramming' ? (
                        <>
                            <i className="fa-solid fa-bolt"></i>
                            Quick Study
                        </>
                    ) : (
                        <>
                            <i className="fa-solid fa-brain"></i>
                            Smart Review
                        </>
                    )}
                </button>
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
            
            {renderStudyButtons()}
        </>
    )
}

export default FlashCardUI;