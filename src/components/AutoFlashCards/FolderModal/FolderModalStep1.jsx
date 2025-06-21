import { useState, useEffect } from "react";
import {ref, getDatabase, onValue} from 'firebase/database';
import { app } from "../../../firebase"
import FolderModalStep2 from "./FolderModalStep2";



function FolderModalStep1({uid}) {

    const [folder, setFolder] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState("");
    const [createNew, setCreateNew] = useState(false);
    const [showStep2, setShowStep2] = useState(false);



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



    if (showStep2) {
        return <FolderModalStep2 selectedFolder={selectedFolder} createNew={createNew} />;
    }

    return (
    <>
        <button
        className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
        onClick={() => setShowModal(true)}
        >
        Create AI Flashcards
        </button>

        {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4">Create AI Flashcards</h2>
            <p className="mb-2">Where would you like to save your new deck?</p>

            <div className="mb-4 space-y-2">
                <label className="flex items-center">
                <input
                    type="radio"
                    checked={!createNew}
                    onChange={() => setCreateNew(false)}
                    className="mr-2"
                />
                Use existing folder
                </label>

                {!createNew && (
                <select
                    className="w-full mt-1 p-2 bg-gray-700 rounded"
                    value={selectedFolder}
                    onChange={(e) => setSelectedFolder(e.target.value)}
                >
                   {folder.map((folderItem) => (
                    <option key={folderItem.name} value={folderItem.name}>
                        {folderItem.name}
                    </option>
                    ))}
                </select>
                )}

                <label className="flex items-center mt-2">
                <input
                    type="radio"
                    checked={createNew}
                    onChange={() => setCreateNew(true)}
                    className="mr-2"
                />
                Create new folder
                </label>
            </div>

            <div className="flex justify-end space-x-2">
                <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
                >
                Cancel
                </button>
                <button
                onClick={() => {
                    // Handle next step logic here
                   
                    setShowModal(false);
                    setShowStep2(true);
                   
                }}
                className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
                >
                Next
                </button>
            </div>
            </div>
        </div>
        )}

    </>
        
    );
    }


export default FolderModalStep1;