/*
 Baseline chat UI implementation (ported baseline layout from aichat.js)
 - Conversation area (scrollable) above
 - Toolbar at bottom with: [reset] [/] [@]   (input)   [send]
 - User messages right-aligned, AI messages left-aligned
 - Lightweight API so main.js can call renderChat(container)
*/

// Global debug flag: set `window.DEBUG_CHAT = true` in the console to enable.
if (typeof window.DEBUG_CHAT === 'undefined') window.DEBUG_CHAT = true;

// Keep instances per container so both orientations can maintain independent state
window.chatInstances = window.chatInstances || {};

// Shared chat sessions: hold message history and notify subscribed views
window.chatSessions = window.chatSessions || {};

class ChatSession {
    constructor(id) {
        this.id = id;
        this.messages = []; // { type: 'user'|'ai'|'system', text, timestamp }
        this.subscribers = new Set();
        this.current_caller = null;

        // Request tracking and concurrency
        this.requestCounter = 0;
        this.pendingRequests = new Map(); // requestId -> { caller, controller }
        this.concurrent = true; // allow concurrent requests by default
        this.queue = [];
        this.isProcessingQueue = false;
    }

    static get(id = 'default') {
        window.chatSessions = window.chatSessions || {};
        if (!window.chatSessions[id]) window.chatSessions[id] = new ChatSession(id);
        return window.chatSessions[id];
    }

    get_current_caller() {
        return this.current_caller;
    }

    set_current_caller(caller) {
        this.current_caller = caller;
    }

