/**
 * Google Drive Sync UI Module
 * Self-contained UI components for sync functionality
 */

class GoogleSyncUI {
    constructor(container, syncManager) {
        this.container = container;
        this.syncManager = syncManager;
        this.button = null;
        this.currentState = 'initializing';

        this.init();
    }

    /**
     * Initialize the sync UI
     */
    init() {
        this.createUI();
        this.attachEventListeners();
        this.setState('initializing');
    }

    /**
     * Create the UI elements
     */
    createUI() {
        this.container.innerHTML = `
            <div class="sync-section">
                <button id="sync-main-btn" class="sync-main-btn" disabled>
                    <span class="sync-btn-icon">
                        <span class="material-symbols-outlined">cloud_off</span>
                    </span>
                    <span class="sync-btn-text">Initializing...</span>
                </button>
                <div id="last-sync-info" class="sync-info" hidden></div>
            </div>
        `;

        this.button = this.container.querySelector('#sync-main-btn');
        this.lastSyncInfo = this.container.querySelector('#last-sync-info');
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        this.button.addEventListener('click', () => {
            this.handleButtonClick();
        });
    }

    /**
     * Handle button click based on current state
     */
    async handleButtonClick() {
        if (this.button.disabled) return;

        try {
            switch (this.currentState) {
                case 'ready':
                    this.setState('connecting');
                    await this.syncManager.authenticate();
                    break;

                case 'connected':
                    this.setState('syncing');
                    await this.performSync();
                    break;

                case 'disconnected':
                    this.setState('connecting');
                    await this.syncManager.authenticate();
                    break;

                case 'error':
                    // Retry initialization/connection
                    this.setState('connecting');
                    await this.syncManager.authenticate();
                    break;
            }
        } catch (error) {
            console.error('Sync action failed:', error);
            this.showError(error.message);

            // Reset to appropriate state
            if (this.syncManager.isAuthenticated) {
                this.setState('connected');
            } else {
                this.setState('ready');
            }
        }
    }

