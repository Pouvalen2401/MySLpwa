// js/camera-handler.js - Camera Management & Control

const CameraHandler = {
  stream: null,
  videoElement: null,
  isActive: false,
  currentFacingMode: 'user',
  currentDeviceId: null,
  availableDevices: [],

  // Initialize camera
  async init(videoElement, options = {}) {
    this.videoElement = videoElement;
    
    const defaultOptions = {
      facingMode: 'user',
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 }
    };

    const constraints = {
      video: { ...defaultOptions, ...options },
      audio: false
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoElement.srcObject = this.stream;
      this.isActive = true;
      
      return new Promise((resolve, reject) => {
        this.videoElement.onloadedmetadata = () => {
          this.videoElement.play()
            .then(() => {
              console.log('Camera initialized successfully');
              console.log('Video dimensions:', this.videoElement.videoWidth, 'x', this.videoElement.videoHeight);
              resolve(this.stream);
            })
            .catch(reject);
        };
        
        this.videoElement.onerror = () => {
          reject(new Error('Video element error'));
        };
      });
    } catch (error) {
      console.error('Camera initialization failed:', error);
      this.handleCameraError(error);
      throw error;
    }
  },

  // Start camera with settings
  async start(videoElement, userId) {
    try {
      // Load user settings if userId provided
      let resolution = { width: 1280, height: 720 };
      
      if (userId && typeof SettingsManager !== 'undefined') {
        await SettingsManager.init(userId);
        resolution = SettingsManager.getCameraResolution();
      }
      
      await this.init(videoElement, {
        width: resolution.width,
        height: resolution.height,
        facingMode: this.currentFacingMode
      });

      return true;
    } catch (error) {
      console.error('Failed to start camera:', error);
      return false;
    }
  },

  // Stop camera
  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
        console.log('Camera track stopped:', track.kind);
      });
      this.stream = null;
      this.isActive = false;
      
      if (this.videoElement) {
        this.videoElement.srcObject = null;
      }
      
      console.log('Camera stopped');
    }
  },

  // Pause camera
  pause() {
    if (this.videoElement && this.isActive) {
      this.videoElement.pause();
      console.log('Camera paused');
    }
  },

  // Resume camera
  resume() {
    if (this.videoElement && this.isActive) {
      this.videoElement.play()
        .then(() => console.log('Camera resumed'))
        .catch(error => console.error('Resume error:', error));
    }
  },

  // Switch camera (front/back)
  async switchCamera() {
    if (!this.isActive) {
      console.warn('Camera not active, cannot switch');
      return false;
    }

    const oldFacingMode = this.currentFacingMode;
    this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
    
    console.log('Switching camera from', oldFacingMode, 'to', this.currentFacingMode);
    
    this.stop();
    
    try {
      await this.init(this.videoElement, {
        facingMode: this.currentFacingMode
      });
      
      Utils.showToast(
        `Switched to ${this.currentFacingMode === 'user' ? 'front' : 'back'} camera`, 
        'success'
      );
      return true;
    } catch (error) {
      console.error('Failed to switch camera:', error);
      
      // Try to restore previous camera
      this.currentFacingMode = oldFacingMode;
      try {
        await this.init(this.videoElement, {
          facingMode: this.currentFacingMode
        });
      } catch (restoreError) {
        console.error('Failed to restore camera:', restoreError);
      }
      
      Utils.showToast('Failed to switch camera', 'error');
      return false;
    }
  },

  // Get available cameras
  async getAvailableCameras() {
    try {
      // Request permission first
      if (!this.stream) {
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
        tempStream.getTracks().forEach(track => track.stop());
      }
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableDevices = devices.filter(device => device.kind === 'videoinput');
      
      console.log('Available cameras:', this.availableDevices.length);
      this.availableDevices.forEach((device, index) => {
        console.log(`Camera ${index + 1}:`, device.label || `Camera ${index + 1}`);
      });
      
      return this.availableDevices;
    } catch (error) {
      console.error('Failed to get cameras:', error);
      return [];
    }
  },

  // Select specific camera by device ID
  async selectCamera(deviceId) {
    if (!this.videoElement) {
      console.error('Video element not set');
      return false;
    }

    this.currentDeviceId = deviceId;
    this.stop();

    try {
      await this.init(this.videoElement, {
        deviceId: { exact: deviceId }
      });
      console.log('Camera selected:', deviceId);
      return true;
    } catch (error) {
      console.error('Failed to select camera:', error);
      this.currentDeviceId = null;
      return false;
    }
  },

  // Capture frame as image (base64)
  captureFrame() {
    if (!this.videoElement || !this.isActive) {
      console.warn('Cannot capture frame: camera not active');
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = this.videoElement.videoWidth;
    canvas.height = this.videoElement.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(this.videoElement, 0, 0);

    return canvas.toDataURL('image/jpeg', 0.8);
  },

  // Capture frame as blob
  async captureFrameBlob(type = 'image/jpeg', quality = 0.8) {
    if (!this.videoElement || !this.isActive) {
      console.warn('Cannot capture frame: camera not active');
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = this.videoElement.videoWidth;
    canvas.height = this.videoElement.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(this.videoElement, 0, 0);

    return new Promise(resolve => {
      canvas.toBlob(blob => resolve(blob), type, quality);
    });
  },

  // Get video dimensions
  getVideoDimensions() {
    if (!this.videoElement) {
      return null;
    }

    return {
      width: this.videoElement.videoWidth,
      height: this.videoElement.videoHeight,
      aspectRatio: this.videoElement.videoWidth / this.videoElement.videoHeight
    };
  },

  // Get stream settings
  getStreamSettings() {
    if (!this.stream) {
      return null;
    }

    const videoTrack = this.stream.getVideoTracks()[0];
    if (!videoTrack) {
      return null;
    }

    const settings = videoTrack.getSettings();
    const capabilities = videoTrack.getCapabilities();
    
    return {
      settings,
      capabilities,
      label: videoTrack.label,
      enabled: videoTrack.enabled,
      readyState: videoTrack.readyState
    };
  },

  // Apply video constraints
  async applyConstraints(constraints) {
    if (!this.stream) {
      console.warn('Cannot apply constraints: no stream');
      return false;
    }

    try {
      const videoTrack = this.stream.getVideoTracks()[0];
      await videoTrack.applyConstraints(constraints);
      console.log('Constraints applied:', constraints);
      return true;
    } catch (error) {
      console.error('Failed to apply constraints:', error);
      return false;
    }
  },

  // Adjust zoom
  async setZoom(zoomLevel) {
    if (!this.stream) {
      return false;
    }

    try {
      const videoTrack = this.stream.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities();
      
      if (!capabilities.zoom) {
        console.warn('Zoom not supported on this device');
        return false;
      }

      const zoom = Math.max(
        capabilities.zoom.min,
        Math.min(zoomLevel, capabilities.zoom.max)
      );

      await videoTrack.applyConstraints({
        advanced: [{ zoom }]
      });
      
      console.log('Zoom set to:', zoom);
      return true;
    } catch (error) {
      console.error('Failed to set zoom:', error);
      return false;
    }
  },

  // Toggle torch (flashlight) - mobile only
  async toggleTorch(enabled) {
    if (!this.stream) {
      return false;
    }

    try {
      const videoTrack = this.stream.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities();

      if (!capabilities.torch) {
        Utils.showToast('Torch not supported on this device', 'warning');
        return false;
      }

      await videoTrack.applyConstraints({
        advanced: [{ torch: enabled }]
      });

      console.log('Torch', enabled ? 'enabled' : 'disabled');
      return true;
    } catch (error) {
      console.error('Failed to toggle torch:', error);
      return false;
    }
  },

  // Handle camera errors
  handleCameraError(error) {
    let message = 'Camera error occurred';
    let errorType = 'error';

    switch (error.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        message = 'Camera permission denied. Please enable camera access in browser settings.';
        errorType = 'error';
        break;
        
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        message = 'No camera found on this device.';
        errorType = 'error';
        break;
        
      case 'NotReadableError':
      case 'TrackStartError':
        message = 'Camera is already in use by another application.';
        errorType = 'warning';
        break;
        
      case 'OverconstrainedError':
        message = 'Camera does not support the requested settings.';
        errorType = 'warning';
        break;
        
      case 'TypeError':
        message = 'Invalid camera configuration.';
        errorType = 'error';
        break;
        
      case 'AbortError':
        message = 'Camera access was aborted.';
        errorType = 'warning';
        break;
        
      case 'SecurityError':
        message = 'Camera access blocked by security settings.';
        errorType = 'error';
        break;
        
      default:
        message = `Camera error: ${error.message || 'Unknown error'}`;
        errorType = 'error';
    }

    console.error('Camera Error:', error.name, '-', error.message);
    Utils.showToast(message, errorType);
  },

  // Check camera support
  isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  },

  // Check if camera is available
  async checkAvailability() {
    try {
      const devices = await this.getAvailableCameras();
      return devices.length > 0;
    } catch (error) {
      console.error('Failed to check camera availability:', error);
      return false;
    }
  },

  // Get camera status
  getStatus() {
    return {
      isActive: this.isActive,
      hasStream: !!this.stream,
      facingMode: this.currentFacingMode,
      deviceId: this.currentDeviceId,
      dimensions: this.getVideoDimensions(),
      settings: this.getStreamSettings(),
      availableDevices: this.availableDevices.length
    };
  },

  // Take photo with countdown
  async takePhotoWithCountdown(countdown = 3, onCountdown = null) {
    for (let i = countdown; i > 0; i--) {
      if (onCountdown) {
        onCountdown(i);
      }
      Utils.showToast(`${i}...`, 'info', 800);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Capture
    Utils.vibrate([100, 50, 100]);
    Utils.playSound('success');
    
    return this.captureFrame();
  },

  // Record video (returns MediaRecorder instance)
  startRecording(options = {}) {
    if (!this.stream) {
      console.error('Cannot record: no stream');
      return null;
    }

    try {
      const defaultOptions = {
        mimeType: 'video/webm',
        videoBitsPerSecond: 2500000
      };

      const mediaRecorder = new MediaRecorder(this.stream, {
        ...defaultOptions,
        ...options
      });

      const chunks = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        console.log('Recording complete:', url);
        
        // Trigger custom event with video data
        window.dispatchEvent(new CustomEvent('recordingcomplete', { 
          detail: { blob, url } 
        }));
      };

      mediaRecorder.start();
      console.log('Recording started');
      
      return mediaRecorder;
    } catch (error) {
      console.error('Recording failed:', error);
      return null;
    }
  },

  // Monitor camera health
  monitorHealth(callback, interval = 5000) {
    if (!this.isActive) {
      console.warn('Cannot monitor: camera not active');
      return null;
    }

    return setInterval(() => {
      const status = this.getStatus();
      
      if (!status.hasStream) {
        console.error('Camera connection lost');
        Utils.showToast('Camera connection lost', 'error');
        if (callback) callback('disconnected', status);
      } else if (this.stream) {
        const videoTrack = this.stream.getVideoTracks()[0];
        if (videoTrack.readyState !== 'live') {
          console.warn('Camera track not live:', videoTrack.readyState);
          if (callback) callback('warning', status);
        } else {
          if (callback) callback('active', status);
        }
      }
    }, interval);
  },

  // Get camera capabilities
  getCapabilities() {
    if (!this.stream) {
      return null;
    }

    const videoTrack = this.stream.getVideoTracks()[0];
    return videoTrack.getCapabilities();
  },

  // Check specific capability
  hasCapability(capability) {
    const capabilities = this.getCapabilities();
    return capabilities ? capability in capabilities : false;
  },

  // Get optimal settings for device
  async getOptimalSettings() {
    const capabilities = this.getCapabilities();
    
    if (!capabilities) {
      return null;
    }

    const optimal = {
      width: capabilities.width ? capabilities.width.max : 1280,
      height: capabilities.height ? capabilities.height.max : 720,
      frameRate: capabilities.frameRate ? capabilities.frameRate.max : 30,
      aspectRatio: 16 / 9
    };

    console.log('Optimal settings:', optimal);
    return optimal;
  },

  // Clean up
  cleanup() {
    console.log('Cleaning up camera handler...');
    this.stop();
    this.videoElement = null;
    this.currentFacingMode = 'user';
    this.currentDeviceId = null;
    this.availableDevices = [];
  }
};

// Handle visibility change (pause/resume camera)
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      CameraHandler.pause();
      console.log('Camera paused (page hidden)');
    } else {
      CameraHandler.resume();
      console.log('Camera resumed (page visible)');
    }
  });
}

// Handle page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    CameraHandler.cleanup();
  });
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CameraHandler;
}