// js/translation-engine.js - Sign Language Translation Engine

const TranslationEngine = {
  aslGestures: null,
  currentTranslation: '',
  translationBuffer: [],
  lastGestureTime: 0,
  gestureTimeout: 2000, // 2 seconds

  // Initialize translation engine
  async init() {
    try {
      // Load ASL gesture data
      const response = await fetch('models/asl-gestures.json');
      this.aslGestures = await response.json();
      console.log('Translation engine initialized');
      return true;
    } catch (error) {
      console.error('Failed to load ASL gestures:', error);
      // Fallback to basic gestures
      this.aslGestures = this.getBasicGestures();
      return true;
    }
  },

  // Get basic gesture mappings (fallback)
  getBasicGestures() {
    return {
      'FIST': { text: 'A', type: 'letter' },
      'OPEN_HAND': { text: 'B', type: 'letter' },
      'OK': { text: 'F', type: 'letter' },
      'POINTING': { text: 'D', type: 'letter' },
      'PEACE': { text: 'V', type: 'letter' },
      'THUMBS_UP': { text: 'GOOD', type: 'word' },
      'SWIPE_RIGHT': { text: 'NEXT', type: 'word' },
      'SWIPE_LEFT': { text: 'BACK', type: 'word' }
    };
  },

  // Translate hand gestures to text
  translateGestureToText(gesture, mood = 'neutral') {
    if (!gesture || !gesture.gestures || gesture.gestures.length === 0) {
      return null;
    }

    const gestureType = gesture.gestures[0];
    const mapping = this.aslGestures[gestureType];

    if (!mapping) {
      return null;
    }

    // Add mood modifier if applicable
    let text = mapping.text;
    if (mapping.type === 'word' && mood !== 'neutral') {
      text = this.addMoodContext(text, mood);
    }

    return {
      text,
      type: mapping.type,
      gesture: gestureType,
      handedness: gesture.handedness,
      mood,
      confidence: this.calculateConfidence(gesture),
      timestamp: Date.now()
    };
  },

  // Add mood context to translation
  addMoodContext(text, mood) {
    const moodPrefixes = {
      happy: '😊 ',
      sad: '😢 ',
      angry: '😠 ',
      surprised: '😮 '
    };

    return (moodPrefixes[mood] || '') + text;
  },

  // Calculate translation confidence
  calculateConfidence(gesture) {
    // Based on gesture stability and clarity
    const keyPoints = gesture.keyPoints;
    if (!keyPoints) return 0.5;

    // Check hand openness consistency
    let consistency = 0.8; // Default

    // Additional factors could be added here
    return Math.min(Math.max(consistency, 0), 1);
  },

  // Build sentence from gesture sequence
  buildSentence(gestures) {
    if (!gestures || gestures.length === 0) return '';

    const words = gestures
      .map(g => this.translateGestureToText(g))
      .filter(t => t !== null)
      .map(t => t.text);

    return words.join(' ');
  },

  // Translate text to sign description
  translateTextToSign(text) {
    const words = text.toLowerCase().split(' ');
    const signs = [];

    words.forEach(word => {
      // Find matching gesture
      const gesture = Object.entries(this.aslGestures).find(
        ([key, value]) => value.text.toLowerCase() === word
      );

      if (gesture) {
        signs.push({
          word,
          gesture: gesture[0],
          description: this.getGestureDescription(gesture[0]),
          timestamp: Date.now()
        });
      } else {
        // Finger spell if no gesture found
        const letters = word.split('');
        letters.forEach(letter => {
          const letterGesture = Object.entries(this.aslGestures).find(
            ([key, value]) => value.text === letter.toUpperCase() && value.type === 'letter'
          );
          
          if (letterGesture) {
            signs.push({
              word: letter,
              gesture: letterGesture[0],
              description: this.getGestureDescription(letterGesture[0]),
              isFingerSpell: true,
              timestamp: Date.now()
            });
          }
        });
      }
    });

    return signs;
  },

  // Get gesture description
  getGestureDescription(gestureType) {
    const descriptions = {
      'FIST': 'Make a fist with your hand',
      'OPEN_HAND': 'Open your hand with fingers extended',
      'OK': 'Touch thumb and index finger in a circle',
      'POINTING': 'Point with index finger',
      'PEACE': 'Extend index and middle fingers',
      'THUMBS_UP': 'Raise thumb up with fist closed',
      'SWIPE_RIGHT': 'Move hand from left to right',
      'SWIPE_LEFT': 'Move hand from right to left'
    };

    return descriptions[gestureType] || 'Perform the gesture';
  },

  // Real-time translation
  processRealTimeGesture(gesture, mood) {
    const now = Date.now();

    // Check if gesture timeout
    if (now - this.lastGestureTime > this.gestureTimeout) {
      this.translationBuffer = [];
    }

    this.lastGestureTime = now;

    // Translate gesture
    const translation = this.translateGestureToText(gesture, mood);
    
    if (translation) {
      this.translationBuffer.push(translation);
      this.currentTranslation = this.buildSentenceFromBuffer();
      
      return {
        current: translation,
        sentence: this.currentTranslation,
        buffer: this.translationBuffer
      };
    }

    return null;
  },

  // Build sentence from buffer
  buildSentenceFromBuffer() {
    if (this.translationBuffer.length === 0) return '';

    // Remove duplicates (same gesture held)
    const unique = [];
    let lastText = '';

    this.translationBuffer.forEach(t => {
      if (t.text !== lastText) {
        unique.push(t);
        lastText = t.text;
      }
    });

    return unique.map(t => t.text).join(' ');
  },

  // Clear translation buffer
  clearBuffer() {
    this.translationBuffer = [];
    this.currentTranslation = '';
  },

  // Get current translation
  getCurrentTranslation() {
    return this.currentTranslation;
  },

  // Save translation to history
  async saveTranslation(userId, input, output, type, mood) {
    try {
      await StorageManager.saveTranslation(userId, {
        type, // 'sign-to-text' or 'text-to-sign'
        input,
        output,
        mood
      });
      return true;
    } catch (error) {
      console.error('Failed to save translation:', error);
      return false;
    }
  },

  // Analyze gesture sequence pattern
  analyzePattern(gestures) {
    if (gestures.length < 3) return null;

    // Look for repeated patterns
    const pattern = [];
    let currentGesture = null;
    let count = 0;

    gestures.forEach(g => {
      if (g.gestures[0] === currentGesture) {
        count++;
      } else {
        if (currentGesture) {
          pattern.push({ gesture: currentGesture, count });
        }
        currentGesture = g.gestures[0];
        count = 1;
      }
    });

    if (currentGesture) {
      pattern.push({ gesture: currentGesture, count });
    }

    return pattern;
  },

  // Suggest next gesture
  suggestNextGesture(currentSequence) {
    // This would use ML in production
    // For now, return common follow-up gestures
    const commonSequences = {
      'FIST': ['OPEN_HAND', 'POINTING'],
      'OPEN_HAND': ['FIST', 'PEACE'],
      'POINTING': ['OPEN_HAND', 'THUMBS_UP']
    };

    if (currentSequence.length === 0) return null;

    const lastGesture = currentSequence[currentSequence.length - 1].gestures[0];
    return commonSequences[lastGesture] || null;
  },

  // Get translation statistics
  getStatistics() {
    return {
      bufferSize: this.translationBuffer.length,
      currentLength: this.currentTranslation.length,
      lastGestureTime: this.lastGestureTime,
      totalGestures: Object.keys(this.aslGestures).length
    };
  },

  // Export gesture data
  exportGestureData() {
    return {
      gestures: this.aslGestures,
      buffer: this.translationBuffer,
      current: this.currentTranslation,
      exportDate: Date.now()
    };
  },

  // Import gesture data
  importGestureData(data) {
    if (data.gestures) {
      this.aslGestures = { ...this.aslGestures, ...data.gestures };
    }
  },

  // Text-to-speech
  speakText(text, rate = 1.0, pitch = 1.0) {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.lang = 'en-US';
      
      window.speechSynthesis.cancel(); // Cancel any ongoing speech
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('Speech synthesis not supported');
    }
  },

  // Stop speech
  stopSpeech() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
};