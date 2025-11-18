// Lowest latency initialization script
(function() {
    // Determine orientation and retrieve saved split percentage
    var isVertical = window.matchMedia('(orientation: portrait)').matches;
    var orientation = isVertical ? 'vertical' : 'horizontal';
    var percentage = localStorage.getItem('split-' + orientation) || 50;
    function setSplit() {
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

    function setLocale() {
        fetch('data/locale.json')
            .then(res => res.json())
            .then(data => {
                window.localeData = data;
                // Add keys of data object as options to language select
                const langSelect = document.getElementById('language-select');
                for (const langName in data) {
                    const option = document.createElement('option');
                    option.value = langName;
                    option.textContent = data[langName]['language-name'] || langName;
                    langSelect.appendChild(option);
                }
                applyLocalization();
            });
    }

    function initApp() {
        setSplit();
        setLocale();
    }
    document.addEventListener('DOMContentLoaded', initApp);
})();