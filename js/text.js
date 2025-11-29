function renderWhenReady(container) {
    let bookSelect = document.getElementById('book-select')
    let chapterSelect = document.getElementById('chapter-select')
    let originalText = document.getElementById('original-text');
    let firstTranslation = document.getElementById('first-translation');
    let secondTranslation = document.getElementById('second-translation');

    // Reset line elements
    lineElements = [];
    const bookIndex = bookSelect.value;
    const chapterIndex = chapterSelect.value;
    const bookKey = String(Number(bookIndex));
    const chapterKey = String(Number(chapterIndex));

    // Render verses only if at least one view is enabled
    if (originalText.value !== 'disable' || firstTranslation.value !== 'disable' || secondTranslation.value !== 'disable') {
        const devanagari = window.mahabharata[bookKey]?.[chapterKey]?.['devanagari'] || [];
        const iast = window.mahabharata[bookKey]?.[chapterKey]?.['iast'] || [];
        const firstTr = firstTranslation.value !== 'disable' ? 
                    window.translation[firstTranslation.value][bookKey]?.[chapterKey] : null;
        const secondTr = secondTranslation.value !== 'disable' ? 
                    window.translation[secondTranslation.value][bookKey]?.[chapterKey] : null;
        
        container.innerHTML = '';
        devanagari.forEach((phrase, index) => {
            const lineDiv = document.createElement('div');
            lineDiv.className = 'line-entry';
            
            // Add data attributes for notes
            lineDiv.setAttribute('data-source', 'original');
            lineDiv.setAttribute('data-book', bookKey);
            lineDiv.setAttribute('data-chapter', chapterKey);
            lineDiv.setAttribute('data-verse', index + 1);
            
            // Determine rendering mode based on current view setting
            const renderingMode = originalText.value;
            const useMultiLine = renderingMode.includes('multi');
            const showDevanagari = renderingMode.includes('sanskrit') || renderingMode.includes('devanagari');
            const showIAST = renderingMode.includes('sanskrit') || renderingMode.includes('iast');
            
            // Process text based on single-line/multi-line setting
            const processedDevanagari = useMultiLine ? 
                phrase.replace(/\n/g, '<br>') : 
                phrase.replace(/\n/g, ' ');
            const processedIAST = iast[index] ? 
                (useMultiLine ? 
                    iast[index].replace(/\n/g, '<br>') : 
                    iast[index].replace(/\n/g, ' ')) : 
                '';
            
            // Create span elements with appropriate language attributes
            const verseNumberSpan = document.createElement('span');
            verseNumberSpan.className = 'verse-number';
            verseNumberSpan.textContent = `${index + 1}:`;
            
            // Add verse number
            lineDiv.appendChild(verseNumberSpan);
            lineDiv.appendChild(document.createElement('br'));
            
            // Add Devanagari if enabled
            if (showDevanagari) {
                const sanskritSpan = document.createElement('span');
                sanskritSpan.className = 'verse-text';
                sanskritSpan.lang = 'sa'; // Mark as Sanskrit language
                sanskritSpan.innerHTML = processedDevanagari;
                lineDiv.appendChild(sanskritSpan);
                lineDiv.appendChild(document.createElement('br'));
            }
            
            // Add IAST if enabled
            if (showIAST) {
                const iastSpan = document.createElement('span');
                iastSpan.className = 'verse-text';
                iastSpan.lang = 'sa-Latn'; // Sanskrit in Latin script (IAST)
                iastSpan.innerHTML = processedIAST;
                lineDiv.appendChild(iastSpan);
                lineDiv.appendChild(document.createElement('br'));
            }

            if ((showDevanagari || showIAST) && (firstTr !== null || secondTr !== null)) {
                // Add extra spacing between original and translations
                lineDiv.appendChild(document.createElement('br'));
            }

            // Add first translation if available
            if (firstTr !== null) {
                const trSpan = document.createElement('span');
                trSpan.className = 'verse-text';
                const lang = (firstTranslation.value || '').slice(-2); // Last two letters indicate language code
                trSpan.lang = lang;
                // If an edited translation exists, display it instead of the default
                let trText = firstTr[String(index + 1)] || '';
                try {
                    const edits = window.editsAPI?.getEdit ? window.editsAPI.getEdit(bookKey, chapterKey, String(index + 1)) || {} : {};
                    if (edits && edits[lang]) trText = edits[lang];
                } catch (e) { /* ignore edits errors */ }
                trSpan.innerHTML = trText;
                // ensure the translation span can position the edit icon in its own box
                trSpan.style.display = trSpan.style.display || 'inline-block';
                trSpan.style.position = trSpan.style.position || 'relative';
                trSpan.style.paddingRight = trSpan.style.paddingRight || '28px';
                lineDiv.appendChild(trSpan);
                // render edit icon if an edit exists for this translation — place it inside the translation span (upper-right)
                try {
                    const edits = window.editsAPI?.getEdit ? window.editsAPI.getEdit(bookKey, chapterKey, String(index + 1)) || {} : {};
                    if (edits && edits[lang]) {
                        const editIcon = document.createElement('span');
                        editIcon.className = 'translation-edit-icon';
                        editIcon.title = 'Edit translation';
                        editIcon.textContent = '✏️';
                        editIcon.setAttribute('data-book', bookKey);
                        editIcon.setAttribute('data-chapter', chapterKey);
                        editIcon.setAttribute('data-verse', String(index + 1));
                        editIcon.setAttribute('data-lang', lang);
                        editIcon.style.position = 'absolute';
                        editIcon.style.right = '6px';
                        editIcon.style.top = '4px';
                        editIcon.style.zIndex = '3';
                        editIcon.style.cursor = 'pointer';
                        editIcon.style.fontSize = '14px';
                        trSpan.appendChild(editIcon);
                    }
                } catch (e) { /* ignore edits errors */ }
                lineDiv.appendChild(document.createElement('br'));
            }

            if (firstTr !== null && secondTr !== null) {
                // Add extra spacing between translations
                lineDiv.appendChild(document.createElement('br'));
            }

            // Add second translation if available
            if (secondTr !== null) {
                const trSpan = document.createElement('span');
                trSpan.className = 'verse-text';
                const lang = (secondTranslation.value || '').slice(-2); // Last two letters indicate language code
                trSpan.lang = lang;
                // If an edited translation exists, display it instead of the default
                let trText = secondTr[String(index + 1)] || '';
                try {
                    const edits = window.editsAPI?.getEdit ? window.editsAPI.getEdit(bookKey, chapterKey, String(index + 1)) || {} : {};
                    if (edits && edits[lang]) trText = edits[lang];
                } catch (e) { /* ignore edits errors */ }
                trSpan.innerHTML = trText;
                // ensure the translation span can position the edit icon in its own box
                trSpan.style.display = trSpan.style.display || 'inline-block';
                trSpan.style.position = trSpan.style.position || 'relative';
                trSpan.style.paddingRight = trSpan.style.paddingRight || '28px';
                lineDiv.appendChild(trSpan);
                // render edit icon if an edit exists for this translation — place it inside the translation span (upper-right)
                try {
                    const edits = window.editsAPI?.getEdit ? window.editsAPI.getEdit(bookKey, chapterKey, String(index + 1)) || {} : {};
                    if (edits && edits[lang]) {
                        const editIcon = document.createElement('span');
                        editIcon.className = 'translation-edit-icon';
                        editIcon.title = 'Edit translation';
                        editIcon.textContent = '✏️';
                        editIcon.setAttribute('data-book', bookKey);
                        editIcon.setAttribute('data-chapter', chapterKey);
                        editIcon.setAttribute('data-verse', String(index + 1));
                        editIcon.setAttribute('data-lang', lang);
                        editIcon.style.position = 'absolute';
                        editIcon.style.right = '6px';
                        editIcon.style.top = '4px';
                        editIcon.style.zIndex = '3';
                        editIcon.style.cursor = 'pointer';
                        editIcon.style.fontSize = '14px';
                        trSpan.appendChild(editIcon);
                    }
                } catch (e) { /* ignore edits errors */ }
                lineDiv.appendChild(document.createElement('br'));
            }
            
            // Add final spacing
            lineDiv.appendChild(document.createElement('br'));
            // Append verse container
            container.appendChild(lineDiv);
            // If a note exists for this verse, render a small icon (minimal DOM change)
            try {
                if (window.notesAPI) {
                    const note = window.notesAPI.getNote(bookKey, chapterKey, index + 1);
                    if (note) {
                        // ensure verse container is positioned so absolute icon can be placed
                        lineDiv.style.position = lineDiv.style.position || 'relative';
                        const noteIcon = document.createElement('span');
                        noteIcon.className = 'verse-note-icon';
                        noteIcon.title = 'Open note';
                        noteIcon.textContent = '📝';
                        noteIcon.setAttribute('data-book', bookKey);
                        noteIcon.setAttribute('data-chapter', chapterKey);
                        noteIcon.setAttribute('data-verse', String(index + 1));
                        noteIcon.style.position = 'absolute';
                        noteIcon.style.right = '6px';
                        noteIcon.style.bottom = '6px';
                        noteIcon.style.zIndex = '3';
                        noteIcon.style.cursor = 'pointer';
                        noteIcon.style.fontSize = '14px';
                        lineDiv.appendChild(noteIcon);
                    }
                }
            } catch (e) { /* ignore notes errors */ }

            // If a bookmark exists for this verse, render a top-right bookmark icon
            try {
                if (window.bookmarksAPI) {
                    const bm = window.bookmarksAPI.getBookmark(bookKey, chapterKey, index + 1);
                    if (bm) {
                        lineDiv.style.position = lineDiv.style.position || 'relative';
                        const bmIcon = document.createElement('span');
                        bmIcon.className = 'verse-bookmark-icon';
                        bmIcon.title = 'Remove bookmark';
                        bmIcon.textContent = '🔖';
                        bmIcon.setAttribute('data-book', bookKey);
                        bmIcon.setAttribute('data-chapter', chapterKey);
                        bmIcon.setAttribute('data-verse', String(index + 1));
                        bmIcon.style.position = 'absolute';
                        bmIcon.style.right = '6px';
                        bmIcon.style.top = '6px';
                        bmIcon.style.zIndex = '4';
                        bmIcon.style.cursor = 'pointer';
                        bmIcon.style.fontSize = '14px';
                        lineDiv.appendChild(bmIcon);
                    }
                }
            } catch (e) { /* ignore bookmark errors */ }
            lineElements.push(lineDiv);
        });
    }

    // Notify background module that verses have been rendered
    document.dispatchEvent(new Event('versesRendered'));
}