    handleHelpMePrompt(prompt, clicked_detail, help_level) {
        // {Word} — the clicked word (Sanskrit or translation depending on context)
        // {Word_Index} — the clicked word index in verse
        // {Verse} — the clicked verse (Sanskrit or translation depending on context)
        // {Devanagari_Verse} — the Sanskrit Devanagari verse text corresponding to the currently clicked word or verse
        // {IAST_Verse} — the Sanskrit IAST verse text corresponding to the currently clicked word or verse
        // {BCV} — the resolved Book Number, Chapter Number, Verse number of the clicked element
        // {BCVW} — the resolved Book Number, Chapter Number, Verse number and Word number of the clicked Sanskrit word
        // {Lang_Code} — the language code of the clicked element (sa - Devanagari, sa-Latn - IAST, en - English, pl - Polish, etc.)
        // {Language} — the resolved language name of the clicked element
        // {Student_Level} — the level of the proficiency: beginner, intermediate, advanced
        // Let's now bild a map of placeholders to values
        const placeholderMap = { Student_Level: help_level || 'beginner' };

        // resolve clicked_detail values
        const book = (clicked_detail && clicked_detail.book) ? clicked_detail.book : null;
        const chapter = (clicked_detail && clicked_detail.chapter) ? clicked_detail.chapter : null;
        const verse = (clicked_detail && clicked_detail.verse) ? clicked_detail.verse : null;
        const lang = (clicked_detail && clicked_detail.lang) ? clicked_detail.lang : null;

        // helper: find the verse DOM element
        let verseEl = null;
        try {
            if (book && chapter && verse) {
                verseEl = document.querySelector(`.line-entry[data-book="${book}"][data-chapter="${chapter}"][data-verse="${verse}"]`);
            }
        } catch (e) { verseEl = null; }

        // extract available texts from DOM (Devanagari, IAST, and clicked-language translation)
        const devanagariText = (verseEl && verseEl.querySelector('.verse-text[lang="sa"]')) ?
            verseEl.querySelector('.verse-text[lang="sa"]').textContent.trim() : '';
        const iastText = (verseEl && verseEl.querySelector('.verse-text[lang="sa-Latn"]')) ?
            verseEl.querySelector('.verse-text[lang="sa-Latn"]').textContent.trim() : '';
        const clickedLangText = (verseEl && lang) ?
            (verseEl.querySelector(`.verse-text[lang="${lang}"]`) || {}).textContent : '';
        const clickedLangTextTrim = (typeof clickedLangText === 'string') ? clickedLangText.trim() : '';

        // pick the best Verse representation depending on clicked language
        const pickVerseForLang = (code) => {
            if (!code) return (devanagariText || iastText || clickedLangTextTrim || '');
            if (code === 'sa') return devanagariText || iastText || clickedLangTextTrim || '';
            if (code === 'sa-Latn') return iastText || devanagariText || clickedLangTextTrim || '';
            // translation language
            return clickedLangTextTrim || devanagariText || iastText || '';
        };

        // resolve human-readable language name if possible
        const resolveLanguageName = (code) => {
            try {
                if (!code) return '';
                if (window.translations && window.translations[code]) return window.translations[code];
                // fallback to localeData language names if available (two-letter codes)
                if (window.localeData && typeof window.localeData === 'object') {
                    for (const loc of Object.keys(window.localeData)) {
                        const mapping = window.localeData[loc];
                        if (mapping && mapping[code]) return mapping[code];
                    }
                }
            } catch (e) { /* ignore */ }
            return code || '';
        };

        // fill placeholders common to both branches
        placeholderMap['Verse'] = pickVerseForLang(lang);
        placeholderMap['Devanagari_Verse'] = devanagariText || '';
        placeholderMap['IAST_Verse'] = iastText || '';
        placeholderMap['BCV'] = (book && chapter && verse) ? `${book}:${chapter}:${verse}` : '';
        placeholderMap['Lang_Code'] = lang || '';
        placeholderMap['Language'] = resolveLanguageName(lang);

        if (clicked_detail.word) {
            // word-specific placeholders (highest precision: use provided click info)
            placeholderMap['Word'] = clicked_detail.text || '';
            placeholderMap['Word_Index'] = clicked_detail.word || '';
            placeholderMap['BCVW'] = (book && chapter && verse && clicked_detail.word) ? `${book}:${chapter}:${verse}:${clicked_detail.word}` : placeholderMap['BCV'];
        } else {
            // no specific word: synthesize reasonable defaults and leave word placeholders empty
            placeholderMap['Word'] = '';
            placeholderMap['Word_Index'] = '';
            placeholderMap['BCVW'] = placeholderMap['BCV'];
        }

        // Now add user message to chat session
        let userPromptText = '';
        if (prompt.type === 'Verse') {
            userPromptText = prompt.name + ': ' + placeholderMap['BCV'];
        }
        else if (prompt.type === 'Word') {
            userPromptText = prompt.name + ': ' + placeholderMap['BCVW'] + ` (${placeholderMap['Word']})`;   
        }
        else {
            throw new Error('Unknown prompt type: ' + prompt.type);
        }
        this.addMessage('user', userPromptText, false);

        // Now take prompt text and replace all placeholders occurrences with values
        console.log('Raw prompt:', prompt.text);
        let finalPromptText = prompt.text || '';
        for (const [ph, val] of Object.entries(placeholderMap)) {
            const re = new RegExp(`\\{${ph}\\}`, 'g');
            finalPromptText = finalPromptText.replace(re, val);
        }
        console.log('Final prompt:', finalPromptText);

        // Finally fetch response using the fully expanded prompt text
        // Capture caller at the moment of invocation to ensure correct association
        const caller = this.current_caller;
        const requestId = ++this.requestCounter;
        // Build minimal client_meta for help-me flows
        const promptObj = prompt || {};
        let promptSource = 'helpme_user';
        try {
            if (promptObj.predefined && !promptObj.overridden) promptSource = 'helpme_predefined';
        } catch (e) { /* ignore */ }
        const promptKey = `${promptObj.name || ''}||${promptObj.type || ''}||${promptObj.language || ''}`;
        const clientMeta = { prompt_source: promptSource, prompt_key: promptKey, help_level: help_level || 'beginner' };
        // include clicked identifiers if available
        if (placeholderMap['BCVW']) clientMeta.clicked = { BCVW: placeholderMap['BCVW'] };
        else if (placeholderMap['BCV']) clientMeta.clicked = { BCV: placeholderMap['BCV'] };

        this.fetchResponse(finalPromptText, { caller, requestId, meta: clientMeta });
    }

