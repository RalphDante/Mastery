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
    const [showAIOption, setShowAIOption] = useState(false);

    const openTimer = ()=>{
        setStudyMode("timer");
    }

    const openFlashcards = ()=>{
        setStudyMode("flashcards");
    }

    const openOptions = ()=>{
        setStudyMode("options");
        setShowAIOption(false);
    }

    const openAIOption = ()=>{
        setShowAIOption(true);
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
                    {!showAIOption ? 
                        ((!loading && (!folders || folders.length === 0)) ? (
                            <button 
                                onClick={openAIOption}
                                className="group relative overflow-hidden bg-gradient-to-br from-red-600 to-orange-600 rounded-xl p-6 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-red-500/50"
                            >
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-all duration-300"></div>
                                <div className="relative z-10 flex flex-col items-center justify-center space-y-3">
                                    <img 
                                    src="/images/bosses-headline-image.webp" 
                                    alt="A picture of the bosses in the game"
                                    className="w-30 h-auto rounded-2xl"
                                    loading="eager"
                                    width="600"
                                    height="400"
                                    />
                                    <h3 className="text-2xl font-bold text-white">Create My Boss</h3>
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
                        )) : (
                            <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Create with AI - Epic Purple Theme */}
                                <button
                                    onClick={()=>onCreateWithAIModalClick("First Folder")}
                                    className="group relative overflow-hidden bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 rounded-xl p-8 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/50"
                                >
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-all duration-300"></div>
                                    
                                    {/* Animated sparkles */}
                                    <div className="absolute top-4 right-4 text-2xl animate-pulse">✨</div>
                                    <div className="absolute bottom-4 left-4 text-xl animate-bounce" style={{animationDelay: '0.5s'}}>⚡</div>
                                    
                                    <div className="relative z-10 flex flex-col items-center justify-center space-y-4">
                                        <div className="text-6xl animate-bounce">🤖</div>
                                        <h3 className="text-2xl font-bold text-white text-center">Create from Notes</h3>
                                        <p className="text-sm text-white/90 text-center">Upload notes or images and let AI forge your boss cards</p>
                                        <div className="mt-2 px-4 py-1 bg-white/20 rounded-full text-xs font-semibold">
                                            ⚡ INSTANT GENERATION
                                        </div>
                                    </div>
                                    
                                    {/* Decorative elements */}
                                    <div className="absolute -bottom-4 -right-4 text-8xl opacity-10 group-hover:opacity-20 transition-opacity">🧙‍♂️</div>
                                </button>

                                {/* Create Manually - Warrior Gold Theme */}
                                <button 
                                    onClick={()=>onCreateDeckClick("First Folder")}
                                    className="group relative overflow-hidden bg-gradient-to-br from-amber-600 via-yellow-600 to-orange-600 rounded-xl p-8 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/50"
                                >
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-all duration-300"></div>
                                    
                                    {/* Animated elements */}
                                    <div className="absolute top-4 left-4 text-2xl animate-pulse">🎯</div>
                                    <div className="absolute bottom-4 right-4 text-xl animate-bounce" style={{animationDelay: '0.3s'}}>⚔️</div>
                                    
                                    <div className="relative z-10 flex flex-col items-center justify-center space-y-4">
                                        <div className="text-6xl animate-pulse">🛡️</div>
                                        <h3 className="text-2xl font-bold text-white text-center">Forge Manually</h3>
                                        <p className="text-sm text-white/90 text-center">Craft each card with your own hands like a true warrior</p>
                                        <div className="mt-2 px-4 py-1 bg-white/20 rounded-full text-xs font-semibold">
                                            💪 FULL CONTROL
                                        </div>
                                    </div>
                                    
                                    {/* Decorative elements */}
                                    <div className="absolute -bottom-4 -right-4 text-8xl opacity-10 group-hover:opacity-20 transition-opacity">⚒️</div>
                                </button>
                            </div>
                        )
                    }
                    
                   

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
                <div className="flex justify-between align-center items-center mb-2">
                    <div className="text-left">
                        <h2 className="texl-sm sm:text-xl font-semibold mb-1">⚔️ {!(studyMode === 'options') ? 
                            (studyMode === 'timer' ? 'Study Timer' : 'Your Boss Collections') :
                                'Choose Your Adventure'
                            }
                        </h2>
                        {/* <p className="text-slate-400 text-sm">Choose your battle session</p> */}
                    </div>
                    {!(studyMode === 'options') || showAIOption ? 
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