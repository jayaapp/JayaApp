function applyLocalization() {
    let currentLang = localStorage.getItem('appLang') || 'English';
    if (document.getElementById('language-select')) {
        document.getElementById('language-select').value = currentLang;
    }
    let elements = document.querySelectorAll('[locale-id]');
    
    elements.forEach(el => {
        let key = el.getAttribute('locale-id');
        if (window.localeData && window.localeData[currentLang] && window.localeData[currentLang][key]) {
            el.textContent = window.localeData[currentLang][key];
        }
    });

    // Notify navigation module about language change
    document.dispatchEvent(new Event('localeChanged'));
}

// Font controls: wire UI to localStorage and CSS variables
function initFontControls() {
    const controls = [
        {
            id: 'verse-number-font-size',
            key: 'verseNumberFontSize',
            options: ['10px', '12px', '14px', '16px', '18px'],
            default: '12px',
            apply: (v) => {
                try {
                    document.documentElement.style.setProperty('--verse-number-font-size', v);
                    document.querySelectorAll('.verse-number').forEach(el => el.style.fontSize = v);
                } catch (e) { /* silent */ }
            }
        },
        {
            id: 'verse-font-size',
            key: 'verseFontSize',
            options: ['14px', '16px', '18px', '20px', '22px', '24px'],
            default: '18px',
            apply: (v) => {
                try {
                    document.documentElement.style.setProperty('--verse-font-size', v);
                    ['text-panel-horizontal', 'text-panel-vertical'].forEach(id => {
                        const el = document.getElementById(id);
                        if (el) el.style.fontSize = v;
                    });
                } catch (e) { /* silent */ }
            }
        },
        {
            id: 'verse-font-family',
            key: 'verseFontFamily',
            options: [
                { label: 'Serif (readable)', value: "'Noto Serif', 'Merriweather', Georgia, serif" },
                { label: 'Sans-serif (clean)', value: "'Noto Sans', Roboto, 'Helvetica Neue', Arial, sans-serif" },
                { label: 'Devanagari Serif', value: "'Noto Serif Devanagari', 'Noto Serif', serif" },
                { label: 'Devanagari Sans', value: "'Noto Sans Devanagari', 'Noto Sans', sans-serif" },
                { label: 'Monospace', value: "'Courier New', Courier, monospace" }
            ],
            default: "'Noto Serif', 'Merriweather', Georgia, serif",
            apply: (v) => {
                try {
                    document.documentElement.style.setProperty('--verse-font-family', v);
                    ['text-panel-horizontal', 'text-panel-vertical'].forEach(id => {
                        const el = document.getElementById(id);
                        if (el) el.style.fontFamily = v;
                    });
                } catch (e) { /* silent */ }
            }
        },
        {
            id: 'chat-font-size',
            key: 'chatFontSize',
            options: ['12px', '14px', '16px', '18px', '20px'],
            default: '14px',
            apply: (v) => {
                try {
                    document.documentElement.style.setProperty('--chat-font-size', v);
                    ['chat-panel-horizontal', 'chat-panel-vertical'].forEach(id => {
                        const el = document.getElementById(id);
                        if (el) el.style.fontSize = v;
                    });
                } catch (e) { /* silent */ }
            }
        },
        {
            id: 'chat-font-family',
            key: 'chatFontFamily',
            options: [
                { label: 'Sans (default)', value: "'Noto Sans', Roboto, 'Helvetica Neue', Arial, sans-serif" },
                { label: 'Serif', value: "'Noto Serif', Georgia, serif" },
                { label: 'Monospace', value: "'Courier New', Courier, monospace" }
            ],
            default: "'Noto Sans', Roboto, 'Helvetica Neue', Arial, sans-serif",
            apply: (v) => {
                try {
                    document.documentElement.style.setProperty('--chat-font-family', v);
                    ['chat-panel-horizontal', 'chat-panel-vertical'].forEach(id => {
                        const el = document.getElementById(id);
                        if (el) el.style.fontFamily = v;
                    });
                } catch (e) { /* silent */ }
            }
        }
    ];

    controls.forEach(control => {
        const select = document.getElementById(control.id);
        if (!select) return;

        // populate options
        select.innerHTML = '';
        control.options.forEach(opt => {
            const option = document.createElement('option');
            if (typeof opt === 'string') {
                option.value = opt;
                option.textContent = opt;
            } else {
                option.value = opt.value;
                option.textContent = opt.label;
            }
            select.appendChild(option);
        });

        // set initial value from localStorage or default
        const stored = localStorage.getItem(control.key) || control.default;
        select.value = stored;
        control.apply(stored);

        // persist and apply on change
        select.addEventListener('change', function () {
            localStorage.setItem(control.key, this.value);
            control.apply(this.value);
        });
    });
}

