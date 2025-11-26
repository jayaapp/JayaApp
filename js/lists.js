// Lists module: renders Bookmarks / Notes / Verses lists and import/export
(function () {
    const STORAGE_TAB_KEY = 'jayaapp:lists:activeTab';

    let overlay, panel, tabs, views, footer, closeBtn, deleteBtn, exportBtn, importBtn;
    let escKeyHandler = null;

    function loadAll() {
        const edits = window.editsAPI?.loadEdits ? window.editsAPI.loadEdits() : {};
        const notes = window.notesAPI?.loadNotes ? window.notesAPI.loadNotes() : {};
        const bookmarks = window.bookmarksAPI?.loadBookmarks ? window.bookmarksAPI.loadBookmarks() : {};
        return { edits, notes, bookmarks };
    }

    function flattenEdits(edits) {
        const out = [];
        for (const b of Object.keys(edits || {})) {
            for (const c of Object.keys(edits[b] || {})) {
                for (const v of Object.keys(edits[b][c] || {})) {
                    const cell = edits[b][c][v];
                    if (typeof cell === 'object') {
                        for (const lang of Object.keys(cell)) {
                            out.push({ book: b, chapter: c, verse: v, lang, text: cell[lang] });
                        }
                    } else {
                        // older format: string
                        out.push({ book: b, chapter: c, verse: v, text: cell });
                    }
                }
            }
        }
        return out;
    }

    function flattenNotes(notes) {
        const out = [];
        for (const b of Object.keys(notes || {})) {
            for (const c of Object.keys(notes[b] || {})) {
                for (const v of Object.keys(notes[b][c] || {})) {
                    out.push({ book: b, chapter: c, verse: v, text: notes[b][c][v] });
                }
            }
        }
        return out;
    }

    function flattenBookmarks(bm) {
        const out = [];
        for (const b of Object.keys(bm || {})) {
            for (const c of Object.keys(bm[b] || {})) {
                for (const v of Object.keys(bm[b][c] || {})) {
                    out.push({ book: b, chapter: c, verse: v });
                }
            }
        }
        return out;
    }

    function clearViews() {
        Object.values(views).forEach(v => { if (v) v.innerHTML = ''; });
    }

    function render() {
        const { edits, notes, bookmarks } = loadAll();
        clearViews();

        const editsList = flattenEdits(edits);
        const notesList = flattenNotes(notes);
        const bmList = flattenBookmarks(bookmarks);

        // render bookmarks
        const bview = views.bookmarks;
        if (bview) {
            if (bmList.length === 0) {
                bview.innerHTML = `<div class="meta">${getLocale('no_bookmarks_available')}</div>`;
            } else {
                bmList.forEach(item => {
                    const localized = `${getLocale('book')} ${item.book}, ${getLocale('chapter')} ${item.chapter}, ${getLocale('verse')} ${item.verse}`;
                    const row = renderListRow('bookmarks', item, localized, null, { showEdit: false });
                    bview.appendChild(row);
                });
            }
        }

        // render notes
        const nview = views.notes;
        if (nview) {
            if (notesList.length === 0) nview.innerHTML = `<div class="meta">${getLocale('no_notes')}</div>`;
            else notesList.forEach(item => {
                const title = item.text ? (item.text.length > 60 ? item.text.slice(0,60)+'…' : item.text) : '';
                const meta = `${getLocale('maha_en') || 'Translation'} | ${getLocale('book') || 'Book'}: ${item.book}, ${getLocale('chapter') || 'Chapter'}: ${item.chapter}, ${getLocale('verse') || 'Verse'} ${item.verse}`;
                const row = renderListRow('notes', item, title, meta);
                nview.appendChild(row);
            });
        }

        // render edits (verses)
        const eview = views.verses;
        if (eview) {
            if (editsList.length === 0) eview.innerHTML = `<div class="meta">${getLocale('no_edited_verses_available')}</div>`;
            else editsList.forEach(item => {
                const label = `${getLocale('book') || 'Book'} ${item.book}, ${getLocale('chapter') || 'Chapter'} ${item.chapter}, ${getLocale('verse') || 'Verse'} ${item.verse}`;
                const row = renderListRow('verses', item, label, null);
                eview.appendChild(row);
            });
        }
    }

    function renderListRow(type, item, title, meta, opts) {
        const row = document.createElement('div');
        row.className = 'list-row';
        row.dataset.type = type;
        row.dataset.book = String(item.book);
        row.dataset.chapter = String(item.chapter);
        row.dataset.verse = String(item.verse);
        if (item.lang) row.dataset.lang = item.lang;

        const left = document.createElement('div');
        left.className = 'list-row-left';
        left.style.flex = '1 1 auto';
        const h = document.createElement('div');
        h.textContent = title || '';
        h.style.fontWeight = '500';
        left.appendChild(h);
        if (meta) {
            const m = document.createElement('div');
            m.className = 'meta';
            m.textContent = meta;
            left.appendChild(m);
        }

        const right = document.createElement('div');
        right.className = 'list-row-right';
        right.style.display = 'flex';
        right.style.gap = '8px';
        right.style.alignItems = 'center';

        const editBtn = document.createElement('button');
        editBtn.className = 'list-edit-btn';
        editBtn.title = 'Edit';
        editBtn.textContent = '✏️';
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditorForRow(type, item);
        });

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'list-select';
        // prevent checkbox clicks from triggering the row click
        checkbox.addEventListener('click', (e) => { e.stopPropagation(); });

        const showEdit = !(opts && opts.showEdit === false);
        if (showEdit) right.appendChild(editBtn);
        right.appendChild(checkbox);

        row.appendChild(left);
        row.appendChild(right);

        // clicking row opens / navigates to the verse
        row.addEventListener('click', () => {
            const b = row.dataset.book;
            const c = row.dataset.chapter;
            const v = row.dataset.verse;
            // prefer direct navigation helper if available
            try {
                if (typeof gotToBookChapterVerse === 'function') {
                    gotToBookChapterVerse(b, c, v);
                    hidePanel();
                    return;
                }
            } catch (e) { /* ignore */ }
            // fallback: dispatch custom event to let main app navigate
            const ev = new CustomEvent('listItemOpen', { detail: { book: b, chapter: c, verse: v, lang: row.dataset.lang } });
            document.dispatchEvent(ev);
        });

        return row;
    }

    function openEditorForRow(type, item) {
        if (type === 'notes') {
            if (window.openEditor) window.openEditor(item.book, item.chapter, item.verse); // fallback
            if (window.initNotes && window.notesAPI) window.initNotes();
        } else if (type === 'verses') {
            if (window.initEdits) window.initEdits();
            if (window.openEditor) window.openEditor(item.book, item.chapter, item.verse, item.lang);
        } else if (type === 'bookmarks') {
            const ev = new CustomEvent('listItemOpen', { detail: { book: item.book, chapter: item.chapter, verse: item.verse } });
            document.dispatchEvent(ev);
        }
    }

    function getLocale(key) {
        try {
            const data = window.localeData || window.__localeData || null;
            if (!data) return '';
            // determine selected language name
            let lang = 'English';
            const sel = document.getElementById('language-select');
            if (sel && sel.value) lang = sel.value;
            const stored = localStorage.getItem('app-language');
            if (stored) lang = stored;
            if (!data[lang]) lang = Object.keys(data)[0] || 'English';
            return (data[lang] && data[lang][key]) || '';
        } catch (e) { return ''; }
    }

    function bind() {
        overlay = document.querySelector('.lists-overlay');
        panel = document.querySelector('.lists-panel');
        tabs = Array.from(document.querySelectorAll('.lists-tab'));
        views = {
            bookmarks: document.getElementById('lists-bookmarks'),
            notes: document.getElementById('lists-notes'),
            verses: document.getElementById('lists-verses')
        };
        deleteBtn = document.querySelector('.lists-delete-btn');
        exportBtn = document.querySelector('.lists-export-btn');
        importBtn = document.querySelector('.lists-import-btn');
        closeBtn = document.querySelector('.lists-close');
        footer = document.querySelector('.lists-footer');

        // tab clicks
        tabs.forEach(t => t.addEventListener('click', () => {
            setActiveTab(t.dataset.tab);
        }));

        // close handlers
        document.querySelectorAll('.lists-close, .lists-close-btn').forEach(el => el.addEventListener('click', hidePanel));

        // delete
        deleteBtn?.addEventListener('click', () => {
            const active = getActiveTab();
            const container = views[active];
            const selected = Array.from(container.querySelectorAll('.list-select:checked')).map(cb => cb.closest('.list-row'));
            if (selected.length === 0) return;
            selected.forEach(row => {
                const type = row.dataset.type;
                const b = row.dataset.book, c = row.dataset.chapter, v = row.dataset.verse, lang = row.dataset.lang;
                if (type === 'notes' && window.notesAPI && window.notesAPI.removeNote) window.notesAPI.removeNote(b,c,v);
                if (type === 'verses' && window.editsAPI && window.editsAPI.removeEdit) window.editsAPI.removeEdit(b,c,v);
                if (type === 'bookmarks' && window.bookmarksAPI && window.bookmarksAPI.removeBookmark) window.bookmarksAPI.removeBookmark(b,c,v);
            });
            if (window.updateText) window.updateText();
            render();
        });

        // export
        exportBtn?.addEventListener('click', () => {
            const data = loadAll();
            const payload = { exportedAt: new Date().toISOString(), data };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const ts = new Date().toISOString().replace(/[:.]/g,'-');
            a.href = url;
            a.download = `JayaApp-${ts}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        });

        // import
        importBtn?.addEventListener('click', () => {
            const inp = document.createElement('input');
            inp.type = 'file';
            inp.accept = 'application/json';
            inp.addEventListener('change', () => {
                const f = inp.files[0];
                if (!f) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        const payload = JSON.parse(ev.target.result);
                        if (payload && payload.data) {
                            if (payload.data.edits) localStorage.setItem('jayaapp:edits', JSON.stringify(payload.data.edits));
                            if (payload.data.notes) localStorage.setItem('jayaapp:notes', JSON.stringify(payload.data.notes));
                            if (payload.data.bookmarks) localStorage.setItem('jayaapp:bookmarks', JSON.stringify(payload.data.bookmarks));
                            if (window.updateText) window.updateText();
                            render();
                        }
                    } catch (e) {
                        console.error('Import failed', e);
                        alert('Import failed: invalid file');
                    }
                };
                reader.readAsText(f);
            });
            inp.click();
        });

        // select-all filter link
        const filterLink = document.querySelector('.lists-filter');
        if (filterLink) filterLink.addEventListener('click', (e) => {
            e.preventDefault();
            const active = getActiveTab();
            const container = views[active];
            const boxes = Array.from(container.querySelectorAll('.list-select'));
            const allChecked = boxes.every(b=>b.checked);
            boxes.forEach(b => b.checked = !allChecked);
        });

        // wire lists-toggle icon (if present) to open the panel
        const toggle = document.getElementById('lists-toggle');
        if (toggle) toggle.addEventListener('click', (e) => { e.preventDefault(); showPanel(); });

        // prepare ESC key handler (attached when panel shown)
        escKeyHandler = (e) => {
            if (!e) return;
            if (e.key === 'Escape' || e.key === 'Esc') {
                hidePanel();
            }
        };
    }

    function setActiveTab(name) {
        tabs.forEach(t => {
            const sel = t.dataset.tab === name;
            t.classList.toggle('active', sel);
            t.setAttribute('aria-selected', sel ? 'true' : 'false');
            const view = views[t.dataset.tab];
            if (view) view.style.display = sel ? 'block' : 'none';
        });
        localStorage.setItem(STORAGE_TAB_KEY, name);
    }

    function getActiveTab() {
        const saved = localStorage.getItem(STORAGE_TAB_KEY);
        if (saved && views[saved]) return saved;
        const t = tabs.find(x=>x.getAttribute('aria-selected')==='true');
        return t ? t.dataset.tab : 'notes';
    }

    function showPanel() {
        overlay?.classList.add('active');
        panel?.classList.add('active');
        // attach ESC key handler while panel is open
        if (escKeyHandler) document.addEventListener('keydown', escKeyHandler);
        render();
    }

    function hidePanel() {
        overlay?.classList.remove('active');
        panel?.classList.remove('active');
        // detach ESC key handler
        if (escKeyHandler) document.removeEventListener('keydown', escKeyHandler);
    }

    function initLists(attempts = 6) {
        bind();
        const saved = localStorage.getItem(STORAGE_TAB_KEY) || 'notes';
        setActiveTab(saved);
        if ((!overlay || !panel) && attempts > 0) {
            setTimeout(()=> initLists(attempts-1), 100);
        }
        window.showLists = showPanel;
    }

    window.initLists = initLists;

})();
