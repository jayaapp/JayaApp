// Lowest latency initialization script
(function() {
    // Determine orientation and retrieve saved split percentage
    function setSplit() {
        var isVertical = window.matchMedia('(orientation: portrait)').matches;
        var orientation = isVertical ? 'vertical' : 'horizontal';
        var percentage = localStorage.getItem('split-' + orientation) || 50;
        if (isVertical) {
            var top = document.querySelector('.top-panel');
            var bottom = document.querySelector('.bottom-panel');
            if (top && bottom) {
                top.style.flex = '0 0 ' + percentage + '%';
                bottom.style.flex = '0 0 ' + (100 - percentage) + '%';
            }
        } else {
            var left = document.querySelector('.left-panel');
            var right = document.querySelector('.right-panel');
            if (left && right) {
                left.style.flex = '0 0 ' + percentage + '%';
                right.style.flex = '0 0 ' + (100 - percentage) + '%';
            }
        }
    }

    // Load localization data and populate language select
    function setLocale() {
        fetch('data/locale.json')
            .then(response => response.json())
            .then(data => {
                window.localeData = data;
                // Add keys of data object as options to language select
                const langSelect = document.getElementById('language-select');
                for (const langName in data) {
                    const option = document.createElement('option');
                    option.value = langName;
                    option.textContent = langName;
                    langSelect.appendChild(option);
                }
                // Apply localization after populating language select
                applyLocalization();

                // Then initialize individual modules
                initSettingsPanel();
            });
    }

    // Inject HTML modules stored in separate files
    function injectHtml() {
        fetch('html/settings.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('settings-panel-container').innerHTML = html;

            // After injecting all HTML modules, set up localization
            setLocale();
        });
    }

    function initApp() {
        setSplit();
        injectHtml();
    }

    document.addEventListener('DOMContentLoaded', initApp);
})();