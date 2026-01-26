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
import Testimonials from '../../../components/Testimonials';

const TryNowPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [count, setCount] = useState(0);
  const {signIn} = useAuth();

  const navigate = useNavigate();

  const ArrowRight = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );

  useEffect(() => {
    setIsVisible(true);
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
      {/* SEO Meta Tags */}
      <script 
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      
      <div className="min-h-screen overflow-hidden">
        {showModal && (
          <CreateWithAIDemoModal 
            onClose={() => setShowModal(false)}
            isOpen={showModal}
          />
        )}

        {/* Dark Header Section - Navbar + Hero */}
        <div className="bg-slate-900 text-white">
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
          <HeroSection
            setShowModal={setShowModal}
            signIn={signIn}
          />
        </div>

        {/* Light Grey Content Section */}
        <div className="bg-gray-50">
          <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-5">
            
            {/* Benefits Section */}
            <section className="mb-12 sm:mb-16 lg:mb-20" aria-labelledby="benefits">
              <div className="max-w-6xl mx-auto">
                <div className="space-y-12 sm:space-y-16 lg:space-y-20">
                  
                  {/* Benefit 1: Upload Notes */}
                  <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                      {/* Visual First - Mobile & Desktop */}
                      <div className="bg-gradient-to-br from-violet-50 to-purple-50 p-8 sm:p-10 lg:p-12 flex items-center justify-center order-1">
                        <div className="w-full max-w-md">
                          <div className="flex items-center justify-center gap-4 sm:gap-6">
                            {/* Step 1: Upload */}
                            <div className="flex flex-col items-center">
                              <div className="w-24 h-24 sm:w-32 sm:h-32 lg:w-36 lg:h-36 rounded-2xl bg-white shadow-lg flex items-center justify-center mb-3 transform hover:scale-105 transition-transform">
                                <svg xmlns="http://www.w3.org/2000/svg" className='w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 text-violet-600' viewBox="0 0 256 256">
                                  <rect width="256" height="256" fill="none"/>
                                  <path fill="currentColor" d="m213.66 66.34l-40-40A8 8 0 0 0 168 24H88a16 16 0 0 0-16 16v16H56a16 16 0 0 0-16 16v144a16 16 0 0 0 16 16h112a16 16 0 0 0 16-16v-16h16a16 16 0 0 0 16-16V72a8 8 0 0 0-2.34-5.66M136 192H88a8 8 0 0 1 0-16h48a8 8 0 0 1 0 16m0-32H88a8 8 0 0 1 0-16h48a8 8 0 0 1 0 16m64 24h-16v-80a8 8 0 0 0-2.34-5.66l-40-40A8 8 0 0 0 136 56H88V40h76.69L200 75.31Z"/>
                                </svg>
                              </div>
                              <p className="text-sm sm:text-base font-semibold text-gray-900">Upload</p>
                              <p className="text-xs sm:text-sm text-gray-600">Notes</p>
                            </div>

                            {/* Arrow */}
                            <svg xmlns="http://www.w3.org/2000/svg" className='w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0' viewBox="0 0 24 24">
                              <rect width="24" height="24" fill="none"/>
                              <path fill="#7c3aed" d="M23 11v2h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v-1h-1v-1h-1v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1v-1H1v-4h15V9h-1V8h-1V7h-1V6h-1V5h-1V4h-1V3h1V2h1V1h1v1h1v1h1v1h1v1h1v1h1v1h1v1h1v1h1v1h1v1z"/>
                            </svg>

                            {/* Step 2: Flashcards */}
                            <div className="flex flex-col items-center">
                              <div className="w-24 h-24 sm:w-32 sm:h-32 lg:w-36 lg:h-36 rounded-2xl bg-white shadow-lg flex items-center justify-center mb-3 transform hover:scale-105 transition-transform">
                                <svg xmlns="http://www.w3.org/2000/svg" className='w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 text-violet-600' viewBox="0 0 24 24">
                                  <path fill="currentColor" d="m21.47 4.35l-1.34-.56v9.03l2.43-5.86c.41-1.02-.06-2.19-1.09-2.61m-19.5 3.7L6.93 20a2.01 2.01 0 0 0 1.81 1.26c.26 0 .53-.05.79-.16l7.37-3.05c.75-.31 1.21-1.05 1.23-1.79c.01-.26-.04-.55-.13-.81L13 3.5a1.95 1.95 0 0 0-1.81-1.25c-.26 0-.52.06-.77.15L3.06 5.45a1.994 1.994 0 0 0-1.09 2.6m16.15-3.8a2 2 0 0 0-2-2h-1.45l3.45 8.34"/>
                                </svg>
                              </div>
                              <p className="text-sm sm:text-base font-semibold text-gray-900">Get</p>
                              <p className="text-xs sm:text-sm text-gray-600">Flashcards</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Text Content */}
                      <div className="p-8 sm:p-10 lg:p-12 flex flex-col justify-center order-2">
                        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 leading-tight">
                          Upload Notes → Get Flashcards in 15 Seconds
                        </h3>
                        <p className="text-lg sm:text-xl text-gray-600 leading-relaxed">
                          <span className="font-semibold text-gray-900">Get your weekends back.</span> No more Sunday nights making flashcards while your friends are out.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Benefit 2: Party Up - Reversed Layout on Desktop */}
                  <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                      {/* Text Content - Order 1 on mobile, 2 on desktop */}
                      <div className="p-8 sm:p-10 lg:p-12 flex flex-col justify-center order-2 lg:order-1">
                        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 leading-tight">
                          Study With Friends in Real-Time
                        </h3>
                        <p className="text-lg sm:text-xl text-gray-600 leading-relaxed">
                          <span className="font-semibold text-gray-900">Actually look forward to studying</span> instead of dreading it. Collaborate and compete with your study group.
                        </p>
                      </div>

                      {/* Visual - Order 2 on mobile, 1 on desktop */}
                      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-8 sm:p-10 lg:p-12 flex items-center justify-center order-1 lg:order-2">
                        <div className="w-full max-w-sm">
                          <div className="bg-white rounded-2xl shadow-lg p-2 transform hover:scale-105 transition-transform">
                            <img
                              src="/images/icons/Party Aspect.png"
                              alt="Study together with friends"
                              className="w-full h-auto rounded-2xl"
                              style={{ imageRendering: 'pixelated' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Benefit 3: Track Progress */}
                  <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                      {/* Visual First */}
                      <div className="bg-gradient-to-br from-indigo-50 to-violet-50 p-8 sm:p-10 lg:p-12 flex items-center justify-center order-1">
                        <div className="w-full max-w-sm">
                          <div className="bg-white rounded-2xl p-2 shadow-lg transform hover:scale-105 transition-transform">
                            <img
                              src="/images/icons/Consistency Aspect.png"
                              alt="Track your study progress"
                              className="w-full h-auto rounded-2xl"
                              style={{ imageRendering: 'pixelated' }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Text Content */}
                      <div className="p-8 sm:p-10 lg:p-12 flex flex-col justify-center order-2">
                        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 leading-tight">
                          Track Your Progress, Minute by Minute
                        </h3>
                        <p className="text-lg sm:text-xl text-gray-600 leading-relaxed">
                          <span className="font-semibold text-gray-900">See exactly where your effort goes.</span> Build consistency and stay accountable with detailed analytics.
                        </p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center mt-12">
                  <button 
                    className="group bg-gradient-to-r from-violet-500 to-purple-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full text-base sm:text-lg lg:text-xl font-bold hover:shadow-2xl hover:shadow-violet-500/50 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2"
                    onClick={() => signIn()}
                  >
                    <span>Start Free</span>
                    <ArrowRight />
                  </button>
                  
                  <button 
                    className="group border-2 border-violet-600 text-violet-600 bg-white hover:bg-violet-50 px-6 sm:px-8 py-3 sm:py-4 rounded-full text-base sm:text-lg lg:text-xl font-bold transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2"
                    onClick={() => navigate('/pricing')}
                  >
                    <span>See Pro Features</span>
                  </button>
                </div>

                <p className="text-center text-sm text-gray-600 mt-4">
                  Start with 5 free AI generations. No credit card required.
                </p>
              </div>
            </section>

            
          </main>
        </div>

        {/* Testimonials */}
        <div className='bg-slate-900 max-w-7xl mx-auto pt-16 px-4'>
            <Testimonials />

            {/* FAQ Section */}
            <section className="mb-12 sm:mb-16 lg:mb-20 text-left max-w-4xl mx-auto" aria-labelledby="faq">
              <h2 id="faq" className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center text-gray-900">
                Frequently Asked Questions
              </h2>
              <div className="space-y-3 sm:space-y-4">
                <details className="bg-white rounded-lg p-4 sm:p-5 border border-gray-200 shadow-sm">
                  <summary className="font-semibold text-base sm:text-lg cursor-pointer text-violet-600 mb-2">
                    How does the AI flashcard generator work?
                  </summary>
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                    Simply take a photo of your notes, textbook, or any study material. Our AI analyzes the content, extracts key concepts, and automatically creates comprehensive flashcards with questions and answers.
                  </p>
                </details>
                <details className="bg-white rounded-lg p-4 sm:p-5 border border-gray-200 shadow-sm">
                  <summary className="font-semibold text-base sm:text-lg cursor-pointer text-violet-600 mb-2">
                    What types of study materials can I upload?
                  </summary>
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                    You can upload photos of handwritten notes, textbook pages, lecture slides, worksheets, and any printed study materials. Our AI works with multiple languages and subjects.
                  </p>
                </details>
              </div>
            </section>

            {/* Final CTA */}
            <section className="bg-gradient-to-br from-violet-600 to-purple-700 text-white rounded-3xl p-8 sm:p-12 shadow-2xl">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 text-center">
                Ready to Transform Your Study Routine?
              </h2>
              <p className="text-base sm:text-lg lg:text-xl mb-6 sm:mb-8 text-center opacity-90">
                Join students who've improved their grades with Mastery Study
              </p>
              <button 
                className="bg-white text-violet-600 w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 rounded-full text-lg sm:text-xl font-bold hover:shadow-2xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-3 mx-auto"
                onClick={() => signIn()}
                aria-label="Start creating AI flashcards from your notes"
              >
                <span>Start Now For Free</span>
                <ArrowRight />
              </button>
            </section>
          </div>

      </div>
    </>
  );
};

export default TryNowPage;