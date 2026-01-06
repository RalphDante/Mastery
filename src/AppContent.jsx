//imports
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes} from 'react-router-dom';
import Footer from './Footer.jsx';

// Components
import NavBar from './components/NavBar/NavBar.jsx';
import SignIn from './components/auth/Signin.jsx';
import SignUp from './components/auth/Signup.jsx';
import ShowNavBar from './components/showNavBar/showNavBar.jsx'

// Modal Components
import CreateFolderModal from './components/Modals/CreateFolderModal.jsx';
import CreateDeckModal from './components/Modals/CreateDeckModal.jsx';
import InAppBrowserModal from './components/Modals/InAppBrowserModal.jsx';

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

//Contexts
import { TutorialProvider } from './contexts/TutorialContext';
import { useAuthContext } from './contexts/AuthContext';


import SignOutBtn from './components/SignOutBtn/SignOutBtn.jsx'
import CreateFolder from './pages/CreateFolderPage/CreateFolder.jsx'
import DisplayFiles from './pages/DisplayFilesPage/DisplayFiles.jsx';

import "tailwindcss/tailwind.css";




// Try Now page
import FlashCardsDemoPage from './pages/TryNowPage/FlashCardsDemo/FlashCardsDemoPage.jsx';
import CreateWithAIModal from './components/Modals/CreateWithAIModal.jsx';

//TestingPages
import NewHomePage from './pages/HomePage/NewHomePage.jsx';

import GoPremium from './pages/GoPremium/GoPremium.jsx';


// Blog Page
import BlogPost from './pages/BlogPage/BlogPost.jsx';
import BlogIndex from './pages/BlogPage/BlogIndex.jsx';
import CreateWithAIDemoModal from './pages/TryNowPage/LandingPage/CreateWithAIDemoModal.jsx';


// Terms of Service
import TermsOfService from './pages/TermsOfService/TermsOfService.jsx';
import CreateDeckTutorial from './components/tutorials/CustomTutorials/CreateDeckTutorial.jsx';

// Settings
import Settings from './components/NavBar/ProfileQuickActionsDropDown/Settings.jsx';
import ProBanner from './pages/HomePage/WelcomeAndQuickStats/ProBanner.jsx';
import KofiWidget from './components/KofiWidget.jsx';
import JoinPage from './pages/JoinPage/JoinPage.jsx';
import LeaderboardPage from './pages/Leaderboard/LeaderboardPage.jsx';
import WelcomeProPage from './pages/GoPremium/WelcomeProPage.jsx';



