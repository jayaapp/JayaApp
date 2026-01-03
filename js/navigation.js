// Book selection panel functions
function initBookSelectionPanel(bookKeys) {
    const overlay = document.querySelector('.book-selection-overlay');
    const panel = document.querySelector('.book-selection-panel');
    const content = document.querySelector('.book-selection-content');
    const closeBtn = document.querySelector('.book-selection-close');

    // Clear current app language
    let currentLang = localStorage.getItem('appLang') || 'English';
    
    // Get book titles from locale data
    const bookTitles = window.localeData[currentLang].book_titles || {};
    
    // Populate the panel with book items
    content.innerHTML = bookKeys.map(key => {
        const title = bookTitles[key.toString()] || `Book ${key}`;
        return `
            <div class="book-item" data-book="${key}">
                <span class="book-number">${key}.</span>
                <span class="book-title">${title}</span>
            </div>
        `;
    }).join('');
    
    // Add event listeners
    overlay.addEventListener('click', hideBookSelectionPanel);
    closeBtn.addEventListener('click', hideBookSelectionPanel);
    
    // Add keyboard support
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && panel.classList.contains('active')) {
            hideBookSelectionPanel();
        }
    });
    
    // Add click handlers for book items
    content.addEventListener('click', function(e) {
        const bookItem = e.target.closest('.book-item');
        if (bookItem) {
            const bookNumber = bookItem.dataset.book;
            selectBook(bookNumber);
            // User-initiated navigation: clear any deep-link params from the URL
            try { if (typeof window.clearURLBookChapter === 'function') window.clearURLBookChapter(); } catch (e) { /* ignore */ }
        }
    });
    
    // Update selected book highlighting
    updateBookSelection();
}

function showBookSelectionPanel() {
    const overlay = document.querySelector('.book-selection-overlay');
    const panel = document.querySelector('.book-selection-panel');
    
    updateBookSelection(); // Update highlighting
    overlay.classList.add('active');
    panel.classList.add('active');
}

function hideBookSelectionPanel() {
    const overlay = document.querySelector('.book-selection-overlay');
    const panel = document.querySelector('.book-selection-panel');
    
    overlay.classList.remove('active');
    panel.classList.remove('active');
}

function updateBookSelection() {
    const bookSelect = document.getElementById('book-select');
    const currentBook = bookSelect.value;
    
    // Update highlighting in the panel
    document.querySelectorAll('.book-item').forEach(item => {
        item.classList.remove('selected');
        if (item.dataset.book === currentBook) {
            item.classList.add('selected');
        }
    });
}

function selectBook(bookNumber) {
    const bookSelect = document.getElementById('book-select');
    bookSelect.value = bookNumber;
    
    // Trigger change event to update chapters
    bookSelect.dispatchEvent(new Event('change'));
    
    hideBookSelectionPanel();
}

// Listen for locale changes to update book panel
document.addEventListener('localeChanged', function() {
    const bookSelect = document.getElementById('book-select');
    if (bookSelect && bookSelect.options.length > 0) {
        const bookKeys = Array.from(bookSelect.options).map(option => parseInt(option.value));
        initBookSelectionPanel(bookKeys);
    }
});

// Update chapters based on new selected book
function updateChapters() {
    const bookIndex = document.getElementById('book-select').value;
    const chapterSelect = document.getElementById('chapter-select');

    if (!window.mahabharata || !window.mahabharata[bookIndex]) {
        console.error('[updateChapters] No data for bookIndex:', bookIndex);
        console.error('[updateChapters] Available book indices:', Object.keys(window.mahabharata || {}));
        return;
    }

    // Convert string keys to numbers and sort them in the ascending order
    const chapterKeys = Object.keys(window.mahabharata[bookIndex]).map(Number).sort((a, b) => a - b);
    chapterSelect.innerHTML = chapterKeys.map((key) => `<option value="${key}">${key}</option>`).join('');

    // Notify text rendering module on book/chapter change
    document.dispatchEvent(new Event('bookChapterChanged'));
}

