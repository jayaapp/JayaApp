(function(){
    // helpme module: exposes helpmeInit() and window.helpmeAPI.open(prompts = [])
    let overlay, panel, listEl, closeBtn;
    let isInit = false;
    let clickedPromptDetail = null;
    let selectEl = null;
    const STORAGE_KEY = 'jayaapp::helpme_level';

    function createItemElement(prompt) {
        const item = document.createElement('div');
        item.className = 'helpme-item';
        // store color on data attribute and set CSS variable for overlay
        const color = prompt.color || '#888';
        item.setAttribute('data-color', color);
        item.style.setProperty('--overlay-color', hexToRgba(color, 0.5));

        const inner = document.createElement('div');
        inner.className = 'helpme-item-inner';
        inner.textContent = prompt.name || (prompt.title || 'Unnamed Prompt');
        item.appendChild(inner);

        // click emits a document-level event with the full prompt object
        item.addEventListener('click', (e)=>{
            // Use the standard CustomEvent `detail` field so listeners
            // receive the payload as `event.detail`. Include the selected
            // help level code (non-localized) under `help_level`.
            const level = (selectEl && selectEl.value) ? selectEl.value : (localStorage.getItem(STORAGE_KEY) || 'beginner');
            const ev = new CustomEvent('runHelpMePrompt', { detail: { prompt: prompt, clicked_detail: clickedPromptDetail, help_level: level } });
            document.dispatchEvent(ev);
            close();
        });

        return item;
    }

    function hexToRgba(hex, alpha) {
        try {
            let h = hex.replace('#','');
            if (h.length === 3) h = h.split('').map(c=>c+c).join('');
            const r = parseInt(h.substring(0,2),16);
            const g = parseInt(h.substring(2,4),16);
            const b = parseInt(h.substring(4,6),16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        } catch(e) { return `rgba(0,0,0,${alpha})`; }
    }

    function open(prompts = [], clicked_detail = null) {
        if (!isInit) helpmeInit();
        // clear list
        listEl.innerHTML = '';
        // build items
        prompts.forEach(p => {
            const item = createItemElement(p);
            listEl.appendChild(item);
        });
        // store clicked detail
        clickedPromptDetail = clicked_detail;
        // restore previously selected level if available
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (selectEl && stored) selectEl.value = stored;
        } catch (e) { /* ignore */ }
        // show panel
        overlay.classList.add('active');
        panel.classList.add('active');
        panel.setAttribute('aria-hidden','false');
        // set window flag notifying the app that helpme panel is open
        window.isHelpMePanelOpen = true;
    }

    function close() {
        overlay.classList.remove('active');
        panel.classList.remove('active');
        panel.setAttribute('aria-hidden','true');
        if (window.dehighlightAll) {
            window.dehighlightAll();
        }
        // unset window flag notifying the app that helpme panel is open
        window.isHelpMePanelOpen = false;
    }

    function bindEvents() {
        overlay.addEventListener('click', close);
        closeBtn.addEventListener('click', close);
        document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') close(); });
        if (selectEl) {
            selectEl.addEventListener('change', () => {
                try { localStorage.setItem(STORAGE_KEY, selectEl.value); } catch (e) { /* ignore */ }
            });
        }
    }

    function helpmeInit(attempts=6) {
        overlay = document.querySelector('.helpme-overlay');
        panel = document.querySelector('.helpme-panel');
        listEl = document.getElementById('helpme-list');
        closeBtn = panel ? panel.querySelector('.helpme-close') : null;
        selectEl = panel ? panel.querySelector('#help-level-select') : null;
        if (!overlay || !panel || !listEl || !closeBtn) {
            if (attempts > 0) return setTimeout(()=>helpmeInit(attempts-1), 100);
            return; // give up
        }
        bindEvents();
        isInit = true;
    }

    window.helpmeInit = helpmeInit;
    window.helpmeAPI = { open };
})();