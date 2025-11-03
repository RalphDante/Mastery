// functions/index.cjs
const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentDeleted, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp, FieldPath } = require('firebase-admin/firestore');
const crypto = require('crypto');

const admin = require('firebase-admin');

const axios = require('axios');

initializeApp();
const db = getFirestore();


// ======================
// MAILER LITE HELPER FUNCTION
// ======================
async function addToMailerLite(email, displayName = 'New User') {
  try {
    const response = await axios.post('https://api.mailerlite.com/api/v2/subscribers', {
      email: email,
      name: displayName,
      fields: {
        signup_source: 'web_app',
        signup_date: new Date().toISOString()
      }
    }, {
      headers: {
        'X-MailerLite-ApiKey': process.env.MAILERLITE_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Added user to MailerLite:', email);
    return response.data;
  } catch (error) {
    console.error('❌ MailerLite API error:', error.response?.data || error.message);
  }
}


// ======================
// AVATAR UPDATE HELPERS
// ======================

// Define which avatars are premium-only
const PREMIUM_AVATARS = ['knight-idle', 'paladin-idle', 'mage-idle', 'assassin-idle'];
const DEFAULT_FREE_AVATAR = 'warrior_01';

// Helper function to check if avatar is premium
function isPremiumAvatar(avatar) {
  return PREMIUM_AVATARS.includes(avatar);
}


async function updateUserInParties(userId, updates, currentPartyId) {
  try {
    console.log(`🔄 Updating party memberships for user ${userId}:`, updates);
    
    // If user is not in any party, nothing to update
    if (!currentPartyId) {
      console.log(`ℹ️ User ${userId} is not in any party`);
      return;
    }
  

    // Update the member document in the party
    const memberRef = db.collection('parties').doc(currentPartyId).collection('members').doc(userId);
    await memberRef.set(updates, { merge: true });
  
    
    console.log(`✅ Updated party membership in ${currentPartyId}`);
  } catch (error) {
    console.error('❌ Error updating party memberships:', error);
    // Don't throw - we don't want party denormalization failures to break subscription updates
  }
}


// ======================
// PADDLE WEBHOOK CODE
// ======================

// Updated Paddle webhook verification function
function verifyPaddleWebhook(rawBody, paddleSignature, webhookSecret) {
  console.log('=== SIGNATURE VERIFICATION ===');
  console.log('Paddle signature:', paddleSignature);
  console.log('Raw body length:', rawBody.length);
  
  // Parse Paddle signature format: ts=timestamp;h1=hash
  const parts = paddleSignature.split(';');
  let timestamp = null;
  let hash = null;
  
  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 'ts') {
      timestamp = value;
    } else if (key === 'h1') {
      hash = value;
    }
  }
  
  if (!timestamp || !hash) {
    console.error('Invalid signature format - missing timestamp or hash');
    return false;
  }
  
  console.log('Parsed timestamp:', timestamp);
  console.log('Parsed hash:', hash);
  
  // Create the signed payload: timestamp + ':' + raw body
  const signedPayload = timestamp + ':' + rawBody;
  console.log('Signed payload preview:', signedPayload.substring(0, 100) + '...');
  
  // Generate expected signature
  const hmac = crypto.createHmac('sha256', webhookSecret);
  hmac.update(signedPayload, 'utf8');
  const expectedHash = hmac.digest('hex');
  
  console.log('Expected hash:', expectedHash);
  console.log('Received hash:', hash);
  console.log('Hashes match:', expectedHash === hash);
  
  return expectedHash === hash;
}

// Extract webhook logic into shared function
async function processPaddleWebhook(req, res, webhookSecret, environment) {
  console.log(`=== ${environment.toUpperCase()} WEBHOOK RECEIVED ===`);
  console.log('Method:', req.method);
  
  try {
    const paddleSignature = req.get('paddle-signature');
    
    if (!paddleSignature) {
      console.error('No paddle-signature header found');
      return res.status(400).send('Missing signature');
    }
    
    if (!webhookSecret) {
      console.error('No webhook secret configured for', environment);
      return res.status(500).send('Webhook secret not configured');
    }

    // Get raw body
    let rawBody;
    if (typeof req.rawBody !== 'undefined') {
      rawBody = req.rawBody.toString('utf8');
    } else {
      rawBody = JSON.stringify(req.body);
    }
    
    console.log('Using raw body, length:', rawBody.length);

    // Verify signature
    if (!verifyPaddleWebhook(rawBody, paddleSignature, webhookSecret)) {
      console.error('Signature verification failed');
      return res.status(401).send('Unauthorized');
    }

    console.log('✅ Signature verification passed!');

    const { event_type, data } = req.body;
    console.log('Processing event:', event_type);

    switch (event_type) {
      case 'subscription.created':
      case 'subscription.updated':
        await handleSubscriptionUpdate(data, environment);
        break;
      case 'subscription.canceled':
      case 'subscription.paused':
        await handleSubscriptionCancellation(data, environment);
        break;
      case 'transaction.completed':
        await handleTransactionCompleted(data, environment);
        break;
      default:
        console.log('Unhandled webhook event:', event_type);
    }

    console.log('Webhook processed successfully');
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error processing webhook');
  }
}

// PRODUCTION WEBHOOK HANDLER
exports.handlePaddleWebhook = onRequest(async (req, res) => {
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
  await processPaddleWebhook(req, res, webhookSecret, 'production');
});

// SANDBOX WEBHOOK HANDLER
exports.handlePaddleWebhookSandbox = onRequest(async (req, res) => {
  const webhookSecret = process.env.SANDBOX_PADDLE_WEBHOOK_SECRET;
  await processPaddleWebhook(req, res, webhookSecret, 'sandbox');
});



async function handleSubscriptionUpdate(data, environment) {
  console.log(`=== ${environment.toUpperCase()} SUBSCRIPTION UPDATE DEBUG ===`);
  console.log('Full data object:', JSON.stringify(data, null, 2));
  
  // Log the structure to understand what we're dealing with
  console.log('data keys:', Object.keys(data));
  console.log('data.customer:', data.customer);
  console.log('data.customer_id:', data.customer_id);
  console.log('data.custom_data:', data.custom_data);
  
  // For Paddle, the email might be in custom_data or we need to fetch customer details
  let userEmail = null;
  
  // Try different approaches to get the email
  if (data.customer && data.customer.email) {
    userEmail = data.customer.email;
    console.log('Found email in data.customer.email:', userEmail);
  } else if (data.custom_data && data.custom_data.userEmail) {
    userEmail = data.custom_data.userEmail;
    console.log('Found email in data.custom_data.userEmail:', userEmail);
  } else if (data.customer_id) {
    console.log('No direct email found, customer_id available:', data.customer_id);
  }

  if (!userEmail) {
    console.error('No email found in webhook data. Available data:', {
      hasCustomer: !!data.customer,
      hasCustomData: !!data.custom_data,
      hasCustomerId: !!data.customer_id,
      customData: data.custom_data
    });
    return;
  }

  const { items, status, next_billed_at, paused_at, canceled_at, scheduled_change } = data;

  try {
    const userQuery = await db.collection('users').where('email', '==', userEmail).get();
    
    if (userQuery.empty) {
      console.error('User not found for email:', userEmail);
      return;
    }

    const userDoc = userQuery.docs[0];
    const userId = userDoc.id;
    const currentUserData = userDoc.data();

    // Check if we have a pending cancellation
    const currentSubscription = currentUserData.subscription || {};
    const hasScheduledCancellation = scheduled_change && scheduled_change.action === 'cancel';
    const isCurrentlyCancelRequested = currentSubscription.status === 'cancel_requested';

    console.log('🔍 Checking cancellation status:', {
      hasScheduledCancellation,
      isCurrentlyCancelRequested,
      paddleStatus: status,
      scheduledChange: scheduled_change
    });

    // Determine subscription tier from price ID
    const priceId = items[0]?.price?.id;

    // Get the correct price IDs based on environment
    const proMonthlyId = environment === 'production' 
      ? process.env.PRICE_PRO_MONTHLY 
      : process.env.SANDBOX_PADDLE_PRICE_PRO_MONTHLY;
    const proYearlyId = environment === 'production'
      ? process.env.PRICE_PRO_YEARLY
      : process.env.SANDBOX_PADDLE_PRICE_PRO_YEARLY;

    let tier = 'free';
    let expiresAt = null;
    let subscriptionStatus = status; // Default to Paddle's status

    // ✅ FIXED: Determine tier BEFORE status logic
    if (priceId === proMonthlyId || priceId === proYearlyId) {
      tier = 'pro';
      console.log(`✅ Detected PRO tier from priceId: ${priceId}`);
    } else {
      console.log(`⚠️ No matching PRO priceId found. Using free tier. PriceId: ${priceId}`);
    }

    // ✅ FIXED: Handle expiration and status logic properly
    if (hasScheduledCancellation) {
      // Paddle has a scheduled cancellation
      subscriptionStatus = 'cancel_requested';
      expiresAt = Timestamp.fromDate(new Date(scheduled_change.effective_at));
      console.log('📅 Using scheduled cancellation date:', scheduled_change.effective_at);
    } else if (isCurrentlyCancelRequested && status === 'active') {
      // We have a local cancellation but Paddle still shows active
      // DON'T override - keep our cancellation status
      subscriptionStatus = 'cancel_requested';
      expiresAt = currentSubscription.expiresAt; // Keep existing expiration
      console.log('⚠️ Preserving local cancellation status, Paddle not yet updated');
    } else if (canceled_at) {
      // Actually canceled
      subscriptionStatus = 'canceled';
      expiresAt = Timestamp.fromDate(new Date(canceled_at));
      console.log('📅 Subscription canceled at:', canceled_at);
    } else if (next_billed_at && (status === 'active' || status === 'trialing')) {
      // ✅ CRITICAL FIX: Handle BOTH active AND trialing subscriptions
      subscriptionStatus = status; // Preserve 'trialing' or 'active' from Paddle
      expiresAt = Timestamp.fromDate(new Date(next_billed_at));
      console.log(`📅 Setting subscription as ${status} with next billing/trial end:`, next_billed_at);
    }

    // If no expiration date determined, keep the existing one
    if (!expiresAt && currentSubscription.expiresAt) {
      expiresAt = currentSubscription.expiresAt;
      console.log('🔄 Keeping existing expiration date');
    }

    console.log('📋 Final subscription update:', {
      tier,
      status: subscriptionStatus,
      expiresAt: expiresAt ? expiresAt.toDate?.() || expiresAt : null
    });

    // Update subscription AND limits when tier changes
    const updateData = {
      subscription: {
        tier: tier,
        status: subscriptionStatus,
        expiresAt: expiresAt,
        priceId: priceId,
        paddleSubscriptionId: data.id,
        updatedAt: FieldValue.serverTimestamp()
      }
    };

    // Update tier-based limits based on new subscription
    if (tier === 'pro') {
      updateData['limits.maxAiGenerations'] = -1;
      updateData['limits.maxCards'] = -1;
      updateData['limits.maxDecks'] = -1;
      updateData['limits.maxSmartReviewDecks'] = -1;
      updateData['limits.maxFolders'] = -1;

      // Update avatar to knight when upgrading to pro
      updateData['avatar'] = 'knight-idle';
      console.log(`🛡️ Upgrading avatar to knight-idle for pro user ${userId}`);
    } else {
      // Free tier limits
      updateData['limits.maxAiGenerations'] = 20;
      updateData['limits.maxCards'] = 100;
      updateData['limits.maxDecks'] = 5;
      updateData['limits.maxSmartReviewDecks'] = 2;
      updateData['limits.maxFolders'] = 10; 

      // Revert premium avatars when downgrading
      if (isPremiumAvatar(currentUserData.avatar)) {
        updateData['avatar'] = DEFAULT_FREE_AVATAR;
        console.log(`⬇️ Reverting premium avatar to ${DEFAULT_FREE_AVATAR}`);
      }
    }

    // Denormalize avatar and tier to party membership
    await updateUserInParties(
      userId, 
      {
        avatar: updateData['avatar'] || currentUserData.avatar,
        tier: tier
      },
      currentUserData.currentPartyId
    );

    await db.collection('users').doc(userId).update(updateData);

    console.log(`✅ Updated subscription for user ${userId}: ${tier} (${subscriptionStatus})`);
  } catch (error) {
    console.error('Error updating subscription:', error);
  }
}




// 🆕 TRIGGER: When user manually changes avatar or tier, update their party membership
exports.onUserAvatarUpdate = onDocumentUpdated('users/{userId}', async (event) => {
  try {
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();
    
    const avatarChanged = beforeData.avatar !== afterData.avatar;
    const tierChanged = beforeData.subscription?.tier !== afterData.subscription?.tier;
    const nameChanged = beforeData.displayName !== afterData.displayName;

    
    // Only proceed if avatar or tier changed
    if (!avatarChanged && !tierChanged && !nameChanged) {
      return;
    }
    
    // Also skip if user isn't in a party
    if (!afterData.currentPartyId) {
      console.log(`ℹ️ User ${event.params.userId} avatar/tier changed but not in a party`);
      return;
    }
    
    const userId = event.params.userId;
    
    console.log(`👤 User ${userId} data changed:`, {
      avatarChanged,
      tierChanged,
      newAvatar: afterData.avatar,
      newTier: afterData.subscription?.tier
    });
    
    // Build update object
    const updates = {};
    
    if (avatarChanged) updates.avatar = afterData.avatar;
    if (tierChanged) updates.tier = afterData.subscription?.tier || 'free';
    if (nameChanged) updates.displayName = afterData.displayName;
    
    // Sync to party membership (pass partyId to avoid extra read)
    await updateUserInParties(userId, updates, afterData.currentPartyId);
    
  } catch (error) {
    console.error('Error in onUserAvatarUpdate:', error);
  }
});

async function handleSubscriptionCancellation(data, environment) {
  console.log(`=== ${environment.toUpperCase()} SUBSCRIPTION CANCELLATION ===`);
  console.log('Full data object:', JSON.stringify(data, null, 2));
  
  // Extract email (same logic as handleSubscriptionUpdate)
  let userEmail = null;
  if (data.customer && data.customer.email) {
    userEmail = data.customer.email;
  } else if (data.custom_data && data.custom_data.userEmail) {
    userEmail = data.custom_data.userEmail;
  }

  if (!userEmail) {
    console.error('No email found in cancellation webhook');
    return;
  }

  const { canceled_at, status } = data;

  try {
    const userQuery = await db.collection('users').where('email', '==', userEmail).get();
    
    if (userQuery.empty) {
      console.error('User not found for email:', userEmail);
      return;
    }

    const userDoc = userQuery.docs[0];
    const userId = userDoc.id;

    // Set expiration date (when subscription actually ends)
    const expiresAt = canceled_at ? 
      Timestamp.fromDate(new Date(canceled_at)) : 
      FieldValue.serverTimestamp();

    await db.collection('users').doc(userId).update({
      'subscription.status': 'canceled',
      'subscription.expiresAt': expiresAt,
      'subscription.updatedAt': FieldValue.serverTimestamp()
      // Don't change tier yet - let the scheduled function handle expiration
    });

    console.log(`✅ Subscription canceled for user ${userId}, expires at:`, canceled_at);
  } catch (error) {
    console.error('Error handling cancellation:', error);
  }
}

async function handleTransactionCompleted(data, environment) {
  console.log(`=== ${environment.toUpperCase()} TRANSACTION COMPLETED ===`);
}

exports.cancelSubscription = onCall(async (request) => {
  console.log('🔴 cancelSubscription called');
  
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    const userId = request.auth.uid;
    console.log('👤 User ID:', userId);
    
    // Get user's current subscription
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'User profile not found');
    }
    
    const userData = userDoc.data();
    const subscription = userData.subscription;
    
    console.log('📋 Current subscription data:', JSON.stringify(subscription, null, 2));
    
    if (!subscription || !subscription.paddleSubscriptionId) {
      throw new HttpsError('failed-precondition', 'No active subscription found');
    }
    
    const environment = process.env.ENVIRONMENT || 'sandbox';
    const paddleApiKey = environment === "production" ? 
        process.env.PADDLE_API_KEY
      : process.env.SANDBOX_PADDLE_API_KEY
    ;

    
    console.log('🔑 Paddle API key exists:', !!paddleApiKey);
    console.log('🌍 Environment:', environment);
    
    if (!paddleApiKey) {
      throw new HttpsError('internal', 'Service configuration error - missing API key');
    }
    
    const paddleBaseUrl = environment === 'production' 
      ? 'https://api.paddle.com' 
      : 'https://sandbox-api.paddle.com';
    
    console.log('🚀 Calling Paddle API to cancel subscription:', subscription.paddleSubscriptionId);
    console.log('🌐 Using base URL:', paddleBaseUrl);
    
    // Cancel via Paddle API
    let paddleResponse;
    try {
      paddleResponse = await fetch(`${paddleBaseUrl}/subscriptions/${subscription.paddleSubscriptionId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${paddleApiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          effective_from: 'next_billing_period'
        })
      });
      
      console.log('📡 Paddle API response status:', paddleResponse.status);
      
    } catch (fetchError) {
      console.error('❌ Network error calling Paddle API:', fetchError);
      throw new HttpsError('unavailable', 'Unable to connect to payment service');
    }
    
    if (!paddleResponse.ok) {
      const errorText = await paddleResponse.text();
      console.error('❌ Paddle API error:', errorText);
      
      if (paddleResponse.status === 403) {
        console.error('❌ 403 Forbidden - Check API key permissions');
        throw new HttpsError('permission-denied', 
          'Insufficient permissions to cancel subscription. Please contact support.');
      } else if (paddleResponse.status === 404) {
        throw new HttpsError('not-found', 'Subscription not found');
      } else if (paddleResponse.status === 401) {
        throw new HttpsError('unauthenticated', 'Invalid API key');
      }
      
      throw new HttpsError('internal', `Payment service error: ${paddleResponse.status}`);
    }
    
    const paddleResult = await paddleResponse.json();
    console.log('✅ Paddle cancellation successful:', JSON.stringify(paddleResult, null, 2));
    
    // FIXED: Better logic for extracting the expiration date
    let expiresAt = null;
    
    // Check multiple possible paths in Paddle's response
    if (paddleResult.data) {
      const data = paddleResult.data;
      
      // Priority 1: scheduled_change.effective_at (when cancellation takes effect)
      if (data.scheduled_change && data.scheduled_change.effective_at) {
        expiresAt = Timestamp.fromDate(new Date(data.scheduled_change.effective_at));
        console.log('📅 Setting expiresAt from scheduled_change.effective_at:', data.scheduled_change.effective_at);
      }
      // Priority 2: canceled_at (immediate cancellation)
      else if (data.canceled_at) {
        expiresAt = Timestamp.fromDate(new Date(data.canceled_at));
        console.log('📅 Setting expiresAt from canceled_at:', data.canceled_at);
      }
      // Priority 3: next_billed_at (end of current billing period)
      else if (data.next_billed_at) {
        expiresAt = Timestamp.fromDate(new Date(data.next_billed_at));
        console.log('📅 Setting expiresAt from next_billed_at:', data.next_billed_at);
      }
      // Priority 4: current_billing_period.ends_at
      else if (data.current_billing_period && data.current_billing_period.ends_at) {
        expiresAt = Timestamp.fromDate(new Date(data.current_billing_period.ends_at));
        console.log('📅 Setting expiresAt from current_billing_period.ends_at:', data.current_billing_period.ends_at);
      }
    }
    
    // Fallback: If we can't get the date from Paddle, keep the existing expiresAt
    if (!expiresAt && subscription.expiresAt) {
      expiresAt = subscription.expiresAt;
      console.log('⚠️ Using existing expiresAt as fallback:', expiresAt);
    }
    
    // Log the final expiration date
    console.log('📅 Final expiresAt:', expiresAt ? expiresAt.toDate().toISOString() : 'null');
    
    // Update local status
    console.log('💾 Updating user subscription status...');
    const updateData = {
      'subscription.status': 'cancel_requested',
      'subscription.updatedAt': FieldValue.serverTimestamp()
    };
    
    // Only update expiresAt if we have a valid date
    if (expiresAt) {
      updateData['subscription.expiresAt'] = expiresAt;
      console.log('💾 Including expiresAt in update');
    } else {
      console.log('⚠️ No valid expiresAt found - keeping existing value');
    }
    
    console.log('💾 Update data:', updateData);
    
    await db.collection('users').doc(userId).update(updateData);
    
    console.log('✅ Database update completed');
    
    // Verify the update worked
    const updatedUserDoc = await db.collection('users').doc(userId).get();
    const updatedData = updatedUserDoc.data();
    console.log('🔍 Verified updated subscription:', JSON.stringify(updatedData.subscription, null, 2));
    
    return { 
      success: true, 
      message: 'Subscription will be canceled at the end of your billing period',
      canceledAt: expiresAt ? expiresAt.toDate().toISOString() : null
    };
    
  } catch (error) {
    console.error('💥 cancelSubscription error:', error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    throw new HttpsError('internal', 'An unexpected error occurred');
  }
});


// MANUAL DOWNGRADE TEST
exports.manuallyProcessExpired = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    console.log('🧪 MANUAL EXPIRATION TEST - Processing expired subscriptions');
    
    const now = Timestamp.now();
    
    const expiredQuery = await db.collection('users')
      .where('subscription.expiresAt', '<=', now)
      .where('subscription.tier', '==', 'pro')
      .get();
    
    console.log(`Found ${expiredQuery.size} expired subscriptions for manual processing`);
    
    if (expiredQuery.empty) {
      return { 
        success: true, 
        message: 'No expired subscriptions found',
        processed: 0 
      };
    }
    
    const processedUsers = [];
    
    // ✅ FIXED: Process each user individually (not in batch) to handle party updates
    for (const userDoc of expiredQuery.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      console.log(`⬇️ MANUAL: Downgrading expired subscription for user ${userId}`);
      
      const updateData = {
        'subscription.tier': 'free',
        'subscription.status': 'expired',
        'subscription.updatedAt': FieldValue.serverTimestamp(),
        'subscription.manuallyProcessed': true,
        
        'limits.maxAiGenerations': 20,
        'limits.maxCards': 100,
        'limits.maxDecks': 5,
        'limits.maxSmartReviewDecks': 2,
        'limits.maxFolders': 10
      };
      
      // ✅ REVERT PREMIUM AVATARS
      if (isPremiumAvatar(userData.avatar)) {
        updateData['avatar'] = DEFAULT_FREE_AVATAR;
        console.log(`⬇️ Reverting premium avatar for ${userId}`);
      }
      
      // Update user document
      await db.collection('users').doc(userId).update(updateData);
      
      // ✅ UPDATE PARTY MEMBERSHIP
      if (userData.currentPartyId) {
        await updateUserInParties(userId, {
          avatar: updateData['avatar'] || userData.avatar,
          tier: 'free'
        }, userData.currentPartyId);
      }
      
      processedUsers.push({
        userId,
        email: userData.email,
        previousTier: 'pro'
      });
    }
    
    console.log(`✅ MANUAL: Processed ${expiredQuery.size} expired subscriptions`);
    
    return {
      success: true,
      message: `Manually processed ${expiredQuery.size} expired subscriptions`,
      processed: expiredQuery.size,
      users: processedUsers
    };
    
  } catch (error) {
    console.error('Error in manual expiration processing:', error);
    throw new HttpsError('internal', 'Failed to process expired subscriptions');
  }
});

// ======================
// DECK TRACKING (aligned with your schema)
// ======================

exports.onDeckCreate = onDocumentCreated('decks/{deckId}', async (event) => {
  try {
    const snap = event.data;
    const deckData = snap.data();
    const userId = deckData.ownerId; // Using ownerId as per your schema
    const folderId = deckData.folderId; // Extract folder reference
    
    if (!userId) {
      console.error('No ownerId found in deck:', event.params.deckId);
      return;
    }
    
    console.log(`📝 Deck created by user ${userId}, updating counts`);
    
    // Use batch to update both user and folder counts atomically
    const batch = db.batch();
    
    // Update user's deck count
    const userRef = db.collection('users').doc(userId);
    batch.update(userRef, {
      'limits.currentDecks': FieldValue.increment(1)
    });
    
    // Update folder's deck count if folder exists
    if (folderId) {
      const folderRef = db.collection('folders').doc(folderId);
      batch.update(folderRef, {
        deckCount: FieldValue.increment(1)
      });
    }
    
    await batch.commit();
    
  } catch (error) {
    console.error('Error updating deck count on create:', error);
  }
});

exports.onDeckDelete = onDocumentDeleted('decks/{deckId}', async (event) => {
  try {
    const snap = event.data;
    const deckData = snap.data();
    const userId = deckData?.ownerId;
    const folderId = deckData?.folderId;
    const deckId = event.params.deckId;
    
    console.log(`🗑️ DECK DELETE TRIGGERED for deck: ${deckId}`);
    
    if (!userId) {
      console.error('❌ No ownerId found in deleted deck:', deckId);
      return;
    }
    
    if (!deckData) {
      console.error('❌ No deck data found for deleted deck:', deckId);
      return;
    }
    
    // Get the card count from the deleted deck data
    const cardCount = deckData.cardCount || 0;
    
    console.log(`🗑️ Deck ${deckId} deleted by user ${userId}, updating counts (${cardCount} cards)`);
    
    const batch = db.batch();
    
    // Update user's deck count AND card count
    const userRef = db.collection('users').doc(userId);
    batch.update(userRef, {
      'limits.currentDecks': FieldValue.increment(-1),
      'limits.currentCards': FieldValue.increment(-cardCount) // Decrement all cards at once
    });
    
    console.log(`📊 Decrementing deck count for user ${userId}`);
    console.log(`📊 Decrementing ${cardCount} cards for user ${userId}`);
    
    // Update folder's deck count ONLY if folder still exists
    if (folderId) {
      try {
        const folderRef = db.collection('folders').doc(folderId);
        const folderDoc = await folderRef.get();
        if (folderDoc.exists) {
          batch.update(folderRef, {
            deckCount: FieldValue.increment(-1)
          });
          console.log(`📊 Decrementing deck count for folder ${folderId}`);
        } else {
          console.log(`⚠️ Folder ${folderId} already deleted, skipping folder count update`);
        }
      } catch (folderError) {
        console.log('⚠️ Folder update failed (likely already deleted):', folderError.message);
        // Don't let folder errors stop the user count update
      }
    }
    
    await batch.commit();
    console.log(`✅ Completed deck delete handling for ${deckId}`);
    
  } catch (error) {
    console.error('❌ Error updating deck count on delete:', error);
  }
});

// ======================
// CARD TRACKING (aligned with your schema)
// ======================

exports.onCardCreate = onDocumentCreated('decks/{deckId}/cards/{cardId}', async (event) => {
  try {
    const deckId = event.params.deckId;
    
    // Get the deck to find the owner
    const deckDoc = await db.collection('decks').doc(deckId).get();
    if (!deckDoc.exists) {
      console.error('Deck not found:', deckId);
      return;
    }
    
    const deckData = deckDoc.data();
    const userId = deckData.ownerId;
    
    if (!userId) {
      console.error('No ownerId field in deck:', deckId);
      return;
    }
    
    console.log(`📇 Card created in deck ${deckId} by user ${userId}, updating counts`);
    
    const batch = db.batch();
    
    // Update user's card count
    const userRef = db.collection('users').doc(userId);
    batch.update(userRef, {
      'limits.currentCards': FieldValue.increment(1)
    });
    
    // Update deck's card count (denormalized)
    const deckRef = db.collection('decks').doc(deckId);
    batch.update(deckRef, {
      cardCount: FieldValue.increment(1)
    });
    
    await batch.commit();
    
  } catch (error) {
    console.error('Error updating card count on create:', error);
  }
});

// ======================
// CARD TRACKING - OPTIMIZED (No cardProgress cleanup)
// ======================

exports.onCardDelete = onDocumentDeleted('decks/{deckId}/cards/{cardId}', async (event) => {
  try {
    const deckId = event.params.deckId;
    const cardId = event.params.cardId;
    
    console.log(`🗑️ CARD DELETE TRIGGERED for card: ${cardId} in deck: ${deckId}`);
    
    // Try to get the deck to find the owner
    let userId = null;
    let deckExists = false;
    let isDeckCascadeDelete = false;
    
    try {
      const deckDoc = await db.collection('decks').doc(deckId).get();
      if (deckDoc.exists) {
        const deckData = deckDoc.data();
        userId = deckData?.ownerId;
        deckExists = true;
        console.log(`Found deck ${deckId}, owner: ${userId}`);
      } else {
        console.log(`⚠️ Deck ${deckId} not found (likely cascade delete from deck/folder deletion)`);
        isDeckCascadeDelete = true;
        // No fallback needed - if deck is gone, onDeckDelete handles counts
      }
    } catch (deckError) {
      console.log('⚠️ Error fetching deck:', deckError.message);
      isDeckCascadeDelete = true;
    }
    
    // If this is a cascade delete, skip individual count updates
    // The parent delete handler (onDeckDelete or onFolderDelete) handles bulk counts
    if (isDeckCascadeDelete) {
      console.log('🔄 Cascade delete detected - parent handler manages counts');
      return; // Exit early - NO READS needed!
    }
    
    if (!userId) {
      console.log('⚠️ No userId found - orphaned card, skipping');
      return;
    }
    
    console.log(`🗑️ Individual card ${cardId} deleted, updating counts`);
    
    const batch = db.batch();
    
    // Update user's card count (only for individual deletions)
    const userRef = db.collection('users').doc(userId);
    batch.update(userRef, {
      'limits.currentCards': FieldValue.increment(-1)
    });
    
    // Update deck's card count (only if deck exists)
    if (deckExists) {
      const deckRef = db.collection('decks').doc(deckId);
      batch.update(deckRef, {
        cardCount: FieldValue.increment(-1)
      });
      console.log(`📊 Decrementing counts: user & deck`);
    }
    
    await batch.commit();
    console.log(`✅ Card delete completed`);
    
  } catch (error) {
    console.error('❌ Error in onCardDelete:', error);
  }
});

// ======================
// FOLDER TRACKING (aligned with your schema)
// ======================

exports.onFolderCreate = onDocumentCreated('folders/{folderId}', async (event) => {
  try {
    const snap = event.data;
    const folderData = snap.data();
    const userId = folderData.ownerId; // Using ownerId as per your schema
    
    if (!userId) {
      console.error('No ownerId found in folder:', event.params.folderId);
      return;
    }
    
    console.log(`📁 Folder created by user ${userId}, incrementing folder count`);
    
    await db.collection('users').doc(userId).update({
      'limits.currentFolders': FieldValue.increment(1)
    });
    
  } catch (error) {
    console.error('Error updating folder count on create:', error);
  }
});

exports.onFolderDelete = onDocumentDeleted('folders/{folderId}', async (event) => {
  try {
    const snap = event.data;
    const folderData = snap.data();
    const userId = folderData.ownerId;
    const folderId = event.params.folderId;
    
    if (!userId) {
      console.error('No ownerId found in deleted folder:', folderId);
      return;
    }
    
    console.log(`🗑️ Folder deleted by user ${userId}, handling cascade deletion`);
    
    // Find all decks in this folder that need cleanup
    const decksInFolder = await db.collection('decks')
      .where('folderId', '==', folderId)
      .get();
    
    console.log(`Found ${decksInFolder.size} decks in deleted folder ${folderId}`);
    
    let totalCardsToDecrement = 0;
    
    // Use the cardCount field from each deck (much more efficient)
    decksInFolder.docs.forEach(deckDoc => {
      const deckData = deckDoc.data();
      const cardCount = deckData.cardCount || 0;
      totalCardsToDecrement += cardCount;
    });
    
    console.log(`Total cards to decrement: ${totalCardsToDecrement}`);
    
    // Update user counts - decrementing for the folder and all its contents
    await db.collection('users').doc(userId).update({
      'limits.currentFolders': FieldValue.increment(-1),
      'limits.currentDecks': FieldValue.increment(-decksInFolder.size),
      'limits.currentCards': FieldValue.increment(-totalCardsToDecrement)
    });
    
    console.log(`✅ Updated counts for user ${userId}: -1 folder, -${decksInFolder.size} decks, -${totalCardsToDecrement} cards`);
    
  } catch (error) {
    console.error('Error handling folder cascade deletion:', error);
  }
});

// ======================
// AI GENERATION TRACKING (with monthly reset)
// ======================

exports.trackAiGeneration = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }
    
    const userId = request.auth.uid;
    const userRef = db.collection('users').doc(userId);
    
    return await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists) {
        throw new Error('User profile not found');
      }
      
      const userData = userDoc.data();
      const limits = userData.limits || {};
      
      // Check if we need to reset the monthly count
      const now = new Date();
      const resetDate = limits.aiGenerationsResetAt ? limits.aiGenerationsResetAt.toDate() : now;
      
      if (resetDate <= now) {
        // Reset the monthly count
        const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        transaction.update(userRef, {
          'limits.aiGenerationsUsed': 1,
          'limits.aiGenerationsResetAt': Timestamp.fromDate(nextMonthStart)
        });
        console.log(`🔄 Reset AI generations for user ${userId}`);
      } else {
        // Just increment the count
        transaction.update(userRef, {
          'limits.aiGenerationsUsed': FieldValue.increment(1)
        });
        
        console.log(`🤖 AI generation used by user ${userId}`);
      }
      
      return { success: true };
    });
    
  } catch (error) {
    console.error('Error tracking AI generation:', error);
    throw new Error('Error tracking AI generation');
  }
});

// ======================
// USER INITIALIZATION (aligned with your schema)
// ======================

exports.onUserCreate = onDocumentCreated('users/{userId}', async (event) => {
  try {
    const userId = event.params.userId;
    const userData = event.data.data();

    const isInProduction = process.env.ENVIRONMENT === "production";
    
    if (isInProduction && userData.email) {
      await addToMailerLite(userData.email, userData.displayName);
      console.log(`✅ Added user ${userId} to MailerLite`);
    }
    
  } catch (error) {
    console.error('Error in onUserCreate:', error);
  }
});

// ======================
// REVIEW SESSION TRACKING (aligned with your schema)
// ======================

// exports.onReviewSessionCreate = onDocumentCreated('reviewSessions/{sessionId}', async (event) => {
//   try {
//     const snap = event.data;
//     const sessionData = snap.data();
//     const userId = sessionData.userId;
    
//     if (!userId) {
//       console.error('No userId in review session:', event.params.sessionId);
//       return;
//     }
    
//     // Update user stats and daily session
//     const batch = db.batch();
//     const userRef = db.collection('users').doc(userId);
    
//     // Update user stats (denormalized)
//     batch.update(userRef, {
//       'stats.totalReviews': FieldValue.increment(sessionData.cardsReviewed || 0),
//       'stats.weeklyReviews': FieldValue.increment(sessionData.cardsReviewed || 0),
//       lastStudyDate: sessionData.endTime || FieldValue.serverTimestamp()
//     });
    
//     // Update or create daily session
//     const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
//     const dailySessionRef = db.collection('users').doc(userId).collection('dailySessions').doc(today);
    
//     batch.set(dailySessionRef, {
//       date: Timestamp.fromDate(new Date()),
//       cardsReviewed: FieldValue.increment(sessionData.cardsReviewed || 0),
//       cardsCorrect: FieldValue.increment(sessionData.cardsCorrect || 0),
//       accuracy: sessionData.accuracy || 0,
//       lastSessionAt: sessionData.endTime || FieldValue.serverTimestamp(),
//       minutesStudied: FieldValue.increment(
//         Math.round((sessionData.endTime?.toMillis() - sessionData.startTime?.toMillis()) / 60000) || 0
//       )
//     }, { merge: true });
    
//     // Set firstSessionAt only if this is the first session today
//     batch.update(dailySessionRef, {
//       firstSessionAt: sessionData.startTime || FieldValue.serverTimestamp()
//     });
    
//     await batch.commit();
    
//     console.log(`📊 Updated stats for user ${userId} after review session`);
    
//   } catch (error) {
//     console.error('Error updating stats after review session:', error);
//   }
// });

// ======================
// UTILITY FUNCTIONS
// ======================

exports.syncUserCounts = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }
    
    const userId = request.auth.uid;
    
    // Count user's current resources
    const [decksSnapshot, foldersSnapshot] = await Promise.all([
      db.collection('decks').where('ownerId', '==', userId).get(),
      db.collection('folders').where('ownerId', '==', userId).get()
    ]);
    
    // Count cards across all user's decks
    let totalCards = 0;
    const cardCountPromises = decksSnapshot.docs.map(async (deckDoc) => {
      const cardsSnapshot = await db.collection('decks').doc(deckDoc.id).collection('cards').get();
      return cardsSnapshot.size;
    });
    
    const cardCounts = await Promise.all(cardCountPromises);
    totalCards = cardCounts.reduce((sum, count) => sum + count, 0);
    
    // Update the counts
    await db.collection('users').doc(userId).update({
      'limits.currentDecks': decksSnapshot.size,
      'limits.currentFolders': foldersSnapshot.size,
      'limits.currentCards': totalCards
    });
    
    console.log(`🔄 Synced counts for user ${userId}: ${decksSnapshot.size} decks, ${foldersSnapshot.size} folders, ${totalCards} cards`);
    
    return {
      success: true,
      counts: {
        decks: decksSnapshot.size,
        folders: foldersSnapshot.size,
        cards: totalCards
      }
    };
    
  } catch (error) {
    console.error('Error syncing user counts:', error);
    throw new Error('Error syncing counts');
  }
});

// ======================
// LEADERBOARD FUNCTIONS 
// ======================

// Helper functions
function getWeekId(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

function getMonthId(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}

function getYesterdayDate(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

// ======================
// MIDNIGHT UPDATE: Process yesterday's sessions
// ======================

exports.dailyLeaderboardUpdate = onSchedule(
  {
    schedule: "0 0 * * *", // Midnight UTC
    timeZone: "UTC",
    region: "us-central1",
  },
  async (event) => {
    const now = new Date();
    const yesterday = getYesterdayDate(now);
    const yesterdayDate = new Date(yesterday);
    const weekId = getWeekId(yesterdayDate);
    const monthId = getMonthId(yesterdayDate);
    
    console.log('🕐 Midnight leaderboard update started');
    console.log(`   Processing sessions from: ${yesterday}`);
    console.log(`   Week: ${weekId}, Month: ${monthId}`);
    
    try {
      // ========================================
      // STEP 1: Find all users who studied YESTERDAY
      // ========================================
      const yesterdayStart = new Date(yesterday);
      yesterdayStart.setHours(0, 0, 0, 0);

      const yesterdayEnd = new Date(yesterday);
      yesterdayEnd.setHours(23, 59, 59, 999);

      const yesterdaySessionsSnapshot = await db.collectionGroup('dailySessions')
        .where('date', '>=', Timestamp.fromDate(yesterdayStart))
        .where('date', '<=', Timestamp.fromDate(yesterdayEnd))
        .get();
      
      console.log(`   Found ${yesterdaySessionsSnapshot.size} sessions from yesterday`);
      
      if (yesterdaySessionsSnapshot.empty) {
        console.log('   No sessions to process');
        return null;
      }
      
      // ========================================
      // STEP 2: Increment leaderboard entries
      // ========================================
      let batch = db.batch();
      let batchCount = 0;
      let updateCount = 0;
      const MAX_BATCH_SIZE = 400; // Leave room for 2 writes per user
      
      for (const sessionDoc of yesterdaySessionsSnapshot.docs) {
        // Extract userId from path: users/{userId}/dailySessions/{date}
        const userId = sessionDoc.ref.parent.parent.id;
        const sessionData = sessionDoc.data();
        const minutesStudied = sessionData.minutesStudied || 0;
        
        if (minutesStudied === 0) continue;
        
        console.log(`   Processing user ${userId}: ${minutesStudied} minutes`);
        
        // Get user's display data (for first-time leaderboard entry)
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (!userDoc.exists) {
          console.log(`   ⚠️ User ${userId} not found, skipping`);
          continue;
        }
        
        const userData = userDoc.data();
        
        // ========================================
        // A. UPDATE WEEKLY LEADERBOARD
        // ========================================
        const weeklyLeaderboardRef = db.collection('leaderboards')
          .doc('weekly')
          .collection(weekId)
          .doc(userId);
        
        batch.set(weeklyLeaderboardRef, {
          displayName: userData.displayName || 'Anonymous',
          minutes: FieldValue.increment(minutesStudied),
          avatar: userData.avatar || 'warrior_01',
          level: userData.level || 1,
          isPro: userData.subscription?.tier === 'pro' || false,
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
        
        batchCount++;
        
        // ========================================
        // B. UPDATE MONTHLY LEADERBOARD
        // ========================================
        const monthlyLeaderboardRef = db.collection('leaderboards')
          .doc('monthly')
          .collection(monthId)
          .doc(userId);
        
        batch.set(monthlyLeaderboardRef, {
          displayName: userData.displayName || 'Anonymous',
          minutes: FieldValue.increment(minutesStudied),
          avatar: userData.avatar || 'warrior_01',
          level: userData.level || 1,
          isPro: userData.subscription?.tier === 'pro' || false,
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
        
        batchCount++;
        updateCount++;
        
        // Commit batch if full
        if (batchCount >= MAX_BATCH_SIZE) {
          console.log(`   💾 Committing batch (${batchCount} writes)...`);
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      }
      
      // Commit remaining writes
      if (batchCount > 0) {
        console.log(`   💾 Committing final batch (${batchCount} writes)...`);
        await batch.commit();
      }
      
      console.log(`✅ Midnight update complete: ${updateCount} users updated`);
      return null;
      
    } catch (error) {
      console.error('❌ Midnight update failed:', error);
      throw error;
    }
  }
);

// ======================
// GET WEEKLY LEADERBOARD
// ======================

exports.getWeeklyLeaderboard = onCall(async (request) => {
  try {
    const { weekId, limit = 100 } = request.data || {};
    const now = new Date();
    const currentWeekId = getWeekId(now);
    const targetWeekId = weekId || currentWeekId;
    
    console.log(`📊 Fetching weekly leaderboard for ${targetWeekId}`);
    
    // Query leaderboard collection
    const snapshot = await db.collection('leaderboards')
      .doc('weekly')
      .collection(targetWeekId)
      .orderBy('minutes', 'desc')
      .limit(limit)
      .get();
    
    const leaderboard = snapshot.docs.map((doc, index) => {
      const data = doc.data();
      return {
        rank: index + 1,
        userId: doc.id,
        displayName: data.displayName || 'Anonymous',
        minutes: data.minutes || 0,
        avatar: data.avatar || 'warrior_01',
        level: data.level || 1,
        isPro: data.isPro || false
      };
    });
    
    // Find authenticated user's rank
    let userRank = null;
    let userMinutes = 0;
    
    if (request.auth) {
      // Check if user is in top 100
      const userEntry = leaderboard.find(entry => entry.userId === request.auth.uid);
      
      if (userEntry) {
        userRank = userEntry.rank;
        userMinutes = userEntry.minutes;
      } else {
        // Not in top 100, calculate actual rank
        const userDoc = await db.collection('leaderboards')
          .doc('weekly')
          .collection(targetWeekId)
          .doc(request.auth.uid)
          .get();
        
        if (userDoc.exists) {
          userMinutes = userDoc.data().minutes || 0;
          
          // Count how many users have more minutes
          const aboveCount = await db.collection('leaderboards')
            .doc('weekly')
            .collection(targetWeekId)
            .where('minutes', '>', userMinutes)
            .count()
            .get();
          
          userRank = aboveCount.data().count + 1;
        }
      }
    }
    
    return {
      weekId: targetWeekId,
      isCurrent: targetWeekId === currentWeekId,
      leaderboard,
      userRank,
      userMinutes,
      totalPlayers: snapshot.size
    };
    
  } catch (error) {
    console.error('Error fetching weekly leaderboard:', error);
    throw new HttpsError('internal', 'Failed to fetch leaderboard');
  }
});

// ======================
// GET MONTHLY LEADERBOARD
// ======================

exports.getMonthlyLeaderboard = onCall(async (request) => {
  try {
    const { monthId, limit = 100 } = request.data || {};
    const now = new Date();
    const currentMonthId = getMonthId(now);
    const targetMonthId = monthId || currentMonthId;
    
    console.log(`📊 Fetching monthly leaderboard for ${targetMonthId}`);
    
    // Query leaderboard collection
    const snapshot = await db.collection('leaderboards')
      .doc('monthly')
      .collection(targetMonthId)
      .orderBy('minutes', 'desc')
      .limit(limit)
      .get();
    
    const leaderboard = snapshot.docs.map((doc, index) => {
      const data = doc.data();
      return {
        rank: index + 1,
        userId: doc.id,
        displayName: data.displayName || 'Anonymous',
        minutes: data.minutes || 0,
        avatar: data.avatar || 'warrior_01',
        level: data.level || 1,
        isPro: data.isPro || false
      };
    });
    
    // Find authenticated user's rank
    let userRank = null;
    let userMinutes = 0;
    
    if (request.auth) {
      const userEntry = leaderboard.find(entry => entry.userId === request.auth.uid);
      
      if (userEntry) {
        userRank = userEntry.rank;
        userMinutes = userEntry.minutes;
      } else {
        const userDoc = await db.collection('leaderboards')
          .doc('monthly')
          .collection(targetMonthId)
          .doc(request.auth.uid)
          .get();
        
        if (userDoc.exists) {
          userMinutes = userDoc.data().minutes || 0;
          
          const aboveCount = await db.collection('leaderboards')
            .doc('monthly')
            .collection(targetMonthId)
            .where('minutes', '>', userMinutes)
            .count()
            .get();
          
          userRank = aboveCount.data().count + 1;
        }
      }
    }
    
    return {
      monthId: targetMonthId,
      isCurrent: targetMonthId === currentMonthId,
      leaderboard,
      userRank,
      userMinutes,
      totalPlayers: snapshot.size
    };
    
  } catch (error) {
    console.error('Error fetching monthly leaderboard:', error);
    throw new HttpsError('internal', 'Failed to fetch leaderboard');
  }
});

// Uncomment and modify if you want scheduled functions
// exports.updateWeeklyLeaderboard = onSchedule('0 0 * * 1', async (event) => {
//   try {
//     console.log('🏆 Starting weekly leaderboard update');
//     
//     const now = new Date();
//     const year = now.getFullYear();
//     const weekNumber = getISOWeekNumber(now);
//     const weekId = `${year}-W${weekNumber.toString().padStart(2, '0')}`;
//     
//     // Get all users with weekly stats
//     const usersSnapshot = await db.collection('users')
//       .where('stats.weeklyReviews', '>', 0)
//       .orderBy('stats.weeklyReviews', 'desc')
//       .limit(100) // Top 100 users
//       .get();
//     
//     const batch = db.batch();
//     let rank = 1;
//     
//     usersSnapshot.docs.forEach((userDoc) => {
//       const userData = userDoc.data();
//       const leaderboardRef = db.collection('leaderboards')
//         .doc('weekly')
//         .collection(weekId)
//         .doc(userDoc.id);
//       
//       batch.set(leaderboardRef, {
//         displayName: userData.displayName,
//         reviews: userData.stats?.weeklyReviews || 0,
//         accuracy: calculateWeeklyAccuracy(userData), // You'd implement this
//         streak: userData.stats?.currentStreak || 0,
//         rank: rank++
//       });
//     });
//     
//     // Reset weekly stats for all users
//     const allUsersSnapshot = await db.collection('users').get();
//     allUsersSnapshot.docs.forEach((userDoc) => {
//       batch.update(userDoc.ref, {
//         'stats.weeklyReviews': 0
//       });
//     });
//     
//     await batch.commit();
//     
//     console.log(`🏆 Updated weekly leaderboard for ${weekId} with ${usersSnapshot.size} users`);
//     
//   } catch (error) {
//     console.error('Error updating weekly leaderboard:', error);
//   }
// });

// Helper function to get ISO week number
// function getISOWeekNumber(date) {
//   const tempDate = new Date(date.valueOf());
//   const dayNumber = (date.getDay() + 6) % 7;
//   tempDate.setDate(tempDate.getDate() - dayNumber + 3);
//   const firstThursday = tempDate.valueOf();
//   tempDate.setMonth(0, 1);
//   if (tempDate.getDay() !== 4) {
//     tempDate.setMonth(0, 1 + ((4 - tempDate.getDay()) + 7) % 7);
//   }
//   return 1 + Math.ceil((firstThursday - tempDate) / 604800000);
// }

// function calculateWeeklyAccuracy(userData) {
//   // Implement based on your daily sessions data
//   // This is a placeholder - you'd calculate based on the week's daily sessions
//   return 0.85; // Example
// }