    // fetchResponse sends a request to the backend. It accepts an optional
    // options object { caller, requestId, controller }.
    async fetchResponse(userMessage, options = {}) {
        // Ollama server communication (local or cloud proxy).
        // This implementation accumulates the response and emits a single
        // AI message when complete. It mirrors the basic request/stream
        // pattern used in the legacy aichat implementation.
        // Capture caller and request metadata
        const caller = (options && options.caller) ? options.caller : this.current_caller;
        const requestId = (options && options.requestId) ? options.requestId : (++this.requestCounter);
        const controller = (options && options.controller) ? options.controller : new AbortController();

        // register pending request
        this.pendingRequests.set(requestId, { caller, controller });

        try {
            // create AI placeholder message for this request so UI has a stable bubble to update
            this.addMessage('ai', '', false, { requestId });
            if (caller && typeof caller.addThinkingIndicator === 'function') caller.addThinkingIndicator();

            // Resolve settings (prefer window.ollamaSettings if available)
            const settings = window.ollamaSettingsAPI || {};
            const serverType = (typeof settings.getServerType === 'function') ? settings.getServerType() : (localStorage.getItem('ollamaServerType') || 'local');
            const serverUrl = (typeof settings.getServerUrl === 'function') ? settings.getServerUrl() : (localStorage.getItem('ollamaServerUrl') || 'http://localhost:11434');
            const model = (typeof settings.getModel === 'function') ? settings.getModel() : (localStorage.getItem('ollamaModel') || '');
            const systemPrompt = (typeof settings.getSystemPrompt === 'function') ? settings.getSystemPrompt() : (localStorage.getItem('ollamaSystemPrompt') || 'You are an assistant helping with the Mahabharata and Sanskrit studies. Respond in the language of the user\'s query.');

            if (!model) {
                throw new Error('Ollama model not configured');
            }

            // Build request body, optionally including recent conversation history
            const chatHistorySetting = (typeof settings.getChatHistorySetting === 'function') ?
                settings.getChatHistorySetting() : (localStorage.getItem('ollamaChatHistory') || 'last_6');

            // Helper to map stored messages to API roles
            const mapMsg = (m) => ({ role: m.type === 'user' ? 'user' : (m.type === 'ai' ? 'assistant' : 'system'), content: m.text });

            // Filter out empty AI placeholders (they have requestId and empty text)
            const sessionMsgs = this.getMessages().filter(m => m && m.type && !((m.type === 'ai') && (!m.text || !m.text.trim())));

            let apiMessages = [{ role: 'system', content: systemPrompt }];

            if (chatHistorySetting === 'none') {
                apiMessages.push({ role: 'user', content: userMessage });
            } else if (chatHistorySetting === 'full') {
                // include all previous non-placeholder messages
                const mapped = sessionMsgs.map(mapMsg);
                apiMessages = [{ role: 'system', content: systemPrompt }, ...mapped];
                // If the current userMessage isn't already the last user message, append it
                const last = sessionMsgs[sessionMsgs.length - 1];
                const lastIsSameUser = last && last.type === 'user' && last.text === userMessage;
                if (!lastIsSameUser) apiMessages.push({ role: 'user', content: userMessage });
            } else {
                // last_N -> interpret as N recent turns (user+assistant), e.g. last_3, last_6, last_9
                let turns = 6; // default fallback
                try {
                    if (typeof chatHistorySetting === 'string' && chatHistorySetting.startsWith('last_')) {
                        const parts = chatHistorySetting.split('_');
                        const n = parseInt(parts[1], 10);
                        if (!Number.isNaN(n) && n > 0) turns = n;
                    }
                } catch (e) { /* ignore and use default */ }
                const maxEntries = turns * 2; // approximate user+ai pairs
                const slice = sessionMsgs.slice(-maxEntries);
                const mapped = slice.map(mapMsg);
                apiMessages = [{ role: 'system', content: systemPrompt }, ...mapped];
                const last = sessionMsgs[sessionMsgs.length - 1];
                const lastIsSameUser = last && last.type === 'user' && last.text === userMessage;
                if (!lastIsSameUser) apiMessages.push({ role: 'user', content: userMessage });
            }

            const requestBody = { model: model, messages: apiMessages, stream: true };
            // attach client_meta (from options.meta when provided) so backend and debug mode can see context
            const clientMeta = (options && options.meta) ? options.meta : { prompt_source: 'free_text' };
            requestBody.client_meta = clientMeta;

            // DEBUG mode: skip real network call, wait 2000ms and show the prompt/request body as the AI response
            try {
                if (window.DEBUG_CHAT) {
                    const debugText = 'DEBUG: would send request:\n' + JSON.stringify(requestBody, null, 2);
                    // simulate network latency
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    this.updateMessage(requestId, debugText);
                    return;
                }
            } catch (e) { /* ignore debug path errors and continue */ }

            // Determine API URL & headers
            let apiUrl;
            const headers = { 'Content-Type': 'application/json' };

            if (serverType === 'cloud') {
                // Use backend proxy
                apiUrl = `${GITHUB_CONFIG.serverURL}/api/ollama/proxy-chat`;
                if (typeof settings.getAuthHeaders === 'function') {
                    const auth = await settings.getAuthHeaders();
                    Object.assign(headers, auth);
                } else if (window.userManager && window.userManager.sessionToken) {
                    headers['Authorization'] = `Bearer ${window.userManager.sessionToken}`;
                    try {
                        if (typeof window.userManager.getCSRFToken === 'function') {
                            const csrf = await window.userManager.getCSRFToken();
                            if (csrf) headers['X-CSRF-Token'] = csrf;
                        }
                    } catch (e) { /* ignore */ }
                }
            } else {
                apiUrl = `${serverUrl}/api/chat`;
            }

            const resp = await fetch(apiUrl, { method: 'POST', headers, body: JSON.stringify(requestBody), signal: controller.signal });
            if (!resp.ok) {
                const errText = await resp.text();
                throw new Error(`Server error ${resp.status}: ${errText}`);
            }

            // If server streams JSON lines, read and accumulate; otherwise fallback to text/json
            let fullResponse = '';
            try {
                if (resp.body && typeof resp.body.getReader === 'function') {
                    const reader = resp.body.getReader();
                    const decoder = new TextDecoder();
                    let buffer = '';
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop();
                        for (const line of lines) {
                            if (!line || !line.trim()) continue;
                            try {
                                const parsed = JSON.parse(line);
                                let chunk = '';
                                if (parsed.message && parsed.message.content) chunk = parsed.message.content;
                                else if (typeof parsed === 'string') chunk = parsed;
                                if (chunk) {
                                    fullResponse += chunk;
                                    this.updateMessage(requestId, fullResponse);
                                }
                            } catch (e) {
                                // not JSON -> append raw
                                fullResponse += line + '\n';
                                this.updateMessage(requestId, fullResponse);
                            }
                        }
                    }
                    // append any remaining buffer (attempt parse or raw)
                    if (buffer) {
                        try {
                            const parsed = JSON.parse(buffer);
                            if (parsed.message && parsed.message.content) fullResponse += parsed.message.content;
                            else if (typeof parsed === 'string') fullResponse += parsed;
                            this.updateMessage(requestId, fullResponse);
                        } catch (e) { fullResponse += buffer; this.updateMessage(requestId, fullResponse); }
                    }
                } else {
                    // Non-streaming fallback
                    try {
                        const j = await resp.json();
                        if (j && j.message && j.message.content) fullResponse = j.message.content;
                        else if (typeof j === 'string') fullResponse = j;
                        else fullResponse = JSON.stringify(j);
                    } catch (e) {
                        fullResponse = await resp.text();
                    }
                    // deliver final
                    this.updateMessage(requestId, fullResponse);
                }
            } catch (err) {
                console.warn('Error while reading response stream:', err);
                this.updateMessage(requestId, fullResponse || ('Error: ' + (err && err.message ? err.message : String(err))));
            }
        } catch (error) {
            console.error('fetchResponse error:', error);
            this.updateMessage(requestId, `Error: ${error.message}`);
        } finally {
            // Clean up pending request and thinking indicator
            try {
                const pending = this.pendingRequests.get(requestId);
                if (pending) {
                    if (pending.caller && typeof pending.caller.removeThinkingIndicator === 'function') pending.caller.removeThinkingIndicator();
                    this.pendingRequests.delete(requestId);
                } else if (caller && typeof caller.removeThinkingIndicator === 'function') {
                    // fallback
                    caller.removeThinkingIndicator();
                }
            } catch (e) { /* ignore */ }
        }
    }

    // Update an existing AI placeholder message identified by requestId.
    updateMessage(requestId, text) {
        // Find the message with matching requestId
        const msg = this.messages.find(m => m && m.requestId === requestId);
        if (msg) {
            msg.text = text;
            // notify subscribers with an update envelope
            this.subscribers.forEach(cb => {
                try { cb({ update: true, requestId, text }); } catch (e) { console.error('chat subscriber error', e); }
            });
        } else {
            // fallback: append a new AI message
            this.addMessage('ai', text);
        }
    }

    // Cancel a pending request
    cancelRequest(requestId) {
        const pending = this.pendingRequests.get(requestId);
        if (pending && pending.controller) {
            try { pending.controller.abort(); } catch (e) { /* ignore */ }
            this.pendingRequests.delete(requestId);
        }
    }

    addMessage(type, text, fetchResponse = true, opts = {}) {
        const msg = { type, text, timestamp: Date.now() };
        if (opts && opts.requestId) msg.requestId = opts.requestId;
        this.messages.push(msg);
        this.subscribers.forEach(cb => {
            try { cb(msg); } catch (e) { console.error('chat subscriber error', e); }
        });

        // For user messages, use the session's current caller (if any)
        if (type === 'user' && fetchResponse) {
            // capture caller immediately
            const caller = this.current_caller;
            const requestId = ++this.requestCounter;
            // allow callers to pass meta via opts.meta; otherwise default to free_text
            const meta = (opts && opts.meta) ? opts.meta : { prompt_source: 'free_text' };
            this.fetchResponse(text, { caller, requestId, meta });
        }

        return msg;
    }

    clear() {
        this.messages = [];
        // notify subscribers to clear
        this.subscribers.forEach(cb => {
            try { cb({ clear: true }); } catch (e) { /* silent */ }
        });
    }

    getMessages() { return this.messages.slice(); }

    subscribe(cb) { this.subscribers.add(cb); }
    unsubscribe(cb) { this.subscribers.delete(cb); }
}

