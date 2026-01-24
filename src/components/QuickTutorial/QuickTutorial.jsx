import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, ArrowRight, BookOpen, Zap, Trophy, Swords } from 'lucide-react';
import FileUpload from '../AutoFlashCards/FileUpload';
import AvatarWithPlatform from '../AvatarWithPlatform';
import { usePartyContext } from '../../contexts/PartyContext';
import { useAuthContext } from '../../contexts/AuthContext';
import { getAvatarPath } from '../../configs/avatarConfig';

function QuickTutorial() {
  const [step, setStep] = useState(1);
  const [isOpen, setIsOpen] = useState(true);
  const {user} = useAuthContext();
  const {partyMembers} = usePartyContext();

  const currentUser = user?.uid ? partyMembers[user.uid] : null;
  

  if (!isOpen) return null;

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto animate-[scale-in_0.2s_ease-out] relative">
        {/* Close button */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-200 transition-colors z-10 p-1"
        >
          <X size={20} className="sm:w-6 sm:h-6" />
        </button>

        {/* Step 1: The Promise - FLOW DIAGRAM */}
        {step === 1 && (
          <div className="p-4 sm:p-6 md:p-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
              Welcome to Mastery!
            </h2>
            
            <p className="text-base sm:text-lg text-gray-300 mb-6 sm:mb-10">
              Just a quick run through on how everything works.
            </p>

            {/* Visual Flow Diagram */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-10 flex-wrap">
              {/* Step 1: Upload */}
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl flex items-center justify-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className='w-full h-auto' viewBox="0 0 256 256"><rect width="256" height="256" fill="none"/><path fill="currentColor" d="m213.66 66.34l-40-40A8 8 0 0 0 168 24H88a16 16 0 0 0-16 16v16H56a16 16 0 0 0-16 16v144a16 16 0 0 0 16 16h112a16 16 0 0 0 16-16v-16h16a16 16 0 0 0 16-16V72a8 8 0 0 0-2.34-5.66M136 192H88a8 8 0 0 1 0-16h48a8 8 0 0 1 0 16m0-32H88a8 8 0 0 1 0-16h48a8 8 0 0 1 0 16m64 24h-16v-80a8 8 0 0 0-2.34-5.66l-40-40A8 8 0 0 0 136 56H88V40h76.69L200 75.31Z"/></svg>
                </div>
                <p className="text-xs sm:text-sm text-white font-semibold">Upload</p>
                <p className="text-[10px] sm:text-xs text-gray-400">Notes</p>
              </div>

              {/* Arrow */}
              <svg xmlns="http://www.w3.org/2000/svg" className='w-6 sm:w-8 md:w-10 h-auto' viewBox="0 0 24 24"><rect width="24" height="24" fill="none"/><path fill="#fbff09" d="M23 11v2h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v-1h-1v-1h-1v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1v-1H1v-4h15V9h-1V8h-1V7h-1V6h-1V5h-1V4h-1V3h1V2h1V1h1v1h1v1h1v1h1v1h1v1h1v1h1v1h1v1h1v1h1v1z"/></svg>

              {/* Step 2: Flashcards */}
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl flex items-center justify-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className='w-full h-auto inline xs:mr-2' viewBox="0 0 24 24">
                    <path fill="currentColor" d="m21.47 4.35l-1.34-.56v9.03l2.43-5.86c.41-1.02-.06-2.19-1.09-2.61m-19.5 3.7L6.93 20a2.01 2.01 0 0 0 1.81 1.26c.26 0 .53-.05.79-.16l7.37-3.05c.75-.31 1.21-1.05 1.23-1.79c.01-.26-.04-.55-.13-.81L13 3.5a1.95 1.95 0 0 0-1.81-1.25c-.26 0-.52.06-.77.15L3.06 5.45a1.994 1.994 0 0 0-1.09 2.6m16.15-3.8a2 2 0 0 0-2-2h-1.45l3.45 8.34"/>
                  </svg>
                </div>
                <p className="text-xs sm:text-sm text-white font-semibold">Get</p>
                <p className="text-[10px] sm:text-xs text-gray-400">Flashcards</p>
              </div>
            </div>

            <button
              onClick={handleNext}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-lg hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              Next <ArrowRight size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>
        )}

        {/* Step 2: Show Battle Screen */}
        {step === 2 && (
          <div className="p-4 sm:p-6 md:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 text-center">
              Every correct answer deals damage!
            </h2>

            <p className="text-center text-sm sm:text-base text-gray-300 mb-4 sm:mb-6">
              Study more = Level up faster
            </p>

            {/* Mock Battle Screen */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 border border-slate-700">
              <div className="text-center mb-4">
                <div className="inline-block bg-green-500 text-white text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 rounded-full mb-2">
                  EASY
                </div>
                <div className="text-cyan-400 font-bold text-base sm:text-lg mb-2">Amnesiac Ooze</div>
                <div className="bg-red-900 h-3 sm:h-4 rounded-full overflow-hidden">
                  <div className="bg-red-500 h-full" style={{ width: '75%' }}></div>
                </div>
                <div className="text-white text-xs sm:text-sm mt-1">HP: 2250 / 3000</div>
              </div>

              <div className="bg-slate-700 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
                <div className="text-white text-center font-semibold text-sm sm:text-base mb-2">
                  What is Elon Musk's full name?
                </div>
                <div className="text-gray-400 text-center text-xs sm:text-sm">
                  Tap to reveal answer
                </div>
              </div>

              <div className="flex gap-2 justify-center">
                <button className="bg-red-600 text-white px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold hover:bg-red-700 transition">
                  ✗ Incorrect
                </button>
                <button className="bg-green-600 text-white px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold hover:bg-green-700 transition">
                  ✓ Correct
                </button>
              </div>
            </div>

      

            <button
              onClick={handleNext}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-lg hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              Next <ArrowRight size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>
        )}

        {/* Step 3: Level Up & Leaderboard */}
        {step === 3 && (
          <div className="p-4 sm:p-6 md:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 text-center">
              Level up & climb the leaderboard!
            </h2>

            <p className="text-center text-sm sm:text-base text-gray-300 mb-4 sm:mb-6">
              Compete with students worldwide
            </p>

            {/* Character Leveling Section */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 border border-slate-700">
              <div className="flex flex-col items-center mb-4 sm:mb-6">
                {/* Avatar */}
                <div className="transform scale-90 sm:scale-100">
                  <AvatarWithPlatform
                    avatar={currentUser?.avatar}
                    displayName={currentUser?.displayName}
                    tier={currentUser?.tier}
                    streak={1}
                    size="large"
                  />
                </div>

                {/* Character Info */}
                <p className="text-white font-semibold mb-1 text-sm sm:text-base">
                  {'You'}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-400 mb-3 sm:mb-4">Lvl 1 - Novice</p>

                {/* Animated EXP Bar */}
                <div className="w-full max-w-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] sm:text-xs text-gray-400">Experience</span>
                    <span className="text-[10px] sm:text-xs text-yellow-400">0 / 100 XP</span>
                  </div>
                  <div className="w-full bg-slate-700 h-3 sm:h-4 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 transition-all duration-[3000ms] ease-out"
                      style={{ 
                        width: step === 3 ? '60%' : '0%',
                        animation: step === 3 ? 'fillExp 3s ease-out forwards' : 'none'
                      }}
                    ></div>
                  </div>
                  <p className="text-center text-[10px] sm:text-xs text-green-400 mt-2 animate-fade-in">
                    +60 XP from studying!
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-3 sm:pt-4">
                {/* Mock Leaderboard */}
                <div className="text-center mb-2 sm:mb-3">
                  <div className="text-purple-400 font-semibold text-xs sm:text-sm mb-2 sm:mb-3">Global Leaderboard</div>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <div className="bg-yellow-600/20 border border-yellow-600/50 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="text-yellow-400 text-xs sm:text-sm font-bold">🥇 1</span>
                      <span className="text-white text-xs sm:text-sm">StudyMaster</span>
                    </div>
                    <span className="text-yellow-400 text-xs sm:text-sm font-bold">2,450 XP</span>
                  </div>

                  <div className="bg-slate-700/50 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="text-gray-400 text-xs sm:text-sm">🥈 2</span>
                      <span className="text-white text-xs sm:text-sm">BrainPower</span>
                    </div>
                    <span className="text-gray-300 text-xs sm:text-sm">2,100 XP</span>
                  </div>

                  <div className="bg-purple-600/30 border-2 border-purple-500 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 flex items-center justify-between animate-pulse-subtle">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="text-purple-400 text-xs sm:text-sm font-bold">→ 47</span>
                      <span className="text-white text-xs sm:text-sm font-semibold">You</span>
                    </div>
                    <span className="text-purple-400 text-xs sm:text-sm font-bold">60 XP</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleNext}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-lg hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              Start Climbing! <ArrowRight size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>
        )}

        {/* Step 4: The Action (Upload) */}
        {step === 4 && (
          <div className="p-4 sm:p-6 md:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white mt-4 mb-2 text-center">
              Upload your first study material
            </h2>

            <FileUpload />
          </div>
        )}

        {/* Progress Dots */}
        <div className="flex justify-center gap-1.5 sm:gap-2 pb-4 sm:pb-6">
          {[1, 2, 3, 4].map((dot) => (
            <div
              key={dot}
              className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all ${
                step === dot ? 'bg-purple-500 w-4 sm:w-6' : 'bg-gray-600'
              }`}
            />
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default QuickTutorial;