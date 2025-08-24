import { useState } from "react";
import { useNavigate } from "react-router-dom";
import FileUpload from "./FileUpload";

function CreateWithAIDemoModal({ onClose, isOpen }) {
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1); // 1: Upload file, 2: Success & Preview
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(false);

  const [cameraIsOpen, setCameraIsOpen] = useState(false);

  // Reset form when modal opens/closes
  useState(() => {
    if (!isOpen) {
      setStep(1);
      setFlashcards([]);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartDemo = () => {
    // Navigate to demo page with flashcards in state
    navigate('/flashcards-demo', {
      state: { flashcards: flashcards }
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-700 max-w-md w-full relative">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors"
          disabled={loading}
        >
          <i className="fa-solid fa-xmark text-2xl"></i>
        </button>

        {/* Step 1: Upload File */}
        {step === 1 && (
          <>
            <h2 className="text-2xl font-bold text-slate-100 mb-6 text-center">
              Create Your First Deck!
            </h2>
            {/* <p className="text-slate-300 mb-6 text-center">
              Upload any PDF, image, or document to generate flashcards instantly
            </p> */}
            {/* {cameraIsOpen ? 
              ""
              :
               <div className="bg-gradient-to-r from-violet-600/20 to-purple-600/20 p-4 rounded-lg border border-violet-500/30 mb-6">
               <div className="flex items-center gap-3 mb-2">
                 <span className="text-2xl">✨</span>
                 <span className="text-slate-100 font-semibold">No signup required</span>
               </div>
               <p className="text-slate-300 text-sm">
                 Test our AI-powered flashcard generator risk-free. Sign up later to save your decks!
               </p>
             </div>
            } */}
            

            <FileUpload
              cameraIsOpen={setCameraIsOpen}
              onSuccess={(generatedFlashcards) => {
                setFlashcards(generatedFlashcards);
                setStep(2);
              }}
            />

            <div className="flex justify-center mt-8">
              <button 
                onClick={onClose} 
                className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-slate-100 rounded-lg transition-all duration-200 font-semibold"
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {/* Step 2: Success & Preview */}
        {step === 2 && (
          <>
            <h2 className="text-2xl font-bold text-slate-100 mb-6 text-center">
              🎉 Flashcards Generated!
            </h2>
            <p className="text-slate-300 mb-6 text-center">
              Created <span className="text-violet-400 font-bold">{flashcards.length}</span> flashcards from your content
            </p>

            {/* Preview Cards */}
            <div className="max-h-48 overflow-y-auto mb-6 bg-gray-700 p-4 rounded-lg border border-gray-600">
              <h4 className="text-slate-100 font-semibold mb-3">Preview:</h4>
              {flashcards.slice(0, 3).map((card, index) => (
                <div key={index} className="text-sm mb-3 p-3 bg-gray-600 rounded-lg">
                  <div className="text-slate-200 mb-1">
                    <strong>Q:</strong> {card.question}
                  </div>
                  <div className="text-slate-300">
                    <strong>A:</strong> {card.answer}
                  </div>
                </div>
              ))}
              {flashcards.length > 3 && (
                <div className="text-sm text-slate-400 text-center p-2 bg-gray-600 rounded">
                  ...and {flashcards.length - 3} more cards to study! 🚀
                </div>
              )}
            </div>

            {/* CTA Section */}
            {/* <div className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 p-4 rounded-lg border border-emerald-500/30 mb-6">
              <div className="text-center">
                <p className="text-slate-100 font-semibold mb-2">Ready to study?</p>
                <p className="text-slate-300 text-sm">
                  Start practicing with your flashcards now!
                </p>
              </div>
            </div> */}

            <div className="flex justify-center gap-4">
              <button 
                onClick={() => setStep(1)} 
                className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-slate-100 rounded-lg transition-all duration-200 font-semibold"
              >
                Back
              </button>
              
              <button 
                onClick={handleStartDemo} 
                className="px-8 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-lg transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg"
              >
                Start Studying!
              </button>
            </div>

            {/* Sign up prompt */}
            {/* <div className="mt-4 text-center">
              <p className="text-slate-400 text-sm">
                Want to save these flashcards? 
                <button className="text-violet-400 hover:text-violet-300 ml-1 underline">
                  Sign up free
                </button>
              </p>
            </div> */}
          </>
        )}
      </div>
    </div>
  );
}

export default CreateWithAIDemoModal;