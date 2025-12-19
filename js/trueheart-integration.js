/**
 * TrueHeartUser + TrueHeartSync Integration for JayaApp
 * 
 * This module provides TrueHeartUser authentication and TrueHeartSync
 * data synchronization for cloud-backed user sync.
 */

// API Configuration
// Always uses deployed backend services (even when testing locally on localhost)
// Uses path-based routing: /user, /donate, /sync
const TRUEHEART_CONFIG = {
    userAPI: 'https://trueheartapps.com/user',
    syncAPI: 'https://trueheartapps.com/sync',
    appId: 'jayaapp',
    appUrl: window.location.origin
};

// Global state
window.trueheartState = {
    user: null,
    sessionToken: null,
    isAuthenticated: false,
    syncEnabled: false
};

/**
 * TrueHeartUser API Client
 * Handles authentication and session management
 */
class TrueHeartUserClient {
    constructor(config) {
        this.baseURL = config.userAPI;
        this.appUrl = config.appUrl;
        this.sessionToken = localStorage.getItem('trueheart-session-token');
    }

    async register(email, password) {
        const response = await fetch(`${this.baseURL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        if (data.success) {
            this.sessionToken = data.session_token;
            localStorage.setItem('trueheart-session-token', this.sessionToken);
            window.trueheartState.user = { user_id: data.user_id, email };
            window.trueheartState.sessionToken = this.sessionToken;
            window.trueheartState.isAuthenticated = true;
        }
        return data;
    }

    async login(email, password) {
        const response = await fetch(`${this.baseURL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        if (data.success) {
            this.sessionToken = data.session_token;
            localStorage.setItem('trueheart-session-token', this.sessionToken);
            window.trueheartState.user = { user_id: data.user_id, email: data.email };
            window.trueheartState.sessionToken = this.sessionToken;
            window.trueheartState.isAuthenticated = true;
            try { document.dispatchEvent(new CustomEvent('authChanged', { detail: { user: null } })); } catch (e) { /* ignore */ }
        }
        return data;
    }

    async logout() {
        if (!this.sessionToken) return { success: true };

        const response = await fetch(`${this.baseURL}/auth/logout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.sessionToken}`
            },
            body: JSON.stringify({})
        });
        
        const data = await response.json();
        this.sessionToken = null;
        localStorage.removeItem('trueheart-session-token');
        window.trueheartState.user = null;
        window.trueheartState.sessionToken = null;
        window.trueheartState.isAuthenticated = false;
        try { document.dispatchEvent(new CustomEvent('authChanged', { detail: { user: null } })); } catch (e) { /* ignore */ }
        return data;
    }

