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

import { Users, HandHeart } from "lucide-react";

function Home({onCreateDeckClick, onCreateWithAIModalClick}) {

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showBoss, setShowBoss] = useState(false); 
  const {isTutorialAtStep, completeTutorial} = useTutorials();
  const {refreshPartyProfile} = usePartyContext();
  const {user, userProfile} = useAuthContext();
  const [hasSeenParty, setHasSeenParty] = useState(() => {
    return sessionStorage.getItem('partyClicked') === 'true';
  });
  
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
        <div className="space-y-4">

            <PartySection />

            {/* MOBILE VIEW */}
            <div className="lg:hidden">

            {/* Toggle Button */}
            <div className="flex justify-center mb-2">
              <div className="inline-flex rounded-lg bg-slate-800/50 p-0.5 border border-slate-700 relative text-sm">
                <button
                  onClick={() => setShowBoss(false)}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                    !showBoss 
                      ? 'bg-purple-600 text-white shadow-lg' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Contribute
                </button>

                <div className="relative">
                  <button
                    onClick={() => {
                      setShowBoss(true);
                      sessionStorage.setItem('partyClicked', 'true');
                      setHasSeenParty(true);
                    }}
                    className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                      showBoss 
                        ? 'bg-purple-600 text-white shadow-lg' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Party
                  </button>

                  {!hasSeenParty && (
                    <span className="absolute top-0.5 right-1.5 block w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  )}
                </div>
              </div>
            </div>


            {/* Content Area For Mobile Devices */}
            <div className="grid grid-cols-1 gap-6 mb-6">
              {showBoss ? (
                <Boss />
              ) : (
                <Options 
                  db={db}
                  authUser={user}
                  onCreateDeckClick={onCreateDeckClick}
                  onCreateWithAIModalClick={onCreateWithAIModalClick}
                />
              )}
            </div>
            </div>

            {/* DESKTOP */}
            <div className="hidden lg:grid lg:grid-cols-2 gap-6 mb-6 items-start">
              
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