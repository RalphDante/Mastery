import { useState, useEffect } from "react";
import { getFirestore, collection, doc, addDoc, updateDoc, writeBatch, increment, runTransaction } from 'firebase/firestore';
import { app } from "../../api/firebase"
import FileUpload, { generateFlashcardsFromText } from "../AutoFlashCards/FileUpload";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Sparkles } from 'lucide-react';
import { usePartyContext } from "../../contexts/PartyContext";
import { useAuthContext } from "../../contexts/AuthContext";
import { useTutorials } from "../../contexts/TutorialContext";
import { useDeckCache } from "../../contexts/DeckCacheContext";
import LimitReachedModal from "./LimitReachedModal";

function CreateWithAIModal({ onClose, isOpen, isAutoAssignedFolder }) {

  const {updateUserProfile} = usePartyContext();
  const [status, setStatus] = useState('');
  
  const { getFolderLimits, getDeckLimits, getCardLimits, isPremium, user, userProfile } = useAuthContext();
  const {folders} = useDeckCache();
  const userIsPremium = isPremium();
  const {advanceStep, completeTutorial, isTutorialAtStep, tutorials, isInTutorial } = useTutorials();
  const hasNotCreatedADeck = isInTutorial('create-deck')
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
        setOriginalText(null); // Reset original text
        setRegenerateCount(0); // Reset regenerate count
        setLoading(false);
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
    }
  }, [isOpen, isAutoAssignedFolder]);

  if (!isOpen) return null;

  const awardFirstDeckXP = async () => {
    try {
      const xpGain = 100;
      
      await runTransaction(db, async (transaction) => {
        // 1. Read user document
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await transaction.get(userDocRef);

        if (!userDoc.exists()) {
          throw new Error("User does not exist.");
        }

        const userData = userDoc.data();

        // 2. Read party member document if user is in a party
        let partyMemberRef = null;
        let memberDoc = null;

        if (userData.currentPartyId) {
          partyMemberRef = doc(db, 'parties', userData.currentPartyId, 'members', user.uid);
          memberDoc = await transaction.get(partyMemberRef);
        }

        // NOW PERFORM ALL WRITES (no more reads after this!)

        // Update user exp
        transaction.update(userDocRef, {
          exp: increment(xpGain)
        });

        // Update party member exp if exists
        if (memberDoc && memberDoc.exists()) {
          transaction.update(partyMemberRef, {
            exp: increment(xpGain)
          });
        }
      });

      if (updateUserProfile) updateUserProfile({ exp: (userProfile?.exp || 0) + xpGain });
      
      console.log(`✅ First deck XP awarded: +${xpGain} XP (user + party member)`);
    } catch (error) {
      console.error('❌ Error awarding first deck XP:', error);
    }
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

  // NEW: Handle regeneration
  const handleRegenerate = async () => {
      if (!originalText) {
          alert('No original content to regenerate from');
          return;
      }

      // Check limit and show modal instead of alert
      if (!userIsPremium && regenerateCount >= 3) {
          setLimitType('regenerate');
          setShowLimitModal(true);
          return;  // ✅ Just return - no need to do anything else
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

      completeTutorial('create-deck');
      const isFirstDeck = hasNotCreatedADeck;
      if (hasNotCreatedADeck) {
        // Award XP and show celebration
        await awardFirstDeckXP();
      }
  
      navigate(`/flashcards/${newDeckRef.id}`, {
        state: {
          deckId: newDeckRef.id,
          folderId: currentFolderId,
          folderName: newFolderName || folders.find(f => f.id === selectedFolder)?.name,
          showFirstDeckCelebration: isFirstDeck,
        }
      });
  
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

          {/* Step 2: Upload File */}
          {step === 2 && (
            <>
              <p className="text-slate-300 mb-6 text-center">
                Saving to: <span className="text-violet-400 font-semibold">
                  {isCreatingNewFolder ? newFolderName : folders.find(f => f.id === selectedFolder)?.name || 'Loading folder name...'}
                </span>
              </p>

              <FileUpload
                cameraIsOpen={setCameraIsOpen}
                onSuccess={(data) => {
                  // NEW: Handle the new data structure from FileUpload
                  setFlashcards(data.flashcards);
                  setDeckName(data.deckName); // Auto-set the deck name
                  setOriginalText(data.originalText); // Store for regeneration
                  setGenerationType(data.generationType);
                  setStep(4);
                  if(isTutorialAtStep('create-ai', 2)){
                    advanceStep('create-ai')
                  }
                }}
              />

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
              {/* Success Header */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-slate-100 mb-2">
                  {flashcards.length} Cards Generated!
                </h2>
                <p className="text-slate-400 text-sm">Review your deck below</p>
              </div>

              {/* Auto-generated deck name - editable */}
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

              {/* Preview Cards */}
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

              {/* Action Buttons */}
              <div className="flex gap-3">
                  {/* Regenerate Button - Changes appearance at limit */}
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
                          // ✅ At limit: Shows upgrade prompt but still clickable
                          <>
                              <span>🔒</span>
                              <span className="text-white">Try Free for 7 Days</span>
                          </>
                      ) : (
                          // ✅ Normal state: Shows regenerate
                          <>
                              <RefreshCw className={`w-5 h-5 ${isRegenerating ? 'animate-spin' : ''}`} />
                              {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                          </>
                      )}
                  </button>

                  {/* Save Button */}
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

              {/* Regenerate counter with visual progress */}
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
                                  
                                  {/* Visual dots for free users */}
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
                              
                              {/* Warning at 2/3 */}
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