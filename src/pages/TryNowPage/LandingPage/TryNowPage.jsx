import React, { useState, useEffect } from 'react';
import FolderModalStep1 from './FolderModalStep1';
import SignUpBtn from './SignUpBtn';
import CreateWithAIDemoModal from './CreateWithAIDemoModal';

const TryNowPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [count, setCount] = useState(0);

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
          <SignUpBtn />
        </nav>

        {/* Hero Section */}
        <main className="relative z-10 max-w-7xl mx-auto px-6 pt-1 pb-32">
          <div className="text-center">
            {/* Hero Heading with SEO optimization */}
            <h1 className={`text-6xl opacity-90 md:text-8xl font-black mb-6 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              Turn Your
              <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent block animate-pulse py-4">
                Written Notes
              </span>
              Into AI Flashcards
            </h1>

            {/* Optimized subheading with keywords */}
            <p className={`text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              Transform any photo of your study materials into interactive flashcards using advanced AI. 
              <span className="text-violet-400 font-semibold"> Study smarter, memorize faster, ace your exams.</span>
            </p>

            {/* CTA Buttons with better accessibility */}
            <div className={`flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <button 
                className="group bg-gradient-to-r from-violet-500 to-purple-600 px-8 py-4 rounded-full text-xl font-bold hover:shadow-2xl hover:shadow-violet-500/50 transition-all duration-300 transform hover:scale-105 flex items-center space-x-2"
                onClick={() => setShowModal(true)}
                aria-label="Generate flashcards from your notes now"
              >
                <div className="group-hover:animate-bounce"><Camera /></div>
                <span>Generate Flashcards Now</span>
                <div className="group-hover:translate-x-1 transition-transform"><ArrowRight /></div>
              </button>
            </div>

            {/* How It Works Section with Schema markup */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20" aria-labelledby="how-it-works">
              <h2 id="how-it-works" className="sr-only">How AI Flashcard Generation Works</h2>
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === index;
                return (
                  <article
                    key={index}
                    className={`relative p-8 rounded-2xl border transition-all duration-500 ${
                      isActive 
                        ? 'border-violet-500/50 bg-gradient-to-br from-violet-500/10 to-purple-500/10 shadow-2xl shadow-violet-500/25 scale-105' 
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${step.color} flex items-center justify-center mx-auto mb-4 ${isActive ? 'animate-pulse' : ''}`}>
                      <Icon />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{step.text}</h3>
                    <p className="text-sm text-gray-400 mb-2">{step.description}</p>
                    <div className="text-sm text-gray-500">Step {index + 1}</div>
                    {isActive && (
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-500/20 to-purple-500/20 animate-pulse" aria-hidden="true"></div>
                    )}
                  </article>
                );
              })}
            </section>

            {/* Social Proof Section */}
            <section className="bg-black/20 backdrop-blur-sm rounded-3xl p-8 mb-20 border border-white/10" aria-labelledby="testimonials">
              <h2 id="testimonials" className="text-3xl font-bold mb-8 flex items-center justify-center space-x-2">
                <span>What Students Are Saying About Our AI Flashcard Maker</span>
                <div className="text-yellow-400"><Sparkles /></div>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {testimonials.map((testimonial, index) => (
                  <article key={index} className="bg-white/5 rounded-2xl p-6 border border-white/10 hover:border-violet-500/30 transition-all duration-300">
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="font-bold text-violet-400">{testimonial.name}</span>
                      {testimonial.verified && <div className="text-yellow-400" aria-label="Verified user"><Star /></div>}
                    </div>
                    <p className="text-gray-300">{testimonial.text}</p>
                  </article>
                ))}
              </div>
            </section>

            {/* Benefits Section for SEO */}
            <section className="mb-20" aria-labelledby="benefits">
              <h2 id="benefits" className="text-3xl font-bold mb-8">Why Choose AI-Generated Flashcards?</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                  <h3 className="text-xl font-semibold text-violet-400 mb-3">Save Time</h3>
                  <p className="text-gray-300">Create hundreds of flashcards in seconds instead of hours of manual work</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                  <h3 className="text-xl font-semibold text-purple-400 mb-3">Better Retention</h3>
                  <p className="text-gray-300">AI-optimized flashcards use proven memory techniques for faster learning</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                  <h3 className="text-xl font-semibold text-indigo-400 mb-3">Any Subject</h3>
                  <p className="text-gray-300">Works with math, science, history, languages, and any study material</p>
                </div>
              </div>
            </section>

            {/* FAQ Section for SEO */}
            <section className="mb-20 text-left max-w-4xl mx-auto" aria-labelledby="faq">
              <h2 id="faq" className="text-3xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
              <div className="space-y-4">
                <details className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <summary className="font-semibold text-lg cursor-pointer text-violet-400 mb-2">
                    How does the AI flashcard generator work?
                  </summary>
                  <p className="text-gray-300">Simply take a photo of your notes, textbook, or any study material. Our AI analyzes the content, extracts key concepts, and automatically creates comprehensive flashcards with questions and answers.</p>
                </details>
                <details className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <summary className="font-semibold text-lg cursor-pointer text-violet-400 mb-2">
                    What types of study materials can I upload?
                  </summary>
                  <p className="text-gray-300">You can upload photos of handwritten notes, textbook pages, lecture slides, worksheets, and any printed study materials. Our AI works with multiple languages and subjects.</p>
                </details>
                <details className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <summary className="font-semibold text-lg cursor-pointer text-violet-400 mb-2">
                    How does the Smart Review study mode work?
                  </summary>
                  <p className="text-gray-300">Smart Review uses spaced repetition to optimize your study sessions. After each flashcard, rate your performance as Again, Hard, Good, or Easy. Cards you find difficult appear more frequently, while easy cards show up less often, maximizing your learning efficiency.</p>
                </details>
              </div>
            </section>

            {/* Final CTA with better copy */}
            <section className="bg-gradient-to-r from-violet-500/20 to-purple-500/20 backdrop-blur-sm rounded-3xl p-8 border border-violet-500/30">
              <h2 className="text-4xl font-bold mb-4">Ready to Transform Your Study Routine?</h2>
              <p className="text-xl text-gray-300 mb-6">Join thousands of students who've improved their grades with AI-powered flashcard generation</p>
              <button 
                className="bg-gradient-to-r from-violet-500 to-purple-600 px-10 py-5 rounded-full text-xl font-bold hover:shadow-2xl hover:shadow-violet-500/50 transition-all duration-300 transform hover:scale-105 flex items-center space-x-3 mx-auto"
                onClick={() => setShowModal(true)}
                aria-label="Start creating AI flashcards from your notes"
              >
                <span>Start Creating Flashcards</span>
                <Zap />
              </button>
            </section>
          </div>
        </main>
      </div>
    </>
  );
};

export default TryNowPage;