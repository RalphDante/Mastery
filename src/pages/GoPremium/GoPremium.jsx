import { Check, Star, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import MonthlyPricingCard from './MonthlyPricingCard';

function GoPremium() {
  const {authUser, signIn} = useAuth();
  const [paddleLoaded, setPaddleLoaded] = useState(false);
  const [masteryStudyProMonthlyPrice, setMasteryStudyProMonthlyPrice] = useState('$4.99');
  const [masteryStudyProYearlyPrice, setMasteryStudyProYearlyPrice] = useState('$39.99');
  const [billingCycle, setBillingCycle] = useState('year'); // Default to annual for better conversion
  const [showFeatures, setShowFeatures] = useState(false);

  const env = import.meta.env.VITE_PADDLE_ENVIRONMENT || "sandbox";

  // Product ID
  const masteryStudyPro = env === "production" 
    ? import.meta.env.VITE_PADDLE_PRODUCT_ID
    : import.meta.env.VITE_SANDBOX_PADDLE_PRODUCT_ID
  
  // Price IDs - only Pro tier now
  const priceIds = {
    proMonthly: env === "production" 
      ? import.meta.env.VITE_PADDLE_PRICE_PRO_MONTHLY 
      : import.meta.env.VITE_SANDBOX_PADDLE_PRICE_PRO_MONTHLY,
    proYearly: env === "production" 
      ? import.meta.env.VITE_PADDLE_PRICE_PRO_YEARLY
      : import.meta.env.VITE_SANDBOX_PADDLE_PRICE_PRO_YEARLY
  };

  const monthItems = [{
    quantity: 1,
    priceId: priceIds.proMonthly,
  }];
  
  const yearItems = [{
    quantity: 1,
    priceId: priceIds.proYearly,
  }];

  // Load Paddle SDK
  useEffect(() => {
    const loadPaddleScript = () => {
      if (document.querySelector('script[src*="paddle"]')) {
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
      script.async = true;
      script.onload = () => {
        initializePaddle();
      };
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
      getPrices(billingCycle);
    }
  }, [paddleLoaded, billingCycle]);

  const initializePaddle = () => {
    try {
      const environment = import.meta.env.VITE_PADDLE_ENVIRONMENT || "sandbox";
      const token = environment === "production"
      ? import.meta.env.VITE_PADDLE_TOKEN :
        import.meta.env.VITE_SANDBOX_PADDLE_TOKEN;

      window.Paddle.Environment.set(environment);
      window.Paddle.Initialize({ token: token });
      
      setPaddleLoaded(true);
    } catch (error) {
      console.error('Failed to initialize Paddle:', error);
    }
  };

  const getPrices = (cycle) => {
    if (!paddleLoaded) {
      console.error('Paddle not loaded yet');
      return;
    }

    const itemsList = cycle === "month" ? monthItems : yearItems;  
    const request = {
      items: itemsList
    };
    
    window.Paddle.PricePreview(request)
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
      .catch((error) => {
        console.error('Price preview error:', error);
      });
  };

  useEffect(() => {
  const checkoutData = localStorage.getItem("postLoginCheckout");
  if (authUser && checkoutData) {
    localStorage.removeItem("postLoginCheckout");
    const url = new URL(checkoutData);
    const plan = url.searchParams.get("plan");
    const priceId = url.searchParams.get("priceId");
    openCheckout(priceId, plan); // continue checkout!
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

  return (
    <div className="min-h-screen text-white">
      {/* Minimal Header */}
      <nav className="relative z-10 flex justify-between items-center p-3 max-w-7xl mx-auto" role="navigation" aria-label="Main navigation">
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

      <div className="max-w-4xl mx-auto px-6 py-0">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h2 className="text-5xl md:text-6xl font-bold mb-4 pb-3 bg-gradient-to-r from-violet-400 to-white bg-clip-text text-transparent">
            Start studying like a top 1 Dean's Lister
          </h2>
        
        </div>

        {/* Pricing Cards - Quizlet Style */}
        <div className="grid md:grid-cols-2 gap-6 mb-12 max-w-3xl mx-auto">
          {/* Annual - Best Deal */}
          <div className="bg-white rounded-2xl p-8 text-gray-800 relative shadow-xl">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <div className="bg-yellow-400 px-4 py-1 rounded-full text-sm font-bold text-black">
                Best deal
              </div>
            </div>
            
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-4">Annual</h3>
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
                Start your free trial
              </button>
              <ul className="space-y-3 text-sm text-left">
  <li className="flex items-start">
    <Check className="w-4 h-4 mr-2 text-green-400 mt-0.5 flex-shrink-0" />
    <div>
      <div className="font-medium">Unlimited AI generations</div>
      <div className="text-gray-500 text-xs">Create flashcards for any topic without limits</div>
    </div>
  </li>
  <li className="flex items-start">
    <Check className="w-4 h-4 mr-2 text-green-400 mt-0.5 flex-shrink-0" />
    <div>
      <div className="font-medium">Unlimited cards</div>
      <div className="text-gray-500 text-xs">Build comprehensive study libraries for all subjects</div>
    </div>
  </li>
  <li className="flex items-start">
    <Check className="w-4 h-4 mr-2 text-green-400 mt-0.5 flex-shrink-0" />
    <div>
      <div className="font-medium">Unlimited decks</div>
      <div className="text-gray-500 text-xs">Organize every class and topic perfectly</div>
    </div>
  </li>
 
  <li className="flex items-start">
    <Check className="w-4 h-4 mr-2 text-green-400 mt-0.5 flex-shrink-0" />
    <div>
      <div className="font-medium">Unlimited folders</div>
      <div className="text-gray-500 text-xs">Keep everything organized from freshman year to graduation</div>
    </div>
  </li>
</ul>
            </div>
          </div>

          {/* Monthly */}
          {/* <MonthlyPricingCard 
           priceIds={priceIds}
           openCheckout={openCheckout}
          
          /> */}
          <div className="bg-white rounded-2xl p-8 text-gray-800 shadow-lg">
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-4">Monthly</h3>
              <div className="mb-4">
                <div className="text-sm text-gray-600 mb-1">Billed today at</div>
                <div className="text-5xl font-bold text-black mb-1">{masteryStudyProMonthlyPrice}</div>
                <div className="text-lg text-gray-600">/month</div>
              </div>
              <div className="text-sm text-gray-600 mb-6">Recurring billing. Cancel anytime.</div>
              <button 
                className="w-full py-4 px-6 bg-gray-100 mb-4 hover:bg-gray-200 border-2 border-gray-300 rounded-xl font-bold text-lg transition-all text-black"
                onClick={() => openCheckout(priceIds.proMonthly, 'pro')}
              >
                Get Mastery Pro
              </button>
<ul className="space-y-3 text-sm text-left">
  <li className="flex items-start">
    <Check className="w-4 h-4 mr-2 text-green-400 mt-0.5 flex-shrink-0" />
    <div>
      <div className="font-medium">Unlimited AI generations</div>
      <div className="text-gray-500 text-xs">Create flashcards for any topic without limits</div>
    </div>
  </li>
  <li className="flex items-start">
    <Check className="w-4 h-4 mr-2 text-green-400 mt-0.5 flex-shrink-0" />
    <div>
      <div className="font-medium">Unlimited cards</div>
      <div className="text-gray-500 text-xs">Build comprehensive study libraries for all subjects</div>
    </div>
  </li>
  <li className="flex items-start">
    <Check className="w-4 h-4 mr-2 text-green-400 mt-0.5 flex-shrink-0" />
    <div>
      <div className="font-medium">Unlimited decks</div>
      <div className="text-gray-500 text-xs">Organize every class and topic perfectly</div>
    </div>
  </li>
 
  <li className="flex items-start">
    <Check className="w-4 h-4 mr-2 text-green-400 mt-0.5 flex-shrink-0" />
    <div>
      <div className="font-medium">Unlimited folders</div>
      <div className="text-gray-500 text-xs">Keep everything organized from freshman year to graduation</div>
    </div>
  </li>
</ul>
            </div>
          </div>
        </div>

        {/* What's Included - Expandable */}
        {/* <div className="text-center mb-12">
          <button 
            className="flex items-center justify-center mx-auto text-violet-300 hover:text-white transition-colors"
            onClick={() => setShowFeatures(!showFeatures)}
          >
            <span className="mr-2">What's included?</span>
            {showFeatures ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          
          {showFeatures && (
            <div className="mt-6 grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              <div className="bg-white/5 p-6 rounded-xl border border-violet-500/20">
                <div className="flex items-center mb-4">
                  <Zap className="w-6 h-6 text-violet-400 mr-2" />
                  <h3 className="text-xl font-bold">Basic (Free)</h3>
                </div>
                <ul className="space-y-2 text-sm text-left">
                  <li className="flex items-center">
                    <Check className="w-4 h-4 mr-2 text-green-400" />
                    20 AI generations/month
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 mr-2 text-green-400" />
                    100 total cards
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 mr-2 text-green-400" />
                    5 decks max
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 mr-2 text-green-400" />
                    2 Smart Review decks
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 mr-2 text-green-400" />
                    10 folders max
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-violet-500/20 to-purple-600/20 p-6 rounded-xl border border-violet-400">
                <div className="flex items-center mb-4">
                  <Star className="w-6 h-6 text-yellow-400 mr-2" />
                  <h3 className="text-xl font-bold">Pro</h3>
                </div>
                <ul className="space-y-2 text-sm text-left">
                  <li className="flex items-center">
                    <Check className="w-4 h-4 mr-2 text-green-400" />
                    Unlimited AI generations
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 mr-2 text-green-400" />
                    Unlimited cards
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 mr-2 text-green-400" />
                    Unlimited decks
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 mr-2 text-green-400" />
                    Unlimited Smart Review decks
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 mr-2 text-green-400" />
                    Unlimited folders
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div> */}

        {/* Social Proof */}
        <div className="text-center mb-12">
          {/* <div className="flex items-center justify-center mb-6">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-6 h-6 text-yellow-400 fill-current" />
            ))}
            <span className="ml-3 text-lg text-violet-300">4.9/5 from 2,847 reviews</span>
          </div> */}
          
          {/* <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white/5 p-6 rounded-xl border border-violet-500/20">
              <p className="text-sm mb-3">"Mastery helped me ace my finals. The spaced repetition is game-changing!"</p>
              <div className="text-violet-300 text-sm font-semibold">- Sarah, MIT</div>
            </div>
            <div className="bg-white/5 p-6 rounded-xl border border-violet-500/20">
              <p className="text-sm mb-3">"Finally a flashcard app that actually understands how I learn."</p>
              <div className="text-violet-300 text-sm font-semibold">- Marcus, Stanford</div>
            </div>
            <div className="bg-white/5 p-6 rounded-xl border border-violet-500/20">
              <p className="text-sm mb-3">"The annual plan paid for itself after my first semester. Best investment!"</p>
              <div className="text-violet-300 text-sm font-semibold">- Elena, Harvard</div>
            </div>
          </div> */}
        </div>


        {/* Alternative Option 2 - Clean card style */}
        {/* Risk Reduction - Card Style */}
        <div className="bg-white rounded-xl p-6 mb-8 shadow-sm">
          <div className="flex items-start">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-gray-800">
              <h3 className="font-semibold text-lg mb-1">30-Day Money-Back Guarantee</h3>
              <p className="text-gray-600 text-sm">
                Try risk-free. Not satisfied? Get a full refund within 30 days of your first payment.
              </p>
            </div>
          </div>
        </div>

        {/* Urgency Element - Card Style */}
        {/* <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-4 text-center">
          <p className="text-violet-800 font-medium">
            <span className="inline-block w-2 h-2 bg-violet-500 rounded-full mr-2"></span>
            Limited time: Save $20/year with annual billing
          </p>
          <p className="text-violet-600 text-sm mt-1">
            Join 10,000+ students studying smarter
          </p>
        </div> */}
      </div>
    </div>
  );
}

export default GoPremium;