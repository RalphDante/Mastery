// pages/WelcomePro.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Confetti } from '../../components/ConfettiAndToasts';

function WelcomeProPage() {
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    // Stop confetti after 3 seconds
    const confettiTimer = setTimeout(() => {
      setShowConfetti(false);
    }, 3000);

    return () => clearTimeout(confettiTimer);
  }, []);

  return (
    <div className="min-h-screen px-4 py-12">
      {/* Confetti effect */}
      {showConfetti && (
        <Confetti />
      )}

      <div className="max-w-4xl mx-auto">
        {/* Trophy/Badge Icon */}
        <div className="text-center mb-10">
          
          <h1 className="relative text-5xl font-black mb-4 bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 text-transparent bg-clip-text drop-shadow-lg filter brightness-110">
            WELCOME TO THE CLUB!
            
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-40 mix-blend-overlay -skew-x-12 animate-shimmer pointer-events-none"></span>
            
            {/* Inner glow layer */}
            <span className="absolute inset-0 bg-gradient-to-r from-yellow-300 via-orange-400 to-pink-400 text-transparent bg-clip-text opacity-50 blur-sm -z-10 animate-pulse"></span>
            </h1>
          <h2 className="text-4xl font-bold text-white mb-6">
            You're About to Dominate
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            This is the best decision you've made all semester. While everyone else is grinding with limits, you just unlocked <span className="text-yellow-400 font-bold">god mode</span>. Here's your new arsenal:
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Benefit 1 */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border-2 border-violet-400/30 hover:border-violet-400 transition-all">
            {/* <div className="text-4xl mb-3">⚡</div> */}
            <h3 className="text-2xl font-bold text-white mb-2">
              Never Run Out of Ammo
            </h3>
            <p className="text-violet-200 mb-3">
              <span className="line-through opacity-60">Free: 5 AI generations/month</span>
            </p>
            <p className="text-yellow-300 font-semibold">
              Pro: Unlimited AI generations. Turn every single lecture, textbook chapter, and study guide into flashcards. No limits, ever.
            </p>
          </div>

          {/* Benefit 2 */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border-2 border-violet-400/30 hover:border-violet-400 transition-all">
            {/* <div className="text-4xl mb-3">📚</div> */}
            <h3 className="text-2xl font-bold text-white mb-2">
              Build Your Study Empire
            </h3>
            <p className="text-violet-200 mb-3">
              <span className="line-through opacity-60">Free: 100 cards, 5 decks, 10 folders</span>
            </p>
            <p className="text-yellow-300 font-semibold">
              Pro: Unlimited cards, decks, and folders. Your entire degree organized exactly how you want it.
            </p>
          </div>

          {/* Benefit 3 */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border-2 border-violet-400/30 hover:border-violet-400 transition-all">
            {/* <div className="text-4xl mb-3">👑</div> */}
            <h3 className="text-2xl font-bold text-white mb-2">
              You've Received the PRO Badge
            </h3>
            <p className="text-violet-200 mb-3">
              A badge given to those who are committed to learning. Your name now shines with a golden outline on all leaderboards.
            </p>
            
            {/* Visual Preview */}
            <div className="bg-gradient-to-r from-purple-800/40 to-transparent border-2 border-yellow-500/70 rounded-xl p-3 mt-3">
              <div className="flex items-center gap-3">
                <div className="text-yellow-400 font-semibold text-sm">🏆 #1</div>
                <div className="relative flex-shrink-0">
                  <img
                    src="/images/premium-avatars/knight-idle.gif"
                    alt="Your Avatar"
                    className="w-12 h-12 object-cover rounded-full border-2 border-slate-600"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <img
                    src="/images/icons/pro-badge.png"
                    alt="PRO"
                    className="absolute -top-1 -right-2 w-6 h-6 object-contain drop-shadow-md"
                  />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">You</p>
                  <p className="text-xs text-slate-400">Level 25</p>
                </div>
                <span className="text-purple-300 font-semibold">309</span>
              </div>
            </div>
            <p className="text-yellow-300 font-semibold text-sm mt-2 text-center">
                This is how you'll appear
            </p>
          </div>

          {/* Benefit 4 */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border-2 border-violet-400/30 hover:border-violet-400 transition-all">
            {/* <div className="text-4xl mb-3">🎭</div> */}
            <h3 className="text-2xl font-bold text-white mb-2">
              Animated Avatars Unlocked
            </h3>
            <p className="text-violet-200 mb-3">
              Access premium animated avatars. Make your character actually move and look alive while you're crushing bosses.
            </p>
            <div className="flex items-center gap-3 mt-3">
              <img 
                src="/images/premium-avatars/knight-idle.gif" 
                alt="Animated Knight" 
                className="w-16 h-16 border-2 border-yellow-400 rounded"
                style={{ imageRendering: 'pixelated' }}
              />
              <span className="text-yellow-300 font-semibold text-sm">Premium avatars = Premium player</span>
            </div>
          </div>
        </div>

        {/* Bottom reminder */}
        <div className="text-center mb-10">
          <p className="text-gray-400 text-lg italic mb-8">
            You still get all the RPG features everyone loves — leveling up, fighting bosses, party mode with friends. You just removed every single limit holding you back. While they're playing on easy mode with training wheels, you're playing on <span className="text-yellow-400 font-bold not-italic">unrestricted mode</span>.
          </p>

          {/* CTA */}
          <button
            onClick={() => {window.location.href = '/';}}
            className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white px-12 py-4 rounded-xl font-bold text-lg transition-all shadow-2xl transform hover:scale-105"
          >
            Start Your Domination →
          </button>

          <p className="text-white text-lg mt-6 font-medium">
            Your Pro powers are <span className="text-green-400 font-bold">LIVE RIGHT NOW</span>. No waiting. No setup. Go create unlimited decks. Generate infinite flashcards. Outpace everyone. You're about to have the most fun studying you've ever had.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-fall {
          animation: fall 3s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default WelcomeProPage;