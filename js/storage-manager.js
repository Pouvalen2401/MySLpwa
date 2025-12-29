// js/storage-manager.js - IndexedDB Storage Manager

const StorageManager = {
  dbName: 'SignSpeakDB',
  version: 1,
  db: null,

  // Initialize database
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('Database failed to open');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('Database initialized successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (e) => {
        this.db = e.target.result;

        // User profiles store
        if (!this.db.objectStoreNames.contains('users')) {
          const userStore = this.db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('name', 'name', { unique: false });
          userStore.createIndex('lastLogin', 'lastLogin', { unique: false });
        }

        // Avatar configurations store
        if (!this.db.objectStoreNames.contains('avatars')) {
          const avatarStore = this.db.createObjectStore('avatars', { keyPath: 'userId' });
          avatarStore.createIndex('userId', 'userId', { unique: true });
        }

        // Translation history store
        if (!this.db.objectStoreNames.contains('translations')) {
          const translationStore = this.db.createObjectStore('translations', { keyPath: 'id', autoIncrement: true });
          translationStore.createIndex('userId', 'userId', { unique: false });
          translationStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Settings store
        if (!this.db.objectStoreNames.contains('settings')) {
          this.db.createObjectStore('settings', { keyPath: 'userId' });
        }

        // Face encodings store (for face recognition)
        if (!this.db.objectStoreNames.contains('faceEncodings')) {
          const faceStore = this.db.createObjectStore('faceEncodings', { keyPath: 'userId' });
          faceStore.createIndex('userId', 'userId', { unique: true });
        }

        console.log('Database setup complete');
      };
    });
  },

  // User operations
  async saveUser(userData) {
    const transaction = this.db.transaction(['users'], 'readwrite');
    const store = transaction.objectStore('users');
    
    const user = {
      id: userData.id || Utils.generateId(),
      name: userData.name,
      email: userData.email || '',
      createdAt: userData.createdAt || Date.now(),
      lastLogin: Date.now(),
      avatarConfig: userData.avatarConfig || null
    };

    return new Promise((resolve, reject) => {
      const request = store.put(user);
      request.onsuccess = () => resolve(user);
      request.onerror = () => reject(request.error);
    });
  },

  async getUser(userId) {
    const transaction = this.db.transaction(['users'], 'readonly');
    const store = transaction.objectStore('users');

    return new Promise((resolve, reject) => {
      const request = store.get(userId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getAllUsers() {
    const transaction = this.db.transaction(['users'], 'readonly');
    const store = transaction.objectStore('users');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async updateUser(userId, updates) {
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');

    const updatedUser = { ...user, ...updates };
    return this.saveUser(updatedUser);
  },

  async deleteUser(userId) {
    const transaction = this.db.transaction(['users'], 'readwrite');
    const store = transaction.objectStore('users');

    return new Promise((resolve, reject) => {
      const request = store.delete(userId);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  },

  // Avatar operations
  async saveAvatar(userId, avatarConfig) {
    const transaction = this.db.transaction(['avatars'], 'readwrite');
    const store = transaction.objectStore('avatars');

    const avatar = {
      userId,
      config: avatarConfig,
      updatedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const request = store.put(avatar);
      request.onsuccess = () => resolve(avatar);
      request.onerror = () => reject(request.error);
    });
  },

  async getAvatar(userId) {
    const transaction = this.db.transaction(['avatars'], 'readonly');
    const store = transaction.objectStore('avatars');

    return new Promise((resolve, reject) => {
      const request = store.get(userId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  // Translation history operations
  async saveTranslation(userId, translationData) {
    const transaction = this.db.transaction(['translations'], 'readwrite');
    const store = transaction.objectStore('translations');

    const translation = {
      userId,
      type: translationData.type, // 'sign-to-text' or 'text-to-sign'
      input: translationData.input,
      output: translationData.output,
      mood: translationData.mood || 'neutral',
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const request = store.add(translation);
      request.onsuccess = () => resolve({ id: request.result, ...translation });
      request.onerror = () => reject(request.error);
    });
  },

  async getTranslationHistory(userId, limit = 50) {
    const transaction = this.db.transaction(['translations'], 'readonly');
    const store = transaction.objectStore('translations');
    const index = store.index('userId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(userId);
      request.onsuccess = () => {
        const results = request.result
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, limit);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  },

  async clearTranslationHistory(userId) {
    const transaction = this.db.transaction(['translations'], 'readwrite');
    const store = transaction.objectStore('translations');
    const index = store.index('userId');

    return new Promise((resolve, reject) => {
      const request = index.openCursor(userId);
      request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve(true);
        }
      };
      request.onerror = () => reject(request.error);
    });
  },

  // Settings operations
  async saveSettings(userId, settings) {
    const transaction = this.db.transaction(['settings'], 'readwrite');
    const store = transaction.objectStore('settings');

    const settingsData = {
      userId,
      ...settings,
      updatedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const request = store.put(settingsData);
      request.onsuccess = () => resolve(settingsData);
      request.onerror = () => reject(request.error);
    });
  },

  async getSettings(userId) {
    const transaction = this.db.transaction(['settings'], 'readonly');
    const store = transaction.objectStore('settings');

    return new Promise((resolve, reject) => {
      const request = store.get(userId);
      request.onsuccess = () => resolve(request.result || this.getDefaultSettings());
      request.onerror = () => reject(request.error);
    });
  },

  getDefaultSettings() {
    return {
      theme: 'light',
      handSensitivity: 0.7,
      faceSensitivity: 0.6,
      avatarAnimationSpeed: 1.0,
      soundEnabled: true,
      vibrationEnabled: true,
      autoTranslate: true,
      showLandmarks: false,
      language: 'en',
      cameraResolution: 'hd',
      saveHistory: true
    };
  },

  // Face encoding operations
  async saveFaceEncoding(userId, encoding) {
    const transaction = this.db.transaction(['faceEncodings'], 'readwrite');
    const store = transaction.objectStore('faceEncodings');

    const faceData = {
      userId,
      encoding,
      updatedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const request = store.put(faceData);
      request.onsuccess = () => resolve(faceData);
      request.onerror = () => reject(request.error);
    });
  },

  async getFaceEncoding(userId) {
    const transaction = this.db.transaction(['faceEncodings'], 'readonly');
    const store = transaction.objectStore('faceEncodings');

    return new Promise((resolve, reject) => {
      const request = store.get(userId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getAllFaceEncodings() {
    const transaction = this.db.transaction(['faceEncodings'], 'readonly');
    const store = transaction.objectStore('faceEncodings');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async deleteFaceEncoding(userId) {
    const transaction = this.db.transaction(['faceEncodings'], 'readwrite');
    const store = transaction.objectStore('faceEncodings');

    return new Promise((resolve, reject) => {
      const request = store.delete(userId);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  },

  // Clear all data
  async clearAllData() {
    const stores = ['users', 'avatars', 'translations', 'settings', 'faceEncodings'];
    
    for (const storeName of stores) {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      await new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
    
    return true;
  },

  // Export data
  async exportData(userId) {
    const user = await this.getUser(userId);
    const avatar = await this.getAvatar(userId);
    const settings = await this.getSettings(userId);
    const translations = await this.getTranslationHistory(userId);

    return {
      user,
      avatar,
      settings,
      translations,
      exportDate: Date.now()
    };
  },

  // Import data
  async importData(data) {
    if (data.user) await this.saveUser(data.user);
    if (data.avatar) await this.saveAvatar(data.user.id, data.avatar.config);
    if (data.settings) await this.saveSettings(data.user.id, data.settings);
    
    if (data.translations && Array.isArray(data.translations)) {
      for (const translation of data.translations) {
        await this.saveTranslation(data.user.id, translation);
      }
    }

    return true;
  }
};

// Initialize on load
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    StorageManager.init().catch(console.error);
  });
}