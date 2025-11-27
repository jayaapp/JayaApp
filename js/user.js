/**
 * User functionality for JayaApp
 * Handles GitHub authentication, user profile, and community features
 */

// GitHub OAuth configuration
const GITHUB_CONFIG = {
    clientId: 'Ov23li2zHkupB1mkwetE', // GitHub OAuth App Client ID for JayaApp
    repo: 'jayaapp/JayaApp',
    scopes: ['public_repo', 'read:user'],
    apiBaseURL: 'https://api.github.com',
    serverURL: 'https://trueheartapps.com/jayaapp' // Your OAuth server URL
};

// UserManager class
class UserManager {
    constructor() {
        this.user = null;
        this.sessionToken = null;
        
        this.initElements();
        this.bindEvents();
        this.loadUserFromStorage();
        this.updateUserIcon();
        this.setupOAuthCallback();
    }

    initElements() {
        // DOM Elements
        this.userToggle = document.getElementById('user-toggle');
        
        // Create user panel elements
        this.createUserPanel();
    }

    createUserPanel() {
        // Get overlay and panel elements
        this.userOverlay = document.querySelector('.user-overlay');
        this.userPanel = document.querySelector('.user-panel');

        // Get panel elements
        this.loginBtn = this.userPanel.querySelector('.github-login-btn');
        this.createAccountLink = this.userPanel.querySelector('.create-account-link');
        this.logoutBtn = this.userPanel.querySelector('.logout-btn');
        this.userWelcome = this.userPanel.querySelector('.user-welcome');
        this.reportBugBtn = this.userPanel.querySelector('.report-bug-btn');
        this.requestFeatureBtn = this.userPanel.querySelector('.request-feature-btn');
        this.viewDiscussionsBtn = this.userPanel.querySelector('.view-discussions-btn');
        this.submitCorrectionsBtn = this.userPanel.querySelector('.submit-corrections-btn');
        this.userPanelClose = this.userPanel.querySelector('.user-panel-close');
        this.oauthStatusSection = this.userPanel.querySelector('.oauth-status-section');
        this.oauthStatusText = this.userPanel.querySelector('.oauth-status-text');
        this.oauthCancelBtn = this.userPanel.querySelector('.oauth-cancel-btn');
    }