// Theme color controls: wire UI to localStorage and CSS variables
function initThemeColorControls() {
    const defaults = {
        lightBg: '#ffffff',
        lightText: '#000000',
        lightMenuBg: '#333333',
        lightMenuText: '#ffffff',
        darkBg: '#121212',
        darkText: '#e0e0e0',
        darkMenuBg: '#1e1e1e',
        darkMenuText: '#ffffff'
    };

    const mapping = [
        { id: 'light-bg-color', key: 'lightBgColor', default: defaults.lightBg, cssVar: '--bg-color', target: 'root' },
        { id: 'light-text-color', key: 'lightTextColor', default: defaults.lightText, cssVar: '--text-color', target: 'root' },
        { id: 'light-menu-bg-color', key: 'lightMenuBgColor', default: defaults.lightMenuBg, cssVar: '--menu-bg-color', target: 'root' },
        { id: 'light-menu-text-color', key: 'lightMenuTextColor', default: defaults.lightMenuText, cssVar: '--menu-text-color', target: 'root' },

        { id: 'dark-bg-color', key: 'darkBgColor', default: defaults.darkBg, cssVar: '--bg-color', target: 'body' },
        { id: 'dark-text-color', key: 'darkTextColor', default: defaults.darkText, cssVar: '--text-color', target: 'body' },
        { id: 'dark-menu-bg-color', key: 'darkMenuBgColor', default: defaults.darkMenuBg, cssVar: '--menu-bg-color', target: 'body' },
        { id: 'dark-menu-text-color', key: 'darkMenuTextColor', default: defaults.darkMenuText, cssVar: '--menu-text-color', target: 'body' }
    ];

    function applyThemeValues() {
        // Apply light-theme values to :root
        mapping.filter(m => m.target === 'root').forEach(m => {
            const v = localStorage.getItem(m.key) || m.default;
            try { document.documentElement.style.setProperty(m.cssVar, v); } catch (e) { /* silent */ }
            const el = document.getElementById(m.id);
            if (el) el.value = v;
        });

        // For dark-theme values, set them on body only when dark-theme class is active.
        const darkActive = document.body.classList.contains('dark-theme');
        mapping.filter(m => m.target === 'body').forEach(m => {
            const v = localStorage.getItem(m.key) || m.default;
            const el = document.getElementById(m.id);
            if (el) el.value = v;
            try {
                if (darkActive) {
                    document.body.style.setProperty(m.cssVar, v);
                } else {
                    document.body.style.removeProperty(m.cssVar);
                }
            } catch (e) { /* silent */ }
        });
    }

    // initialize inputs and listeners
    mapping.forEach(m => {
        const input = document.getElementById(m.id);
        if (!input) return;
        const stored = localStorage.getItem(m.key) || m.default;
        try { input.value = stored; } catch (e) { /* ignore */ }

        input.addEventListener('input', function () {
            try { localStorage.setItem(m.key, this.value); } catch (e) { /* silent */ }
            applyThemeValues();
        });

        input.addEventListener('change', function () {
            try { localStorage.setItem(m.key, this.value); } catch (e) { /* silent */ }
            applyThemeValues();
        });
    });

    // Reset buttons
    const lightReset = document.getElementById('light-theme-reset');
    const darkReset = document.getElementById('dark-theme-reset');

    if (lightReset) {
        lightReset.addEventListener('click', () => {
            ['lightBgColor', 'lightTextColor', 'lightMenuBgColor', 'lightMenuTextColor'].forEach(key => localStorage.removeItem(key));
            applyThemeValues();
        });
    }

    if (darkReset) {
        darkReset.addEventListener('click', () => {
            ['darkBgColor', 'darkTextColor', 'darkMenuBgColor', 'darkMenuTextColor'].forEach(key => localStorage.removeItem(key));
            applyThemeValues();
        });
    }

    // Observe body class changes (theme toggle) and reapply theme vars accordingly
    const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            if (m.type === 'attributes' && m.attributeName === 'class') {
                applyThemeValues();
                break;
            }
        }
    });
    try { observer.observe(document.body, { attributes: true }); } catch (e) { /* silent */ }

    // initial apply
    applyThemeValues();

    // Folding / unfolding for theme sections using the expand icon (keyboard accessible)
    document.querySelectorAll('.theme-header .theme-expand-icon').forEach(icon => {
        const header = icon.closest('.theme-header');
        if (!header) return;
        const section = header.parentElement; // .settings-group
        if (!section || !section.id) return;
        const colors = section.querySelector('.theme-colors');
        if (!colors) return;

        const storageKey = 'settings.' + section.id + '.expanded';

        function setExpanded(expanded) {
            icon.textContent = expanded ? 'expand_less' : 'expand_more';
            icon.setAttribute('aria-expanded', expanded ? 'true' : 'false');
            try { localStorage.setItem(storageKey, expanded ? 'true' : 'false'); } catch (e) { /* silent */ }
            if (expanded) {
                colors.classList.remove('collapsed');
                colors.style.display = '';
            } else {
                colors.classList.add('collapsed');
                colors.style.display = 'none';
            }
        }

        // initialize state from storage (fall back to computed display)
        let initiallyVisible = null;
        try { initiallyVisible = localStorage.getItem(storageKey); } catch (e) { initiallyVisible = null; }
        if (initiallyVisible !== null) {
            setExpanded(initiallyVisible === 'true');
        } else {
            const computed = window.getComputedStyle(colors).display !== 'none';
            setExpanded(computed);
        }

        const toggle = (e) => {
            if (e) e.preventDefault();
            const currentlyVisible = window.getComputedStyle(colors).display !== 'none';
            setExpanded(!currentlyVisible);
        };

        icon.tabIndex = 0;
        icon.addEventListener('click', toggle);
        icon.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggle(e);
            }
        });
    });
}

