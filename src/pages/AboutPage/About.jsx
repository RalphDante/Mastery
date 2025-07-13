import React from 'react';

function About() {
    return (
        <div className="min-h-screen bg-slate-900 text-white p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-4">About Mastery</h1>
                    <p className="text-slate-400 text-xl">
                        An AI-powered study assistant that turns physical notes, documents, and slides into interactive flashcards.
                    </p>
                </div>

                {/* How it Works */}
                <div className="mb-12">
                    <h2 className="text-2xl font-semibold mb-8 text-center">How It Works</h2>
                    <div className="space-y-6">
                        {/* Step 1 */}
                        <div className="flex items-start space-x-4">
                            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-white font-bold">1</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Create a Folder</h3>
                                <p className="text-slate-400">
                                    Start by organizing your subjects into folders. Keep your studies neat and structured.
                                </p>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="flex items-start space-x-4">
                            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-white font-bold">2</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Make a Deck</h3>
                                <p className="text-slate-400">
                                    Upload your notes, documents, or slides. Our AI will automatically generate flashcards for you.
                                </p>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="flex items-start space-x-4">
                            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-white font-bold">3</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Study Your Way</h3>
                                <p className="text-slate-400">
                                    Use <strong>Quick Study</strong> to cram for tests or <strong>Smart Review</strong> for long-term memory retention.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Study Methods */}
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Quick Study */}
                    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                        <div className="flex items-center mb-4">
                            <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center mr-3">
                                <i className="fas fa-bolt text-white"></i>
                            </div>
                            <h3 className="text-xl font-semibold">Quick Study</h3>
                        </div>
                        <p className="text-slate-400">
                            Perfect for last-minute cramming. Review all your cards quickly before exams and tests.
                        </p>
                    </div>

                    {/* Smart Review */}
                    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                        <div className="flex items-center mb-4">
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                                <i className="fas fa-brain text-white"></i>
                            </div>
                            <h3 className="text-xl font-semibold">Smart Review</h3>
                        </div>
                        <p className="text-slate-400">
                            Uses spaced repetition to help you build long-term memory. Perfect for mastering subjects over time.
                        </p>
                    </div>
                </div>

                {/* Bottom CTA */}
                {/* <div className="text-center mt-12">
                    <p className="text-slate-400 mb-4">
                        Ready to transform your study routine?
                    </p>
                    <button className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-semibold transition-colors">
                        Get Started
                    </button>
                </div> */}
            </div>
        </div>
    );
}

export default About;