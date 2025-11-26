// Verse edits module: handles storage, UI and integration with text rendering
(function () {
    const STORAGE_KEY = 'jayaapp:edits';
    let editsOverlay = null;
    let editsPanel = null;
    let textarea = null;
    let saveBtn = null;
    let cancelBtn = null;
    let deleteBtn = null;
    let current = null; // {book, chapter, verse}
    let noteMode = false;

    function loadEdits() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            console.error('Failed to parse edits storage', e);
            return {};
        }
    }

    function saveEdits(obj) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
        } catch (e) {
            console.error('Failed to save edits', e);
        }
    }

    function getEdits(book, chapter, verse) {
        const edits = loadEdits();
        const cell = (edits?.[String(book)]?.[String(chapter)] || {})[String(verse)] || null;
        if (!cell) return null;
        // return mapping lang -> text for compatibility
        const out = {};
        for (const lang of Object.keys(cell)) {
            const val = cell[lang];
            out[lang] = val && typeof val === 'object' ? String(val.text || '') : String(val || '');
        }
        return out;
    }

    function getEditObj(book, chapter, verse) {
        const edits = loadEdits();
        return (edits?.[String(book)]?.[String(chapter)] || {})[String(verse)] || null;
    }

    function setEdits(book, chapter, verse, lang, text) {
        const edits = loadEdits();
        const b = String(book);
        const c = String(chapter);
        const v = String(verse);
        if (!edits[b]) edits[b] = {};
        if (!edits[b][c]) edits[b][c] = {};
        if (!edits[b][c][v]) edits[b][c][v] = {};
        edits[b][c][v][String(lang)] = { text: String(text || ''), timestamp: new Date().toISOString() };
        saveEdits(edits);
    }

    // set entire cell (lang -> {text,timestamp} or lang->text)
    function setEditCell(book, chapter, verse, cell) {
        const edits = loadEdits();
        const b = String(book);
        const c = String(chapter);
        const v = String(verse);
        if (!edits[b]) edits[b] = {};
        if (!edits[b][c]) edits[b][c] = {};
        const out = {};
        for (const k of Object.keys(cell || {})) {
            const val = cell[k];
            if (val && typeof val === 'object' && 'text' in val) out[k] = { text: String(val.text || ''), timestamp: val.timestamp || new Date().toISOString() };
            else out[k] = { text: String(val || ''), timestamp: new Date().toISOString() };
        }
        edits[b][c][v] = out;
        saveEdits(edits);
    }

    function removeEdits(book, chapter, verse) {
        const edits = loadEdits();
        const b = String(book);
        const c = String(chapter);
        const v = String(verse);
        if (edits[b] && edits[b][c] && edits[b][c][v]) {
            delete edits[b][c][v];
            if (Object.keys(edits[b][c]).length === 0) delete edits[b][c];
            if (Object.keys(edits[b]).length === 0) delete edits[b];
            saveEdits(edits);
        }
    }

    // expose API globally for text.js to query edits existence
    window.editsAPI = {
        getEdit: getEdits,
        getEditObj: getEditObj,
        setEdit: setEditCell,
        setEdits: setEdits,
        removeEdit: removeEdits,
        loadEdits: loadEdits
    };

    // Edits: HTML for the editor is injected by the app bootstrap (init.js).
    // bindElements will attach event handlers to elements already present in the DOM.

    function bindElements() {
        editsOverlay = document.querySelector('.edit-overlay');
        editsPanel = document.querySelector('.edit-editor-panel');
        textarea = document.getElementById('edit-text-area');
        saveBtn = document.querySelector('.edit-save-btn');
        cancelBtn = document.querySelector('.edit-cancel-btn');
        deleteBtn = document.querySelector('.edit-delete-btn');

        const closeEl = document.querySelector('.edit-editor-close');

        if (!editsOverlay || !editsPanel || !textarea) return;

        // Close on overlay click
        editsOverlay.addEventListener('click', hideEditor);

        // Close icon in header
        closeEl?.addEventListener('click', hideEditor);

        // Buttons
        saveBtn?.addEventListener('click', () => {
            if (!current) return;
            const text = textarea.value.trim();
            const b = current.book, c = current.chapter, v = current.verse, lang = current.lang;
            // edits are stored per language under the verse
            const edits = loadEdits();
            if (!edits[b]) edits[b] = {};
            if (!edits[b][c]) edits[b][c] = {};
            if (!edits[b][c][v]) edits[b][c][v] = {};
            if (text.length) {
                edits[b][c][v][lang] = { text: text, timestamp: new Date().toISOString() };
            } else {
                // empty -> remove this language edit
                if (edits[b][c][v] && edits[b][c][v][lang]) delete edits[b][c][v][lang];
            }
            // clean empty branches
            if (edits[b][c][v] && Object.keys(edits[b][c][v]).length === 0) delete edits[b][c][v];
            if (edits[b][c] && Object.keys(edits[b][c]).length === 0) delete edits[b][c];
            if (edits[b] && Object.keys(edits[b]).length === 0) delete edits[b];
            saveEdits(edits);
            hideEditor();
            // re-render icons
            if (window.updateText) window.updateText();
        });

        cancelBtn?.addEventListener('click', () => {
            hideEditor();
        });

        deleteBtn?.addEventListener('click', () => {
            if (!current) return;
            const b = current.book, c = current.chapter, v = current.verse, lang = current.lang;
            const edits = loadEdits();
            if (edits[b] && edits[b][c] && edits[b][c][v] && edits[b][c][v][lang]) {
                delete edits[b][c][v][lang];
                if (Object.keys(edits[b][c][v]).length === 0) delete edits[b][c][v];
                if (Object.keys(edits[b][c]).length === 0) delete edits[b][c];
                if (Object.keys(edits[b]).length === 0) delete edits[b];
                saveEdits(edits);
            }
            hideEditor();
            if (window.updateText) window.updateText();
        });

        // keyboard escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && editsPanel && editsPanel.classList.contains('active')) {
                hideEditor();
            }
        });

        // Delegated click for edit icons (pencil) - open editor for that translation
        document.addEventListener('click', (e) => {
            const icon = e.target.closest('.translation-edit-icon');
            if (icon) {
                const book = icon.dataset.book;
                const chapter = icon.dataset.chapter;
                const verse = icon.dataset.verse;
                const lang = icon.dataset.lang;
                openEditor(book, chapter, verse, lang);
            }
        });

        // edit-toggle: enter edit mode
        const editToggle = document.getElementById('edit-toggle');
        if (editToggle) {
            editToggle.addEventListener('click', () => {
                noteMode = !noteMode;
                document.body.classList.toggle('edit-mode', noteMode);
            });
        }

        // When in edit mode, clicking a translation span opens editor for that translation
        document.addEventListener('click', (e) => {
            if (!noteMode) return;
            // find closest translation span with a language attribute (non-sanskrit)
            const textSpan = e.target.closest('.verse-text[lang]');
            if (textSpan) {
                const lang = textSpan.getAttribute('lang') || '';
                if (lang && lang !== 'sa' && lang !== 'sa-Latn') {
                    const verseEl = textSpan.closest('[data-verse]');
                    if (verseEl) {
                        const book = verseEl.dataset.book;
                        const chapter = verseEl.dataset.chapter;
                        const verse = verseEl.dataset.verse;
                        openEditor(book, chapter, verse, lang);
                        // exit edit mode after selecting a translation
                        noteMode = false;
                        document.body.classList.remove('edit-mode');
                    }
                }
            }
        }, true);
    }

    function showEditor() {
        editsOverlay.classList.add('active');
        editsPanel.classList.add('active');
        textarea.focus();
    }

    function hideEditor() {
        editsOverlay.classList.remove('active');
        editsPanel.classList.remove('active');
        current = null;
        textarea.value = '';
    }

    function findDisplayedTranslation(book, chapter, verse, lang) {
        // locate the verse element and the translation span with matching lang
        const selector = `[data-book="${book}"][data-chapter="${chapter}"][data-verse="${verse}"]`;
        const verseEl = document.querySelector(selector);
        if (!verseEl) return null;
        const span = verseEl.querySelector(`.verse-text[lang="${lang}"]`);
        return span ? span.textContent : null;
    }

    function openEditor(book, chapter, verse, lang) {
        current = { book: String(book), chapter: String(chapter), verse: String(verse), lang: String(lang || '') };
        // if an edit exists, load it; otherwise load the currently displayed translation text
        const existing = getEdits(book, chapter, verse) || {};
        let value = '';
        if (existing && lang && existing[lang]) {
            value = existing[lang];
        } else if (lang) {
            const displayed = findDisplayedTranslation(book, chapter, verse, lang);
            value = displayed || '';
        }
        textarea.value = value;
        showEditor();
    }

    // initialize: try to bind elements. If DOM isn't ready yet, retry a few times.
    function initEdits(attempts = 6) {
        bindElements();
        // if bindElements did not find required elements, schedule retries
        const ok = document.querySelector('.edit-overlay') && document.querySelector('.edit-editor-panel') && document.getElementById('edit-text-area');
        if (!ok && attempts > 0) {
            setTimeout(() => initEdits(attempts - 1), 100);
        }
    }

    // expose init in case main wants to run it after HTML modules are injected
    window.initEdits = initEdits;

})();
