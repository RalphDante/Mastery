import { Check, Star, Zap, Crown } from 'lucide-react';

function GoPremium() {
  return (
    <div className="min-h-screen bg-gradient-to-br text-white">
      {/* Minimal Header */}
      <div className="flex justify-between items-center p-6">
        <h1 className="text-2xl font-bold text-violet-300">Mastery</h1>
        <div className="text-sm text-violet-300/70">raprapdante75</div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-0">
        {/* Hero Section */}
        <div className="text-center mb-16">
          {/* <div className="inline-flex items-center bg-violet-500/20 px-4 py-2 rounded-full border border-violet-500/30 mb-6">
            <Star className="w-4 h-4 text-yellow-400 mr-2" />
            <span className="text-sm">Join 12,847+ students mastering faster</span>
          </div> */}
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-violet-400 to-white bg-clip-text text-transparent">
            Unlock Your Learning
            <br />Potential
          </h2>
          {/* <p className="text-xl text-violet-200/80 max-w-2xl mx-auto">
            Choose the plan that accelerates your learning journey. Upgrade anytime, cancel whenever.
          </p> */}
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
              <span className="text-4xl font-bold">$5</span>
              <span className="text-violet-300/70">/month</span>
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
              <span className="text-4xl font-bold">$12</span>
              <span className="text-violet-300/70">/month</span>
              <div className="text-sm text-green-400">Save 40% vs Basic</div>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center">
                <Check className="w-5 h-5 mr-3 text-green-400" />
                <strong>Unlimited</strong>-AI flashcards
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 mr-3 text-green-400" />
                <strong>Smart</strong>-spaced repetition
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
            <button className="w-full py-4 px-6 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl font-bold text-lg transition-all transform hover:scale-[1.02]">
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
              <span className="text-4xl font-bold">$25</span>
              <span className="text-violet-300/70">/month</span>
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
            <button className="w-full py-3 px-6 bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/50 rounded-xl font-semibold transition-all">
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