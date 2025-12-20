import { useState, useEffect } from "react";
import { getFirestore, collection, doc, addDoc, updateDoc, writeBatch, increment, runTransaction } from 'firebase/firestore';
import { app } from "../../api/firebase"
import FileUpload, { generateFlashcardsFromText } from "../AutoFlashCards/FileUpload";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { usePartyContext } from "../../contexts/PartyContext";
import { useAuthContext } from "../../contexts/AuthContext";
import { useTutorials } from "../../contexts/TutorialContext";
import { useDeckCache } from "../../contexts/DeckCacheContext";
import LimitReachedModal from "./LimitReachedModal";
import { awardWithXP } from "../../utils/giveAwardUtils";
import { useUserDataContext } from "../../contexts/UserDataContext";

function CreateWithAIModal({ onClose, isOpen, isAutoAssignedFolder }) {

  const {updateUserProfile} = usePartyContext();
  const {incrementExp} = useUserDataContext();
  const [status, setStatus] = useState('');
  
  const { getFolderLimits, getDeckLimits, getCardLimits, isPremium, user, userProfile } = useAuthContext();
  const {folders} = useDeckCache();
  const userIsPremium = isPremium();
  const {advanceStep, completeTutorial, isTutorialAtStep, tutorials, isInTutorial } = useTutorials();
  const hasNotCreatedADeck = isTutorialAtStep('create-deck', 1)
  const [tutorialCancelled, setTutorialCancelled] = useState(false);
  
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingNewFolder, setIsCreatingNewFolder] = useState(false);
  const [flashcards, setFlashcards] = useState([]);
  const [deckName, setDeckName] = useState('');
  const [selectedFolder, setSelectedFolder] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [cameraIsOpen, setCameraIsOpen] = useState(false);

  // NEW: Store original text and regenerate state
  const [originalText, setOriginalText] = useState(null);
  const [generationType, setGenerationType] = useState(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateCount, setRegenerateCount] = useState(0);

  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitType, setLimitType] = useState('cards');

  // NEW: Error handling state
  const [uploadError, setUploadError] = useState(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [showSkipOption, setShowSkipOption] = useState(false);

  const db = getFirestore(app);

  useEffect(() => {
    if (isOpen) {
      if(isAutoAssignedFolder){
        setNewFolderName(isAutoAssignedFolder);
        setIsCreatingNewFolder(true);
        setStep(2);
        setSelectedFolder('');
        setFlashcards([]);
        setDeckName('');
        setOriginalText(null);
        setRegenerateCount(0);
        setLoading(false);
        setUploadError(null);
        setAttemptCount(0);
        setShowSkipOption(false);
        if(isTutorialAtStep('create-ai', 1) || !tutorials['create-ai']){
          advanceStep('create-ai');
        }
      } else {
        setNewFolderName('');
        setSelectedFolder('');
        setIsCreatingNewFolder(false);
        setStep(1);
        setFlashcards([]);
        setDeckName('');
        setOriginalText(null);
        setRegenerateCount(0);
        setLoading(false);
        setUploadError(null);
        setAttemptCount(0);
        setShowSkipOption(false);
      }
    } else {
      setNewFolderName('');
      setSelectedFolder('');
      setIsCreatingNewFolder(false);
      setStep(1);
      setFlashcards([]);
      setDeckName('');
      setOriginalText(null);
      setRegenerateCount(0);
      setLoading(false);
      setUploadError(null);
      setAttemptCount(0);
      setShowSkipOption(false);
    }
  }, [isOpen, isAutoAssignedFolder]);

  if (!isOpen) return null;

  // NEW: Helper to get user-friendly error messages
  const getErrorGuidance = (error) => {
    const errorCode = error?.code || '';
    const errorMessage = error?.message || '';

    // File processing errors
    if (errorMessage.includes('File too large') || errorMessage.includes('8MB')) {
      return {
        title: 'File Too Large',
        message: 'Your file is over 8MB. Try splitting it into smaller parts or using images of individual pages instead.',
        icon: '📄',
        canRetry: true
      };
    }

    if (errorMessage.includes('OCR') || errorMessage.includes('image quality')) {
      return {
        title: 'Image Quality Issue',
        message: 'We couldn\'t read the text clearly. Try taking a photo with better lighting and make sure the text is in focus.',
        icon: '📷',
        canRetry: true
      };
    }

    if (errorMessage.includes('No text') || errorMessage.includes('No readable text')) {
      return {
        title: 'No Text Found',
        message: 'We couldn\'t find any text to process. Make sure your file contains readable text.',
        icon: '📝',
        canRetry: true
      };
    }

    // AI generation errors
    if (errorCode === 'LIMIT_REACHED') {
      return {
        title: 'Generation Limit Reached',
        message: 'You\'ve used all your AI generations for today. Upgrade to premium for unlimited generations!',
        icon: '⚡',
        canRetry: false
      };
    }

    if (errorMessage.includes('API') || errorMessage.includes('network')) {
      return {
        title: 'Connection Issue',
        message: 'We\'re having trouble connecting to our servers. Check your internet and try again.',
        icon: '🌐',
        canRetry: true
      };
    }

    // Generic fallback
    return {
      title: 'Something Went Wrong',
      message: 'We encountered an unexpected error. Please try again or try a different file.',
      icon: '⚠️',
      canRetry: true
    };
  };

  // NEW: Handle upload errors with tracking
  const handleUploadError = (error) => {
    const newAttemptCount = attemptCount + 1;
    setAttemptCount(newAttemptCount);
    setUploadError(error);
    setLoading(false);

    // Show skip option after 2 failed attempts
    if (newAttemptCount >= 2 && hasNotCreatedADeck) {
      setShowSkipOption(true);
    }
  };

  // NEW: Skip to dashboard (for tutorial users)
  const handleSkipTutorial = () => {
   
    navigate('/');
    onClose();
  };

  // NEW: Clear error and retry
  const handleRetry = () => {
    setUploadError(null);
    setLoading(false);
    // Stay on step 2 to allow retry
  };

  

  const handleFolderSelection = () => {
    setLoading(true);
    
    if (isCreatingNewFolder && !newFolderName.trim()) {
      alert('Please enter a folder name');
      setLoading(false);
      return;
    }
    if (!isCreatingNewFolder && !selectedFolder) {
      alert('Please select a folder');
      setLoading(false);
      return;
    }

    if(isCreatingNewFolder){
      const {canGenerate} = getFolderLimits()
      if(!canGenerate){
          setLimitType('folders');
          setShowLimitModal(true);
          setLoading(false);
          return;
      }
    }

    const {canGenerate} = getDeckLimits()
    if(!canGenerate){
        setLimitType('decks');
        setShowLimitModal(true);
        setLoading(false);
        return;
    }
    
    setStep(2);
    setLoading(false);
  };

  const handleRegenerate = async () => {
      if (!originalText) {
          alert('No original content to regenerate from');
          return;
      }

      if (!userIsPremium && regenerateCount >= 3) {
          setLimitType('regenerate');
          setShowLimitModal(true);
          return;
      }

      setIsRegenerating(true);
      setLoading(true);
      setStatus('Regenerating flashcards...');

      try {
          const isTopicGeneration = generationType === 'topic';
          const result = await generateFlashcardsFromText(originalText, user, isTopicGeneration);
          
          setFlashcards(result.flashcards);
          setDeckName(result.deckName);
          setRegenerateCount(prev => prev + 1);
          
          setStatus('New flashcards generated!');
          setTimeout(() => setStatus(''), 2000);
          
      } catch (error) {
          console.error('Regeneration failed:', error);
          
          if (error.code === 'LIMIT_REACHED') {
              setLimitType('ai');
              setShowLimitModal(true);
          } else {
              alert('Failed to regenerate flashcards. Please try again.');
          }
      } finally {
          setIsRegenerating(false);
          setLoading(false);
          setTimeout(() => setStatus(''), 2000);
      }
  };

  const handleSaveDeck = async () => {
    if (isSaving) return;
  
    if (!deckName.trim()) {
      alert("Please enter a deck name");
      return;
    }
  
    if (!user) {
      alert("User not authenticated. Please log in.");
      return;
    }

    const cardLimits = getCardLimits();
    const cardsToAdd = flashcards.length;
    const currentCards = cardLimits.currentUsage || 0;

    if (cardLimits.maxCards !== -1 && currentCards + cardsToAdd > cardLimits.maxCards) {
      setLimitType('cards');
      setShowLimitModal(true);
      return;
    }

    if(isTutorialAtStep('create-ai', 3)){
      advanceStep('create-ai')
    }

    const isFirstDeck = hasNotCreatedADeck;
  
    setIsSaving(true);
  
    try {
      const ownerIdRef = `${user.uid}`;
      let currentFolderId = selectedFolder;
  
      if (isCreatingNewFolder) {
        const newFolderRef = await addDoc(collection(db, 'folders'), {
          name: newFolderName,
          ownerId: ownerIdRef,
          createdAt: new Date(),
          updatedAt: new Date(),
          deckCount: 0,
        });
        currentFolderId = newFolderRef.id;
      }
  
      const newDeckRef = await addDoc(collection(db, 'decks'), {
        title: deckName,
        description: "No description",
        ownerId: ownerIdRef,
        folderId: `${currentFolderId}`,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: []
      });
  
      const cardsCollectionRef = collection(db, 'decks', newDeckRef.id, 'cards');
      const batch = writeBatch(db);
  
      flashcards.forEach((card, index) => {
        const newCardRef = doc(cardsCollectionRef);
        batch.set(newCardRef, {
          question: card.question,
          answer: card.answer,
          order: index,
          createdAt: new Date(),
          answer_type: "text",
          question_type: "text"
        });
      });
  
      await batch.commit();
  
      if (isCreatingNewFolder || selectedFolder) {
        const folderDocRef = doc(db, 'folders', currentFolderId);
        await updateDoc(folderDocRef, {
          updatedAt: new Date(),
        });
      }

      
      if (isFirstDeck) {
        await awardWithXP(user.uid, 100, updateUserProfile, userProfile, incrementExp);
      }
  
      navigate(`/flashcards/${newDeckRef.id}`, {
        state: {
          deckId: newDeckRef.id,
          folderId: currentFolderId,
          folderName: newFolderName || folders.find(f => f.id === selectedFolder)?.name,
          showFirstDeckCelebration: isFirstDeck,
        }
      });

      if(isFirstDeck){
        advanceStep('create-deck')
      }
  
      onClose();
    } catch (error) {
      console.error("Error saving deck and flashcards: ", error);
      alert("Failed to save deck and flashcards. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <>
      {showLimitModal && (
          <LimitReachedModal 
            limitType={limitType}
            onClose={() => setShowLimitModal(false)}
          />
      )}
      <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-700 max-w-md w-full relative">
          <button 
            onClick={()=>{
              setTutorialCancelled(true)
              onClose()
            }} 
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors"
            disabled={loading}
          >
            <i className="fa-solid fa-xmark text-2xl"></i>
          </button>

          {/* Step 1: Choose Folder */}
          {step === 1 && (!isAutoAssignedFolder) && (
            <>
              <h2 className="text-2xl font-bold text-slate-100 mb-6 text-center">Choose/Create a Folder</h2>
              <p className="text-slate-300 mb-6 text-center">Folders help you organize your decks for the best experience</p>

              <div className="space-y-4">
                <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="folderChoice"
                      checked={!isCreatingNewFolder}
                      onChange={() => setIsCreatingNewFolder(false)}
                      className="text-violet-500 focus:ring-violet-500"
                      disabled={loading}
                    />
                    <span className="text-slate-100 font-semibold">Use existing folder</span>
                  </label>

                  {!isCreatingNewFolder && (
                    <select
                      value={selectedFolder}
                      onChange={(e) => setSelectedFolder(e.target.value)}
                      className="w-full mt-3 p-3 bg-gray-600 text-slate-100 rounded-lg border border-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                      disabled={loading}
                    >
                      <option value="">Select a folder...</option>
                      {folders.map((folderItem) => (
                        <option key={folderItem.id} value={folderItem.id}>
                          {folderItem.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="folderChoice"
                      checked={isCreatingNewFolder}
                      onChange={() => setIsCreatingNewFolder(true)}
                      className="text-violet-500 focus:ring-violet-500"
                      disabled={loading}
                    />
                    <span className="text-slate-100 font-semibold">Create new folder</span>
                  </label>

                  {isCreatingNewFolder && (
                    <input
                      type="text"
                      placeholder="Enter folder name..."
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      className="w-full mt-3 p-3 bg-gray-600 text-slate-100 rounded-lg border border-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                      disabled={loading}
                    />
                  )}
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button 
                  onClick={()=>{
                    setTutorialCancelled(true)
                    onClose()
                  }} 
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-slate-100 rounded-lg transition-all duration-200 font-semibold disabled:opacity-50"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleFolderSelection} 
                  className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-all duration-300 transform hover:scale-105 font-semibold disabled:opacity-50 disabled:transform-none"
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Next'}
                </button>
              </div>
            </>
          )}

          {/* Step 2: Upload File with Error Handling */}
          {step === 2 && (
            <>
              <p className="text-slate-300 mb-6 text-center">
                Saving to: <span className="text-violet-400 font-semibold">
                  {isCreatingNewFolder ? newFolderName : folders.find(f => f.id === selectedFolder)?.name || 'Loading folder name...'}
                </span>
              </p>

              {/* NEW: Error Display */}
              {uploadError && (
                <div className="mb-6 bg-red-900 bg-opacity-30 border border-red-500 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-red-300 font-semibold mb-1">
                        {getErrorGuidance(uploadError).icon} {getErrorGuidance(uploadError).title}
                      </h4>
                      <p className="text-red-200 text-sm mb-3">
                        {getErrorGuidance(uploadError).message}
                      </p>
                      
                      {getErrorGuidance(uploadError).canRetry && (
                        <>
                          {showSkipOption && hasNotCreatedADeck ? (
                            <button
                              onClick={handleSkipTutorial}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors inline-flex items-center gap-2"
                            >
                              Skip to Dashboard
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={handleRetry}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors"
                            >
                              Try Again
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* File Upload Component */}
              <FileUpload
                cameraIsOpen={setCameraIsOpen}
                onSuccess={(data) => {
                  setFlashcards(data.flashcards);
                  setDeckName(data.deckName);
                  setOriginalText(data.originalText);
                  setGenerationType(data.generationType);
                  setUploadError(null); // Clear any previous errors
                  setStep(4);
                  if(isTutorialAtStep('create-ai', 2)){
                    advanceStep('create-ai')
                  }
                }}
                onError={handleUploadError} // NEW: Pass error handler
              />

              {/* NEW: Show skip option after 2 failed attempts during tutorial */}
              {/* {showSkipOption && hasNotCreatedADeck && (
                <div className="mt-6 bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg p-4">
                  <div className="text-center">
                    <p className="text-blue-200 text-sm mb-3">
                      Having trouble? You can skip this step and explore the dashboard first.
                    </p>
                    <button
                      onClick={handleSkipTutorial}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors inline-flex items-center gap-2"
                    >
                      Skip to Dashboard
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )} */}

              {!hasNotCreatedADeck && (
                <div className="flex justify-between mt-8">
                  <button 
                    onClick={() => setStep(1)} 
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-slate-100 rounded-lg transition-all duration-200 font-semibold"
                  >
                    Back
                  </button>
                  <button 
                    onClick={()=>{
                      setTutorialCancelled(true)
                      onClose()
                    }} 
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-slate-100 rounded-lg transition-all duration-200 font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </>
          )}

          {/* Step 4: Preview with Regenerate */}
          {step === 4 && (
            <>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-slate-100 mb-2">
                  {flashcards.length} Cards Generated!
                </h2>
                <p className="text-slate-400 text-sm">Review your deck below</p>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-gray-400">Deck Title:</span>
              </div>
              <input
                type="text"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                className="w-full mb-2 bg-gray-600 text-white text-lg font-semibold px-3 py-2 rounded-lg border border-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter deck name..."
              />

              <div className="mb-6 bg-gray-900 rounded-lg p-4 max-h-60 overflow-y-auto border border-gray-700">
                <h4 className="text-gray-300 font-semibold mb-3 flex items-center gap-2">
                  <span className="text-purple-400">Preview</span>
                  <span className="text-sm text-gray-500">({flashcards.length} cards)</span>
                </h4>
                
                {flashcards.slice(0, 3).map((card, index) => (
                  <div key={index} className="mb-3 p-3 bg-gray-800 rounded-lg border border-gray-700 hover:border-purple-500 transition-colors">
                    <div className="text-sm mb-2">
                      <span className="text-purple-400 font-semibold">Q: </span>
                      <span className="text-gray-200">{card.question}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-green-400 font-semibold">A: </span>
                      <span className="text-gray-300">{card.answer}</span>
                    </div>
                  </div>
                ))}
                
                {flashcards.length > 3 && (
                  <div className="text-center text-gray-500 text-sm py-2 bg-gray-800 rounded-lg border border-gray-700">
                    ...and {flashcards.length - 3} more cards
                  </div>
                )}
              </div>
              
              {status && (
                <div className="mb-4 bg-blue-500 bg-opacity-20 border border-blue-500 rounded-lg p-3">
                    <div className="text-sm text-blue-200 flex items-center gap-3">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                        <span className="font-medium">{status}</span>
                    </div>
                </div>
              )}

              <div className="flex gap-3">
                  <button
                      onClick={handleRegenerate}
                      disabled={isRegenerating || isSaving}
                      className={`flex-1 px-4 py-3 rounded-xl font-semibold 
                                  transition-all duration-200 flex items-center justify-center gap-2 
                                  disabled:opacity-50 disabled:cursor-not-allowed
                                  ${!userIsPremium && regenerateCount >= 3
                                      ? 'bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-black shadow-lg hover:scale-105'
                                      : 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600'
                                  }`}
                  >
                      {!userIsPremium && regenerateCount >= 3 ? (
                          <>
                              <span>🔒</span>
                              <span className="text-white">Try Free for 7 Days</span>
                          </>
                      ) : (
                          <>
                              <RefreshCw className={`w-5 h-5 ${isRegenerating ? 'animate-spin' : ''}`} />
                              {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                          </>
                      )}
                  </button>

                  <button
                      onClick={handleSaveDeck}
                      disabled={isRegenerating || isSaving}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 
                                hover:from-purple-700 hover:to-blue-700 text-white rounded-xl 
                                font-semibold transition-all duration-200 transform hover:scale-105 
                                flex items-center justify-center gap-2 disabled:opacity-50 
                                disabled:cursor-not-allowed disabled:transform-none shadow-lg"
                  >
                      <div className="inline-flex items-center justify-center w-6 h-6 bg-green-500 rounded-full">
                          <i className="fa-solid fa-check text-white text-l"></i>
                      </div>
                      {isSaving ? 'Saving...' : 'Save Deck'}
                  </button>
              </div>

              {!isRegenerating && (
                  <div className="mt-3 text-center">
                      {regenerateCount === 0 ? (
                          <p className="text-xs text-gray-500">
                              💡 Not satisfied? Regenerate to get different questions
                          </p>
                      ) : (
                          <div className="space-y-1">
                              <div className="flex items-center justify-center gap-2">
                                  <p className="text-xs text-gray-500">
                                      Regeneration {regenerateCount}
                                      {!userIsPremium && ` of 3`}
                                  </p>
                                  
                                  {!userIsPremium && (
                                      <div className="flex gap-1">
                                          {[1, 2, 3].map((dot) => (
                                              <div
                                                  key={dot}
                                                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                                                      dot <= regenerateCount
                                                          ? 'bg-green-500'
                                                          : 'bg-gray-600'
                                                  }`}
                                              />
                                          ))}
                                      </div>
                                  )}
                              </div>
                              
                              {!userIsPremium && regenerateCount === 2 && (
                                  <p className="text-xs text-yellow-400">
                                      ⚠️ Last free regeneration!
                                  </p>
                              )}
                          </div>
                      )}
                  </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default CreateWithAIModal;