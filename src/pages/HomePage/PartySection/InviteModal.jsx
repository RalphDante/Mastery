import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check } from 'lucide-react';

function InviteModal({ isOpen, onClose, partyId, partyTitle }) {
  const [copied, setCopied] = useState(false);
  
  // Generate the invite link
  const inviteLink = `${window.location.origin}/join/${partyId}`;
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = inviteLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <div 
        className="bg-slate-800 rounded-lg max-w-md w-full relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-slate-700 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-purple-400">Invite Friends to Party</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Party Info */}
          <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
            <p className="text-sm text-slate-400 mb-1">Party Name</p>
            <p className="text-lg font-semibold text-slate-100">{partyTitle}</p>
          </div>

          {/* Instructions */}
          <div>
            <p className="text-sm text-slate-300 mb-2">
              Share this invite link with your friends to join your party:
            </p>
          </div>

          {/* Link Display & Copy Button */}
          <div className="flex gap-2">
            <div className="flex-1 bg-slate-900 rounded-lg p-3 border border-slate-600 overflow-hidden">
              <p className="text-sm text-slate-300 truncate font-mono">
                {inviteLink}
              </p>
            </div>
            <button
              onClick={handleCopyLink}
              className={`px-4 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                copied 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {copied ? (
                <>
                  <Check size={20} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={20} />
                  Copy
                </>
              )}
            </button>
          </div>

          {/* Success Message */}
          {copied && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <p className="text-sm text-green-400 text-center">
                Link copied! Share it with your friends!
              </p>
            </div>
          )}

          {/* Additional Info */}
          <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600">
            <p className="text-xs text-slate-400">
              💡 <strong>Tip:</strong> Your friends will need to sign in to join. The invite link works for anyone!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 p-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default InviteModal;