// Persist last reading position helper (book, chapter, verse)
function saveLastPosition(book, chapter, verse) {
    try {
        if (!book || !chapter || !verse) return;
        const last = JSON.parse(localStorage.getItem('jayaapp:lastPosition') || 'null');
        const newVal = { book: String(book), chapter: String(chapter), verse: Number(verse), ts: Date.now() };
        if (!last || last.book !== newVal.book || last.chapter !== newVal.chapter || last.verse !== newVal.verse) {
            localStorage.setItem('jayaapp:lastPosition', JSON.stringify(newVal));
        }
    } catch (e) { /* silent */ }
}

function loadLastPosition() {
    try {
        const val = localStorage.getItem('jayaapp:lastPosition');
        if (!val) return null;
        const parsed = JSON.parse(val);
        if (!parsed || !parsed.book || !parsed.chapter || !parsed.verse) return null;
        return { book: String(parsed.book), chapter: String(parsed.chapter), verse: Number(parsed.verse), ts: parsed.ts || 0 };
    } catch (e) { return null; }
}

// Setup observers on verses to track current visible verse and persist minimal changes
function setupReadingPositionObservers() {
    window.readingPositionObservers = window.readingPositionObservers || {};
    const panelIds = ['text-panel-horizontal', 'text-panel-vertical'];

    // Helper: disconnect existing observer/handler for panel
    function detachPanel(panelId) {
        const existing = window.readingPositionObservers[panelId];
        if (!existing) return;
        try { if (existing.observer) existing.observer.disconnect(); } catch (e) { }
        try { if (existing.scrollHandler && existing.panel) existing.panel.removeEventListener('scroll', existing.scrollHandler); } catch (e) { }
        delete window.readingPositionObservers[panelId];
    }

    panelIds.forEach(panelId => {
        const panel = document.getElementById(panelId);
        if (!panel) return;
        detachPanel(panelId);

        const observeLines = () => {
            const entries = panel.querySelectorAll('.line-entry');
            if (!entries || entries.length === 0) return;
            // IntersectionObserver path
            if ('IntersectionObserver' in window) {
                const observer = new IntersectionObserver((ioEntries) => {
                    // choose the entry with greatest intersectionRatio
                    let best = null;
                    for (const e of ioEntries) {
                        if (!best || e.intersectionRatio > best.intersectionRatio) best = e;
                    }
                    if (best && best.target) {
                        const line = best.target;
                        const book = line.dataset.book || null;
                        const chapter = line.dataset.chapter || null;
                        const verse = Number(line.dataset.verse) || null;
                        if (book && chapter && verse) {
                            const last = loadLastPosition();
                            if (!last || last.book !== String(book) || last.chapter !== String(chapter) || last.verse !== Number(verse)) {
                                saveLastPosition(book, chapter, verse);
                            }
                        }
                    }
                }, { root: panel, threshold: [0.5] });
                // Observe all current entries
                entries.forEach(el => observer.observe(el));
                window.readingPositionObservers[panelId] = { observer, panel };
            } else {
                // Fallback: debounced scroll handler -> check center element by elementFromPoint
                const debounced = (fn, delay) => { let t = null; return function(...a){ clearTimeout(t); t = setTimeout(()=>fn.apply(this,a), delay); }; };
                const handler = debounced(() => {
                    const rect = panel.getBoundingClientRect();
                    const cx = Math.round(rect.left + rect.width / 2);
                    const cy = Math.round(rect.top + rect.height / 2);
                    const elAt = document.elementFromPoint(cx, cy);
                    if (!elAt) return;
                    const found = elAt.closest('.line-entry');
                    if (found && panel.contains(found)) {
                        const book = found.dataset.book || null;
                        const chapter = found.dataset.chapter || null;
                        const verse = Number(found.dataset.verse) || null;
                        const last = loadLastPosition();
                        if (book && chapter && verse && (!last || last.book !== String(book) || last.chapter !== String(chapter) || last.verse !== Number(verse))) {
                            saveLastPosition(book, chapter, verse);
                        }
                    }
                }, 200);
                panel.addEventListener('scroll', handler);
                window.readingPositionObservers[panelId] = { panel, scrollHandler: handler };
            }
        };

        // Ensure we always set up observers after re-render
        observeLines();
    });
}

