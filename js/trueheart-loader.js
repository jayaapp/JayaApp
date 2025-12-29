/**
 * TrueHeart Loader
 * Initializes the TrueHeart UI in the settings panel and provides cloud sync
 * and user account features for the application.
 */

function initTrueHeartLoader() {
    console.log('🔷 TrueHeart Loader: Initializing...');

    // Find the sync placeholder in settings panel
    const syncContainer = document.getElementById('sync-placeholder');
    
    if (!syncContainer) {
        console.warn('🔷 TrueHeart: sync-placeholder not found in settings panel');
        return;
    }

    if (!window.trueheartUser) {
        console.error('🔷 TrueHeart: API failed to initialize');
        syncContainer.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #c62828;">
                <p>⚠️ Cloud Sync Unavailable</p>
                <p style="font-size: 12px;">Please refresh the page or check your connection.</p>
            </div>
        `;
        return;
    }

    // Create TrueHeart UI
    try {
        window.trueheartUI = new TrueHeartUI(syncContainer);
        console.log('✅ TrueHeart UI initialized successfully');

        // Apply localization to TrueHeart UI elements
        if (typeof applyLocalization === 'function') {
            applyLocalization();
        }

        // Listen for locale changes to re-apply localization
        document.addEventListener('localeChanged', () => {
            if (typeof applyTrueHeartLocalization === 'function') {
                applyTrueHeartLocalization();
            }
        });

        // Listen for sync complete events to refresh UI components
        window.addEventListener('trueheart-sync-complete', () => {
            console.log('✅ TrueHeart sync completed, refreshing data...');
            
            // Trigger any necessary UI refreshes
            // For example, reload bookmarks, notes, etc.
            if (typeof window.loadBookmarks === 'function') {
                window.loadBookmarks();
            }
            if (typeof window.loadNotes === 'function') {
                window.loadNotes();
            }
            if (typeof window.loadPrompts === 'function') {
                window.loadPrompts();
            }
        });

    } catch (error) {
        console.error('🔷 TrueHeart UI initialization error:', error);
        syncContainer.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #c62828;">
                <p>⚠️ Error loading Cloud Sync</p>
                <p style="font-size: 12px;">${error.message}</p>
            </div>
        `;
    }
}