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

        // Declare available translations 
        window.translations = {
            'maha_en': 'English',
            'maha_pl': 'Polish'
        };

        // Declare available HTML modules
        const htmlModules = [
            'settings',
            'booksel',
            'notes'
        ];

        // Ensure translation object exists
        window.translation = window.translation || {};

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

        // Preload background image and expose a reusable cache to other modules
        window.backgroundImageUrl = window.backgroundImageUrl || 'assets/background.png';
        const bgImagePromise = new Promise((resolve) => {
            try {
                const img = new Image();
                img.onload = () => {
                    window.backgroundImageCache = {
                        element: img,
                        width: img.naturalWidth,
                        height: img.naturalHeight,
                        url: window.backgroundImageUrl
                    };
                    resolve({ ok: true });
                };
                img.onerror = (err) => {
                    console.warn('Background preload failed:', err);
                    resolve({ ok: false });
                };
                img.src = window.backgroundImageUrl;
            } catch (e) {
                console.warn('Background preload exception', e);
                resolve({ ok: false });
            }
        });

        // Wait for everything (JSON + HTML + background image) to settle
        Promise.allSettled([ ...jsonPromises, ...htmlPromises, bgImagePromise ])
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
                try { initBackground(); } catch (e) { console.error('initBackground error', e); }   
                try { initNavigation(); } catch (e) { console.error('initNavigation error', e); }
                try { initClicks(); } catch (e) { console.error('initClicks error', e); }

                // Optional: log any failures for debugging
                const failures = results.filter(r => r.status === 'rejected');
                if (failures.length) console.warn('Some startup resources failed to load', failures.length);
            });
    }

    document.addEventListener('DOMContentLoaded', initApp);
})();