// Restore last position once after versesRendered (only at initial load)
function restoreLastPositionOnce() {
    try {
        const last = loadLastPosition();
        if (!last) return;
        if (!window.mahabharata || !window.mahabharata[last.book] || !window.mahabharata[last.book][last.chapter]) return;
        // call the existing navigation function
        try {
            gotToBookChapterVerse(last.book, last.chapter, last.verse);
        } catch (e) { /* ignore */ }
    } catch (e) { /* ignore */ }
}

// Setup observers and restore after each render
document.addEventListener('versesRendered', () => {
    try { setupReadingPositionObservers(); } catch (e) { /* ignore */ }
});

// Restore position on first render only
document.addEventListener('versesRendered', restoreLastPositionOnce, { once: true });

function renderText(container) {
    let bookSelect = document.getElementById('book-select')
    let chapterSelect = document.getElementById('chapter-select')
    let originalText = document.getElementById('original-text');
    let firstTranslation = document.getElementById('first-translation');
    let secondTranslation = document.getElementById('second-translation');

    // loop over sleep periods until all variables are defined
    setTimeout(() => {
        if (bookSelect === null || chapterSelect === null || originalText === null ||
            firstTranslation === null || secondTranslation === null ||
            !window.mahabharata || !window.translation) {
            renderText(container); // Retry after delay
            }
        else {
            renderWhenReady(container);
            window.currentTextContainer = container;
        }
    }, 355);
}