    bindEvents() {
        // User profile icon event
        this.userToggle.addEventListener('click', () => this.toggleUserPanel());
        
        // Panel events
        this.userOverlay.addEventListener('click', () => this.closeUserPanel());
        this.userPanelClose.addEventListener('click', () => this.closeUserPanel());
        
        // Authentication events
        this.loginBtn.addEventListener('click', () => this.initiateOAuthLogin());
        this.logoutBtn?.addEventListener('click', () => this.logout());
        this.oauthCancelBtn?.addEventListener('click', () => this.hideOAuthStatus());
        
        // Action buttons (placeholders for now)
        this.reportBugBtn?.addEventListener('click', () => this.handleReportBug());
        this.requestFeatureBtn?.addEventListener('click', () => this.handleRequestFeature());
        this.viewDiscussionsBtn?.addEventListener('click', () => this.handleViewDiscussions());
        this.submitCorrectionsBtn?.addEventListener('click', () => this.handleSubmitCorrections());

        // Listen for locale changes
        document.addEventListener('localeChanged', () => this.updateLocaleTexts());

        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.userPanel.classList.contains('active')) {
                this.closeUserPanel();
            }
        });
    }

    // Panel management
    toggleUserPanel() {
        if (this.userPanel.classList.contains('active')) {
            this.closeUserPanel();
        } else {
            this.openUserPanel();
        }
    }

    openUserPanel() {
        this.userPanel.classList.add('active');
        this.userOverlay.classList.add('active');
        this.updatePanelState();
        this.updateLocaleTexts();
    }

    closeUserPanel() {
        this.userPanel.classList.remove('active');
        this.userOverlay.classList.remove('active');
    }

    updatePanelState() {
        const notLoggedIn = this.userPanel.querySelector('.user-not-logged-in');
        const loggedIn = this.userPanel.querySelector('.user-logged-in');
        
        if (this.user && this.sessionToken) {
            // Show logged in state
            notLoggedIn.style.display = 'none';
            loggedIn.style.display = 'block';
            this.updateUserInfo();
        } else {
            // Show not logged in state
            notLoggedIn.style.display = 'block';
            loggedIn.style.display = 'none';
        }
    }

    updateUserInfo() {
        if (!this.user) return;
        
        const avatar = this.userPanel.querySelector('.user-avatar-large');
        const username = this.userPanel.querySelector('.username');
        const fullname = this.userPanel.querySelector('.user-fullname');
        
        avatar.src = this.user.avatar_url;
        username.textContent = `@${this.user.login}`;
        fullname.textContent = this.user.name || this.user.login;
    }

    // GitHub OAuth Authentication
    async initiateOAuthLogin() {
        try {
            this.showLoginLoading(true);
            
            const response = await fetch(`${GITHUB_CONFIG.serverURL}/auth/login`);
            const data = await response.json();
            
            if (data.status === 'success') {
                // Show OAuth status
                this.showOAuthStatus();
                
                // Store state for verification
                localStorage.setItem('oauth_state', data.state);
                
                // Redirect to GitHub authorization (same window)
                window.location.href = data.auth_url;
                
            } else {
                console.error('OAuth login failed:', data.message || 'Unknown error');
                throw new Error(data.message || 'Failed to initiate OAuth');
            }
            
        } catch (error) {
            console.error('OAuth login error:', error.message);
            this.showAuthError('Failed to initiate GitHub login. Please try again.');
        } finally {
            this.showLoginLoading(false);
        }
    }

    showOAuthStatus() {
        this.oauthStatusSection.style.display = 'block';
        this.loginBtn.style.display = 'none';
    }

    hideOAuthStatus() {
        if (this.oauthStatusSection) {
            this.oauthStatusSection.style.display = 'none';
        }
        if (this.loginBtn) {
            this.loginBtn.style.display = 'block';
        }
    }

    setupOAuthCallback() {
        // Check if current page load is an OAuth callback
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('auth') === 'callback') {
            this.handleOAuthCallback();
        }
        
        // Listen for messages from auth window
        window.addEventListener('message', (event) => {
            if (event.origin !== window.location.origin) return;
            
            if (event.data.type === 'oauth-success') {
                this.handleOAuthSuccess(event.data);
            } else if (event.data.type === 'oauth-error') {
                this.handleOAuthError(event.data.message);
            }
        });
    }

    async handleOAuthCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');
        const storedState = localStorage.getItem('oauth_state');
        
        if (error) {
            console.error('OAuth authorization failed:', error);
            this.showAuthError(`GitHub authorization failed: ${error}`);
            this.cleanupOAuthUrl();
            return;
        }
        
        if (!code || !state || state !== storedState) {
            console.error('OAuth callback validation failed');
            this.showAuthError('Invalid OAuth callback parameters');
            this.cleanupOAuthUrl();
            return;
        }
        
        try {
            // Send to server for token exchange
            const callbackUrl = `${GITHUB_CONFIG.serverURL}/auth/callback?code=${code}&state=${state}`;
            const response = await fetch(callbackUrl);
            const data = await response.json();
            
            if (data.status === 'success') {
                this.sessionToken = data.session_token;
                this.user = data.user;
                
                this.updatePanelState();
                this.updateUserIcon();
                this.saveUserToStorage();
                this.showAuthSuccess();
                
                // Clean up URL and open user panel to show successful login
                this.cleanupOAuthUrl();
                this.openUserPanel();
            } else {
                console.error('OAuth authentication failed:', data.message || 'Unknown error');
                throw new Error(data.message || 'OAuth callback failed');
            }
        } catch (error) {
            console.error('OAuth callback error:', error.message);
            this.showAuthError('Authentication failed. Please try again.');
            this.cleanupOAuthUrl();
        } finally {
            localStorage.removeItem('oauth_state');
        }
    }

    cleanupOAuthUrl() {
        // Remove OAuth parameters from URL
        const url = new URL(window.location);
        url.searchParams.delete('auth');
        url.searchParams.delete('code');
        url.searchParams.delete('state');
        window.history.replaceState({}, document.title, url.pathname + url.search);
    }

    handleOAuthSuccess(data) {
        this.sessionToken = data.sessionToken;
        this.user = data.user;
        
        this.hideOAuthStatus();
        this.updatePanelState();
        this.updateUserIcon();
        this.saveUserToStorage();
        this.showAuthSuccess();
    }

    handleOAuthError(message) {
        this.hideOAuthStatus();
        this.showAuthError(message || 'Authentication failed');
    }

    async fetchUserInfo() {
        try {
            const response = await fetch(`${GITHUB_CONFIG.serverURL}/auth/user`, {
                headers: {
                    'Authorization': `Bearer ${this.sessionToken}`,
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.status === 'success') {
                    this.user = data.user;
                } else {
                    throw new Error(data.message || 'Failed to fetch user info');
                }
            } else {
                throw new Error('Failed to fetch user info');
            }
        } catch (error) {
            console.error('Failed to fetch user info:', error.message);
            throw error;
        }
    }
    
    async getCSRFToken() {
        /**
         * Get CSRF token from /auth/user endpoint
         * Returns null if not authenticated or on error
         */
        try {
            if (!this.sessionToken) {
                return null;
            }
            
            const response = await fetch(`${GITHUB_CONFIG.serverURL}/auth/user`, {
                headers: {
                    'Authorization': `Bearer ${this.sessionToken}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.csrf_token || null;
            }
        } catch (error) {
            console.warn('Could not fetch CSRF token:', error);
        }
        return null;
    }

    // User icon management
    updateUserIcon() {
        if (this.user && this.user.avatar_url) {
            // Replace material icon with user avatar
            this.userToggle.innerHTML = `<img src="${this.user.avatar_url}" class="user-avatar-icon" alt="User Avatar">`;
        } else {
            // Show default material icon
            this.userToggle.innerHTML = '<i class="material-symbols-outlined">person</i>';
        }
    }

    // Storage management
    saveUserToStorage() {
        if (this.user && this.sessionToken) {
            const userData = {
                user: this.user,
                sessionToken: this.sessionToken,
                timestamp: Date.now()
            };
            localStorage.setItem('githubUser', JSON.stringify(userData));
        }
    }

    loadUserFromStorage() {
        try {
            const userData = localStorage.getItem('githubUser');
            if (userData) {
                const parsed = JSON.parse(userData);
                const dayInMs = 24 * 60 * 60 * 1000;
                
                // Check if data is less than 7 days old
                if (Date.now() - parsed.timestamp < 7 * dayInMs) {
                    this.user = parsed.user;
                    this.sessionToken = parsed.sessionToken;
                    
                    // Verify session is still valid
                    this.verifySession();
                } else {
                    // Data too old, clear it
                    this.clearUserFromStorage();
                }
            }
        } catch (error) {
            console.error('Failed to load user from storage:', error.message);
            this.clearUserFromStorage();
        }
    }

    async verifySession() {
        try {
            const response = await fetch(`${GITHUB_CONFIG.serverURL}/auth/user`, {
                headers: {
                    'Authorization': `Bearer ${this.sessionToken}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                // Session is invalid, clear storage
                this.logout();
            } else {
                const data = await response.json();
                if (data.status !== 'success') {
                    this.logout();
                }
            }
        } catch (error) {
            console.error('Session verification failed:', error.message);
            // On network error, keep the session for now
        }
    }

    clearUserFromStorage() {
        localStorage.removeItem('githubUser');
    }

    async logout() {
        try {
            // Notify server about logout
            if (this.sessionToken) {
                await fetch(`${GITHUB_CONFIG.serverURL}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.sessionToken}`,
                        'Accept': 'application/json'
                    }
                });
            }
        } catch (error) {
            console.error('Logout failed:', error.message);
        }
        
        this.user = null;
        this.sessionToken = null;
        this.clearUserFromStorage();
        this.updateUserIcon();
        this.updatePanelState();
        this.hideOAuthStatus();
        
        // Visual feedback is provided by the user panel state change
    }

    // UI helpers
    showLoginLoading(show) {
        if (show) {
            this.loginBtn.disabled = true;
            this.loginBtn.innerHTML = `
                <i class="material-symbols-outlined">hourglass_empty</i>
                <span data-locale="logging_in">Logging in...</span>
            `;
        } else {
            this.loginBtn.disabled = false;
            this.loginBtn.innerHTML = `
                <i class="material-symbols-outlined">login</i>
                <span data-locale="login_with_github">Login with GitHub</span>
            `;
        }
    }

    showAuthSuccess() {
        // Visual feedback is provided by the user panel state change
    }

    transitionNotification(locale_key, fallback_message) {
        if (window.showAlert) {
            const message = window.getLocale ?
                window.getLocale(locale_key) || fallback_message : fallback_message;
            window.showAlert(message);
        }
    } 

    showAuthError(message) {
        this.transitionNotification('login_error', message);
        this.hideOAuthStatus();
    }

    // Action handlers
    handleReportBug() {
        // Redirect to GitHub issues page with pre-filled bug report template
        const bugReportUrl = this.generateBugReportUrl();
        window.open(bugReportUrl, '_blank');
    }

    generateBugReportUrl() {
        // Get system information
        const systemInfo = this.getSystemInfo();
        
        // Create bug report template
        const title = `Bug Report: [Brief description]`;
        const body = `## Bug Description
[Please describe the bug in detail]

## Steps to Reproduce
1. 
2. 
3. 

## Expected Behavior
[What you expected to happen]

## Actual Behavior
[What actually happened]

## Screenshots
[If applicable, add screenshots to help explain your problem]

## System Information
- **Browser**: ${systemInfo.browser}
- **Operating System**: ${systemInfo.os}
- **Screen Resolution**: ${systemInfo.screenResolution}
- **User Agent**: ${systemInfo.userAgent}
- **App Version**: JayaApp v1.0.0
- **Timestamp**: ${new Date().toISOString()}

## Additional Context
[Add any other context about the problem here]

---
*This bug report was submitted through JayaApp's integrated reporting system.*`;

        // Create GitHub issue URL with pre-filled content
        const baseUrl = `https://github.com/${GITHUB_CONFIG.repo}/issues/new`;
        const params = new URLSearchParams({
            title: title,
            body: body,
            labels: 'bug,user-reported'
        });

        return `${baseUrl}?${params.toString()}`;
    }

    getSystemInfo() {
        const navigator = window.navigator;
        const screen = window.screen;
        
        // Detect browser
        let browser = 'Unknown';
        if (navigator.userAgent.includes('Chrome')) browser = 'Chrome';
        else if (navigator.userAgent.includes('Firefox')) browser = 'Firefox';
        else if (navigator.userAgent.includes('Safari')) browser = 'Safari';
        else if (navigator.userAgent.includes('Edge')) browser = 'Edge';
        
        // Detect OS
        let os = 'Unknown';
        if (navigator.userAgent.includes('Windows')) os = 'Windows';
        else if (navigator.userAgent.includes('Mac')) os = 'macOS';
        else if (navigator.userAgent.includes('Linux')) os = 'Linux';
        else if (navigator.userAgent.includes('Android')) os = 'Android';
        else if (navigator.userAgent.includes('iOS')) os = 'iOS';

        return {
            browser: browser,
            os: os,
            screenResolution: `${screen.width}x${screen.height}`,
            userAgent: navigator.userAgent,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine
        };
    }

    handleRequestFeature() {
        // Redirect to GitHub issues page with pre-filled feature request template
        const featureRequestUrl = this.generateFeatureRequestUrl();
        window.open(featureRequestUrl, '_blank');
    }

    generateFeatureRequestUrl() {
        // Get system information
        const systemInfo = this.getSystemInfo();
        
        // Create feature request template
        const title = `Feature Request: [Brief feature description]`;
        const body = `## Feature Summary
[Provide a clear and concise description of the feature you'd like to see]

## Problem Statement
[Describe the problem this feature would solve or the need it addresses]

## Proposed Solution
[Describe your preferred solution or approach]

## Alternative Solutions
[Describe any alternative solutions or features you've considered]

## Use Case
[Explain how this feature would be used and who would benefit from it]

## Additional Context
[Add any other context, mockups, or examples about the feature request here]

## Priority
- [ ] Low - Nice to have
- [ ] Medium - Would improve user experience
- [ ] High - Important for usability

## Implementation Notes
[Any technical considerations or suggestions for implementation]

## System Information
- **Browser**: ${systemInfo.browser}
- **Operating System**: ${systemInfo.os}
- **Screen Resolution**: ${systemInfo.screenResolution}
- **App Version**: JayaApp v1.0.0
- **Timestamp**: ${new Date().toISOString()}

---
*This feature request was submitted through JayaApp's integrated request system.*`;

        // Create GitHub issue URL with pre-filled content
        const baseUrl = `https://github.com/${GITHUB_CONFIG.repo}/issues/new`;
        const params = new URLSearchParams({
            title: title,
            body: body,
            labels: 'enhancement,user-requested'
        });

        return `${baseUrl}?${params.toString()}`;
    }

    generateVerseCorrectionsUrl() {
        // Get system information
        const systemInfo = this.getSystemInfo();

        // Load edits from edits API or fallback to localStorage
        let editedVerses = {};
        try {
            if (window.editsAPI && typeof window.editsAPI.loadEdits === 'function') {
                editedVerses = window.editsAPI.loadEdits() || {};
            } else {
                editedVerses = JSON.parse(localStorage.getItem('jayaapp:edits') || '{}');
            }
        } catch (e) {
            console.warn('Failed to load edited verses for submission', e);
            editedVerses = {};
        }

        // Count total edited verse entries in nested structure
        let verseCount = 0;
        for (const b of Object.keys(editedVerses)) {
            const chapters = editedVerses[b] || {};
            for (const c of Object.keys(chapters)) {
                const verses = chapters[c] || {};
                verseCount += Object.keys(verses).length;
            }
        }

        // Create a summary of edited verses for the title
        const versesSummary = this.createVersesSummary(editedVerses);

        // Create JSON export for the corrections
        const correctionsData = {
            type: 'jayaapp-verses',
            version: '1.0',
            submissionDate: new Date().toISOString(),
            submittedBy: this.user ? this.user.login : 'anonymous',
            verseCount: verseCount,
            data: editedVerses
        };
        
        const correctionsJson = JSON.stringify(correctionsData, null, 2);
        
        // Create title
        const title = `Translation Corrections: ${verseCount} verse${verseCount > 1 ? 's' : ''} - ${versesSummary}`;
        
        // Create issue body
        const body = `## Translation Corrections Submission

Thank you for contributing to improve the accuracy of verse translations in JayaApp!

### Summary
- **Number of corrected verses**: ${verseCount}
- **Submission date**: ${new Date().toLocaleDateString()}
- **Submitted by**: @${this.user ? this.user.login : 'anonymous'}

### Full Corrections Data
\`\`\`json
${correctionsJson}
\`\`\`

### How to Review
1. Download the JSON data above
2. Import it into JayaApp using Lists → Verses → Import
3. Review each correction in context
4. Merge accepted corrections into the main translation files

### System Information
- **Browser**: ${systemInfo.browser}
- **Operating System**: ${systemInfo.os}
- **App Version**: JayaApp v1.0.0
- **Timestamp**: ${new Date().toISOString()}

---
*This translation correction was submitted through JayaApp's integrated correction system.*`;

        // Create GitHub issue URL with pre-filled content
        const baseUrl = `https://github.com/${GITHUB_CONFIG.repo}/issues/new`;
        const params = new URLSearchParams({
            title: title,
            body: body,
            labels: 'translation,user-submitted'
        });

        return `${baseUrl}?${params.toString()}`;
    }

    createVersesSummary(editedVerses) {
        // Accepts nested edits object: { book: { chapter: { verse: {...} } } }
        const bookChapters = {};
        for (const bKey of Object.keys(editedVerses || {})) {
            const chapters = editedVerses[bKey] || {};
            const bookLabel = `Book ${bKey}`;
            if (!bookChapters[bookLabel]) bookChapters[bookLabel] = new Set();
            for (const cKey of Object.keys(chapters)) {
                const chapterNum = Number(cKey);
                if (!Number.isNaN(chapterNum)) bookChapters[bookLabel].add(chapterNum);
            }
        }

        // Format summary
        const summaryParts = [];
        Object.entries(bookChapters).forEach(([book, chapters]) => {
            const chapterArray = Array.from(chapters).sort((a, b) => a - b);
            if (chapterArray.length === 1) {
                summaryParts.push(`${book}, Ch. ${chapterArray[0]}`);
            } else if (chapterArray.length <= 3) {
                summaryParts.push(`${book}, Ch. ${chapterArray.join(', ')}`);
            } else {
                summaryParts.push(`${book}, Ch. ${chapterArray[0]}-${chapterArray[chapterArray.length - 1]}`);
            }
        });

        return summaryParts.slice(0, 3).join('; ') + (summaryParts.length > 3 ? ' +more' : '');
    }

    handleViewDiscussions() {
        // Open GitHub discussions in new tab
        window.open(`https://github.com/${GITHUB_CONFIG.repo}/discussions`, '_blank');
    }

    handleSubmitCorrections() {
        // Load edits from editsAPI or fallback to localStorage
        let editedVerses = {};
        try {
            if (window.editsAPI && typeof window.editsAPI.loadEdits === 'function') editedVerses = window.editsAPI.loadEdits() || {};
            else editedVerses = JSON.parse(localStorage.getItem('jayaapp:edits') || '{}');
        } catch (e) {
            editedVerses = {};
        }

        // Count total edited verses
        let total = 0;
        for (const b of Object.keys(editedVerses)) {
            const chapters = editedVerses[b] || {};
            for (const c of Object.keys(chapters)) {
                const verses = chapters[c] || {};
                total += Object.keys(verses).length;
            }
        }

        if (total === 0) {
            this.closeUserPanel();
            this.transitionNotification('no_corrections_to_submit', 'No verse corrections to submit. Edit some verses first.');
            return;
        }

        // Generate verse corrections issue URL
        const correctionsUrl = this.generateVerseCorrectionsUrl();
        window.open(correctionsUrl, '_blank');

        // Show success notification
        this.transitionNotification('corrections_submitted', 'Verse corrections submission opened in new tab');

        // Close user panel
        this.closeUserPanel();
    }

    // Localization
    updateLocaleTexts() {
        // This will be called when locale changes
        // The data-locale attributes will be handled by the main localization system
    }
}

// To be called from init.js
function initUserPanel() {
    // Create an instance of the UserManager
    window.userManager = new UserManager();
}