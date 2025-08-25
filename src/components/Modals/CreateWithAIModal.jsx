import { useState, useEffect } from "react";
import { getFirestore, collection, doc, getDocs, onSnapshot, addDoc, updateDoc, query, where, writeBatch } from 'firebase/firestore';
import { app, auth } from "../../api/firebase"
import FileUpload from "../AutoFlashCards/FileUpload";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import CreateWithAIDemoModal from "../../pages/TryNowPage/LandingPage/CreateWithAIDemoModal";

import { useAuthContext } from "../../contexts/AuthContext";

// Tutorials
import { useTutorials } from "../../contexts/TutorialContext";

function CreateWithAIModal({ onClose, isOpen }) {

  // Context
  const { getFolderLimits, getDeckLimits, getCardLimits, isPremium } = useAuthContext();
  const userIsPremium = isPremium();
  // Tutorials
  const {goBackAStep, completeTutorial} = useTutorials();
  const [tutorialCancelled, setTutorialCancelled] = useState(false);
  
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: Choose folder, 2: Upload file, 3: Processing, 4: Success
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingNewFolder, setIsCreatingNewFolder] = useState(false);
  const [flashcards, setFlashcards] = useState([]);
  const [deckName, setDeckName] = useState('');
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const [cameraIsOpen, setCameraIsOpen] = useState(false);


  // Firestore instance
  const db = getFirestore(app);

  useEffect(() => {
    // Authentication listener
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        setAuthUser(null);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Tutorial
  // useEffect(() => {
  //     if (isOpen) {
  //       setTutorialCancelled(false);
  //     }
  //   }, [isOpen]);

  //  useEffect(() => {
  //     if(isOpen === undefined) return;
  //     if(!isOpen && tutorialCancelled){
  //       goBackAStep('create-deck')
  //     }
  //   }, [isOpen]);

  // Fetching folders with proper query (similar to first modal)
  useEffect(() => {
    if (authUser) {
      const foldersQuery = query(
        collection(db, 'folders'),
        where('ownerId', '==', authUser.uid)
      );
      
      const unsubscribe = onSnapshot(foldersQuery, (snapshot) => {
        const folderList = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          ...doc.data()
        }));
        setFolders(folderList);
      });

      return () => unsubscribe();
    }
  }, [authUser, db]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setNewFolderName('');
      setSelectedFolder('');
      setIsCreatingNewFolder(false);
      setStep(1);
      setFlashcards([]);
      setDeckName('');
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFolderSelection = () => {
    setLoading(true);
    
    // Validation
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
      const {canGenerate, maxFolders} = getFolderLimits()
      if(!canGenerate){
          const upgrade = window.confirm(
              `You've reached your max folder limit of ${maxFolders} folders.\n\n` +
              `Press OK to view upgrade options or Cancel to manage/delete folders.`
          )
          if(upgrade){
              navigate('/pricing')
          }
          setLoading(false);
          onClose()
          return;
      }
    }

    const {canGenerate, maxDecks} = getDeckLimits()
      if(!canGenerate){
          const upgrade = window.confirm(
              `You've reached your max deck limit of ${maxDecks} decks.\n\n` +
              `Press OK to view upgrade options or Cancel to manage/delete decks.`
          )
          if(upgrade){
              navigate('/pricing')
          }
          setLoading(false);
          onClose()
          return;
      }

    
    setStep(2);
    setLoading(false);
  };

  const handleSaveDeck = async () => {
    if (isSaving) return; // prevent double submission
  
    if (!deckName.trim()) {
      alert("Please enter a deck name");
      return;
    }
  
    if (!authUser) {
      alert("User not authenticated. Please log in.");
      return;
    }

    // Check card limits
    const cardLimits = getCardLimits();
    const cardsToAdd = flashcards.length;
    const currentCards =
    cardLimits.maxCards === -1
        ? 0
        : (cardLimits.maxCards - (cardLimits.canGenerate ? cardLimits.maxCards : 0));

    if (cardLimits.maxCards !== -1 && currentCards + cardsToAdd > cardLimits.maxCards) {
      const confirmMessage = userIsPremium
          ? `Saving this deck would exceed your card limit.\n\nYou currently have space for ${cardLimits.maxCards - currentCards} more cards, but this deck contains ${cardsToAdd}.\n\nPress OK to contact support for higher limits, or Cancel to delete some cards first.`
          : `Saving this deck would exceed your card limit (${cardLimits.maxCards} cards).\n\nThis deck contains ${cardsToAdd} cards.\n\nPress OK to upgrade to Premium for unlimited cards, or Cancel to delete some cards first.`;

      if (window.confirm(confirmMessage)) {
          if (userIsPremium) {
          window.location.href = "/contactme";
          } else {
          window.location.href = "/pricing";
          }
      }
      return;
    }

  
    setIsSaving(true); // 🔒 Lock the button
  
    try {
      const ownerIdRef = `${authUser.uid}`;
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
        // cardCount: flashcards.length,
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
          // deckCount: folders.find(f => f.id === currentFolderId)?.deckCount + 1 || 1,
          updatedAt: new Date(),
        });
      }

      completeTutorial('create-deck');
  
      navigate(`/flashcards/${newDeckRef.id}`, {
        state: {
          deckId: newDeckRef.id,
          folderId: currentFolderId,
          folderName: newFolderName || folders.find(f => f.id === selectedFolder)?.name,
        }
      });
  
      onClose();
    } catch (error) {
      console.error("Error saving deck and flashcards: ", error);
      alert("Failed to save deck and flashcards. Please try again.");
    } finally {
      setIsSaving(false); // Optional: you can keep it disabled permanently if you don't want retry
    }
  };
  

  return (
    <>
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
        {step === 1 && (
          <>
            <h2 className="text-2xl font-bold text-slate-100 mb-6 text-center">Create AI Flashcards</h2>
            <p className="text-slate-300 mb-6 text-center">Where would you like to save your new deck?</p>

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
              onSuccess={(generatedFlashcards) => {
                setFlashcards(generatedFlashcards);
                setStep(4);
              }}
            />

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
          </>
        )}

        {/* Step 4: Success & Name Deck */}
        {step === 4 && (
          <>
            <h2 className="text-2xl font-bold text-slate-100 mb-6 text-center">✅ Flashcards Generated!</h2>
            <p className="text-slate-300 mb-6 text-center">
              Created {flashcards.length} flashcards. Give your deck a name:
            </p>

            <input
              type="text"
              placeholder="Deck name"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              className="w-full p-3 bg-gray-600 text-slate-100 rounded-lg border border-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 mb-6"
            />

            <div className="max-h-40 overflow-y-auto mb-6 bg-gray-700 p-4 rounded-lg border border-gray-600">
              <h4 className="text-slate-100 font-semibold mb-3">Preview:</h4>
              {flashcards.slice(0, 2).map((card, index) => (
                <div key={index} className="text-sm mb-3 p-3 bg-gray-600 rounded-lg">
                  <div className="text-slate-200"><strong>Q:</strong> {card.question}</div>
                  <div className="text-slate-300"><strong>A:</strong> {card.answer}</div>
                </div>
              ))}
              {flashcards.length > 2 && (
                <div className="text-sm text-slate-400">...and {flashcards.length - 2} more</div>
              )}
            </div>

            <div className="flex justify-between">
              <button 
                onClick={() => setStep(2)} 
                className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-slate-100 rounded-lg transition-all duration-200 font-semibold"
              >
                Back
              </button>
              <button 
                disabled={isSaving}
                onClick={handleSaveDeck} 
                className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-all duration-300 transform hover:scale-105 font-semibold"
              >
                Save Deck
              </button>
            </div>
          </>
        )}
      </div>
    </div>
    
    </>
    
  );
}

export default CreateWithAIModal;