class ChatView {
    constructor(container, sessionId = 'default') {
        this.container = container;
        this.container.classList.add('jaya-chat-container');
        this.conversation = null;
        this.input = null;
        this.sendBtn = null;
        this.resetBtn = null;
        this.helpMeBtn = null;
        this.toolbar = null;
        this.session = ChatSession.get(sessionId);
        this.forceCompact = false;
        this.help_me_hint_duration = 5000;
        this.last_helpme_click_time = 0;
        this.sessionCallback = (msg) => {
            if (msg && msg.clear) {
                // session cleared
                this.conversation.innerHTML = '';
            } else if (msg) {
                // support update envelopes from session.updateMessage
                if (msg.update && msg.requestId) {
                    // find existing DOM element with matching requestId and update its content
                    try {
                        const el = this.conversation.querySelector(`[data-request-id="${msg.requestId}"]`);
                        if (el) {
                            const bubble = el.querySelector('.chat-bubble');
                            if (bubble) bubble.innerHTML = this.escapeHtml(msg.text || '').replace(/\n/g, '<br>');
                            // keep scroll bottom
                            this.conversation.scrollTop = this.conversation.scrollHeight;
                            return;
                        }
                    } catch (e) { /* ignore and fallthrough to add */ }
                }
                this.addMessageElement(msg.text, msg.type, msg.requestId);
            }
        };
        this.initDOM();
        // render existing session messages
        this.session.getMessages().forEach(m => this.addMessageElement(m.text, m.type));
        this.session.subscribe(this.sessionCallback);
        this.bindEvents();
        // Mark this view as the current caller when it becomes active
        try {
            this.container.addEventListener('focusin', () => { try { this.session.set_current_caller(this); } catch (e) {} });
            this.container.addEventListener('click', () => { try { this.session.set_current_caller(this); } catch (e) {} });
            if (this.input) this.input.addEventListener('focus', () => { try { this.session.set_current_caller(this); } catch (e) {} });
        } catch (e) { /* silent */ }
        // Observe container size changes and update toolbar layout
        this.resizeObserver = new ResizeObserver(() => this.updateToolbarLayout());
        try { this.resizeObserver.observe(this.container); } catch (e) { /* silent */ }
        // Call once to set initial layout state
        this.updateToolbarLayout();
        // initial resize to ensure the textarea height fits single line
        this.resizeInput();
    }

