import React from 'react';
import { BrowserRouter as Router, Route, Routes} from 'react-router-dom';
import Footer from './Footer.jsx';



// Components

import NavBar from './components/NavBar/NavBar.jsx';
import SignIn from './components/auth/Signin.jsx';
import SignUp from './components/auth/Signup.jsx';
import AuthDetails from './components/auth/AuthDetails.jsx';
import ShowNavBar from './components/showNavBar/showNavBar.jsx'


//pages

//HomePage
import Home from './pages/HomePage/Home.jsx';

//AboutPage
import About from './pages/AboutPage/About.jsx';

//ContactMePage
import ContactMe from './pages/ContactMePage/ContactMe.jsx';

//MasteryPage
import Mastery from './pages/MasteryPage/Mastery.jsx';
import PublicKeyCredentialFlashCardsPage from './pages/MasteryPage/PublicFlashCardsPage.jsx';


//FlashCardsPage
import FlashCardsPage from './pages/FlashcardsPage/FlashCardsPage.jsx';

//CreateFilePage
import DisplayFlashCardsPage from './pages/CreateFilePage/DisplayFlashCards.jsx';

//TryNowPage
import MasteryLanding from './pages/TryNowPage/LandingPage/TryNowPage.jsx';





import SignOutBtn from './components/SignOutBtn/SignOutBtn.jsx'
import CreateFolder from './pages/CreateFolderPage/CreateFolder.jsx'
import CreateFile from './pages/CreateFilePage/CreateFile.jsx'
import DisplayFiles from './pages/DisplayFilesPage/DisplayFiles.jsx';
import EditFlashCardPage from './pages/EditFlashCardPage/EditFlashCardPage.jsx';


import "tailwindcss/tailwind.css";
import GoPremium from './pages/GoPremium/GoPremium.jsx';


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
