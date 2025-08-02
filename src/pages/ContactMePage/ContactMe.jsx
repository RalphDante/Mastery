import React from 'react';

function ContactMe() {
    const handleDiscordClick = () => {
        window.open('https://discord.gg/e6DDzV4QYN', '_blank');
    };

    const handleFacebookClick = () => {
        window.open('https://www.facebook.com/people/Mastery-Study/61578162247304/', '_blank');
    };

    const handleEmailClick = () => {
        window.open('mailto:ralphcomandante.mastery@gmail.com', '_blank');
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-4">Get in Touch</h1>
                    <p className="text-slate-400 text-lg">
                        Hi, I'm Ralph, the creator of Mastery
                    </p>
                    <p className="text-slate-400 text-lg">
                        Have questions? Want to connect? Reach out through any of these channels!
                    </p>
                </div>

                {/* Contact Cards */}
                <div className="grid md:grid-cols-3 gap-8 mb-12">
                    {/* Discord Card */}
                    <div className="bg-slate-800 rounded-lg p-6 hover:bg-slate-700 transition-colors cursor-pointer border border-slate-700 hover:border-purple-500"
                         onClick={handleDiscordClick}>
                        <div className="flex items-center justify-center mb-4">
                            <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center">
                                <i className="fab fa-discord text-2xl text-white"></i>
                            </div>
                        </div>
                        <h3 className="text-xl font-semibold text-center mb-2">Discord Server</h3>
                        <p className="text-slate-400 text-center mb-4">
                            Join our community for real-time discussions and support
                        </p>
                        <div className="text-center">
                            <span className="text-purple-400 text-sm">discord.gg/ykBmVxVr9</span>
                        </div>
                    </div>

                    {/* Facebook Card */}
                    <div className="bg-slate-800 rounded-lg p-6 hover:bg-slate-700 transition-colors cursor-pointer border border-slate-700 hover:border-purple-500"
                         onClick={handleFacebookClick}>
                        <div className="flex items-center justify-center mb-4">
                            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                                <i className="fab fa-facebook-f text-2xl text-white"></i>
                            </div>
                        </div>
                        <h3 className="text-xl font-semibold text-center mb-2">Facebook Page</h3>
                        <p className="text-slate-400 text-center mb-4">
                            Follow us for updates and educational content
                        </p>
                        <div className="text-center">
                            <span className="text-purple-400 text-sm">Mastery Study</span>
                        </div>
                    </div>

                    {/* Email Card */}
                    <div className="bg-slate-800 rounded-lg p-6 hover:bg-slate-700 transition-colors cursor-pointer border border-slate-700 hover:border-purple-500"
                         onClick={handleEmailClick}>
                        <div className="flex items-center justify-center mb-4">
                            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                                <i className="fas fa-envelope text-2xl text-white"></i>
                            </div>
                        </div>
                        <h3 className="text-xl font-semibold text-center mb-2">Email</h3>
                        <p className="text-slate-400 text-center mb-4">
                            Send me a direct message for business inquiries
                        </p>
                        <div className="text-center">
                            <span className="text-purple-400 text-sm">ralphcomandante.mastery@gmail.com</span>
                        </div>
                    </div>
                </div>

                {/* Additional Info Section */}
                <div className="bg-slate-800 rounded-lg p-8 border border-slate-700">
                    <h2 className="text-2xl font-bold mb-6 text-center">Why Connect?</h2>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-purple-400">
                                <i className="fas fa-users mr-2"></i>
                                Community Support
                            </h3>
                            <p className="text-slate-400">
                                Join our Discord to connect with other learners, share study tips, and get help with your mastery journey.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-purple-400">
                                <i className="fas fa-lightbulb mr-2"></i>
                                Feedback & Suggestions
                            </h3>
                            <p className="text-slate-400">
                                Have ideas for new features or improvements? I'd love to hear from you and make Mastery even better.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Response Time Notice */}
                <div className="text-center mt-8">
                    <p className="text-slate-500 text-sm">
                        <i className="fas fa-clock mr-2"></i>
                        I typically respond within 24-48 hours
                    </p>
                </div>
            </div>
        </div>
    );
}

export default ContactMe;