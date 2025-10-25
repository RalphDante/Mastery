import { Check } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

function GoPremium() {
  const {authUser, signIn} = useAuth();
  const [paddleLoaded, setPaddleLoaded] = useState(false);
  const [masteryStudyProMonthlyPrice, setMasteryStudyProMonthlyPrice] = useState('$4.99');
  const [masteryStudyProYearlyPrice, setMasteryStudyProYearlyPrice] = useState('$39.99');
  const [selectedPlan, setSelectedPlan] = useState('annual'); // For mobile toggle

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
      : import.meta.env.VITE_SANDBOX_PADDLE_PRICE_PRO_YEARLY
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
      openCheckout(priceId, plan);
    }
  }, [authUser]);

  const openCheckout = useCallback(async (priceId, planName) => {
    if (!paddleLoaded) return;
    if (!authUser) {
      const currentUrl = window.location.href;
      const checkoutUrl = `${currentUrl}?startCheckout=true&plan=${planName}&priceId=${priceId}`;
      localStorage.setItem("postLoginCheckout", checkoutUrl);
      await signIn();
      return;
    }
    window.Paddle.Checkout.open({
      items: [{ quantity: 1, priceId }],
      customer: { email: authUser.email },
      customData: { plan: planName, userId: authUser.uid, userEmail: authUser.email },
      successCallback: () => { window.location.href = "/premium-success"; },
      closeCallback: () => console.log("Checkout closed"),
      errorCallback: (e) => console.error("Checkout error:", e),
    });
  }, [authUser, paddleLoaded, signIn]);

  const FeatureList = () => (
    <ul className="space-y-3 text-sm text-left">
      <li className="flex items-start">
        <Check className="w-4 h-4 mr-2 text-green-400 mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-medium">Unlimited AI generations</div>
          <div className="text-gray-500 text-xs">
            So you can turn any content into flashcards instantly, which means 
            no more wasted weekends manually typing cards
          </div>
        </div>
      </li>
      <li className="flex items-start">
        <Check className="w-4 h-4 mr-2 text-green-400 mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-medium">Unlimited cards</div>
          <div className="text-gray-500 text-xs">
            So you can build complete study libraries for every subject, which means 
            you'll never have to choose between classes or delete old decks
          </div>
        </div>
      </li>
      <li className="flex items-start">
        <Check className="w-4 h-4 mr-2 text-green-400 mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-medium">Unlimited decks</div>
          <div className="text-gray-500 text-xs">
            So you can organize every class and topic perfectly, which means 
            you'll actually know where everything is when exam season hits
          </div>
        </div>
      </li>
      <li className="flex items-start">
        <Check className="w-4 h-4 mr-2 text-green-400 mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-medium">Unlimited folders</div>
          <div className="text-gray-500 text-xs">
            So you can keep everything organized from day one, which means 
            your entire degree stays in one place from freshman year to graduation
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
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-violet-400 via-purple-400 to-white bg-clip-text text-transparent px-2">
            Study Smarter for Less Than a Coffee Per Week
          </h1>
        </div>
        
        {/* Mobile Toggle - Only visible on mobile */}
        <div className="md:hidden flex justify-center mb-6">
          <div className="bg-white/10 backdrop-blur-sm p-1 rounded-full inline-flex">
            <button
              onClick={() => setSelectedPlan('annual')}
              className={`px-6 py-2 rounded-full font-semibold text-sm transition-all ${
                selectedPlan === 'annual'
                  ? 'bg-yellow-400 text-black'
                  : 'text-violet-200 hover:text-white'
              }`}
            >
              Annual (Save 33%)
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
            {/* Annual Card */}
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
              <div className="bg-white rounded-2xl p-6 text-gray-800 shadow-xl">
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

        {/* Bridge Copy + Testimonial */}
        <div className="max-w-3xl mx-auto mb-8 sm:mb-10">
          <div className="text-center mb-4 sm:mb-6 px-2">
            <p className="text-violet-200 text-base sm:text-lg leading-relaxed">
              You may have noticed other study apps charge $6, $8, even $10 per month. 
              I don't think that's right. Students are already broke enough.
            </p>
            <p className="text-violet-300 text-sm sm:text-base mt-3">
              But don't just take my word for it. Here's what Cheng Han, a Pro user, had to say:
            </p>
          </div>

          <div className="bg-gradient-to-r from-violet-50 to-purple-50 border-2 border-violet-200 rounded-2xl p-4 sm:p-6">
            <div className="flex items-start space-x-3 sm:space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-violet-200 rounded-full flex items-center justify-center">
                  <span className="text-lg sm:text-xl font-bold text-violet-700">CH</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-800 italic mb-2 sm:mb-3 text-sm sm:text-base leading-relaxed">
                  "I have a lot of modules and I'm tired of spending too much time on 
                  <span className="font-semibold"> consumption without having enough for the digestion phase</span>. 
                  Mastery does a really good job of extracting the right information to test my active recall. 
                  <span className="font-semibold"> I finally found something that actually works for my learning style.</span>"
                </p>
                <div className="flex items-center space-x-2">
                  <span className="text-xs sm:text-sm font-semibold text-violet-700">Cheng Han</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-xs sm:text-sm text-gray-600">Pro User</span>
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
                If Mastery doesn't help you study faster, remember more, and actually enjoy learning in the next 30 days, 
                I'll refund every penny. No questions asked. No hard feelings.
              </p>
            </div>
          </div>
        </div>

        {/* P.S. Section */}
        <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
          <div className="bg-gradient-to-r from-violet-50 to-purple-50 border-2 border-violet-200 rounded-xl p-4 sm:p-6">
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