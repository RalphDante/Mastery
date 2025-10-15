import { useState } from "react";
import Timer from "./Timer";
import { ArrowLeft } from "lucide-react";
import LearningHubSection from "../LearningHubSection/LearningHubSection";
import { useAuthContext } from "../../../contexts/AuthContext";
import { useFolders } from "../../../contexts/DeckCacheContext";


function Options({db, authUser, onCreateDeckClick, onCreateWithAIModalClick}){
    const {loading} = useAuthContext();
    const folders = useFolders();
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
            return <LearningHubSection 
                    onCreateDeckClick={onCreateDeckClick}
                    onCreateWithAIModalClick={onCreateWithAIModalClick}
                />
            ;
        default:
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {(!loading && (!folders || folders.length === 0)) ? (
                        <button 
                            onClick={()=>{}}
                            className="group relative overflow-hidden bg-gradient-to-br from-red-600 to-orange-600 rounded-xl p-6 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-red-500/50"
                        >
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-all duration-300"></div>
                            <div className="relative z-10 flex flex-col items-center justify-center space-y-3">
                                <div className="text-5xl animate-bounce">⚔️</div>
                                <h3 className="text-2xl font-bold text-white">Create First Boss</h3>
                                <p className="text-sm text-white/80">Battle through your flashcards</p>
                            </div>
                            <div className="absolute -bottom-2 -right-2 text-6xl opacity-10 group-hover:opacity-20 transition-opacity">🐉</div>
                        </button>
                    ) : (
                        // Fight Bosses Card
                        <button 
                            onClick={openFlashcards}
                            className="group relative overflow-hidden bg-gradient-to-br from-red-600 to-orange-600 rounded-xl p-6 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-red-500/50"
                        >
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-all duration-300"></div>
                            <div className="relative z-10 flex flex-col items-center justify-center space-y-3">
                                <div className="text-5xl animate-bounce">⚔️</div>
                                <h3 className="text-2xl font-bold text-white">Your Bosses</h3>
                                <p className="text-sm text-white/80">Battle through your flashcards</p>
                            </div>
                            <div className="absolute -bottom-2 -right-2 text-6xl opacity-10 group-hover:opacity-20 transition-opacity">🐉</div>
                        </button>
                    )}
                   

                    {/* Endurance Test Card */}
                    <button
                        onClick={openTimer}
                        className="group relative overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-6 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/50"
                    >
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-all duration-300"></div>
                        <div className="relative z-10 flex flex-col items-center justify-center space-y-3">
                            <div className="text-5xl animate-pulse">⏱️</div>
                            <h3 className="text-2xl font-bold text-white">Endurance Test</h3>
                            <p className="text-sm text-white/80">Push your study limits</p>
                        </div>
                        <div className="absolute -bottom-2 -right-2 text-6xl opacity-10 group-hover:opacity-20 transition-opacity">🔥</div>
                    </button>
                </div>
            );
        }
    };

    return(
        <>  

            <div className="w-full  bg-slate-800 rounded-lg p-6 flex flex-col justify-between text-slate-100 relative">
                
                {/* HEADER */}
                <div className="flex justify-between mb-1">
                    <div className="text-left">
                        <h2 className="text-xl font-semibold mb-1">⚔️ {!(studyMode === 'options') ? 
                            (studyMode === 'timer' ? 'Study Timer' : 'Your Boss Collections') :
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