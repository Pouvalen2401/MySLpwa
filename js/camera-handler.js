// camera-handler.js
// Centralized camera + face detection controller

class CameraHandler {
  constructor(videoElement) {
    this.videoElement = videoElement;
    this.stream = null;

    // Face API state
    this.faceApiLoaded = false;
    this.faceDetectionInterval = null;
    this.faceDetectionCanvas = null;
    this.isFaceDetectionRunning = false;

    // Optional callback for UI
    this.onMoodDetected = null;
  }

  /* ===============================
     CAMERA INITIALIZATION
     =============================== */
  async init(constraints = { video: true, audio: false }) {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoElement.srcObject = this.stream;

      await this.videoElement.play();

      // Ensure metadata is ready
      await new Promise(resolve => {
        if (this.videoElement.readyState >= 2) resolve();
        this.videoElement.onloadedmetadata = () => resolve();
      });

      await this.loadFaceApiModels();
      this.startFaceDetection();

    } catch (error) {
      console.error('Camera initialization failed:', error);
    }
  }

  /* ===============================
     FACE API MODEL LOADING
     =============================== */
  async loadFaceApiModels() {
    if (this.faceApiLoaded) return;

    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
      faceapi.nets.faceExpressionNet.loadFromUri('/models')
    ]);

    this.faceApiLoaded = true;
    console.log('Face API models loaded');
  }

  /* ===============================
     FACE DETECTION LOOP
     =============================== */
  startFaceDetection() {
    if (this.isFaceDetectionRunning) return;

    const video = this.videoElement;

    // Create overlay canvas
    this.faceDetectionCanvas = faceapi.createCanvasFromMedia(video);
    this.faceDetectionCanvas.classList.add('face-overlay');

    video.parentElement.style.position = 'relative';
    video.parentElement.appendChild(this.faceDetectionCanvas);

    const displaySize = {
      width: video.videoWidth,
      height: video.videoHeight
    };

    faceapi.matchDimensions(this.faceDetectionCanvas, displaySize);

    this.faceDetectionInterval = setInterval(async () => {
      if (video.paused || video.ended) return;

      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();

      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      const ctx = this.faceDetectionCanvas.getContext('2d');

      ctx.clearRect(0, 0, this.faceDetectionCanvas.width, this.faceDetectionCanvas.height);

      faceapi.draw.drawDetections(this.faceDetectionCanvas, resizedDetections);
      faceapi.draw.drawFaceLandmarks(this.faceDetectionCanvas, resizedDetections);

      // Mood detection (first detected face)
      if (resizedDetections.length > 0) {
        const expressions = resizedDetections[0].expressions;
        const mood = this.extractMood(expressions);

        if (this.onMoodDetected) {
          this.onMoodDetected(mood, expressions);
        }
      }

    }, 120);

    this.isFaceDetectionRunning = true;
  }

  /* ===============================
     MOOD EXTRACTION
     =============================== */
  extractMood(expressions) {
    return Object.entries(expressions)
      .sort((a, b) => b[1] - a[1])[0][0];
  }

  /* ===============================
     STOP FACE DETECTION
     =============================== */
  stopFaceDetection() {
    if (this.faceDetectionInterval) {
      clearInterval(this.faceDetectionInterval);
      this.faceDetectionInterval = null;
    }

    if (this.faceDetectionCanvas) {
      this.faceDetectionCanvas.remove();
      this.faceDetectionCanvas = null;
    }

    this.isFaceDetectionRunning = false;
  }

  /* ===============================
     CAMERA CLEANUP
     =============================== */
  cleanup() {
    this.stopFaceDetection();

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }
}

/* ===============================
   EXPORT (if using modules)
   =============================== */