function gotToBookChapterVerse(book, chapter, verse) {
    // Try to locate selects repeatedly until they're available, then navigate
    function attempt() {
        const bookSelect = document.getElementById('book-select');
        const chapterSelect = document.getElementById('chapter-select');
        if (!bookSelect || !chapterSelect) {
            setTimeout(attempt, 120);
            return;
        }
        try {
            // Set book and chapter
            bookSelect.value = String(Number(book));
            chapterSelect.value = String(Number(chapter));
            // Do not call `renderWhenReady` directly here; use the standard
            // `updateText()` path below to avoid triggering an immediate render
            // followed by another render from `renderText()` (which schedules a
            // delayed render). Double-rendering can reorder the DOM and make
            // a previously-scrolled position get lost. Let `updateText()` drive
            // the render cycle so `tryScroll` can reliably find the final DOM.
            // Trigger re-render of both panels so verses exist in DOM
            try { if (typeof updateText === 'function') updateText(); } catch (e) { if (window.updateText) window.updateText(); }
            // Scroll to verse after a short delay to allow render to settle; retry a few times if necessary
            let attempts = 0;
            const maxAttempts = 8;
            const tryScroll = () => {
                attempts++;
                // Prefer the actual verse elements rendered by renderWhenReady (they have class `line-entry`)
                const selector = `.line-entry[data-book="${book}"][data-chapter="${chapter}"][data-verse="${verse}"]`;
                let verseEl = document.querySelector(selector);
                // Also try scoping to known text panel containers
                if (!verseEl) {
                    const h = document.querySelector('#text-panel-horizontal .line-entry' + `[data-book="${book}"][data-chapter="${chapter}"][data-verse="${verse}"]`);
                    const v = document.querySelector('#text-panel-vertical .line-entry' + `[data-book="${book}"][data-chapter="${chapter}"][data-verse="${verse}"]`);
                    verseEl = h || v || null;
                }
                if (verseEl) {
                    verseEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // persist last position when we successfully navigated
                    try { saveLastPosition(book, chapter, verse); } catch (e) { /* silent */ }
                    // add a transient highlight via a temporary stylesheet rule so it survives re-renders
                    try {
                        const styleId = `verse-highlight-${book}-${chapter}-${verse}`;
                        // remove existing if any
                        const existing = document.getElementById(styleId);
                        if (existing) existing.remove();
                        const style = document.createElement('style');
                        style.id = styleId;
                        // use the same selector we used to find the element
                        const cssSelector = `.line-entry[data-book="${book}"][data-chapter="${chapter}"][data-verse="${verse}"]`;
                        style.textContent = `${cssSelector} { background: rgba(56, 161, 255, 0.12) !important; transition: background 0.4s ease; }`;
                        document.head.appendChild(style);
                        setTimeout(() => { const s = document.getElementById(styleId); if (s) s.remove(); }, 1200);
                    } catch (err) {
                        // fallback to class toggle
                        try { verseEl.classList.add('verse-target-highlight'); setTimeout(() => verseEl.classList.remove('verse-target-highlight'), 1200); } catch (e) {}
                    }
                } else if (attempts < maxAttempts) {
                    setTimeout(tryScroll, 150);
                } else {
                    console.warn('Target verse not found after retries', book, chapter, verse);
                }
            };
            setTimeout(tryScroll, 160);
        } catch (e) {
            console.error('gotToBookChapterVerse error', e);
        }
    }
    attempt();
}

