/**
 * Google Drive Sync Integration
 * Smart polling-based sync for Yoga Vasishtha app
 */

// Sync configuration constants
const AUTO_SYNC_INTERVAL = 30000; // 30 seconds
const DELETE_EVENT_RETENTION = 90 * 24 * 60 * 60 * 1000; // 90 days
const ENABLE_SYNC_LOGGING = true; // Set to true to enable sync debug logging

// Smart polling-based sync for cross-device consistency
class SmartAutoSync {
    constructor(syncManager, syncUI) {
        this.syncManager = syncManager;
        this.syncUI = syncUI;
        this.isPerformingSync = false;
        this.pollTimer = null;
        this.lastSuccessfulSync = null;
    }

    /**
     * Start the smart polling sync
     */
    start() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
        }


        // Start immediately, then at intervals
        this.performSmartSync();

        this.pollTimer = setInterval(() => {
            this.performSmartSync();
        }, AUTO_SYNC_INTERVAL);
    }

    /**
     * Stop the smart polling sync
     */
    stop() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
    }

    /**
     * Perform smart sync with complete state reconciliation
     */
    async performSmartSync() {
        // Only sync if authenticated
        if (!this.syncManager?.isAuthenticated) {
            return;
        }

        // Prevent concurrent syncs
        if (this.isPerformingSync) {
            return;
        }

        try {
            this.isPerformingSync = true;

            // Show subtle sync indicator
            this.showSyncIndicator(true);

            // Perform complete sync with deletion event processing
            await this.syncUI.performCompleteSync();

            this.lastSuccessfulSync = Date.now();

        } catch (error) {
            console.warn('🔄 SMART-SYNC: Sync failed:', error);
            // Continue silently - user can still manually sync if needed
        } finally {
            this.isPerformingSync = false;
            this.showSyncIndicator(false);
        }
    }

    /**
     * Show/hide subtle sync indicator
     */
    showSyncIndicator(isVisible) {
        const syncButton = document.querySelector('#sync-main-btn');
        if (syncButton) {
            const icon = syncButton.querySelector('.material-symbols-outlined');
            if (icon) {
                if (isVisible) {
                    icon.classList.add('spinning');
                } else {
                    icon.classList.remove('spinning');
                }
            }
        }
    }

    /**
     * Force immediate sync (for manual sync button)
     */
    async forceSync() {
        if (this.isPerformingSync) {
            return;
        }

        await this.performSmartSync();
    }
}

// Initialize sync manager and UI
const syncManager = new GoogleDriveSync({
    fileName: 'jayaapp-mahabharata-sync.json',
    onStatusChange: (status) => {
        if (window.syncUI) {
            window.syncUI.onSyncManagerStateChange(status === 'connected');
        }
    }
});

// Configure with web client ID
syncManager.configure('374213949643-1div5nss8skdtmr2ghfqnlructr3fh7h.apps.googleusercontent.com');

