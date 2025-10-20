import { useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { addUserToParty, PARTY_CONFIG } from '../../utils/partyUtils';
import { db, auth } from '../../api/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';
import { usePartyContext } from '../../contexts/PartyContext';

function JoinPage() {

    const [isHandlingInvite, setIsHandlingInvite] = useState(false);
    const {signIn} = useAuth();    
    const {userProfile, refreshUserProfile} = useAuthContext();
    const {refreshPartyProfile} = usePartyContext();
    
    const navigate = useNavigate();
    // Get partyId from URL - adjust based on your routing setup
    const partyId = window.location.pathname.split('/join/')[1];
    const [user, authLoading] = useAuthState(auth);
    
    const [party, setParty] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [joining, setJoining] = useState(false);
    const [memberCount, setMemberCount] = useState(0);

    useEffect(() => {
        const fetchPartyData = async () => {
        if (!partyId) {
            setError('Invalid invite link');
            setLoading(false);
            return;
        }

        try {
            // Fetch party data
            const partyRef = doc(db, 'parties', partyId);
            const partyDoc = await getDoc(partyRef);

            if (!partyDoc.exists()) {
            setError('Party not found. This invite may have expired.');
            setLoading(false);
            return;
            }

            const partyData = partyDoc.data();

            // Check if party is still active
            if (!partyData.isActive) {
            setError('This party is no longer active.');
            setLoading(false);
            return;
            }

            // Get actual member count from subcollection
            const currentMemberCount = partyData.memberCount;

            setParty({ id: partyDoc.id, ...partyData });
            setMemberCount(currentMemberCount);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching party:', err);
            setError('Failed to load party information.');
            setLoading(false);
        }
        };

        fetchPartyData();
    }, [partyId]);

    useEffect(() => {
        const handlePendingInvite = async () => {
            const pendingPartyId = sessionStorage.getItem('pendingPartyInvite');
            
            // ✅ Check for BOTH user AND userProfile
            if (user && userProfile && pendingPartyId === partyId && !joining) {
                console.log('🎉 User logged in with profile, auto-joining party...');
                
                setIsHandlingInvite(true);
                
                sessionStorage.removeItem('pendingPartyInvite');


                // Small delay to let everything settle
                setTimeout(() => {
                    handleJoinParty();
                }, 300);
            }
        };

        handlePendingInvite();
    }, [user, userProfile, partyId]); // ✅ Add userProfile here!

    const handleJoinParty = async () => {
        if (!user) {
            try {
                sessionStorage.setItem('pendingPartyInvite', partyId);
                sessionStorage.setItem('skipAutoAssign', 'true');
            } catch (e) {
                console.warn('Could not store invite in session');
            }
            
            signIn({
                onSuccess: () => {
                    console.log('User signed in, will join party');
                }
            });

            return;
        }

        // ✅ Wait for userProfile to be ready
        if (!userProfile) {
            console.log('⏳ Waiting for user profile...');
            return;
        }

        setJoining(true);
        setError(null);

        try {
            // Check if user is already in a party
            if (userProfile.currentPartyId) {
                setError('You are already in a party. Leave your current party first.');
                setJoining(false);
                return;
            }

            // Check if party is full
            if (memberCount >= PARTY_CONFIG.MAX_MEMBERS) {
                setError('This party is now full.');
                setJoining(false);
                return;
            }

            // Join the party - use userProfile data directly
            await addUserToParty(
                partyId,
                user.uid,
                userProfile.displayName || 'Anonymous',
                {
                    level: userProfile.level || 1,
                    exp: userProfile.exp || 0,
                    health: userProfile.health || 100,
                    mana: userProfile.mana || 100,
                    avatar: userProfile.avatar || 'warrior_01'
                }
            );

            // Update user document
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                currentPartyId: partyId,
                joinedViaInvite: true,
                joinedAt: new Date()
            });

            

            sessionStorage.removeItem('skipAutoAssign'); 

            window.location.href = '/';
            
        } catch (err) {
            console.error('Error joining party:', err);
            setError(err.message || 'Failed to join party. Please try again.');
            setJoining(false);
        }
    };

    // Loading state
    if (authLoading || loading) {
        return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800 text-white">
            <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400">Loading invite...</p>
            </div>
        </div>
        );
    }

    // Error state (party not found)
    if (error && !party) {
        return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800 text-white">
            <div className="bg-gray-800/80 rounded-2xl p-8 w-full max-w-md shadow-2xl text-center backdrop-blur-md">
            <div className="text-red-400 text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold mb-2">Invite Invalid</h2>
            <p className="text-gray-400 mb-6">{error}</p>
            <button
                onClick={() => window.location.href = '/'}
                className="bg-gray-700 hover:bg-gray-600 transition-colors text-white font-semibold py-2 px-6 rounded-lg"
            >
                Go Home
            </button>
            </div>
        </div>
        );
    }

    const isFull = memberCount >= PARTY_CONFIG.MAX_MEMBERS;
    const spotsLeft = PARTY_CONFIG.MAX_MEMBERS - memberCount;

    return (
        <div className="min-h-screen flex items-center justify-center  text-white p-4">
        <div className="bg-gray-800/80 rounded-2xl p-8 w-full max-w-md shadow-2xl text-center backdrop-blur-md">
            {/* Invite Header */}
            <p className="text-gray-400 text-sm mb-2">You've been invited to join</p>

            {/* Party Info */}
            <div className="flex flex-col items-center mb-6">
            {/* <div className="w-20 h-20 rounded-2xl mb-3 border border-gray-700 shadow-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl">
                ⚔️
            </div> */}
            <h2 className="text-2xl font-bold">{party?.title || 'Party'}</h2>
            <div className="flex items-center gap-4 mt-2">
                <p className="text-gray-400 text-sm">
                {memberCount} / {PARTY_CONFIG.MAX_MEMBERS} Members
                </p>
                {party?.currentBoss?.isAlive && (
                <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">
                    Boss Active
                </span>
                )}
            </div>
            {spotsLeft > 0 && spotsLeft <= 2 && (
                <p className="text-yellow-400 text-xs mt-1">
                Only {spotsLeft} spot{spotsLeft > 1 ? 's' : ''} left!
                </p>
            )}
            </div>

            {/* Error Message */}
            {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-sm">{error}</p>
            </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col gap-3">
            {isFull ? (
                <div className="bg-gray-700/50 text-gray-400 font-semibold py-3 rounded-lg">
                Party is Full
                </div>
            ) : (
                <button
                onClick={handleJoinParty}
                disabled={joining}
                className="bg-indigo-500 hover:bg-indigo-600 transition-colors text-white font-semibold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                {joining ? (
                    <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Joining...
                    </span>
                ) : (
                    `Accept Invite ${!user ? '(Login Required)' : ''}`
                )}
                </button>
            )}
            
            {/* <button
                onClick={() => window.location.href = '/'}
                className="text-gray-400 hover:text-white transition-colors text-sm"
            >
                No thanks, take me home
            </button> */}
            </div>

            {/* Party Preview - Shows current boss fight */}
            {party?.currentBoss && (
            <div className="mt-6 pt-6 border-t border-gray-700">
                <p className="text-xs text-gray-500 mb-2">CURRENT CHALLENGE</p>
                <div className="bg-gray-900/50 rounded-lg p-3">
                <p className="font-semibold">{party.currentBoss.name}</p>
                <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div
                        className="bg-red-500 h-2 rounded-full transition-all"
                        style={{
                        width: `${(party.currentBoss.currentHealth / party.currentBoss.maxHealth) * 100}%`
                        }}
                    ></div>
                    </div>
                    <span className="text-xs text-gray-400">
                    {party.currentBoss.currentHealth}/{party.currentBoss.maxHealth}
                    </span>
                </div>
                </div>
            </div>
            )}
        </div>
        </div>
    );
}

export default JoinPage;