    /**
     * Perform complete sync with deletion event processing and cleanup
     */
    async performCompleteSync() {
        try {
            const deviceId = this.getDeviceId();

            // Collect local data - JayaApp structure
            const localData = {
                bookmarks: JSON.parse(localStorage.getItem('bookmarks') || '{}'),
                notes: JSON.parse(localStorage.getItem('jayaapp_notes') || '{}'),
                editedVerses: JSON.parse(localStorage.getItem('editedVerses') || '{}')
            };

            const localBookmarkCount = Object.keys(localData.bookmarks).length;
            const localNoteCount = Object.keys(localData.notes).length;
            const localEditedCount = Object.keys(localData.editedVerses).length;

            // Get current remote state
            const remoteData = await this.syncManager.download() || {
                bookmarks: {},
                notes: {},
                editedVerses: {},
                deletionEvents: [],
                syncVersion: 0,
                participatingDevices: []
            };


            // Get pending local deletion events
            const pendingDeletions = this.getPendingDeletionEvents();

            // Combine remote and pending deletion events
            const allDeletionEvents = [...(remoteData.deletionEvents || []), ...pendingDeletions];

            // Clean up old deletion events (older than retention period)
            const cleanDeletionEvents = this.cleanupOldDeletionEvents(allDeletionEvents);

            // Apply deletion events to both local and remote data
            const localResult = this.applyDeletionEvents(localData, cleanDeletionEvents);
            const remoteResult = this.applyDeletionEvents(remoteData, cleanDeletionEvents);

            const cleanedLocalData = localResult.cleaned;
            const cleanedRemoteData = remoteResult.cleaned;

            // Combine deleted items from both local and remote (for comprehensive tracking)
            const allDeletedItems = {
                bookmarks: [...localResult.deletedItems.bookmarks, ...remoteResult.deletedItems.bookmarks],
                notes: [...localResult.deletedItems.notes, ...remoteResult.deletedItems.notes]
            };

            // Merge cleaned data
            const mergedData = this.mergeData(cleanedLocalData, cleanedRemoteData, deviceId, cleanDeletionEvents);

            // Upload merged state
            await this.syncManager.upload(mergedData);

            // Log meaningful sync changes when enabled
            if (ENABLE_SYNC_LOGGING) {
                const finalBookmarkCount = Object.keys(mergedData.bookmarks).length;
                const finalNoteCount = Object.keys(mergedData.notes).length;
                const finalEditedCount = Object.keys(mergedData.editedVerses).length;
                const remoteBookmarkCount = Object.keys(remoteData.bookmarks).length;
                const remoteNoteCount = Object.keys(remoteData.notes).length;
                const remoteEditedCount = Object.keys(remoteData.editedVerses || {}).length;

                const bookmarkDiff = finalBookmarkCount - localBookmarkCount;
                const noteDiff = finalNoteCount - localNoteCount;
                const editedDiff = finalEditedCount - localEditedCount;
                const deletionEventsApplied = (remoteData.deletionEvents?.length || 0) + pendingDeletions.length - cleanDeletionEvents.length;

                if (bookmarkDiff !== 0 || noteDiff !== 0 || editedDiff !== 0 || deletionEventsApplied > 0) {
                    console.log('🔄 SYNC: State changes detected');
                    console.log('📊 Local → Final: bookmarks', localBookmarkCount, '→', finalBookmarkCount, `(${bookmarkDiff > 0 ? '+' : ''}${bookmarkDiff})`);
                    console.log('📊 Local → Final: notes', localNoteCount, '→', finalNoteCount, `(${noteDiff > 0 ? '+' : ''}${noteDiff})`);
                    console.log('📊 Local → Final: edited verses', localEditedCount, '→', finalEditedCount, `(${editedDiff > 0 ? '+' : ''}${editedDiff})`);
                    console.log('📊 Remote → Final: bookmarks', remoteBookmarkCount, '→', finalBookmarkCount);
                    console.log('📊 Remote → Final: notes', remoteNoteCount, '→', finalNoteCount);
                    console.log('📊 Remote → Final: edited verses', remoteEditedCount, '→', finalEditedCount);
                    if (deletionEventsApplied > 0) {
                        console.log('🗑️ Deletion events processed:', deletionEventsApplied);
                    }
                }
            }

            // Apply merged data back to localStorage
            const finalBookmarkCount = Object.values(mergedData.bookmarks).reduce((total, bookmarks) => total + bookmarks.length, 0);
            const finalNoteCount = Object.values(mergedData.notes).reduce((total, notes) => total + notes.length, 0);

            this.updateLocalStorage(mergedData);
            this.refreshUI(mergedData, allDeletedItems);

            // Update sync timestamp
            localStorage.setItem('last-sync-time', new Date().toISOString());
            this.showLastSyncTime();

        } catch (error) {
            console.error('🔄 SYNC: Failed:', error);
            throw error;
        }
    }

    /**
     * Legacy method for manual sync button - delegates to complete sync
     */
    async performSync() {
        this.setState('syncing');
        try {
            await this.performCompleteSync();
            this.showNotification('Sync completed successfully');
            this.setState('connected');
        } catch (error) {
            this.setState('error');
            throw error;
        }
    }

    /**
     * Collect reading positions from localStorage
     */
    /**
     * Generate or retrieve device ID
     */
    getDeviceId() {
        let deviceId = localStorage.getItem('jayaapp-device-id');
        if (!deviceId) {
            // Generate unique device ID
            const timestamp = Date.now();
            const random = Math.random().toString(36).substr(2, 9);
            const platform = navigator.platform.replace(/\s+/g, '-').toLowerCase();
            deviceId = `${platform}-${timestamp}-${random}`;
            localStorage.setItem('jayaapp-device-id', deviceId);
        }
        return deviceId;
    }

    /**
     * Clean up old deletion events (older than retention period)
     */
    cleanupOldDeletionEvents(deletionEvents) {
        const cutoffTime = Date.now() - DELETE_EVENT_RETENTION;
        const cleaned = deletionEvents.filter(event => {
            const eventTime = new Date(event.deletedAt).getTime();
            return eventTime > cutoffTime;
        });

        if (cleaned.length < deletionEvents.length) {
        }

        return cleaned;
    }

