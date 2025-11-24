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
        firstOptions.push({ value: `data/${key}.json`, text: L(key, `AI ${langName} Translation`) });
    }

    const secondOptions = [
        { value: 'disable', text: L('disable', 'Disable') },
    ];
    for (key in window.translations) {
        const langName = window.translations[key];
        secondOptions.push({ value: `data/${key}.json`, text: L(key, `AI ${langName} Translation`) });
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

    // initial emit so other modules can react
    emitTextRenderingChanged();
}

function initSettingsPanel() {
    const settingsPanel =  document.getElementById('settings-panel');
    document.getElementById('settings-icon').onclick = function() {
        if (settingsPanel.style.display === 'none' || settingsPanel.style.display === '') {
            settingsPanel.style.display = 'block';
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
 }
 