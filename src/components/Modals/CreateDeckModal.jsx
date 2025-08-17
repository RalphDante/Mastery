import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from "../../api/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useTutorials } from "../../contexts/TutorialContext";
import { useAuthContext } from "../../contexts/AuthContext";

function CreateDeckModal({ uid, onClose, isOpen }) {

  //Context
  const { getFolderLimits, getDeckLimits } = useAuthContext();

  const [didCompleteStep, setDidCompleteStep] = useState(false);
  const [wasCancelled, setWasCancelled] = useState(false);
  const {goBackAStep} = useTutorials();

  const { signIn } = useAuth();
  const navigate = useNavigate();

  
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingNewFolder, setIsCreatingNewFolder] = useState(false);
  const [folder, setFolder] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const isButtonDisabled = loading || !authUser;


  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        setAuthUser(null);
      }
    });
  }, []);

  // useEffect(() => {
  //   if (isOpen) {
  //     setDidCompleteStep(false);
  //     setWasCancelled(false);
  //   }
  // }, [isOpen]);

//   useEffect(() => {
//     if (isOpen === undefined || didCompleteStep) return;

//     const noFoldersFetched = folder.length === 0;

//     const shouldGoBack =
//       !isOpen &&
//       !didCompleteStep &&
//       (wasCancelled || (
//         (isCreatingNewFolder && !newFolderName.trim()) ||
//         (!isCreatingNewFolder && !selectedFolder && noFoldersFetched)
//       ));

//     // if (shouldGoBack) {
//     //   goBackAStep('create-deck');
//     // }
//   }, [
//     isOpen,
//     didCompleteStep,
//     wasCancelled,
//     isCreatingNewFolder,
//     newFolderName,
//     selectedFolder,
//     folder,
// ]);

  // List of folders from Firestore
  useEffect(() => {
    if (uid) {
      const foldersQuery = query(
        collection(db, 'folders'),
        where('ownerId', '==', uid)
      );
      
      const unsubscribe = onSnapshot(foldersQuery, (snapshot) => {
        const folderList = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          ...doc.data()
        }));
        console.log(folderList);
        setFolder(folderList);
      });

      return () => unsubscribe();
    }
  }, [uid]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setNewFolderName('');
      setSelectedFolder('');
      setIsCreatingNewFolder(false);
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

    setDidCompleteStep(true);

    // Get folder name - either new folder name or find existing folder name by ID
    let folderName;
    let folderId;
    
    if (isCreatingNewFolder) {
      folderName = newFolderName.trim();
      folderId = null; // Will be created
    } else {
      const selectedFolderObj = folder.find(f => f.id === selectedFolder);
      folderName = selectedFolderObj ? selectedFolderObj.name : '';
      folderId = selectedFolder;
    }
    
    // Navigate to dedicated flashcard page with folder info
    navigate('/create-deck', { 
      state: { 
        folderName, 
        folderId,
        isNewFolder: isCreatingNewFolder,
        uid: authUser.uid 
      } 
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-700 max-w-md w-full relative">
        <button 
          onClick={()=>{
            setWasCancelled(true);
            onClose()
          }} 
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors"
          disabled={loading}
        >
          <i className="fa-solid fa-xmark text-2xl"></i>
        </button>
        
        <h2 className="text-2xl font-bold text-slate-100 mb-6 text-center">Create New Deck</h2>
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
                {folder.map((folderItem) => (
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

        {!authUser && (
            <p className="text-center text-sm text-slate-400 mt-4">
                Please{' '}
                <span 
                    onClick={() => signIn()}
                    className="text-blue-400 hover:text-blue-300 cursor-pointer underline"
                >
                    sign in
                </span>
                {' '}to create decks.
            </p>
        )}

        <div className="flex justify-between mt-8">
          <button 
            onClick={()=>{
              setWasCancelled(true);
              onClose()
          }} 
            className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-slate-100 rounded-lg transition-all duration-200 font-semibold disabled:opacity-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            onClick={handleFolderSelection} 
            className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-all duration-300 transform hover:scale-105 font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            disabled={isButtonDisabled}
          >
            {loading ? 'Processing...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateDeckModal;