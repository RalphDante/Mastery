import Footer from '../../Footer.jsx'
import CreateBtn from '../../components/CreateQuizlet/QuizletBtn/QuizletBtn.jsx'
import { onAuthStateChanged } from 'firebase/auth';
import {auth} from '../../api/firebase.js'
import { useState, useEffect } from 'react';
import UserName from '../../components/auth/UserName.jsx';
import styles from './navbar.module.css';
import { useNavigate } from 'react-router-dom';
import CreateWithAIModal from '../../components/Modals/CreateWithAIModal.jsx';


import LearningHubSection from './LearningHubSection/LearningHubSection.jsx';
import WelcomeSection from './WelcomeAndQuickStats/WelcomeSection.jsx';
import OverallMastery from './Overall Mastery/OverallMastery.jsx';
import OverallMasteryV2 from './Overall Mastery/OverallMasteryV2.jsx';
import { UserDataProvider } from '../../hooks/useUserData.jsx';

function Home({onCreateDeckClick, onCreateWithAIModalClick}) {

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [authUser, setAuthUser] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        setAuthUser(null);
        // navigate('/try-now');
      }
    });

    // Clean up the subscription on unmount
    return () => unsubscribe();
    
  }, []);

  if (!authUser) {
    return null; // Optionally, you can render a loading spinner or message here
  }
  return(
    <div className={`min-h-screen flex flex-col bg-slate-900 text-slate-100`}>
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-12">

          <UserDataProvider>
            <WelcomeSection />
            <OverallMasteryV2 />
            <LearningHubSection 
              onCreateDeckClick={onCreateDeckClick}
              onCreateWithAIModalClick={onCreateWithAIModalClick}
            />

          </UserDataProvider>


          

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
