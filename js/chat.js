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
    }

    static get(id = 'default') {
        window.chatSessions = window.chatSessions || {};
        if (!window.chatSessions[id]) window.chatSessions[id] = new ChatSession(id);
        return window.chatSessions[id];
    }

    addMessage(type, text) {
        const msg = { type, text, timestamp: Date.now() };
        this.messages.push(msg);
        this.subscribers.forEach(cb => {
            try { cb(msg); } catch (e) { console.error('chat subscriber error', e); }
        });
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
        this.commandBtn = null;
        this.shortcutBtn = null;
        this.toolbar = null;
        this.session = ChatSession.get(sessionId);
        this._sessionCallback = (msg) => {
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
        this.session.subscribe(this._sessionCallback);
        this.bindEvents();
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
        this.resetBtn.innerHTML = 'Reset';

        this.commandBtn = document.createElement('button');
        this.commandBtn.type = 'button';
        this.commandBtn.className = 'chat-btn command-btn';
        this.commandBtn.title = 'Commands (/ )';
        this.commandBtn.innerHTML = '/';

        this.shortcutBtn = document.createElement('button');
        this.shortcutBtn.type = 'button';
        this.shortcutBtn.className = 'chat-btn shortcut-btn';
        this.shortcutBtn.title = 'Shortcuts (@ )';
        this.shortcutBtn.innerHTML = '@';

        leftControls.appendChild(this.resetBtn);
        leftControls.appendChild(this.commandBtn);
        leftControls.appendChild(this.shortcutBtn);

        // Middle: input
        const middle = document.createElement('div');
        middle.className = 'chat-toolbar-middle';
        this.input = document.createElement('textarea');
        this.input.className = 'chat-input';
        this.input.rows = 1;
        this.input.placeholder = 'Type a message...';
        middle.appendChild(this.input);

        // Right: send
        const rightControls = document.createElement('div');
        rightControls.className = 'chat-toolbar-right';
        this.sendBtn = document.createElement('button');
        this.sendBtn.type = 'button';
        this.sendBtn.className = 'chat-btn send-btn';
        this.sendBtn.title = 'Send message';
        this.sendBtn.innerHTML = 'Send';
        rightControls.appendChild(this.sendBtn);

        this.toolbar.appendChild(leftControls);
        this.toolbar.appendChild(middle);
        this.toolbar.appendChild(rightControls);

        // Put conversation and toolbar into container
        this.container.appendChild(this.conversation);
        this.container.appendChild(this.toolbar);

        // Ensure conversation is ready
        this.addSystemMessage('Chat ready.');
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
        this.resetBtn.addEventListener('click', () => this.reset());

        // Command and shortcut buttons currently act as simple inserts
        this.commandBtn.addEventListener('click', () => this.insertAtCursor('/'));
        this.shortcutBtn.addEventListener('click', () => this.insertAtCursor('@'));
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
        this.session.addMessage('user', text);
        this.input.value = '';
        // Placeholder for AI response: add AI message to session after small delay
        this.addThinkingIndicator();
        setTimeout(() => {
            this.removeThinkingIndicator();
            this.session.addMessage('ai', 'AI: ' + text);
        }, 600);
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

    addUserMessage(text) { this.addMessageElement(text, 'user'); }
    addAIMessage(text) { this.addMessageElement(text, 'ai'); }
    addSystemMessage(text) { this.addMessageElement(text, 'system'); }

    addThinkingIndicator() {
        if (this._thinkingEl) return;
        this._thinkingEl = document.createElement('div');
        this._thinkingEl.className = 'chat-message ai-message thinking';
        const bubble = document.createElement('div'); bubble.className = 'chat-bubble'; bubble.textContent = '…';
        this._thinkingEl.appendChild(bubble);
        this.conversation.appendChild(this._thinkingEl);
        this.conversation.scrollTop = this.conversation.scrollHeight;
    }

    removeThinkingIndicator() {
        if (this._thinkingEl && this._thinkingEl.parentNode) {
            this._thinkingEl.parentNode.removeChild(this._thinkingEl);
            this._thinkingEl = null;
        }
    }

    reset() {
        // Clear shared session so all views clear
        this.session.clear();
        // add a system message to the session (so listeners that re-render show it)
        this.session.addMessage('system', 'Chat reset.');
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