// js/avatar-manager.js - Avatar Customization & Management

const AvatarManager = {
  currentConfig: null,
  defaultConfig: {
    bodyType: 'default',
    skinColor: '#F4C2A0',
    hairStyle: 'short',
    hairColor: '#2C1B18',
    outfitType: 'casual',
    outfitColor: '#4F46E5',
    accessory: 'none',
    accessoryColor: '#000000'
  },

  bodyTypes: ['slim', 'default', 'athletic', 'plus'],
  hairStyles: ['short', 'medium', 'long', 'curly', 'bald', 'ponytail'],
  outfitTypes: ['casual', 'formal', 'sporty', 'traditional'],
  accessories: ['none', 'glasses', 'hat', 'earrings', 'necklace'],

  // Initialize avatar
  async init(userId) {
    try {
      const saved = await StorageManager.getAvatar(userId);
      
      if (saved && saved.config) {
        this.currentConfig = saved.config;
      } else {
        this.currentConfig = { ...this.defaultConfig };
      }

      return this.currentConfig;
    } catch (error) {
      console.error('Failed to initialize avatar:', error);
      this.currentConfig = { ...this.defaultConfig };
      return this.currentConfig;
    }
  },

  // Get current configuration
  getConfig() {
    return { ...this.currentConfig };
  },

  // Update avatar configuration
  async updateConfig(updates, userId) {
    this.currentConfig = { ...this.currentConfig, ...updates };
    
    try {
      await StorageManager.saveAvatar(userId, this.currentConfig);
      return this.currentConfig;
    } catch (error) {
      console.error('Failed to save avatar:', error);
      throw error;
    }
  },

  // Update specific property
  async updateProperty(property, value, userId) {
    return this.updateConfig({ [property]: value }, userId);
  },

  // Reset to default
  async resetToDefault(userId) {
    this.currentConfig = { ...this.defaultConfig };
    await StorageManager.saveAvatar(userId, this.currentConfig);
    return this.currentConfig;
  },

  // Generate SVG avatar
  generateAvatarSVG(config = this.currentConfig, size = 300) {
    const c = config;
    
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg">
        <!-- Body -->
        <g id="body">
          ${this.generateBody(c)}
        </g>
        
        <!-- Head -->
        <g id="head">
          <ellipse cx="150" cy="120" rx="70" ry="85" fill="${c.skinColor}" stroke="#000" stroke-width="2"/>
        </g>
        
        <!-- Hair -->
        <g id="hair">
          ${this.generateHair(c)}
        </g>
        
        <!-- Eyes -->
        <g id="eyes">
          <ellipse cx="125" cy="110" rx="8" ry="12" fill="#000"/>
          <ellipse cx="175" cy="110" rx="8" ry="12" fill="#000"/>
          <ellipse cx="127" cy="108" rx="3" ry="4" fill="#FFF"/>
          <ellipse cx="177" cy="108" rx="3" ry="4" fill="#FFF"/>
        </g>
        
        <!-- Nose -->
        <g id="nose">
          <path d="M 150 130 Q 145 135 150 140" stroke="#000" fill="none" stroke-width="1.5"/>
        </g>
        
        <!-- Mouth -->
        <g id="mouth">
          <path d="M 130 155 Q 150 160 170 155" stroke="#000" fill="none" stroke-width="2" stroke-linecap="round"/>
        </g>
        
        <!-- Outfit -->
        <g id="outfit">
          ${this.generateOutfit(c)}
        </g>
        
        <!-- Accessory -->
        <g id="accessory">
          ${this.generateAccessory(c)}
        </g>
      </svg>
    `;
  },

  // Generate body based on type
  generateBody(config) {
    const bodyShapes = {
      slim: `
        <path d="M 150 200 L 120 250 L 120 350 L 130 400 M 150 200 L 180 250 L 180 350 L 170 400" 
              stroke="#000" fill="none" stroke-width="15" stroke-linecap="round"/>
        <ellipse cx="150" cy="260" rx="40" ry="60" fill="${config.skinColor}" stroke="#000" stroke-width="2"/>
      `,
      default: `
        <path d="M 150 200 L 115 250 L 115 350 L 125 400 M 150 200 L 185 250 L 185 350 L 175 400" 
              stroke="#000" fill="none" stroke-width="18" stroke-linecap="round"/>
        <ellipse cx="150" cy="260" rx="50" ry="65" fill="${config.skinColor}" stroke="#000" stroke-width="2"/>
      `,
      athletic: `
        <path d="M 150 200 L 110 250 L 110 350 L 120 400 M 150 200 L 190 250 L 190 350 L 180 400" 
              stroke="#000" fill="none" stroke-width="20" stroke-linecap="round"/>
        <ellipse cx="150" cy="260" rx="55" ry="70" fill="${config.skinColor}" stroke="#000" stroke-width="2"/>
      `,
      plus: `
        <path d="M 150 200 L 110 250 L 110 350 L 120 400 M 150 200 L 190 250 L 190 350 L 180 400" 
              stroke="#000" fill="none" stroke-width="22" stroke-linecap="round"/>
        <ellipse cx="150" cy="260" rx="60" ry="75" fill="${config.skinColor}" stroke="#000" stroke-width="2"/>
      `
    };

    return bodyShapes[config.bodyType] || bodyShapes.default;
  },

  // Generate hair based on style
  generateHair(config) {
    const hairStyles = {
      short: `
        <path d="M 80 120 Q 80 50 150 50 Q 220 50 220 120" fill="${config.hairColor}" stroke="#000" stroke-width="2"/>
      `,
      medium: `
        <path d="M 75 120 Q 75 40 150 40 Q 225 40 225 120 L 225 140 Q 150 145 75 140 Z" 
              fill="${config.hairColor}" stroke="#000" stroke-width="2"/>
      `,
      long: `
        <path d="M 70 120 Q 70 35 150 35 Q 230 35 230 120 L 230 180 Q 150 185 70 180 Z" 
              fill="${config.hairColor}" stroke="#000" stroke-width="2"/>
      `,
      curly: `
        <circle cx="100" cy="80" r="25" fill="${config.hairColor}" stroke="#000" stroke-width="1"/>
        <circle cx="130" cy="60" r="25" fill="${config.hairColor}" stroke="#000" stroke-width="1"/>
        <circle cx="150" cy="55" r="25" fill="${config.hairColor}" stroke="#000" stroke-width="1"/>
        <circle cx="170" cy="60" r="25" fill="${config.hairColor}" stroke="#000" stroke-width="1"/>
        <circle cx="200" cy="80" r="25" fill="${config.hairColor}" stroke="#000" stroke-width="1"/>
      `,
      bald: '',
      ponytail: `
        <path d="M 80 120 Q 80 50 150 50 Q 220 50 220 120" fill="${config.hairColor}" stroke="#000" stroke-width="2"/>
        <ellipse cx="220" cy="120" rx="20" ry="50" fill="${config.hairColor}" stroke="#000" stroke-width="2"/>
      `
    };

    return hairStyles[config.hairStyle] || hairStyles.short;
  },

  // Generate outfit
  generateOutfit(config) {
    const outfits = {
      casual: `
        <rect x="100" y="200" width="100" height="120" fill="${config.outfitColor}" 
              stroke="#000" stroke-width="2" rx="10"/>
        <line x1="100" y1="200" x2="100" y2="320" stroke="#000" stroke-width="2"/>
        <line x1="200" y1="200" x2="200" y2="320" stroke="#000" stroke-width="2"/>
      `,
      formal: `
        <path d="M 100 200 L 100 320 L 200 320 L 200 200 Z" fill="${config.outfitColor}" 
              stroke="#000" stroke-width="2"/>
        <path d="M 150 200 L 130 240 L 150 280 L 170 240 Z" fill="#FFF" stroke="#000" stroke-width="1"/>
        <rect x="145" y="200" width="10" height="25" fill="#000"/>
      `,
      sporty: `
        <path d="M 95 200 L 95 320 L 205 320 L 205 200 Z" fill="${config.outfitColor}" 
              stroke="#000" stroke-width="2"/>
        <path d="M 120 220 L 180 220 L 180 300 L 120 300 Z" fill="#FFF" opacity="0.3"/>
      `,
      traditional: `
        <path d="M 90 200 Q 150 210 210 200 L 210 330 Q 150 320 90 330 Z" 
              fill="${config.outfitColor}" stroke="#000" stroke-width="2"/>
        <path d="M 120 230 L 180 230" stroke="#FFD700" stroke-width="3"/>
      `
    };

    return outfits[config.outfitType] || outfits.casual;
  },

  // Generate accessory
  generateAccessory(config) {
    const accessories = {
      none: '',
      glasses: `
        <rect x="105" y="105" width="35" height="25" fill="none" stroke="#000" stroke-width="2" rx="5"/>
        <rect x="160" y="105" width="35" height="25" fill="none" stroke="#000" stroke-width="2" rx="5"/>
        <line x1="140" y1="117" x2="160" y2="117" stroke="#000" stroke-width="2"/>
      `,
      hat: `
        <ellipse cx="150" cy="60" rx="80" ry="15" fill="${config.accessoryColor}" stroke="#000" stroke-width="2"/>
        <path d="M 120 60 Q 150 30 180 60" fill="${config.accessoryColor}" stroke="#000" stroke-width="2"/>
      `,
      earrings: `
        <circle cx="85" cy="130" r="6" fill="${config.accessoryColor}" stroke="#000" stroke-width="1"/>
        <circle cx="215" cy="130" r="6" fill="${config.accessoryColor}" stroke="#000" stroke-width="1"/>
      `,
      necklace: `
        <path d="M 110 195 Q 150 205 190 195" stroke="${config.accessoryColor}" 
              stroke-width="3" fill="none" stroke-linecap="round"/>
        <circle cx="150" cy="205" r="8" fill="${config.accessoryColor}" stroke="#000" stroke-width="1"/>
      `
    };

    return accessories[config.accessory] || accessories.none;
  },

  // Render avatar to element
  renderToElement(element, config = this.currentConfig, size = 300) {
    element.innerHTML = this.generateAvatarSVG(config, size);
  },

  // Get avatar as data URL
  getAvatarDataURL(config = this.currentConfig, size = 300) {
    const svg = this.generateAvatarSVG(config, size);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    return URL.createObjectURL(blob);
  },

  // Export avatar
  async exportAvatar(format = 'svg', size = 300) {
    const svg = this.generateAvatarSVG(this.currentConfig, size);
    
    if (format === 'svg') {
      Utils.downloadFile(svg, `avatar-${Date.now()}.svg`, 'image/svg+xml');
    } else if (format === 'png') {
      // Convert SVG to PNG
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size * (4/3); // Maintain aspect ratio
      
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(blob => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `avatar-${Date.now()}.png`;
          a.click();
          URL.revokeObjectURL(url);
        });
      };
      
      const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      img.src = URL.createObjectURL(svgBlob);
    }
  },

  // Get all available options
  getAvailableOptions() {
    return {
      bodyTypes: this.bodyTypes,
      hairStyles: this.hairStyles,
      outfitTypes: this.outfitTypes,
      accessories: this.accessories,
      skinColors: ['#F4C2A0', '#E4A876', '#D1915E', '#B87850', '#8B5A3C', '#5D3A1A'],
      hairColors: ['#2C1B18', '#5C3317', '#8B4513', '#DAA520', '#FFD700', '#FF0000', '#0000FF'],
      outfitColors: ['#4F46E5', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899']
    };
  }
};