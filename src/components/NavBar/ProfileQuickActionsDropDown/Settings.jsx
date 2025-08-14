import React, { useState } from 'react';
import { Crown, AlertCircle, CreditCard } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuthContext } from '../../../contexts/AuthContext';
import { functions } from '../../../api/firebase';

const Settings = () => {
  const { user, userProfile, refreshUserProfile } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);

  // Combine Auth user + Firestore profile
  const currentUser = {
    displayName: user?.displayName || userProfile?.displayName || '',
    email: user?.email || '',
    subscription: {
      tier: userProfile?.subscription?.tier || 'free',
      status: userProfile?.subscription?.status || 'active',
      expiresAt: userProfile?.subscription?.expiresAt
        ? userProfile.subscription.expiresAt.toDate
          ? userProfile.subscription.expiresAt.toDate()
          : new Date(userProfile.subscription.expiresAt)
        : null,
    }
  };

  const handleCancelSubscription = async () => {
  if (!confirm('Are you sure you want to cancel your subscription?')) {
    return;
  }

  try {
    setIsLoading(true);
    console.log('🔴 Attempting to cancel subscription...');
    
    const cancelSubscription = httpsCallable(functions, 'cancelSubscription');
    const result = await cancelSubscription();

    console.log('✅ Cancellation result:', result.data);
    await refreshUserProfile();
    alert(result.data.message || 'Subscription cancelled successfully!');
    
  } catch (error) {
    console.error('❌ Full error object:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);
    
    let errorMessage = `Error: ${error.message}`;
    if (error.code) {
      errorMessage += ` (Code: ${error.code})`;
    }
    
    alert(errorMessage);
  } finally {
    setIsLoading(false);
  }
};

  const isPro = currentUser.subscription.tier === 'pro';

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Subscription Settings</h1>
          <p className="text-gray-400">Manage your Mastery subscription</p>
        </div>

        {/* Current Plan Card */}
        <div className="bg-gray-800 rounded-2xl p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                {isPro ? (
                  <>
                    <Crown className="w-8 h-8 text-yellow-500" />
                    <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                      Pro Plan
                    </span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-8 h-8 text-gray-400" />
                    <span className="text-3xl font-bold text-gray-300">Free Plan</span>
                  </>
                )}
              </div>

              <div className="space-y-2 text-gray-400">
                <p className="text-lg">
                  Status: <span className={`font-medium ${
                    currentUser.subscription.status === 'active' ? 'text-green-400' :
                    currentUser.subscription.status === 'cancel_requested' ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {currentUser.subscription.status === 'cancel_requested'
                      ? 'Cancellation Pending'
                      : currentUser.subscription.status.charAt(0).toUpperCase() + currentUser.subscription.status.slice(1)}
                  </span>
                </p>
                {isPro && currentUser.subscription.expiresAt && (
                  <p className="text-lg">
                    {currentUser.subscription.status === 'cancel_requested' ? 'Ends' : 'Renews'}: {' '}
                    <span className="font-medium text-white">
                      {currentUser.subscription.expiresAt.toLocaleDateString()}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Features List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-3">
              <div className={`flex items-center space-x-3 ${isPro ? 'text-green-400' : 'text-gray-500'}`}>
                <div className={`w-2 h-2 rounded-full ${isPro ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                <span>{isPro ? 'Unlimited' : 'Limited'} AI Generations</span>
              </div>
              <div className={`flex items-center space-x-3 ${isPro ? 'text-green-400' : 'text-gray-500'}`}>
                <div className={`w-2 h-2 rounded-full ${isPro ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                <span>{isPro ? 'Unlimited' : 'Limited'} Decks & Cards</span>
              </div>
              <div className={`flex items-center space-x-3 ${isPro ? 'text-green-400' : 'text-gray-500'}`}>
                <div className={`w-2 h-2 rounded-full ${isPro ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                <span>Smart Review System</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className={`flex items-center space-x-3 ${isPro ? 'text-green-400' : 'text-gray-500'}`}>
                <div className={`w-2 h-2 rounded-full ${isPro ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                <span>Progress Analytics</span>
              </div>
              <div className={`flex items-center space-x-3 ${isPro ? 'text-green-400' : 'text-gray-500'}`}>
                <div className={`w-2 h-2 rounded-full ${isPro ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                <span>Export Features</span>
              </div>
              <div className={`flex items-center space-x-3 ${isPro ? 'text-green-400' : 'text-gray-500'}`}>
                <div className={`w-2 h-2 rounded-full ${isPro ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                <span>Priority Support</span>
              </div>
            </div>
          </div>

          {isPro && currentUser.subscription.status === 'active' && (
            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-xl font-semibold mb-4 text-red-400">Cancel Subscription</h3>
              <p className="text-gray-400 mb-4">
                Your subscription will remain active until the end of your current billing period.
              </p>
              <button
                onClick={handleCancelSubscription}
                disabled={isLoading}
                className="bg-red-600 text-white px-8 py-4 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 w-full font-medium text-lg"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Canceling Subscription...</span>
                  </>
                ) : (
                  <span>Cancel My Subscription</span>
                )}
              </button>
            </div>
          )}

          {currentUser.subscription.status === 'cancel_requested' && (
            <div className="border-t border-gray-700 pt-6">
              <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                  <div>
                    <p className="font-medium text-yellow-400">Subscription Cancellation Scheduled</p>
                    <p className="text-sm text-yellow-200">
                      Your subscription will end on {currentUser.subscription.expiresAt?.toLocaleDateString()}.
                      You can continue using Pro features until then.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;