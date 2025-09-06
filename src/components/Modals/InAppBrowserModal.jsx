import React, { useEffect, useState } from 'react';

const InAppBrowserModal = () => {
  const [showModal, setShowModal] = useState(false);

  const isInAppBrowser = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    // Check for known in-app browsers
    const inAppBrowsers = [
      'fban', 'fbav', // Facebook
      'instagram',
      'tiktok',
      'twitter',
      'linkedin',
      'snapchat',
      'whatsapp',
      'wechat',
      'line/',
      'micromessenger' // WeChat
    ];
    
    return inAppBrowsers.some(browser => userAgent.includes(browser));
  };

  useEffect(() => {
    // Check if we're in an in-app browser and haven't dismissed the modal recently
    const hasSeenModal = sessionStorage.getItem('hasSeenInAppBrowserModal');
    
    if (isInAppBrowser() && !hasSeenModal) {
      setShowModal(true);
    }
  }, []);

  const handleClose = () => {
    setShowModal(false);
    // Remember that user has seen the modal for this session
    sessionStorage.setItem('hasSeenInAppBrowserModal', 'true');
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 relative">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 flex items-center justify-center"
        >
          ×
        </button>
        
        {/* Modal content */}
        <div className="p-6 text-center">
          <div className="text-4xl mb-4">🚀</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">
            For the best experience!
          </h2>
          <p className="text-gray-600 mb-4">
            This works better in your main browser (Chrome, Safari, Edge, etc.)
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
            <p className="text-sm font-medium text-gray-700 mb-2">To switch:</p>
            <div className="space-y-1 text-sm text-gray-600">
              <p>• Tap the menu (⋯ or ⋮ icon)</p>
              <p>• Select "Open in browser"</p>
              <p>• Complete your signup there</p>
            </div>
          </div>
          
          <button
            onClick={handleClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

export default InAppBrowserModal;