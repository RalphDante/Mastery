// LimitReachedModal.jsx
import { X } from 'lucide-react';
import { useState } from 'react';
import { openCheckout, priceIds } from '../../utils/checkout';
import { useAuth } from '../../hooks/useAuth';

function LimitReachedModal({ limitType, onClose }) {
  const [showMonthly, setShowMonthly] = useState(false);
  const [showModal, setShowModal] = useState(true);
  const { authUser, signIn } = useAuth();

  const messages = {
      cards: {
          title: "You Hit 100 Cards!",
          emoji: "💯",
          subtitle: "You're on fire with studying"
      },
      decks: {
          title: "You Hit 5 Decks!",
          emoji: "🎯",
          subtitle: "You're building something great"
      },
      folders: {
          title: "You Hit Your Folder Limit!",
          emoji: "📁",
          subtitle: "Time to level up your organization"
      },
      ai: {
          title: "You Hit Your AI Limit!",
          emoji: "🤖",
          subtitle: "You've been crushing it with AI generations"
      },
      regenerate: {  // NEW
          title: "Unlock Unlimited Regenerations!",
          emoji: "🔄",
          subtitle: "Get perfect flashcards every time"
      },
      party: {  // NEW
          title: "Unlock Private Parties!",
          emoji: "👥",
          subtitle: "Decide who deserves to join your party"
      },
      streak: {  // ✅ ADD THIS
          title: "Your Streak is at Risk!",
          emoji: "⚠️",
          subtitle: "Protect your progress with Pro"
      },
        analytics: {
        title: "Unlock 30-Day Analytics!",
        emoji: "📊",
        subtitle: "See your complete monthly progress"
    }
  };

  const msg = messages[limitType] || messages.cards;

  const handleUpgrade = (planType) => {
    const priceId = planType === 'annual' ? priceIds.proYearly : priceIds.proMonthly;
    openCheckout(priceId, 'pro', authUser, signIn);
  };

  return (
    <>
    {showModal ? 

    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-0 relative shadow-2xl animate-scale-in overflow-hidden">
        {/* Close button */}
        <button 
          onClick={()=>onClose(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
        >
          <X size={24} />
        </button>

        {/* Header Section */}
        <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">
            {msg.title}
          </h2>
          <p className="text-violet-100 text-lg">
            {msg.subtitle}
          </p>
        </div>

        {/* Content Section */}
        <div className="p-6 space-y-5">
          {/* Annual Plan (Primary) */}
          <div className="relative">
            {/* Best Value Badge */}
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
              <div className="bg-yellow-400 px-4 py-1 rounded-full text-xs font-bold text-black shadow-lg">
                💎 BEST VALUE
              </div>
            </div>

            <div className="border-2 border-yellow-400 rounded-xl p-6 bg-gradient-to-br from-yellow-50 to-orange-50">
              <div className="text-center space-y-3">
                <div className="text-sm text-gray-600 font-medium">Annual Plan</div>
                
                {/* Price */}
                <div>
                  <div className="text-5xl font-bold text-gray-900">
                    $3.33
                  </div>
                  <div className="text-gray-600">/month</div>
                  <div className="text-sm text-gray-500 mt-1">
                    Billed at $39.99/year
                  </div>
                </div>

                {/* Benefits */}
                <div className="space-y-1 text-xs text-left text-gray-500 bg-white/50 rounded-lg p-3">
                <div className="font-semibold flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Turn any notes into flashcards in 15 seconds (unlimited AI)</span>
                </div>
                <div className="font-semibold flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Fight bosses with your party - accountability that actually works</span>
                </div>
                <div className="font-semibold flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Level up while studying - beats staring at boring flashcards</span>
                </div>
                </div>

                {/* CTA */}
                <button
                  onClick={() => handleUpgrade('annual')}
                  className="w-full mt-4 bg-yellow-400 mb-4 hover:bg-yellow-500
                            text-black font-bold py-3 px-6 rounded-xl 
                            transition-all hover:scale-105 shadow-lg"
                >
                  Start 7-Day Free Trial →
                </button>
              </div>
            </div>
          </div>

          {/* Monthly Option (Collapsed) */}
          <button
            onClick={() => setShowMonthly(!showMonthly)}
            className="w-full text-gray-500 hover:text-gray-700 text-sm transition-colors flex items-center justify-center gap-2"
          >
            <span>{showMonthly ? '▼' : '▶'}</span>
            <span>Or pay monthly ($4.99/mo)</span>
          </button>
          
          {showMonthly && (
            <div className="border-2 border-gray-200 rounded-xl p-5 bg-gray-50">
              <div className="text-center space-y-3">
                <div className="text-4xl font-bold text-gray-900">$4.99</div>
                <div className="text-gray-600 text-sm">/month</div>
                <div className="text-gray-500 text-xs">
                  No free trial • Cancel anytime
                </div>
                <button
                  onClick={() => handleUpgrade('monthly')}
                  className="w-full bg-violet-600 hover:bg-violet-700
                             text-white font-semibold py-3 px-6 rounded-xl 
                             transition-all"
                >
                  Choose Monthly
                </button>
              </div>
            </div>
          )}

          {/* Guarantee */}
          <div className="text-center text-xs text-gray-500">
            💳 Cancel anytime during trial, no charge
          </div>
        </div>
      </div>
    </div>
    : <>
    </>
    }
    </>

  );
}

export default LimitReachedModal;