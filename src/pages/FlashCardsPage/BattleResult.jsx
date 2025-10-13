import { useState, useEffect } from 'react';

function BattleResult({currentIndex, result, deaths}){
    const [showStats, setShowStats] = useState(false);
    const [counter, setCounter] = useState(0);

    // Grade colors and styles
    const gradeStyles = {
        'S': { color: 'text-cyan-400', glow: 'shadow-[0_0_20px_rgba(34,211,238,0.6)]', bg: 'from-cyan-500/20 to-blue-500/20' },
        'A': { color: 'text-green-400', glow: 'shadow-[0_0_20px_rgba(74,222,128,0.6)]', bg: 'from-green-500/20 to-emerald-500/20' },
        'B': { color: 'text-yellow-400', glow: 'shadow-[0_0_20px_rgba(250,204,21,0.6)]', bg: 'from-yellow-500/20 to-amber-500/20' },
        'C': { color: 'text-orange-400', glow: 'shadow-[0_0_20px_rgba(251,146,60,0.6)]', bg: 'from-orange-500/20 to-red-500/20' },
        'D': { color: 'text-red-400', glow: 'shadow-[0_0_20px_rgba(248,113,113,0.6)]', bg: 'from-red-500/20 to-pink-500/20' },
        'F': { color: 'text-gray-400', glow: 'shadow-[0_0_20px_rgba(156,163,175,0.6)]', bg: 'from-gray-500/20 to-slate-500/20' }
    };

    const currentGrade = gradeStyles[result.grade] || gradeStyles['F'];

    // Animate stats appearance
    useEffect(() => {
        setTimeout(() => setShowStats(true), 300);
    }, []);

    // Counter animation for percentage
    useEffect(() => {
        if (showStats && counter < result.percentage) {
            const timer = setTimeout(() => {
                setCounter(prev => Math.min(prev + 2, result.percentage));
            }, 20);
            return () => clearTimeout(timer);
        }
    }, [counter, showStats, result.percentage]);

    return(
        <div className="border border-2 border-slate-700 rounded bg-slate-700/20 flex items-center justify-center p-4 mb-3">
            <div className="max-w-md w-full space-y-6">
               

                {/* Giant Grade Display */}
                <div className={`text-center transform transition-all duration-500 ${showStats ? 'scale-100' : 'scale-0'}`}>
                    <div className={`inline-block  rounded-2xl `}>
                        <div className="text-sm text-gray-300 font-mono mb-2">GRADE</div>
                        <div className={`text-9xl font-black ${currentGrade.color} font-mono tracking-tighter leading-none`}>
                            {result.grade}
                        </div>
                        {result.grade === 'S' && (
                            <div className="text-xs text-cyan-300 font-mono mt-2 animate-pulse">
                                The Honored One
                            </div>
                        )}
                    </div>
                </div>

                {/* Retro Stats Box */}
                <div className={`bg-slate-600/20 border-purple-500/50 rounded-lg p-6 space-y-4 transform transition-all duration-500 delay-200 ${showStats ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                    {/* Score Percentage */}
                    <div className="flex items-center justify-between font-mono">
                        <span className="text-white/80 text-sm">ACCURACY</span>
                        <span className={`text-3xl font-bold ${currentGrade.color}`}>
                            {counter}%
                        </span>
                    </div>

                    {/* Divider */}
                    <div className="border-t-2 border-dashed border-slate-500/30"></div>

                    {/* Deaths */}
                    <div className="flex items-center justify-between font-mono text-sm">
                        <span className="text-white/80 flex items-center gap-2">
                             DEATHS
                        </span>
                        <span className="text-red-400 font-bold text-xl">{deaths}</span>
                    </div>

                    {/* Divider */}
                    <div className="border-t-2 border-dashed border-slate-500/30"></div>


                    {/* Cards Studied */}
                    <div className="flex items-center justify-between font-mono text-sm">
                        <span className="text-white/80 flex items-center gap-2">
                            TOTAL ATTEMPTS
                        </span>
                        <span className="text-green-400 font-bold text-xl">{currentIndex}</span>
                    </div>

                    
                    {/* XP Bar Visual */}
                    {/* <div className="space-y-2">
                        <div className="flex justify-between text-xs font-mono text-white/60">
                            <span>EXPERIENCE</span>
                            <span>{result.percentage}/100</span>
                        </div>
                        <div className="h-4 bg-black/50 border-2 border-purple-500/50 rounded overflow-hidden">
                            <div 
                                className={`h-full bg-gradient-to-r ${currentGrade.bg} transition-all duration-1000 ease-out`}
                                style={{ width: `${counter}%` }}
                            >
                                <div className="h-full w-full bg-white/20 animate-pulse"></div>
                            </div>
                        </div>
                    </div> */}
                </div>

                

                {/* Pixel Art Decoration */}
                {/* <div className="flex justify-center gap-4 text-4xl opacity-50">
                    <span className="animate-bounce" style={{animationDelay: '0s'}}>▲</span>
                    <span className="animate-bounce" style={{animationDelay: '0.1s'}}>●</span>
                    <span className="animate-bounce" style={{animationDelay: '0.2s'}}>■</span>
                    <span className="animate-bounce" style={{animationDelay: '0.1s'}}>◆</span>
                    <span className="animate-bounce" style={{animationDelay: '0s'}}>▲</span>
                </div> */}
            </div>
        </div>
    );
}

export default BattleResult;