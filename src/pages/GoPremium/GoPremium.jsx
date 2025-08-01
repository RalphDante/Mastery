import { Check, Star, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

function GoPremium() {
  const { authUser } = useAuth();
  const [paddleLoaded, setPaddleLoaded] = useState(false);
  const [masteryStudyProMonthlyPrice, setMasteryStudyProMonthlyPrice] = useState('$4.99');
  const [masteryStudyProYearlyPrice, setMasteryStudyProYearlyPrice] = useState('$39.99');
  const [billingCycle, setBillingCycle] = useState('year'); // Default to annual

  // Product ID
  const masteryStudyPro = 'pro_01k1f8yahfd3b9xpm4ksbszm0n';
  
  // Price IDs - only Pro tier now
  const priceIds = {
    proMonthly: 'pri_01k1f95ne00eje36z837qhzm0q',
    proYearly: 'pri_01k1fh6p0sgsvxm5s1cregrygr'
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
      window.Paddle.Environment.set("sandbox");
      window.Paddle.Initialize({ 
        token: "test_af4c89d11014f71659ef8484c82"
      });
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

  const openCheckout = (priceId, planName) => {
    if (!paddleLoaded) {
      console.error('Paddle not loaded yet');
      return;
    }

    const items = [{
      quantity: 1,
      priceId: priceId,
    }];

    window.Paddle.Checkout.open({
      items: items,
      customer: {
        email: authUser?.email || 'customer@example.com'
      },
      customData: {
        plan: planName
      }
    });
  };

  return (
    <div className="min-h-screen text-white">
      {/* Minimal Header */}
      <div className="flex justify-between items-center p-6">
        <h1 className="text-2xl font-bold text-violet-300">Mastery</h1>
        <div className="text-sm text-violet-300/70">raprapdante75</div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-0">
        {/* Hero Section */}
        <div className="text-center mb-4">
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-violet-400 to-white bg-clip-text text-transparent">
            Unlock Your Learning
            <br />Potential
          </h2>
        </div>

        {/* Billing Cycle Toggle - Annual First */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/10 p-1 rounded-lg border border-violet-500/30">
            <button 
              className={`px-6 py-2 rounded-md transition-all ${billingCycle === 'year' ? 'bg-violet-600 text-white' : 'text-violet-300'}`}
              onClick={() => setBillingCycle('year')}
            >
              Annually
              <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded-full">SAVE 33%</span>
            </button>
            <button 
              className={`px-6 py-2 rounded-md transition-all ${billingCycle === 'month' ? 'bg-violet-600 text-white' : 'text-violet-300'}`}
              onClick={() => setBillingCycle('month')}
            >
              Monthly
            </button>
          </div>
        </div>

        {/* Pricing Cards - Only Free and Pro */}
        <div className="grid md:grid-cols-2 gap-8 mb-16 max-w-4xl mx-auto">
          {/* Basic */}
          <div className="bg-white/5 p-8 rounded-2xl border border-violet-500/20 relative">
            <div className="flex items-center mb-4">
              <Zap className="w-6 h-6 text-violet-400 mr-2" />
              <h3 className="text-2xl font-bold">Basic</h3>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-bold">Free</span>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center">
                <Check className="w-5 h-5 mr-3 text-green-400" />
                100 AI flashcards/month
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 mr-3 text-green-400" />
                5 decks maximum
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 mr-3 text-green-400" />
                Basic spaced repetition
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 mr-3 text-green-400" />
                Email support
              </li>
            </ul>
            <button className="w-full py-3 px-6 bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/50 rounded-xl font-semibold transition-all">
              Get Started
            </button>
          </div>

          {/* Pro - Most Popular */}
          <div className="bg-gradient-to-br from-violet-500/20 to-purple-600/20 p-8 rounded-2xl border-2 border-violet-400 relative transform scale-105 shadow-2xl shadow-violet-500/25">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-2 rounded-full text-sm font-bold">
                MOST POPULAR
              </div>
            </div>
            <div className="flex items-center mb-4">
              <Star className="w-6 h-6 text-yellow-400 mr-2" />
              <h3 className="text-2xl font-bold">Pro</h3>
            </div>
            
            {/* Dynamic Pricing Display */}
            <div className="mb-6">
              {billingCycle === 'year' ? (
                <>
                  <span className="text-4xl font-bold">{masteryStudyProYearlyPrice}</span>
                  <span className="text-violet-300/70">/year</span>
                  <div className="text-sm text-green-400 font-semibold">Save $20 compared to monthly!</div>
                  <div className="text-xs text-violet-300/70 mt-1">That's just $3.33/month</div>
                </>
              ) : (
                <>
                  <span className="text-4xl font-bold">{masteryStudyProMonthlyPrice}</span>
                  <span className="text-violet-300/70">/month</span>
                  <div className="text-sm text-violet-300/70">Annual plan saves you $20/year</div>
                </>
              )}
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center">
                <Check className="w-5 h-5 mr-3 text-green-400" />
                <strong>Unlimited</strong> AI flashcards
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 mr-3 text-green-400" />
                <strong>Unlimited</strong> decks
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 mr-3 text-green-400" />
                <strong>Smart</strong> spaced repetition
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 mr-3 text-green-400" />
                Priority support
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 mr-3 text-green-400" />
                Progress analytics
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 mr-3 text-green-400" />
                Custom study schedules
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 mr-3 text-green-400" />
                Share & copy decks
              </li>
            </ul>
            <button 
              className="w-full py-4 px-6 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl font-bold text-lg transition-all transform hover:scale-[1.02]"
              onClick={() => openCheckout(billingCycle === 'month' ? priceIds.proMonthly : priceIds.proYearly, 'pro')}
            >
              {billingCycle === 'year' ? 'Get Pro Annual' : 'Start Pro Trial'}
            </button>
            
            {/* Value Proposition */}
            {billingCycle === 'year' && (
              <div className="mt-4 text-center">
                <div className="text-xs text-violet-300/80">
                  Perfect for the entire academic year
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Value Props Section */}
        <div className="text-center mb-12">
          <h3 className="text-2xl font-bold mb-8">Why Students Choose Mastery</h3>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white/5 p-6 rounded-xl border border-violet-500/20">
              <div className="text-3xl mb-3">🧠</div>
              <h4 className="font-semibold mb-2">AI-Powered Generation</h4>
              <p className="text-sm text-violet-300/80">Turn any document or notes into flashcards instantly</p>
            </div>
            <div className="bg-white/5 p-6 rounded-xl border border-violet-500/20">
              <div className="text-3xl mb-3">📈</div>
              <h4 className="font-semibold mb-2">Proven Results</h4>
              <p className="text-sm text-violet-300/80">Smart spaced repetition increases retention by 3x</p>
            </div>
            <div className="bg-white/5 p-6 rounded-xl border border-violet-500/20">
              <div className="text-3xl mb-3">⚡</div>
              <h4 className="font-semibold mb-2">Save Time</h4>
              <p className="text-sm text-violet-300/80">Study smarter, not harder. Focus on what matters.</p>
            </div>
          </div>
        </div>

        {/* Social Proof */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
            ))}
            <span className="ml-2 text-violet-300">4.9/5 from 2,847 reviews</span>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white/5 p-6 rounded-xl border border-violet-500/20">
              <p className="text-sm mb-3">"Mastery helped me ace my finals. The spaced repetition is game-changing!"</p>
              <div className="text-violet-300 text-sm">- Sarah, MIT</div>
            </div>
            <div className="bg-white/5 p-6 rounded-xl border border-violet-500/20">
              <p className="text-sm mb-3">"Finally a flashcard app that actually understands how I learn."</p>
              <div className="text-violet-300 text-sm">- Marcus, Stanford</div>
            </div>
            <div className="bg-white/5 p-6 rounded-xl border border-violet-500/20">
              <p className="text-sm mb-3">"The annual plan paid for itself after my first semester. Best investment!"</p>
              <div className="text-violet-300 text-sm">- Elena, Harvard</div>
            </div>
          </div>
        </div>

        {/* Guarantee */}
        <div className="text-center bg-gradient-to-r from-violet-500/10 to-purple-600/10 p-8 rounded-2xl border border-violet-500/30">
          <h3 className="text-2xl font-bold mb-4">30-Day Money-Back Guarantee</h3>
          <p className="text-violet-200/80 max-w-2xl mx-auto">
            Not satisfied? Get a full refund within 30 days, no questions asked. 
            We're confident Mastery will transform your learning.
          </p>
        </div>
      </div>
    </div>
  );
}

export default GoPremium;