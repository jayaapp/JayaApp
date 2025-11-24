/**
 * Background image functionality for JayaApp
 * Implements sophisticated mosaic tiling system for ornamented backgrounds
 */

class OrnamentedBackground {
    constructor() {
        // Set defaults for first-time users
        const defaultEnabled = localStorage.getItem('ornamentedBackgroundEnabled') === null ? true : localStorage.getItem('ornamentedBackgroundEnabled') === 'true';
        const defaultOpacity = localStorage.getItem('backgroundOpacity') === null ? 0.5 : parseFloat(localStorage.getItem('backgroundOpacity'));
        const defaultZoom = localStorage.getItem('backgroundZoom') === null ? 100 : parseFloat(localStorage.getItem('backgroundZoom'));
        
        this.settings = {
            enabled: defaultEnabled,
            opacity: defaultOpacity,
            zoom: defaultZoom
        };
        
        this.backgroundImageUrl = 'assets/background.png';
        this.imageCache = null;
        this.tileCache = new Map();
        this.isUpdating = false; // Prevent recursive updates
        this.panelIds = ['text-panel-horizontal', 'text-panel-vertical', 'chat-panel-horizontal', 'chat-panel-vertical'];
        
        this.init();
    }
    
    async init() {
        // Load and cache the background image
        await this.loadBackgroundImage();
        
        // Apply initial background if enabled
        if (this.settings.enabled) {
            this.applyBackgroundToAllPanels();
        }
        
        // Set up event listeners
        this.setupEventListeners();
    }
    
