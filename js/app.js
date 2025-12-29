// js/app.js - Main Application Initialization

const App = {
  version: '1.0.0',
  isInitialized: false,
  currentUser: null,

  // Initialize application
  async init() {
    try {
      console.log(`SignSpeak v${this.version} initializing...`);

      // Check browser compatibility
      if (!this.checkCompatibility()) {
        this.showCompatibilityError();
        return false;
      }

      // Initialize database
      await StorageManager.init();

      // Register service worker
      await this.registerServiceWorker();

      // Setup PWA install prompt
      this.setupInstallPrompt();

      // Setup offline detection
      this.setupOfflineDetection();

      // Setup visibility change handler
      this.setupVisibilityHandler();

      // Load current user if exists
      await this.loadCurrentUser();

      this.isInitialized = true;
      console.log('SignSpeak initialized successfully');

      return true;
    } catch (error) {
      console.error('Application initialization failed:', error);
      Utils.showToast('Failed to initialize application', 'error');
      return false;
    }
  },

  // Check browser compatibility
  checkCompatibility() {
    const required = {
      mediaDevices: 'navigator' in window && 'mediaDevices' in navigator,
      getUserMedia: navigator.mediaDevices && 'getUserMedia' in navigator.mediaDevices,
      indexedDB: 'indexedDB' in window,
      serviceWorker: 'serviceWorker' in navigator,
      localStorage: 'localStorage' in window
    };

    const missing = Object.entries(required)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missing.length > 0) {
      console.error('Missing required features:', missing);
      return false;
    }

    return true;
  },

  // Show compatibility error
  showCompatibilityError() {
    document.body.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; text-align: center; font-family: system-ui;">
        <div style="max-width: 500px;">
          <h1 style="color: #EF4444; margin-bottom: 16px;">⚠️ Browser Not Supported</h1>
          <p style="color: #6B7280; margin-bottom: 24px;">
            Your browser doesn't support the required features for SignSpeak.
            Please use a modern browser like Chrome, Firefox, Safari, or Edge.
          </p>
          <p style="color: #9CA3AF; font-size: 14px;">
            Required features: Camera access, IndexedDB, Service Workers
          </p>
        </div>
      </div>
    `;
  },

  // Register service worker
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('Service Worker registered:', registration.scope);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              Utils.showToast('New version available! Refresh to update.', 'info', 5000);
            }
          });
        });

        return registration;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  },

  // Setup PWA install prompt
  setupInstallPrompt() {
    let deferredPrompt;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;

      // Show install button/banner
      this.showInstallBanner(deferredPrompt);
    });

    window.addEventListener('appinstalled', () => {
      console.log('PWA installed successfully');
      Utils.showToast('SignSpeak installed!', 'success');
      deferredPrompt = null;
    });
  },

  // Show install banner
  showInstallBanner(deferredPrompt) {
    // Create install banner (optional)
    const banner = document.createElement('div');
    banner.className = 'install-banner';
    banner.innerHTML = `
      <div style="padding: 16px; background: var(--primary-color); color: white; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong>Install SignSpeak</strong>
          <div style="font-size: 14px; opacity: 0.9;">Get quick access from your home screen</div>
        </div>
        <button id="installBtn" style="background: white; color: var(--primary-color); border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer;">
          Install
        </button>
      </div>
    `;

    document.body.appendChild(banner);

    document.getElementById('installBtn').addEventListener('click', async () => {
      banner.remove();
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`Install prompt outcome: ${outcome}`);
    });
  },

  // Setup offline detection
  setupOfflineDetection() {
    window.addEventListener('online', () => {
      Utils.showToast('Back online', 'success');
    });

    window.addEventListener('offline', () => {
      Utils.showToast('You are offline. Some features may be limited.', 'warning', 5000);
    });
  },

  // Setup visibility change handler
  setupVisibilityHandler() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('App hidden');
        // Pause intensive operations
      } else {
        console.log('App visible');
        // Resume operations
      }
    });
  },

  // Load current user
  async loadCurrentUser() {
    const userId = Utils.getLocalStorage('currentUserId');
    
    if (userId) {
      try {
        this.currentUser = await StorageManager.getUser(userId);
        
        if (this.currentUser) {
          // Update last login
          await StorageManager.updateUser(userId, {
            lastLogin: Date.now()
          });
        }
      } catch (error) {
        console.error('Failed to load user:', error);
      }
    }
  },

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  },

  // Logout
  async logout() {
    Utils.removeLocalStorage('currentUserId');
    this.currentUser = null;
    window.location.href = '/index.html';
  },

  // Get app info
  getInfo() {
    return {
      version: this.version,
      isInitialized: this.isInitialized,
      isOnline: Utils.isOnline(),
      isPWA: Utils.isPWAInstalled(),
      deviceInfo: Utils.getDeviceInfo()
    };
  },

  // Error handler
  handleError(error, context = '') {
    console.error(`Error in ${context}:`, error);
    
    // Log to analytics (if implemented)
    // this.logError(error, context);
    
    // Show user-friendly message
    Utils.showToast('An error occurred. Please try again.', 'error');
  },

  // Performance monitoring
  measurePerformance(name, callback) {
    const start = performance.now();
    const result = callback();
    const duration = performance.now() - start;
    
    console.log(`Performance [${name}]: ${duration.toFixed(2)}ms`);
    
    return result;
  }
};

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  App.handleError(event.error, 'Global');
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  App.handleError(event.reason, 'Promise');
});

// Expose App globally for debugging
if (typeof window !== 'undefined') {
  window.SignSpeakApp = App;
}