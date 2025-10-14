import { useState } from "react";
import Timer from "./Timer";
import { ArrowLeft } from "lucide-react";


function Options({db, authUser}){

    const [studyMode, setStudyMode] = useState('options');

    const openTimer = ()=>{
        setStudyMode("timer");
    }

    const openFlashcards = ()=>{
        setStudyMode("flashcards");
    }

    const openOptions = ()=>{
        setStudyMode("options");
    }

    // Render based on studyMode
    const renderContent = () => {
        switch (studyMode) {
        case "timer":
            return <Timer 
                db={db}
                authUser={authUser}
            />;
        case "flashcards":
            return <>Flashcards</>;
        default:
            return <>
                <button onClick={openFlashcards}>
                    Your Bosses
                </button>

                <button
                    onClick={openTimer}
                >
                    Timer
                </button>

                
            </>;
        }
    };

    return(
        <>  

            <div className="w-full h-full min-h-[450px] bg-slate-800 rounded-lg p-6 flex flex-col justify-between text-slate-100 relative">
                
                {/* HEADER */}
                <div className="flex justify-between mb-1">
                    <div className="text-left">
                        <h2 className="text-xl font-semibold mb-1">⚔️ {!(studyMode === 'options') ? 
                            (studyMode === 'timer' ? 'Study Timer' : 'Your Bosses') :
                                'Choose Your Adventure'
                            }
                        </h2>
                        {/* <p className="text-slate-400 text-sm">Choose your battle session</p> */}
                    </div>
                    {!(studyMode === 'options') ? 
                        <button
                            onClick={openOptions}
                            className="gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-all duration-200 shadow-md text-sm sm:text-base"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button> : 
                        ""

                    }
                </div>

                {renderContent()}
            </div>



        </>
    )
}


export default Options;