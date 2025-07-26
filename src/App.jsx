//imports
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes} from 'react-router-dom';
import Footer from './Footer.jsx';


// Components
import NavBar from './components/NavBar/NavBar.jsx';
import SignIn from './components/auth/Signin.jsx';
import SignUp from './components/auth/Signup.jsx';
import AuthDetails from './components/auth/AuthDetails.jsx';
import ShowNavBar from './components/showNavBar/showNavBar.jsx'

// Modal Components
import CreateFolderModal from './components/Modals/CreateFolderModal.jsx';
import CreateDeckModal from './components/Modals/CreateDeckModal.jsx';

// Pages
// HomePage
import RootPage from './pages/RootPage/RootPage.jsx';


//AboutPage
import About from './pages/AboutPage/About.jsx';

//ContactMePage
import ContactMe from './pages/ContactMePage/ContactMe.jsx';

//MasteryPage
import Mastery from './pages/MasteryPage/Mastery.jsx';
import PublicKeyCredentialFlashCardsPage from './pages/MasteryPage/PublicFlashCardsPage.jsx';

//FlashCardsPage
import FlashCardsPage from './pages/FlashCardsPage/FlashCardsPage.jsx';

//CreateFilePage
import CreateDeck from './pages/CreateDeckPage/CreateDeck.jsx';
import DisplayFlashCardsPage from './pages/CreateDeckPage/DisplayFlashCards.jsx';

//TryNowPage
import TryNowPage from './pages/TryNowPage/LandingPage/TryNowPage.jsx';




import SignOutBtn from './components/SignOutBtn/SignOutBtn.jsx'
import CreateFolder from './pages/CreateFolderPage/CreateFolder.jsx'
import CreateFile from './pages/CreateDeckPage/CreateDeck.jsx'
import DisplayFiles from './pages/DisplayFilesPage/DisplayFiles.jsx';
import EditFlashCardPage from './pages/EditFlashCardPage/EditFlashCardPage.jsx';

import "tailwindcss/tailwind.css";


// auth
import { auth } from './api/firebase.js';
import { onAuthStateChanged } from 'firebase/auth';


// Try Now page
import FlashCardsDemoPage from './pages/TryNowPage/FlashCardsDemo/FlashCardsDemoPage.jsx';
import CreateWithAIModal from './components/Modals/CreateWithAIModal.jsx';

//TestingPages
import NewHomePage from './pages/HomePage/NewHomePage.jsx';

import GoPremium from './pages/GoPremium/GoPremium.jsx';
import NewFlashCardUI from './pages/FlashCardsPage/NewFlashCardUI.jsx';


// Blog Page
import BlogPost from './pages/BlogPage/BlogPost.jsx';
import BlogIndex from './pages/BlogPage/BlogIndex.jsx';
import CreateWithAIDemoModal from './pages/TryNowPage/LandingPage/CreateWithAIDemoModal.jsx';


