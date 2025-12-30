// js/hand-detection.js - MediaPipe Hand Detection & Gesture Recognition

const HandDetection = {
  hands: null,
  camera: null,
  onResults: null,
  isInitialized: false,
  currentLandmarks: null,
  gestureHistory: [],
  maxHistoryLength: 10,

  // Initialize MediaPipe Hands
  async init(videoElement, canvasElement, onResultsCallback) {
    try {
      // Check if MediaPipe Hands is available
      if (typeof Hands === 'undefined') {
        console.error('MediaPipe Hands not loaded. Please include the script.');
        throw new Error('MediaPipe Hands library not found');
      }

      // Initialize Hands
      this.hands = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });

      // Configure hands detection
      this.hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
      });

      // Set result callback
      this.onResults = onResultsCallback || this.defaultOnResults.bind(this);
      this.hands.onResults(this.onResults);

      // Initialize camera
      this.camera = new Camera(videoElement, {
        onFrame: async () => {
          if (this.hands) {
            await this.hands.send({ image: videoElement });
          }
        },
        width: 1280,
        height: 720
      });

      this.isInitialized = true;
      console.log('Hand detection initialized successfully');
      
      return true;
    } catch (error) {
      console.error('Hand detection initialization failed:', error);
      Utils.showToast('Failed to initialize hand detection', 'error');
      return false;
    }
  },

  // Start detection
  async start() {
    if (!this.isInitialized) {
      console.error('Hand detection not initialized');
      return false;
    }

    try {
      await this.camera.start();
      console.log('Hand detection started');
      return true;
    } catch (error) {
      console.error('Failed to start hand detection:', error);
      return false;
    }
  },

  // Stop detection
  stop() {
    if (this.camera) {
      this.camera.stop();
      console.log('Hand detection stopped');
    }
  },

  // Default results handler
  defaultOnResults(results) {
    this.currentLandmarks = results.multiHandLandmarks;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      // Process each detected hand
      results.multiHandLandmarks.forEach((landmarks, index) => {
        const handedness = results.multiHandedness[index].label; // 'Left' or 'Right'
        const score = results.multiHandedness[index].score;
        
        this.processHandLandmarks(landmarks, handedness, score);
      });
    }
  },

  // Process hand landmarks and extract key points
  processHandLandmarks(landmarks, handedness, score) {
    // Extract key points (21 hand landmarks)
    const keyPoints = {
      wrist: landmarks[0],
      
      thumb: {
        cmc: landmarks[1],
        mcp: landmarks[2],
        ip: landmarks[3],
        tip: landmarks[4]
      },
      
      index: {
        mcp: landmarks[5],
        pip: landmarks[6],
        dip: landmarks[7],
        tip: landmarks[8]
      },
      
      middle: {
        mcp: landmarks[9],
        pip: landmarks[10],
        dip: landmarks[11],
        tip: landmarks[12]
      },
      
      ring: {
        mcp: landmarks[13],
        pip: landmarks[14],
        dip: landmarks[15],
        tip: landmarks[16]
      },
      
      pinky: {
        mcp: landmarks[17],
        pip: landmarks[18],
        dip: landmarks[19],
        tip: landmarks[20]
      }
    };

    // Detect gesture
    const gesture = this.detectGesture(keyPoints, handedness, score);
    
    if (gesture) {
      this.addToHistory(gesture);
    }

    return keyPoints;
  },

  // Detect basic gestures
  detectGesture(keyPoints, handedness, score) {
    const gestures = [];

    // Check if fingers are extended
    const thumbExtended = this.isThumbExtended(keyPoints);
    const indexExtended = this.isFingerExtended(keyPoints.index, keyPoints.wrist);
    const middleExtended = this.isFingerExtended(keyPoints.middle, keyPoints.wrist);
    const ringExtended = this.isFingerExtended(keyPoints.ring, keyPoints.wrist);
    const pinkyExtended = this.isFingerExtended(keyPoints.pinky, keyPoints.wrist);

    const extendedCount = [thumbExtended, indexExtended, middleExtended, ringExtended, pinkyExtended]
      .filter(Boolean).length;

    // === LETTER GESTURES === //

    // Open hand (all fingers extended) - B
    if (extendedCount === 5 && !this.fingersSpread(keyPoints)) {
      gestures.push('OPEN_HAND');
    }
    
    // Closed fist (no fingers extended) - A or S
    else if (extendedCount === 0) {
      if (this.isThumbBeside(keyPoints)) {
        gestures.push('FIST'); // A
      }
    }
    
    // Pointing (only index extended) - D
    else if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      gestures.push('POINTING');
    }
    
    // Peace sign (index and middle extended) - V
    else if (indexExtended && middleExtended && !ringExtended && !pinkyExtended && this.fingersSpread(keyPoints)) {
      gestures.push('PEACE');
    }
    
    // Thumbs up - GOOD
    else if (thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      if (this.isThumbPointingUp(keyPoints)) {
        gestures.push('THUMBS_UP');
      }
    }
    
    // Thumbs down - BAD
    else if (thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      if (this.isThumbPointingDown(keyPoints)) {
        gestures.push('THUMBS_DOWN');
      }
    }
    
    // OK sign (thumb and index forming circle) - F
    else if (this.isOKSign(keyPoints)) {
      gestures.push('OK');
    }
    
    // L sign (index up, thumb out)
    else if (indexExtended && thumbExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      if (this.isLShape(keyPoints)) {
        gestures.push('L_SIGN');
      }
    }
    
    // I sign (pinky extended only)
    else if (!indexExtended && !middleExtended && !ringExtended && pinkyExtended) {
      gestures.push('I_SIGN');
    }
    
    // Y sign (thumb and pinky extended)
    else if (thumbExtended && !indexExtended && !middleExtended && !ringExtended && pinkyExtended) {
      gestures.push('Y_SIGN');
    }
    
    // Three fingers (index, middle, ring) - W
    else if (indexExtended && middleExtended && ringExtended && !pinkyExtended) {
      gestures.push('THREE_FINGERS');
    }

    // === DYNAMIC GESTURES === //
    
    // Check for motion-based gestures
    const dynamicGesture = this.detectDynamicGesture();
    if (dynamicGesture) {
      gestures.push(dynamicGesture);
    }

    return {
      gestures,
      handedness,
      keyPoints,
      confidence: score,
      timestamp: Date.now()
    };
  },

  // Check if finger is extended
  isFingerExtended(finger, wrist) {
    if (!finger || !finger.tip || !finger.mcp || !wrist) return false;

    const tipToWrist = this.calculateDistance(finger.tip, wrist);
    const mcpToWrist = this.calculateDistance(finger.mcp, wrist);

    return tipToWrist > mcpToWrist * 1.2;
  },

  // Check if thumb is extended
  isThumbExtended(keyPoints) {
    const thumb = keyPoints.thumb;
    const wrist = keyPoints.wrist;
    
    if (!thumb || !wrist) return false;

    const tipToWrist = this.calculateDistance(thumb.tip, wrist);
    const mcpToWrist = this.calculateDistance(thumb.mcp, wrist);

    return tipToWrist > mcpToWrist * 1.1;
  },

  // Check if thumb is beside fingers (for A sign)
  isThumbBeside(keyPoints) {
    const thumbTip = keyPoints.thumb.tip;
    const indexMcp = keyPoints.index.mcp;
    
    const distance = this.calculateDistance(thumbTip, indexMcp);
    return distance < 0.08;
  },

  // Check if thumb is pointing up
  isThumbPointingUp(keyPoints) {
    const thumbTip = keyPoints.thumb.tip;
    const thumbMcp = keyPoints.thumb.mcp;
    
    return thumbTip.y < thumbMcp.y - 0.05;
  },

  // Check if thumb is pointing down
  isThumbPointingDown(keyPoints) {
    const thumbTip = keyPoints.thumb.tip;
    const thumbMcp = keyPoints.thumb.mcp;
    
    return thumbTip.y > thumbMcp.y + 0.05;
  },

  // Check for OK sign
  isOKSign(keyPoints) {
    const thumbTip = keyPoints.thumb.tip;
    const indexTip = keyPoints.index.tip;

    if (!thumbTip || !indexTip) return false;

    const distance = this.calculateDistance(thumbTip, indexTip);
    return distance < 0.05; // Threshold for fingers touching
  },

  // Check if fingers are spread
  fingersSpread(keyPoints) {
    const indexTip = keyPoints.index.tip;
    const middleTip = keyPoints.middle.tip;
    
    if (!indexTip || !middleTip) return false;
    
    const distance = this.calculateDistance(indexTip, middleTip);
    return distance > 0.08;
  },

  // Check for L shape
  isLShape(keyPoints) {
    const thumbTip = keyPoints.thumb.tip;
    const indexTip = keyPoints.index.tip;
    const thumbMcp = keyPoints.thumb.mcp;
    const indexMcp = keyPoints.index.mcp;
    
    // Check if thumb is horizontal and index is vertical
    const thumbHorizontal = Math.abs(thumbTip.x - thumbMcp.x) > Math.abs(thumbTip.y - thumbMcp.y);
    const indexVertical = Math.abs(indexTip.y - indexMcp.y) > Math.abs(indexTip.x - indexMcp.x);
    
    return thumbHorizontal && indexVertical;
  },

  // Calculate distance between points
  calculateDistance(point1, point2) {
    if (!point1 || !point2) return 0;
    
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    const dz = (point1.z || 0) - (point2.z || 0);
    
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  },

  // Add gesture to history
  addToHistory(gesture) {
    this.gestureHistory.push(gesture);

    if (this.gestureHistory.length > this.maxHistoryLength) {
      this.gestureHistory.shift();
    }
  },

  // Get gesture history
  getHistory() {
    return this.gestureHistory;
  },

  // Clear history
  clearHistory() {
    this.gestureHistory = [];
  },

  // Get most recent gesture
  getLatestGesture() {
    return this.gestureHistory[this.gestureHistory.length - 1] || null;
  },

  // Detect static gesture (held for duration)
  detectStaticGesture(duration = 1000) {
    if (this.gestureHistory.length < 2) return null;

    const recent = this.gestureHistory.slice(-5);
    const firstGesture = recent[0];
    const now = Date.now();

    // Check if same gesture held for duration
    const isSameGesture = recent.every(g => 
      g.gestures[0] === firstGesture.gestures[0]
    );

    if (isSameGesture && (now - firstGesture.timestamp) >= duration) {
      return firstGesture.gestures[0];
    }

    return null;
  },

  // Detect dynamic gesture (movement pattern)
  detectDynamicGesture() {
    if (this.gestureHistory.length < 5) return null;

    const recent = this.gestureHistory.slice(-5);
    
    // Get wrist positions
    const positions = recent.map(g => g.keyPoints.wrist);
    
    // Swipe right detection
    const isSwipeRight = positions.every((pos, i) => 
      i === 0 || pos.x > positions[i - 1].x
    );
    
    if (isSwipeRight && (positions[positions.length - 1].x - positions[0].x) > 0.3) {
      return 'SWIPE_RIGHT';
    }

    // Swipe left detection
    const isSwipeLeft = positions.every((pos, i) => 
      i === 0 || pos.x < positions[i - 1].x
    );
    
    if (isSwipeLeft && (positions[0].x - positions[positions.length - 1].x) > 0.3) {
      return 'SWIPE_LEFT';
    }

    // Swipe up detection
    const isSwipeUp = positions.every((pos, i) => 
      i === 0 || pos.y < positions[i - 1].y
    );
    
    if (isSwipeUp && (positions[0].y - positions[positions.length - 1].y) > 0.3) {
      return 'SWIPE_UP';
    }

    // Swipe down detection
    const isSwipeDown = positions.every((pos, i) => 
      i === 0 || pos.y > positions[i - 1].y
    );
    
    if (isSwipeDown && (positions[positions.length - 1].y - positions[0].y) > 0.3) {
      return 'SWIPE_DOWN';
    }

    // Wave detection (alternating left-right motion)
    if (this.isWaving(positions)) {
      return 'WAVE';
    }

    return null;
  },

  // Check for wave gesture
  isWaving(positions) {
    if (positions.length < 5) return false;
    
    let direction = 0; // 0 = none, 1 = right, -1 = left
    let changes = 0;
    
    for (let i = 1; i < positions.length; i++) {
      const diff = positions[i].x - positions[i - 1].x;
      const currentDir = diff > 0.02 ? 1 : (diff < -0.02 ? -1 : 0);
      
      if (currentDir !== 0 && currentDir !== direction) {
        changes++;
        direction = currentDir;
      }
    }
    
    return changes >= 2; // At least 2 direction changes
  },

  // Update detection sensitivity
  updateSensitivity(sensitivity) {
    if (!this.hands) {
      console.warn('Hands not initialized');
      return false;
    }

    try {
      this.hands.setOptions({
        minDetectionConfidence: sensitivity,
        minTrackingConfidence: sensitivity
      });

      console.log('Hand detection sensitivity updated to:', sensitivity);
      return true;
    } catch (error) {
      console.error('Failed to update sensitivity:', error);
      return false;
    }
  },

  // Update max hands
  updateMaxHands(maxHands) {
    if (!this.hands) {
      console.warn('Hands not initialized');
      return false;
    }

    try {
      this.hands.setOptions({
        maxNumHands: maxHands
      });

      console.log('Max hands updated to:', maxHands);
      return true;
    } catch (error) {
      console.error('Failed to update max hands:', error);
      return false;
    }
  },

  // Get current landmarks
  getCurrentLandmarks() {
    return this.currentLandmarks;
  },

  // Draw landmarks on canvas
  drawLandmarks(canvasElement, landmarks, handedness) {
    if (!canvasElement || !landmarks || landmarks.length === 0) return;

    const ctx = canvasElement.getContext('2d');
    const width = canvasElement.width;
    const height = canvasElement.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    landmarks.forEach((handLandmarks, index) => {
      // Determine color based on handedness
      const isRightHand = handedness && handedness[index] && handedness[index].label === 'Right';
      const color = isRightHand ? '#4F46E5' : '#10B981';

      // Draw connections
      const connections = [
        // Thumb
        [0, 1], [1, 2], [2, 3], [3, 4],
        // Index finger
        [0, 5], [5, 6], [6, 7], [7, 8],
        // Middle finger
        [0, 9], [9, 10], [10, 11], [11, 12],
        // Ring finger
        [0, 13], [13, 14], [14, 15], [15, 16],
        // Pinky
        [0, 17], [17, 18], [18, 19], [19, 20],
        // Palm
        [5, 9], [9, 13], [13, 17]
      ];

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;

      connections.forEach(([start, end]) => {
        const startPoint = handLandmarks[start];
        const endPoint = handLandmarks[end];

        ctx.beginPath();
        ctx.moveTo(startPoint.x * width, startPoint.y * height);
        ctx.lineTo(endPoint.x * width, endPoint.y * height);
        ctx.stroke();
      });

      // Draw landmarks
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;

      handLandmarks.forEach((landmark, idx) => {
        // Different size for fingertips
        const radius = [4, 8, 12, 16, 20].includes(idx) ? 6 : 4;
        
        ctx.beginPath();
        ctx.arc(landmark.x * width, landmark.y * height, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      });
    });
  },

  // Calculate hand orientation
  calculateHandOrientation(keyPoints) {
    const wrist = keyPoints.wrist;
    const middleMcp = keyPoints.middle.mcp;

    const dx = middleMcp.x - wrist.x;
    const dy = middleMcp.y - wrist.y;

    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    return angle;
  },

  // Calculate hand size
  calculateHandSize(keyPoints) {
    const wrist = keyPoints.wrist;
    const middleTip = keyPoints.middle.tip;

    return this.calculateDistance(wrist, middleTip);
  },

  // Get hand state
  getHandState() {
    return {
      isInitialized: this.isInitialized,
      isActive: this.camera ? true : false,
      landmarksDetected: this.currentLandmarks !== null,
      handsDetected: this.currentLandmarks ? this.currentLandmarks.length : 0,
      historyLength: this.gestureHistory.length
    };
  },

  // Cleanup
  cleanup() {
    console.log('Cleaning up hand detection...');
    
    this.stop();
    
    if (this.hands) {
      this.hands.close();
      this.hands = null;
    }
    
    this.camera = null;
    this.currentLandmarks = null;
    this.gestureHistory = [];
    this.isInitialized = false;
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HandDetection;
}