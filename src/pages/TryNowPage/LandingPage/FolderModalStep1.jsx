import { useState, useEffect } from "react";
import {ref, getDatabase, onValue, set, push} from 'firebase/database';
import FileUpload from "./FileUpload";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";




function FolderModalStep1({onClose, isOpen}) {

  const navigate = useNavigate();
  
  const [step, setStep] = useState(1); // 1: Choose folder, 2: Upload file, 3: Processing, 4: Success
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingNewFolder, setIsCreatingNewFolder] = useState(false);
  const [flashcards, setFlashcards] = useState([]);
  const [deckName, setDeckName] = useState('');

  const [folder, setFolder] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState("");


  // const [authUser, setAuthUser] = useState(null);

    // useEffect(()=>{
    //   onAuthStateChanged(auth, (user) =>{
    //       if(user){
    //           setAuthUser(user);
    //       } else {
    //           setAuthUser(null);
    //       }
    //   })

    // },[]);



    // List of folders in modal segment

    // const db = getDatabase(app);
    // const folderRef = ref(db, `QuizletsFolders/${uid}`)

    // useEffect(()=>{
    //     const onSnapshot = onValue(folderRef, (snapshot)=>{
    //     const data = snapshot.val()

    //     if(data){
            
    //         const firstInnerKey = Object.keys(data).map(key =>({
    //         name: key,
    //         ...data[key]
    //         }));
    //         console.log(firstInnerKey)
    //         setFolder(firstInnerKey)
    //         ;

    //     }

    //     return ()=> onSnapshot;


    //     })
    // },[uid])

    if (!isOpen) return null;




    
    // const handleSaveDeck = () => {
    //     // first we gotta save the thing

    //     if(!deckName){
    //       alert("Please enter a deck name")
    //       return
    //     }

    //     const uid = authUser.uid
    //     const db = getDatabase(app);
    //     const newFileRef = ref(db, `QuizletsFolders/${uid}/${isCreatingNewFolder ? newFolderName : selectedFolder}/${deckName}`);
    //     const newDocRef = push(newFileRef);

    //     set(newDocRef, {
    //             Description: "No description",
    //             Flashcards: flashcards
    //         }).then(()=>{
    //             navigate(`/flashcards/${encodeURIComponent(`${isCreatingNewFolder ? newFolderName : selectedFolder}/${deckName}`)}`);
    //             // alert("Saved Successfuly")
    //         }
    //     )

    //     // then we go to the right page
    // }

    return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 text-white">
        
        {/* Step 1: Choose Folder */}
        

        {/* Step 2: Upload File */}

          <>
            <h2 className="text-xl font-bold mb-4">Upload Your PDF</h2>
            {/* <p className="text-gray-300 mb-4">
              Saving to: <span className="text-blue-400 font-semibold">
                {isCreatingNewFolder ? newFolderName : selectedFolder}
              </span>
            </p> */}

            <FileUpload 
                onSuccess = {(generatedFlashcards)=>{
                    setFlashcards(generatedFlashcards);
                    // Navigation to flashcard page

                    navigate('/flashcards-demo', {
                      state: {flashcards: generatedFlashcards}
                    })
                    // setStep(4);
                }}
            
            />
            
            {/* <FileUploadComponent onFlashcardsGenerated={handleFileUpload} /> */}

            <div className="flex justify-between mt-6">
              {/* <button onClick={() => setStep(1)} className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500">
                Back
              </button> */}
              <button onClick={onClose} className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500">
                Cancel
              </button>
            </div>
          </>


        {/* Step 4: Success & Name Deck */}
        {/* {step === 4 && (
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
        )} */}
      </div>
    </div>
        
    );
    }


export default FolderModalStep1;