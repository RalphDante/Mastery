import React from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
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
import EditFlashCardPage from './components/EditFlashCardPage/EditFlashCardPage.jsx'


function App() {


  return (
      <Router>

              <ShowNavBar>
                <NavBar />
                {/* <SignOutBtn /> */}
              </ShowNavBar>
       
              <Routes>
                  <Route path="/" element={<SignIn />} />
                  <Route path="/signup" element={<SignUp />} />
                  <Route path="/authdetails" element={<AuthDetails />} />
                  <Route path="/home" element={<Home />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/createfolder" element={<CreateFolder />} />
                  <Route path="/createfile" element={<CreateFile />} />
                  <Route path="/displayfiles" element={<DisplayFiles />} />
                  <Route path="/flashcards" element={<DisplayFlashCardsPage />}/>
                  <Route path="/editflashcard" element={<EditFlashCardPage />}/>
              </Routes>

              


            
      </Router>
  );
}


export default App;
