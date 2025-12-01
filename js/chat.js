/*
 Baseline chat UI implementation (ported baseline layout from aichat.js)
 - Conversation area (scrollable) above
 - Toolbar at bottom with: [reset] [/] [@]   (input)   [send]
 - User messages right-aligned, AI messages left-aligned
 - Lightweight API so main.js can call renderChat(container)
*/

// Keep instances per container so both orientations can maintain independent state
window.chatInstances = window.chatInstances || {};

// Shared chat sessions: hold message history and notify subscribed views
window.chatSessions = window.chatSessions || {};

class ChatSession {
    constructor(id) {
        this.id = id;
        this.messages = []; // { type: 'user'|'ai'|'system', text, timestamp }
        this.subscribers = new Set();

        document.addEventListener('runHelpMePrompt', (e) => {
            console.log('runHelpMePrompt event received', e);
        });
    }

    static get(id = 'default') {
        window.chatSessions = window.chatSessions || {};
        if (!window.chatSessions[id]) window.chatSessions[id] = new ChatSession(id);
        return window.chatSessions[id];
    }

    async fetchResponse(userMessage, caller) {
        // Ollama server communication (local or cloud proxy).
        // This implementation accumulates the response and emits a single
        // AI message when complete. It mirrors the basic request/stream
        // pattern used in the legacy aichat implementation.
        try {
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

            // Build request body similar to legacy implementation
            const requestBody = {
                model: model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage }
                ],
                stream: true
            };

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

            const resp = await fetch(apiUrl, { method: 'POST', headers, body: JSON.stringify(requestBody) });
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
                                if (parsed.message && parsed.message.content) {
                                    fullResponse += parsed.message.content;
                                } else if (typeof parsed === 'string') {
                                    fullResponse += parsed;
                                }
                            } catch (e) {
                                // not JSON -> append raw
                                fullResponse += line + '\n';
                            }
                        }
                    }
                    // append any remaining buffer (attempt parse or raw)
                    if (buffer) {
                        try {
                            const parsed = JSON.parse(buffer);
                            if (parsed.message && parsed.message.content) fullResponse += parsed.message.content;
                            else if (typeof parsed === 'string') fullResponse += parsed;
                        } catch (e) { fullResponse += buffer; }
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
                }
            } catch (err) {
                console.warn('Error while reading response stream:', err);
            }

            // Deliver AI message
            this.addMessage('ai', fullResponse || '');
        } catch (error) {
            console.error('fetchResponse error:', error);
            // emit an error AI message so UI can show it
            this.addMessage('ai', `Error: ${error.message}`);
        } finally {
            if (caller && typeof caller.removeThinkingIndicator === 'function') caller.removeThinkingIndicator();
        }
    }

    addMessage(type, text, caller) {
        const msg = { type, text, timestamp: Date.now() };
        this.messages.push(msg);
        this.subscribers.forEach(cb => {
            try { cb(msg); } catch (e) { console.error('chat subscriber error', e); }
        });

        if (type === 'user') {
            this.fetchResponse(text, caller);
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
                this.addMessageElement(msg.text, msg.type);
            }
        };
        this.initDOM();
        // render existing session messages
        this.session.getMessages().forEach(m => this.addMessageElement(m.text, m.type));
        this.session.subscribe(this.sessionCallback);
        this.bindEvents();
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
                        window.helpmeAPI.open(matchingPrompts);
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
                        window.helpmeAPI.open(matchingPrompts);
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
        // Add to shared session so all views receive the message
        this.session.addMessage('user', text, this);
        this.input.value = '';
    }

    addMessageElement(text, type) {
        const msg = document.createElement('div');
        msg.className = `chat-message ${type === 'user' ? 'user-message' : (type === 'ai' ? 'ai-message' : 'system-message')}`;
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
        // Clear shared session so all views clear
        this.session.clear();
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