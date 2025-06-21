function FolderModalStep2 (){

    const onClose = ()=>{}

    return(

        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 text-white">
            <h2 className="text-xl font-bold mb-4">Upload Your PDF</h2>
            <p className="text-gray-300 mb-4">
              Saving to: <span className="text-blue-400 font-semibold">
                {/* {isCreatingNewFolder ? newFolderName : selectedFolder} */}
              </span>
            </p>
            
            {/* <FileUploadComponent onFlashcardsGenerated={handleFileUpload} /> */}

            <div className="flex justify-between mt-6">
              <button onClick={() => onClose} className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500">
                Back
              </button>
              <button onClick={onClose} className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500">
                Cancel
              </button>
            </div>
            </div>
        </div>
    )


}

export default FolderModalStep2;