function App(){
  // Global modal state
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isDeckModalOpen, setIsDeckModalOpen] = useState(false);
  const [isCreateWithAIModalOpen, setIsCreateWithAIModalOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null); // You'll need to set this from auth
  const [isCreateWithAIDemoModalOpen, setIsCreateWithAIDemoModalOpen] = useState();

  // Folder Modal handlers
  const handleShowCreateFolderModal = () => {
    setIsFolderModalOpen(true);
  };

  const handleFolderCreated = (folderId, folderName, folderData) => {
    console.log('Folder created:', { folderId, folderName, folderData });
    setIsFolderModalOpen(false);
    
    // Handle the new folder (refresh list, update state, etc.)
    // You might want to trigger a refresh of folders list here
    // or update some global state that tracks folders
  };

  const handleFolderModalClose = () => {
    setIsFolderModalOpen(false);
  };

  // Deck Modal handlers
  const handleShowCreateDeckModal = () => {
    setIsDeckModalOpen(true);
  };

  const handleDeckModalClose = () => {
    setIsDeckModalOpen(false);
  };

  const handleShowCreateWithAIModalClick = () => {
    if(!currentUserId){
      setIsCreateWithAIDemoModalOpen(true)
      return;
    }
    setIsCreateWithAIModalOpen(true);
  }

  const handleCreateWithAIModalClose = () => {
    setIsCreateWithAIModalOpen(false)
  }

  const handleCreateWithAIDemoModalClose = () => {
    setIsCreateWithAIDemoModalOpen(false)
  }


  useEffect(()=>{
    onAuthStateChanged(auth, (user) => {
        if (user) {
            setCurrentUserId(user.uid);
        } else {
            setCurrentUserId(null);
        }
    });
  }, []);

  return (
      <Router>
              <ShowNavBar>
                <NavBar 
                  onCreateFolderClick={handleShowCreateFolderModal}
                  onCreateDeckClick={handleShowCreateDeckModal}
                  onCreateWithAIModalClick={handleShowCreateWithAIModalClick}
                />
                {/* <SignOutBtn /> */}
              </ShowNavBar>
       
              <Routes>
                  {/* <Route path="/signin" element={<SignIn />} />
                  <Route path="/signup" element={<SignUp />} /> */}
                  {/* <Route path="/authdetails" element={<AuthDetails />} /> */}
                  <Route path="/" element={<RootPage onCreateDeckClick={handleShowCreateDeckModal} onCreateWithAIModalClick={handleShowCreateWithAIModalClick}/>} />
                  <Route path="/about" element={<About />} />
                  <Route path="/createfolder" element={<CreateFolder />} />
                  <Route path="/create-deck" element={<CreateDeck />} />
                  <Route path="/edit-deck/:deckId" element={<CreateDeck />}/>

                  <Route path="/displayfiles" element={<DisplayFiles />} />
                  <Route path="/flashcards/:deckId?" element={<FlashCardsPage />}/>
                  <Route path="/contactme" element={<ContactMe />}/>
                  <Route path='/mastery' element={<Mastery />} />
                  <Route path='/publicFlashCards/:publicKeyCredential' element={<PublicKeyCredentialFlashCardsPage />} />

                  {/* Try to understand what the ":folderName" does again */}
                  {/* Last part we left off was at the integration of a new publicFlashCard Page */}

                  {/* <Route path='/try-now' element={<TryNowPage />} /> */}

                  <Route path='/flashcards-demo' element={<FlashCardsDemoPage />} />


                  {/* Blogs */}
                  <Route path="/blog" element={<BlogIndex />} />
                  <Route path="/blog/:slug" element={<BlogPost />} />

                  {/* Test Phases */}
                  {/* <Route path='/go-premium' element={<GoPremium />} />
                  <Route path='/newhome' element={<NewHomePage />} />
                  <Route path='/newflashcardui' element={<NewFlashCardUI />} /> */}



              </Routes>

              {/* Footer */}
              <footer className="bg-gray-900 mt-12 border-t border-gray-700">
                  <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-slate-400">
                      <p>&copy; 2025 Mastery. All rights reserved.</p>
                  </div>
              </footer>



              {/* Global Modals - These will render at the root level and center properly */}
              <CreateFolderModal 
                  isOpen={isFolderModalOpen}
                  onClose={handleFolderModalClose}
                  onFolderCreated={handleFolderCreated}
              />

              <CreateDeckModal 
                  uid={currentUserId}
                  isOpen={isDeckModalOpen}
                  onClose={handleDeckModalClose}
              />

              <CreateWithAIModal 
                  onClose={handleCreateWithAIModalClose}
                  isOpen={isCreateWithAIModalOpen}
              />

              <CreateWithAIDemoModal 
                  onClose={handleCreateWithAIDemoModalClose}
                  isOpen={isCreateWithAIDemoModalOpen}
              />
      </Router>
  );
}

export default App;