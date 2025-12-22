import {auth, functions} from '../../api/firebase.js'
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Confetti, TimerStartedToast, WelcomeStudyToast, TimerIncentiveToast, TimerCompleteToast } from '../../components/ConfettiAndToasts.jsx';

import { db } from '../../api/firebase.js';


import { httpsCallable } from 'firebase/functions';
import PartySection from './PartySection/PartySection.jsx';
import Boss from './Boss/Boss.jsx';
import Options from './Timer/Options.jsx';
import { useAuthContext } from '../../contexts/AuthContext.jsx';
import { useTutorials } from '../../contexts/TutorialContext.jsx';
import { usePartyContext } from '../../contexts/PartyContext.jsx';

import MiniLeaderboard from '../../components/MiniLeaderboard.jsx';
import { awardWithXP } from '../../utils/giveAwardUtils.js';
// import OverallMasteryV2 from './Overall Mastery/OverallMasteryV2.jsx';
import SingularMastery from './Overall Mastery/SingularMastery.jsx';

function Home({onCreateDeckClick, onCreateWithAIModalClick}) {

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showBoss, setShowBoss] = useState(false); 
  const {isTutorialAtStep, completeTutorial, advanceStep, tutorials, loading} = useTutorials();
  const {updateUserProfile} = usePartyContext();
  const {user, userProfile} = useAuthContext();
  const [hasSeenParty, setHasSeenParty] = useState(() => {
    return sessionStorage.getItem('partyClicked') === 'true';
  });

  const [showWelcomeToast, setShowWelcomeToast] = useState(false);
  const [showTimerIncentive, setShowTimerIncentive] = useState(false);
  const [showTimerComplete, setShowTimerComplete] = useState(false);
  const [showTimerStart, setShowTimerStart] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);


  const hasNotStartedATimerSession = isTutorialAtStep('start-timer', 1);
  const hasNotStartedAFlashcardSession = isTutorialAtStep('create-deck', 1);
  

  
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

  const handleTimerStart = async () => {


    if(isTutorialAtStep('start-timer', 1)){

      setShowTimerStart(true);
      await awardWithXP(user.uid, 100, updateUserProfile, userProfile);
      advanceStep('start-timer')
      
      setTimeout(() => {
        setShowTimerIncentive(true);
      }, 3000);
    }
  };

  const handleTimerComplete = async () => {
   
    
    // If tutorial exists and is not completed, complete it
    if (tutorials['start-timer'] && !tutorials['start-timer'].completed) {
      setShowTimerComplete(true);
      await awardWithXP(user.uid, 200, updateUserProfile, userProfile);

      completeTutorial('start-timer');
    }
};

//   useEffect(() => {
//     const neverTriedFlashcardBattle = isTutorialAtStep("create-deck", 1);
    
//     // If they haven't started OR haven't seen demo
//     if (neverTriedFlashcardBattle) {
//         navigate('/flashcards/DEMO_MATH_BOSS_001');
//     }
//     if (!isTutorialAtStep("create-deck", 1)){
//       completeTutorial('global-review')
//     }
// }, [userProfile, navigate]);


  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Wait for tutorials to load
    if (loading) return;
    
    // Check if both tutorials are at step 1 (brand new user)
    const isBrandNewUser = 
      isTutorialAtStep('create-deck', 1) && 
      isTutorialAtStep('start-timer', 1);
    
    if (isBrandNewUser) {
      // Optional: Add a small delay so it doesn't feel jarring
      const timer = setTimeout(() => {
        setShowWelcomeToast(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [loading, tutorials]);


  

  if (!user) {
    return null; // Optionally, you can render a loading spinner or message here
  }
  return(
    <>
     {/* {showWelcomeToast && (
        <WelcomeStudyToast 
          xpAmount={300}
          onComplete={() => setShowWelcomeToast(false)}
        />
      )} */}
      {showTimerStart && (
        <>
          <TimerStartedToast 
            xpAmount={100}
            onComplete={() => setShowTimerStart(false)}
          />
        </>
      )}

      {/* Show timer incentive when starting */}
      {showTimerIncentive && (
        <>
          <TimerIncentiveToast 
            xpAmount={200}
            onComplete={() => setShowTimerIncentive(false)}
          />
        </>
      )}

       {/* Show completion after timer ends */}
      {showTimerComplete && (
        <>
          <Confetti />
          <TimerCompleteToast 
            xpAmount={200}
            onComplete={() => setShowTimerComplete(false)}
          />
        </>
      )}

    <div className={`min-h-screen flex flex-col bg-slate-900 text-slate-100`}>
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-4">

            <PartySection />


            {isDesktop ? 
              <div className="hidden lg:grid lg:grid-cols-2 gap-6 mb-6 items-start">
              
                <div className="order-2 space-y-6 lg:order-1">

                  <Options 
                    db = {db}
                    authUser = {user}
                    onCreateDeckClick={onCreateDeckClick}
                    onCreateWithAIModalClick={onCreateWithAIModalClick}
                    handleTimerStart={handleTimerStart}
                    handleTimerComplete={handleTimerComplete}
                  />
                  <SingularMastery />


                </div>
                <div className='order-1 lg:order-2'>
                  <Boss />
                  <MiniLeaderboard />
                  
                </div>

              
              </div>
            
            : 
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
                  <div className="space-y-6">

                    <Boss />
                    <MiniLeaderboard />  
                  </div>
                  
                ) : (
                  <div className="space-y-6">
                    <Options 
                      db={db}
                      authUser={user}
                      onCreateDeckClick={onCreateDeckClick}
                      onCreateWithAIModalClick={onCreateWithAIModalClick}
                      handleTimerStart={handleTimerStart}
                      handleTimerComplete={handleTimerComplete}
                    />

                    <SingularMastery />
                  </div>
                )}
              </div>
            </div>
            }
            
            
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
    </>

  )

}

export default Home;