    initDOM() {
        // Clear existing content but preserve container classes
        this.container.innerHTML = '';

        // Conversation area
        this.conversation = document.createElement('div');
        this.conversation.className = 'chat-conversation';

        // Toolbar (thin separator) with buttons and input
        this.toolbar = document.createElement('div');
        this.toolbar.className = 'chat-toolbar';

        // Left controls (reset, /, @)
        const leftControls = document.createElement('div');
        leftControls.className = 'chat-toolbar-left';

        this.resetBtn = document.createElement('button');
        this.resetBtn.type = 'button';
        this.resetBtn.className = 'chat-btn reset-btn';
        this.resetBtn.title = 'Reset chat';
        this.resetBtn.innerHTML = window.getLocale ?
            window.getLocale('reset') || 'Reset' : 'Reset';

        this.helpMeBtn = document.createElement('button');
        this.helpMeBtn.type = 'button';
        this.helpMeBtn.className = 'chat-btn help-me-btn';
        this.helpMeBtn.title = 'Help me';
        this.helpMeBtn.innerHTML = window.getLocale ?
            window.getLocale('help_me') || 'Help me' : 'Help me';

        leftControls.appendChild(this.resetBtn);
        leftControls.appendChild(this.helpMeBtn);

        // Middle: input
        const middle = document.createElement('div');
        middle.className = 'chat-toolbar-middle';
        this.input = document.createElement('textarea');
        this.input.className = 'chat-input';
        this.input.rows = 1;
        this.input.placeholder = window.getLocale ?
            window.getLocale('type_a_message') || 'Type a message...' : 'Type a message...';
        middle.appendChild(this.input);

        // Right: send
        const rightControls = document.createElement('div');
        rightControls.className = 'chat-toolbar-right';
        this.sendBtn = document.createElement('button');
        this.sendBtn.type = 'button';
        this.sendBtn.className = 'chat-btn send-btn';
        this.sendBtn.title = 'Send message';
        this.sendBtn.innerHTML = window.getLocale ?
            window.getLocale('send') || 'Send' : 'Send';
        rightControls.appendChild(this.sendBtn);

        this.toolbar.appendChild(leftControls);
        this.toolbar.appendChild(middle);
        this.toolbar.appendChild(rightControls);

        // Put conversation and toolbar into container
        this.container.appendChild(this.conversation);
        this.container.appendChild(this.toolbar);
    }

