import { Check, Star, Zap, Crown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

function GoPremium() {
  const { authUser } = useAuth();
  const [paddleLoaded, setPaddleLoaded] = useState(false);
  const [masteryStudyProPrice, setMasteryStudyProPrice] = useState('$7.99');
  const [masteryStudyPremiumPrice, setMasteryStudyPremiumPrice] = useState('$14.99');
  const [billingCycle, setBillingCycle] = useState('month');

  // Product IDs
  const masteryStudyPro = 'pro_01k1f8yahfd3b9xpm4ksbszm0n';
  const masteryStudyPremium = 'pro_01k1fh8bfkpdpgkbvahk7nnczp';
  
  // Price IDs - make sure these are correct for your actual products
  const priceIds = {
    proMonthly: 'pri_01k1f95ne00eje36z837qhzm0q',
    proYearly: 'pri_01k1fh6p0sgsvxm5s1cregrygr', 
    premiumMonthly: 'pri_01k1fhah105mkxbgrm2q43s3a5',
    premiumYearly: 'pri_01k1fhcph6dwqjr8fag4xh36bd' // This should be different!
  };

  const monthItems = [{
      quantity: 1,
      priceId: priceIds.proMonthly,
    },
    {
      quantity: 1,
      priceId: priceIds.premiumMonthly,
    }
  ];
  
  const yearItems = [{
      quantity: 1,
      priceId: priceIds.proYearly,
    },
    {
      quantity: 1,
      priceId: priceIds.premiumYearly,
    }
  ];

  // Load Paddle SDK
  useEffect(() => {
    const loadPaddleScript = () => {
      if (document.querySelector('script[src*="paddle"]')) {
        return; // Already loaded
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
      script.async = true;
      script.onload = () => {
        initializePaddle();
      };
      document.head.appendChild(script);
    };

    // Check if Paddle is already loaded
    if (window.Paddle) {
      initializePaddle();
    } else {
      loadPaddleScript();
    }
  }, []);

  // Get prices when Paddle loads or billing cycle changes
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

  // Get prices from Paddle
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
        console.log(result);
    
        const items = result.data.details.lineItems;
        items.forEach(item => {
          if (item.product.id === masteryStudyPro) {
            setMasteryStudyProPrice(item.formattedTotals.total);
            console.log('Pro price: ' + item.formattedTotals.subtotal);
          } else if (item.product.id === masteryStudyPremium) {
            setMasteryStudyPremiumPrice(item.formattedTotals.total);
            console.log('Premium price: ' + item.formattedTotals.subtotal);
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
        email: authUser?.email || 'customer@example.com'// You can get this from your auth system
      },
      customData: {
        plan: planName
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-purple-900 text-white">
      {/* Minimal Header */}
      <div className="flex justify-between items-center p-6">
        <h1 className="text-2xl font-bold text-violet-300">Mastery</h1>
        <div className="text-sm text-violet-300/70">raprapdante75</div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-0">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-violet-400 to-white bg-clip-text text-transparent">
            Unlock Your Learning
            <br />Potential
          </h2>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/10 p-1 rounded-lg border border-violet-500/30">
            <button 
              className={`px-6 py-2 rounded-md transition-all ${billingCycle === 'month' ? 'bg-violet-600 text-white' : 'text-violet-300'}`}
              onClick={() => setBillingCycle('month')}
            >
              Monthly
            </button>
            <button 
              className={`px-6 py-2 rounded-md transition-all ${billingCycle === 'year' ? 'bg-violet-600 text-white' : 'text-violet-300'}`}
              onClick={() => setBillingCycle('year')}
            >
              Annually
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
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
            <div className="mb-6">
              <span className="text-4xl font-bold">{masteryStudyProPrice}</span>
              <span className="text-violet-300/70">/{billingCycle === 'month' ? 'month' : 'year'}</span>
              {billingCycle === 'year' && (
                <div className="text-sm text-green-400">Save 17% annually</div>
              )}
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center">
                <Check className="w-5 h-5 mr-3 text-green-400" />
                <strong>Unlimited</strong> AI flashcards
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
            </ul>
            <button 
              className="w-full py-4 px-6 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl font-bold text-lg transition-all transform hover:scale-[1.02]"
              onClick={() => openCheckout(billingCycle === 'month' ? priceIds.proMonthly : priceIds.proYearly, 'pro')}
            >
              Start Pro Trial
            </button>
          </div>

          {/* Premium */}
          <div className="bg-white/5 p-8 rounded-2xl border border-violet-500/20 relative">
            <div className="flex items-center mb-4">
              <Crown className="w-6 h-6 text-yellow-500 mr-2" />
              <h3 className="text-2xl font-bold">Premium</h3>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-bold">{masteryStudyPremiumPrice}</span>
              <span className="text-violet-300/70">/{billingCycle === 'month' ? 'month' : 'year'}</span>
              {billingCycle === 'year' && (
                <div className="text-sm text-green-400">Save 17% annually</div>
              )}
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center">
                <Check className="w-5 h-5 mr-3 text-green-400" />
                Everything in Pro
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 mr-3 text-green-400" />
                AI tutoring sessions
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 mr-3 text-green-400" />
                Advanced analytics
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 mr-3 text-green-400" />
                Team collaboration
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 mr-3 text-green-400" />
                White-label access
              </li>
            </ul>
            <button 
              className="w-full py-3 px-6 bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/50 rounded-xl font-semibold transition-all"
              onClick={() => openCheckout(billingCycle === 'month' ? priceIds.premiumMonthly : priceIds.premiumYearly, 'premium')}
            >
              Go Premium
            </button>
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
              <p className="text-sm mb-3">"Boosted my retention rate by 3x. Worth every penny."</p>
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