import { useEffect } from 'react';

function KofiWidget() {
  useEffect(() => {
    // Check if script is already loaded
    const existingScript = document.querySelector('script[src*="ko-fi.com"]');
    
    if (!existingScript) {
      // Create and load the Ko-fi script
      const script = document.createElement('script');
      script.src = 'https://storage.ko-fi.com/cdn/scripts/overlay-widget.js';
      script.async = true;
      
      script.onload = () => {
        // Initialize the widget after script loads
        if (window.kofiWidgetOverlay) {
          window.kofiWidgetOverlay.draw('affytee', {
            'type': 'floating-chat',
            'floating-chat.donateButton.text': 'Support me',
            'floating-chat.donateButton.background-color': '#00b9fe',
            'floating-chat.donateButton.text-color': '#fff'
          });
        }
      };
      
      document.body.appendChild(script);
    } else if (window.kofiWidgetOverlay) {
      // Script already loaded, just initialize
      window.kofiWidgetOverlay.draw('affytee', {
        'type': 'floating-chat',
        'floating-chat.donateButton.text': 'Support me',
        'floating-chat.donateButton.background-color': '#00b9fe',
        'floating-chat.donateButton.text-color': '#fff'
      });
    }
    
    // Cleanup function
    return () => {
      // Remove the widget when component unmounts
      const kofiWidget = document.querySelector('[id^="kofi-widget"]');
      if (kofiWidget) {
        kofiWidget.remove();
      }
    };
  }, []);

  return null; // This component doesn't render anything itself
}

export default KofiWidget;