// utils/analytics.js
import { logEvent as firebaseLogEvent } from 'firebase/analytics';
import { analytics } from '../api/firebase';

/**
 * Wrapper function for Firebase Analytics logging
 * Safely logs events even if analytics is not initialized
 */
export const logEvent = (eventName, params = {}) => {
  try {
    if (analytics) {
      // Add timestamp to all events
      const eventData = {
        ...params,
        timestamp: new Date().toISOString(),
        app_version: '1.0.0' // Update this with your app version
      };
      
      firebaseLogEvent(analytics, eventName, eventData);
      console.log(`📊 Analytics: ${eventName}`, eventData);
    }
  } catch (error) {
    console.error('Analytics logging failed:', error);
  }
};

/**
 * Log user actions in FileUpload component
 */
export const logFileUploadEvent = {
  // Modal opened
  modalOpened: (userId) => {
    logEvent('upload_modal_opened', {
      user_id: userId,
      screen_name: 'file_upload'
    });
  },

  // File dropped/selected
  fileDropped: (userId, file) => {
    logEvent('file_dropped', {
      user_id: userId,
      file_name: file.name,
      file_size_mb: (file.size / (1024 * 1024)).toFixed(2),
      file_type: file.type,
      file_extension: file.name.split('.').pop()
    });
  },

  // Multiple files selected
  multipleFilesDropped: (userId, files) => {
    logEvent('multiple_files_dropped', {
      user_id: userId,
      file_count: files.length,
      total_size_mb: (files.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024)).toFixed(2),
      file_types: files.map(f => f.type).join(',')
    });
  },

  // Processing started
  processingStarted: (userId, fileType) => {
    logEvent('file_processing_started', {
      user_id: userId,
      file_type: fileType,
      processing_method: fileType.startsWith('image/') ? 'ocr' : 'text_extraction'
    });
  },

  // Processing completed
  processingCompleted: (userId, fileType, processingTimeMs, textLength) => {
    logEvent('file_processing_completed', {
      user_id: userId,
      file_type: fileType,
      processing_time_ms: processingTimeMs,
      processing_time_sec: (processingTimeMs / 1000).toFixed(2),
      extracted_text_length: textLength,
      extracted_text_words: textLength ? Math.round(textLength / 5) : 0
    });
  },

  // File rejected
  fileRejected: (userId, file, errorCode, errorMessage) => {
    logEvent('file_rejected', {
      user_id: userId,
      file_name: file?.name,
      file_size_mb: file?.size ? (file.size / (1024 * 1024)).toFixed(2) : 'unknown',
      file_type: file?.type,
      error_code: errorCode,
      error_message: errorMessage
    });
  },

  // Upload failed
  uploadFailed: (userId, errorCode, errorMessage, fileType = null) => {
    logEvent('upload_failed', {
      user_id: userId,
      error_code: errorCode,
      error_message: errorMessage,
      file_type: fileType,
      error_stage: 'upload'
    });
  },

  // AI generation started
  aiGenerationStarted: (userId, generationType, inputLength) => {
    logEvent('ai_generation_started', {
      user_id: userId,
      generation_type: generationType, // 'file', 'topic', 'image'
      input_length: inputLength
    });
  },

  // AI generation completed
  aiGenerationCompleted: (userId, generationType, flashcardCount, generationTimeMs) => {
    logEvent('ai_generation_completed', {
      user_id: userId,
      generation_type: generationType,
      flashcard_count: flashcardCount,
      generation_time_ms: generationTimeMs,
      generation_time_sec: (generationTimeMs / 1000).toFixed(2)
    });
  },

  // AI generation failed
  aiGenerationFailed: (userId, generationType, errorCode, errorMessage) => {
    logEvent('ai_generation_failed', {
      user_id: userId,
      generation_type: generationType,
      error_code: errorCode,
      error_message: errorMessage,
      error_stage: 'ai_generation'
    });
  },

  // OCR quality issues
  ocrQualityIssue: (userId, reason, confidence) => {
    logEvent('ocr_quality_issue', {
      user_id: userId,
      quality_issue_reason: reason,
      ocr_confidence: confidence,
      user_action: 'retry_prompted'
    });
  },

  // Camera started
  cameraStarted: (userId) => {
    logEvent('camera_started', {
      user_id: userId,
      input_method: 'camera'
    });
  },

  // Photo captured
  photoCaptured: (userId) => {
    logEvent('photo_captured', {
      user_id: userId,
      input_method: 'camera'
    });
  },

  // Topic generation
  topicGeneration: (userId, topic) => {
    logEvent('topic_generation_started', {
      user_id: userId,
      topic_text: topic,
      topic_length: topic.length,
      generation_type: 'topic'
    });
  },

  // Limit reached
  limitReached: (userId, limitType) => {
    logEvent('limit_reached', {
      user_id: userId,
      limit_type: limitType, // 'ai', 'storage', etc.
      user_action: 'blocked'
    });
  }
};

/**
 * Log errors with detailed context
 */
export const logError = (errorName, errorDetails, userId = null) => {
  logEvent('error_occurred', {
    error_name: errorName,
    error_message: errorDetails.message,
    error_stack: errorDetails.stack?.substring(0, 500), // Truncate stack trace
    error_code: errorDetails.code,
    user_id: userId,
    error_severity: errorDetails.severity || 'medium'
  });
};

/**
 * Log user funnel progression
 */
export const logFunnelStep = (userId, stepName, metadata = {}) => {
  logEvent('funnel_step', {
    user_id: userId,
    step_name: stepName,
    ...metadata
  });
};