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
}

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
}
 