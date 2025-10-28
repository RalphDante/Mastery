import React, { useState, useEffect } from 'react';
import FolderModalStep1 from './FolderModalStep1';
import SignUpBtn from './SignUpBtn';
import CreateWithAIDemoModal from './CreateWithAIDemoModal';
import { Search, Upload, FileText, Zap, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MostCopiesSection from './FeaturedDecks/MostCopiesSection';
import ProBanner from '../../HomePage/WelcomeAndQuickStats/ProBanner';
import { useAuth } from '../../../hooks/useAuth';
import TestimonialsCarousel from './TestimonialCarousel';
import HeroSection from './HeroSection';

const TryNowPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [count, setCount] = useState(0);
  const {signIn} = useAuth();

  const navigate = useNavigate();

  // Simple SVG icons as components
  const Camera = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );

  const Brain = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );

  const Zap = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );

  const TrendingUp = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );

  const Sparkles = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l1.5 1.5L5 6 3.5 4.5L5 3zM12 12l1.5 1.5L12 15l-1.5-1.5L12 12zM19 3l1.5 1.5L19 6l-1.5-1.5L19 3z" />
    </svg>
  );

  const ArrowRight = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );

  const Star = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );

  const steps = [
    { 
      icon: Camera, 
      text: "Snap your notes", 
      color: "from-violet-500 to-purple-600",
      description: "Take a photo of your handwritten notes, textbook pages, or study materials with your phone camera"
    },
    { 
      icon: Brain, 
      text: "AI creates flashcards", 
      color: "from-purple-500 to-indigo-600",
      description: "Our advanced AI analyzes your content and automatically generates comprehensive flashcards"
    },
    { 
      icon: Zap, 
      text: "Study & master", 
      color: "from-indigo-500 to-violet-600",
      description: "Use spaced repetition and active recall to memorize concepts faster than traditional methods"
    }
  ];

  const testimonials = [
    { name: "@studyqueen", text: "OMG this is actually magic!!! Improved my grades by 2 letter grades", verified: true },
    { name: "@crammaster", text: "I wish this was there during my boards 😭. Would have saved me hundreds of hours", verified: true },
    { name: "@notesgirl", text: "It's so easy to understand!", verified: false }
  ];

  const handleSignIn = () => {
    // Handle sign in logic
  };

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const counter = setInterval(() => {
      setCount(prev => prev < 47829 ? prev + Math.floor(Math.random() * 3) + 1 : 47829);
    }, 100);
    return () => clearInterval(counter);
  }, []);

  // Add structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Mastery - AI Flashcard Generator",
    "description": "Transform your handwritten notes into AI-generated flashcards instantly. Study smarter with automated flashcard creation from photos.",
    "applicationCategory": "EducationalApplication",
    "operatingSystem": "Web, iOS, Android",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "1247"
    }
  };

  return (
    <>
      {/* SEO Meta Tags - These would typically go in your document head */}
      <script 
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      
      <div className="min-h-screen text-white overflow-hidden">
        {showModal && (
          <CreateWithAIDemoModal 
            onClose={() => setShowModal(false)}
            isOpen={showModal}
          />
        )}

        {/* Navigation */}
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
          <SignUpBtn 
            signIn = {signIn}
          />
        </nav>

          


        {/* Hero Section */}
        <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-1 pb-10">
          <div className="text-center">
            <HeroSection
              setShowModal={setShowModal}
              signIn={signIn}
            />

            {/* Problem/Agitate/Solve Section */}
            <section className="mb-12 sm:mb-16 lg:mb-20 mx-auto px-4 sm:px-0">
              {/* Problem Headline */}
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-center">
                Here's The Problem <span className="text-violet-400">You're</span> Facing
              </h2>
              
              {/* Agitation Box */}
              <div className="bg-white/5 rounded-2xl p-6 sm:p-8 border border-white/10 mb-6 sm:mb-8 max-w-4xl mx-auto">
                <p className="text-base sm:text-lg lg:text-xl xl:text-2xl text-gray-300 leading-relaxed mb-3 sm:mb-4">
                  Everyone says the same thing: <span className="text-red-400 font-semibold">"Just study harder. Put in the hours."</span>
                </p>
                <p className="text-base sm:text-lg lg:text-xl xl:text-2xl text-gray-300 leading-relaxed mb-3 sm:mb-4">
                  So you do. You spend <span className="text-red-400 font-semibold">10 hours cramming</span>. 
                  You miss the party. Skip the hangout. Say no to the beach trip. 
                </p>
                <p className="text-base sm:text-lg lg:text-xl xl:text-2xl text-gray-300 leading-relaxed mb-3 sm:mb-4">
                  Your friends are out living their lives. Making memories. Having fun. 
                  And you? <span className="text-red-400 font-semibold">You're stuck in your room studying</span>.
                </p>
                <p className="text-base sm:text-lg lg:text-xl xl:text-2xl text-gray-300 leading-relaxed mb-4 sm:mb-6">
                  <span className="text-red-400 font-bold text-lg sm:text-xl lg:text-2xl">Which means you'll never get to enjoy your teenage years. </span> 
                  The parties you missed? You can't get those back. The memories your friends made? You weren't there.
                </p>
                <p className="text-sm sm:text-base lg:text-lg text-violet-400 font-semibold italic border-l-4 border-violet-400 pl-3 sm:pl-4">
                  And the worst part? It's not even your fault. Nobody taught you there was a better way.
                </p>
              </div>
            </section>

            {/* Benefits Section */}
            <section className="mb-12 sm:mb-16 lg:mb-20 px-4 sm:px-0" aria-labelledby="benefits">
              {/* Transition */}
              <div className="text-center mb-6 sm:mb-8">
                <p className="text-xl sm:text-2xl lg:text-3xl font-semibold px-4">
                  What if you could Cut study time in Half AND make it actually fun?
                </p>
              </div>

              {/* Solution */}
              <div className="bg-white/5 rounded-2xl p-6 sm:p-8 border border-slate-500/30 max-w-6xl mx-auto">
                <h3 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center px-4">
                  Here's Where <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent ">
              Mastery
            </span> Changes Everything
                </h3>
                
                {/* 3 COLUMNS - Stack on mobile, side-by-side on desktop */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                  
                  {/* Column 1 */}
                  <div className="bg-white/5 rounded-2xl p-5 sm:p-6 border border-white/10">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <Zap className="w-5 h-5" />
                      </div>
                      <h4 className="text-left text-base sm:text-lg font-semibold text-violet-400">
                        Upload Notes → Get Flashcards in 15 Seconds
                      </h4>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      <span className="font-semibold">Which means you get your weekends back.</span> No more Sunday nights making flashcards while your friends are out.
                    </p>
                  </div>

                  {/* Column 2 */}
                  <div className="bg-white/5 rounded-2xl p-5 sm:p-6 border border-white/10">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <h4 className="text-left text-base sm:text-lg font-semibold text-purple-400">
                        Party Up With Friends and Fight Bosses
                      </h4>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      <span className="font-semibold">Which means you'll actually look forward to studying</span> instead of dreading it.
                    </p>
                  </div>

                  {/* Column 3 */}
                  <div className="bg-white/5 rounded-2xl p-5 sm:p-6 border border-white/10">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                        <Brain className="w-5 h-5" />
                      </div>
                      <h4 className="text-left text-base sm:text-lg font-semibold text-indigo-400">
                        Active recall built in. The same science med students use.
                      </h4>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      <span className="font-semibold">Which means you're getting better grades</span> while it feels like you're just gaming with friends.
                    </p>
                  </div>
                </div>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center px-4 sm:px-0">
                  <button 
                    className="group bg-gradient-to-r from-violet-500 to-purple-600 px-6 sm:px-8 py-3 sm:py-4 rounded-full text-base sm:text-lg lg:text-xl font-bold hover:shadow-2xl hover:shadow-violet-500/50 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2"
                    onClick={() => signIn()}
                  >
                    <span>Start Free</span>
                    <ArrowRight />
                  </button>
                  
                  <button 
                    className="group border-2 border-violet-400 bg-violet-500/10 hover:bg-violet-500/20 px-6 sm:px-8 py-3 sm:py-4 rounded-full text-base sm:text-lg lg:text-xl font-bold transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2"
                    onClick={() => navigate('/pricing')}
                  >
                    <span>See Pro Features</span>
                  </button>
                </div>

                <p className="text-center text-xs sm:text-sm text-gray-400 mt-4 px-4">
                  Start with 5 free AI generations. No credit card required.
                </p>
              </div>
            </section>

            {/* FAQ Section */}
            <section className="mb-12 sm:mb-16 lg:mb-20 text-left max-w-4xl mx-auto px-4" aria-labelledby="faq">
              <h2 id="faq" className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center">
                Frequently Asked Questions
              </h2>
              <div className="space-y-3 sm:space-y-4">
                <details className="bg-white/5 rounded-lg p-4 sm:p-5 border border-white/10">
                  <summary className="font-semibold text-base sm:text-lg cursor-pointer text-violet-400 mb-2">
                    How does the AI flashcard generator work?
                  </summary>
                  <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                    Simply take a photo of your notes, textbook, or any study material. Our AI analyzes the content, extracts key concepts, and automatically creates comprehensive flashcards with questions and answers.
                  </p>
                </details>
                <details className="bg-white/5 rounded-lg p-4 sm:p-5 border border-white/10">
                  <summary className="font-semibold text-base sm:text-lg cursor-pointer text-violet-400 mb-2">
                    What types of study materials can I upload?
                  </summary>
                  <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                    You can upload photos of handwritten notes, textbook pages, lecture slides, worksheets, and any printed study materials. Our AI works with multiple languages and subjects.
                  </p>
                </details>
                {/* <details className="bg-white/5 rounded-lg p-4 sm:p-5 border border-white/10">
                  <summary className="font-semibold text-base sm:text-lg cursor-pointer text-violet-400 mb-2">
                    How does Active Recall study mode work?
                  </summary>
                  <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                    Active Recall uses Science backed data to optimize your study sessions. After each flashcard, rate your performance as Again, Hard, Good, or Easy. Cards you find difficult appear more frequently, while easy cards show up less often, maximizing your learning efficiency.
                  </p>
                </details> */}
              </div>
            </section>

            {/* Final CTA */}
            <section className="bg-white/5  backdrop-blur-sm rounded-3xl p-6 sm:p-8 border border-violet-500/30 mx-4 sm:mx-0">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
                Ready to Transform Your Study Routine?
              </h2>
              <p className="text-base sm:text-lg lg:text-xl text-gray-300 mb-4 sm:mb-6">
                Join students who've improved their grades with Mastery Study
              </p>
              <button 
                className="bg-gradient-to-r from-violet-500 to-purple-600 w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 rounded-full text-lg sm:text-xl font-bold hover:shadow-2xl hover:shadow-violet-500/50 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-3 mx-auto"
                onClick={() => signIn()}
                aria-label="Start creating AI flashcards from your notes"
              >
                <span>Start Now For Free</span>
                <ArrowRight />
              </button>
            </section>
          </div>
        </main>
      </div>
    </>
  );
};

export default TryNowPage;