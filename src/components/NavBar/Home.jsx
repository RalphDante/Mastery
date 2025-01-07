import Footer from '../../Footer.jsx'
import CreateBtn from '../CreateQuizlet/QuizletBtn/QuizletBtn.jsx'
import { onAuthStateChanged } from 'firebase/auth';
import {auth} from '../../firebase'
import { useState, useEffect } from 'react';
import DisplayFolders from '../CreatePage/DisplayFolders.jsx';
import UserName from '../auth/UserName.jsx';
import styles from './navbar.module.css';
import { useNavigate } from 'react-router-dom';


function Home() {

  const [authUser, setAuthUser] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        setAuthUser(null);
        navigate('/mastery');
      }
    });

    // Clean up the subscription on unmount
    return () => unsubscribe();
    
  }, []);

  if (!authUser) {
    return null; // Optionally, you can render a loading spinner or message here
  }
  return(
    <div className={`${styles.homeContainer} w-auto mx-8`}>

    {/* flex flex-col justify-center max-w-fwidth */}
    <h1 className='my-2 text-xl'>Your Folders:</h1>


    <DisplayFolders uid={authUser.uid}/>


    
    

    {/* <CreateBtn /> */}


    {/* <h1>You are signed in as {authUser.email}</h1> */}
    {/* <UserName /> */}
    {/* <Footer></Footer> */}

    </div>
  )

}

export default Home;
