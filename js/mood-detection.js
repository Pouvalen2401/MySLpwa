// js/mood-detection.js - Facial Expression & Mood Analysis

const MoodDetection = {
  currentMood: 'neutral',
  moodHistory: [],
  maxHistoryLength: 30,
  moodConfidence: 0,

  // Detect mood from face landmarks
  detectMood(faceLandmarks) {
    if (!faceLandmarks || faceLandmarks.length === 0) {
      return { mood: 'neutral', confidence: 0 };
    }

    const landmarks = faceLandmarks[0];
    
    // Extract key facial features
    const features = this.extractFacialFeatures(landmarks);
    
    // Analyze features to determine mood
    const mood = this.analyzeMood(features);
    
    // Add to history
    this.addToHistory(mood);
    
    // Update current mood
    this.currentMood = mood.mood;
    this.moodConfidence = mood.confidence;
    
    return mood;
  },

  // Extract facial features for mood analysis
  extractFacialFeatures(landmarks) {
    // Key landmark indices based on MediaPipe Face Mesh
    const leftEyeTop = landmarks[159];
    const leftEyeBottom = landmarks[145];
    const rightEyeTop = landmarks[386];
    const rightEyeBottom = landmarks[374];
    
    const leftMouth = landmarks[61];
    const rightMouth = landmarks[291];
    const upperLip = landmarks[13];
    const lowerLip = landmarks[14];
    const mouthCenter = landmarks[17];
    
    const leftEyebrowInner = landmarks[55];
    const leftEyebrowOuter = landmarks[70];
    const rightEyebrowInner = landmarks[285];
    const rightEyebrowOuter = landmarks[300];

    // Calculate measurements
    const leftEyeOpenness = Utils.calculateDistance(leftEyeTop, leftEyeBottom);
    const rightEyeOpenness = Utils.calculateDistance(rightEyeTop, rightEyeBottom);
    const avgEyeOpenness = (leftEyeOpenness + rightEyeOpenness) / 2;

    const mouthWidth = Utils.calculateDistance(leftMouth, rightMouth);
    const mouthHeight = Utils.calculateDistance(upperLip, lowerLip);
    const mouthAspectRatio = mouthHeight / mouthWidth;

    const leftEyebrowHeight = leftEyebrowInner.y;
    const rightEyebrowHeight = rightEyebrowInner.y;
    const avgEyebrowHeight = (leftEyebrowHeight + rightEyebrowHeight) / 2;

    // Mouth corners
    const mouthCornerLeft = landmarks[61];
    const mouthCornerRight = landmarks[291];
    const mouthCornersAvgY = (mouthCornerLeft.y + mouthCornerRight.y) / 2;
    const mouthCurvature = mouthCenter.y - mouthCornersAvgY;

    return {
      eyeOpenness: avgEyeOpenness,
      mouthWidth,
      mouthHeight,
      mouthAspectRatio,
      eyebrowHeight: avgEyebrowHeight,
      mouthCurvature,
      leftEyeOpenness,
      rightEyeOpenness
    };
  },

  // Analyze features to determine mood
  analyzeMood(features) {
    let mood = 'neutral';
    let confidence = 0;

    // Happy detection
    if (features.mouthCurvature < -0.01 && features.mouthAspectRatio > 0.3) {
      mood = 'happy';
      confidence = Math.min(Math.abs(features.mouthCurvature) * 50, 1.0);
    }
    // Sad detection
    else if (features.mouthCurvature > 0.01 && features.eyebrowHeight > 0.35) {
      mood = 'sad';
      confidence = Math.min(features.mouthCurvature * 50 + (features.eyebrowHeight - 0.35) * 5, 1.0);
    }
    // Surprised detection
    else if (features.eyeOpenness > 0.025 && features.mouthAspectRatio > 0.5) {
      mood = 'surprised';
      confidence = Math.min((features.eyeOpenness - 0.025) * 40 + features.mouthAspectRatio, 1.0);
    }
    // Angry detection
    else if (features.eyebrowHeight < 0.3 && features.mouthWidth < 0.15) {
      mood = 'angry';
      confidence = Math.min((0.3 - features.eyebrowHeight) * 10, 1.0);
    }
    // Fearful detection
    else if (features.eyeOpenness > 0.02 && features.eyebrowHeight < 0.32) {
      mood = 'fearful';
      confidence = Math.min(features.eyeOpenness * 35, 0.8);
    }
    // Disgusted detection
    else if (features.mouthCurvature > 0.005 && features.mouthWidth < 0.14) {
      mood = 'disgusted';
      confidence = Math.min(features.mouthCurvature * 80, 0.9);
    }

    return {
      mood,
      confidence: Math.min(Math.max(confidence, 0), 1),
      features,
      timestamp: Date.now()
    };
  },

  // Add mood to history
  addToHistory(moodData) {
    this.moodHistory.push(moodData);

    if (this.moodHistory.length > this.maxHistoryLength) {
      this.moodHistory.shift();
    }
  },

  // Get current mood
  getCurrentMood() {
    return {
      mood: this.currentMood,
      confidence: this.moodConfidence
    };
  },

  // Get mood history
  getMoodHistory() {
    return this.moodHistory;
  },

  // Get dominant mood over time period
  getDominantMood(seconds = 5) {
    if (this.moodHistory.length === 0) return null;

    const cutoffTime = Date.now() - (seconds * 1000);
    const recentMoods = this.moodHistory.filter(m => m.timestamp >= cutoffTime);

    if (recentMoods.length === 0) return null;

    // Count mood occurrences
    const moodCounts = {};
    recentMoods.forEach(m => {
      moodCounts[m.mood] = (moodCounts[m.mood] || 0) + 1;
    });

    // Find most common mood
    let dominantMood = 'neutral';
    let maxCount = 0;

    Object.entries(moodCounts).forEach(([mood, count]) => {
      if (count > maxCount) {
        dominantMood = mood;
        maxCount = count;
      }
    });

    const avgConfidence = recentMoods
      .filter(m => m.mood === dominantMood)
      .reduce((sum, m) => sum + m.confidence, 0) / maxCount;

    return {
      mood: dominantMood,
      confidence: avgConfidence,
      duration: seconds,
      sampleCount: recentMoods.length
    };
  },

  // Get mood statistics
  getMoodStatistics() {
    if (this.moodHistory.length === 0) {
      return {
        totalSamples: 0,
        moods: {}
      };
    }

    const moodCounts = {};
    const moodConfidences = {};

    this.moodHistory.forEach(m => {
      moodCounts[m.mood] = (moodCounts[m.mood] || 0) + 1;
      
      if (!moodConfidences[m.mood]) {
        moodConfidences[m.mood] = [];
      }
      moodConfidences[m.mood].push(m.confidence);
    });

    const moods = {};
    Object.keys(moodCounts).forEach(mood => {
      const confidences = moodConfidences[mood];
      const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
      
      moods[mood] = {
        count: moodCounts[mood],
        percentage: (moodCounts[mood] / this.moodHistory.length) * 100,
        avgConfidence
      };
    });

    return {
      totalSamples: this.moodHistory.length,
      moods
    };
  },

  // Clear mood history
  clearHistory() {
    this.moodHistory = [];
    this.currentMood = 'neutral';
    this.moodConfidence = 0;
  },

  // Get mood emoji
  getMoodEmoji(mood) {
    const emojis = {
      happy: '😊',
      sad: '😢',
      angry: '😠',
      surprised: '😮',
      fearful: '😨',
      disgusted: '🤢',
      neutral: '😐'
    };

    return emojis[mood] || '😐';
  },

  // Get mood color
  getMoodColor(mood) {
    const colors = {
      happy: '#10B981',
      sad: '#3B82F6',
      angry: '#EF4444',
      surprised: '#F59E0B',
      fearful: '#8B5CF6',
      disgusted: '#6B7280',
      neutral: '#9CA3AF'
    };

    return colors[mood] || '#9CA3AF';
  },

  // Get mood description
  getMoodDescription(mood) {
    const descriptions = {
      happy: 'Happy and positive',
      sad: 'Sad or unhappy',
      angry: 'Angry or frustrated',
      surprised: 'Surprised or shocked',
      fearful: 'Fearful or anxious',
      disgusted: 'Disgusted or displeased',
      neutral: 'Neutral expression'
    };

    return descriptions[mood] || 'Neutral expression';
  },

  // Export mood data
  exportMoodData() {
    const statistics = this.getMoodStatistics();
    const dominant = this.getDominantMood(30);

    return {
      current: this.getCurrentMood(),
      dominant,
      statistics,
      history: this.moodHistory,
      exportDate: Date.now()
    };
  },

  // Mood change detection
  detectMoodChange(threshold = 0.6) {
    if (this.moodHistory.length < 2) return null;

    const current = this.moodHistory[this.moodHistory.length - 1];
    const previous = this.moodHistory[this.moodHistory.length - 2];

    if (current.mood !== previous.mood && current.confidence >= threshold) {
      return {
        from: previous.mood,
        to: current.mood,
        confidence: current.confidence,
        timestamp: current.timestamp
      };
    }

    return null;
  },

  // Get mood trend
  getMoodTrend(samples = 10) {
    if (this.moodHistory.length < samples) return 'stable';

    const recent = this.moodHistory.slice(-samples);
    const moods = recent.map(m => m.mood);

    const positiveCount = moods.filter(m => m === 'happy').length;
    const negativeCount = moods.filter(m => ['sad', 'angry', 'fearful', 'disgusted'].includes(m)).length;

    if (positiveCount > samples * 0.6) return 'improving';
    if (negativeCount > samples * 0.6) return 'declining';
    return 'stable';
  },

  // Real-time mood monitoring
  startMonitoring(callback, interval = 1000) {
    this.monitoringInterval = setInterval(() => {
      const current = this.getCurrentMood();
      const dominant = this.getDominantMood(5);
      const change = this.detectMoodChange();

      if (callback) {
        callback({
          current,
          dominant,
          change,
          timestamp: Date.now()
        });
      }
    }, interval);
  },

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
};