// Background controls: wire UI to localStorage and dispatch events for background renderer
function initBackgroundControls() {
    const checkbox = document.getElementById('ornamented-background-enabled');
    const opacity = document.getElementById('background-opacity');
    const opacityValue = document.getElementById('background-opacity-value');
    const zoom = document.getElementById('background-zoom');
    const zoomValue = document.getElementById('background-zoom-value');

    if (!checkbox || !opacity || !zoom) return;

    // initialize from localStorage (background.js also does its own defaults)
    try {
        const storedEnabled = localStorage.getItem('ornamentedBackgroundEnabled');
        if (storedEnabled !== null) checkbox.checked = storedEnabled === 'true';
    } catch (e) { /* silent */ }

    try {
        const storedOpacity = localStorage.getItem('backgroundOpacity');
        if (storedOpacity !== null) opacity.value = storedOpacity;
    } catch (e) { /* silent */ }
    if (opacityValue) opacityValue.textContent = Math.round(parseFloat(opacity.value) * 100) + '%';

    try {
        const storedZoom = localStorage.getItem('backgroundZoom');
        if (storedZoom !== null) zoom.value = storedZoom;
    } catch (e) { /* silent */ }
    if (zoomValue) zoomValue.textContent = zoom.value + '%';

    function emitSettings() {
        const detail = {
            enabled: checkbox.checked,
            opacity: parseFloat(opacity.value),
            zoom: parseFloat(zoom.value)
        };
        document.dispatchEvent(new CustomEvent('backgroundSettingsChanged', { detail }));
    }

    checkbox.addEventListener('change', () => {
        try { localStorage.setItem('ornamentedBackgroundEnabled', checkbox.checked); } catch (e) { }
        emitSettings();
    });

    opacity.addEventListener('input', () => {
        if (opacityValue) opacityValue.textContent = Math.round(parseFloat(opacity.value) * 100) + '%';
        try { localStorage.setItem('backgroundOpacity', opacity.value); } catch (e) { }
        emitSettings();
    });

    opacity.addEventListener('change', () => {
        try { localStorage.setItem('backgroundOpacity', opacity.value); } catch (e) { }
        emitSettings();
    });

    zoom.addEventListener('input', () => {
        if (zoomValue) zoomValue.textContent = zoom.value + '%';
        try { localStorage.setItem('backgroundZoom', zoom.value); } catch (e) { }
        emitSettings();
    });

    zoom.addEventListener('change', () => {
        try { localStorage.setItem('backgroundZoom', zoom.value); } catch (e) { }
        emitSettings();
    });

    // emit initial settings once so background can initialize accordingly
    emitSettings();
}

