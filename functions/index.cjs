// functions/index.cjs
const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentDeleted } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const crypto = require('crypto');
const functions = require('firebase-functions');

initializeApp();
const db = getFirestore();

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

// Updated main webhook handler
exports.handlePaddleWebhook = onRequest(async (req, res) => {
  console.log('=== WEBHOOK RECEIVED ===');
  console.log('Method:', req.method);
  console.log('Content-Type:', req.get('content-type'));
  
  try {
    // Get signature from header
    const paddleSignature = req.get('paddle-signature');
    const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
    
    console.log('Signature from header:', paddleSignature);
    console.log('Webhook secret exists:', !!webhookSecret);
    
    if (!paddleSignature) {
      console.error('No paddle-signature header found');
      return res.status(400).send('Missing signature');
    }
    
    if (!webhookSecret) {
      console.error('No webhook secret configured');
      return res.status(500).send('Webhook secret not configured');
    }

    // Get raw body as string - this is crucial for signature verification
    let rawBody;
    if (typeof req.rawBody !== 'undefined') {
      // Cloud Functions provides rawBody
      rawBody = req.rawBody.toString('utf8');
    } else {
      // Fallback to JSON.stringify (less reliable)
      rawBody = JSON.stringify(req.body);
    }
    
    console.log('Using raw body, length:', rawBody.length);
    console.log('Raw body preview:', rawBody.substring(0, 200) + '...');

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
        await handleSubscriptionUpdate(data);
        break;
      case 'subscription.canceled':
      case 'subscription.paused':
        await handleSubscriptionCancellation(data);
        break;
      case 'transaction.completed':
        await handleTransactionCompleted(data);
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
});

async function handleSubscriptionUpdate(data) {
  console.log('=== SUBSCRIPTION UPDATE DEBUG ===');
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
    // We might need to fetch customer details from Paddle API here
    // For now, let's see if we can use custom_data
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

    // CRITICAL FIX: Check if we have a pending cancellation
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
    let tier = 'free';
    let expiresAt = null;
    let subscriptionStatus = status; // Default to Paddle's status

    if (priceId === 'pri_01k1f95ne00eje36z837qhzm0q' || priceId === 'pri_01k1fh6p0sgsvxm5s1cregrygr') {
      tier = 'pro';
    }

    // CRITICAL FIX: Handle expiration and status logic properly
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
    } else if (next_billed_at && status === 'active') {
      // Normal active subscription
      subscriptionStatus = 'active';
      expiresAt = Timestamp.fromDate(new Date(next_billed_at));
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
        status: subscriptionStatus, // Use our determined status, not always Paddle's
        expiresAt: expiresAt,
        priceId: priceId,
        paddleSubscriptionId: data.id,
        updatedAt: FieldValue.serverTimestamp()
      }
    };

    // Update tier-based limits based on new subscription
    if (tier === 'pro') {
      updateData['limits.maxAiGenerations'] = -1;
      updateData['limits.maxCards'] = -1; // unlimited
      updateData['limits.maxDecks'] = -1;
      updateData['limits.maxSmartReviewDecks'] = -1;
      updateData['limits.maxFolders'] = -1;
    } else {
      // Free tier limits
      updateData['limits.maxAiGenerations'] = 20;
      updateData['limits.maxCards'] = 100;
      updateData['limits.maxDecks'] = 5;
      updateData['limits.maxSmartReviewDecks'] = 2;
      updateData['limits.maxFolders'] = 10; 
    }

    await db.collection('users').doc(userId).update(updateData);

    console.log(`✅ Updated subscription for user ${userId}: ${tier} (${subscriptionStatus})`);
  } catch (error) {
    console.error('Error updating subscription:', error);
  }
}