    /**
     * Apply deletion events to data
     */
    applyDeletionEvents(data, deletionEvents) {
        const cleaned = JSON.parse(JSON.stringify(data)); // Deep copy
        let deletionsApplied = 0;
        const deletedItems = { bookmarks: [], notes: [], editedVerses: [] }; // Track what gets deleted

        deletionEvents.forEach(event => {
            const { id, type } = event;

            if (type === 'note') {
                // JayaApp uses flat object structure for notes
                if (cleaned.notes && cleaned.notes[id]) {
                    delete cleaned.notes[id];
                    deletionsApplied++;
                    deletedItems.notes.push({ id });
                }
            } else if (type === 'bookmark') {
                // JayaApp uses flat object structure for bookmarks
                if (cleaned.bookmarks && cleaned.bookmarks[id]) {
                    delete cleaned.bookmarks[id];
                    deletionsApplied++;
                    deletedItems.bookmarks.push({ id });
                }
            } else if (type === 'editedVerse') {
                // JayaApp uses flat object structure for edited verses
                if (cleaned.editedVerses && cleaned.editedVerses[id]) {
                    delete cleaned.editedVerses[id];
                    deletionsApplied++;
                    deletedItems.editedVerses.push({ id });
                }
            }
        });

        if (deletionsApplied > 0) {
        }

        return { cleaned, deletedItems };
    }

    /**
     * Merge local and remote data with conflict resolution
     */
    mergeData(localData, remoteData, deviceId, cleanDeletionEvents) {
        const merged = {
            bookmarks: this.mergeByType(localData.bookmarks || {}, remoteData.bookmarks || {}),
            notes: this.mergeByType(localData.notes || {}, remoteData.notes || {}),
            editedVerses: this.mergeByType(localData.editedVerses || {}, remoteData.editedVerses || {}),

            // Sync metadata with cleaned deletion events
            deletionEvents: cleanDeletionEvents,
            syncVersion: (remoteData.syncVersion || 0) + 1,
            lastModified: new Date().toISOString(),
            participatingDevices: this.updateParticipatingDevices(remoteData.participatingDevices || [], deviceId),

            // Legacy timestamp for backward compatibility
            timestamp: new Date().toISOString()
        };

        return merged;
    }

    /**
     * Update localStorage with merged data
     */
    updateLocalStorage(mergedData) {
        localStorage.setItem('bookmarks', JSON.stringify(mergedData.bookmarks));
        localStorage.setItem('jayaapp_notes', JSON.stringify(mergedData.notes));
        localStorage.setItem('editedVerses', JSON.stringify(mergedData.editedVerses));
    }

    /**
     * Refresh UI with merged data
     */
    refreshUI(mergedData, deletedItems = { bookmarks: [], notes: [], editedVerses: [] }) {
        // Trigger custom event that the app listens to
        window.dispatchEvent(new CustomEvent('syncDataUpdated', {
            detail: {
                bookmarks: mergedData.bookmarks,
                notes: mergedData.notes,
                editedVerses: mergedData.editedVerses,
                readingPositions: mergedData.readingPositions,
                deletedItems: deletedItems
            }
        }));
    }

    /**
     * Merge items by type (notes or bookmarks)
     */
    mergeByType(localItems, remoteItems) {
        // JayaApp uses flat object structure: { "key": {data...}, "key2": {data...} }
        // Merge with timestamp-based conflict resolution (most recent wins)
        const merged = { ...remoteItems };

        Object.keys(localItems).forEach(key => {
            const localItem = localItems[key];
            const remoteItem = remoteItems[key];

            if (!remoteItem) {
                // Item only exists locally, add it
                merged[key] = localItem;
            } else {
                // Both exist - use timestamp to decide (most recent wins)
                const localTime = new Date(localItem.timestamp || 0).getTime();
                const remoteTime = new Date(remoteItem.timestamp || 0).getTime();
                
                if (localTime >= remoteTime) {
                    merged[key] = localItem;
                }
                // Otherwise keep remote (already in merged)
            }
        });

        return merged;
    }

    /**
     * Update participating devices list
     */
    updateParticipatingDevices(existingDevices, currentDevice) {
        const devices = new Set(existingDevices);
        devices.add(currentDevice);
        return Array.from(devices);
    }

    /**
     * Add deletion event to local pending deletions
     * Will be processed during next smart sync
     */
    addDeletionEvent(itemId, itemType) {
        const deletionEvent = {
            id: itemId,
            type: itemType,
            deletedAt: new Date().toISOString(),
            deviceId: this.getDeviceId()
        };

        // Store locally - will be uploaded during next smart sync
        const pendingDeletions = JSON.parse(localStorage.getItem('jayaapp-pending-deletions') || '[]');

        // Check for duplicates
        const existingEvent = pendingDeletions.find(event => event.id === itemId && event.type === itemType);
        if (!existingEvent) {
            pendingDeletions.push(deletionEvent);
            localStorage.setItem('jayaapp-pending-deletions', JSON.stringify(pendingDeletions));
        }
    }