function initTextRenderingControls()
{
    // Get current locale
    const localeData = window.localeData || {};
    if (!localeData) return;

    // Get current language
    let currentLang = localStorage.getItem('appLang') || 'English';

    // Update translation dropdown options
    const originalText = document.getElementById('original-text');
    const firstTranslation = document.getElementById('first-translation');
    const secondTranslation = document.getElementById('second-translation');

    if (!originalText || !firstTranslation || !secondTranslation) return;

    // storage keys
    const storageKeys = {
        original: 'originalTextOption',
        first: 'firstTranslationOption',
        second: 'secondTranslationOption'
    };

    // Safe accessor with fallback
    const L = (key, fallback) => (localeData[currentLang] && localeData[currentLang][key]) ? localeData[currentLang][key] : (fallback || key);

    // Original text options
    const originalOptions = [
        { value: 'disable', text: L('disable', 'Disable') },
        { value: 'sanskrit-multi', text: L('sanskrit_multi', 'Devanagari and IAST multi-line') },
        { value: 'sanskrit-single', text: L('sanskrit_single', 'Devanagari and IAST single-line') },
        { value: 'devanagari-multi', text: L('devanagari_multi', 'Devanagari only multi-line') },
        { value: 'devanagari-single', text: L('devanagari_single', 'Devanagari only single-line') },
        { value: 'iast-multi', text: L('iast_multi', 'IAST only multi-line') },
        { value: 'iast-single', text: L('iast_single', 'IAST only single-line') }
    ];

    // First/Second translation options (AI strings may be present)
    const firstOptions = [
        { value: 'disable', text: L('disable', 'Disable') },
    ];
    for (key in window.translations) {
        const langName = window.translations[key];
        firstOptions.push({ value: key, text: L(key, `AI ${langName} Translation`) });
    }

    const secondOptions = [
        { value: 'disable', text: L('disable', 'Disable') },
    ];
    for (key in window.translations) {
        const langName = window.translations[key];
        secondOptions.push({ value: key, text: L(key, `AI ${langName} Translation`) });
    }

    // helper to populate select and set stored/default value
    function populateSelect(selectEl, options, storedKey, defaultValue) {
        selectEl.innerHTML = options.map(opt => `<option value="${opt.value}">${opt.text}</option>`).join('');
        let stored = null;
        try { stored = localStorage.getItem(storedKey); } catch (e) { stored = null; }
        const values = options.map(o => o.value);
        if (stored && values.includes(stored)) {
            selectEl.value = stored;
        } else if (defaultValue && values.includes(defaultValue)) {
            selectEl.value = defaultValue;
            try { localStorage.setItem(storedKey, defaultValue); } catch (e) { /* silent */ }
        } else {
            // pick first option as fallback
            selectEl.value = values[0];
            try { localStorage.setItem(storedKey, values[0]); } catch (e) { /* silent */ }
        }
    }

    // Populate selects with safe defaults and persisted values
    populateSelect(originalText, originalOptions, storageKeys.original, 'sanskrit-multi');
    populateSelect(firstTranslation, firstOptions, storageKeys.first, 'disable');
    populateSelect(secondTranslation, secondOptions, storageKeys.second, 'disable');

    // Emit event with current selections
    function emitTextRenderingChanged() {
        const detail = {
            original: originalText.value,
            first: firstTranslation.value,
            second: secondTranslation.value
        };
        document.dispatchEvent(new CustomEvent('textRenderingChanged', { detail }));
    }

    // Wire change listeners to persist and emit
    originalText.addEventListener('change', function () {
        try { localStorage.setItem(storageKeys.original, this.value); } catch (e) { /* silent */ }
        emitTextRenderingChanged();
    });

    firstTranslation.addEventListener('change', function () {
        try { localStorage.setItem(storageKeys.first, this.value); } catch (e) { /* silent */ }
        emitTextRenderingChanged();
    });

    secondTranslation.addEventListener('change', function () {
        try { localStorage.setItem(storageKeys.second, this.value); } catch (e) { /* silent */ }
        emitTextRenderingChanged();
    });

    // Prevent disabling all three; if only one non-disabled select remains,
    // disable the "disable" option on that select so the user can't turn it off.
    const allSelects = [originalText, firstTranslation, secondTranslation];
    function updateDisableOptions() {
        try {
            const nonDisabled = allSelects.filter(s => s && s.value !== 'disable');
            if (nonDisabled.length <= 1) {
                // If there is exactly one non-disabled select, disable its 'disable' option
                const last = nonDisabled[0];
                allSelects.forEach(s => {
                    if (!s) return;
                    const opt = s.querySelector('option[value="disable"]');
                    if (!opt) return;
                    opt.disabled = (s === last);
                });
            } else {
                // More than one non-disabled: make sure 'disable' option is enabled everywhere
                allSelects.forEach(s => {
                    if (!s) return;
                    const opt = s.querySelector('option[value="disable"]');
                    if (opt) opt.disabled = false;
                });
            }
        } catch (e) { /* silent */ }
    }

    // Call update on change so UI reflects constraints immediately
    allSelects.forEach(s => {
        if (!s) return;
        s.addEventListener('change', updateDisableOptions);
    });

    // Initial enforcement
    updateDisableOptions();

    // initial emit so other modules can react
    emitTextRenderingChanged();
}