    async validateSession() {
        if (!this.sessionToken) return { success: false };

        const response = await fetch(`${this.baseURL}/auth/validate`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.sessionToken}`
            }
        });
        
        const data = await response.json();
        if (data.success) {
            window.trueheartState.user = { user_id: data.user_id, email: data.email };
            window.trueheartState.isAuthenticated = true;
        } else {
            // Session invalid, clear it
            this.sessionToken = null;
            localStorage.removeItem('trueheart-session-token');
            window.trueheartState.isAuthenticated = false;
        }
        return data;
    }

    async requestPasswordReset(email) {
        const response = await fetch(`${this.baseURL}/password/reset-request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, app_url: this.appUrl })
        });
        
        return await response.json();
    }

    async checkServiceStatus(serviceId) {
        if (!this.sessionToken) return { success: false, error: 'Not authenticated' };

        const response = await fetch(`${this.baseURL}/services/${serviceId}/status`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.sessionToken}`
            }
        });
        
        return await response.json();
    }

    async getStorageUsage() {
        if (!this.sessionToken) return { success: false, error: 'Not authenticated' };

        const response = await fetch(`${this.baseURL}/sync/usage`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.sessionToken}`
            }
        });
        
        return await response.json();
    }

    async deleteAccount(password) {
        if (!this.sessionToken) return { success: false, error: 'Not authenticated' };

        const response = await fetch(`${this.baseURL}/auth/account`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.sessionToken}`
            },
            body: JSON.stringify({ password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Clear local state
            this.sessionToken = null;
            localStorage.removeItem('trueheart-session-token');
            window.trueheartState.isAuthenticated = false;
            window.trueheartState.user = null;
        }
        
        return data;
    }
}

/**
 * TrueHeartSync API Client
 * Handles data synchronization
 */
class TrueHeartSyncClient {
    constructor(config, userClient) {
        this.baseURL = config.syncAPI;
        this.appId = config.appId;
        this.userClient = userClient;
    }

    async save(data) {
        if (!this.userClient.sessionToken) {
            throw new Error('Not authenticated');
        }

        // Encode data as base64 (sync backend expects this format)
        const jsonString = JSON.stringify(data);
        const base64Data = btoa(unescape(encodeURIComponent(jsonString)));

        // Call through user service which proxies to sync with proper credentials
        const response = await fetch(`${this.userClient.baseURL}/sync/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.userClient.sessionToken}`
            },
            body: JSON.stringify({ app_id: this.appId, data: base64Data })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Sync save failed');
        }
        
        return await response.json();
    }

    async load() {
        if (!this.userClient.sessionToken) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${this.userClient.baseURL}/sync/load?app_id=${this.appId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.userClient.sessionToken}`
            }
        });
        
        if (!response.ok) {
            if (response.status === 404) {
                // No sync data yet - this is fine
                return { success: true, data: null };
            }
            const error = await response.json();
            throw new Error(error.error || 'Sync load failed');
        }
        
        const result = await response.json();
        
        // Decode base64 data if present
        if (result.success && result.data) {
            try {
                const decodedString = decodeURIComponent(escape(atob(result.data)));
                result.data = JSON.parse(decodedString);
            } catch (e) {
                console.error('Failed to decode sync data:', e);
                throw new Error('Failed to decode sync data');
            }
        }
        
        return result;
    }

    async check() {
        if (!this.userClient.sessionToken) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${this.userClient.baseURL}/sync/check?app_id=${this.appId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.userClient.sessionToken}`
            }
        });
        
        return await response.json();
    }
    // Append events to the event-log via TrueHeartUser proxy (if available)
    async appendEvents(events) {
        if (!this.userClient.sessionToken) throw new Error('Not authenticated');
        const response = await fetch(`${this.userClient.baseURL}/sync/event`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.userClient.sessionToken}`
            },
            body: JSON.stringify({ app_id: this.appId, events })
        });
        return await response.json();
    }

    async fetchEvents(since = 0, limit = 1000) {
        if (!this.userClient.sessionToken) throw new Error('Not authenticated');
        const response = await fetch(`${this.userClient.baseURL}/sync/events?app_id=${this.appId}&since=${since}&limit=${limit}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.userClient.sessionToken}`
            }
        });
        return await response.json();
    }}

/**
 * Initialize TrueHeart integration
 */
