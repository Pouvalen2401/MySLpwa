// js/settings-manager.js - Complete Settings Management System

const SettingsManager = {
  currentUserId: null,
  settings: null,
  defaultSettings: {
    // Appearance
    theme: 'light',
    
    // Detection Settings
    handSensitivity: 0.7,
    faceSensitivity: 0.6,
    showLandmarks: false,
    
    // Camera Settings
    cameraResolution: 'hd',
    preferredCamera: 'user',
    
    // Avatar Settings
    avatarAnimationSpeed: 1.0,
    
    // Audio & Feedback
    soundEnabled: true,
    vibrationEnabled: true,
    
    // Translation Settings
    autoTranslate: true,
    saveHistory: true,
    
    // Language
    language: 'en',
    
    // Performance
    performanceMode: 'balanced',
    
    // Accessibility
    highContrast: false,
    largeText: false,
    reduceMotion: false,
    screenReader: false,
    
    // Privacy
    allowAnalytics: false,
    saveFaceData: true,
    
    // Calibration Data
    handCalibration: null,
    faceCalibration: null
  },

  // Initialize settings for a user
  async init(userId) {
    try {
      this.currentUserId = userId;
      await this.loadSettings();
      this.applyTheme();
      this.applyAccessibilitySettings();
      
      console.log('Settings initialized for user:', userId);
      return this.settings;
    } catch (error) {
      console.error('Settings initialization failed:', error);
      this.settings = { ...this.defaultSettings };
      return this.settings;
    }
  },

  // Load settings from storage
  async loadSettings() {
    try {
      this.settings = await StorageManager.getSettings(this.currentUserId);
      
      // Merge with defaults to ensure all keys exist
      this.settings = {
        ...this.defaultSettings,
        ...this.settings
      };
      
      console.log('Settings loaded successfully');
      return this.settings;
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = { ...this.defaultSettings };
      return this.settings;
    }
  },

  // Save settings to storage
  async saveSettings(updates) {
    try {
      // Merge updates with current settings
      this.settings = {
        ...this.settings,
        ...updates,
        updatedAt: Date.now()
      };
      
      // Save to storage
      await StorageManager.saveSettings(this.currentUserId, this.settings);
      
      // Apply theme if changed
      if (updates.theme) {
        this.applyTheme();
      }
      
      // Apply accessibility if changed
      if (updates.highContrast || updates.largeText || updates.reduceMotion) {
        this.applyAccessibilitySettings();
      }
      
      console.log('Settings saved successfully');
      Utils.showToast('Settings saved', 'success');
      
      return this.settings;
    } catch (error) {
      console.error('Failed to save settings:', error);
      Utils.showToast('Failed to save settings', 'error');
      throw error;
    }
  },

  // Get specific setting
  getSetting(key) {
    return this.settings ? this.settings[key] : this.defaultSettings[key];
  },

  // Update specific setting
  async updateSetting(key, value) {
    console.log('Updating setting:', key, '=', value);
    return this.saveSettings({ [key]: value });
  },

  // Get all settings
  getAllSettings() {
    return { ...this.settings };
  },

  // === THEME MANAGEMENT === //

  // Apply theme (light/dark mode)
  applyTheme() {
    const theme = this.getSetting('theme') || 'light';
    
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }

    // Update theme color meta tag
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'dark' ? '#111827' : '#4F46E5');
    }
    
    console.log('Theme applied:', theme);
  },

  // Toggle theme
  async toggleTheme() {
    const currentTheme = this.getSetting('theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    await this.updateSetting('theme', newTheme);
    Utils.showToast(`${newTheme === 'dark' ? 'Dark' : 'Light'} mode enabled`, 'success');
    
    return newTheme;
  },

  // === CALIBRATION === //

  calibrationData: {
    handBaseline: null,
    faceBaseline: null,
    lastCalibration: null
  },

  // Calibrate hand detection
  async calibrateHands(landmarks) {
    if (!landmarks || landmarks.length === 0) {
      Utils.showToast('No hand detected. Please show your hand to the camera.', 'warning');
      return false;
    }

    try {
      const wrist = landmarks[0];
      const middleFingerTip = landmarks[12];
      const indexFingerTip = landmarks[8];
      
      this.calibrationData.handBaseline = {
        wristPosition: { x: wrist.x, y: wrist.y, z: wrist.z },
        handSize: this.calculateDistance(wrist, middleFingerTip),
        fingerSpread: this.calculateDistance(indexFingerTip, middleFingerTip),
        timestamp: Date.now()
      };

      await this.updateSetting('handCalibration', this.calibrationData.handBaseline);
      
      Utils.showToast('Hand calibration complete ✓', 'success');
      Utils.vibrate(200);
      
      console.log('Hand calibration data:', this.calibrationData.handBaseline);
      return true;
    } catch (error) {
      console.error('Hand calibration failed:', error);
      Utils.showToast('Hand calibration failed', 'error');
      return false;
    }
  },

  // Calibrate face detection
  async calibrateFace(landmarks) {
    if (!landmarks || landmarks.length === 0) {
      Utils.showToast('No face detected. Please look at the camera.', 'warning');
      return false;
    }

    try {
      const nose = landmarks[1];
      const leftEye = landmarks[33];
      const rightEye = landmarks[263];
      const chin = landmarks[152];
      
      this.calibrationData.faceBaseline = {
        nosePosition: { x: nose.x, y: nose.y, z: nose.z },
        eyeDistance: this.calculateDistance(leftEye, rightEye),
        faceHeight: this.calculateDistance(nose, chin),
        timestamp: Date.now()
      };

      await this.updateSetting('faceCalibration', this.calibrationData.faceBaseline);
      
      Utils.showToast('Face calibration complete ✓', 'success');
      Utils.vibrate(200);
      
      console.log('Face calibration data:', this.calibrationData.faceBaseline);
      return true;
    } catch (error) {
      console.error('Face calibration failed:', error);
      Utils.showToast('Face calibration failed', 'error');
      return false;
    }
  },

  // Reset calibration
  async resetCalibration() {
    this.calibrationData = {
      handBaseline: null,
      faceBaseline: null,
      lastCalibration: null
    };

    await this.saveSettings({
      handCalibration: null,
      faceCalibration: null
    });

    Utils.showToast('Calibration reset', 'info');
    console.log('Calibration data reset');
  },

  // Calculate distance helper
  calculateDistance(point1, point2) {
    if (!point1 || !point2) return 0;
    
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    const dz = (point1.z || 0) - (point2.z || 0);
    
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  },

  // === CAMERA SETTINGS === //

  // Get camera resolution preset
  getCameraResolution() {
    const resolution = this.getSetting('cameraResolution') || 'hd';
    
    const resolutions = {
      sd: { width: 640, height: 480, label: 'SD (640×480)' },
      hd: { width: 1280, height: 720, label: 'HD (1280×720)' },
      fhd: { width: 1920, height: 1080, label: 'Full HD (1920×1080)' }
    };

    return resolutions[resolution] || resolutions.hd;
  },

  // === DETECTION SETTINGS === //

  // Get hand detection sensitivity
  getHandSensitivity() {
    return parseFloat(this.getSetting('handSensitivity')) || 0.7;
  },

  // Get face detection sensitivity
  getFaceSensitivity() {
    return parseFloat(this.getSetting('faceSensitivity')) || 0.6;
  },

  // Should show landmarks overlay
  shouldShowLandmarks() {
    return this.getSetting('showLandmarks') === true;
  },

  // === AVATAR SETTINGS === //

  // Get animation speed
  getAnimationSpeed() {
    return parseFloat(this.getSetting('avatarAnimationSpeed')) || 1.0;
  },

  // === AUDIO SETTINGS === //

  // Is sound enabled
  isSoundEnabled() {
    return this.getSetting('soundEnabled') !== false;
  },

  // Is vibration enabled
  isVibrationEnabled() {
    return this.getSetting('vibrationEnabled') !== false;
  },

  // === TRANSLATION SETTINGS === //

  // Is auto-translate enabled
  isAutoTranslateEnabled() {
    return this.getSetting('autoTranslate') !== false;
  },

  // Should save translation history
  shouldSaveHistory() {
    return this.getSetting('saveHistory') !== false;
  },

  // === LANGUAGE === //

  // Get current language
  getLanguage() {
    return this.getSetting('language') || 'en';
  },

  // === PERFORMANCE MODE === //

  // Get performance mode
  getPerformanceMode() {
    return this.getSetting('performanceMode') || 'balanced';
  },

  // Set performance mode with preset configurations
  async setPerformanceMode(mode) {
    const presets = {
      quality: {
        cameraResolution: 'fhd',
        handSensitivity: 0.8,
        faceSensitivity: 0.7,
        showLandmarks: true,
        avatarAnimationSpeed: 1.0
      },
      balanced: {
        cameraResolution: 'hd',
        handSensitivity: 0.7,
        faceSensitivity: 0.6,
        showLandmarks: false,
        avatarAnimationSpeed: 1.0
      },
      performance: {
        cameraResolution: 'sd',
        handSensitivity: 0.6,
        faceSensitivity: 0.5,
        showLandmarks: false,
        avatarAnimationSpeed: 1.5
      }
    };

    const preset = presets[mode] || presets.balanced;
    
    await this.saveSettings({
      performanceMode: mode,
      ...preset
    });

    Utils.showToast(`Performance mode: ${mode}`, 'success');
    console.log('Performance mode changed to:', mode);
  },

  // === ACCESSIBILITY === //

  // Get accessibility settings
  getAccessibilitySettings() {
    return {
      highContrast: this.getSetting('highContrast') || false,
      largeText: this.getSetting('largeText') || false,
      reduceMotion: this.getSetting('reduceMotion') || false,
      screenReader: this.getSetting('screenReader') || false
    };
  },

  // Update accessibility settings
  async updateAccessibilitySettings(updates) {
    await this.saveSettings(updates);
    this.applyAccessibilitySettings();
  },

  // Apply accessibility settings to DOM
  applyAccessibilitySettings() {
    const settings = this.getAccessibilitySettings();

    // High contrast
    if (settings.highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }

    // Large text
    if (settings.largeText) {
      document.body.classList.add('large-text');
    } else {
      document.body.classList.remove('large-text');
    }

    // Reduce motion
    if (settings.reduceMotion) {
      document.body.classList.add('reduce-motion');
    } else {
      document.body.classList.remove('reduce-motion');
    }

    console.log('Accessibility settings applied:', settings);
  },

  // === PRIVACY === //

  // Get privacy settings
  getPrivacySettings() {
    return {
      saveHistory: this.getSetting('saveHistory') !== false,
      allowAnalytics: this.getSetting('allowAnalytics') || false,
      saveFaceData: this.getSetting('saveFaceData') !== false
    };
  },

  // === IMPORT/EXPORT === //

  // Export settings
  async exportSettings() {
    try {
      const data = {
        settings: this.settings,
        calibrationData: this.calibrationData,
        exportDate: Date.now(),
        version: '1.0.0'
      };

      const json = JSON.stringify(data, null, 2);
      Utils.downloadFile(
        json, 
        `signspeak-settings-${Date.now()}.json`, 
        'application/json'
      );
      
      Utils.showToast('Settings exported successfully', 'success');
      return true;
    } catch (error) {
      console.error('Failed to export settings:', error);
      Utils.showToast('Failed to export settings', 'error');
      return false;
    }
  },

  // Import settings
  async importSettings(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);
          
          if (!data.settings) {
            throw new Error('Invalid settings file');
          }
          
          // Validate version compatibility (if needed)
          if (data.version && data.version !== '1.0.0') {
            console.warn('Settings version mismatch:', data.version);
          }
          
          // Import settings
          await this.saveSettings(data.settings);
          
          // Import calibration data
          if (data.calibrationData) {
            this.calibrationData = data.calibrationData;
          }

          Utils.showToast('Settings imported successfully', 'success');
          resolve(data);
        } catch (error) {
          console.error('Failed to import settings:', error);
          Utils.showToast('Failed to import settings. Invalid file.', 'error');
          reject(error);
        }
      };

      reader.onerror = () => {
        Utils.showToast('Failed to read file', 'error');
        reject(reader.error);
      };

      reader.readAsText(file);
    });
  },

  // === RESET === //

  // Reset to default settings
  async resetToDefaults() {
    try {
      this.settings = { ...this.defaultSettings };
      await StorageManager.saveSettings(this.currentUserId, this.settings);
      
      this.calibrationData = {
        handBaseline: null,
        faceBaseline: null,
        lastCalibration: null
      };

      this.applyTheme();
      this.applyAccessibilitySettings();
      
      Utils.showToast('Settings reset to defaults', 'success');
      console.log('Settings reset to defaults');
      
      return this.settings;
    } catch (error) {
      console.error('Failed to reset settings:', error);
      Utils.showToast('Failed to reset settings', 'error');
      throw error;
    }
  },

  // === VALIDATION === //

  // Validate settings object
  validateSettings(settings) {
    const errors = [];

    // Validate ranges
    if (settings.handSensitivity < 0.5 || settings.handSensitivity > 0.9) {
      errors.push('Hand sensitivity must be between 0.5 and 0.9');
    }

    if (settings.faceSensitivity < 0.5 || settings.faceSensitivity > 0.9) {
      errors.push('Face sensitivity must be between 0.5 and 0.9');
    }

    if (settings.avatarAnimationSpeed < 0.5 || settings.avatarAnimationSpeed > 2.0) {
      errors.push('Animation speed must be between 0.5 and 2.0');
    }

    // Validate enum values
    const validThemes = ['light', 'dark'];
    if (!validThemes.includes(settings.theme)) {
      errors.push('Invalid theme value');
    }

    const validResolutions = ['sd', 'hd', 'fhd'];
    if (!validResolutions.includes(settings.cameraResolution)) {
      errors.push('Invalid camera resolution');
    }

    const validPerformanceModes = ['quality', 'balanced', 'performance'];
    if (!validPerformanceModes.includes(settings.performanceMode)) {
      errors.push('Invalid performance mode');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  // === UTILITIES === //

  // Get setting summary for display
  getSettingsSummary() {
    return {
      theme: this.getSetting('theme'),
      cameraResolution: this.getCameraResolution().label,
      handSensitivity: (this.getHandSensitivity() * 100).toFixed(0) + '%',
      faceSensitivity: (this.getFaceSensitivity() * 100).toFixed(0) + '%',
      animationSpeed: this.getAnimationSpeed() + 'x',
      soundEnabled: this.isSoundEnabled() ? 'On' : 'Off',
      vibrationEnabled: this.isVibrationEnabled() ? 'On' : 'Off',
      performanceMode: this.getPerformanceMode(),
      calibrated: !!(this.calibrationData.handBaseline || this.calibrationData.faceBaseline)
    };
  },

  // Log current settings (for debugging)
  logSettings() {
    console.log('=== Current Settings ===');
    console.log('User ID:', this.currentUserId);
    console.log('Settings:', this.settings);
    console.log('Calibration:', this.calibrationData);
    console.log('Summary:', this.getSettingsSummary());
    console.log('=======================');
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SettingsManager;
}