    async loadBackgroundImage() {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.imageCache = {
                    element: img,
                    width: img.naturalWidth,
                    height: img.naturalHeight
                };
                resolve();
            };
            img.onerror = reject;
            img.src = this.backgroundImageUrl;
        });
    }
    
    setupEventListeners() {
        // Listen for content changes
        document.addEventListener('versesRendered', () => {
            if (this.settings.enabled) {
                this.applyBackgroundToAllPanels();
            }
        });
        
        // Listen for window resize
        window.addEventListener('resize', () => {
            if (this.settings.enabled) {
                // Debounce resize events
                clearTimeout(this.resizeTimeout);
                this.resizeTimeout = setTimeout(() => {
                    this.applyBackgroundToAllPanels();
                }, 250);
            }
        });
        
        // Listen for settings changes
        document.addEventListener('backgroundSettingsChanged', (event) => {
            this.updateSettings(event.detail);
        });
        
        // Listen for view changes
        document.addEventListener('viewSettingsChanged', () => {
            if (this.settings.enabled) {
                // Small delay to ensure layout is updated
                setTimeout(() => {
                    this.applyBackgroundToAllPanels();
                }, 100);
            }
        });
        
        // Listen for theme changes - lightweight approach
        document.addEventListener('themeChanged', () => {
            if (this.settings.enabled) {
                // Just update opacity overlays without full regeneration
                this.updateBackgroundOpacity();
            }
        });
    }
    
    updateSettings(newSettings) {
        const changed = {
            enabled: newSettings.enabled !== this.settings.enabled,
            opacity: newSettings.opacity !== this.settings.opacity,
            zoom: newSettings.zoom !== this.settings.zoom
        };
        
        this.settings = { ...newSettings };
        
        // Save to localStorage
        localStorage.setItem('ornamentedBackgroundEnabled', this.settings.enabled);
        localStorage.setItem('backgroundOpacity', this.settings.opacity);
        localStorage.setItem('backgroundZoom', this.settings.zoom);
        
        // Apply or remove backgrounds
        if (changed.enabled) {
            if (this.settings.enabled) {
                this.applyBackgroundToAllPanels();
            } else {
                this.removeBackgroundFromAllPanels();
            }
        } else if (this.settings.enabled) {
            if (changed.zoom) {
                // Clear cache and regenerate for zoom changes
                this.tileCache.clear();
                this.applyBackgroundToAllPanels();
            } else if (changed.opacity) {
                // For opacity, just update the overlays
                this.updateBackgroundOpacity();
            }
        }
    }
    
    updateBackgroundOpacity() {
        if (this.isUpdating) return; // Prevent recursive calls
        
        this.isUpdating = true;
        
        try {
            this.panelIds.forEach(panelId => {
                const panel = document.getElementById(panelId);
                if (panel && panel.classList.contains('ornamented-background')) {
                    this.applyBackgroundOpacityToPanel(panel);
                }
            });
        } catch (error) {
            // Silent error handling
        } finally {
            this.isUpdating = false;
        }
    }
    
    applyBackgroundOpacityToPanel(panel) {
        // Prefer the stored tiled image (avoids parsing CSS text)
        const tiled = panel.dataset._tiledImage;
        if (tiled) {
            const opacityValue = this.settings.opacity;
            const overlayOpacity = 1 - opacityValue; // Invert for overlay effect
            const isDarkTheme = document.body.classList.contains('dark-theme');
            const overlayColor = isDarkTheme ? '0, 0, 0' : '255, 255, 255';
            const overlayGradient = `linear-gradient(rgba(${overlayColor}, ${overlayOpacity}), rgba(${overlayColor}, ${overlayOpacity}))`;
            panel.style.backgroundImage = `${overlayGradient}, ${tiled}`;
        } else {
            // Fallback: attempt to adjust existing background image (best-effort)
            const currentBgImage = panel.style.backgroundImage;
            if (currentBgImage && currentBgImage !== 'none' && currentBgImage !== '') {
                if (currentBgImage.includes('url(')) {
                    const imageUrlsPart = currentBgImage.substring(currentBgImage.indexOf('url('));
                    const opacityValue = this.settings.opacity;
                    const overlayOpacity = 1 - opacityValue;
                    const isDarkTheme = document.body.classList.contains('dark-theme');
                    const overlayColor = isDarkTheme ? '0, 0, 0' : '255, 255, 255';
                    const overlayGradient = `linear-gradient(rgba(${overlayColor}, ${overlayOpacity}), rgba(${overlayColor}, ${overlayOpacity}))`;
                    panel.style.backgroundImage = `${overlayGradient}, ${imageUrlsPart}`;
                }
            }
        }
    }
    
    applyBackgroundToAllPanels() {
        if (!this.imageCache || this.isUpdating) return;
        
        this.isUpdating = true;
        
        try {
            this.panelIds.forEach(panelId => {
                const panel = document.getElementById(panelId);
                if (panel && panel.style.display !== 'none') {
                    this.applyTiledBackground(panel);
                }
            });
        } catch (error) {
            // Silent error handling
        } finally {
            this.isUpdating = false;
        }
    }
    
    removeBackgroundFromAllPanels() {
        this.panelIds.forEach(panelId => {
            const panel = document.getElementById(panelId);
            if (panel) {
                panel.style.backgroundImage = '';
                panel.style.backgroundSize = '';
                panel.style.backgroundPosition = '';
                panel.style.backgroundRepeat = '';
                panel.style.backgroundAttachment = '';
                panel.classList.remove('ornamented-background');
                delete panel.dataset._tiledImage;
            }
        });
    }
    
    applyTiledBackground(panel) {
        if (!this.imageCache) return;
        
        // Add class for styling
        panel.classList.add('ornamented-background');
        
        const panelRect = panel.getBoundingClientRect();
        const scrollHeight = Math.max(panel.scrollHeight, panel.clientHeight);
        
        // Calculate scaled image dimensions based on zoom
        const zoomFactor = this.settings.zoom / 100;
        const scaledImageWidth = panelRect.width * zoomFactor;
        const scaledImageHeight = (this.imageCache.height / this.imageCache.width) * scaledImageWidth;
        
        // Generate cache key
        const cacheKey = `${panel.id}-${panelRect.width}-${scrollHeight}-${this.settings.zoom}`;
        
        let backgroundStyles;
        if (this.tileCache.has(cacheKey)) {
            backgroundStyles = this.tileCache.get(cacheKey);
        } else {
            backgroundStyles = this.generateTiledBackground(
                panelRect.width,
                scrollHeight,
                scaledImageWidth,
                scaledImageHeight
            );
            this.tileCache.set(cacheKey, backgroundStyles);
        }
        
        // Apply the background styles with opacity overlay
        const opacityValue = this.settings.opacity;
        const overlayOpacity = 1 - opacityValue;
        
        // Create overlay gradient based on theme
        const isDarkTheme = document.body.classList.contains('dark-theme');
        const overlayColor = isDarkTheme ? '0, 0, 0' : '255, 255, 255';
        const overlayGradient = `linear-gradient(rgba(${overlayColor}, ${overlayOpacity}), rgba(${overlayColor}, ${overlayOpacity}))`;
        
        // Store the tiled-image-only string on the element so we can reapply overlays later without parsing
        panel.dataset._tiledImage = backgroundStyles.backgroundImage;

        // Combine overlay with tiled background and apply
        const combinedBackgroundImage = `${overlayGradient}, ${backgroundStyles.backgroundImage}`;
        panel.style.backgroundImage = combinedBackgroundImage;
        panel.style.backgroundSize = `auto, ${backgroundStyles.backgroundSize}`;
        panel.style.backgroundPosition = `0 0, ${backgroundStyles.backgroundPosition}`;
        panel.style.backgroundRepeat = 'no-repeat';
        panel.style.backgroundAttachment = 'local';
    }
    
    generateTiledBackground(panelWidth, panelHeight, scaledImageWidth, scaledImageHeight) {
        const images = [];
        const sizes = [];
        const positions = [];
        
        const OVERLAP = 0.1; // 10% overlap
        const IMW = scaledImageWidth;
        const IMH = scaledImageHeight;
        
        let X = 0, Y = 0;
        let Y_next = [];
        
        while (Y < panelHeight) {
            // Select random crop coordinates within overlap region
            const x = Math.random() * OVERLAP * IMW; // crop from left
            const y = Math.random() * OVERLAP * IMH; // crop from top
            
            // Place tile at panel position (X, Y)
            const imageUrl = this.backgroundImageUrl;
            images.push(`url(${imageUrl})`);
            sizes.push(`${IMW}px ${IMH}px`);
            positions.push(`${X - x}px ${Y - y}px`);
            
            // Advance X by visible width
            X = X + (IMW - x);
            
            // Track next row position for this column
            Y_next.push(Y + (IMH - y));
            
            // Check if we need to move to next row
            if (X >= panelWidth) {
                // Move to next row
                Y = Math.min(...Y_next);
                X = 0;
                Y_next = []; // Clear the array
            }
        }
        
        return {
            backgroundImage: images.join(', '),
            backgroundSize: sizes.join(', '),
            backgroundPosition: positions.join(', ')
        };
    }
    
    // Public API methods
    enable() {
        this.updateSettings({ ...this.settings, enabled: true });
    }
    
    disable() {
        this.updateSettings({ ...this.settings, enabled: false });
    }
    
    setOpacity(opacity) {
        this.updateSettings({ ...this.settings, opacity: Math.max(0, Math.min(1, opacity)) });
    }
    
    setZoom(zoom) {
        this.updateSettings({ ...this.settings, zoom: Math.max(10, Math.min(200, zoom)) });
    }
    
    isEnabled() {
        return this.settings.enabled;
    }
    
    getSettings() {
        return { ...this.settings };
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.ornamentedBackground = new OrnamentedBackground();
});