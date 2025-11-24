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

    function initApp() {
        setSplit();

        // Declare translation mapping early so other modules can see the keys
        window.translations = {
            'maha_en': 'English',
            'maha_pl': 'Polish'
        };
        window.translation = window.translation || {};

        const htmlModules = [ 'settings', 'booksel' ];

        // Helper to fetch JSON and assign a value safely
        function fetchJsonAssign(path, assignFn) {
            return fetch(path)
                .then(response => {
                    if (!response.ok) throw new Error(`${path} -> ${response.status}`);
                    return response.json();
                })
                .then(json => assignFn(json))
                .catch(err => {
                    console.error(`Failed to load ${path}:`, err);
                });
        }

        // Helper to fetch HTML and inject into container
        function fetchHtmlInject(moduleName) {
            return fetch(`html/${moduleName}.html`)
                .then(response => {
                    if (!response.ok) throw new Error(`html/${moduleName}.html -> ${response.status}`);
                    return response.text();
                })
                .then(html => {
                    const container = document.getElementById(`${moduleName}-panel-container`);
                    if (container) container.innerHTML = html;
                })
                .catch(err => {
                    console.error(`Failed to load html/${moduleName}.html:`, err);
                });
        }

        // Build promises for JSON resources
        const jsonPromises = [];
        jsonPromises.push(fetchJsonAssign('data/locale.json', json => { window.localeData = json; }));
        if (!window.mahabharata) {
            jsonPromises.push(fetchJsonAssign('data/maha_sa.json', json => { window.mahabharata = json; }));
        }
        for (const key of Object.keys(window.translations)) {
            if (!window.translation[key]) {
                jsonPromises.push(fetchJsonAssign(`data/${key}.json`, json => { window.translation[key] = json; }));
            }
        }

        // Build promises for HTML modules
        const htmlPromises = htmlModules.map(fetchHtmlInject);

        // Wait for everything (JSON + HTML) to settle
        Promise.allSettled([ ...jsonPromises, ...htmlPromises ])
            .then((results) => {
                // Populate language select from locale data (if present)
                const langSelect = document.getElementById('language-select');
                if (window.localeData && langSelect) {
                    langSelect.innerHTML = '';
                    for (const langName in window.localeData) {
                        const option = document.createElement('option');
                        option.value = langName;
                        option.textContent = langName;
                        langSelect.appendChild(option);
                    }
                }

                // Apply localization and initialize panels
                try { applyLocalization(); } catch (e) { console.error('applyLocalization error', e); }
                try { initSettingsPanel(); } catch (e) { console.error('initSettingsPanel error', e); }

                // Initialize navigation after locale and data are (attempted) loaded
                try { initNavigation(); } catch (e) { console.error('initNavigation error', e); }

                // Optional: log any failures for debugging
                const failures = results.filter(r => r.status === 'rejected');
                if (failures.length) console.warn('Some startup resources failed to load', failures.length);
            });
    }

    document.addEventListener('DOMContentLoaded', initApp);
})();