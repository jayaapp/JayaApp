/**
 * TrueHeart Loader
 * Initializes the TrueHeart UI in the settings panel and provides cloud sync
 * and user account features for the application.
 */

function initTrueHeartLoader() {
    console.log('🔷 TrueHeart Loader: Initializing...');
    // Robust initialization: wait for settings panel to open and TrueHeart readiness
    let settingsOpened = false;
    let trueheartReady = false;
    let initialized = false;

    function applyLocalizationIfAvailable() {
        try {
            if (typeof applyLocalization === 'function') applyLocalization();
        } catch (e) { /* silent */ }
    }

    function renderError(container, title, message) {
        try {
            container.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #c62828;">
                    <p>⚠️ ${title}</p>
                    <p style="font-size: 12px;">${message}</p>
                    <div style="margin-top: 12px;">
                        <button id="trueheart-retry-btn" class="trueheart-retry-btn" aria-label="Retry Cloud Sync">Retry</button>
                    </div>
                </div>
            `;
        } catch (e) { /* silent */ }
    }

    function attachRetryHandler(container) {
        try {
            const btn = container.querySelector('#trueheart-retry-btn');
            if (!btn) return;
            let busy = false;
            btn.addEventListener('click', async (ev) => {
                ev.preventDefault();
                if (busy) return;
                busy = true;
                btn.disabled = true;
                const prevText = btn.textContent;
                btn.textContent = 'Retrying...';
                try {
                    try { document.dispatchEvent(new Event('trueheart-retry')); } catch (e) { /* silent */ }
                    // small debounce to avoid rapid re-clicks
                    await new Promise(r => setTimeout(r, 300));
                    tryInitialize();
                    // wait briefly for initialization to succeed and UI to replace container
                    const start = Date.now();
                    while (!initialized && Date.now() - start < 5000) {
                        await new Promise(r => setTimeout(r, 200));
                    }
                    if (!initialized) {
                        btn.disabled = false;
                        btn.textContent = prevText;
                    }
                } catch (e) {
                    btn.disabled = false;
                    btn.textContent = prevText;
                } finally {
                    busy = false;
                }
            });
        } catch (e) { /* silent */ }
    }

    function tryInitialize() {
        if (initialized) return;

        const syncContainer = document.getElementById('sync-placeholder');
        if (!syncContainer) {
            // Wait for settingsOpened to be true before complaining
            if (!settingsOpened) {
                console.log('🔷 TrueHeart: sync-placeholder not found yet; waiting for settings panel to open');
                return;
            }
            console.warn('🔷 TrueHeart: sync-placeholder not found in settings panel');
            return;
        }

        // If API not ready yet, wait; if ready but API missing, show error with retry
        if (!window.trueheartUser && !trueheartReady) {
            console.log('🔷 TrueHeart: API not ready yet; waiting for trueheart-ready event');
            return;
        }

        if (!window.trueheartUser && trueheartReady) {
            // Render a friendly error with Retry button so users can trigger initialization
            renderError(syncContainer, 'Cloud Sync Unavailable', 'Please refresh the page or check your connection.');
            attachRetryHandler(syncContainer);
            return;
        }

        // Proceed to create TrueHeart UI
        try {
            window.trueheartUI = new TrueHeartUI(syncContainer);
            initialized = true;
            console.log('✅ TrueHeart UI initialized successfully');

            applyLocalizationIfAvailable();

            document.addEventListener('localeChanged', () => {
                try { if (typeof applyTrueHeartLocalization === 'function') applyTrueHeartLocalization(); } catch (e) {}
            });

            try { document.dispatchEvent(new Event('trueheart-initialized')); } catch (e) { /* silent */ }
        } catch (error) {
            console.error('🔷 TrueHeart UI initialization error:', error);
            renderError(syncContainer, 'Error loading Cloud Sync', error.message || 'Unexpected error');
            attachRetryHandler(syncContainer);
        }
    }

    // Listen for the settings panel opening (fired by settings.initSettingsPanel)
    function settingsHandler() {
        settingsOpened = true;
        document.removeEventListener('settingsOpened', settingsHandler);
        tryInitialize();
    }
    document.addEventListener('settingsOpened', settingsHandler);

    // Listen for TrueHeart API/UI readiness
    function trueheartHandler() {
        trueheartReady = true;
        document.removeEventListener('trueheart-ready', trueheartHandler);
        tryInitialize();
    }
    document.addEventListener('trueheart-ready', trueheartHandler);

    // Attempt immediate initialization in case conditions already satisfied
    tryInitialize();

    // Fallback retries in case events were missed or delayed
    setTimeout(tryInitialize, 1500);
    setTimeout(tryInitialize, 4000);
}