async function loadJSON(file) {
    try {
        const response = await fetch(file);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Failed to load ${file}:`, error);
        throw error; // Re-throw so caller can handle it
    }
}

function initNavigation() {
    // Ensure global containers exist
    window.translation = window.translation || {};
    window.mahabharata = window.mahabharata || {};

    // If mahabharata isn't present, start background loading (non-blocking)
    if (!Object.keys(window.mahabharata).length) {
        loadJSON('data/maha_sa.json')
            .then(json => {
                window.mahabharata = json || {};
                // If the book-select exists, populate/update it now that data arrived
                const bookSelect = document.getElementById('book-select');
                if (bookSelect) {
                    const bookKeys = Object.keys(window.mahabharata).map(Number).sort((a, b) => a - b);
                    bookSelect.innerHTML = bookKeys.map((key) => `<option value="${key}">${key}</option>`).join('');
                    initBookSelectionPanel(bookKeys);
                    updateChapters();
                    // Apply any book/chapter parameters from the URL (e.g., ?book=2&chapter=3)
                    try { applyURLParameters(); } catch (e) { console.error('applyURLParameters error', e); }
                }
            })
            .catch(e => {
                console.error('Failed to load maha_sa.json in navigation init:', e);
            });
    }

    // Load any missing translations in parallel (non-blocking)
    const translationKeys = Object.keys(window.translations || {});
    const missing = translationKeys.filter(k => !window.translation[k]);
    if (missing.length > 0) {
        Promise.all(missing.map(k =>
            loadJSON(`data/${k}.json`)
                .then(json => { window.translation[k] = json; })
                .catch(e => { console.error(`Failed to load translation ${k}:`, e); window.translation[k] = {}; })
        )).then(() => { /* Silently complete */ });
    }

    // Initialize book selection (numbers only) using whatever data is currently available
    const bookSelect = document.getElementById('book-select');
    const bookKeys = Object.keys(window.mahabharata).map(Number).sort((a, b) => a - b);

    // Helper: parse book/chapter/verse from URL (search, hash, or pathname like /book=2&chapter=2&verse=45)
    function parseBookChapterFromURL() {
        let book = null;
        let chapter = null;
        let verse = null;

        // 1) Try query string
        try {
            const qs = new URLSearchParams(window.location.search);
            if (qs.has('book')) book = Number(qs.get('book')) || null;
            if (qs.has('chapter')) chapter = Number(qs.get('chapter')) || null;
            if (qs.has('verse')) verse = Number(qs.get('verse')) || null;
        } catch (e) { /* ignore malformed */ }

        // 2) Try hash
        if (book === null && chapter === null && verse === null) {
            try {
                const hash = window.location.hash.replace(/^#/, '');
                if (hash) {
                    const hs = new URLSearchParams(hash);
                    if (hs.has('book')) book = Number(hs.get('book')) || null;
                    if (hs.has('chapter')) chapter = Number(hs.get('chapter')) || null;
                    if (hs.has('verse')) verse = Number(hs.get('verse')) || null;
                }
            } catch (e) { /* ignore */ }
        }

        // 3) Try pathname fallback (e.g., /book=2&chapter=2&verse=45)
        if (book === null && chapter === null && verse === null) {
            try {
                const path = window.location.pathname || '';
                const mBook = path.match(/(?:^|\/)book=(\d+)/);
                const mChap = path.match(/(?:^|\/)chapter=(\d+)/);
                const mVerse = path.match(/(?:^|\/)verse=(\d+)/);
                if (mBook) book = Number(mBook[1]);
                if (mChap) chapter = Number(mChap[1]);
                if (mVerse) verse = Number(mVerse[1]);
            } catch (e) { /* ignore */ }
        }

        return { book, chapter, verse };
    }

    // Helper: apply parsed params to UI (only if matching options exist)
    function applyURLParameters() {
        if (!bookSelect) return;
        const params = parseBookChapterFromURL();
        let applied = false;
        if (params.book !== null) {
            const hasBook = Array.from(bookSelect.options).some(o => Number(o.value) === Number(params.book));
            if (hasBook) {
                bookSelect.value = params.book;
                // Trigger change to update chapters
                bookSelect.dispatchEvent(new Event('change'));
                applied = true;
            }
        }

        if (params.chapter !== null) {
            const chapterSelect = document.getElementById('chapter-select');
            if (chapterSelect) {
                const hasChapter = Array.from(chapterSelect.options).some(o => Number(o.value) === Number(params.chapter));
                if (hasChapter) {
                    chapterSelect.value = params.chapter;
                    chapterSelect.dispatchEvent(new Event('change'));
                    applied = true;
                }
            }
        }

        // If verse parameter exists, navigate directly to that verse
        if (params.verse !== null && params.book !== null && params.chapter !== null) {
            // Use gotToBookChapterVerse from text.js to scroll to the specific verse
            setTimeout(() => {
                if (typeof gotToBookChapterVerse === 'function') {
                    gotToBookChapterVerse(params.book, params.chapter, params.verse);
                }
            }, 100);
        }

        // If any URL parameter was applied, set a flag so other modules (e.g. restoreLastPositionOnce)
        // respect the user's explicit navigation and don't override it with the previously saved last position.
        if (applied) {
            try { window._jayaapp_appliedURLBookChapter = true; } catch (e) { /* ignore */ }
        }

        // Expose helper to clear deep-link params from the address bar so other modules
        // (including gotToBookChapterVerse) can call it after internal navigation.
        try {
            window.clearURLBookChapter = function clearURLBookChapter() {
                try {
                    const u = new URL(window.location.href);
                    let changed = false;
                    if (u.searchParams.has('book')) { u.searchParams.delete('book'); changed = true; }
                    if (u.searchParams.has('chapter')) { u.searchParams.delete('chapter'); changed = true; }
                    if (u.searchParams.has('verse')) { u.searchParams.delete('verse'); changed = true; }

                    // Handle hash-form parameters (e.g., #book=2&chapter=3&verse=45)
                    if (window.location.hash) {
                        try {
                            const h = window.location.hash.replace(/^#/, '');
                            const hs = new URLSearchParams(h);
                            if (hs.has('book') || hs.has('chapter') || hs.has('verse')) {
                                hs.delete('book'); hs.delete('chapter'); hs.delete('verse');
                                const newHash = hs.toString();
                                if (newHash) u.hash = '#' + newHash; else u.hash = '';
                                changed = true;
                            }
                        } catch (e) {
                            // If hash is non-URLSearchParams, just clear it when it contains book= or chapter= or verse=
                            if (/book=\d+/.test(window.location.hash) || /chapter=\d+/.test(window.location.hash) || /verse=\d+/.test(window.location.hash)) {
                                u.hash = '';
                                changed = true;
                            }
                        }
                    }

                    // Remove any /book=... or /chapter=... or /verse=... occurrences from pathname
                    const origPath = u.pathname;
                    let newPath = origPath.replace(/\/?book=\d+/g, '').replace(/\/?chapter=\d+/g, '').replace(/\/?verse=\d+/g, '');
                    // Normalize double slashes
                    newPath = newPath.replace(/\/+/g, '/');
                    if (newPath !== origPath) { u.pathname = newPath; changed = true; }

                    if (changed) {
                        const newUrl = `${u.pathname}${u.search}${u.hash}`;
                        history.replaceState({}, document.title, newUrl);
                    }
                } catch (e) { /* ignore */ }
            };
        } catch (e) { /* ignore */ }
    }

    if (bookSelect) {
        // Populate with numbers only
        bookSelect.innerHTML = bookKeys.map((key) => `<option value=\"${key}\">${key}</option>`).join('');

        // Initialize book selection panel
        initBookSelectionPanel(bookKeys);

        // Replace dropdown behavior with panel
        bookSelect.addEventListener('mousedown', function(e) {
            e.preventDefault();
            showBookSelectionPanel();
        });

        // Prevent the dropdown from opening on click
        bookSelect.addEventListener('click', function(e) {
            e.preventDefault();
        });

        bookSelect.addEventListener('change', function(e) {
            updateChapters();
            // If this is a user-initiated change (trusted event), clear deep-link params
            try { if (e && e.isTrusted && typeof window.clearURLBookChapter === 'function') window.clearURLBookChapter(); } catch (err) { /* ignore */ }
        });

        // Initial chapters update (uses existing data)
        updateChapters();

        // Apply any book/chapter parameters from the URL
        try { applyURLParameters(); } catch (e) { console.error('applyURLParameters error', e); }
    }

    const chapterSelect = document.getElementById('chapter-select');

    if (chapterSelect) {
        chapterSelect.addEventListener('change', function(e) {
            // Notify text rendering module on book/chapter change
            document.dispatchEvent(new Event('bookChapterChanged'));
            // If user changed chapter directly, clear deep-link params
            try { if (e && e.isTrusted && typeof window.clearURLBookChapter === 'function') window.clearURLBookChapter(); } catch (err) { /* ignore */ }
        });
    }
}