// Check for OAuth redirect on page load
function handleOAuthRedirect() {
    const hash = window.location.hash.substring(1);
    if (hash) {
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const state = params.get('state');
        const error = params.get('error');

        if (state && (state.startsWith('webview_auth_') || state.startsWith('web_auth_') || state.startsWith('pwa_auth_'))) {

            // Post message to parent window (for iframe case)
            if (window.parent !== window) {
                window.parent.postMessage({
                    type: 'oauth_result',
                    access_token: accessToken,
                    error: error
                }, window.location.origin);
                return;
            }

            // Handle direct redirect case
            if (accessToken) {
                // Store token persistently using the new token storage
                sessionStorage.setItem('oauth_access_token', accessToken);
                // Clean up URL
                window.history.replaceState({}, document.title, window.location.pathname);
            } else if (error) {
                console.error('OAuth redirect failed:', error);
                sessionStorage.setItem('oauth_error', error);
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    }
}

// Initialize when page loads
window.addEventListener('load', async () => {
    // Check for OAuth redirect first
    handleOAuthRedirect();

    // Find sync container and show initializing state immediately
    const syncContainer = document.getElementById('sync-placeholder');
    if (syncContainer) {
        // Create sync UI in initializing state
        window.syncUI = new GoogleSyncUI(syncContainer, syncManager);
        window.syncUI.setState('initializing');
    } else {
        console.warn('⚠️  Sync container not found - sync UI disabled');
        return;
    }

    try {
        // Initialize sync manager (includes token restoration)
        const initialized = await syncManager.initialize();

        if (!initialized) {
            // Initialization failed - show error state with retry option
            window.syncUI.onSyncManagerFailed();
            return;
        }

        // Check for stored OAuth token from redirect
        const storedToken = sessionStorage.getItem('oauth_access_token');
        if (storedToken) {
            // Save token persistently and set up authentication
            await syncManager.saveTokenData(storedToken, 3600); // Default 1 hour expiry
            syncManager.accessToken = storedToken;
            syncManager.isAuthenticated = true;
            gapi.client.setToken({ access_token: storedToken });
            syncManager.onStatusChange('connected');
            sessionStorage.removeItem('oauth_access_token');
        }

        // Wait for any pending token restoration to complete
        await new Promise(resolve => setTimeout(resolve, 200));

        // Now set UI state based on actual authentication status
        window.syncUI.onSyncManagerReady();

        // Initialize smart auto-sync after everything is ready
        window.smartAutoSync = new SmartAutoSync(syncManager, window.syncUI);
        window.smartAutoSync.start();

        // --- Bridge: adapt app's storage shape to gsync-ui expected keys ---
        // The UI's performCompleteSync expects flat objects under localStorage keys
        // 'bookmarks', 'jayaapp_notes', and 'editedVerses'. Our app uses
        // nested structures and different keys (jayaapp:bookmarks, jayaapp:notes, jayaapp:edits).
        // To avoid rewriting gsync-ui we temporarily populate those keys before invoking
        // the original performCompleteSync and then map merged results back into
        // the app APIs (bookmarksAPI, notesAPI, editsAPI).
        if (window.syncUI && typeof window.syncUI.performCompleteSync === 'function') {
            // save original
            window.syncUI._performCompleteSyncOrig = window.syncUI.performCompleteSync.bind(window.syncUI);

            window.syncUI.performCompleteSync = async function() {
                // helper flatteners
                function flattenBookmarks(bm) {
                    const out = {};
                    for (const B of Object.keys(bm || {})) {
                        for (const C of Object.keys(bm[B] || {})) {
                            for (const V of Object.keys(bm[B][C] || {})) {
                                const id = `${B}:${C}:${V}`;
                                const val = bm[B][C][V];
                                out[id] = { book: B, chapter: C, verse: V, timestamp: (val && val.timestamp) ? val.timestamp : new Date().toISOString() };
                            }
                        }
                    }
                    return out;
                }

                function flattenNotes(notes) {
                    const out = {};
                    for (const B of Object.keys(notes || {})) {
                        for (const C of Object.keys(notes[B] || {})) {
                            for (const V of Object.keys(notes[B][C] || {})) {
                                const id = `${B}:${C}:${V}`;
                                const val = notes[B][C][V];
                                const text = (val && typeof val === 'object') ? val.text : val;
                                const ts = (val && typeof val === 'object' && val.timestamp) ? val.timestamp : new Date().toISOString();
                                out[id] = { book: B, chapter: C, verse: V, text: text || '', timestamp: ts };
                            }
                        }
                    }
                    return out;
                }

                function flattenEdits(edits) {
                    const out = {};
                    for (const B of Object.keys(edits || {})) {
                        for (const C of Object.keys(edits[B] || {})) {
                            for (const V of Object.keys(edits[B][C] || {})) {
                                const id = `${B}:${C}:${V}`;
                                const cell = edits[B][C][V] || {};
                                const normalized = { book: B, chapter: C, verse: V };

                                // Normalize per-language values to { text, timestamp }
                                for (const lang of Object.keys(cell || {})) {
                                    const val = cell[lang];
                                    if (val && typeof val === 'object') {
                                        normalized[lang] = {
                                            text: val.text || '',
                                            timestamp: val.timestamp || new Date().toISOString()
                                        };
                                    } else {
                                        normalized[lang] = {
                                            text: String(val || ''),
                                            timestamp: new Date().toISOString()
                                        };
                                    }
                                }

                                out[id] = normalized;
                            }
                        }
                    }
                    return out;
                }

                // load from app APIs where possible
                const appBookmarks = (window.bookmarksAPI && window.bookmarksAPI.loadBookmarks) ? window.bookmarksAPI.loadBookmarks() : JSON.parse(localStorage.getItem('jayaapp:bookmarks') || '{}');
                const appNotes = (window.notesAPI && window.notesAPI.loadNotes) ? window.notesAPI.loadNotes() : JSON.parse(localStorage.getItem('jayaapp:notes') || '{}');
                const appEdits = (window.editsAPI && window.editsAPI.loadEdits) ? window.editsAPI.loadEdits() : JSON.parse(localStorage.getItem('jayaapp:edits') || '{}');
                const appPrompts = (window.promptsAPI && window.promptsAPI.loadUserPrompts) ? window.promptsAPI.loadUserPrompts() : JSON.parse(localStorage.getItem('jayaapp:prompts') || '{}');

                // Backup any existing keys the UI uses so we can restore/cleanup
                const backup = {
                    bookmarks: localStorage.getItem('bookmarks'),
                    jayaapp_notes: localStorage.getItem('jayaapp_notes'),
                    editedVerses: localStorage.getItem('editedVerses'),
                    jayaapp_prompts: localStorage.getItem('jayaapp_prompts')
                };

                try {
                    // populate the bridge keys
                    localStorage.setItem('bookmarks', JSON.stringify(flattenBookmarks(appBookmarks)));
                    localStorage.setItem('jayaapp_notes', JSON.stringify(flattenNotes(appNotes)));
                    localStorage.setItem('editedVerses', JSON.stringify(flattenEdits(appEdits)));
                    // prompts are already flat, just copy them
                    localStorage.setItem('jayaapp_prompts', JSON.stringify(appPrompts));

                    // call original sync flow (handles deletions/merge/upload)
                    await window.syncUI._performCompleteSyncOrig();

                    // after merge, read merged results and map back into app storage/APIs
                    const mergedBookmarks = JSON.parse(localStorage.getItem('bookmarks') || '{}');
                    const mergedNotes = JSON.parse(localStorage.getItem('jayaapp_notes') || '{}');
                    const mergedEdits = JSON.parse(localStorage.getItem('editedVerses') || '{}');
                    const mergedPrompts = JSON.parse(localStorage.getItem('jayaapp_prompts') || '{}');

                    // Clear app-side structures and repopulate from merged
                    // Bookmarks (preserve timestamps)
                    const newBm = {};
                    for (const id of Object.keys(mergedBookmarks || {})) {
                        const cell = mergedBookmarks[id];
                        const B = String(cell.book), C = String(cell.chapter), V = String(cell.verse);
                        if (!newBm[B]) newBm[B] = {};
                        if (!newBm[B][C]) newBm[B][C] = {};
                        const ts = cell.timestamp || new Date().toISOString();
                        newBm[B][C][V] = { timestamp: ts };
                        if (window.bookmarksAPI && window.bookmarksAPI.setBookmark) window.bookmarksAPI.setBookmark(B, C, V, ts);
                    }
                    // persist to localStorage in any case (APIs above also update their stores)
                    localStorage.setItem('jayaapp:bookmarks', JSON.stringify(newBm));

                    // Notes (preserve timestamps)
                    const newNotes = {};
                    for (const id of Object.keys(mergedNotes || {})) {
                        const cell = mergedNotes[id];
                        const B = String(cell.book), C = String(cell.chapter), V = String(cell.verse);
                        if (!newNotes[B]) newNotes[B] = {};
                        if (!newNotes[B][C]) newNotes[B][C] = {};
                        const text = cell.text || '';
                        const ts = cell.timestamp || new Date().toISOString();
                        newNotes[B][C][V] = { text: text, timestamp: ts };
                    }
                    // Persist notes with timestamps. Prefer to write the full storage object so timestamps are preserved.
                    localStorage.setItem('jayaapp:notes', JSON.stringify(newNotes));
                    // If the notes API exists, let it know to refresh UI (avoid calling setNote which would overwrite timestamps)
                    if (window.updateText) window.updateText();

                    // Edits
                    const newEdits = {};
                    for (const id of Object.keys(mergedEdits || {})) {
                        const cell = mergedEdits[id];
                        const B = String(cell.book), C = String(cell.chapter), V = String(cell.verse);
                        if (!newEdits[B]) newEdits[B] = {};
                        if (!newEdits[B][C]) newEdits[B][C] = {};
                        // cell may include language keys or raw text
                        newEdits[B][C][V] = Object.assign({}, cell);
                        // remove metadata keys but keep per-language entries (which include text+timestamp)
                        delete newEdits[B][C][V].book; delete newEdits[B][C][V].chapter; delete newEdits[B][C][V].verse; delete newEdits[B][C][V].timestamp;
                        if (window.editsAPI && window.editsAPI.setEdit) window.editsAPI.setEdit(B, C, V, newEdits[B][C][V]);
                    }
                    if (!window.editsAPI) localStorage.setItem('jayaapp:edits', JSON.stringify(newEdits));

                    // Prompts (already flat structure, just persist)
                    localStorage.setItem('jayaapp:prompts', JSON.stringify(mergedPrompts));
                    // Save using API if available to ensure consistency
                    if (window.promptsAPI && window.promptsAPI.saveUserPrompts) {
                        window.promptsAPI.saveUserPrompts(mergedPrompts);
                    }

                } finally {
                    // cleanup bridge keys (restore backups or remove)
                    if (backup.bookmarks == null) localStorage.removeItem('bookmarks'); else localStorage.setItem('bookmarks', backup.bookmarks);
                    if (backup.jayaapp_notes == null) localStorage.removeItem('jayaapp_notes'); else localStorage.setItem('jayaapp_notes', backup.jayaapp_notes);
                    if (backup.editedVerses == null) localStorage.removeItem('editedVerses'); else localStorage.setItem('editedVerses', backup.editedVerses);
                    if (backup.jayaapp_prompts == null) localStorage.removeItem('jayaapp_prompts'); else localStorage.setItem('jayaapp_prompts', backup.jayaapp_prompts);
                }
            };
        }

        // Add debug function after everything is ready
        window.debugSync = async function() {
            if (!window.syncManager?.isAuthenticated) {
                console.warn('❌ Not authenticated');
                return;
            }

            try {
                console.log('🔍 === DEBUG SYNC START ===');
                await window.smartAutoSync.forceSync();
                console.log('✅ === DEBUG SYNC COMPLETE ===');
            } catch (error) {
                console.error('❌ Debug sync failed:', error);
            }
        };

        // Add reset sync function
        window.resetSync = async function() {
            if (!window.syncManager?.isAuthenticated) {
                console.warn('❌ Not authenticated - connect to Google Drive first');
                return;
            }

            try {
                console.log('🔄 === RESET SYNC START ===');

                // Upload empty state to Google Drive
                const emptyState = {
                    bookmarks: {},
                    notes: {},
                    readingPositions: {},
                    timestamp: new Date().toISOString()
                };

                console.log('🗑️ Clearing Google Drive sync state...');
                await window.syncManager.upload(emptyState);

                console.log('✅ Google Drive sync state reset to empty');
                console.log('🔄 === RESET SYNC COMPLETE ===');

                return emptyState;
            } catch (error) {
                console.error('❌ Reset sync failed:', error);
            }
        };

    } catch (error) {
        console.error('❌ Sync initialization error:', error);
        // Always show UI with error state, never leave it blank
        if (window.syncUI) {
            window.syncUI.onSyncManagerFailed();
        }
    }
});


// Debug function to view sync file content
window.viewSyncFile = async function() {
    if (!window.syncManager?.isAuthenticated) {
        console.warn('Not authenticated - connect to Google Drive first');
        return;
    }

    try {
        const data = await window.syncManager.download();
        if (data) {
            console.log('Sync file contents:', data);
        } else {
            // console.log('No sync file found - either no data synced yet or file doesn't exist');
            // Strangely uncommenting this seems to "cause" the Connect To Google Drive button to disappear
        }
        return data;
    } catch (error) {
        console.error('Failed to read sync file:', error);
    }
};


// Export for debugging
window.syncManager = syncManager;