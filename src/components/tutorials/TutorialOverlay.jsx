import { createPortal } from 'react-dom';

function TutorialOverlay({ isVisible, children, onClose }) {
  if (!isVisible) return null;
  
  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/60 z-40 pointer-events-none transition-opacity" />
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div className= "text-black px-8 py-6 rounded-2xl shadow-2xl text-2xl font-bold text-center pointer-events-auto">
          {children}
        </div>
      </div>
    </>,
    document.body
  );
}

export default TutorialOverlay;