    /**
     * Get and process pending local deletion events
     */
    getPendingDeletionEvents() {
        const pendingDeletions = JSON.parse(localStorage.getItem('jayaapp-pending-deletions') || '[]');

        if (pendingDeletions.length > 0) {
            // Clear pending deletions as they'll be uploaded to remote
            localStorage.removeItem('jayaapp-pending-deletions');
        }

        return pendingDeletions;
    }

    /**
     * Set UI state
     */
    setState(state) {
        this.currentState = state;
        this.updateButtonAppearance();
    }

    /**
     * Update button appearance based on state
     */
    updateButtonAppearance() {
        const iconEl = this.button.querySelector('.material-symbols-outlined');
        const textEl = this.button.querySelector('.sync-btn-text');

        this.button.className = 'sync-main-btn'; // Reset classes

        switch (this.currentState) {
            case 'initializing':
                this.button.disabled = true;
                this.button.classList.add('state-initializing');
                iconEl.textContent = 'cloud_off';
                textEl.textContent = 'Initializing...';
                break;

            case 'ready':
                this.button.disabled = false;
                this.button.classList.add('state-ready');
                iconEl.textContent = 'cloud';
                textEl.textContent = 'Connect to Google Drive';
                break;

            case 'connecting':
                this.button.disabled = true;
                this.button.classList.add('state-connecting');
                iconEl.textContent = 'hourglass_empty';
                textEl.textContent = 'Connecting...';
                break;

            case 'connected':
                this.button.disabled = false;
                this.button.classList.add('state-connected');
                iconEl.textContent = 'cloud_done';
                textEl.textContent = 'Connected - Click to Sync';
                break;

            case 'syncing':
                this.button.disabled = true;
                this.button.classList.add('state-syncing');
                iconEl.textContent = 'sync';
                iconEl.classList.add('spinning');
                textEl.textContent = 'Syncing...';
                break;

            case 'disconnected':
                this.button.disabled = false;
                this.button.classList.add('state-disconnected');
                iconEl.textContent = 'cloud_off';
                textEl.textContent = 'Disconnected - Click to Reconnect';
                break;

            case 'error':
                this.button.disabled = false;
                this.button.classList.add('state-error');
                iconEl.textContent = 'error';
                textEl.textContent = 'Sync Error - Click to Retry';
                break;
        }

        // Remove spinning class when not syncing
        if (this.currentState !== 'syncing') {
            iconEl.classList.remove('spinning');
        }
    }

    /**
     * Show last sync time
     */
    showLastSyncTime() {
        const lastSync = localStorage.getItem('last-sync-time');
        if (lastSync) {
            const date = new Date(lastSync);
            const timeStr = date.toLocaleString();
            this.lastSyncInfo.textContent = `Last sync: ${timeStr}`;
            this.lastSyncInfo.hidden = false;
        }
    }

    /**
     * Show error state
     */
    showError(message) {
        this.setState('error');
        // Only show notification for user-facing errors, not initialization errors
        if (message && !message.includes('initialize')) {
            this.showNotification(`Sync failed: ${message}`, 'error');
        }
    }

    /**
     * Show notification (integrate with app's notification system if available)
     */
    showNotification(message, type = 'info') {
        // Try to use app's notification system
        if (window.NotificationManager && window.NotificationManager.show) {
            window.NotificationManager.show(message, type);
        } else {
            // Fallback to console
        }
    }

    /**
     * Handle sync manager state changes
     */
    onSyncManagerStateChange(isAuthenticated) {
        if (isAuthenticated) {
            this.setState('connected');
            this.showLastSyncTime();
        } else {
            this.setState('ready');
            this.lastSyncInfo.hidden = true;
        }
    }

    /**
     * Handle successful initialization
     */
    onSyncManagerReady() {
        // Check if already authenticated
        if (this.syncManager.isAuthenticated) {
            this.setState('connected');
            this.showLastSyncTime();
        } else {
            this.setState('ready');
        }
    }

    /**
     * Handle initialization failure
     */
    onSyncManagerFailed() {
        this.setState('error');
        this.showError('Failed to initialize Google Drive sync');
    }
}

// Export for use
window.GoogleSyncUI = GoogleSyncUI;