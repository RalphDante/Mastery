import { getDatabase, ref, onValue } from "firebase/database";
import { useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState, useCallback } from "react"; 
import { useParams } from "react-router-dom";


import FlashCardUI from "./FlashCardUI";
import ModuleDescription from "./Description";
import styles from './FlashCardsPage.module.css'




function FlashCardsDemoPage() {

    const [redoDeck, setRedoDeck] = useState(false);
    const location = useLocation();
    const { fileName } = useParams();



    const [authUser, setAuthUser] = useState(null);

    
    const [knowAnswer, setKnowAnswer] = useState(0);
    const [dontKnowAnswer, setDontKnowAnswer] = useState(0);
    const [percent, setPercent] = useState(0);

 
  
  

 
    

    return (
        <>  
            <div className={`${styles.flashCardsPageContainer}`}>
                <div className={`${styles.leftSideFlashCardsPageContainer}`}>
                    {/* <h1>Display Flash Cards</h1> */}
                    {/* {fileName ?  <h1 className="text-3xl font-bold text-white mb-2 break-words">{fileName}</h1> : <h1 className="text-3xl font-bold text-white mb-2">No File Name</h1>} */}

                    


                    {/* {authUser ? <h1>Welcome {authUser.email}</h1> : <h1>No user</h1>} */}
                    <FlashCardUI 
              
                        knowAnswer = {setKnowAnswer}
                        dontKnowAnswer={setDontKnowAnswer}
                        percent = {setPercent}
                        redoDeck = {redoDeck}
                        setRedoDeck={setRedoDeck}
                
                    />

                </div>
                <div className={styles.rightSideFlashCardsPageContainer}>
                    {/* <h1>Right side</h1> */}
                    {/* <h1>Correct: {knowAnswer}</h1>
                    <h1>Wrong: {dontKnowAnswer}</h1>
                    <h1>Percentage: {percent}%</h1> */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 h-fit mt-4">
                    <h3 className="text-xl font-bold mb-6 text-white">📊 Study Progress</h3>
                    
                    <div className="space-y-4">
                        <div className="flex justify-between items-center py-3 border-b border-gray-800">
                        <span className="text-gray-400">Correct:</span>
                        <span className="font-bold text-lg text-emerald-400">{knowAnswer}</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-gray-800">
                        <span className="text-gray-400">Wrong:</span>
                        <span className="font-bold text-lg text-red-400">{dontKnowAnswer}</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-gray-800">
                        <span className="text-gray-400">Percentage:</span>
                        <span className="font-bold text-lg text-violet-400">{percent}%</span>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mt-4">
                        <div 
                        className="h-full bg-violet-500 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                        ></div>
                    </div>

                    {/* Quick Actions */}
                    <div className="mt-8">
                        <h4 className="text-gray-300 mb-4 font-medium">⚡ Quick Actions</h4>
                        <div className="space-y-3">
                        <button 
                            onClick={()=>{setRedoDeck(true)}}
                            className="w-full bg-violet-600 hover:bg-violet-700 px-4 py-3 rounded-lg font-medium transition-colors duration-200"
                        >
                            🔄 Redo Deck
                        </button>
                        {/* <button 
                            onClick={(studyMode)=>{}}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 px-4 py-3 rounded-lg font-medium transition-colors duration-200"
                        >
                            📚 Study Mode
                        </button> */}
                        </div>
                    </div>
                    </div>
                </div>
            </div>
            
            
        </>
    );
}

export default FlashCardsDemoPage;