function AppContent(){
  const { user } = useAuthContext();
  const currentUserId = user?.uid || null;
  const authUser = user;

  // Global modal state
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isDeckModalOpen, setIsDeckModalOpen] = useState(false);
  const [isCreateWithAIModalOpen, setIsCreateWithAIModalOpen] = useState(false);
  const [isCreateWithAIDemoModalOpen, setIsCreateWithAIDemoModalOpen] = useState();
  const [isAutoAssignedFolder, setIsAutoAssignedFolder] = useState(false);

  

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
  const handleShowCreateDeckModal = (folderName = null) => {
    if(!currentUserId){
      if(folderName){
        setIsAutoAssignedFolder(folderName) // Pass the folder name
      }
      setIsDeckModalOpen(true);
      return;
    }
    setIsAutoAssignedFolder(folderName); // Set the folder name for logged-in users too
    setIsDeckModalOpen(true);
  };

  const handleDeckModalClose = () => {
    setIsDeckModalOpen(false);
  };

  const handleShowCreateWithAIModalClick = (folderName = null) => {
    if(!currentUserId){
      if(folderName){
        setIsAutoAssignedFolder(folderName) // Pass the folder name
      }
      setIsCreateWithAIDemoModalOpen(true)
      return;
    }
    setIsAutoAssignedFolder(folderName); // Set the folder name for logged-in users too
    setIsCreateWithAIModalOpen(true);
  }

  const handleCreateWithAIModalClose = () => {
    setIsCreateWithAIModalOpen(false)
  }

  const handleCreateWithAIDemoModalClose = () => {
    setIsCreateWithAIDemoModalOpen(false)
  }

  const FeedbackWidget = () => {
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpanded = () => {
      setIsExpanded(!isExpanded);
    };

    return (
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
        <div className="flex items-center">
          {/* Expandable text panel */}
          <div className={`bg-gray-800/90 backdrop-blur-sm text-white rounded-xl border border-gray-700/50 shadow-lg mr-2 transition-all duration-300 overflow-hidden ${
            isExpanded ? 'opacity-100 max-w-[280px] sm:max-w-xs' : 'opacity-0 max-w-0'
          }`}>
            <div className="px-3 py-2 sm:px-4 sm:py-3">
              <p className="text-xs sm:text-sm font-medium mb-1 sm:mb-2 whitespace-nowrap">Found a bug?</p>
              <a 
                href="https://discord.gg/e6DDzV4QYN"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs sm:text-sm text-purple-400 hover:text-purple-300 transition-colors whitespace-nowrap"
              >
                Report it on Discord →
              </a>
            </div>
          </div>
          
          {/* Bug icon button */}
          <button
            onClick={toggleExpanded}
            className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-800/80 hover:bg-purple-600/90 backdrop-blur-sm text-white rounded-full border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg flex items-center justify-center touch-manipulation"
            aria-label="Bug report"
          >
            <img
              src="https://cdn.simpleicons.org/discord/5865F2"
              alt="Discord Logo"
              className="w-5 h-5 sm:w-6 sm:h-6"
            />
          </button>
        </div>
      </div>
    );
  };

  return (
    <TutorialProvider authUser={authUser}>
      <Router>
        <div className="min-h-screen flex flex-col">
          {/* Main content */}
          <div className="flex-1 flex flex-col">
              {/* <CreateDeckTutorial 
                isDeckModalOpen={isDeckModalOpen}
                isFolderModalOpen={isFolderModalOpen}
                isCreateWithAIModalOpen={isCreateWithAIModalOpen}
                onCreateDeckClick={handleShowCreateDeckModal}
                onCreateWithAIModalClick={handleShowCreateWithAIModalClick}
              /> */}

              {/* DISCOUNT BANNERS */}
              <ProBanner />

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
                  <Route path="/" element={<RootPage onCreateDeckClick={handleShowCreateDeckModal} onCreateWithAIModalClick={handleShowCreateWithAIModalClick}/>} />
                  <Route path="/about" element={<About />} />
                  <Route path="/createfolder" element={<CreateFolder />} />
                  <Route path="/create-deck" element={<CreateDeck />} />
                  <Route path="/edit-deck/:deckId" element={<CreateDeck />}/>

                  <Route path="/displayfiles" element={<DisplayFiles />} />
                  <Route path="/flashcards/:deckId?" element={<FlashCardsPage onCreateWithAIModalClick={handleShowCreateWithAIModalClick}/>} />
                  <Route path="/join/:partyId?" element={<JoinPage />}/>
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

                  {/* Terms of Service */}
                  <Route path="/terms-of-service" element={<TermsOfService />} />

                  
                  <Route path='/pricing' element={<GoPremium />} />

                  {/* Profile dropdown options */}
                  <Route path='/settings' element={<Settings />} />

                  <Route path='leaderboard' element={<LeaderboardPage />} />

                  <Route path='/welcome-pro' element={<WelcomeProPage />} />


                  
                  {/* Test Phases */}


              </Routes>
            </div>


              {/* Footer */}
              <footer className="bg-gray-900 mt-12 border-t border-gray-700 shrink-0">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-slate-400">
                  <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-6">
                    <p>&copy; 2025 Mastery. All rights reserved.</p>
                    <a 
                      href="/terms-of-service" 
                      className="text-slate-400 hover:text-white transition-colors underline"
                    >
                      Terms of Service
                    </a>
                  </div>
                </div>
              </footer>

              {/* <KofiWidget /> */}
              

              <FeedbackWidget />

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
                  isAutoAssignedFolder={isAutoAssignedFolder}
              />

              <CreateWithAIModal 
                  onClose={handleCreateWithAIModalClose}
                  isOpen={isCreateWithAIModalOpen}
                  isAutoAssignedFolder={isAutoAssignedFolder}
              />

              <CreateWithAIDemoModal 
                  onClose={handleCreateWithAIDemoModalClose}
                  isOpen={isCreateWithAIDemoModalOpen}
              />

              <InAppBrowserModal />
        </div>
      </Router>
    </ TutorialProvider>
  );
}

export default AppContent;