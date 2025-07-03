import React from 'react';
import { BrowserRouter as Router, Route, Routes} from 'react-router-dom';
import Footer from './Footer.jsx';



// Components

import NavBar from './components/NavBar/NavBar.jsx';
import SignIn from './components/auth/Signin.jsx';
import SignUp from './components/auth/Signup.jsx';
import AuthDetails from './components/auth/AuthDetails.jsx';
import Home from './components/NavBar/Home.jsx';
import About from './components/NavBar/About.jsx';
import ShowNavBar from './components/showNavBar/showNavBar.jsx'
import SignOutBtn from './components/SignOutBtn/SignOutBtn.jsx'
import CreateFolder from './components/CreatePage/CreateFolder.jsx'
import CreateFile from './components/CreatePage/CreateFile.jsx'
import DisplayFiles from './components/CreatePage/DisplayFiles.jsx';
import DisplayFlashCardsPage from './components/FlashCardsPage/FlashCardsPage.jsx';
import EditFlashCardPage from './components/EditFlashCardPage/EditFlashCardPage.jsx';
import ContactMe from './components/NavBar/ContactMe.jsx';
import Mastery from './components/NavBar/Mastery.jsx';
import PublicKeyCredentialFlashCardsPage from './components/MasteryPage/PublicFlashCardsPage.jsx';


import "tailwindcss/tailwind.css";
import MasteryLanding from './components/TryNowPage/LandingPage/TryNowPage.jsx';
import FlashCardsPage from './components/TryNowPage/FlashCardsDemo/FlashCardsPage.jsx';
import GoPremium from './components/GoPremium/GoPremium.jsx';


function App(){
  

  return (
      <Router>

              <ShowNavBar>
                <NavBar />
                {/* <SignOutBtn /> */}
              </ShowNavBar>
       
              <Routes>
                  {/* <Route path="/signin" element={<SignIn />} />
                  <Route path="/signup" element={<SignUp />} /> */}
                  <Route path="/authdetails" element={<AuthDetails />} />
                  <Route path="/" element={<Home />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/createfolder" element={<CreateFolder />} />
                  <Route path="/createfile" element={<CreateFile />} />
                  <Route path="/displayfiles" element={<DisplayFiles />} />
                  <Route path="/flashcards/:fileName" element={<DisplayFlashCardsPage />}/>
                  <Route path="/editflashcard" element={<EditFlashCardPage />}/>
                  <Route path="/contactme" element={<ContactMe />}/>
                  <Route path='/mastery' element={<Mastery />} />
                  <Route path='/publicFlashCards/:publicKeyCredential' element={<PublicKeyCredentialFlashCardsPage />} />

                  {/* Try to understand what the ":folderName" does again */}
                  {/* Last part we left off was at the integration of a new publicFlashCard Page */}

                  <Route path='/try-now' element={<MasteryLanding />} />

                  <Route path='/flashcards-demo' element={<FlashCardsPage />} />
                  <Route path='/go-premium' element={<GoPremium />} />



                  
              </Routes>

              


            
      </Router>
  );
}


export default App;