function initOllamaSettings() {
    // Helper to get localized string from loaded locale data
    const localeData = window.localeData || {};
    const currentLang = localStorage.getItem('appLang') || 'English';
    const L = (key, fallback) => (localeData[currentLang] && localeData[currentLang][key]) ? localeData[currentLang][key] : (fallback || key);

    const panel = document.getElementById('settings-panel');

    // Element getters
    const serverTypeSelect = document.getElementById('ollama-server-type');
    const localConfig = document.getElementById('local-server-config');
    const cloudConfig = document.getElementById('cloud-server-config');
    const serverUrlInput = document.getElementById('ollama-server-url');
    const apiKeyInput = document.getElementById('ollama-api-key');
    const saveKeyBtn = document.getElementById('save-api-key-btn');
    const deleteKeyBtn = document.getElementById('delete-api-key-btn');
    const modelSelect = document.getElementById('ollama-model');
    const promptInput = document.getElementById('ollama-system-prompt');
    const chatHistorySelect = document.getElementById('ollama-chat-history');
    const testBtn = panel ? panel.querySelector('.ai-test-btn') : null;
    const saveSettingsBtn = panel ? panel.querySelector('.ai-save-btn') : null;
    const statusIndicator = document.getElementById('ollama-status-indicator');
    const statusLabel = document.getElementById('ollama-status-label');
    const keyStatusEl = document.getElementById('key-status-message');
    const crowdsourceCheckbox = document.getElementById('crowdsource-analyses');
    const crowdsourcingContent = document.getElementById('crowdsourcing-content');
    const crowdsourcingNote = document.getElementById('crowdsourcing-note');

    let _settingsStatusTimeout = null;
    function showSettingsStatus(message, type) {
        // Reset previous timeout so messages don't overlap
        if (_settingsStatusTimeout) {
            clearTimeout(_settingsStatusTimeout);
            _settingsStatusTimeout = null;
        }

        if (statusIndicator) {
            statusIndicator.className = 'ai-status-indicator';
            statusIndicator.classList.add(type);
        }
        if (statusLabel) {
            statusLabel.className = 'ai-status-label';
            statusLabel.textContent = message;
            statusLabel.classList.add(type);
        }

        // Clear indicator and label (including text) after 3 seconds
        _settingsStatusTimeout = setTimeout(() => {
            if (statusIndicator) statusIndicator.className = 'ai-status-indicator';
            if (statusLabel) {
                statusLabel.className = 'ai-status-label';
                statusLabel.textContent = '';
            }
            _settingsStatusTimeout = null;
        }, 3000);

        console.log('Ollama Settings -', type, message);
    }

    function showKeyStatus(message, type) {
        if (!keyStatusEl) return;
        keyStatusEl.textContent = message;
        keyStatusEl.className = `key-status-message ${type} visible`;
        if (type === 'success' || type === 'info') {
            setTimeout(() => { keyStatusEl.classList.remove('visible'); }, 5000);
        }
    }

    function getServerType() {
        if (serverTypeSelect) return serverTypeSelect.value;
        return localStorage.getItem('ollamaServerType') || 'local';
    }

    function getServerUrl() {
        const serverType = getServerType();
        if (serverType === 'cloud') return 'https://ollama.com';
        return serverUrlInput ? serverUrlInput.value.trim() : (localStorage.getItem('ollamaServerUrl') || 'http://localhost:11434');
    }

    async function populateModelsDropdown(msel, serverUrl, selectedModel) {
        if (!msel) return;
        if (!serverUrl) {
            msel.innerHTML = '<option value="">Select a model...</option>';
            if (selectedModel) {
                const opt = document.createElement('option'); opt.value = selectedModel; opt.textContent = selectedModel; opt.selected = true; msel.appendChild(opt);
            }
            return;
        }

        const serverType = getServerType();

        if (serverType === 'cloud') {
            try {
                if (window.userManager && window.userManager.user) {
                    const resp = await fetch(`${GITHUB_CONFIG.serverURL}/api/ollama/list-models`, {
                        headers: { 'Authorization': `Bearer ${window.userManager.sessionToken}` }
                    });
                    if (resp.ok) {
                        const data = await resp.json();
                        if (data.models && Array.isArray(data.models) && data.models.length > 0) {
                            msel.innerHTML = '';
                            data.models.forEach(m => {
                                const o = document.createElement('option'); o.value = m.name; o.textContent = m.name; if (m.name === selectedModel) o.selected = true; msel.appendChild(o);
                            });
                            return;
                        }
                    }
                }
            } catch (e) { console.log('cloud models fetch failed', e); }

            const cloudModels = [
                'deepseek-v3.1:671b-cloud', 'gpt-oss:20b-cloud', 'gpt-oss:120b-cloud', 'kimi-k2:1t-cloud', 'qwen3-coder:480b-cloud', 'glm-4.6:cloud', 'minimax-m2:cloud'
            ];
            msel.innerHTML = '';
            cloudModels.forEach(name => { const o = document.createElement('option'); o.value = name; o.textContent = name; if (name === selectedModel) o.selected = true; msel.appendChild(o); });
            if (selectedModel && !cloudModels.includes(selectedModel)) { const o = document.createElement('option'); o.value = selectedModel; o.textContent = selectedModel; o.selected = true; msel.appendChild(o); }
            return;
        }

        // Local mode: fetch /api/tags
        try {
            const resp = await fetch(`${serverUrl}/api/tags`);
            if (!resp.ok) {
                msel.innerHTML = '<option value="">Select a model...</option>';
                if (selectedModel) { const o = document.createElement('option'); o.value = selectedModel; o.textContent = selectedModel; o.selected = true; msel.appendChild(o); }
                return;
            }
            const data = await resp.json();
            if (data.models && Array.isArray(data.models) && data.models.length > 0) {
                msel.innerHTML = '';
                data.models.forEach(m => { const o = document.createElement('option'); o.value = m.name; o.textContent = m.name; if (m.name === selectedModel) o.selected = true; msel.appendChild(o); });
                if (selectedModel && !data.models.some(m => m.name === selectedModel)) { const o = document.createElement('option'); o.value = selectedModel; o.textContent = selectedModel; o.selected = true; msel.appendChild(o); }
            } else {
                msel.innerHTML = '<option value="">Select a model...</option>';
                if (selectedModel) { const o = document.createElement('option'); o.value = selectedModel; o.textContent = selectedModel; o.selected = true; msel.appendChild(o); }
            }
        } catch (error) {
            console.error('Error fetching models list:', error);
            msel.innerHTML = '<option value="">Select a model...</option>';
            if (selectedModel) { const o = document.createElement('option'); o.value = selectedModel; o.textContent = selectedModel; o.selected = true; msel.appendChild(o); }
        }
    }

    async function checkSavedApiKey() {
        if (!window.userManager || !window.userManager.user) {
            showKeyStatus(L('login_for_cloud', 'Please login to use cloud features'), 'warning');
            return;
        }
        try {
            showKeyStatus(L('key_status_checking', 'Checking API key...'), 'info');
            const resp = await fetch(`${GITHUB_CONFIG.serverURL}/api/ollama/check-key`, { headers: { 'Authorization': `Bearer ${window.userManager.sessionToken}` } });
            const data = await resp.json();
            if (data.has_key) {
                if (apiKeyInput) { apiKeyInput.value = '********'; apiKeyInput.disabled = true; }
                if (saveKeyBtn) saveKeyBtn.textContent = L('reenter_key', 'Re-enter Key');
                if (deleteKeyBtn) deleteKeyBtn.style.display = 'inline-block';
                showKeyStatus(`${L('key_saved', 'API Key saved')} (${data.masked_key})`, 'success');
            } else {
                if (apiKeyInput) { apiKeyInput.value = ''; apiKeyInput.disabled = false; }
                if (saveKeyBtn) saveKeyBtn.textContent = L('save_key', 'Save Key Securely');
                if (deleteKeyBtn) deleteKeyBtn.style.display = 'none';
                showKeyStatus(L('no_key_saved', 'No API key saved'), 'info');
            }
        } catch (error) {
            console.error('Error checking API key:', error);
            showKeyStatus(L('key_save_failed', 'Failed to save API key'), 'error');
        }
    }

    async function handleSaveApiKey() {
        if (!apiKeyInput || !saveKeyBtn) return;
        if (saveKeyBtn.textContent === L('reenter_key', 'Re-enter Key')) {
            apiKeyInput.value = '';
            apiKeyInput.disabled = false;
            apiKeyInput.focus();
            saveKeyBtn.textContent = L('save_key', 'Save Key Securely');
            if (deleteKeyBtn) deleteKeyBtn.style.display = 'none';
            showKeyStatus(L('enter_api_key_placeholder', 'Enter your Ollama API key'), 'info');
            return;
        }
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey || apiKey === '********') { showKeyStatus(L('enter_api_key_placeholder', 'Enter your Ollama API key'), 'warning'); return; }
        if (apiKey.length < 20) { showKeyStatus(L('key_invalid_format', 'API key appears to be invalid (too short)'), 'error'); return; }
        if (!window.userManager || !window.userManager.user) { showKeyStatus(L('login_for_cloud', 'Please login to use cloud features'), 'error'); return; }
        try {
            showKeyStatus(L('key_status_saving', 'Saving API key...'), 'info');
            const resp = await fetch(`${GITHUB_CONFIG.serverURL}/api/ollama/store-key`, {
                method: 'POST', headers: { 'Authorization': `Bearer ${window.userManager.sessionToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ ollama_api_key: apiKey })
            });
            const data = await resp.json();
            if (data.status === 'success') { showKeyStatus(L('key_saved', 'API Key saved'), 'success'); await checkSavedApiKey(); }
            else { showKeyStatus(L('key_save_failed', 'Failed to save API key') + ': ' + (data.message || ''), 'error'); }
        } catch (error) { console.error('Error saving API key:', error); showKeyStatus(L('key_save_failed', 'Failed to save API key'), 'error'); }
    }

    async function handleDeleteApiKey() {
        if (!confirm(L('key_delete_confirm', 'Are you sure you want to delete your saved API key?'))) return;
        if (!window.userManager || !window.userManager.user) { showKeyStatus(L('login_for_cloud', 'Please login to use cloud features'), 'error'); return; }
        try {
            showKeyStatus(L('key_status_deleting', 'Deleting API key...'), 'info');
            const csrf = (window.userManager && typeof window.userManager.getCSRFToken === 'function') ? await window.userManager.getCSRFToken() : null;
            const headers = { 'Authorization': `Bearer ${window.userManager.sessionToken}` };
            if (csrf) headers['X-CSRF-Token'] = csrf;
            const resp = await fetch(`${GITHUB_CONFIG.serverURL}/api/ollama/delete-key`, { method: 'DELETE', headers });
            const data = await resp.json();
            if (data.status === 'success') {
                if (apiKeyInput) { apiKeyInput.value = ''; apiKeyInput.disabled = false; }
                if (saveKeyBtn) saveKeyBtn.textContent = L('save_key', 'Save Key Securely');
                if (deleteKeyBtn) deleteKeyBtn.style.display = 'none';
                showKeyStatus(L('no_key_saved', 'No API key saved'), 'info');
            } else { showKeyStatus(L('key_delete_failed', 'Failed to delete API key'), 'error'); }
        } catch (error) { console.error('Error deleting API key:', error); showKeyStatus(L('key_delete_failed', 'Failed to delete API key'), 'error'); }
    }

    async function updateModelDropdown() {
        if (!modelSelect) return;
        const serverType = getServerType();
        const serverUrl = getServerUrl();
        const currentModel = localStorage.getItem('ollamaModel') || '';
        await populateModelsDropdown(modelSelect, serverUrl, currentModel);
    }

    function updateLocalizedUI() {
        // Update static localized elements inside settings panel if any
        if (!panel) return;
        // Update crowdsourcing note text
        if (crowdsourcingNote) {
            if (getServerType() === 'cloud') crowdsourcingNote.textContent = L('crowdsourcing_available_note', 'Only available when using Ollama Cloud models');
            else crowdsourcingNote.textContent = L('crowdsourcing_disabled_note', 'Crowdsourcing requires Ollama Cloud models');
        }
    }

    function loadSettingsToForm() {
        const serverType = localStorage.getItem('ollamaServerType') || 'local';
        const serverUrl = localStorage.getItem('ollamaServerUrl') || 'http://localhost:11434';
        const model = localStorage.getItem('ollamaModel') || '';
        const systemPrompt = localStorage.getItem('ollamaSystemPrompt') || 'You are an assistant helping with the Mahabharata and Sanskrit studies. Respond in the language of the user\'s query.';
        const crowdsourceAnalysis = localStorage.getItem('crowdsourceAnalysis') === 'true';
        const chatHistory = localStorage.getItem('ollamaChatHistory') || 'last_6';

        if (serverTypeSelect) serverTypeSelect.value = serverType;
        if (serverUrlInput) serverUrlInput.value = serverUrl;
        if (promptInput) promptInput.value = systemPrompt;
        if (crowdsourceCheckbox) crowdsourceCheckbox.checked = crowdsourceAnalysis;
        if (chatHistorySelect) chatHistorySelect.value = chatHistory;

        // Reflect UI for server type
        handleServerTypeChange();

        // Populate models
        if (modelSelect) populateModelsDropdown(modelSelect, getServerUrl(), model);
    }

    function saveSettings() {
        if (serverTypeSelect) localStorage.setItem('ollamaServerType', serverTypeSelect.value);
        if (crowdsourceCheckbox) localStorage.setItem('crowdsourceAnalysis', crowdsourceCheckbox.checked ? 'true' : 'false');
        if (chatHistorySelect) localStorage.setItem('ollamaChatHistory', chatHistorySelect.value);
        if (serverUrlInput && modelSelect && promptInput) {
            localStorage.setItem('ollamaServerUrl', serverUrlInput.value.trim());
            localStorage.setItem('ollamaModel', modelSelect.value.trim());
            localStorage.setItem('ollamaSystemPrompt', promptInput.value.trim());
            showSettingsStatus(L('key_saved', 'Settings saved successfully!'), 'success');
            // notify other modules
            document.dispatchEvent(new CustomEvent('ollamaSettingsChanged'));
        }
    }

    async function testConnection() {
        const serverType = getServerType();
        const serverUrl = getServerUrl();
        if (!modelSelect) { showSettingsStatus(L('error_loading_data', 'Configuration fields are missing!'), 'error'); return; }
        const model = modelSelect.value.trim();
        if (!serverUrl || !model) { showSettingsStatus(L('error_loading_data', 'Please enter both server URL and model name.'), 'error'); return; }

        try {
            showSettingsStatus(L('key_status_checking', 'Checking API key...'), 'info');
            const headers = {};
            if (serverType === 'cloud') {
                if (!window.userManager || !window.userManager.user) { showSettingsStatus(L('login_for_cloud', 'Please login to use cloud features'), 'error'); return; }
                try {
                    const keyResp = await fetch(`${GITHUB_CONFIG.serverURL}/api/ollama/get-key`, { headers: { 'Authorization': `Bearer ${window.userManager.sessionToken}` } });
                    const keyData = await keyResp.json();
                    if (!keyData.has_key) { showSettingsStatus(L('no_key_saved', 'Please save your Ollama API key in settings first'), 'error'); return; }
                    headers['Authorization'] = `Bearer ${keyData.api_key}`;
                } catch (err) { showSettingsStatus(L('session_expired_cloud', 'Session expired. Please login again to use cloud features.'), 'error'); return; }
                // For cloud, just verify model selection
                if (model && model.length > 0) { showSettingsStatus(L('ollama_check_server_settings', 'Cloud configuration verified!'), 'success'); } else { showSettingsStatus(L('error_loading_data', 'Please select a cloud model'), 'error'); }
                return;
            }

            // Local mode: test /api/tags
            const resp = await fetch(`${serverUrl}/api/tags`, { headers });
            if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
            const data = await resp.json();
            const modelExists = data.models && data.models.some(m => m.name.includes(model));
            if (modelExists) { showSettingsStatus(L('connection_test_successful', 'Connection test successful!'), 'success'); if (modelSelect) await populateModelsDropdown(modelSelect, serverUrl, model); }
            else { showSettingsStatus(L('model_not_found', `Model '${model}' not found on server.`), 'error'); }
        } catch (error) { console.error('Ollama connection test failed:', error); showSettingsStatus(L('connection_test_failed', `Connection test failed: ${error.message}`), 'error'); }
    }

    function handleServerTypeChange() {
        const st = getServerType();
        if (st === 'cloud') {
            if (localConfig) localConfig.style.display = 'none';
            if (cloudConfig) cloudConfig.style.display = 'block';
            if (crowdsourcingContent) crowdsourcingContent.classList.remove('disabled');
            if (crowdsourceCheckbox) crowdsourceCheckbox.disabled = false;
            if (crowdsourcingNote) { crowdsourcingNote.textContent = L('crowdsourcing_available_note', 'Only available when using Ollama Cloud models'); }
            if (!window.userManager || !window.userManager.user) {
                showKeyStatus(L('login_for_cloud', 'Please login to use cloud features'), 'warning');
                if (apiKeyInput) apiKeyInput.disabled = true;
            } else {
                checkSavedApiKey();
            }
        } else {
            if (localConfig) localConfig.style.display = 'block';
            if (cloudConfig) cloudConfig.style.display = 'none';
            if (crowdsourcingContent) crowdsourcingContent.classList.add('disabled');
            if (crowdsourceCheckbox) { crowdsourceCheckbox.disabled = true; crowdsourceCheckbox.checked = false; }
            if (crowdsourcingNote) crowdsourcingNote.textContent = L('crowdsourcing_disabled_note', 'Crowdsourcing requires Ollama Cloud models');
        }
        updateModelDropdown();
    }

    // Wire up events
    if (serverTypeSelect) serverTypeSelect.addEventListener('change', handleServerTypeChange);
    if (serverUrlInput) {
        serverUrlInput.addEventListener('blur', () => { if (modelSelect) populateModelsDropdown(modelSelect, serverUrlInput.value.trim(), modelSelect.value); });
        serverUrlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && modelSelect) populateModelsDropdown(modelSelect, serverUrlInput.value.trim(), modelSelect.value); });
    }
    if (saveKeyBtn) saveKeyBtn.addEventListener('click', handleSaveApiKey);
    if (deleteKeyBtn) deleteKeyBtn.addEventListener('click', handleDeleteApiKey);
    if (testBtn) testBtn.addEventListener('click', testConnection);
    if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', saveSettings);

    // Refresh cloud key UI when settings panel opens
    document.addEventListener('settingsOpened', () => {
        try {
            if (getServerType && getServerType() === 'cloud') {
                if (window.userManager && window.userManager.user) {
                    checkSavedApiKey();
                } else {
                    // user logged out or not available - show login prompt
                    showKeyStatus(L('login_for_cloud', 'Please login to use cloud features'), 'warning');
                }
            }
        } catch (e) { /* silent */ }
    });

    // Populate initial state
    loadSettingsToForm();
    updateLocalizedUI();

    // Expose a small runtime helper for other modules to read Ollama settings
    // and obtain auth headers for cloud proxy requests. Functions read
    // current storage/UI state so callers don't need to watch events.
    window.ollamaSettingsAPI = {
        getServerType: () => getServerType(),
        getServerUrl: () => getServerUrl(),
        getModel: () => (localStorage.getItem('ollamaModel') || ''),
        getSystemPrompt: () => (localStorage.getItem('ollamaSystemPrompt') ||
            'You are an assistant helping with the Mahabharata and Sanskrit studies. Respond in the language of the user\'s query.'),
        getChatHistorySetting: () => (localStorage.getItem('ollamaChatHistory') || 'last_6'),
        // Returns headers (may include Authorization and X-CSRF-Token) for cloud proxy calls
        getAuthHeaders: async () => {
            const headers = {};
            const st = getServerType();
            if (st === 'cloud') {
                if (window.userManager && window.userManager.sessionToken) {
                    headers['Authorization'] = `Bearer ${window.userManager.sessionToken}`;
                    try {
                        if (typeof window.userManager.getCSRFToken === 'function') {
                            const csrf = await window.userManager.getCSRFToken();
                            if (csrf) headers['X-CSRF-Token'] = csrf;
                        }
                    } catch (e) { /* ignore */ }
                }
            }
            return headers;
        }
    };
}

function initSettingsPanel() {
    const settingsPanel =  document.getElementById('settings-panel');
    document.getElementById('settings-icon').onclick = function() {
        if (settingsPanel.style.display === 'none' || settingsPanel.style.display === '') {
            settingsPanel.style.display = 'block';
            try { document.dispatchEvent(new Event('settingsOpened')); } catch (e) { /* silent */ }
        } else {
            settingsPanel.style.display = 'none';
        }
    };
    document.getElementById('settings-close').onclick = function() {
        settingsPanel.style.display = 'none';
    };
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            settingsPanel.style.display = 'none';
        }
    });

    document.getElementById('language-select').addEventListener('change', function() {
        localStorage.setItem('appLang', this.value);
        applyLocalization();
    });

    initFontControls();

    initThemeColorControls();

    initBackgroundControls();

    initTextRenderingControls();

    initOllamaSettings();
 }
 