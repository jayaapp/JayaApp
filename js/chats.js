(function () {
    const STORAGE_KEY = 'jayaapp:saved_chats';
    const LAST_OPENED_KEY = 'jayaapp:last_opened_chat';

    let overlay, panel, listEl, deleteBtn, exportBtn, importBtn, closeBtn, selectAllLink;
    let escKeyHandler = null;

    function loadChats() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return [];
            return JSON.parse(raw) || [];
        } catch (e) { return []; }
    }

    function saveChats(arr) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(arr || []));
        } catch (e) { console.error('Failed to save chats', e); }
    }

    function createId() {
        return 'chat-' + Date.now() + '-' + Math.random().toString(36).slice(2,8);
    }

    // Stable stringify: deterministic serialization with sorted object keys
    function stableStringify(value) {
        const seen = new WeakSet();
        function _stringify(v) {
            if (v === null) return 'null';
            if (typeof v === 'string') return JSON.stringify(v);
            if (typeof v === 'number' || typeof v === 'boolean') return String(v);
            if (Array.isArray(v)) return '[' + v.map(_stringify).join(',') + ']';
            if (typeof v === 'object') {
                if (seen.has(v)) return 'null';
                seen.add(v);
                const keys = Object.keys(v).sort();
                return '{' + keys.map(k => JSON.stringify(k) + ':' + _stringify(v[k])).join(',') + '}';
            }
            return 'null';
        }
        return _stringify(value);
    }

    // Quick synchronous non-cryptographic 64-bit FNV-1a hash returning hex (used for synchronous dedupe)
    function fnv1a64Hex(str) {
        let h1 = 0x811c9dc5; // 32-bit basis
        for (let i = 0; i < str.length; i++) {
            h1 ^= str.charCodeAt(i);
            h1 = Math.imul(h1, 0x01000193) >>> 0;
        }
        // produce hex of 32-bit h1 twice for 64-bit-ish representation
        const hex = ('00000000' + (h1 >>> 0).toString(16)).slice(-8);
        return hex + hex;
    }

    // Async SHA-256 hex using SubtleCrypto (returns plain hex string)
    async function sha256Hex(str) {
        try {
            if (window.crypto && window.crypto.subtle && window.TextEncoder) {
                const enc = new TextEncoder();
                const data = enc.encode(str);
                const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            }
        } catch (e) {
            // fallthrough to fallback
        }
        // fallback: return quick hash as placeholder
        return fnv1a64Hex(str);
    }

    function computeQuickHashForMessages(messages) {
        try {
            const s = stableStringify(normalizeMessages(messages || []));
            return fnv1a64Hex(s);
        } catch (e) { return ''; }
    }

    // Normalize messages to a minimal deterministic shape used for hashing/comparison
    function normalizeMessages(messages) {
        try {
            if (!messages || !messages.length) return [];
            return (messages || []).map(m => {
                return { t: (m && m.type) || 'user', text: (m && (m.text || m.message || m.body)) || '' };
            });
        } catch (e) { return []; }
    }

    // Update stored chat entry with SHA-256 in background (if possible)
    function refreshChatSha256Async(chatId, messages) {
        try {
            const s = stableStringify(messages || []);
            // compute quick (synchronous) hash to ensure we always keep a fast dedupe key
            let quick = '';
            try { quick = fnv1a64Hex(s); } catch (e) { quick = ''; }
            sha256Hex(s).then(h => {
                try {
                    const chats = loadChats();
                    const idx = chats.findIndex(c => c.id === chatId);
                    if (idx >= 0) {
                        // preserve or restore the quick hash for synchronous comparisons
                        if (!chats[idx].hash || String(chats[idx].hash).startsWith('sha256:')) {
                            chats[idx].hash = quick;
                        }
                        // store SHA-256 in a separate property (no prefix), keep quick in `hash`
                        chats[idx].sha256 = h;
                        saveChats(chats);
                    }
                } catch (e) { /* ignore */ }
            }).catch(()=>{});
        } catch (e) { /* ignore */ }
    }

    function formatTimestamp(ts) {
        if (!ts) return '';
        const d = new Date(ts);
        return d.toLocaleString();
    }

    function clearList() {
        if (listEl) listEl.innerHTML = '';
    }

    function render() {
        const chats = loadChats();
        clearList();
        if (!listEl) return;
        if (!chats.length) {
            const n = document.createElement('div');
            n.className = 'list-row';
            n.textContent = getLocale('no_chats') || 'No saved chats';
            listEl.appendChild(n);
            return;
        }

        for (const item of chats) {
            const row = document.createElement('div');
            row.className = 'list-row';
            row.dataset.id = item.id;
            row.style.display = 'flex';
            row.style.alignItems = 'center';

            const left = document.createElement('div');
            left.className = 'list-row-left';
            left.style.flex = '1 1 auto';

            const title = document.createElement('div');
            title.className = 'chat-preview';
            title.textContent = item.name || (item.messages && item.messages[0] ? (item.messages[0].text || '') : '');
            left.appendChild(title);

            const meta = document.createElement('div');
            meta.className = 'chat-meta';
            meta.textContent = formatTimestamp(item.modified);
            left.appendChild(meta);

            row.appendChild(left);

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
                startRename(item.id, title, item);
            });

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'list-select';
            checkbox.dataset.id = item.id;
            checkbox.addEventListener('click', (e)=>{ e.stopPropagation(); });

            right.appendChild(editBtn);
            right.appendChild(checkbox);
            row.appendChild(right);

            // single click: load chat
            row.addEventListener('click', () => {
                try {
                    const session = ChatSession.get();
                    session.clear();
                    for (const m of item.messages || []) {
                        // preserve original types; don't trigger fetch
                        session.addMessage(m.type || 'user', m.text || '', false, {});
                    }
                    // hide panel
                    // mark as last opened
                    try { localStorage.setItem(LAST_OPENED_KEY, item.id); } catch (e) {}
                    hidePanel();
                } catch (e) { console.error(e); }
            });

            // double click: quick delete prompt
            row.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                if (!confirm(getLocale('delete_confirm') || 'Delete this chat?')) return;
                deleteChats([item.id]);
                render();
            });

            listEl.appendChild(row);
        }
    }

    function startRename(id, titleEl, item) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'rename-input';
        input.value = item.name || titleEl.textContent || '';
        titleEl.replaceWith(input);
        input.focus();
        input.select();
        input.addEventListener('keydown', (e)=>{
            if (e.key === 'Enter') applyRename();
            if (e.key === 'Escape') cancelRename();
        });
        input.addEventListener('blur', applyRename);

        function applyRename() {
            const name = input.value.trim();
            const chats = loadChats();
            const idx = chats.findIndex(c => c.id === id);
            if (idx >= 0) {
                chats[idx].name = name;
                chats[idx].modified = Date.now();
                saveChats(chats);
            }
            render();
        }
        function cancelRename() { render(); }
    }

    function getSelectedIds() {
        const boxes = Array.from(listEl.querySelectorAll('.list-select'));
        return boxes.filter(b=>b.checked).map(b=>b.dataset.id);
    }

    function deleteChats(ids) {
        let chats = loadChats();
        chats = chats.filter(c => !ids.includes(c.id));
        saveChats(chats);
    }

    function exportSelected() {
        const ids = getSelectedIds();
        const chats = loadChats();
        const toExport = ids.length ? chats.filter(c=>ids.includes(c.id)) : chats;
        if (!toExport.length) {
            if (window.showAlert) {
                window.showAlert(getLocale('no_chats') || 'No saved chats to export');
            }
            return;
        }
        const payload = { exported_at: Date.now(), chats: toExport };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const ts = new Date().toISOString().replace(/[:.]/g,'-');
        const fname = `JayaApp-Chats-${ts}.json`;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fname;
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    function importFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.addEventListener('change', (ev)=>{
            const f = ev.target.files && ev.target.files[0];
            if (!f) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const parsed = JSON.parse(String(e.target.result));
                    let incoming = Array.isArray(parsed) ? parsed : (parsed.chats || []);
                    if (!incoming || !incoming.length) {
                        if (window.showAlert) {
                            window.showAlert(getLocale('no_chats_found_in_file') || 'No chats found in file');
                        }
                    }
                    let existing = loadChats();
                    let added = 0, skipped = 0;
                    for (const inc of incoming) {
                        // ensure id
                        if (!inc.id) inc.id = createId();
                        // compute quick hash for incoming messages if not present
                        try { if (!inc.hash) inc.hash = computeQuickHashForMessages(inc.messages || []); } catch (e) {}

                        // find existing by id or by matching hash or by identical messages as fallback
                        const found = existing.find(ei => {
                            if (ei.id === inc.id) return true;
                            if (ei.hash && inc.hash && ei.hash === inc.hash) return true;
                            try {
                                return stableStringify(normalizeMessages(ei.messages || [])) === stableStringify(normalizeMessages(inc.messages || []));
                            } catch (e) { return false; }
                        });

                        if (found) {
                            // if incoming is newer, replace
                            if ((inc.modified || 0) > (found.modified || 0)) {
                                const idx = existing.findIndex(ei=>ei.id===found.id);
                                existing[idx] = inc;
                                added++;
                            } else {
                                skipped++;
                            }
                        } else {
                            existing.push(inc);
                            added++;
                        }

                        // refresh SHA-256 for the incoming chat in background
                        try { refreshChatSha256Async(inc.id, inc.messages || []); } catch (e) {}
                    }
                    saveChats(existing);
                    render();
                    if (window.showAlert) {
                        window.showAlert(`${added} ${window.getLocale("imported") || "imported"}, ${skipped} ${window.getLocale("skipped") || "skipped" }`);
                    }
                } catch (err) {
                    console.error(err);
                    if (window.showAlert) {
                        window.showAlert((window.getLocale("failed_to_import_chats") || "Failed to import chats:") + ' ' + err.message);A
                    }
                }
            };
            reader.readAsText(f);
        });
        input.click();
    }

    function hidePanel() {
        overlay.classList.remove('active');
        panel.classList.remove('active');
        overlay.style.display = 'none';
        panel.style.display = 'none';
        // detach ESC handler when panel is hidden
        try { if (escKeyHandler) document.removeEventListener('keydown', escKeyHandler); } catch (e) {}
    }
    function showPanel() {
        render();
        overlay.style.display = 'block';
        panel.style.display = 'flex';
        setTimeout(()=>{ overlay.classList.add('active'); panel.classList.add('active'); }, 10);
        // attach ESC handler while panel is open
        try {
            if (!escKeyHandler) {
                escKeyHandler = (e) => {
                    if (!e) return;
                    if (e.key === 'Escape' || e.key === 'Esc') {
                        hidePanel();
                    }
                };
            }
            document.addEventListener('keydown', escKeyHandler);
        } catch (e) { /* ignore */ }
    }

    function getLocale(key) {
        try { return window.getLocale ? window.getLocale(key) : (window.localeData?.English?.[key] || ''); } catch (e) { return ''; }
    }

    function bind() {
        overlay = document.querySelector('.lists-overlay');
        panel = document.querySelector('.lists-panel.chats-panel');
        listEl = document.getElementById('chats-list');
        deleteBtn = document.getElementById('chats-delete');
        exportBtn = document.getElementById('chats-export');
        importBtn = document.getElementById('chats-import');
        closeBtn = document.getElementById('chats-close');
        selectAllLink = document.getElementById('chats-select-all');

        // close handlers
        closeBtn?.addEventListener('click', hidePanel);
        const closeX = panel?.querySelector('.lists-close');
        closeX?.addEventListener('click', hidePanel);
        overlay?.addEventListener('click', hidePanel);

        let last_delete_click_time = 0;
        deleteBtn?.addEventListener('click', ()=>{
            if (window.showAlert && last_delete_click_time === 0) {
                last_delete_click_time = Date.now();
                window.showAlert(getLocale('click_delete_once_more_to_delete') || 'Click delete once more to delete');
                setTimeout(() => { last_delete_click_time = 0; }, 1550);
            }
            else if (Date.now() - last_delete_click_time <= 1500) {
                const ids = getSelectedIds();
                if (!ids.length) return;
                deleteChats(ids);
                render();
                last_delete_click_time = 0;
                if (window.showAlert) {
                    const msg_template = getLocale('deleted_num_items') || '{0} items deleted';
                    const msg = msg_template.replace('{0}', String(ids.length));
                    window.showAlert(msg);
                }
            }
        });

        exportBtn?.addEventListener('click', exportSelected);
        importBtn?.addEventListener('click', importFile);

        selectAllLink?.addEventListener('click', (e)=>{
            e.preventDefault();
            const boxes = Array.from(listEl.querySelectorAll('.list-select'));
            const allChecked = boxes.every(b=>b.checked);
            boxes.forEach(b=>b.checked = !allChecked);
        });

        // wire chats-toggle icon (if present) to open the panel
        const toggle = document.getElementById('chats-toggle');
        if (toggle) toggle.addEventListener('click', (e) => { e.preventDefault(); showPanel(); });

        // listen for savedChatAdded to refresh and optionally hide
        document.addEventListener('savedChatAdded', (e)=>{
            render();
            // hide panel if user wanted to close automatically
            hidePanel();
        });
    }

    function initChats(attempts = 6) {
        // try to bind after DOM module is injected
        try { bind(); render(); } catch (e) {
            if (attempts > 0) setTimeout(()=>initChats(attempts-1), 200);
        }

        // attempt to restore last opened chat (if saved)
        try {
            const lastId = localStorage.getItem(LAST_OPENED_KEY);
            if (lastId) {
                const chats = loadChats();
                const found = chats.find(c => c.id === lastId);
                if (found) {
                    const session = ChatSession.get();
                    session.clear();
                    for (const m of found.messages || []) {
                        session.addMessage(m.type || 'user', m.text || '', false, {});
                    }
                }
            }
        } catch (e) { /* silent */ }

        // ensure we save the current session as last opened when the window is closed
        try {
            window.addEventListener('beforeunload', () => {
                try {
                    const session = ChatSession.get();
                    const messages = session.getMessages ? session.getMessages() : session.messages || [];
                    if (!messages || !messages.length) return;
                    // compute quick hash and check if identical exists
                    const qh = computeQuickHashForMessages(messages || []);
                    const chats = loadChats();
                    const found = chats.find(c => (c.hash && c.hash === qh) || stableStringify(normalizeMessages(c.messages || [])) === stableStringify(normalizeMessages(messages || [])));
                    if (found) {
                        try { localStorage.setItem(LAST_OPENED_KEY, found.id); } catch (e) {}
                        return;
                    }
                    // save synchronously (uses quick hash internally)
                    try { const id = window.chatAPI.saveCurrentSessionAsNew(); localStorage.setItem(LAST_OPENED_KEY, id); } catch (e) { /* ignore */ }
                } catch (e) { /* ignore */ }
            });
        } catch (e) { /* ignore */ }
    }

    // expose some APIs
    window.chatAPI = window.chatAPI || {};
    window.chatAPI.getSavedChats = () => loadChats();
    window.chatAPI.saveChat = (chatObj) => {
        const chats = loadChats();
        if (!chatObj.id) chatObj.id = createId();
        chatObj.modified = chatObj.modified || Date.now();

        // compute quick hash if not present
        try { if (!chatObj.hash) chatObj.hash = computeQuickHashForMessages(chatObj.messages || []); } catch (e) {}

        // if identical exists, replace if older. Match by id or by hash or fallback to messages equality
        const idx = chats.findIndex(c => {
            if (c.id === chatObj.id) return true;
            if (c.hash && chatObj.hash && c.hash === chatObj.hash) return true;
            try { return stableStringify(normalizeMessages(c.messages||[])) === stableStringify(normalizeMessages(chatObj.messages||[])); } catch (e) { return false; }
        });
        if (idx >= 0) {
            chats[idx] = chatObj;
        } else chats.push(chatObj);
        saveChats(chats);

        // remember last opened
        try { localStorage.setItem(LAST_OPENED_KEY, chatObj.id); } catch (e) {}
        document.dispatchEvent(new CustomEvent('savedChatAdded', { detail: { id: chatObj.id } }));

        // refresh SHA-256 in background for stronger future matches
        try { refreshChatSha256Async(chatObj.id, chatObj.messages || []); } catch (e) {}
        return chatObj.id;
    };
    window.chatAPI.saveCurrentSessionAsNew = (opts = {}) => {
        const session = ChatSession.get();
        const messages = session.getMessages ? session.getMessages() : session.messages || [];
        const copy = JSON.parse(JSON.stringify(messages || []));
        const name = opts.name || (copy[0] && copy[0].text ? copy[0].text.slice(0,120) : ('Chat ' + new Date().toLocaleString()));
        const obj = { id: createId(), name: name, messages: copy, modified: Date.now() };
        const id = window.chatAPI.saveChat(obj);
        try { localStorage.setItem(LAST_OPENED_KEY, id); } catch (e) {}
        return id;
    };
    window.chatAPI.exportChats = exportSelected;
    window.chatAPI.openPanel = showPanel;
    window.chatAPI.closePanel = hidePanel;

    window.initChats = initChats;

})();
