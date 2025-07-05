import Footer from '../../Footer.jsx'
import CreateBtn from '../../components/CreateQuizlet/QuizletBtn/QuizletBtn.jsx'
import { onAuthStateChanged } from 'firebase/auth';
import {auth} from '../../api/firebase.js'
import { useState, useEffect } from 'react';
import DisplayFolders from './DisplayFolders.jsx';
import UserName from '../../components/auth/UserName.jsx';
import styles from './navbar.module.css';
import { useNavigate } from 'react-router-dom';
import FolderModalStep1 from '../TryNowPage/LandingPage/FolderModalStep1.jsx';

function Home() {

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [authUser, setAuthUser] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        setAuthUser(null);
        navigate('/try-now');
      }
    });

    // Clean up the subscription on unmount
    return () => unsubscribe();
    
  }, []);

  if (!authUser) {
    return null; // Optionally, you can render a loading spinner or message here
  }
  return(
    <div className={`${styles.homeContainer} w-auto mx-8 block`}>

    {/* flex flex-col justify-center max-w-fwidth */}
    {/* <h1 className='my-2 text-xl'>Your Folders:</h1> */}


    <div className="text-center">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 bg-purple-600 rounded-lg text-lg font-semibold hover:bg-purple-500 transition-colors"
        >
          Create with AI
        </button>
    </div>

    <FolderModalStep1 
      uid={authUser.uid} 
      onClose = {() => setIsModalOpen(false)}
      isOpen={isModalOpen}
    />


    <DisplayFolders uid={authUser.uid}/>


    
    

    {/* <AutoFlashCards /> */}


    
    

    {/* <CreateBtn /> */}


    {/* <h1>You are signed in as {authUser.email}</h1> */}
    {/* <UserName /> */}
    {/* <Footer></Footer> */}

    </div>
  )

}

export default Home;
