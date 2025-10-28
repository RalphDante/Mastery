import Footer from '../../Footer.jsx'
import CreateBtn from '../../components/CreateQuizlet/QuizletBtn/QuizletBtn.jsx'
import { onAuthStateChanged } from 'firebase/auth';
import {auth, functions} from '../../api/firebase.js'
import { useState, useEffect } from 'react';
import UserName from '../../components/auth/UserName.jsx';
import styles from './navbar.module.css';
import { useNavigate } from 'react-router-dom';
import CreateWithAIModal from '../../components/Modals/CreateWithAIModal.jsx';

import { db } from '../../api/firebase.js';


import LearningHubSection from './LearningHubSection/LearningHubSection.jsx';
import OverallMasteryV2 from './Overall Mastery/OverallMasteryV2.jsx';
import { httpsCallable } from 'firebase/functions';
import PartySection from './PartySection/PartySection.jsx';
import Boss from './Boss/Boss.jsx';
import Timer from './Timer/Timer.jsx';
import ServerCostBanner from './ServerCostBanner.jsx';
import Options from './Timer/Options.jsx';
import { useAuthContext } from '../../contexts/AuthContext.jsx';
import { useTutorials } from '../../contexts/TutorialContext.jsx';
import { usePartyContext } from '../../contexts/PartyContext.jsx';

function Home({onCreateDeckClick, onCreateWithAIModalClick}) {

  const [isModalOpen, setIsModalOpen] = useState(false);
  const {isTutorialAtStep, completeTutorial} = useTutorials();
  const {refreshPartyProfile} = usePartyContext();
  const {user, userProfile} = useAuthContext();

  
  const navigate = useNavigate();
  const manuallyProcessExpired = httpsCallable(functions, 'manuallyProcessExpired');

  const testExpiration = async () => {
    try {
      const result = await manuallyProcessExpired();
      console.log('Manual processing result:', result.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    const neverTriedFlashcardBattle = isTutorialAtStep("create-deck", 1);
    
    // If they haven't started OR haven't seen demo
    if (neverTriedFlashcardBattle) {
        navigate('/flashcards/DEMO_MATH_BOSS_001');
    }
    if (!isTutorialAtStep("create-deck", 1)){
      completeTutorial('global-review')
    }
}, [userProfile, navigate]);


  

  if (!user) {
    return null; // Optionally, you can render a loading spinner or message here
  }
  return(
    <div className={`min-h-screen flex flex-col bg-slate-900 text-slate-100`}>
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">

            <PartySection />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 items-start">
              <div className="order-2 lg:order-1">
                <Options 
                  db = {db}
                  authUser = {user}
                  onCreateDeckClick={onCreateDeckClick}
                  onCreateWithAIModalClick={onCreateWithAIModalClick}
                />
              </div>
              <div className='order-1 lg:order-2'>
                <Boss />
                
              </div>

              
            </div>

            {/* <OverallMasteryV2 /> */}
            {/* <WelcomeSection /> */}
            {/* <LearningHubSection 
              onCreateDeckClick={onCreateDeckClick}
              onCreateWithAIModalClick={onCreateWithAIModalClick}
            /> */}

        </div>


      </main>

    {/* flex flex-col justify-center max-w-fwidth */}
    {/* <h1 className='my-2 text-xl'>Your Folders:</h1> */}

{/* 
    <div className="text-center">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 bg-purple-600 rounded-lg text-lg font-semibold hover:bg-purple-500 transition-colors"
        >
          Create with AI
        </button>
    </div> */}

    {/* <CreateWithAIModal 
      uid={authUser.uid} 
      onClose = {() => setIsModalOpen(false)}
      isOpen={isModalOpen}
    /> */}




    
    

    {/* <AutoFlashCards /> */}


    
    

    {/* <CreateBtn /> */}


    {/* <h1>You are signed in as {authUser.email}</h1> */}
    {/* <UserName /> */}
    {/* <Footer></Footer> */}

    </div>
  )

}

export default Home;
