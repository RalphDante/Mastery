import Footer from '../../Footer.jsx'
import CreateBtn from '../CreateQuizlet/QuizletBtn/QuizletBtn.jsx'
import { onAuthStateChanged } from 'firebase/auth';
import {auth} from '../../firebase'
import { useState, useEffect } from 'react';
import DisplayFolders from '../CreatePage/DisplayFolders.jsx';
import UserName from '../auth/UserName.jsx';
import styles from './navbar.module.css';

function Home() {

  const [authUser, setAuthUser] = useState("");


  useEffect(()=>{
    onAuthStateChanged(auth, (user) =>{
      if(user){
        setAuthUser(user)
      }else{
        setAuthUser(null)
      }
    })
  },[])

  return(
    <div className={styles.homeContainer}>


    <h1>Your Folders:</h1>

    <DisplayFolders uid={authUser.uid}/>

    {/* <CreateBtn /> */}


    {/* <h1>You are signed in as {authUser.email}</h1> */}
    {/* <UserName /> */}
    <Footer></Footer>

    </div>
  )

}

export default Home;
