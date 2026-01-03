import { Check } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import AnnualDiscountCard from './AnnualDiscountCard';

function GoPremium() {
  const {authUser, signIn} = useAuth();
  const [paddleLoaded, setPaddleLoaded] = useState(false);
  const [masteryStudyProMonthlyPrice, setMasteryStudyProMonthlyPrice] = useState('$4.99');
  const [masteryStudyProYearlyPrice, setMasteryStudyProYearlyPrice] = useState('$39.99');
  const [selectedPlan, setSelectedPlan] = useState('annual'); // For mobile toggle

  // a state to control when to show the offer
  const [showNewYearOffer, setShowNewYearOffer] = useState(true);

  const env = import.meta.env.VITE_PADDLE_ENVIRONMENT || "sandbox";

  const masteryStudyPro = env === "production" 
    ? import.meta.env.VITE_PADDLE_PRODUCT_ID
    : import.meta.env.VITE_SANDBOX_PADDLE_PRODUCT_ID
  
  const priceIds = {
    proMonthly: env === "production" 
      ? import.meta.env.VITE_PADDLE_PRICE_PRO_MONTHLY 
      : import.meta.env.VITE_SANDBOX_PADDLE_PRICE_PRO_MONTHLY,
    proYearly: env === "production" 
      ? import.meta.env.VITE_PADDLE_PRICE_PRO_YEARLY
      : import.meta.env.VITE_SANDBOX_PADDLE_PRICE_PRO_YEARLY,
  };

  const monthItems = [{ quantity: 1, priceId: priceIds.proMonthly }];
  const yearItems = [{ quantity: 1, priceId: priceIds.proYearly }];

  useEffect(() => {
    const loadPaddleScript = () => {
      if (document.querySelector('script[src*="paddle"]')) return;
      const script = document.createElement('script');
      script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
      script.async = true;
      script.onload = () => initializePaddle();
      document.head.appendChild(script);
    };

    if (window.Paddle) {
      initializePaddle();
    } else {
      loadPaddleScript();
    }
  }, []);

  useEffect(() => {
    if (paddleLoaded) {
      getPrices('month');
      getPrices('year');
    }
  }, [paddleLoaded]);

  const initializePaddle = () => {
    try {
      const environment = import.meta.env.VITE_PADDLE_ENVIRONMENT || "sandbox";
      const token = environment === "production"
        ? import.meta.env.VITE_PADDLE_TOKEN
        : import.meta.env.VITE_SANDBOX_PADDLE_TOKEN;
      window.Paddle.Environment.set(environment);
      window.Paddle.Initialize({ token: token });
      setPaddleLoaded(true);
    } catch (error) {
      console.error('Failed to initialize Paddle:', error);
    }
  };

  const getPrices = (cycle) => {
    if (!paddleLoaded) return;
    const itemsList = cycle === "month" ? monthItems : yearItems;  
    window.Paddle.PricePreview({ items: itemsList })
      .then((result) => {
        const items = result.data.details.lineItems;
        items.forEach(item => {
          if (item.product.id === masteryStudyPro) {
            if (cycle === 'month') {
              setMasteryStudyProMonthlyPrice(item.formattedTotals.total);
            } else {
              setMasteryStudyProYearlyPrice(item.formattedTotals.total);
            }
          }
        });
      })
      .catch((error) => console.error('Price preview error:', error));
  };

  useEffect(() => {
    const checkoutData = localStorage.getItem("postLoginCheckout");
    if (authUser && checkoutData) {
      localStorage.removeItem("postLoginCheckout");
      const url = new URL(checkoutData);
      const plan = url.searchParams.get("plan");
      const priceId = url.searchParams.get("priceId");
      const discount = url.searchParams.get("discount");
      openCheckout(priceId, plan, discount);
    }
  }, [authUser]);

  const openCheckout = useCallback(async (priceId, planName, discountCode = null) => {
    if (!paddleLoaded) return;
    if (!authUser) {
      const currentUrl = window.location.href;
      const checkoutUrl = `${currentUrl}?startCheckout=true&plan=${planName}&priceId=${priceId}${discountCode ? `&discount=${discountCode}` : ''}`;
      localStorage.setItem("postLoginCheckout", checkoutUrl);
      await signIn();
      return;
    }
    
    const checkoutConfig = {
      items: [{ quantity: 1, priceId }],
      customer: { email: authUser.email },
      customData: { plan: planName, userId: authUser.uid, userEmail: authUser.email },
      settings: {
        successUrl: `${window.location.origin}/welcome-pro`,
      },
      closeCallback: () => console.log("Checkout closed"),
    };
  
    // Add discount code if provided
    if (discountCode) {
      checkoutConfig.discountCode = discountCode;
    }
  
    window.Paddle.Checkout.open(checkoutConfig);
  }, [authUser, paddleLoaded, signIn]);

  const FeatureList = () => (
    <ul className="space-y-3 text-sm text-left">
      <li className="flex items-start">
        <Check className="w-4 h-4 mr-2 text-green-400 mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-medium">Dominate The Leaderboard</div>
          <div className="text-gray-500 text-xs">
            Pro members earn 2x XP from every study session. While free users grind, 
            you're already #1. Your Pro badge and animated avatar make sure everyone knows it.
          </div>
        </div>
      </li>
      
      <li className="flex items-start">
        <Check className="w-4 h-4 mr-2 text-green-400 mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-medium">Never Run Out When It Matters Most</div>
          <div className="text-gray-500 text-xs">
            Free users get 5 AI generations per month - that's maybe 2 lectures. 
            Pro users turn every single class into flashcards instantly. No more choosing.
          </div>
        </div>
      </li>
      
      <li className="flex items-start">
        <Check className="w-4 h-4 mr-2 text-green-400 mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-medium">Build Your Private Study Squad</div>
          <div className="text-gray-500 text-xs">
            Create private parties with your friends, unlock premium bosses, and track 
            your group's progress. Free users can only join public parties.
          </div>
        </div>
      </li>
      
      <li className="flex items-start">
        <Check className="w-4 h-4 mr-2 text-green-400 mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-medium">Unlimited Everything</div>
          <div className="text-gray-500 text-xs">
            Free: 100 cards, 5 decks (you'll hit this in week 1). 
            Pro: Unlimited cards, decks, and folders - your entire degree in one place.
          </div>
        </div>
      </li>
      
      <li className="flex items-start">
        <Check className="w-4 h-4 mr-2 text-green-400 mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-medium">30-Day Analytics & Streak Protection</div>
          <div className="text-gray-500 text-xs">
            See your complete study history, boss defeats, and level progression. 
            Free users only see 7 days and have no streak protection.
          </div>
        </div>
      </li>
      
      <li className="flex items-start">
        <Check className="w-4 h-4 mr-2 text-green-400 mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-medium">Ad-Free Studying</div>
          <div className="text-gray-500 text-xs">
            Focus on your work without interruptions. Free users see ads after every timer session.
          </div>
        </div>
      </li>
    </ul>
  );

  return (
    <div className="min-h-screen text-white">
      <nav className="relative z-10 flex justify-between items-center p-3 max-w-7xl mx-auto">
        <div className="flex items-center space-x-2">
          <img 
            src="/images/brain-21.svg" 
            alt="Mastery AI Flashcard Generator Logo"
            className="w-9 h-9"
            width="36"
            height="36"
          />
          <span className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            Mastery
          </span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Hero Section */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 bg-gradient-to-r from-violet-400 via-purple-400 to-white bg-clip-text text-transparent px-2 leading-tight">
            Gain A Positively Unfair Advantage In School and Life
          </h1>
          <p className="text-lg sm:text-2xl text-violet-200 font-medium mt-4">
            For less than a coffee per month
          </p>
          
          {/* Quick feature pills */}
          {/* <div className="flex flex-wrap gap-3 justify-center mt-6">
            <span className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-violet-200 border border-violet-500/30">
              🎮 RPG Mechanics
            </span>
            <span className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-violet-200 border border-violet-500/30">
              ⚡ AI Flashcards
            </span>
            <span className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-violet-200 border border-violet-500/30">
              👥 Party Mode
            </span>
          </div> */}
        </div>
                
        {/* Mobile Toggle - Only visible on mobile */}
        <div className="md:hidden flex justify-center mb-6">
          <div className="bg-white/10 backdrop-blur-sm p-1 rounded-full inline-flex">
            <button
              onClick={() => setSelectedPlan('annual')}
              className={`px-6 py-2 rounded-full font-semibold text-sm transition-all ${
                selectedPlan === 'annual'
                  ? showNewYearOffer ? 'bg-red-500' : 'bg-yellow-400 text-black'
                  : 'text-violet-200 hover:text-white'
              }`}
            >
              Annual (Save {showNewYearOffer ? '50' : '33'}%)
            </button>
            <button
              onClick={() => setSelectedPlan('monthly')}
              className={`px-6 py-2 rounded-full font-semibold text-sm transition-all ${
                selectedPlan === 'monthly'
                  ? 'bg-white text-black'
                  : 'text-violet-200 hover:text-white'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="mb-8 sm:mb-12 max-w-3xl mx-auto">
          {/* Desktop: Side by side */}
          <div className="hidden md:grid md:grid-cols-2 gap-6">
            {/* Annual Card - Show NEW YEAR OFFER or REGULAR */}
            {showNewYearOffer ? (
              // 🎉 NEW YEAR SPECIAL CARD
              <AnnualDiscountCard 
                priceIds={priceIds}
                openCheckout={openCheckout}
                FeatureList={FeatureList}
              />
            ) : (
              // REGULAR ANNUAL CARD (your existing code)
              <div className="bg-white rounded-2xl p-6 lg:p-8 text-gray-800 relative shadow-xl">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-yellow-400 px-4 py-1 rounded-full text-xs sm:text-sm font-bold text-black">
                    Best deal
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Annual</h3>
                  <div className="mb-3 sm:mb-4">
                    <div className="text-xs sm:text-sm text-gray-600 mb-1">Billed at $39.99/year, that's like</div>
                    <div className="text-4xl sm:text-5xl font-bold text-black mb-1">$3.33</div>
                    <div className="text-base sm:text-lg text-gray-600">/month</div>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">Start with free 7-day trial</div>
                  <button 
                    className="w-full py-3 sm:py-4 px-4 sm:px-6 bg-yellow-400 mb-4 hover:bg-yellow-500 rounded-xl font-bold text-base sm:text-lg transition-all text-black"
                    onClick={() => openCheckout(priceIds.proYearly, 'pro')}
                  >
                    Start My 7-Day Free Trial
                  </button>
                  <FeatureList />
                </div>
              </div>
            )}

            {/* Monthly Card */}
            <div className="bg-white rounded-2xl p-6 lg:p-8 text-gray-800 shadow-lg">
              <div className="text-center">
                <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Monthly</h3>
                <div className="mb-3 sm:mb-4">
                  <div className="text-xs sm:text-sm text-gray-600 mb-1">Billed today at</div>
                  <div className="text-4xl sm:text-5xl font-bold text-black mb-1">{masteryStudyProMonthlyPrice}</div>
                  <div className="text-base sm:text-lg text-gray-600">/month</div>
                </div>
                <div className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">Recurring billing. Cancel anytime.</div>
                <button 
                  className="w-full py-3 sm:py-4 px-4 sm:px-6 bg-gray-100 mb-4 hover:bg-gray-200 border-2 border-gray-300 rounded-xl font-bold text-base sm:text-lg transition-all text-black"
                  onClick={() => openCheckout(priceIds.proMonthly, 'pro')}
                >
                  Get Mastery Pro
                </button>
                <FeatureList />
              </div>
            </div>
          </div>

          {/* Mobile: Single card with toggle */}
          <div className="md:hidden">
            {selectedPlan === 'annual' ? (
              showNewYearOffer ? 
              <AnnualDiscountCard 
                priceIds={priceIds}
                openCheckout={openCheckout}
                FeatureList={FeatureList}
              />
              : <div className="bg-white rounded-2xl p-6 text-gray-800 shadow-xl">
                  <div className="text-center">
                    <div className="inline-block bg-yellow-400 px-4 py-1 rounded-full text-xs font-bold text-black mb-3">
                      Best deal - Save 33%
                    </div>
                    <h3 className="text-2xl font-bold mb-3">Annual</h3>
                    <div className="mb-4">
                      <div className="text-sm text-gray-600 mb-1">Billed at $39.99/year, that's like</div>
                      <div className="text-5xl font-bold text-black mb-1">$3.33</div>
                      <div className="text-lg text-gray-600">/month</div>
                    </div>
                    <div className="text-sm text-gray-600 mb-6">Start with free 7-day trial</div>
                    <button 
                      className="w-full py-4 px-6 bg-yellow-400 mb-4 hover:bg-yellow-500 rounded-xl font-bold text-lg transition-all text-black"
                      onClick={() => openCheckout(priceIds.proYearly, 'pro')}
                    >
                      Start My 7-Day Free Trial
                    </button>
                    <FeatureList />
                  </div>
                </div>
            
            
            ) : (
              <div className="bg-white rounded-2xl p-6 text-gray-800 shadow-xl">
                <div className="text-center">
                  <h3 className="text-2xl font-bold mb-3">Monthly</h3>
                  <div className="mb-4">
                    <div className="text-sm text-gray-600 mb-1">Billed today at</div>
                    <div className="text-5xl font-bold text-black mb-1">{masteryStudyProMonthlyPrice}</div>
                    <div className="text-lg text-gray-600">/month</div>
                  </div>
                  <div className="text-sm text-gray-600 mb-6">Recurring billing. Cancel anytime.</div>
                  <button 
                    className="w-full py-4 px-6 bg-gray-800 mb-4 hover:bg-gray-900 rounded-xl font-bold text-lg transition-all text-white"
                    onClick={() => openCheckout(priceIds.proMonthly, 'pro')}
                  >
                    Get Mastery Pro
                  </button>
                  <FeatureList />
                </div>
              </div>
            )}
          </div>
        </div>

        

        <div className="w-full mx-auto mb-8 sm:mb-12">
          <div className="text-center mb-6 px-2">
            <p className="text-violet-200 text-lg sm:text-xl leading-relaxed font-medium">
              Here's what Pro users are saying
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-10 mx-auto">

            {/* First Testimonial with Profile */}
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 border-2 border-violet-200 rounded-2xl p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Avatar Section */}
                <div className="flex-shrink-0">
                  <div className="relative">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 border-2 overflow-hidden bg-slate-700 border-purple-500/50">
                      <div className="knight-idle" style={{ transform: 'scale(2.5)', imageRendering: 'pixelated' }}></div>
                    </div>
                    
                    {/* Pro badge */}
                    <img
                      src="/images/icons/pro-badge.png"
                      className="absolute top-0 right-0 w-7 h-7 object-cover"
                      alt="Pro Badge"
                    />
                  </div>
                  
                  {/* Stats - Desktop */}
                  <div className="hidden sm:flex flex-col gap-1.5 mt-3 w-28">
                    <div className="text-xs font-semibold text-violet-700 mb-1">Lv.11</div>
                    
                    {/* HP Bar */}
                    <div className="flex items-center gap-1">
                      <div className="flex-1 bg-slate-700 h-2.5 relative overflow-hidden">
                        <div className="h-full bg-red-500" style={{ width: '89%' }}></div>
                      </div>
                      <span className="text-[10px] text-slate-600">89</span>
                    </div>
                    
                    {/* EXP Bar */}
                    <div className="flex items-center gap-1">
                      <div className="flex-1 bg-slate-700 h-2.5 relative overflow-hidden">
                        <div className="h-full bg-yellow-500" style={{ width: '30%' }}></div>
                      </div>
                      <span className="text-[10px] text-slate-600">30</span>
                    </div>
                    
                    {/* Mana Bar */}
                    <div className="flex items-center gap-1">
                      <div className="flex-1 bg-slate-700 h-2.5 relative overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: '100%' }}></div>
                      </div>
                      <span className="text-[10px] text-slate-600">100</span>
                    </div>
                  </div>
                </div>

                {/* Testimonial Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-violet-700">Cheng Han</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-xs text-gray-600">Pro User</span>
                  </div>
                  
                  <p className="text-gray-800 italic text-sm leading-relaxed">
                    "I have a lot of modules and I'm tired of spending too much time on 
                    <span className="font-semibold"> consumption without having enough for the digestion phase</span>. 
                    Mastery does a really good job of extracting the right information to test my active recall. 
                    <span className="font-semibold"> I finally found something that actually works for my learning style.</span>"
                  </p>
                </div>
              </div>
            </div>

            {/* Second Testimonial with Profile */}
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 border-2 border-violet-200 rounded-2xl p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Avatar Section */}
                <div className="flex-shrink-0">
                  <div className="relative">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 border-2 overflow-hidden bg-slate-700 border-purple-500/50">
                      <div className="knight-idle" style={{ transform: 'scale(2.5)', imageRendering: 'pixelated' }}></div>
                    </div>
                    
                    {/* Pro badge */}
                    <img
                      src="/images/icons/pro-badge.png"
                      className="absolute top-0 right-0 w-7 h-7 object-cover"
                      alt="Pro Badge"
                    />
                  </div>
                  
                  {/* Stats - Desktop */}
                  <div className="hidden sm:flex flex-col gap-1.5 mt-3 w-28">
                    <div className="text-xs font-semibold text-violet-700 mb-1">Lv.20</div>
                    
                    {/* HP Bar */}
                    <div className="flex items-center gap-1">
                      <div className="flex-1 bg-slate-700 h-2.5 relative overflow-hidden">
                        <div className="h-full bg-red-500" style={{ width: '92%' }}></div>
                      </div>
                      <span className="text-[10px] text-slate-600">92</span>
                    </div>
                    
                    {/* EXP Bar */}
                    <div className="flex items-center gap-1">
                      <div className="flex-1 bg-slate-700 h-2.5 relative overflow-hidden">
                        <div className="h-full bg-yellow-500" style={{ width: '40%' }}></div>
                      </div>
                      <span className="text-[10px] text-slate-600">42</span>
                    </div>
                    
                    {/* Mana Bar */}
                    <div className="flex items-center gap-1">
                      <div className="flex-1 bg-slate-700 h-2.5 relative overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: '80%' }}></div>
                      </div>
                      <span className="text-[10px] text-slate-600">80</span>
                    </div>
                  </div>
                </div>

                {/* Testimonial Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-violet-700">Kaia</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-xs text-gray-600">Early Pro User</span>
                  </div>
                  
                  <p className="text-gray-800 italic text-sm leading-relaxed">
                    "I upgraded because I figured if I support it now, it'll get super good way faster. 
                    <span className="font-semibold"> Best investment I've made for my studies.</span>"
                  </p>
                </div>
              </div>
            </div>
          </div>
      </div>

        {/* Guarantee */}
        <div className="bg-white rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-md max-w-3xl mx-auto">
          <div className="flex items-start">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-xl flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
              <Check className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
            <div className="text-gray-800 flex-1 min-w-0">
              <h3 className="font-bold text-base sm:text-lg mb-1 sm:mb-2">30-Day Money-Back Guarantee</h3>
              <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                If Mastery doesn't help you study faster, remember more, and actually enjoy working in the next 30 days, 
                I'll refund every penny. No questions asked. No hard feelings.
              </p>
            </div>
          </div>
        </div>

        {/* P.S. Section */}
        <div className="text-center w-full mx-auto mb-6 sm:mb-8">
          <div className="bg-gradient-to-r from-violet-200 to-purple-300 border-2 border-violet-200 rounded-xl p-4 sm:p-6">
            <p className="text-gray-800 font-bold text-sm sm:text-base mb-2">
              P.S. The annual plan saves you $20/year — that's 4 bubble teas or 2 movie tickets you get to keep.
            </p>
            <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
              Plus, you lock in this price before it increases. Students who upgraded last month are already 
              acing exams with half the study time. Start your 7-day free trial today.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GoPremium;