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
                const meta = `${getLocale('book') || 'Book'}: ${item.book}, ${getLocale('chapter') || 'Chapter'}: ${item.chapter}, ${getLocale('verse') || 'Verse'} ${item.verse}`;
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
        });

        return row;
    }

    function openEditorForRow(type, item) {
        const b = String(item.book), c = String(item.chapter), v = String(item.verse);
        // Navigate to the verse first (if helper exists)
        try {
            if (typeof gotToBookChapterVerse === 'function') gotToBookChapterVerse(b, c, v);
        } catch (e) { /* ignore */ }
        // close the lists panel
        try { hidePanel(); } catch (e) { /* ignore */ }

        if (type === 'notes') {
            // prefer a dedicated global opener
            if (window.notesAPI && window.notesAPI.openEditor) {
                window.notesAPI.openEditor(b, c, v);
                return;
            }
        } else if (type === 'verses') {
            if (window.editsAPI && window.editsAPI.openEditor) {
                window.editsAPI.openEditor(b, c, v, item.lang);
                return;
            }
        } else if (type === 'bookmarks') {
            /* nothing to do here */
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

        // Get last delete click time
        let last_delete_click_time = 0;

        // delete (operate on selected rows across all tabs)
        deleteBtn?.addEventListener('click', () => {
            if (window.showAlert && last_delete_click_time === 0) {
                last_delete_click_time = Date.now();
                window.showAlert(getLocale('click_delete_once_more_to_delete', 1500)
                || 'Click delete once more to delete');
                setTimeout(() => { last_delete_click_time = 0; }, 1550);
            }
            else if (Date.now() - last_delete_click_time <= 1500) {
                const selected = getSelectedRowsAcrossAll();
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
                updateActionButtonsState();
                last_delete_click_time = 0;
                if (window.showAlert) {
                    const msg_template = getLocale('deleted_num_items') || '{0} items deleted'; 
                    const msg = msg_template.replace('{0}', String(selected.length));
                    window.showAlert(msg);
                }
            }
        });

        // export (export selected rows across all tabs)
        exportBtn?.addEventListener('click', () => {
            const selected = getSelectedRowsAcrossAll();
            if (selected.length === 0) return;
            const editsOut = {};
            const notesOut = {};
            const bookmarksOut = {};

            selected.forEach(row => {
                const type = row.dataset.type;
                const b = row.dataset.book, c = row.dataset.chapter, v = row.dataset.verse, lang = row.dataset.lang;
                if (type === 'notes' && window.notesAPI && window.notesAPI.getNote) {
                    const noteVal = window.notesAPI.getNote(b, c, v);
                    if (!notesOut[b]) notesOut[b] = {};
                    if (!notesOut[b][c]) notesOut[b][c] = {};
                    notesOut[b][c][v] = noteVal;
                }
                if (type === 'verses' && window.editsAPI && window.editsAPI.getEdit) {
                    const editCell = window.editsAPI.getEdit(b, c, v) || {};
                    if (!editsOut[b]) editsOut[b] = {};
                    if (!editsOut[b][c]) editsOut[b][c] = {};
                    if (lang) {
                        editsOut[b][c][v] = editsOut[b][c][v] || {};
                        editsOut[b][c][v][lang] = editCell[lang] || '';
                    } else {
                        // include whole cell
                        editsOut[b][c][v] = Object.assign({}, editCell);
                    }
                }
                if (type === 'bookmarks' && window.bookmarksAPI && window.bookmarksAPI.getBookmark) {
                    const bm = window.bookmarksAPI.getBookmark(b, c, v);
                    if (!bookmarksOut[b]) bookmarksOut[b] = {};
                    if (!bookmarksOut[b][c]) bookmarksOut[b][c] = {};
                    bookmarksOut[b][c][v] = bm;
                }
            });

            const data = { edits: editsOut, notes: notesOut, bookmarks: bookmarksOut };
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

        // import (merge behavior)
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
                        if (!(payload && payload.data)) throw new Error('invalid payload');

                        const srcName = f.name || 'import';
                        const srcTime = payload.exportedAt || new Date().toISOString();
                        const srcLabel = `${srcName} ${srcTime}`;

                        // load existing using the module APIs when available
                        const existingEdits = (window.editsAPI && window.editsAPI.loadEdits) ? window.editsAPI.loadEdits() : {};
                        const existingNotes = (window.notesAPI && window.notesAPI.loadNotes) ? window.notesAPI.loadNotes() : {};
                        const existingBookmarks = (window.bookmarksAPI && window.bookmarksAPI.loadBookmarks) ? window.bookmarksAPI.loadBookmarks() : {};

                        let addedBookmarks = 0, addedNotes = 0, mergedNotes = 0, skippedNotes = 0;
                        let addedEdits = 0, mergedEdits = 0, skippedEdits = 0;

                        // merge bookmarks (union)
                        if (payload.data.bookmarks) {
                            const incoming = payload.data.bookmarks || {};
                            for (const b of Object.keys(incoming)) {
                                if (!existingBookmarks[b]) existingBookmarks[b] = {};
                                for (const c of Object.keys(incoming[b] || {})) {
                                    if (!existingBookmarks[b][c]) existingBookmarks[b][c] = {};
                                    for (const v of Object.keys(incoming[b][c] || {})) {
                                        if (!existingBookmarks[b][c][v]) {
                                            existingBookmarks[b][c][v] = incoming[b][c][v];
                                            addedBookmarks++;
                                        }
                                    }
                                }
                            }
                            // save bookmarks
                            if (window.bookmarksAPI && window.bookmarksAPI.loadBookmarks && window.bookmarksAPI.setBookmark) {
                                // write per-bookmark to use existing API
                                for (const b of Object.keys(existingBookmarks)) {
                                    for (const c of Object.keys(existingBookmarks[b] || {})) {
                                        for (const v of Object.keys(existingBookmarks[b][c] || {})) {
                                            window.bookmarksAPI.setBookmark(b, c, v);
                                        }
                                    }
                                }
                            } else {
                                localStorage.setItem('jayaapp:bookmarks', JSON.stringify(existingBookmarks));
                            }
                        }

                        // helper for imported-note label
                        function importedLabel() {
                            const pref = getLocale('imported_item') || 'Imported:';
                            return `${pref} ${srcLabel}`;
                        }

                        // merge notes
                        if (payload.data.notes) {
                            const incoming = payload.data.notes || {};
                            for (const b of Object.keys(incoming)) {
                                if (!existingNotes[b]) existingNotes[b] = {};
                                for (const c of Object.keys(incoming[b] || {})) {
                                    if (!existingNotes[b][c]) existingNotes[b][c] = {};
                                    for (const v of Object.keys(incoming[b][c] || {})) {
                                        const incText = incoming[b][c][v];
                                        const existText = (existingNotes[b] && existingNotes[b][c] && existingNotes[b][c][v]) ? existingNotes[b][c][v] : null;
                                        if (existText == null) {
                                            // new note
                                            existingNotes[b][c][v] = incText;
                                            if (window.notesAPI && window.notesAPI.setNote) window.notesAPI.setNote(b,c,v,incText);
                                            else localStorage.setItem('jayaapp:notes', JSON.stringify(existingNotes));
                                            addedNotes++;
                                        } else if (String(existText) === String(incText)) {
                                            // identical -> skip
                                            skippedNotes++;
                                        } else {
                                            // merge: existing first, separator, imported label + timestamp, then imported text
                                            const merged = String(existText)
                                                + '\n------------------\n'
                                                + importedLabel() + '\n'
                                                + '------------------\n'
                                                + String(incText);
                                            existingNotes[b][c][v] = merged;
                                            if (window.notesAPI && window.notesAPI.setNote) window.notesAPI.setNote(b,c,v,merged);
                                            else localStorage.setItem('jayaapp:notes', JSON.stringify(existingNotes));
                                            mergedNotes++;
                                        }
                                    }
                                }
                            }
                        }

                        // merge edits (per-language)
                        if (payload.data.edits) {
                            const incoming = payload.data.edits || {};
                            for (const b of Object.keys(incoming)) {
                                if (!existingEdits[b]) existingEdits[b] = {};
                                for (const c of Object.keys(incoming[b] || {})) {
                                    if (!existingEdits[b][c]) existingEdits[b][c] = {};
                                    for (const v of Object.keys(incoming[b][c] || {})) {
                                        const incCell = incoming[b][c][v];
                                        const existCell = (existingEdits[b] && existingEdits[b][c] && existingEdits[b][c][v]) ? existingEdits[b][c][v] : null;
                                        // if both are objects -> per-language merge
                                        if (existCell == null) {
                                            // new verse edits
                                            existingEdits[b][c][v] = incCell;
                                            if (window.editsAPI && window.editsAPI.setEdit) window.editsAPI.setEdit(b,c,v,incCell);
                                            else localStorage.setItem('jayaapp:edits', JSON.stringify(existingEdits));
                                            addedEdits++;
                                        } else if (typeof incCell === 'object' && typeof existCell === 'object') {
                                            // merge languages
                                            const mergedCell = Object.assign({}, existCell);
                                            for (const lang of Object.keys(incCell || {})) {
                                                const incText = incCell[lang];
                                                const existText = mergedCell[lang];
                                                if (existText == null) {
                                                    mergedCell[lang] = incText;
                                                    addedEdits++;
                                                } else if (String(existText) === String(incText)) {
                                                    skippedEdits++;
                                                } else {
                                                    // different -> merge with separator
                                                    mergedCell[lang] = String(existText)
                                                        + '\n------------------\n'
                                                        + importedLabel() + '\n'
                                                        + '------------------\n'
                                                        + String(incText);
                                                    mergedEdits++;
                                                }
                                            }
                                            existingEdits[b][c][v] = mergedCell;
                                            if (window.editsAPI && window.editsAPI.setEdit) window.editsAPI.setEdit(b,c,v,mergedCell);
                                            else localStorage.setItem('jayaapp:edits', JSON.stringify(existingEdits));
                                        } else if (String(existCell) === String(incCell)) {
                                            skippedEdits++;
                                        } else {
                                            // different shapes or simple strings: replace with incoming but annotate by merging into a string
                                            const merged = String(existCell)
                                                + '\n------------------\n'
                                                + importedLabel() + '\n'
                                                + '------------------\n'
                                                + String(incCell);
                                            existingEdits[b][c][v] = merged;
                                            if (window.editsAPI && window.editsAPI.setEdit) window.editsAPI.setEdit(b,c,v,merged);
                                            else localStorage.setItem('jayaapp:edits', JSON.stringify(existingEdits));
                                            mergedEdits++;
                                        }
                                    }
                                }
                            }
                        }

                        // update UI and text
                        if (window.updateText) window.updateText();
                        render();

                        // summary alert
                        const parts = [];
                        if (addedBookmarks) parts.push(`${addedBookmarks} bookmarks added`);
                        if (addedNotes) parts.push(`${addedNotes} new notes`);
                        if (mergedNotes) parts.push(`${mergedNotes} notes merged`);
                        if (skippedNotes) parts.push(`${skippedNotes} notes skipped (identical)`);
                        if (addedEdits) parts.push(`${addedEdits} edits added`);
                        if (mergedEdits) parts.push(`${mergedEdits} edits merged`);
                        if (skippedEdits) parts.push(`${skippedEdits} edits skipped (identical)`);
                        if (parts.length === 0) parts.push('No changes imported');
                        if (window.showAlert) window.showAlert(parts.join('\n'));

                    } catch (e) {
                        console.error('Import failed', e);
                        if (window.showAlert) window.showAlert('Import failed: invalid file', 3500, { location: 'bottom-left' });
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
            updateActionButtonsState();
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
        // delegate checkbox change events to update button states
        if (panel) {
            panel.addEventListener('change', (e) => {
                const t = e.target;
                if (t && t.classList && t.classList.contains('list-select')) {
                    updateActionButtonsState();
                }
            });
        }
    }

    function getSelectedRowsAcrossAll() {
        return Array.from(document.querySelectorAll('.list-select:checked')).map(cb => cb.closest('.list-row')).filter(Boolean);
    }

    function updateActionButtonsState() {
        const any = document.querySelector('.list-select:checked') !== null;
        if (deleteBtn) deleteBtn.disabled = !any;
        if (exportBtn) exportBtn.disabled = !any;
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
        // ensure buttons reflect current selection state
        updateActionButtonsState();
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
    window.getLocale = getLocale;

})();
