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
}
 