async function initTrueHeart() {
    // Create API clients
    window.trueheartUser = new TrueHeartUserClient(TRUEHEART_CONFIG);
    window.trueheartSync = new TrueHeartSyncClient(TRUEHEART_CONFIG, window.trueheartUser);

    // Check if we have a stored session
    if (window.trueheartUser.sessionToken) {
        try {
            await window.trueheartUser.validateSession();
            console.log('✅ TrueHeart session restored:', window.trueheartState.user?.email);
        } catch (error) {
            console.log('ℹ️ No valid session found');
        }
    }

    // Check for password reset token in URL
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('reset_token');
    if (resetToken) {
        // Store token and show password reset UI
        localStorage.setItem('trueheart-reset-token', resetToken);
        // Remove from URL without page reload
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

/**
 * Perform sync operation using TrueHeartSync (cloud-backed synchronization)
 */
async function performTrueHeartSync() {
    if (!window.trueheartState.isAuthenticated) {
        throw new Error('Not authenticated');
    }

    // Collect local data (use same storage keys as the app modules)
    const localBookmarks = JSON.parse(localStorage.getItem('jayaapp:bookmarks') || '{}');
    const localNotes = JSON.parse(localStorage.getItem('jayaapp:notes') || '{}');
    const localPrompts = JSON.parse(localStorage.getItem('jayaapp:prompts') || '{}');
    const localEdits = JSON.parse(localStorage.getItem('jayaapp:edits') || '{}');
    const localData = {
        bookmarks: localBookmarks,
        notes: localNotes,
        prompts: localPrompts,
        edits: localEdits,
        timestamp: new Date().toISOString()
    }; 

    // Load remote snapshot
    const remoteResult = await window.trueheartSync.load();
    console.debug('TrueHeart Debug: initial load result', { success: remoteResult && remoteResult.success, dataSample: remoteResult && remoteResult.data ? (JSON.stringify(remoteResult.data).slice(0,300) + (JSON.stringify(remoteResult.data).length > 300 ? '... (truncated)' : '')) : null });
    const remoteData = remoteResult.data;

    // Decide initial merged data using empty-aware logic
    function _isEmptySnapshot(v) {
        if (!v) return true;
        const keys = ['bookmarks','notes','edits'];
        return keys.every(k => !v[k] || (typeof v[k] === 'object' && Object.keys(v[k]).length === 0));
    }

    // Always merge bookmarks and notes per-item to avoid one-client snapshot overwriting another.
    function mergeListsById(localObj = {}, remoteObj = {}) {
        const out = {};
        const bookIndexes = new Set([...Object.keys(localObj), ...Object.keys(remoteObj)]);
        bookIndexes.forEach(bi => {
            const localArr = (localObj[bi] || []).slice();
            const remoteArr = (remoteObj[bi] || []).slice();
            const byId = Object.create(null);
            localArr.concat(remoteArr).forEach(item => {
                if (!item || !item.id) return;
                const existing = byId[item.id];
                if (!existing) byId[item.id] = item;
                else {
                    const exT = new Date(existing.timestamp || 0).getTime();
                    const itT = new Date(item.timestamp || 0).getTime();
                    if (itT > exT) byId[item.id] = item;
                }
            });
            out[bi] = Object.values(byId).sort((a,b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
        });
        return out;
    }

    // Merge edited verses structure (book -> chapter -> verse -> lang -> {text,timestamp})
    function mergeEdits(local = {}, remote = {}) {
        const out = {};
        const books = new Set([...Object.keys(local || {}), ...Object.keys(remote || {})]);
        books.forEach(b => {
            const localBook = local[b] || {};
            const remoteBook = remote[b] || {};
            const chapters = new Set([...Object.keys(localBook), ...Object.keys(remoteBook)]);
            chapters.forEach(c => {
                const localChap = localBook[c] || {};
                const remoteChap = remoteBook[c] || {};
                const verses = new Set([...Object.keys(localChap), ...Object.keys(remoteChap)]);
                verses.forEach(v => {
                    const localCell = localChap[v] || {};
                    const remoteCell = remoteChap[v] || {};
                    const langs = new Set([...Object.keys(localCell), ...Object.keys(remoteCell)]);
                    const mergedCell = {};
                    langs.forEach(lang => {
                        const l = localCell[lang];
                        const r = remoteCell[lang];
                        if (!l && !r) return;
                        if (!l) mergedCell[lang] = r;
                        else if (!r) mergedCell[lang] = l;
                        else {
                            const lt = new Date(l.timestamp || 0).getTime();
                            const rt = new Date(r.timestamp || 0).getTime();
                            mergedCell[lang] = (lt >= rt) ? l : r;
                        }
                    });
                    if (Object.keys(mergedCell).length > 0) {
                        out[b] = out[b] || {};
                        out[b][c] = out[b][c] || {};
                        out[b][c][v] = mergedCell;
                    }
                });
            });
        });
        return out;
    }

    // include edits in initial merge (per-language, per-verse merges)
    let mergedData = {
        bookmarks: mergeListsById(localData.bookmarks, remoteData?.bookmarks),
        notes: mergeListsById(localData.notes, remoteData?.notes),
        edits: mergeEdits(localData.edits, remoteData?.edits),
        timestamp: new Date(Math.max(new Date(localData.timestamp || 0).getTime(), new Date(remoteData?.timestamp || 0).getTime())).toISOString()
    }; 

    // Gather pending deletions from compatibility stubs
    const pendingTrueHeartDeletions = JSON.parse(localStorage.getItem('trueheart-deletions') || '[]');
    const pendingOldDeletions = JSON.parse(localStorage.getItem('jayaapp-pending-deletions') || '[]');
    const pendingDeletions = [...pendingTrueHeartDeletions, ...pendingOldDeletions];
    if (pendingTrueHeartDeletions.length > 0) localStorage.removeItem('trueheart-deletions');
    if (pendingOldDeletions.length > 0) localStorage.removeItem('jayaapp-pending-deletions');

    // Convert deletions into events and append them
    const eventsToAppend = [];
    (pendingDeletions || []).forEach(event => {
        const id = event.key || event.id || event;
        const type = event.type || 'bookmark';
        let target = 'bookmark';
        if (type === 'note') target = 'note';
        else if (type === 'editedVerse') target = 'editedVerse';
        eventsToAppend.push({ event_id: `del-${id}-${Date.now()}`, type: 'delete', payload: { target, id }, created_at: Date.now() });
    });

    if (eventsToAppend.length > 0) {
        try { await window.trueheartSync.appendEvents(eventsToAppend); } catch (err) { console.warn('Failed to append events:', err); }
    }

    // Fetch and apply events (replay)
    let deletedItems = { bookmarks: [], notes: [], edits: [] };
    let eventsRes = null;
    try {
        eventsRes = await window.trueheartSync.fetchEvents(0, 10000);
        if (eventsRes && eventsRes.success && Array.isArray(eventsRes.events)) {
            eventsRes.events.forEach(ev => {
                const type = ev.type || 'patch';
                const payload = ev.payload || {};
                if (type === 'replace') { mergedData = { bookmarks: payload.bookmarks || {}, notes: payload.notes || {}, edits: payload.edits || {}, timestamp: payload.timestamp || mergedData.timestamp }; return; }
                if (type === 'patch' || type === 'state') {
                    if (payload.bookmarks) mergedData.bookmarks = { ...(mergedData.bookmarks || {}), ...(payload.bookmarks || {}) };
                    if (payload.notes) mergedData.notes = { ...(mergedData.notes || {}), ...(payload.notes || {}) };
                    if (payload.edits) mergedData.edits = mergeEdits(mergedData.edits || {}, payload.edits || {});
                    return;
                }
                if (type === 'delete') {
                    const target = payload.target || 'bookmark';
                    const id = payload.id;
                    if (target === 'note') {
                        Object.keys(mergedData.notes || {}).forEach(bookIndex => {
                            const beforeCount = (mergedData.notes[bookIndex] || []).length;
                            mergedData.notes[bookIndex] = (mergedData.notes[bookIndex] || []).filter(n => n.id !== id);
                            if ((mergedData.notes[bookIndex] || []).length < beforeCount) deletedItems.notes.push({ id, bookIndex });
                        });
                    } else if (target === 'editedVerse') {
                        // id expected as 'book:chapter:verse'
                        const parts = (id || '').split(':');
                        if (parts.length === 3) {
                            const [b, c, v] = parts;
                            if (mergedData.edits && mergedData.edits[b] && mergedData.edits[b][c] && mergedData.edits[b][c][v]) {
                                delete mergedData.edits[b][c][v];
                                deletedItems.edits.push({ id, bookIndex: b, chapter: c, verse: v });
                                if (Object.keys(mergedData.edits[b][c]).length === 0) delete mergedData.edits[b][c];
                                if (Object.keys(mergedData.edits[b]).length === 0) delete mergedData.edits[b];
                            }
                        }
                    } else {
                        Object.keys(mergedData.bookmarks || {}).forEach(bookIndex => {
                            const beforeCount = (mergedData.bookmarks[bookIndex] || []).length;
                            mergedData.bookmarks[bookIndex] = (mergedData.bookmarks[bookIndex] || []).filter(b => b.id !== id);
                            if ((mergedData.bookmarks[bookIndex] || []).length < beforeCount) deletedItems.bookmarks.push({ id, bookIndex });
                        });
                    }
                }
            });
        }
    } catch (err) { console.warn('Failed to fetch or apply events:', err); }

    // Save merged data back to server (sync bookmarks & notes only)
    try {
        const mergedEmpty = _isEmptySnapshot(mergedData);
        const hadRemote = !(_isEmptySnapshot(remoteData));
        const eventsCount = (eventsRes && eventsRes.success && Array.isArray(eventsRes.events)) ? eventsRes.events.length : 0;
        if (mergedEmpty && (eventsCount > 0 || hadRemote)) {
            console.warn('TrueHeart: merged result is empty while server/events suggest data exists — reloading server snapshot instead of saving empty');
            try {
                const checkRes = await window.trueheartSync.check().catch(e => { console.warn('TrueHeart: sync check failed', e); return null; });
                console.debug('TrueHeart Debug: sync check result', checkRes);
                const checkSize = (checkRes && checkRes.success) ? ((checkRes.data && checkRes.data.size_bytes) || checkRes.size_bytes || 0) : 0;
                const checkExists = (checkRes && (checkRes.exists || (checkRes.data && checkRes.data.exists))) || (checkSize > 0);
                if (checkSize > 0 || checkExists) {
                    console.debug('TrueHeart: sync check indicates server snapshot present (size_bytes=' + checkSize + ')');
                } else {
                    console.debug('TrueHeart: sync check indicates no server snapshot');
                }

                let reload = await window.trueheartSync.load();
                console.debug('TrueHeart Debug: reload result (raw)', reload);
                if ((!(reload && reload.data && !(_isEmptySnapshot(reload.data)))) && (checkSize > 0 || checkExists)) {
                    console.warn('TrueHeart: reload returned empty but check indicates server data; retrying load once');
                    await new Promise(r => setTimeout(r, 350));
                    try {
                        const reload2 = await window.trueheartSync.load();
                        console.debug('TrueHeart Debug: reload retry result (raw)', reload2);
                        if (reload2 && reload2.data && !(_isEmptySnapshot(reload2.data))) reload = reload2; else console.warn('TrueHeart: reload retry also returned no usable data');
                    } catch (e) { console.warn('TrueHeart: reload retry failed', e); }
                }
                if (reload && reload.data) {
                    mergedData.bookmarks = reload.data.bookmarks || {};
                    mergedData.notes = reload.data.notes || {};
                    mergedData.edits = reload.data.edits || {};
                    try {
                        localStorage.setItem('jayaapp:bookmarks', JSON.stringify(mergedData.bookmarks || {}));
                        localStorage.setItem('jayaapp:notes', JSON.stringify(mergedData.notes || {}));
                        localStorage.setItem('jayaapp:edits', JSON.stringify(mergedData.edits || {}));
                    } catch (e) { console.warn('TrueHeart: failed to update local storage after reload', e); }
                    window.dispatchEvent(new CustomEvent('syncDataUpdated', { detail: { bookmarks: mergedData.bookmarks || {}, notes: mergedData.notes || {}, edits: mergedData.edits || {} } }));
                    console.info('TrueHeart: local bookmarks/notes/edits refreshed from server after empty-merge guard');
                } else {
                    console.warn('TrueHeart: reload returned no data after empty-merge guard');
                }
            } catch (reloadErr) { console.error('TrueHeart: failed to reload server snapshot after empty-merge guard', reloadErr); }
        } else {
            const syncPayload = { bookmarks: mergedData.bookmarks || {}, notes: mergedData.notes || {}, edits: mergedData.edits || {}, timestamp: mergedData.timestamp || new Date().toISOString() };
            await window.trueheartSync.save(syncPayload);
        }
    } catch (err) {
        if (err && err.message === 'empty_snapshot_rejected') {
            console.warn('TrueHeart: save rejected as empty_snapshot_rejected — reloading server snapshot instead');
            try {
                const reload = await window.trueheartSync.load();
                if (reload && reload.data) {
                    mergedData.bookmarks = reload.data.bookmarks || {};
                    mergedData.notes = reload.data.notes || {};
                    mergedData.edits = reload.data.edits || {};
                    try {
                        localStorage.setItem('jayaapp:bookmarks', JSON.stringify(mergedData.bookmarks || {}));
                        localStorage.setItem('jayaapp:notes', JSON.stringify(mergedData.notes || {}));
                        localStorage.setItem('jayaapp:edits', JSON.stringify(mergedData.edits || {}));
                    } catch (e) { console.warn('TrueHeart: failed to update local storage after reload', e); }
                    window.dispatchEvent(new CustomEvent('syncDataUpdated', { detail: { bookmarks: mergedData.bookmarks || {}, notes: mergedData.notes || {}, edits: mergedData.edits || {} } }));
                    console.info('TrueHeart: local bookmarks/notes/edits refreshed from server after rejected empty save');
                }
            } catch (reloadErr) { console.error('TrueHeart: failed to reload server snapshot after empty save rejection', reloadErr); }
        } else {
            console.warn('Failed to save merged data to server:', err);
        }
    }

    // Update local storage with merged data (bookmarks, notes & edits)
    try {
        localStorage.setItem('jayaapp:bookmarks', JSON.stringify(mergedData.bookmarks));
        localStorage.setItem('jayaapp:notes', JSON.stringify(mergedData.notes));
        localStorage.setItem('jayaapp:edits', JSON.stringify(mergedData.edits || {}));
    } catch (err) { console.warn('Could not update bookmarks/notes/edits in local storage:', err); }

    window.dispatchEvent(new CustomEvent('syncDataUpdated', { detail: { bookmarks: mergedData.bookmarks || {}, notes: mergedData.notes || {}, edits: mergedData.edits || {}, deletedItems: deletedItems } }));
    window.dispatchEvent(new CustomEvent('trueheart-sync-complete'));
    return mergedData;
}

// Export for global use
window.trueheartAPI = {
    initTrueHeart,
    performTrueHeartSync
};

// Debounced sync controller (compatible replacement)
const SYNC_DEBOUNCE_MS = 2000;
class SyncController {
    constructor() {
        this.debounceTimer = null;
        this.isSyncing = false;
        this.pendingChanges = false;
        this.lastToastShown = false;
    }

    scheduleSync(reason) {
        this.pendingChanges = true;
        if (!window.trueheartState?.isAuthenticated) {
            if (!this.lastToastShown) {
                if (window.showAlert) window.showAlert('Changes saved locally; they will be synced when you sign in.', 3000);
                this.lastToastShown = true;
            }
            return;
        }
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.debounceTimer = null;
            this.immediateSync(reason || 'scheduled');
        }, SYNC_DEBOUNCE_MS);
    }

    async immediateSync(reason = 'manual') {
        if (!window.trueheartState?.isAuthenticated) {
            if (window.showAlert) window.showAlert('Not signed in. Please sign in to sync.', 2500);
            return;
        }
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
            if (typeof console !== 'undefined' && console.log) console.log('🔁 SyncController: canceled pending debounce before immediate sync');
        }
        if (this.isSyncing) return;
        this.isSyncing = true;
        this.pendingChanges = false;
        try {
            if (window.syncUI && typeof window.syncUI.setState === 'function') window.syncUI.setState('syncing');
            if (window.showAlert) window.showAlert('Syncing...', 1200);
            await performTrueHeartSync();
            if (window.showAlert) window.showAlert('Sync completed', 2000);
        } catch (err) {
            console.error('Sync failed:', err);
            if (window.showAlert) window.showAlert('Sync failed: ' + (err.message || err), 4000);
        } finally {
            this.isSyncing = false;
            if (window.syncUI && typeof window.syncUI.setState === 'function') window.syncUI.setState('connected');
        }
    }
}

window.syncController = new SyncController();
window.syncManager = window.trueheartSync;

// Initialize on load
window.addEventListener('load', initTrueHeart);