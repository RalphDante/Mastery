// utils/aiLimitsHelper.js
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../api/firebase';

// Check if user can generate AI content
export const checkAIGenerationLimit = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User profile not found');
    }
    
    const userData = userDoc.data();
    const limits = userData.limits || {};
    
    // Check if we need to reset monthly count
    const now = new Date();
    const resetDate = limits.aiGenerationsResetAt ? limits.aiGenerationsResetAt.toDate() : now;
    
    let currentUsage = limits.aiGenerationsUsed || 0;
    
    // If reset date has passed, consider usage as 0
    if (resetDate <= now) {
      currentUsage = 0;
    }
    
    const maxGenerations = limits.maxAiGenerations || 20;
    const canGenerate = maxGenerations === -1 || currentUsage < maxGenerations; // -1 means unlimited (premium)
    
    return {
      canGenerate,
      currentUsage,
      maxGenerations,
      remaining: maxGenerations === -1 ? 'unlimited' : maxGenerations - currentUsage,
      tier: userData.subscription?.tier || 'free',
      resetDate
    };
    
  } catch (error) {
    console.error('Error checking AI generation limit:', error);
    throw error;
  }
};

// Track AI generation usage
export const trackAIGeneration = async () => {
  try {
    const trackAiGeneration = httpsCallable(functions, 'trackAiGeneration');
    const result = await trackAiGeneration();
    return result.data;
  } catch (error) {
    console.error('Error tracking AI generation:', error);
    throw error;
  }
};

// Main function to generate AI content with limit checking
export const generateAIContent = async (prompt, userId, aiGenerationFunction) => {
  try {
    // 1. Check if user can generate
    const limitCheck = await checkAIGenerationLimit(userId);
    
    if (!limitCheck.canGenerate) {
      const error = new Error('AI generation limit reached');
      error.code = 'LIMIT_REACHED';
      error.details = limitCheck;
      throw error;
    }
    
    // 2. Call the AI API
    const aiResponse = await aiGenerationFunction(prompt);
    
    // 3. Track the generation ONLY after successful AI call
    await trackAIGeneration();
    
    // 4. Return the generated content
    return {
      success: true,
      data: aiResponse,
      usage: {
        used: limitCheck.currentUsage + 1,
        remaining: limitCheck.remaining === 'unlimited' ? 'unlimited' : limitCheck.remaining - 1
      }
    };
    
  } catch (error) {
    // Don't track if AI generation failed
    console.error('AI generation failed:', error);
    throw error;
  }
};