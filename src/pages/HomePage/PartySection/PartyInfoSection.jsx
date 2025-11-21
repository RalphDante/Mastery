import { X, Users, Crown, Link2, LogOut, Globe, Lock } from 'lucide-react';

// Party Info Modal Component
const PartyInfoSection = ({ partyProfile, user, onInvite, onLeave, onTogglePrivacy, closeModal, isLoading = false }) => {
  const isLeader = partyProfile?.leaderId === user?.uid;
  const memberCount = partyProfile?.memberCount || 0;
  const maxMembers = 6;
  const isPublic = partyProfile?.isPublic !== false; // Default to public for legacy parties

  return (
    <div className="bg-slate-900 rounded-lg overflow-hidden z-[40]">
      {/* Header */}
      <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 z-10 flex items-center justify-between">
        <h2 className="text-xl font-bold text-purple-400">Party Info</h2>
        <button
          onClick={closeModal}
          className="text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* Party Details */}
      <div className="p-6 space-y-6">
        {/* Party Title & Status */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              {isLeader && <Crown className="text-yellow-400" size={24} />}
              {partyProfile?.title}
            </h3>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-700/50">
              {isPublic ? (
                <>
                  <Globe className="text-green-400" size={16} />
                  <span className="text-green-400 text-sm font-medium">Public</span>
                </>
              ) : (
                <>
                  <Lock className="text-slate-400" size={16} />
                  <span className="text-slate-400 text-sm font-medium">Private</span>
                </>
              )}
            </div>
          </div>

          {/* Member Count */}
          <div className="flex items-center gap-2 text-slate-300">
            <Users size={18} />
            <span className="text-sm">
              {memberCount} / {maxMembers} Members
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mt-3 w-full bg-slate-700 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-purple-500 h-full transition-all duration-300"
              style={{ width: `${(memberCount / maxMembers) * 100}%` }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Invite Button */}
          <button
            onClick={onInvite}
            className="w-full flex items-center justify-center gap-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-purple-500/50"
          >
            <Link2 size={20} />
            <span>Invite Players</span>
          </button>

          {/* Toggle Privacy (Leader Only) */}
          {isLeader && (
            <button
              onClick={onTogglePrivacy}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPublic ? (
                <>
                  <Lock size={20} />
                  <span>{isLoading ? 'Updating...' : 'Make Private'}</span>
                </>
              ) : (
                <>
                  <Globe size={20} />
                  <span>{isLoading ? 'Updating...' : 'Make Public'}</span>
                </>
              )}
            </button>
          )}

          {/* Leave Party */}
          {memberCount > 1 && (
            <button
              onClick={onLeave}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-semibold py-3 px-4 rounded-lg transition-all duration-200 border border-red-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut size={20} />
              <span>{isLoading ? 'Leaving...' : 'Leave Party'}</span>
            </button>
          )}

          {/* Can't Leave Message */}
          {memberCount === 1 && (
            <div className="w-full flex items-center justify-center gap-2 bg-slate-700/50 text-slate-400 py-3 px-4 rounded-lg border border-slate-600">
              <Users size={18} />
              <span className="text-sm">You're the only member</span>
            </div>
          )}
        </div>

        {/* Leader Badge Info */}
        {isLeader && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-3">
            <Crown className="text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-yellow-400 font-semibold text-sm">Party Leader</p>
              <p className="text-slate-300 text-xs mt-1">
                You can manage party settings and invite members
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PartyInfoSection;