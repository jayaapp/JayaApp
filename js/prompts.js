(function(){
    const STORAGE_KEY = 'jayaapp:prompts';
    let PREDEFINED = [];

    function pickRainbowColor(index, total) {
        const frequency = 2 * Math.PI / total;
        const r = Math.round(Math.sin(frequency * index + 0) * 127 + 128);
        const g = Math.round(Math.sin(frequency * index + 2) * 127 + 128);
        const b = Math.round(Math.sin(frequency * index + 4) * 127 + 128);
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }

    function loadPredefinedPrompts() {
        if (window.promptsData) {
            window.promptsData.forEach(p => {
                PREDEFINED.push({
                    name: p.name,
                    type: p.type,
                    language: p.language,
                    color: pickRainbowColor(PREDEFINED.length, window.promptsData.length),
                    text: p.text
                });
            });
        }
    }

    // helper: load user prompts from localStorage
    function loadUserPrompts() {
        try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : {}; } catch(e){ return {}; }
    }
    function saveUserPrompts(obj) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); } catch(e){} }

    // merge lists: returns array of prompt objects with a flag `predefined` and `overridden` if user changed predefined
    function getAllPrompts() {
        const user = loadUserPrompts();
        const list = [];
        PREDEFINED.forEach(p => {
            const key = `${p.name}||${p.type}||${p.language}`;
            const userCopy = user[key];
            if (userCopy) {
                list.push(Object.assign({}, p, userCopy, { predefined: true, overridden: true }));
            } else {
                list.push(Object.assign({}, p, { predefined: true, overridden: false }));
            }
        });
        // add user-only prompts
        for (const k in user) {
            if (!user.hasOwnProperty(k)) continue;
            // skip if it's an override of a predefined (already included)
            const parts = k.split('||');
            const found = PREDEFINED.find(p => p.name === parts[0] && p.type === parts[1] && p.language === parts[2]);
            if (found) continue;
            const up = user[k];
            list.push(Object.assign({}, up, { predefined: false, overridden: false }));
        }
        return list;
    }

    // Utilities
    function promptKey(obj) { return `${obj.name}||${obj.type}||${obj.language}`; }

    // UI bindings
    let overlay, panel, nameSelect, nameInput, typeSelect, langSelect, colorInput, textArea;
    let exportBtn, importBtn, restoreBtn, newBtn, deleteBtn, cancelBtn, saveBtn;
    let discardBtn;
    let tabs;

    function bind() {
        overlay = document.querySelector('.prompts-overlay');
        panel = document.querySelector('.prompts-panel');
        nameSelect = document.getElementById('prompt-name-select');
        nameInput = document.getElementById('prompt-name-input');
        typeSelect = document.getElementById('prompt-type');
        langSelect = document.getElementById('prompt-language');
        colorInput = document.getElementById('prompt-color');
        textArea = document.getElementById('prompt-text');

        exportBtn = document.getElementById('prompts-export');
        importBtn = document.getElementById('prompts-import');
        restoreBtn = document.getElementById('prompts-restore');
        newBtn = document.getElementById('prompts-new');
        deleteBtn = document.getElementById('prompts-delete');
        discardBtn = document.getElementById('prompts-discard');
        cancelBtn = document.getElementById('prompts-cancel');
        saveBtn = document.getElementById('prompts-save');
        tabs = document.querySelectorAll('.prompts-tab');

        // populate placeholder texts from locale (placeholders are not covered by simple textContent replacement)
        try {
            if (window.getLocale) {
                if (nameInput) nameInput.placeholder = window.getLocale('prompt_name_placeholder') || 'Enter prompt name';
                if (textArea) textArea.placeholder = window.getLocale('prompt_text_placeholder') || 'Prompt text... (use placeholders like {Word}, {Verse} — check help)';
                // Do not set a localized title on the cross icon; keep it as a simple decorative control.
            }
        } catch (e) { /* ignore */ }

        // wire events
        document.querySelector('.prompts-close')?.addEventListener('click', hidePanel);
        overlay?.addEventListener('click', hidePanel);
        cancelBtn?.addEventListener('click', hidePanel);

        tabs.forEach(t => t.addEventListener('click', (e)=>{
            tabs.forEach(x=>x.classList.remove('active'));
            t.classList.add('active');
            const tab = t.dataset.tab;
            document.querySelectorAll('[data-panel]').forEach(p => { p.classList.toggle('hidden', p.dataset.panel !== tab); });
        }));

        nameSelect?.addEventListener('change', onSelectChange);
        exportBtn?.addEventListener('click', onExport);
        newBtn?.addEventListener('click', onNew);
        discardBtn?.addEventListener('click', onDiscard);
        saveBtn?.addEventListener('click', onSave);

        // update Save button when user edits fields so Save is enabled for changes
        const touchFields = [colorInput, textArea, nameInput, typeSelect, langSelect];
        touchFields.forEach(f => {
            if (!f) return;
            f.addEventListener('input', () => { evaluateSaveState(); });
            f.addEventListener('change', () => { evaluateSaveState(); });
        });

        // show a one-time warning when the user types a long prompt name (>=70 chars)
        if (nameInput) {
            nameInput.addEventListener('input', () => {
                try {
                    const v = nameInput.value || '';
                    // Only warn when creating a new prompt (name input visible)
                    if (nameInput.classList.contains('hidden') && !isNewMode) { nameLengthWarnShown = false; return; }
                    if (!nameLengthWarnShown && v.length >= 70) {
                        nameLengthWarnShown = true;
                        const tpl = (window.getLocale ? window.getLocale('prompt_name_length_warning') : null) || 'Prompt name is getting long ({0}/80 characters)';
                        const msg = tpl.replace('{0}', String(v.length));
                        if (window.showAlert) window.showAlert(msg);
                    } else if (v.length < 70) {
                        nameLengthWarnShown = false;
                    }
                } catch (e) { /* ignore */ }
            });
        }

        // double click delete/restore pattern
        let last_delete_click_time = 0;
        deleteBtn?.addEventListener('click', () => {
            if (last_delete_click_time === 0) {
                last_delete_click_time = Date.now();
                if (window.showAlert) window.showAlert('Click delete once more to delete', 1500);
                setTimeout(()=>{ last_delete_click_time = 0; }, 1550);
            } else if (Date.now() - last_delete_click_time <= 1500) {
                doDelete();
                last_delete_click_time = 0;
            }
        });

        let last_restore_click_time = 0;
        restoreBtn?.addEventListener('click', () => {
            if (last_restore_click_time === 0) {
                last_restore_click_time = Date.now();
                if (window.showAlert) window.showAlert('Click restore once more to restore predefined prompt', 1500);
                setTimeout(()=>{ last_restore_click_time = 0; }, 1550);
            } else if (Date.now() - last_restore_click_time <= 1500) {
                doRestore();
                last_restore_click_time = 0;
            }
        });

        // import file input
        importBtn?.addEventListener('click', ()=>{
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,application/json';
            input.onchange = (e)=>{
                const f = e.target.files && e.target.files[0];
                if (!f) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        const json = JSON.parse(ev.target.result);
                        importPrompt(json);
                        renderNames();
                        if (window.showAlert) window.showAlert('Import complete');
                    } catch (err) { if (window.showAlert) window.showAlert('Import failed'); }
                };
                reader.readAsText(f);
            };
            input.click();
        });

        // clicking prompts-toggle in toolbar opens panel
        const toggle = document.getElementById('prompts-toggle');
        if (toggle) toggle.addEventListener('click', ()=>{ showPanel(); });

        // keyboard escape
        document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape' && panel && panel.classList.contains('active')) hidePanel(); });
    }

    function renderNames(selectedKey) {
        const list = getAllPrompts();
        nameSelect.innerHTML = '';
        list.forEach(p => {
            const opt = document.createElement('option');
            const key = promptKey(p);
            opt.value = key;
            opt.textContent = p.name + ' — ' + p.type + ' / ' + p.language + (p.predefined ? (p.overridden ? ' *' : '') : '');
            nameSelect.appendChild(opt);
        });
        if (selectedKey) nameSelect.value = selectedKey;
        // if empty, add placeholder
        if (!nameSelect.value && nameSelect.options.length) nameSelect.selectedIndex = 0;
        onSelectChange();
    }

    // Returns true if the current form values exactly match the given prompt object
    function formMatchesPrompt(promptObj) {
        if (!promptObj) return false;
        const name = nameSelect && !nameSelect.classList.contains('hidden') ? (nameSelect.options[nameSelect.selectedIndex].text.split(' — ')[0]) : nameInput.value.trim();
        const type = typeSelect.value;
        const language = langSelect.value;
        const color = colorInput.value;
        const text = textArea.value || '';
        return promptObj.name === name && promptObj.type === type && promptObj.language === language && (promptObj.color || '') === (color || '') && (promptObj.text || '') === (text || '');
    }

    function evaluateSaveState() {
        // If creating new prompt, always allow save
        if (isNewMode) { if (saveBtn) saveBtn.disabled = false; return; }
        const key = nameSelect && nameSelect.value;
        if (!key) { if (saveBtn) saveBtn.disabled = false; return; }
        const prompts = getAllPrompts();
        const p = prompts.find(x => promptKey(x) === key);
        if (!p) { if (saveBtn) saveBtn.disabled = false; return; }
        if (p.predefined) {
            // if form currently matches the predefined prompt values, disable Save
            const pre = PREDEFINED.find(pp => pp.name === p.name && pp.type === p.type && pp.language === p.language);
            if (pre && formMatchesPrompt(pre)) {
                if (saveBtn) saveBtn.disabled = true; return;
            }
        }
        // otherwise enable save
        if (saveBtn) saveBtn.disabled = false;
    }

    function onSelectChange() {
        const key = nameSelect.value;
        if (!key) return;
        const parts = key.split('||');
        const prompts = getAllPrompts();
        const p = prompts.find(x => promptKey(x) === key);
        if (!p) return;
        // populate fields
        nameInput.value = p.name;
        typeSelect.value = p.type;
        langSelect.value = p.language;
        colorInput.value = p.color || '#ff7f50';
        textArea.value = p.text || '';
        // set readonly state
        nameSelect.classList.remove('hidden'); nameInput.classList.add('hidden');
        typeSelect.disabled = true; langSelect.disabled = true;
        // disable delete for predefined prompts
        try { if (deleteBtn) deleteBtn.disabled = !!p.predefined; } catch (e) { }
        // restore button only enabled for overridden predefined prompts
        try { if (restoreBtn) restoreBtn.disabled = !(!!p.predefined && !!p.overridden); } catch (e) { }
        // evaluate whether Save should be enabled for this selection
        evaluateSaveState();
    }

    function showPanel() {
        renderNames();
        overlay.classList.add('active'); panel.classList.add('active');
        // Ensure textarea cannot be made smaller than its initial rendered height.
        // This prevents the textarea being resized upward (smaller) by the user.
        try {
            setTimeout(() => {
                if (textArea) {
                    const h = Math.round(textArea.getBoundingClientRect().height);
                    textArea.style.minHeight = h + 'px';
                }
                // also ensure panel does not exceed viewport
                if (panel) {
                    const maxH = Math.max(window.innerHeight - 40, 200);
                    panel.style.maxHeight = maxH + 'px';
                }
            }, 60);
        } catch (e) { /* ignore */ }
    }
    function hidePanel() { overlay.classList.remove('active'); panel.classList.remove('active'); }

    function onNew() {
        // switch to new mode: show input, enable type/lang selects
        // save previous state so discard can restore it
        prevState = {
            selectedKey: nameSelect?.value || null,
            fields: {
                name: nameInput?.value || '',
                type: typeSelect?.value || 'Verse',
                language: langSelect?.value || 'Sanskrit',
                color: colorInput?.value || '#ff7f50',
                text: textArea?.value || ''
            }
        };
        isNewMode = true;
        // show input
        nameSelect.classList.add('hidden'); nameInput.classList.remove('hidden');
        nameInput.value = '';
        typeSelect.disabled = false; langSelect.disabled = false;
        colorInput.value = '#ff7f50'; textArea.value = '';
        // disable other action buttons while creating new prompt
        setActionButtonsEnabled(false);
        // show discard
        discardBtn?.classList.remove('hidden');
        // when creating new, Save must be enabled
        if (saveBtn) saveBtn.disabled = false;
    }

    // state for new/discard behavior
    let prevState = null;
    let isNewMode = false;
    let nameLengthWarnShown = false;

    function onDiscard() {
        // revert to previous state if available
        if (!isNewMode) return;
        try {
            if (prevState && prevState.selectedKey) {
                // restore selection
                renderNames(prevState.selectedKey);
            } else {
                // no previous selection — clear fields and switch to select mode
                renderNames();
            }
            // hide new-mode UI
            nameSelect.classList.remove('hidden'); nameInput.classList.add('hidden');
            typeSelect.disabled = true; langSelect.disabled = true;
            // hide discard, enable action buttons
            discardBtn?.classList.add('hidden');
            setActionButtonsEnabled(true);
            isNewMode = false;
            prevState = null;
            // re-evaluate Save button when discarding new prompt
            evaluateSaveState();
        } catch (e) { /* ignore */ }
    }

    function setActionButtonsEnabled(enabled) {
        // Export, Import, Restore, New, Delete should be disabled during new prompt creation
        try {
            if (exportBtn) exportBtn.disabled = !enabled;
            if (importBtn) importBtn.disabled = !enabled;
            if (restoreBtn) restoreBtn.disabled = !enabled;
            if (newBtn) newBtn.disabled = !enabled;
            if (deleteBtn) deleteBtn.disabled = !enabled;
        } catch (e) { /* ignore */ }
    }

    function onSave() {
        const isNew = !nameSelect || nameSelect.classList.contains('hidden');
        const name = isNew ? nameInput.value.trim() : nameSelect.options[nameSelect.selectedIndex].text.split(' — ')[0];
        const type = typeSelect.value;
        const language = langSelect.value;
        const color = colorInput.value;
        const text = textArea.value || '';
        if (!name) { if (window.showAlert) window.showAlert('Prompt must have a name'); return; }
        // Enforce name length limit for new prompts
        if (isNew && name.length > 80) {
            const tooLongMsg = (window.getLocale ? window.getLocale('prompt_name_too_long') : null) || 'Prompt name must be 80 characters or fewer';
            if (window.showAlert) window.showAlert(tooLongMsg);
            return;
        }
        const key = `${name}||${type}||${language}`;
        // If this matches a predefined prompt exactly, do not save an override.
        const foundPre = PREDEFINED.find(p => p.name === name && p.type === type && p.language === language);
        const user = loadUserPrompts();
        if (foundPre) {
            const sameAsPre = ( (foundPre.color || '') === (color || '') ) && ( (foundPre.text || '') === (text || '') );
            if (sameAsPre) {
                // If a user override existed, remove it to truly restore predefined state.
                if (user[key]) { delete user[key]; saveUserPrompts(user); }
                // revert UI to select mode and refresh list without creating a new override
                nameSelect.classList.remove('hidden'); nameInput.classList.add('hidden');
                typeSelect.disabled = true; langSelect.disabled = true;
                isNewMode = false; prevState = null;
                discardBtn?.classList.add('hidden');
                setActionButtonsEnabled(true);
                renderNames(key);
                if (window.updateText) window.updateText();
                return; // ignore save since it's identical to predefined
            }
        }
        // Otherwise save/update as user prompt
        user[key] = { name, type, language, color, text };
        saveUserPrompts(user);
        // after save revert to select mode
        nameSelect.classList.remove('hidden'); nameInput.classList.add('hidden');
        typeSelect.disabled = true; langSelect.disabled = true;
        // clear new-mode state
        isNewMode = false; prevState = null;
        // hide discard and re-enable action buttons
        discardBtn?.classList.add('hidden');
        setActionButtonsEnabled(true);
        renderNames(key);
        if (window.updateText) window.updateText();
    }

    function doDelete() {
        // only delete user-defined prompts
        const key = nameSelect.value;
        if (!key) return;
        const parts = key.split('||');
        const found = PREDEFINED.find(p => p.name === parts[0] && p.type === parts[1] && p.language === parts[2]);
        if (found) { if (window.showAlert) window.showAlert('Cannot delete predefined prompt'); return; }
        const user = loadUserPrompts();
        if (user[key]) { delete user[key]; saveUserPrompts(user); renderNames(); }
    }

    function doRestore() {
        // restore predefined prompt if overridden
        const key = nameSelect.value;
        if (!key) return;
        const parts = key.split('||');
        const found = PREDEFINED.find(p => p.name === parts[0] && p.type === parts[1] && p.language === parts[2]);
        if (!found) return;
        const user = loadUserPrompts();
        const ukey = key;
        if (user[ukey]) { delete user[ukey]; saveUserPrompts(user); renderNames(ukey); }
    }

    function onExport() {
        const key = nameSelect.value;
        if (!key) return;
        const prompts = getAllPrompts();
        const p = prompts.find(x => promptKey(x) === key);
        if (!p) return;
        const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        const nameSafe = p.name.replace(/[^a-z0-9\-_]+/ig,'_');
        const ts = Date.now();
        a.href = URL.createObjectURL(blob);
        a.download = `JayaApp-Prompt-${nameSafe}-${ts}.json`;
        document.body.appendChild(a); a.click(); a.remove();
    }

    function importPrompt(json) {
        if (!json || !json.name || !json.type || !json.language) return;
        const key = `${json.name}||${json.type}||${json.language}`;
        const user = loadUserPrompts();
        // overwrite or add
        user[key] = { name: json.name, type: json.type, language: json.language, color: json.color || '#ff7f50', text: json.text || '' };
        saveUserPrompts(user);
    }

    // expose API for help panel integration (e.g., to build choices when clicking a word)
    window.promptsAPI = {
        getAllPrompts,
        loadUserPrompts,
        saveUserPrompts,
        promptKey
    };

    function initPrompts(attempts=6) {
        loadPredefinedPrompts();
        bind();
        const ok = document.querySelector('.prompts-overlay') && document.querySelector('.prompts-panel');
        if (!ok && attempts > 0) setTimeout(()=>initPrompts(attempts-1), 100);
    }

    window.initPrompts = initPrompts;
})();
