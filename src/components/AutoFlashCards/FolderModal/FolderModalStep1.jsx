import { useState, useEffect } from "react";
import {ref, getDatabase, onValue, set, push} from 'firebase/database';
import { app, auth } from "../../../firebase"
import AutoFlashCards from "../AutoFlashCards";
import FileUpload from "../FileUpload";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";




function FolderModalStep1({uid, onClose, isOpen}) {

  const navigate = useNavigate();
  
  const [step, setStep] = useState(1); // 1: Choose folder, 2: Upload file, 3: Processing, 4: Success
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingNewFolder, setIsCreatingNewFolder] = useState(false);
  const [flashcards, setFlashcards] = useState([]);
  const [deckName, setDeckName] = useState('');

  const [folder, setFolder] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState("");


  const [authUser, setAuthUser] = useState(null);

    useEffect(()=>{
      onAuthStateChanged(auth, (user) =>{
          if(user){
              setAuthUser(user);
          } else {
              setAuthUser(null);
          }
      })

    },[]);



    // List of folders in modal segment

    const db = getDatabase(app);
    const folderRef = ref(db, `QuizletsFolders/${uid}`)

    useEffect(()=>{
        const onSnapshot = onValue(folderRef, (snapshot)=>{
        const data = snapshot.val()

        if(data){
            
            const firstInnerKey = Object.keys(data).map(key =>({
            name: key,
            ...data[key]
            }));
            console.log(firstInnerKey)
            setFolder(firstInnerKey)
            ;

        }

        return ()=> onSnapshot;


        })
    },[uid])

    if (!isOpen) return null;



    const handleFolderSelection = () => {
        if (isCreatingNewFolder && !newFolderName.trim()) {
          alert('Please enter a folder name');
          return;
        }
        if (!isCreatingNewFolder && !selectedFolder) {
          alert('Please select a folder');
          return;
        }
        setStep(2);
      };
    
    const handleSaveDeck = () => {
        // first we gotta save the thing

        if(!deckName){
          alert("Please enter a deck name")
          return
        }

        const uid = authUser.uid
        const db = getDatabase(app);
        const newFileRef = ref(db, `QuizletsFolders/${uid}/${isCreatingNewFolder ? newFolderName : selectedFolder}/${deckName}`);
        const newDocRef = push(newFileRef);

        set(newDocRef, {
                Description: "",
                Flashcards: flashcards
            }).then(()=>{
                navigate(`/flashcards/${encodeURIComponent(`${isCreatingNewFolder ? newFolderName : selectedFolder}/${deckName}`)}`);
                // alert("Saved Successfuly")
            }
        )

        // then we go to the right page
    }

    return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 text-white">
        
        {/* Step 1: Choose Folder */}
        {step === 1 && (
          <>
            <h2 className="text-xl font-bold mb-4">Create AI Flashcards</h2>
            <p className="text-gray-300 mb-4">Where would you like to save your new deck?</p>
            
            <div className="space-y-3">
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="folderChoice"
                    checked={!isCreatingNewFolder}
                    onChange={() => setIsCreatingNewFolder(false)}
                    className="text-blue-500"
                  />
                  <span>Use existing folder</span>
                </label>
                
                {!isCreatingNewFolder && (
                  <select 
                    value={selectedFolder} 
                    onChange={(e) => setSelectedFolder(e.target.value)}
                    className="w-full mt-2 p-2 bg-gray-700 rounded border border-gray-600"
                  >
                    <option value="">Select a folder...</option>
                    {folder.map((folderItem) => (
                    <option key={folderItem.name} value={folderItem.name}>
                        {folderItem.name}
                    </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="folderChoice"
                    checked={isCreatingNewFolder}
                    onChange={() => setIsCreatingNewFolder(true)}
                    className="text-blue-500"
                  />
                  <span>Create new folder</span>
                </label>
                
                {isCreatingNewFolder && (
                  <input
                    type="text"
                    placeholder="Enter folder name..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="w-full mt-2 p-2 bg-gray-700 rounded border border-gray-600"
                  />
                )}
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button onClick={onClose} className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500">
                Cancel
              </button>
              <button onClick={handleFolderSelection} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500">
                Next
              </button>
            </div>
          </>
        )}

        {/* Step 2: Upload File */}
        {step === 2 && (
          <>
            <h2 className="text-xl font-bold mb-4">Upload Your PDF</h2>
            <p className="text-gray-300 mb-4">
              Saving to: <span className="text-blue-400 font-semibold">
                {isCreatingNewFolder ? newFolderName : selectedFolder}
              </span>
            </p>

            <FileUpload 
                onSuccess = {(generatedFlashcards)=>{
                    setFlashcards(generatedFlashcards);
                    setStep(4);
                }}
            
            />
            
            {/* <FileUploadComponent onFlashcardsGenerated={handleFileUpload} /> */}

            <div className="flex justify-between mt-6">
              <button onClick={() => setStep(1)} className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500">
                Back
              </button>
              <button onClick={onClose} className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500">
                Cancel
              </button>
            </div>
          </>
        )}

        {/* Step 4: Success & Name Deck */}
        {step === 4 && (
          <>
            <h2 className="text-xl font-bold mb-4">✅ Flashcards Generated!</h2>
            <p className="text-gray-300 mb-4">
              Created {flashcards.length} flashcards. Give your deck a name:
            </p>
            
            <input
              type="text"
              placeholder="Deck name"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              className="w-full p-2 bg-gray-700 rounded border border-gray-600 mb-4"
            />

            <div className="max-h-40 overflow-y-auto mb-4 bg-gray-700 p-3 rounded">
              <h4 className="text-sm font-semibold mb-2">Preview:</h4>
              {flashcards.slice(0, 2).map((card, index) => (
                <div key={index} className="text-xs mb-2 p-2 bg-gray-600 rounded">
                  <div><strong>Q:</strong> {card.question}</div>
                  <div><strong>A:</strong> {card.answer}</div>
                </div>
              ))}
              {flashcards.length > 2 && (
                <div className="text-xs text-gray-400">...and {flashcards.length - 2} more</div>
              )}
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500">
                Back
              </button>
              <button onClick={handleSaveDeck} className="px-4 py-2 bg-green-600 rounded hover:bg-green-500">
                Save Deck
              </button>
            </div>
          </>
        )}
      </div>
    </div>
        
    );
    }


export default FolderModalStep1;