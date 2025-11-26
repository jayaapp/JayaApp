// Notes module: handles storage, UI and integration with text rendering
(function () {
    const STORAGE_KEY = 'jayaapp:notes';
    let notesOverlay = null;
    let notesPanel = null;
    let textarea = null;
    let saveBtn = null;
    let cancelBtn = null;
    let deleteBtn = null;
    let current = null; // {book, chapter, verse}
    let noteMode = false;

    function loadNotes() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            console.error('Failed to parse notes storage', e);
            return {};
        }
    }

    function saveNotes(obj) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
        } catch (e) {
            console.error('Failed to save notes', e);
        }
    }

    function getNote(book, chapter, verse) {
        const notes = loadNotes();
        return (notes?.[String(book)]?.[String(chapter)] || {})[String(verse)] || null;
    }

    function setNote(book, chapter, verse, text) {
        const notes = loadNotes();
        const b = String(book);
        const c = String(chapter);
        const v = String(verse);
        if (!notes[b]) notes[b] = {};
        if (!notes[b][c]) notes[b][c] = {};
        notes[b][c][v] = text;
        saveNotes(notes);
    }

    function removeNote(book, chapter, verse) {
        const notes = loadNotes();
        const b = String(book);
        const c = String(chapter);
        const v = String(verse);
        if (notes[b] && notes[b][c] && notes[b][c][v]) {
            delete notes[b][c][v];
            if (Object.keys(notes[b][c]).length === 0) delete notes[b][c];
            if (Object.keys(notes[b]).length === 0) delete notes[b];
            saveNotes(notes);
        }
    }

    // expose API globally for text.js to query notes existence
    window.notesAPI = {
        getNote,
        setNote,
        removeNote,
        loadNotes,
        openEditor
    };

    // Note: HTML for the editor is injected by the app bootstrap (init.js).
    // bindElements will attach event handlers to elements already present in the DOM.

    function bindElements() {
        notesOverlay = document.querySelector('.note-overlay');
        notesPanel = document.querySelector('.note-editor-panel');
        textarea = document.getElementById('note-text-area');
        saveBtn = document.querySelector('.note-save-btn');
        cancelBtn = document.querySelector('.note-cancel-btn');
        deleteBtn = document.querySelector('.note-delete-btn');

        const closeEl = document.querySelector('.note-editor-close');

        if (!notesOverlay || !notesPanel || !textarea) return;

        // Close on overlay click
        notesOverlay.addEventListener('click', hideEditor);

        // Close icon in header
        closeEl?.addEventListener('click', hideEditor);

        // Buttons
        saveBtn?.addEventListener('click', () => {
            if (!current) return;
            const text = textarea.value.trim();
            if (text.length) {
                setNote(current.book, current.chapter, current.verse, text);
            } else {
                removeNote(current.book, current.chapter, current.verse);
            }
            hideEditor();
            // re-render icons
            if (window.updateText) window.updateText();
        });

        cancelBtn?.addEventListener('click', () => {
            hideEditor();
        });

        deleteBtn?.addEventListener('click', () => {
            if (!current) return;
            removeNote(current.book, current.chapter, current.verse);
            hideEditor();
            if (window.updateText) window.updateText();
        });

        // keyboard escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && notesPanel && notesPanel.classList.contains('active')) {
                hideEditor();
            }
        });

        // Delegated click for note icons
        document.addEventListener('click', (e) => {
            const icon = e.target.closest('.verse-note-icon');
            if (icon) {
                const book = icon.dataset.book;
                const chapter = icon.dataset.chapter;
                const verse = icon.dataset.verse;
                openEditor(book, chapter, verse);
            }
        });

        // notes-toggle: enter note mode
        const notesToggle = document.getElementById('notes-toggle');
        if (notesToggle) {
            notesToggle.addEventListener('click', () => {
                noteMode = !noteMode;
                document.body.classList.toggle('note-mode', noteMode);
            });
        }

        // When in note mode, clicking a verse opens editor for that verse
        document.addEventListener('click', (e) => {
            if (!noteMode) return;
            const verseEl = e.target.closest('[data-verse]');
            if (verseEl) {
                const book = verseEl.dataset.book;
                const chapter = verseEl.dataset.chapter;
                const verse = verseEl.dataset.verse;
                openEditor(book, chapter, verse);
                // exit note mode after selecting a verse
                noteMode = false;
                document.body.classList.remove('note-mode');
            }
        }, true);
    }

    function showEditor() {
        notesOverlay.classList.add('active');
        notesPanel.classList.add('active');
        textarea.focus();
    }

    function hideEditor() {
        notesOverlay.classList.remove('active');
        notesPanel.classList.remove('active');
        current = null;
        textarea.value = '';
    }

    function openEditor(book, chapter, verse) {
        current = { book: String(book), chapter: String(chapter), verse: String(verse) };
        const existing = getNote(book, chapter, verse) || '';
        textarea.value = existing;
        showEditor();
    }

    // initialize: try to bind elements. If DOM isn't ready yet, retry a few times.
    function initNotes(attempts = 6) {
        bindElements();
        // if bindElements did not find required elements, schedule retries
        const ok = document.querySelector('.note-overlay') && document.querySelector('.note-editor-panel') && document.getElementById('note-text-area');
        if (!ok && attempts > 0) {
            setTimeout(() => initNotes(attempts - 1), 100);
        }
    }

    // expose init in case main wants to run it after HTML modules are injected
    window.initNotes = initNotes;

})();
