// js/face-detection.js - Face Recognition & Detection using MediaPipe

const FaceDetection = {
  faceMesh: null,
  isInitialized: false,
  currentFaceLandmarks: null,
  faceDetectionCallback: null,
  processingFrame: false,
  videoElement: null,
  canvasElement: null,
  canvasCtx: null,
  callback: null,
  isRunning: false,

  // Initialize MediaPipe Face Mesh
  async init(videoElement, canvasElement, onResultsCallback) {
    try {
      this.videoElement = videoElement;
      this.canvasElement = canvasElement;
      this.canvasCtx = canvasElement.getContext('2d');
      this.callback = onResultsCallback;

      // Check if MediaPipe FaceMesh is available
      if (typeof FaceMesh === 'undefined') {
        console.error('MediaPipe FaceMesh not loaded. Please include the script.');
        throw new Error('MediaPipe FaceMesh library not found');
      }

      // Initialize Face Mesh
      this.faceMesh = new FaceMesh({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        }
      });

      // Configure face mesh
      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
      });

      // Set results callback
      this.faceMesh.onResults(this.onFaceMeshResults.bind(this));

      // Set canvas dimensions to match video
      this.canvasElement.width = this.videoElement.videoWidth;
      this.canvasElement.height = this.videoElement.videoHeight;

      this.isInitialized = true;
      console.log('Face detection initialized successfully');
      
      return true;
    } catch (error) {
      console.error('Face detection initialization failed:', error);
      Utils.showToast('Failed to initialize face detection', 'error');
      return false;
    }
  },

  // Process video frame
  async processFrame(videoElement) {
    if (!this.isInitialized || !this.isRunning) {
      return;
    }

    try {
      await this.faceMesh.send({ image: videoElement });
    } catch (error) {
      console.error('Face detection processing error:', error);
    }
  },

  // Handle Face Mesh results
  onFaceMeshResults(results) {
    this.currentFaceLandmarks = results.multiFaceLandmarks;

    // Clear canvas
    this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

    // Draw video frame
    this.canvasCtx.drawImage(
      this.videoElement,
      0,
      0,
      this.canvasElement.width,
      this.canvasElement.height
    );

    // Draw face mesh landmarks
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      for (let landmarks of results.multiFaceLandmarks) {
        this.drawFaceMesh(landmarks);
      }
    }

    // Call user callback
    if (this.callback) {
      this.callback(results);
    }

    // Dispatch custom event for other modules
    window.dispatchEvent(new CustomEvent('facemeshresults', {
      detail: results
    }));
  },

  // Draw face mesh on canvas
  drawFaceMesh(landmarks) {
    const drawingUtils = window.drawingUtils;
    const canvasSize = {
      width: this.canvasElement.width,
      height: this.canvasElement.height
    };

    // Draw connections (mesh lines)
    this.drawConnections(landmarks, canvasSize);

    // Draw landmarks (points)
    this.drawLandmarks(landmarks, canvasSize);
  },

  // Draw mesh connections
  drawConnections(landmarks, canvasSize) {
    this.canvasCtx.strokeStyle = 'rgba(79, 70, 229, 0.3)';
    this.canvasCtx.lineWidth = 1;
    this.canvasCtx.fillStyle = 'rgba(79, 70, 229, 0.1)';

    // Face outline
    const faceLandmarkIndexes = [
      [10, 338], [338, 297], [297, 332], [332, 284], [284, 251], [251, 389],
      [389, 356], [356, 454], [454, 323], [323, 361], [361, 288], [288, 397],
      [397, 365], [365, 379], [379, 378], [378, 400], [400, 377], [377, 152],
      [152, 148], [148, 176], [176, 149], [149, 150], [150, 136], [136, 172],
      [172, 58], [58, 132], [132, 93], [93, 234], [234, 127], [127, 162],
      [162, 21], [21, 54], [54, 103], [103, 67], [67, 109], [109, 10]
    ];

    // Draw face outline
    for (let connection of faceLandmarkIndexes) {
      const [start, end] = connection;
      const startLandmark = landmarks[start];
      const endLandmark = landmarks[end];

      const startX = startLandmark.x * canvasSize.width;
      const startY = startLandmark.y * canvasSize.height;
      const endX = endLandmark.x * canvasSize.width;
      const endY = endLandmark.y * canvasSize.height;

      this.canvasCtx.beginPath();
      this.canvasCtx.moveTo(startX, startY);
      this.canvasCtx.lineTo(endX, endY);
      this.canvasCtx.stroke();
    }

    // Draw eyes connections
    const eyeIndexes = [
      [33, 7], [7, 163], [163, 144], [144, 145], [145, 153], [153, 154],
      [154, 155], [155, 133], [33, 133],
      [263, 249], [249, 390], [390, 373], [373, 374], [374, 380], [380, 381],
      [381, 382], [382, 362], [263, 362]
    ];

    for (let connection of eyeIndexes) {
      const [start, end] = connection;
      const startLandmark = landmarks[start];
      const endLandmark = landmarks[end];

      const startX = startLandmark.x * canvasSize.width;
      const startY = startLandmark.y * canvasSize.height;
      const endX = endLandmark.x * canvasSize.width;
      const endY = endLandmark.y * canvasSize.height;

      this.canvasCtx.beginPath();
      this.canvasCtx.moveTo(startX, startY);
      this.canvasCtx.lineTo(endX, endY);
      this.canvasCtx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
      this.canvasCtx.stroke();
    }
  },

  // Draw landmark points
  drawLandmarks(landmarks, canvasSize) {
    // Draw all key landmarks
    const keyLandmarkIndexes = [10, 21, 54, 103, 67, 109, 151, 337, 299, 333, 298, 301, 292, 0, 17, 84, 181, 91, 106, 203, 36, 122, 26, 190, 244, 93, 234, 127, 162, 21, 54, 103, 67, 109];
    
    this.canvasCtx.fillStyle = 'rgba(79, 70, 229, 0.8)';
    
    for (let index of keyLandmarkIndexes) {
      if (landmarks[index]) {
        const landmark = landmarks[index];
        const x = landmark.x * canvasSize.width;
        const y = landmark.y * canvasSize.height;

        // Draw point
        this.canvasCtx.beginPath();
        this.canvasCtx.arc(x, y, 3, 0, 2 * Math.PI);
        this.canvasCtx.fill();
      }
    }
  },

  // Start detection loop
  async start() {
    if (!this.isInitialized) {
      console.warn('Face Mesh not initialized');
      return false;
    }

    this.isRunning = true;
    console.log('Face detection started');
    return true;
  },

  // Stop detection
  stop() {
    this.isRunning = false;
    console.log('Face detection stopped');
  },

  // Default results handler
  defaultOnResults(results) {
    this.currentFaceLandmarks = results.multiFaceLandmarks;

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];
      this.processFaceLandmarks(landmarks);
    }
  },

  // Process face landmarks
  processFaceLandmarks(landmarks) {
    // Extract key facial points
    const keyPoints = {
      // Face oval
      nose: landmarks[1],
      noseTip: landmarks[4],
      
      // Eyes
      leftEye: landmarks[33],
      rightEye: landmarks[263],
      leftEyeInner: landmarks[133],
      leftEyeOuter: landmarks[33],
      rightEyeInner: landmarks[362],
      rightEyeOuter: landmarks[263],
      
      // Eyebrows
      leftEyebrow: landmarks[70],
      rightEyebrow: landmarks[300],
      leftEyebrowInner: landmarks[55],
      rightEyebrowInner: landmarks[285],
      
      // Mouth
      leftMouth: landmarks[61],
      rightMouth: landmarks[291],
      upperLip: landmarks[13],
      lowerLip: landmarks[14],
      mouthCenter: landmarks[17],
      
      // Face structure
      chin: landmarks[152],
      forehead: landmarks[10],
      leftCheek: landmarks[234],
      rightCheek: landmarks[454]
    };

    return keyPoints;
  },

  // Get current face landmarks
  getCurrentLandmarks() {
    return this.currentFaceLandmarks;
  },

  // Extract face encoding (simplified version)
  async extractFaceEncoding(landmarks) {
    if (!landmarks || landmarks.length === 0) {
      console.warn('No landmarks provided for encoding');
      return null;
    }

    try {
      // Calculate key measurements for face recognition
      const keyPoints = this.processFaceLandmarks(landmarks);
      
      // Create a unique face encoding based on facial geometry
      const encoding = {
        // Eye measurements
        eyeDistance: this.calculateDistance(keyPoints.leftEye, keyPoints.rightEye),
        leftEyeWidth: this.calculateDistance(keyPoints.leftEyeInner, keyPoints.leftEyeOuter),
        rightEyeWidth: this.calculateDistance(keyPoints.rightEyeInner, keyPoints.rightEyeOuter),
        
        // Nose measurements
        noseToLeftEye: this.calculateDistance(keyPoints.nose, keyPoints.leftEye),
        noseToRightEye: this.calculateDistance(keyPoints.nose, keyPoints.rightEye),
        noseToChin: this.calculateDistance(keyPoints.nose, keyPoints.chin),
        noseToForehead: this.calculateDistance(keyPoints.nose, keyPoints.forehead),
        
        // Mouth measurements
        mouthWidth: this.calculateDistance(keyPoints.leftMouth, keyPoints.rightMouth),
        mouthToNose: this.calculateDistance(keyPoints.mouthCenter, keyPoints.nose),
        
        // Face structure
        faceWidth: this.calculateDistance(keyPoints.leftCheek, keyPoints.rightCheek),
        faceHeight: this.calculateDistance(keyPoints.forehead, keyPoints.chin),
        
        // Additional ratios for better accuracy
        eyeToFaceWidthRatio: 0,
        noseToFaceHeightRatio: 0,
        mouthToFaceWidthRatio: 0,
        
        // Timestamp
        timestamp: Date.now()
      };

      // Calculate ratios
      encoding.eyeToFaceWidthRatio = encoding.eyeDistance / encoding.faceWidth;
      encoding.noseToFaceHeightRatio = encoding.noseToChin / encoding.faceHeight;
      encoding.mouthToFaceWidthRatio = encoding.mouthWidth / encoding.faceWidth;

      console.log('Face encoding extracted successfully');
      return encoding;
    } catch (error) {
      console.error('Failed to extract face encoding:', error);
      return null;
    }
  },

  // Calculate distance between two points
  calculateDistance(point1, point2) {
    if (!point1 || !point2) return 0;
    
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    const dz = (point1.z || 0) - (point2.z || 0);
    
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  },

  // Compare face encodings
  compareFaceEncodings(encoding1, encoding2, threshold = 0.15) {
    if (!encoding1 || !encoding2) {
      console.warn('Invalid encodings for comparison');
      return false;
    }

    try {
      // Calculate differences for all measurements
      const differences = [
        Math.abs(encoding1.eyeDistance - encoding2.eyeDistance),
        Math.abs(encoding1.leftEyeWidth - encoding2.leftEyeWidth),
        Math.abs(encoding1.rightEyeWidth - encoding2.rightEyeWidth),
        Math.abs(encoding1.noseToLeftEye - encoding2.noseToLeftEye),
        Math.abs(encoding1.noseToRightEye - encoding2.noseToRightEye),
        Math.abs(encoding1.noseToChin - encoding2.noseToChin),
        Math.abs(encoding1.noseToForehead - encoding2.noseToForehead),
        Math.abs(encoding1.mouthWidth - encoding2.mouthWidth),
        Math.abs(encoding1.mouthToNose - encoding2.mouthToNose),
        Math.abs(encoding1.faceWidth - encoding2.faceWidth),
        Math.abs(encoding1.faceHeight - encoding2.faceHeight),
        
        // Ratio comparisons (more reliable)
        Math.abs(encoding1.eyeToFaceWidthRatio - encoding2.eyeToFaceWidthRatio) * 10,
        Math.abs(encoding1.noseToFaceHeightRatio - encoding2.noseToFaceHeightRatio) * 10,
        Math.abs(encoding1.mouthToFaceWidthRatio - encoding2.mouthToFaceWidthRatio) * 10
      ];

      // Calculate average difference
      const avgDifference = differences.reduce((a, b) => a + b, 0) / differences.length;
      
      const isMatch = avgDifference < threshold;
      
      console.log('Face comparison result:', {
        avgDifference: avgDifference.toFixed(4),
        threshold,
        isMatch
      });
      
      return isMatch;
    } catch (error) {
      console.error('Face comparison error:', error);
      return false;
    }
  },

  // Recognize face from stored encodings
  async recognizeFace(currentLandmarks) {
    if (!currentLandmarks || currentLandmarks.length === 0) {
      console.warn('No face landmarks for recognition');
      return null;
    }

    try {
      const currentEncoding = await this.extractFaceEncoding(currentLandmarks[0]);
      if (!currentEncoding) {
        console.warn('Failed to extract current face encoding');
        return null;
      }

      // Get all stored face encodings
      const storedEncodings = await StorageManager.getAllFaceEncodings();
      
      if (!storedEncodings || storedEncodings.length === 0) {
        console.log('No stored face encodings found');
        return null;
      }

      console.log('Comparing against', storedEncodings.length, 'stored faces');

      // Find matching user
      for (const stored of storedEncodings) {
        if (this.compareFaceEncodings(currentEncoding, stored.encoding)) {
          const user = await StorageManager.getUser(stored.userId);
          console.log('Face recognized! User:', user.name);
          return user;
        }
      }

      console.log('No matching face found');
      return null;
    } catch (error) {
      console.error('Face recognition error:', error);
      return null;
    }
  },

  // Capture and save face encoding
  async captureFaceEncoding(userId, landmarks) {
    if (!landmarks || landmarks.length === 0) {
      Utils.showToast('No face detected. Please look at the camera.', 'warning');
      return false;
    }

    try {
      const encoding = await this.extractFaceEncoding(landmarks[0]);
      
      if (!encoding) {
        Utils.showToast('Failed to capture face data.', 'error');
        return false;
      }

      await StorageManager.saveFaceEncoding(userId, encoding);
      
      console.log('Face encoding saved successfully for user:', userId);
      return true;
    } catch (error) {
      console.error('Failed to save face encoding:', error);
      Utils.showToast('Failed to save face data.', 'error');
      return false;
    }
  },

  // Draw face landmarks on canvas
  drawLandmarks(canvasElement, landmarks) {
    if (!landmarks || landmarks.length === 0) {
      return;
    }

    const ctx = canvasElement.getContext('2d');
    const width = canvasElement.width;
    const height = canvasElement.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw face mesh
    ctx.fillStyle = '#4F46E5';
    ctx.strokeStyle = '#4F46E5';
    ctx.lineWidth = 1;

    landmarks.forEach(faceLandmarks => {
      // Draw landmarks as dots
      faceLandmarks.forEach(landmark => {
        ctx.beginPath();
        ctx.arc(
          landmark.x * width, 
          landmark.y * height, 
          1.5, 
          0, 
          2 * Math.PI
        );
        ctx.fill();
      });

      // Draw key connections
      this.drawFaceConnections(ctx, faceLandmarks, width, height);
    });
  },

  // Draw face connections
  drawFaceConnections(ctx, landmarks, width, height) {
    const connections = [
      // Left eye
      [33, 133], [133, 155], [155, 154], [154, 153], [153, 145], [145, 144], [144, 163], [163, 7],
      
      // Right eye
      [362, 263], [263, 249], [249, 390], [390, 373], [373, 374], [374, 380], [380, 381], [381, 382],
      
      // Lips outer
      [61, 146], [146, 91], [91, 181], [181, 84], [84, 17], [17, 314], [314, 405], [405, 321], [321, 375], [375, 291],
      
      // Face oval
      [10, 338], [338, 297], [297, 332], [332, 284], [284, 251], [251, 389], [389, 356], [356, 454]
    ];

    ctx.strokeStyle = '#4F46E5';
    ctx.lineWidth = 1;

    connections.forEach(([start, end]) => {
      if (landmarks[start] && landmarks[end]) {
        ctx.beginPath();
        ctx.moveTo(landmarks[start].x * width, landmarks[start].y * height);
        ctx.lineTo(landmarks[end].x * width, landmarks[end].y * height);
        ctx.stroke();
      }
    });
  },

  // Calculate face orientation (yaw, pitch, roll)
  calculateFaceOrientation(landmarks) {
    if (!landmarks || landmarks.length === 0) {
      return null;
    }

    try {
      const keyPoints = this.processFaceLandmarks(landmarks);
      
      const noseTip = keyPoints.noseTip;
      const leftEye = keyPoints.leftEye;
      const rightEye = keyPoints.rightEye;
      const chin = keyPoints.chin;

      // Calculate eye midpoint
      const eyeMidpoint = {
        x: (leftEye.x + rightEye.x) / 2,
        y: (leftEye.y + rightEye.y) / 2,
        z: (leftEye.z + rightEye.z) / 2
      };

      // Calculate yaw (left-right rotation)
      const yaw = Math.atan2(noseTip.x - eyeMidpoint.x, noseTip.z - eyeMidpoint.z) * (180 / Math.PI);

      // Calculate pitch (up-down rotation)
      const pitch = Math.atan2(noseTip.y - eyeMidpoint.y, noseTip.z - eyeMidpoint.z) * (180 / Math.PI);

      // Calculate roll (tilt)
      const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI);

      const isFacingCamera = Math.abs(yaw) < 15 && Math.abs(pitch) < 15 && Math.abs(roll) < 20;

      return {
        yaw: yaw.toFixed(2),
        pitch: pitch.toFixed(2),
        roll: roll.toFixed(2),
        isFacingCamera
      };
    } catch (error) {
      console.error('Failed to calculate face orientation:', error);
      return null;
    }
  },

  // Calculate face distance from camera
  calculateFaceDistance(landmarks) {
    if (!landmarks || landmarks.length === 0) {
      return null;
    }

    try {
      const keyPoints = this.processFaceLandmarks(landmarks);
      const eyeDistance = this.calculateDistance(keyPoints.leftEye, keyPoints.rightEye);

      // Normalized distance estimation (inverse relationship)
      const normalizedDistance = 1 / eyeDistance;

      // Classify distance
      const isTooClose = eyeDistance > 0.3;
      const isTooFar = eyeDistance < 0.1;
      const isOptimal = !isTooClose && !isTooFar;

      return {
        eyeDistance: eyeDistance.toFixed(4),
        normalizedDistance: normalizedDistance.toFixed(2),
        isTooClose,
        isTooFar,
        isOptimal
      };
    } catch (error) {
      console.error('Failed to calculate face distance:', error);
      return null;
    }
  },

  // Update detection sensitivity
  updateSensitivity(sensitivity) {
    if (!this.faceMesh) {
      console.warn('Face mesh not initialized');
      return false;
    }

    try {
      this.faceMesh.setOptions({
        minDetectionConfidence: sensitivity,
        minTrackingConfidence: sensitivity
      });

      console.log('Face detection sensitivity updated to:', sensitivity);
      return true;
    } catch (error) {
      console.error('Failed to update sensitivity:', error);
      return false;
    }
  },

  // Get detection state
  getState() {
    return {
      isInitialized: this.isInitialized,
      faceDetected: this.currentFaceLandmarks !== null && this.currentFaceLandmarks.length > 0,
      landmarkCount: this.currentFaceLandmarks ? this.currentFaceLandmarks.length : 0,
      processingFrame: this.processingFrame
    };
  },

  // Check if face is properly positioned for capture
  isFaceProperlyPositioned(landmarks) {
    if (!landmarks || landmarks.length === 0) {
      return {
        isProper: false,
        reason: 'No face detected'
      };
    }

    const orientation = this.calculateFaceOrientation(landmarks);
    const distance = this.calculateFaceDistance(landmarks);

    if (!orientation || !distance) {
      return {
        isProper: false,
        reason: 'Unable to analyze face position'
      };
    }

    if (!orientation.isFacingCamera) {
      return {
        isProper: false,
        reason: 'Please face the camera directly'
      };
    }

    if (distance.isTooClose) {
      return {
        isProper: false,
        reason: 'Too close to camera. Move back.'
      };
    }

    if (distance.isTooFar) {
      return {
        isProper: false,
        reason: 'Too far from camera. Move closer.'
      };
    }

    return {
      isProper: true,
      reason: 'Face position optimal',
      orientation,
      distance
    };
  },

  // Cleanup
  cleanup() {
    console.log('Cleaning up face detection...');
    
    if (this.faceMesh) {
      this.faceMesh.close();
      this.faceMesh = null;
    }
    
    this.currentFaceLandmarks = null;
    this.faceDetectionCallback = null;
    this.isInitialized = false;
    this.processingFrame = false;
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FaceDetection;
}