async function handleSubscriptionCancellation(data) {
  console.log('=== SUBSCRIPTION CANCELLATION ===');
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

async function handleTransactionCompleted(data) {
  console.log('Transaction completed:', data.id);
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
    
    const paddleApiKey = process.env.PADDLE_API_KEY;
    const environment = process.env.ENVIRONMENT || 'sandbox';
    
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

exports.handleExpiredSubscriptions = onSchedule('0 6 * * *', async (event) => {
  try {
    console.log('🕐 Checking for expired subscriptions');
    
    const now = Timestamp.now();
    
    // Find users with expired subscriptions that haven't been downgraded yet
    const expiredQuery = await db.collection('users')
      .where('subscription.expiresAt', '<=', now)
      .where('subscription.tier', '==', 'pro') // Still marked as pro
      .get();
    
    console.log(`Found ${expiredQuery.size} expired subscriptions`);
    
    const batch = db.batch();
    
    expiredQuery.docs.forEach((userDoc) => {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      console.log(`⬇️ Downgrading expired subscription for user ${userId}`);
      
      // Apply grandfather method - keep existing content but apply free limits
      const updateData = {
        'subscription.tier': 'free',
        'subscription.status': 'expired',
        'subscription.updatedAt': FieldValue.serverTimestamp(),
        
        // Reset to free tier limits (grandfather existing content)
        'limits.maxAiGenerations': 20,
        'limits.maxCards': 100, // They keep existing cards but can't add more
        'limits.maxDecks': 5,
        'limits.maxSmartReviewDecks': 2,
        'limits.maxFolders': 10
      };
      
      batch.update(userDoc.ref, updateData);
    });
    
    if (!expiredQuery.empty) {
      await batch.commit();
      console.log(`✅ Processed ${expiredQuery.size} expired subscriptions`);
    }
    
  } catch (error) {
    console.error('Error handling expired subscriptions:', error);
  }
});


// MANUAL DOWNGRADE TEST
exports.manuallyProcessExpired = onCall(async (request) => {
  try {
    // Optional: Add admin check or remove for testing
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    console.log('🧪 MANUAL EXPIRATION TEST - Processing expired subscriptions');
    
    const now = Timestamp.now();
    
    // Find users with expired subscriptions that haven't been downgraded yet
    const expiredQuery = await db.collection('users')
      .where('subscription.expiresAt', '<=', now)
      .where('subscription.tier', '==', 'pro') // Still marked as pro
      .get();
    
    console.log(`Found ${expiredQuery.size} expired subscriptions for manual processing`);
    
    if (expiredQuery.empty) {
      return { 
        success: true, 
        message: 'No expired subscriptions found',
        processed: 0 
      };
    }
    
    const batch = db.batch();
    const processedUsers = [];
    
    expiredQuery.docs.forEach((userDoc) => {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      console.log(`⬇️ MANUAL: Downgrading expired subscription for user ${userId}`);
      
      // Apply grandfather method - keep existing content but apply free limits
      const updateData = {
        'subscription.tier': 'free',
        'subscription.status': 'expired',
        'subscription.updatedAt': FieldValue.serverTimestamp(),
        'subscription.manuallyProcessed': true, // Flag to show this was manual
        
        // Reset to free tier limits (grandfather existing content)
        'limits.maxAiGenerations': 20,
        'limits.maxCards': 100, // They keep existing cards but can't add more
        'limits.maxDecks': 5,
        'limits.maxSmartReviewDecks': 2,
        'limits.maxFolders': 10
      };
      
      batch.update(userDoc.ref, updateData);
      processedUsers.push({
        userId,
        email: userData.email,
        previousTier: 'pro'
      });
    });
    
    await batch.commit();
    
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

exports.onCardDelete = onDocumentDeleted('decks/{deckId}/cards/{cardId}', async (event) => {
  try {
    const deckId = event.params.deckId;
    const cardId = event.params.cardId;
    const snap = event.data;
    const cardData = snap.data();
    
    console.log(`🗑️ CARD DELETE TRIGGERED for card: ${cardId} in deck: ${deckId}`);
    
    // Try to get the deck to find the owner, but handle if deck is already deleted
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
        console.log(`⚠️ Deck ${deckId} not found (likely already deleted during cascade)`);
        isDeckCascadeDelete = true;
        
        // Try to find userId from card progress records as fallback
        const cardProgressQuery = await db.collection('cardProgress')
          .where('cardId', '==', `${deckId}_${cardId}`)
          .limit(1)
          .get();
        
        if (!cardProgressQuery.empty) {
          userId = cardProgressQuery.docs[0].data().userId;
          console.log(`Found userId ${userId} from cardProgress records`);
        }
      }
    } catch (deckError) {
      console.log('⚠️ Error fetching deck:', deckError.message);
      isDeckCascadeDelete = true;
    }
    
    // If this is a cascade delete from deck deletion, don't decrement user counts
    // because onDeckDelete should handle the bulk count updates
    if (isDeckCascadeDelete) {
      console.log('🔄 Cascade delete detected - skipping user count updates, cleaning up card progress only');
      
      // Still clean up card progress records
      try {
        const cardProgressQuery = await db.collection('cardProgress')
          .where('cardId', '==', `${deckId}_${cardId}`)
          .get();
        
        if (!cardProgressQuery.empty) {
          const batch = db.batch();
          cardProgressQuery.docs.forEach(doc => {
            batch.delete(doc.ref);
          });
          await batch.commit();
          console.log(`🧹 Cleaned up ${cardProgressQuery.size} cardProgress documents for cascade-deleted card`);
        }
      } catch (progressError) {
        console.error('Error cleaning up card progress:', progressError);
      }
      
      return;
    }
    
    if (!userId) {
      console.log('⚠️ No userId found and not cascade delete - this shouldn\'t happen');
      return;
    }
    
    console.log(`🗑️ Individual card ${cardId} deleted, updating counts for user ${userId}`);
    
    const batch = db.batch();
    
    // Update user's card count (only for individual card deletions)
    const userRef = db.collection('users').doc(userId);
    batch.update(userRef, {
      'limits.currentCards': FieldValue.increment(-1)
    });
    
    console.log(`📊 Decrementing card count for user ${userId}`);
    
    // Update deck's card count ONLY if deck still exists
    if (deckExists) {
      const deckRef = db.collection('decks').doc(deckId);
      batch.update(deckRef, {
        cardCount: FieldValue.increment(-1)
      });
      console.log(`📊 Decrementing card count for deck ${deckId}`);
    }
    
    // Clean up card progress for all users
    const cardProgressQuery = await db.collection('cardProgress')
      .where('cardId', '==', `${deckId}_${cardId}`)
      .get();
    
    if (!cardProgressQuery.empty) {
      cardProgressQuery.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      console.log(`🧹 Cleaning up ${cardProgressQuery.size} cardProgress documents`);
    }
    
    await batch.commit();
    console.log(`✅ Completed individual card delete handling for ${cardId}`);
    
  } catch (error) {
    console.error('❌ Error updating card count on delete:', error);
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
    const snap = event.data;
    const userData = snap.data();
    
    // Initialize limits if they don't exist
    if (!userData.limits) {
      const now = new Date();
      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      
      await db.collection('users').doc(userId).update({
        limits: {
          // Free tier defaults - matching your schema
          maxAiGenerations: 20,
          maxCards: 100,
          maxDecks: 5,
          maxSmartReviewDecks: 2,
          maxFolders: 10,
          
          // Current usage counters
          aiGenerationsUsed: 0,
          currentCards: 0,
          currentDecks: 0,
          smartReviewDecks: 0,
          currentFolders: 0,
          aiGenerationsResetAt: Timestamp.fromDate(nextMonthStart)
        },
        stats: {
          totalReviews: 0,
          weeklyReviews: 0,
          currentStreak: 0,
          longestStreak: 0
        },
        tutorials: {
          "create-deck": { completed: false, step: 1 },
          "smart-review": { completed: false, step: 1, data: { cardsReviewed: 0 } },
          "global-review": { completed: false, step: 1 },
          "deck-sharing": { completed: false, step: 1 }
        }
      });
      
      console.log(`✨ Initialized user profile for ${userId}`);
    }
    
  } catch (error) {
    console.error('Error initializing user profile:', error);
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
// LEADERBOARD FUNCTIONS (aligned with your schema)
// ======================

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