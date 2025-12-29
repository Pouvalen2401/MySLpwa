// js/avatar-animator.js - Avatar Animation System

const AvatarAnimator = {
  avatarElement: null,
  isAnimating: false,
  currentAnimation: null,
  animationQueue: [],
  animationSpeed: 1.0,

  // Initialize animator
  init(avatarElementId, speed = 1.0) {
    this.avatarElement = document.getElementById(avatarElementId);
    this.animationSpeed = speed;
    
    if (!this.avatarElement) {
      console.error('Avatar element not found');
      return false;
    }

    console.log('Avatar animator initialized');
    return true;
  },

  // Animate hand gesture
  animateGesture(gestureType, handedness = 'Right', duration = 1000) {
    if (!this.avatarElement) return;

    const animation = {
      type: 'gesture',
      gesture: gestureType,
      handedness,
      duration: duration / this.animationSpeed
    };

    this.animationQueue.push(animation);
    
    if (!this.isAnimating) {
      this.processQueue();
    }
  },

  // Animate facial expression
  animateFacialExpression(mood, duration = 1000) {
    if (!this.avatarElement) return;

    const animation = {
      type: 'expression',
      mood,
      duration: duration / this.animationSpeed
    };

    this.animationQueue.push(animation);
    
    if (!this.isAnimating) {
      this.processQueue();
    }
  },

  // Process animation queue
  async processQueue() {
    if (this.animationQueue.length === 0) {
      this.isAnimating = false;
      return;
    }

    this.isAnimating = true;
    const animation = this.animationQueue.shift();

    switch (animation.type) {
      case 'gesture':
        await this.performGestureAnimation(animation);
        break;
      case 'expression':
        await this.performExpressionAnimation(animation);
        break;
    }

    // Continue with next animation
    this.processQueue();
  },

  // Perform gesture animation
  async performGestureAnimation(animation) {
    const { gesture, handedness, duration } = animation;
    
    // Get arm element
    const armId = handedness === 'Right' ? 'rightArm' : 'leftArm';
    const arm = this.avatarElement.querySelector(`#${armId}`);
    
    if (!arm) {
      console.warn(`Arm element #${armId} not found`);
      return;
    }

    // Get gesture animation data
    const gestureAnim = this.getGestureAnimation(gesture, handedness);
    
    // Apply animation
    return new Promise(resolve => {
      arm.style.transition = `transform ${duration}ms ease-in-out`;
      arm.style.transform = gestureAnim.transform;

      setTimeout(() => {
        // Reset to neutral
        arm.style.transform = 'none';
        resolve();
      }, duration);
    });
  },

  // Get gesture animation data
  getGestureAnimation(gestureType, handedness) {
    const isRight = handedness === 'Right';
    const multiplier = isRight ? 1 : -1;

    const animations = {
      'FIST': {
        transform: `translate(${30 * multiplier}px, -20px) rotate(${-15 * multiplier}deg)`
      },
      'OPEN_HAND': {
        transform: `translate(${40 * multiplier}px, -30px) rotate(${-20 * multiplier}deg) scale(1.1)`
      },
      'POINTING': {
        transform: `translate(${35 * multiplier}px, -25px) rotate(${-10 * multiplier}deg)`
      },
      'PEACE': {
        transform: `translate(${38 * multiplier}px, -28px) rotate(${-12 * multiplier}deg)`
      },
      'THUMBS_UP': {
        transform: `translate(${25 * multiplier}px, -40px) rotate(${15 * multiplier}deg)`
      },
      'OK': {
        transform: `translate(${32 * multiplier}px, -22px) rotate(${-8 * multiplier}deg)`
      },
      'SWIPE_RIGHT': {
        transform: 'translateX(80px)'
      },
      'SWIPE_LEFT': {
        transform: 'translateX(-80px)'
      }
    };

    return animations[gestureType] || animations['OPEN_HAND'];
  },

  // Perform expression animation
  async performExpressionAnimation(animation) {
    const { mood, duration } = animation;
    
    // Get face elements
    const mouth = this.avatarElement.querySelector('#mouth path');
    const eyes = this.avatarElement.querySelectorAll('#eyes ellipse');
    
    if (!mouth || !eyes) {
      console.warn('Face elements not found');
      return;
    }

    // Get expression data
    const expression = this.getExpressionData(mood);
    
    return new Promise(resolve => {
      // Animate mouth
      mouth.style.transition = `d ${duration}ms ease-in-out`;
      mouth.setAttribute('d', expression.mouth);

      // Animate eyes
      eyes.forEach(eye => {
        eye.style.transition = `ry ${duration}ms ease-in-out`;
        eye.setAttribute('ry', expression.eyeHeight);
      });

      setTimeout(() => {
        // Reset to neutral
        mouth.setAttribute('d', 'M 130 155 Q 150 160 170 155');
        eyes.forEach(eye => {
          eye.setAttribute('ry', '12');
        });
        resolve();
      }, duration);
    });
  },

  // Get expression data
  getExpressionData(mood) {
    const expressions = {
      happy: {
        mouth: 'M 130 155 Q 150 170 170 155',
        eyeHeight: '10'
      },
      sad: {
        mouth: 'M 130 160 Q 150 150 170 160',
        eyeHeight: '10'
      },
      surprised: {
        mouth: 'M 140 155 Q 150 165 160 155',
        eyeHeight: '16'
      },
      angry: {
        mouth: 'M 135 158 L 165 158',
        eyeHeight: '8'
      },
      neutral: {
        mouth: 'M 130 155 Q 150 160 170 155',
        eyeHeight: '12'
      }
    };

    return expressions[mood] || expressions.neutral;
  },

  // Animate sign sequence
  async animateSignSequence(signs, onComplete) {
    for (const sign of signs) {
      await this.animateGesture(sign.gesture, 'Right', 1000);
      await this.delay(500); // Pause between signs
    }

    if (onComplete) onComplete();
  },

  // Delay helper
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // Wave animation
  async wave(handedness = 'Right') {
    const waveSequence = [
      { gesture: 'OPEN_HAND', duration: 300 },
      { gesture: 'SWIPE_RIGHT', duration: 200 },
      { gesture: 'SWIPE_LEFT', duration: 200 },
      { gesture: 'SWIPE_RIGHT', duration: 200 },
      { gesture: 'OPEN_HAND', duration: 300 }
    ];

    for (const anim of waveSequence) {
      await this.animateGesture(anim.gesture, handedness, anim.duration);
    }
  },

  // Clap animation
  async clap(times = 3) {
    for (let i = 0; i < times; i++) {
      // Animate both hands together
      this.animateGesture('OPEN_HAND', 'Right', 200);
      this.animateGesture('OPEN_HAND', 'Left', 200);
      await this.delay(250);
    }
  },

  // Nod animation
  async nod(times = 2) {
    const head = this.avatarElement.querySelector('#head');
    if (!head) return;

    for (let i = 0; i < times; i++) {
      head.style.transition = 'transform 300ms ease-in-out';
      head.style.transform = 'translateY(10px)';
      await this.delay(300);
      
      head.style.transform = 'translateY(0)';
      await this.delay(300);
    }
  },

  // Shake head animation
  async shakeHead(times = 2) {
    const head = this.avatarElement.querySelector('#head');
    if (!head) return;

    for (let i = 0; i < times; i++) {
      head.style.transition = 'transform 200ms ease-in-out';
      head.style.transform = 'rotate(-10deg)';
      await this.delay(200);
      
      head.style.transform = 'rotate(10deg)';
      await this.delay(200);
      
      head.style.transform = 'rotate(0deg)';
      await this.delay(200);
    }
  },

  // Idle animation (subtle breathing)
  startIdleAnimation() {
    const body = this.avatarElement.querySelector('#body');
    if (!body) return;

    this.idleInterval = setInterval(() => {
      if (!this.isAnimating) {
        body.style.transition = 'transform 2s ease-in-out';
        body.style.transform = 'scaleY(1.02)';
        
        setTimeout(() => {
          body.style.transform = 'scaleY(1)';
        }, 2000);
      }
    }, 4000);
  },

  stopIdleAnimation() {
    if (this.idleInterval) {
      clearInterval(this.idleInterval);
      this.idleInterval = null;
    }
  },

  // Update animation speed
  setAnimationSpeed(speed) {
    this.animationSpeed = Math.max(0.1, Math.min(speed, 3.0));
  },

  // Clear animation queue
  clearQueue() {
    this.animationQueue = [];
  },

  // Get animation state
  getState() {
    return {
      isAnimating: this.isAnimating,
      queueLength: this.animationQueue.length,
      currentAnimation: this.currentAnimation,
      speed: this.animationSpeed
    };
  },

  // Cleanup
  cleanup() {
    this.clearQueue();
    this.stopIdleAnimation();
    this.avatarElement = null;
    this.isAnimating = false;
  }
};