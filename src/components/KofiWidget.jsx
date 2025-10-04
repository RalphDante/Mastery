// components/KofiWidget.jsx
import { useEffect } from 'react';

function KofiWidget() {
  useEffect(() => {
    // Load the Ko-fi script dynamically
    const script = document.createElement('script');
    script.src = 'https://storage.ko-fi.com/cdn/widget/Widget_2.js';
    script.async = true;
    
    script.onload = () => {
      // Initialize after script loads
      if (window.kofiwidget2) {
        window.kofiwidget2.init('Support me on Ko-fi', '#72a4f2', 'X7X71LPHFA');
        window.kofiwidget2.draw();
      }
    };
    
    document.body.appendChild(script);
    
    // Add custom styles to override Ko-fi widget background
    const style = document.createElement('style');
    style.textContent = `
      .floating-chat-kofi {
        background: transparent !important;
      }
      .floating-chat-kofi iframe {
        background: transparent !important;
      }
    `;
    document.head.appendChild(style);
    
    // Cleanup
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  return (
    <div 
      id="kofi-widget-container" 
      className="fixed bottom-4 left-4 z-50"
      style={{ maxWidth: '300px' }}
    />
  );
}

export default KofiWidget;