    bindEvents() {
        // Send on button click
        this.sendBtn.addEventListener('click', () => this.handleSend());

        // Enter to send (Shift+Enter for newline)
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        });

        // Reset
        let last_reset_click_time = 0;
        this.resetBtn.addEventListener('click', () => {
            if (window.showAlert && last_reset_click_time === 0) {
                last_reset_click_time = Date.now();
                window.showAlert(
                window.getLocale('click_reset_once_more_to_reset')
                    || 'Click reset once more to confirm reset', 1500);
                setTimeout(() => { last_reset_click_time = 0; }, 1550);
            }
            else if (Date.now() - last_reset_click_time <= 1500) {
                this.reset();
                last_reset_click_time = 0;
            }
        });

        // Help me
        this.helpMeBtn.addEventListener('click', () => {
            if (window.showAlert) {
                this.last_helpme_click_time = Date.now();
                window.showAlert(
                    window.getLocale('help_me_hint')
                    || 'Click a word or a verse area next', this.help_me_hint_duration);
                setTimeout(() => { this.last_helpme_click_time = 0; }, this.help_me_hint_duration+50);
            }
        });

        document.addEventListener('verseClicked', (e) => {
            if (this.last_helpme_click_time > 0 &&
                Date.now() - this.last_helpme_click_time <= this.help_me_hint_duration) {
                const detail = e.detail || {};
                if (window.promptsAPI) {
                    const all = window.promptsAPI.getAllPrompts();
                    // Find prompts that have type property
                    // "Verse" and language property "Sanskrit"
                    const matchingPrompts = all.filter(p => {
                        return p.type === 'Verse' && p.language === 'Sanskrit';
                    });
                    if (matchingPrompts.length > 0
                        && window.helpmeAPI) {
                        if (window.highlightVerse) {
                            window.highlightVerse(detail.verse, e.detail.lang,'sa');
                            window.highlightVerse(detail.verse, e.detail.lang,'sa-Latn');
                        }
                        window.helpmeAPI.open(matchingPrompts, detail);
                    }
                }
            }
        });

        document.addEventListener('wordClicked', (e) => {
            if (this.last_helpme_click_time > 0 &&
                Date.now() - this.last_helpme_click_time <= this.help_me_hint_duration) {
                const detail = e.detail || {};
                const word_language  = detail.lang == 'sa' ||
                    detail.lang == 'sa-Latn' ? 'Sanskrit' : 'Translation';
                if (window.promptsAPI) {
                    const all = window.promptsAPI.getAllPrompts();
                    // Find prompts that have type property
                    // "Word" and language property matching clicked word lang
                    let matchingPrompts = all.filter(p => {
                        return p.type === 'Word' && p.language === word_language;
                    });
                    if (word_language === 'Translation') {
                        // Include also "Verse" type prompts for the same language translation
                        const versePrompts = all.filter(p => {
                            return p.type === 'Verse' && p.language === word_language;
                        });
                        matchingPrompts = matchingPrompts.concat(versePrompts);
                    }
                    if (matchingPrompts.length > 0
                        && window.helpmeAPI) {
                        if (window.highlightWord) {
                            window.highlightWord(detail.verse, detail.word, detail.lang);
                        }
                        window.helpmeAPI.open(matchingPrompts, detail);
                    }
                }
            }
        });

        // Auto-resize input and detect multiline -> force compact toolbar
        this.input.addEventListener('input', () => {
            this.resizeInput();
            this.updateToolbarLayout();
        });

        document.addEventListener('localeChanged', () => {
            this.input.placeholder = window.getLocale ?
                window.getLocale('type_a_message') ||
                    'Type a message...' : 'Type a message...';
            this.resetBtn.innerHTML = window.getLocale ?
                window.getLocale('reset') || 'Reset' : 'Reset';
            this.helpMeBtn.innerHTML = window.getLocale ?
                window.getLocale('help_me') || 'Help me' : 'Help me';
            this.sendBtn.innerHTML = window.getLocale ?
                window.getLocale('send') || 'Send' : 'Send';
        });
    }

    resizeInput() {
        try {
            const el = this.input;
            if (!el) return;
            // Reset to compute scrollHeight correctly
            el.style.height = 'auto';
            const cs = window.getComputedStyle(el);
            // Determine line height in px
            let lineHeight = parseFloat(cs.lineHeight);
            if (!lineHeight || Number.isNaN(lineHeight)) {
                const fontSize = parseFloat(cs.fontSize) || 14;
                lineHeight = Math.round(fontSize * 1.2);
            }
            // padding (top+bottom)
            const paddingTop = parseFloat(cs.paddingTop) || 0;
            const paddingBottom = parseFloat(cs.paddingBottom) || 0;
            const borderTop = parseFloat(cs.borderTopWidth) || 0;
            const borderBottom = parseFloat(cs.borderBottomWidth) || 0;
            const extra = paddingTop + paddingBottom + borderTop + borderBottom;
            // compute maxHeight for 5 lines
            const maxHeight = Math.round(lineHeight * 5 + extra);
            const scrollH = el.scrollHeight;
            const desiredH = Math.min(scrollH, maxHeight);
            el.style.height = desiredH + 'px';
            // toggle vertical overflow only when content exceeds max height
            if (scrollH > maxHeight - 1) {
                el.style.overflowY = 'auto';
            } else {
                el.style.overflowY = 'hidden';
            }
            // Decide whether input is multiline
            const isMultiline = (scrollH > lineHeight + extra + 1);
            this.forceCompact = isMultiline;
        } catch (e) { /* silent */ }
    }

    insertAtCursor(text) {
        const el = this.input;
        if (!el) return;
        const start = el.selectionStart || 0;
        const end = el.selectionEnd || 0;
        const value = el.value || '';
        el.value = value.slice(0, start) + text + value.slice(end);
        const pos = start + text.length;
        try { el.setSelectionRange(pos, pos); el.focus(); } catch (e) { /* ignore */ }
    }

    handleSend() {
        const text = (this.input.value || '').trim();
        if (!text) return;
        // Ensure this view is set as the current caller so the session
        // can show thinking indicators on the correct view.
        try { this.session.set_current_caller(this); } catch (e) { /* ignore */ }
        // Add to shared session so all views receive the message
        this.session.addMessage('user', text);
        this.input.value = '';
    }

    addMessageElement(text, type, requestId) {
        const msg = document.createElement('div');
        msg.className = `chat-message ${type === 'user' ? 'user-message' : (type === 'ai' ? 'ai-message' : 'system-message')}`;
        if (requestId) msg.setAttribute('data-request-id', String(requestId));
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        bubble.innerHTML = this.escapeHtml(text).replace(/\n/g, '<br>');
        msg.appendChild(bubble);
        this.conversation.appendChild(msg);
        // keep scroll bottom
        this.conversation.scrollTop = this.conversation.scrollHeight;
    }

    addThinkingIndicator() {
        if (this.thinkingEl) return;
        this.thinkingEl = document.createElement('div');
        this.thinkingEl.className = 'chat-message ai-message thinking';
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        // Create animated dots container
        const dots = document.createElement('div');
        dots.className = 'thinking-dots';
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('span');
            dot.className = 'thinking-dot';
            dot.setAttribute('aria-hidden', 'true');
            dots.appendChild(dot);
        }
        // Optional accessible status for screen readers
        const sr = document.createElement('span');
        sr.className = 'sr-only';
        sr.textContent = 'Thinking';
        // Mark bubble as status so screen readers are notified
        bubble.setAttribute('aria-live', 'polite');
        bubble.appendChild(dots);
        bubble.appendChild(sr);
        this.thinkingEl.appendChild(bubble);
        this.conversation.appendChild(this.thinkingEl);
        this.conversation.scrollTop = this.conversation.scrollHeight;
    }

    removeThinkingIndicator() {
        if (this.thinkingEl && this.thinkingEl.parentNode) {
            this.thinkingEl.parentNode.removeChild(this.thinkingEl);
            this.thinkingEl = null;
        }
    }

    reset() {
        // Save the current session snapshot before clearing, then clear views
        try {
            if (window.chatAPI && typeof window.chatAPI.saveCurrentSessionAsNew === 'function') {
                window.chatAPI.saveCurrentSessionAsNew();
                document.dispatchEvent(new CustomEvent('savedChatAdded'));
            }
        } catch (e) { console.error(e); }
        try {
            this.clear();
        } catch (e) { /* ignore */ }
        try { this.session.clear(); } catch (e) { /* ignore */ }
    }

    // Layout update: detect when the input area is less than 70% of container width
    updateToolbarLayout() {
        try {
            if (!this.container || !this.toolbar || !this.input) return;
            const containerWidth = this.container.clientWidth || 0;
            // To avoid layout oscillation, compute the available width for the input under normal (non-compact) layout.
            const wasCompact = this.toolbar.classList.contains('compact');
            if (wasCompact) this.toolbar.classList.remove('compact');
            const left = this.toolbar.querySelector('.chat-toolbar-left');
            const right = this.toolbar.querySelector('.chat-toolbar-right');
            const leftWidth = left ? left.getBoundingClientRect().width : 0;
            const rightWidth = right ? right.getBoundingClientRect().width : 0;
            // compute gap from CSS if available
            const cs = window.getComputedStyle(this.toolbar);
            let gapApprox = 0;
            try {
                gapApprox = parseFloat(cs.columnGap || cs.gap || cs.gridColumnGap) || 0;
            } catch (e) { gapApprox = 0; }
            // add some padding safety margin
            gapApprox = gapApprox + 16;
            const inputAvailableWidth = Math.max(0, containerWidth - leftWidth - rightWidth - gapApprox);
            const threshold = 0.7 * containerWidth;
            const shouldCompact = (this.forceCompact === true) || (containerWidth > 0 && inputAvailableWidth < threshold);
            if (shouldCompact) this.toolbar.classList.add('compact');
            else this.toolbar.classList.remove('compact');
            const nowCompact = this.toolbar.classList.contains('compact');
            if (nowCompact !== wasCompact) {
                // layout changed - recompute input sizing after layout settles
                setTimeout(() => { this.resizeInput(); }, 0);
            }
            if (wasCompact && !shouldCompact) {
                // restored to non-compact: make sure input still fits / update scroll
            }
        } catch (e) { /* silent */ }
    }

    escapeHtml(unsafe) {
        return unsafe.replace(/[&<>"']/g, function(m) {
            switch (m) {
                case '&': return '&amp;';
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '"': return '&quot;';
                case "'": return '&#039;';
            }
        });
    }
}

// main entry used by existing code

// Global router for runHelpMePrompt events. Routes prompt requests to a single
// authoritative session (default) unless `sessionId` is provided in event.detail.
if (!window.chatHelpRouterInstalled) {
    document.addEventListener('runHelpMePrompt', (e) => {
        const d = (e && e.detail) ? e.detail : {};
        const sessionId = d.sessionId || 'default';
        try {
            const session = ChatSession.get(sessionId);
            if (session && typeof session.handleHelpMePrompt === 'function') {
                session.handleHelpMePrompt(d.prompt, d.clicked_detail, d.help_level);
            }
        } catch (err) {
            console.error('runHelpMePrompt router error', err);
        }
    });
    window.chatHelpRouterInstalled = true;
}

function renderChat(container) {
    if (!container) return;
    // preserve id or generate one
    const id = container.id || ('chat-' + Math.random().toString(36).slice(2,9));
    if (!container.id) container.id = id;
    if (window.chatInstances[id]) return window.chatInstances[id];
    const view = new ChatView(container);
    window.chatInstances[id] = view;
    return view;
}

// expose globally for quick access
window.renderChat = renderChat;