function updateText() {
    for (const orientation of ['-horizontal', '-vertical']) {
        renderText(document.getElementById('text-panel' + orientation));
    }
}

document.addEventListener('bookChapterChanged', () => {
    // Ensure that when the user (or app) transitions to a different book/chapter,
    // the view starts at verse 1. We wait for the verses to be rendered and then
    // scroll the first verse into view and persist verse=1 as the last position.
    const onRendered = () => {
        try {
            const bookSelect = document.getElementById('book-select');
            const chapterSelect = document.getElementById('chapter-select');
            if (!bookSelect || !chapterSelect) return;
            const book = String(Number(bookSelect.value));
            const chapter = String(Number(chapterSelect.value));
            const selector = `.line-entry[data-book="${book}"][data-chapter="${chapter}"][data-verse="1"]`;
            const h = document.querySelector('#text-panel-horizontal ' + selector);
            const v = document.querySelector('#text-panel-vertical ' + selector);
            const verseEl = h || v || document.querySelector(selector) || null;
            if (verseEl) {
                try { verseEl.scrollIntoView({ behavior: 'auto', block: 'start' }); } catch(e) { verseEl.scrollIntoView(); }
            } else {
                // Fallback: scroll container to top
                try { const ph = document.getElementById('text-panel-horizontal'); if (ph) ph.scrollTop = 0; } catch(e) {}
                try { const pv = document.getElementById('text-panel-vertical'); if (pv) pv.scrollTop = 0; } catch(e) {}
            }
            // Persist the fact the user navigated to start of chapter
            try { saveLastPosition(book, chapter, 1); } catch (e) { /* ignore */ }
        } catch (e) { /* ignore */ }
    };
    // Wait for the next render completion
    document.addEventListener('versesRendered', onRendered, { once: true });

    // Trigger re-render of both panels so verses exist in DOM
    updateText();
});

document.addEventListener('textRenderingChanged', () => {
    updateText();
});

document.addEventListener('backgroundSettingsChanged', () => {
    updateText();
});