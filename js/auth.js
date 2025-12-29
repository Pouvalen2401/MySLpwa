// js/auth.js - Authentication & User Management

const Auth = {
  currentUser: null,
  isAuthenticated: false,

  // Initialize authentication
  async init() {
    try {
      // Check if user is already logged in
      const userId = Utils.getLocalStorage('currentUserId');
      
      if (userId) {
        const user = await StorageManager.getUser(userId);
        
        if (user) {
          this.currentUser = user;
          this.isAuthenticated = true;
          
          // Update last login
          await this.updateLastLogin(userId);
          
          return user;
        }
      }

      return null;
    } catch (error) {
      console.error('Auth initialization failed:', error);
      return null;
    }
  },

  // Create new user
  async createUser(userData) {
    try {
      // Validate user data
      if (!userData.name || userData.name.trim().length === 0) {
        throw new Error('Name is required');
      }

      // Generate unique user ID
      const userId = Utils.generateId();

      // Create user object
      const user = {
        id: userId,
        name: userData.name.trim(),
        email: userData.email || '',
        createdAt: Date.now(),
        lastLogin: Date.now(),
        avatarConfig: null,
        faceEncodingRegistered: false
      };

      // Save to database
      const savedUser = await StorageManager.saveUser(user);

      // Set as current user
      this.currentUser = savedUser;
      this.isAuthenticated = true;

      // Store in localStorage
      Utils.setLocalStorage('currentUserId', userId);

      console.log('User created successfully:', userId);
      return savedUser;

    } catch (error) {
      console.error('User creation failed:', error);
      throw error;
    }
  },

  // Login with user ID
  async login(userId) {
    try {
      const user = await StorageManager.getUser(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Update last login
      await this.updateLastLogin(userId);

      // Set as current user
      this.currentUser = user;
      this.isAuthenticated = true;

      // Store in localStorage
      Utils.setLocalStorage('currentUserId', userId);

      console.log('User logged in:', userId);
      return user;

    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  // Login with name (find or create)
  async loginWithName(name) {
    try {
      if (!name || name.trim().length === 0) {
        throw new Error('Name is required');
      }

      // Search for existing user by name
      const users = await StorageManager.getAllUsers();
      const existingUser = users.find(u => 
        u.name.toLowerCase() === name.trim().toLowerCase()
      );

      if (existingUser) {
        // Login existing user
        return await this.login(existingUser.id);
      } else {
        // Create new user
        return await this.createUser({ name: name.trim() });
      }

    } catch (error) {
      console.error('Name login failed:', error);
      throw error;
    }
  },

  // Login with face recognition
  async loginWithFace(faceLandmarks) {
    try {
      if (!faceLandmarks || faceLandmarks.length === 0) {
        throw new Error('No face detected');
      }

      // Extract face encoding
      const currentEncoding = await FaceDetection.extractFaceEncoding(faceLandmarks[0]);

      if (!currentEncoding) {
        throw new Error('Failed to extract face encoding');
      }

      // Get all stored face encodings
      const storedEncodings = await StorageManager.getAllFaceEncodings();

      // Find matching user
      for (const stored of storedEncodings) {
        if (FaceDetection.compareFaceEncodings(currentEncoding, stored.encoding)) {
          const user = await this.login(stored.userId);
          console.log('Face recognition successful');
          return user;
        }
      }

      throw new Error('Face not recognized');

    } catch (error) {
      console.error('Face login failed:', error);
      throw error;
    }
  },

  // Register face for current user
  async registerFace(faceLandmarks) {
    try {
      if (!this.isAuthenticated || !this.currentUser) {
        throw new Error('User must be logged in to register face');
      }

      if (!faceLandmarks || faceLandmarks.length === 0) {
        throw new Error('No face detected');
      }

      // Extract and save face encoding
      const success = await FaceDetection.captureFaceEncoding(
        this.currentUser.id, 
        faceLandmarks
      );

      if (success) {
        // Update user record
        await StorageManager.updateUser(this.currentUser.id, {
          faceEncodingRegistered: true
        });

        this.currentUser.faceEncodingRegistered = true;
        console.log('Face registered successfully');
        return true;
      }

      return false;

    } catch (error) {
      console.error('Face registration failed:', error);
      throw error;
    }
  },

  // Check if face is registered
  async hasFaceRegistered(userId) {
    try {
      const faceData = await StorageManager.getFaceEncoding(userId);
      return faceData !== null;
    } catch (error) {
      console.error('Failed to check face registration:', error);
      return false;
    }
  },

  // Update last login timestamp
  async updateLastLogin(userId) {
    try {
      await StorageManager.updateUser(userId, {
        lastLogin: Date.now()
      });
    } catch (error) {
      console.error('Failed to update last login:', error);
    }
  },

  // Logout
  async logout() {
    try {
      // Clear current user
      this.currentUser = null;
      this.isAuthenticated = false;

      // Clear localStorage
      Utils.removeLocalStorage('currentUserId');

      console.log('User logged out');
      return true;

    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  },

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  },

  // Check if authenticated
  isUserAuthenticated() {
    return this.isAuthenticated && this.currentUser !== null;
  },

  // Require authentication (redirect if not logged in)
  requireAuth(redirectUrl = '/index.html') {
    if (!this.isUserAuthenticated()) {
      window.location.href = redirectUrl;
      return false;
    }
    return true;
  },

  // Update user profile
  async updateProfile(updates) {
    try {
      if (!this.isAuthenticated || !this.currentUser) {
        throw new Error('User must be logged in');
      }

      // Update user in database
      const updatedUser = await StorageManager.updateUser(
        this.currentUser.id,
        updates
      );

      // Update current user object
      this.currentUser = { ...this.currentUser, ...updates };

      console.log('Profile updated');
      return updatedUser;

    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  },

  // Delete user account
  async deleteAccount() {
    try {
      if (!this.isAuthenticated || !this.currentUser) {
        throw new Error('User must be logged in');
      }

      const userId = this.currentUser.id;

      // Delete user data
      await StorageManager.deleteUser(userId);
      await StorageManager.deleteFaceEncoding(userId);
      await StorageManager.clearTranslationHistory(userId);

      // Logout
      await this.logout();

      console.log('Account deleted');
      return true;

    } catch (error) {
      console.error('Account deletion failed:', error);
      throw error;
    }
  },

  // Get all users (for admin or selection)
  async getAllUsers() {
    try {
      return await StorageManager.getAllUsers();
    } catch (error) {
      console.error('Failed to get users:', error);
      return [];
    }
  },

  // Switch user
  async switchUser(userId) {
    try {
      // Logout current user
      await this.logout();

      // Login new user
      return await this.login(userId);

    } catch (error) {
      console.error('User switch failed:', error);
      throw error;
    }
  },

  // Check if name exists
  async nameExists(name) {
    try {
      const users = await StorageManager.getAllUsers();
      return users.some(u => 
        u.name.toLowerCase() === name.trim().toLowerCase()
      );
    } catch (error) {
      console.error('Name check failed:', error);
      return false;
    }
  },

  // Get user by name
  async getUserByName(name) {
    try {
      const users = await StorageManager.getAllUsers();
      return users.find(u => 
        u.name.toLowerCase() === name.trim().toLowerCase()
      ) || null;
    } catch (error) {
      console.error('Failed to get user by name:', error);
      return null;
    }
  },

  // Validate session
  async validateSession() {
    try {
      if (!this.isAuthenticated) {
        return false;
      }

      // Check if user still exists in database
      const user = await StorageManager.getUser(this.currentUser.id);
      
      if (!user) {
        // User deleted, logout
        await this.logout();
        return false;
      }

      return true;

    } catch (error) {
      console.error('Session validation failed:', error);
      return false;
    }
  },

  // Get session info
  getSessionInfo() {
    return {
      isAuthenticated: this.isAuthenticated,
      user: this.currentUser,
      userId: this.currentUser ? this.currentUser.id : null,
      userName: this.currentUser ? this.currentUser.name : null,
      hasFaceRegistered: this.currentUser ? this.currentUser.faceEncodingRegistered : false
    };
  },

  // Export user data
  async exportUserData() {
    try {
      if (!this.isAuthenticated || !this.currentUser) {
        throw new Error('User must be logged in');
      }

      return await StorageManager.exportData(this.currentUser.id);

    } catch (error) {
      console.error('Data export failed:', error);
      throw error;
    }
  },

  // Import user data
  async importUserData(data) {
    try {
      if (!this.isAuthenticated || !this.currentUser) {
        throw new Error('User must be logged in');
      }

      await StorageManager.importData(data);
      
      // Reload current user
      this.currentUser = await StorageManager.getUser(this.currentUser.id);

      console.log('Data imported successfully');
      return true;

    } catch (error) {
      console.error('Data import failed:', error);
      throw error;
    }
  },

  // Get user statistics
  async getUserStatistics() {
    try {
      if (!this.isAuthenticated || !this.currentUser) {
        throw new Error('User must be logged in');
      }

      const history = await StorageManager.getTranslationHistory(this.currentUser.id);
      const avatar = await StorageManager.getAvatar(this.currentUser.id);
      const settings = await StorageManager.getSettings(this.currentUser.id);

      const firstTranslation = history.length > 0 ? history[history.length - 1].timestamp : this.currentUser.createdAt;
      const daysSinceFirst = Math.floor((Date.now() - firstTranslation) / (1000 * 60 * 60 * 24));

      return {
        totalTranslations: history.length,
        uniqueSigns: new Set(history.map(t => t.output)).size,
        daysActive: Math.max(1, daysSinceFirst),
        avgPerDay: (history.length / Math.max(1, daysSinceFirst)).toFixed(1),
        memberSince: this.currentUser.createdAt,
        lastLogin: this.currentUser.lastLogin,
        hasAvatar: avatar !== null,
        hasCustomSettings: settings !== null,
        hasFaceRegistered: this.currentUser.faceEncodingRegistered
      };

    } catch (error) {
      console.error('Failed to get statistics:', error);
      return null;
    }
  },

  // Clean up inactive sessions
  async cleanupInactiveSessions(daysInactive = 90) {
    try {
      const users = await StorageManager.getAllUsers();
      const cutoffDate = Date.now() - (daysInactive * 24 * 60 * 60 * 1000);
      
      let deletedCount = 0;

      for (const user of users) {
        if (user.lastLogin < cutoffDate) {
          await StorageManager.deleteUser(user.id);
          await StorageManager.deleteFaceEncoding(user.id);
          await StorageManager.clearTranslationHistory(user.id);
          deletedCount++;
        }
      }

      console.log(`Cleaned up ${deletedCount} inactive users`);
      return deletedCount;

    } catch (error) {
      console.error('Cleanup failed:', error);
      return 0;
    }
  }
};

// Auto-initialize on page load
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', async () => {
    await Auth.init();
  });
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Auth;
}