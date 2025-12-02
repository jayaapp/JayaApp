/**
 * Donation System for JayaApp
 * Comprehensive sponsorship system with backend integration
 */

class DonationManager {
    constructor() {
        this.panel = null;
        this.overlay = null;
        this.errorDiv = null;
        this.errorDivStage2 = null;
        this.paypalContainer = null;
        this.currentCurrency = 'USD';
        this.currentLanguage = 'English';
        this.isInitialized = false;
        this.donationData = null;
        this.statsVisible = {
            languages: false,
            issues: false,
            analysis: false
        };
        this.currentStage = 1; // Track current form stage
        this.paymentProvider = 'paypal'; // Default provider
        this.paypalClientId = null;
        this.csrfToken = null; // CSRF token for state-changing operations
        this.idempotencyKey = null; // Idempotency key for preventing duplicates
        
        // API base URL - use the same deployment address as user functionality
        this.API_BASE = 'https://trueheartapps.com/jayaapp';
        
        this.init();
    }

    async init() {
        // Get DOM elements
        this.panel = document.querySelector('.donation-panel');
        this.overlay = document.querySelector('.donation-overlay');
        this.errorDiv = document.getElementById('donation-error');
        this.errorDivStage2 = document.getElementById('donation-error-stage2');
        this.paypalContainer = document.getElementById('paypal-button-container');

        if (!this.panel || !this.overlay) {
            console.error('Donation panel elements not found');
            return;
        }

        this.setupEventListeners();
        this.updateCurrentLanguage();
        
        // Check for Stripe return
        this.checkStripeReturn();
    }
    
    async checkStripeReturn() {
        // Check URL parameters for Stripe return
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');
        const donationStatus = urlParams.get('donation');
        
        if (donationStatus === 'success' && sessionId) {
            // Stripe successful return
            console.log('Stripe payment success, verifying...');
            await this.verifyStripePayment(sessionId);
            
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (donationStatus === 'cancelled') {
            // Stripe cancelled
            console.log('Stripe payment cancelled');
            this.showTemporaryMessage('Payment was cancelled', 'info');
            
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
    
    async verifyStripePayment(sessionId) {
        try {
            // Call backend to verify and complete payment
            const response = await fetch(`${this.API_BASE}/api/donation/execute-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    session_id: sessionId
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                console.log('Stripe payment verified successfully');
                
                // Show success notification (unified with PayPal)
                const message = this.currentLanguage === 'Polski' 
                    ? 'Dziękujemy za sponsoring! 🎉'
                    : 'Thank you for your sponsorship! 🎉';
                this.showTemporaryMessage(message, 'success');
                
                // Clean up session storage
                sessionStorage.removeItem('stripe_session_id');
                sessionStorage.removeItem('sponsorship_id');
            } else {
                throw new Error(result.error || 'Payment verification failed');
            }
            
        } catch (error) {
            console.error('Failed to verify Stripe payment:', error);
            this.showTemporaryMessage('Payment verification failed: ' + error.message, 'error');
        }
    }
    
    async refreshCSRFToken() {
        try {
            // Check if user has a session token
            const sessionToken = localStorage.getItem('jayaapp_session');
            if (!sessionToken) {
                return; // Not authenticated, no CSRF token needed
            }
            
            const response = await fetch(`${this.API_BASE}/auth/user`, {
                headers: {
                    'Authorization': `Bearer ${sessionToken}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.csrf_token) {
                    this.csrfToken = data.csrf_token;
                    console.log('CSRF token refreshed');
                }
            }
        } catch (error) {
            console.warn('Could not refresh CSRF token:', error);
        }
    }
    
    generateIdempotencyKey() {
        // Generate a unique idempotency key for this payment attempt
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2);
        return `${timestamp}-${random}`;
    }
    
    showTemporaryMessage(message, type = 'info') {
        // Create temporary message element
        const messageDiv = document.createElement('div');
        messageDiv.className = `donation-message donation-message-${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            border-radius: 4px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(messageDiv);
        
        // Remove after 5 seconds
        setTimeout(() => {
            messageDiv.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => messageDiv.remove(), 300);
        }, 5000);
    }

    setupEventListeners() {
        // Open donation panel
        const donateToggle = document.getElementById('donate-toggle');
        if (donateToggle) {
            donateToggle.addEventListener('click', () => this.openPanel());
        }

        // Close donation panel
        const closeBtn = document.querySelector('.donation-panel-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closePanel());
        }

        // Close on overlay click
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.closePanel();
            }
        });

        // Two-stage form navigation
        const goToSummaryBtn = document.getElementById('go-to-summary-btn');
        if (goToSummaryBtn) {
            goToSummaryBtn.addEventListener('click', () => this.goToSummaryStage());
        }

        const backToFormBtn = document.getElementById('back-to-form-btn');
        if (backToFormBtn) {
            backToFormBtn.addEventListener('click', () => this.backToFormStage());
        }

        // Listen for locale changes
        document.addEventListener('localeChanged', () => {
            this.updateCurrentLanguage();
            this.updatePlaceholders();
            if (this.isInitialized) {
                this.updateCurrency();
            }
        });

        // Listen for ESC key to close panel
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.panel && this.panel.classList.contains('active')) {
                this.closePanel();
            }
        });

        // Clear selections when changing dropdowns
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('donation-dropdown') || 
                e.target.classList.contains('amount-input')) {
                this.clearError();
            }
            
            // Handle GitHub issue selection
            if (e.target.id === 'github-issue') {
                this.updateGitHubIssueLink();
            }
        });
    }

    async openPanel() {
        this.overlay.classList.add('active');
        this.panel.classList.add('active');
        this.clearError();
        this.currentStage = 1;
        this.showStage(1);
        
        // Initialize donation data if not done yet
        if (!this.isInitialized) {
            await this.initializeDonationData();
        }
    }

    closePanel() {
        this.overlay.classList.remove('active');
        this.panel.classList.remove('active');
        this.clearError();
        this.resetForm();
        this.currentStage = 1;
        this.showStage(1);
    }

    resetForm() {
        // Clear all form inputs
        const inputs = this.panel.querySelectorAll('select, input, textarea');
        inputs.forEach(input => {
            if (input.type === 'number') {
                input.value = '0';
            } else if (input.tagName === 'SELECT') {
                input.selectedIndex = 0;
            } else {
                input.value = '';
            }
        });
    }

    showStage(stage) {
        const stage1 = document.getElementById('donation-form-stage1');
        const stage2 = document.getElementById('donation-form-stage2');
        
        if (stage === 1) {
            stage1.classList.remove('hidden');
            stage2.classList.add('hidden');
        } else {
            stage1.classList.add('hidden');
            stage2.classList.remove('hidden');
        }
    }

    goToSummaryStage() {
        const errors = this.validateSponsorshipData();
        if (errors.length > 0) {
            this.showError(errors.join('<br>'));
            return;
        }

        this.clearError();
        this.generateSummary();
        this.currentStage = 2;
        this.showStage(2);
        
        // Initialize payment provider in stage 2
        this.initializePaymentProvider();
    }
    
    async initializePaymentProvider() {
        if (this.paymentProvider === 'paypal') {
            if (!window.paypal) {
                await this.initializePayPal();
            } else {
                this.renderPayPalButton();
            }
        } else if (this.paymentProvider === 'stripe') {
            // Render Stripe checkout button
            this.renderStripeButton();
        } else {
            this.showError('Invalid payment provider configuration', true);
        }
    }
    
    renderStripeButton() {
        if (!this.paypalContainer) return;
        
        // Replace PayPal container with Stripe button
        this.paypalContainer.innerHTML = `
            <button id="stripe-checkout-button" class="stripe-checkout-button">
                <span class="stripe-button-text">Continue to Stripe Checkout</span>
            </button>
        `;
        
        const button = document.getElementById('stripe-checkout-button');
        button.addEventListener('click', () => this.handleStripeCheckout());
    }
    
    async handleStripeCheckout() {
        try {
            const errors = this.validateSponsorshipData();
            if (errors.length > 0) {
                this.showError(errors.join('<br>'), true);
                return;
            }
            
            const sponsorships = this.getAllSelectedSponsorships();
            if (sponsorships.length === 0) {
                this.showError('Please select at least one sponsorship option', true);
                return;
            }
            
            // Show loading state
            const button = document.getElementById('stripe-checkout-button');
            const originalText = button.innerHTML;
            button.disabled = true;
            button.innerHTML = '<span class="stripe-button-text">Creating session...</span>';
            
            // Call backend to create Stripe session
            const sponsorship = sponsorships[0];
            
            // Generate idempotency key for this payment
            if (!this.idempotencyKey) {
                this.idempotencyKey = this.generateIdempotencyKey();
            }
            
            const headers = {
                'Content-Type': 'application/json'
            };
            
            // Add session token if available
            const sessionToken = localStorage.getItem('jayaapp_session');
            if (sessionToken) {
                headers['Authorization'] = `Bearer ${sessionToken}`;
            }
            
            const response = await fetch(`${this.API_BASE}/api/donation/create-payment`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    sponsorship_type: sponsorship.type,
                    amount: sponsorship.data.amount,
                    currency: this.currentCurrency,
                    language_code: sponsorship.data.language_code,
                    issue_number: sponsorship.data.issue_number,
                    message: sponsorship.data.message || '',
                    idempotency_key: this.idempotencyKey
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to create checkout session');
            }
            
            // Store session ID for later verification
            sessionStorage.setItem('stripe_session_id', result.order_id);
            sessionStorage.setItem('sponsorship_id', result.sponsorship_id);
            
            console.log(`Stripe session created: ${result.order_id}`);
            
            // Redirect to Stripe Checkout
            if (result.checkout_url) {
                window.location.href = result.checkout_url;
            } else {
                throw new Error('No checkout URL received');
            }
            
        } catch (error) {
            console.error('Stripe checkout error:', error);
            this.showError('Failed to start checkout: ' + error.message, true);
            
            // Restore button state
            const button = document.getElementById('stripe-checkout-button');
            if (button) {
                button.disabled = false;
                button.innerHTML = '<span class="stripe-button-text">Continue to Stripe Checkout</span>';
            }
        }
    }

    backToFormStage() {
        this.currentStage = 1;
        this.showStage(1);
        this.clearError();
    }

    generateSummary() {
        const summaryContainer = document.getElementById('donation-summary-content');
        const totalAmountElement = document.getElementById('total-amount');
        
        summaryContainer.innerHTML = '';
        let totalAmount = 0;

        // Get all selected sponsorships
        const sponsorships = this.getAllSelectedSponsorships();
        
        sponsorships.forEach(sponsorship => {
            const item = document.createElement('div');
            item.className = 'summary-item';
            
            let title = '';
            let details = '';
            
            switch (sponsorship.type) {
                case 'translation':
                    const langName = this.getLanguageName(sponsorship.data.language_code);
                    title = this.currentLanguage === 'Polski' ? 'Sponsoring tłumaczeń SI' : 'AI Translation Sponsorship';
                    details = this.currentLanguage === 'Polski' ? 
                        `Tłumaczenie na ${langName}` : `Translation into ${langName}`;
                    break;
                case 'words_analysis':
                    title = this.currentLanguage === 'Polski' ? 'Sponsoring analizy słów SI' : 'AI Words Analysis Sponsorship';
                    details = this.currentLanguage === 'Polski' ? '1% analizy słów' : '1% of words analysis';
                    break;
                case 'verse_analysis':
                    title = this.currentLanguage === 'Polski' ? 'Sponsoring analizy wersetów SI' : 'AI Verse Analysis Sponsorship';
                    details = this.currentLanguage === 'Polski' ? '1% analizy wersetów' : '1% of verse analysis';
                    break;
                case 'github_issue':
                    title = this.currentLanguage === 'Polski' ? 'Sponsoring problemów GitHub' : 'GitHub Issue Sponsorship';
                    const issueName = this.getIssueName(sponsorship.data.issue_number);
                    details = `#${sponsorship.data.issue_number}: ${issueName}`;
                    break;
                case 'free_appreciation':
                    title = this.currentLanguage === 'Polski' ? 'Dowolny Podarunek' : 'Free Gift';
                    details = sponsorship.data.message || (this.currentLanguage === 'Polski' ? 'Bez wiadomości' : 'No message');
                    break;
            }
            
            item.innerHTML = `
                <div>
                    <div class="summary-item-title">${title}</div>
                    <div class="summary-item-details">${details}</div>
                </div>
                <div class="summary-item-amount">$${sponsorship.data.amount.toFixed(2)}</div>
            `;
            
            summaryContainer.appendChild(item);
            totalAmount += sponsorship.data.amount;
        });

        totalAmountElement.textContent = `$${totalAmount.toFixed(2)}`;
    }

    getLanguageName(code) {
        if (!this.donationData.languages) return code;
        const lang = this.donationData.languages.find(l => l.code === code);
        return lang ? lang.name : code;
    }

    getIssueName(number) {
        if (!this.donationData.issues) return 'Unknown issue';
        const issue = this.donationData.issues.find(i => i.issue_number == number);
        return issue ? issue.title : 'Unknown issue';
    }

    updateCurrentLanguage() {
        this.currentLanguage = localStorage.getItem('appLanguage') || 'English';
    }

    getLocalizedText(key) {
        // Simple method to get localized text for donation panel
        const translations = {
            'English': {
                'no_sponsorships_yet': 'No sponsorships yet'
            },
            'Polski': {
                'no_sponsorships_yet': 'Brak sponsoringu'
            }
        };
        
        return translations[this.currentLanguage]?.[key] || translations['English'][key] || key;
    }

    updatePlaceholders() {
        const textarea = document.getElementById('appreciation-message');
        if (textarea) {
            if (this.currentLanguage === 'Polski') {
                textarea.placeholder = 'Twoja wiadomość (lub puste)';
            } else {
                textarea.placeholder = 'Your message (or empty)';
            }
        }
    }

    calculateWordsProgress() {
        try {
            // Check if we have both analyzed words and total unique words data
            if (window.wordsAnalysisData && window.uniqueWordsData) {
                const analyzedCount = Object.keys(window.wordsAnalysisData).length;
                const totalCount = Object.keys(window.uniqueWordsData).length;
                const percentage = (analyzedCount / totalCount) * 100;
                console.log(`Words progress: ${analyzedCount}/${totalCount} = ${percentage.toFixed(2)}%`);
                return Math.min(percentage, 100);
            }
            
            // If we only have analyzed words, use actual total count
            if (window.wordsAnalysisData) {
                const analyzedCount = Object.keys(window.wordsAnalysisData).length;
                const actualTotal = 174042; // Actual count from unique_words.json
                const percentage = (analyzedCount / actualTotal) * 100;
                console.log(`Words progress (actual total): ${analyzedCount}/${actualTotal} = ${percentage.toFixed(2)}%`);
                return Math.min(percentage, 100);
            }
            
            // Fallback: try to estimate from localStorage or other available data
            const analysisData = localStorage.getItem('wordsAnalysisCache');
            if (analysisData) {
                try {
                    const parsed = JSON.parse(analysisData);
                    const analyzedCount = Object.keys(parsed).length;
                    const actualTotal = 174042; // Actual count from unique_words.json
                    const percentage = (analyzedCount / actualTotal) * 100;
                    return Math.min(percentage, 100);
                } catch (e) {
                    console.warn('Could not parse cached words analysis data');
                }
            }
            
            // Ultimate fallback - return a minimal estimate
            return 0.0;
            
        } catch (error) {
            console.warn('Could not calculate words progress:', error);
            return 0.0;
        }
    }

    calculateVersesProgress() {
        try {
            // Check if we have verse analysis data
            if (window.verseAnalysisData) {
                // Count analyzed verses from the nested structure: book -> chapter -> verse -> analysis
                let analyzedCount = 0;
                for (const bookKey in window.verseAnalysisData) {
                    const bookData = window.verseAnalysisData[bookKey];
                    for (const chapterKey in bookData) {
                        const chapterData = bookData[chapterKey];
                        analyzedCount += Object.keys(chapterData).length;
                    }
                }
                
                // Use actual total verses count from mahasan.json data
                const totalVerses = this.getTotalVersesCount();
                const percentage = (analyzedCount / totalVerses) * 100;
                console.log(`Verses progress: ${analyzedCount}/${totalVerses} = ${percentage.toFixed(2)}%`);
                return Math.min(percentage, 100);
            }
            
            // Since verse analysis hasn't started yet, return 0
            return 0.0;
            
        } catch (error) {
            console.warn('Could not calculate verses progress:', error);
            return 0.0;
        }
    }

    getTotalVersesCount() {
        // Try to calculate from loaded mahasan data
        if (window.mahasanData) {
            let totalVerses = 0;
            for (const bookKey in window.mahasanData) {
                const bookData = window.mahasanData[bookKey];
                for (const chapterKey in bookData) {
                    const chapterData = bookData[chapterKey];
                    if (chapterData.devanagari) {
                        totalVerses += chapterData.devanagari.length;
                    }
                }
            }
            if (totalVerses > 0) {
                console.log(`Calculated total verses from mahasan data: ${totalVerses}`);
                return totalVerses;
            }
        }
        
        // Fallback: Use the actual count from running count_verses.py
        const TOTAL_VERSES_IN_MAHABHARATA = 73821; // Actual count from mahasan.json
        return TOTAL_VERSES_IN_MAHABHARATA;
    }

    async initializeDonationData() {
        try {
            // Try to get CSRF token if user is authenticated
            await this.refreshCSRFToken();
            
            // Try to load words analysis data for progress calculation
            await this.loadWordsAnalysisData();
            
            // Try to fetch from backend API first
            const response = await fetch(`${this.API_BASE}/api/donation/init`);
            if (response.ok) {
                const apiData = await response.json();
                if (apiData.success) {
                    this.donationData = apiData.data;
                    
                    // Store payment provider configuration
                    this.paymentProvider = apiData.data.payment_provider || 'paypal';
                    this.paypalClientId = apiData.data.paypal_client_id;
                    
                    console.log(`Payment provider: ${this.paymentProvider}`);
                    
                    // Override progress with calculated values if we have local data
                    this.donationData.progress = {
                        words: this.calculateWordsProgress(),
                        sentences: this.calculateVersesProgress()
                    };
                } else {
                    throw new Error(apiData.error || 'API returned error');
                }
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
            
            // Load and render campaigns
            await this.loadCampaigns();
            
            this.setupUI();
            this.isInitialized = true;
            
        } catch (error) {
            console.error('Failed to initialize donation system:', error);
            // Use mock data as fallback
            this.donationData = this.getMockData();
            this.setupUI();
            this.isInitialized = true;
        }
    }
    
    async loadCampaigns() {
        try {
            const response = await fetch(`${this.API_BASE}/api/donation/campaigns`);
            if (response.ok) {
                const data = await response.json();
                console.log('Campaigns API response:', data);
                if (data.success && data.campaigns) {
                    console.log(`Loaded ${data.campaigns.length} campaigns from API`);
                    this.renderCampaigns(data.campaigns);
                }
            }
        } catch (error) {
            console.warn('Failed to load campaigns:', error);
        }
    }
    
    renderCampaigns(campaigns) {
        const container = document.getElementById('campaign-sections-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        console.log(`Rendering ${campaigns.length} campaigns`);
        
        const lang = this.currentLanguage === 'Polski' ? 'pl' : 'en';
        
        campaigns.forEach(campaign => {
            console.log(`Rendering campaign: ${campaign.id}`);
            const title = campaign.title[lang] || campaign.title['en'];
            let description = campaign.description[lang] || campaign.description['en'];
            
            // Replace {progress} with actual progress if callback exists
            if (campaign.progress_callback && description.includes('{progress}')) {
                try {
                    const progressValue = window[campaign.progress_callback]();
                    description = description.replace('{progress}', progressValue.toFixed(1));
                } catch (e) {
                    console.warn(`Failed to call progress callback ${campaign.progress_callback}:`, e);
                    description = description.replace('{progress}', '0.0');
                }
            }
            
            const current = campaign.current_amount_usd || 0;
            const target = campaign.target_amount_usd || 1;
            const percentage = Math.min((current / target) * 100, 100);
            const allowExceed = campaign.allow_exceed_target;
            const isComplete = current >= target && !allowExceed;
            
            const completedMsg = isComplete ? (campaign.completed_message[lang] || campaign.completed_message['en']) : '';
            
            const section = document.createElement('div');
            section.className = 'sponsorship-section campaign-section';
            section.dataset.campaignId = campaign.id;
            
            section.innerHTML = `
                <h4 class="sponsorship-title">
                    <i class="material-symbols-outlined">${campaign.icon}</i>
                    <span>${title}</span>
                </h4>
                <p class="campaign-description">${description}</p>
                
                <div class="campaign-progress-container">
                    <div class="campaign-progress-bar">
                        <div class="campaign-progress-fill" style="width: ${percentage}%"></div>
                        <div class="campaign-progress-text">
                            ${current >= target && !allowExceed ? '✓ ' : ''}$${current.toFixed(2)} / $${target.toFixed(2)}
                        </div>
                    </div>
                </div>
                
                ${isComplete ? `
                    <div class="campaign-completed-message">${completedMsg}</div>
                ` : `
                    <div class="sponsorship-row amount-row">
                        <span data-locale="donate">Donate:</span>
                        <select id="${campaign.id}-amount" class="donation-dropdown campaign-amount-dropdown">
                        </select>
                        <span>USD</span>
                    </div>
                `}
            `;
            
            container.appendChild(section);
            
            // Populate amount dropdown if not completed
            if (!isComplete) {
                const dropdown = section.querySelector(`#${campaign.id}-amount`);
                if (dropdown && this.donationData && this.donationData.amount_tiers) {
                    // Use campaign's specified tier category, or default to 'analysis'
                    const tierCategory = campaign.amount_tier_category || 'analysis';
                    const amounts = this.donationData.amount_tiers[tierCategory] || [];
                    
                    amounts.forEach(amount => {
                        const option = document.createElement('option');
                        option.value = amount;
                        option.textContent = `$${amount}`;
                        if (amount === 0) {
                            option.selected = true;
                        }
                        dropdown.appendChild(option);
                    });
                } else {
                    console.warn('Amount tiers not available for campaign dropdown');
                }
            }
        });
    }

    async loadWordsAnalysisData() {
        try {
            // Try to load the words analysis file to calculate real progress
            const response = await fetch('./data/words_analysis.json');
            if (response.ok) {
                const analysisData = await response.json();
                window.wordsAnalysisData = analysisData;
                console.log(`Loaded ${Object.keys(analysisData).length} analyzed words for progress calculation`);
            }
        } catch (error) {
            console.warn('Could not load words analysis data for progress calculation:', error);
            // Try alternative path
            try {
                const response = await fetch('./JayaApp/data/words_analysis.json');
                if (response.ok) {
                    const analysisData = await response.json();
                    window.wordsAnalysisData = analysisData;
                    console.log(`Loaded ${Object.keys(analysisData).length} analyzed words for progress calculation`);
                }
            } catch (e) {
                console.warn('Could not load words analysis data from alternative path:', e);
            }
        }

        // Also try to load the unique words file to get total count
        try {
            const response = await fetch('./data/unique_words.json');
            if (response.ok) {
                const uniqueWordsData = await response.json();
                window.uniqueWordsData = uniqueWordsData;
                console.log(`Loaded ${Object.keys(uniqueWordsData).length} total unique words for progress calculation`);
            }
        } catch (error) {
            console.warn('Could not load unique words data:', error);
            // Try alternative path
            try {
                const response = await fetch('./JayaApp/data/unique_words.json');
                if (response.ok) {
                    const uniqueWordsData = await response.json();
                    window.uniqueWordsData = uniqueWordsData;
                    console.log(`Loaded ${Object.keys(uniqueWordsData).length} total unique words for progress calculation`);
                }
            } catch (e) {
                console.warn('Could not load unique words data from alternative path:', e);
            }
        }

        // Try to load mahasan.json to calculate total verses
        try {
            const response = await fetch('./data/mahasan.json');
            if (response.ok) {
                const mahasanData = await response.json();
                window.mahasanData = mahasanData;
                console.log(`Loaded mahasan data for verse count calculation`);
            }
        } catch (error) {
            console.warn('Could not load mahasan data:', error);
            // Try alternative path
            try {
                const response = await fetch('./JayaApp/data/mahasan.json');
                if (response.ok) {
                    const mahasanData = await response.json();
                    window.mahasanData = mahasanData;
                    console.log(`Loaded mahasan data for verse count calculation`);
                }
            } catch (e) {
                console.warn('Could not load mahasan data from alternative path:', e);
            }
        }

        // Try to load verses_analysis.json to calculate verse progress
        try {
            const response = await fetch('./data/verses_analysis.json');
            if (response.ok) {
                const versesAnalysisData = await response.json();
                window.verseAnalysisData = versesAnalysisData;
                // Count analyzed verses from the nested structure: book -> chapter -> verse -> analysis
                let analyzedCount = 0;
                for (const bookKey in versesAnalysisData) {
                    const bookData = versesAnalysisData[bookKey];
                    for (const chapterKey in bookData) {
                        const chapterData = bookData[chapterKey];
                        analyzedCount += Object.keys(chapterData).length;
                    }
                }
                console.log(`Loaded ${analyzedCount} analyzed verses for progress calculation`);
            }
        } catch (error) {
            console.warn('Could not load verses analysis data:', error);
            // Try alternative path
            try {
                const response = await fetch('./JayaApp/data/verses_analysis.json');
                if (response.ok) {
                    const versesAnalysisData = await response.json();
                    window.verseAnalysisData = versesAnalysisData;
                    // Count analyzed verses from the nested structure: book -> chapter -> verse -> analysis
                    let analyzedCount = 0;
                    for (const bookKey in versesAnalysisData) {
                        const bookData = versesAnalysisData[bookKey];
                        for (const chapterKey in bookData) {
                            const chapterData = bookData[chapterKey];
                            analyzedCount += Object.keys(chapterData).length;
                        }
                    }
                    console.log(`Loaded ${analyzedCount} analyzed verses for progress calculation`);
                }
            } catch (e) {
                console.warn('Could not load verses analysis data from alternative path:', e);
            }
        }
    }

    getMockData() {
        // Base amounts without debug option
        const baseAmounts = {
            translation: [0, 15, 20, 25, 30, 40, 50, 100, 150, 250, 500, 1000],
            analysis: [0, 15, 20, 25, 30, 40, 50, 100, 150, 250, 500, 1000],
            github: [0, 5, 10, 15, 20, 25, 30, 40, 50, 100, 150, 250, 500, 1000]
        };

        // Debug amounts are now handled server-side

        return {
            languages: [
                { code: 'af', name: 'Afrikaans', status: 'pending' },
                { code: 'sq', name: 'Albanian', status: 'pending' },
                { code: 'am', name: 'Amharic', status: 'pending' },
                { code: 'ar', name: 'Arabic', status: 'pending' },
                { code: 'hy', name: 'Armenian', status: 'pending' },
                { code: 'az', name: 'Azerbaijani', status: 'pending' },
                { code: 'eu', name: 'Basque', status: 'pending' },
                { code: 'be', name: 'Belarusian', status: 'pending' },
                { code: 'bn', name: 'Bengali', status: 'pending' },
                { code: 'bs', name: 'Bosnian', status: 'pending' },
                { code: 'bg', name: 'Bulgarian', status: 'pending' },
                { code: 'ca', name: 'Catalan', status: 'pending' },
                { code: 'ceb', name: 'Cebuano', status: 'pending' },
                { code: 'zh', name: 'Chinese (Simplified)', status: 'pending' },
                { code: 'zh-TW', name: 'Chinese (Traditional)', status: 'pending' },
                { code: 'co', name: 'Corsican', status: 'pending' },
                { code: 'hr', name: 'Croatian', status: 'pending' },
                { code: 'cs', name: 'Czech', status: 'pending' },
                { code: 'da', name: 'Danish', status: 'pending' },
                { code: 'nl', name: 'Dutch', status: 'pending' },
                { code: 'eo', name: 'Esperanto', status: 'pending' },
                { code: 'et', name: 'Estonian', status: 'pending' },
                { code: 'fi', name: 'Finnish', status: 'pending' },
                { code: 'fr', name: 'French', status: 'pending' },
                { code: 'fy', name: 'Frisian', status: 'pending' },
                { code: 'gl', name: 'Galician', status: 'pending' },
                { code: 'ka', name: 'Georgian', status: 'pending' },
                { code: 'de', name: 'German', status: 'pending' },
                { code: 'el', name: 'Greek', status: 'pending' },
                { code: 'gu', name: 'Gujarati', status: 'pending' },
                { code: 'ht', name: 'Haitian Creole', status: 'pending' },
                { code: 'ha', name: 'Hausa', status: 'pending' },
                { code: 'haw', name: 'Hawaiian', status: 'pending' },
                { code: 'he', name: 'Hebrew', status: 'pending' },
                { code: 'hi', name: 'Hindi', status: 'pending' },
                { code: 'hmn', name: 'Hmong', status: 'pending' },
                { code: 'hu', name: 'Hungarian', status: 'pending' },
                { code: 'is', name: 'Icelandic', status: 'pending' },
                { code: 'ig', name: 'Igbo', status: 'pending' },
                { code: 'id', name: 'Indonesian', status: 'pending' },
                { code: 'ga', name: 'Irish', status: 'pending' },
                { code: 'it', name: 'Italian', status: 'pending' },
                { code: 'ja', name: 'Japanese', status: 'pending' },
                { code: 'jv', name: 'Javanese', status: 'pending' },
                { code: 'kn', name: 'Kannada', status: 'pending' },
                { code: 'kk', name: 'Kazakh', status: 'pending' },
                { code: 'km', name: 'Khmer', status: 'pending' },
                { code: 'rw', name: 'Kinyarwanda', status: 'pending' },
                { code: 'ko', name: 'Korean', status: 'pending' },
                { code: 'ku', name: 'Kurdish', status: 'pending' },
                { code: 'ky', name: 'Kyrgyz', status: 'pending' },
                { code: 'lo', name: 'Lao', status: 'pending' },
                { code: 'la', name: 'Latin', status: 'pending' },
                { code: 'lv', name: 'Latvian', status: 'pending' },
                { code: 'lt', name: 'Lithuanian', status: 'pending' },
                { code: 'lb', name: 'Luxembourgish', status: 'pending' },
                { code: 'mk', name: 'Macedonian', status: 'pending' },
                { code: 'mg', name: 'Malagasy', status: 'pending' },
                { code: 'ms', name: 'Malay', status: 'pending' },
                { code: 'ml', name: 'Malayalam', status: 'pending' },
                { code: 'mt', name: 'Maltese', status: 'pending' },
                { code: 'mi', name: 'Maori', status: 'pending' },
                { code: 'mr', name: 'Marathi', status: 'pending' },
                { code: 'mn', name: 'Mongolian', status: 'pending' },
                { code: 'my', name: 'Myanmar (Burmese)', status: 'pending' },
                { code: 'ne', name: 'Nepali', status: 'pending' },
                { code: 'no', name: 'Norwegian', status: 'pending' },
                { code: 'ny', name: 'Nyanja', status: 'pending' },
                { code: 'or', name: 'Odia (Oriya)', status: 'pending' },
                { code: 'ps', name: 'Pashto', status: 'pending' },
                { code: 'fa', name: 'Persian', status: 'pending' },
                { code: 'pt', name: 'Portuguese', status: 'pending' },
                { code: 'pa', name: 'Punjabi', status: 'pending' },
                { code: 'ro', name: 'Romanian', status: 'pending' },
                { code: 'ru', name: 'Russian', status: 'pending' },
                { code: 'sm', name: 'Samoan', status: 'pending' },
                { code: 'gd', name: 'Scots Gaelic', status: 'pending' },
                { code: 'sr', name: 'Serbian', status: 'pending' },
                { code: 'st', name: 'Sesotho', status: 'pending' },
                { code: 'sn', name: 'Shona', status: 'pending' },
                { code: 'sd', name: 'Sindhi', status: 'pending' },
                { code: 'si', name: 'Sinhala', status: 'pending' },
                { code: 'sk', name: 'Slovak', status: 'pending' },
                { code: 'sl', name: 'Slovenian', status: 'pending' },
                { code: 'so', name: 'Somali', status: 'pending' },
                { code: 'es', name: 'Spanish', status: 'pending' },
                { code: 'su', name: 'Sundanese', status: 'pending' },
                { code: 'sw', name: 'Swahili', status: 'pending' },
                { code: 'sv', name: 'Swedish', status: 'pending' },
                { code: 'tl', name: 'Tagalog', status: 'pending' },
                { code: 'tg', name: 'Tajik', status: 'pending' },
                { code: 'ta', name: 'Tamil', status: 'pending' },
                { code: 'tt', name: 'Tatar', status: 'pending' },
                { code: 'te', name: 'Telugu', status: 'pending' },
                { code: 'th', name: 'Thai', status: 'pending' },
                { code: 'tr', name: 'Turkish', status: 'pending' },
                { code: 'tk', name: 'Turkmen', status: 'pending' },
                { code: 'uk', name: 'Ukrainian', status: 'pending' },
                { code: 'ur', name: 'Urdu', status: 'pending' },
                { code: 'ug', name: 'Uyghur', status: 'pending' },
                { code: 'uz', name: 'Uzbek', status: 'pending' },
                { code: 'vi', name: 'Vietnamese', status: 'pending' },
                { code: 'cy', name: 'Welsh', status: 'pending' },
                { code: 'xh', name: 'Xhosa', status: 'pending' },
                { code: 'yi', name: 'Yiddish', status: 'pending' },
                { code: 'yo', name: 'Yoruba', status: 'pending' },
                { code: 'zu', name: 'Zulu', status: 'pending' }
            ],
            issues: [],
            progress: {
                words: this.calculateWordsProgress(),
                sentences: this.calculateVersesProgress()
            },
            visibility: {
                words_section: true,
                sentences_section: true
            },
            amount_tiers: baseAmounts,
            debug_mode: false
        };
    }

    setupUI() {
        this.populateLanguages();
        this.populateGitHubIssues();
        this.setupAmountDropdowns();
        this.updateProgress();
        this.updateSectionVisibility();
        this.updateGitHubSectionVisibility();
        this.setupStatsToggles();
        this.updateCurrency();
        this.updatePlaceholders();
    }

    populateLanguages() {
        const select = document.getElementById('translation-language');
        if (!select || !this.donationData.languages) return;
        
        // Keep the first option
        const firstOption = select.querySelector('option[data-locale="select_language"]');
        select.innerHTML = '';
        if (firstOption) {
            select.appendChild(firstOption);
        }
        
        this.donationData.languages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.code;
            option.textContent = lang.name;
            option.disabled = lang.status === 'completed';
            select.appendChild(option);
        });
    }

    populateGitHubIssues() {
        const select = document.getElementById('github-issue');
        if (!select || !this.donationData.issues) return;
        
        // Keep the first option
        const firstOption = select.querySelector('option[data-locale="select_issue"]');
        select.innerHTML = '';
        if (firstOption) {
            select.appendChild(firstOption);
        }
        
        this.donationData.issues.forEach(issue => {
            const option = document.createElement('option');
            option.value = issue.issue_number;
            option.textContent = `#${issue.issue_number}: ${issue.title}`;
            select.appendChild(option);
        });
    }

    setupAmountDropdowns() {
        const dropdowns = [
            { id: 'translation-amount', category: 'translation' },
            { id: 'words-amount', category: 'analysis' },
            { id: 'sentence-amount', category: 'analysis' },
            { id: 'github-amount', category: 'github' }
        ];

        dropdowns.forEach(({ id, category }) => {
            const select = document.getElementById(id);
            if (!select) return;

            select.innerHTML = '';
            const amounts = this.donationData.amount_tiers[category] || [];
            
            amounts.forEach((amount, index) => {
                const option = document.createElement('option');
                option.value = amount;
                option.textContent = `$${amount}`;
                // Set 0 as default selected
                if (amount === 0) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        });
    }

    updateProgress() {
        const wordsSpan = document.getElementById('words-progress');
        const sentenceSpan = document.getElementById('sentence-progress');
        
        if (wordsSpan && this.donationData.progress) {
            const wordsProgress = this.donationData.progress.words;
            // Round to 1 decimal place for display
            wordsSpan.textContent = wordsProgress.toFixed(1);
        }
        
        if (sentenceSpan && this.donationData.progress) {
            const sentencesProgress = this.donationData.progress.sentences;
            // Round to 1 decimal place for display
            sentenceSpan.textContent = sentencesProgress.toFixed(1);
        }
    }

    updateSectionVisibility() {
        const wordsSection = document.getElementById('words-analysis-section');
        const sentenceSection = document.getElementById('sentence-analysis-section');
        
        if (wordsSection && this.donationData.visibility) {
            wordsSection.style.display = this.donationData.visibility.words_section ? 'block' : 'none';
        }
        
        if (sentenceSection && this.donationData.visibility) {
            sentenceSection.style.display = this.donationData.visibility.sentences_section ? 'block' : 'none';
        }
    }

    updateGitHubSectionVisibility() {
        // Hide GitHub section if no issues are available
        const githubSection = document.getElementById('github-issue-section');
        
        if (githubSection) {
            const hasIssues = this.donationData.issues && this.donationData.issues.length > 0;
            githubSection.style.display = hasIssues ? 'block' : 'none';
        }
    }

    updateGitHubIssueLink() {
        const issueSelect = document.getElementById('github-issue');
        const linkContainer = document.getElementById('github-issue-link');
        
        if (!issueSelect || !linkContainer) return;
        
        const selectedIssueNumber = issueSelect.value;
        if (!selectedIssueNumber || !this.donationData.issues) {
            linkContainer.style.display = 'none';
            return;
        }
        
        // Find the selected issue to get its URL
        const selectedIssue = this.donationData.issues.find(issue => 
            issue.issue_number == selectedIssueNumber
        );
        
        if (selectedIssue && selectedIssue.url) {
            const linkText = this.currentLanguage === 'Polski' ? 
                'Zobacz problem na GitHub' : 'See issue on GitHub';
            
            linkContainer.innerHTML = `
                <a href="${selectedIssue.url}" target="_blank" rel="noopener noreferrer" 
                   class="github-link">
                    ${linkText}
                </a>
            `;
            linkContainer.style.display = 'inline-block';
        } else {
            linkContainer.style.display = 'none';
        }
    }

    setupStatsToggles() {
        const statsToggles = document.querySelectorAll('.stats-toggle');
        
        statsToggles.forEach(toggle => {
            toggle.addEventListener('click', async (e) => {
                e.preventDefault();
                const localeAttribute = toggle.getAttribute('data-locale');
                
                let category;
                if (localeAttribute === 'see_language_support') {
                    category = 'languages';
                } else if (localeAttribute === 'see_issue_support') {
                    category = 'issues';
                } else if (localeAttribute === 'see_cumulative_donations') {
                    // Determine if this is words or sentences based on parent section
                    const parentSection = toggle.closest('.sponsorship-section');
                    if (parentSection && parentSection.id === 'words-analysis-section') {
                        category = 'analysis';
                    } else if (parentSection && parentSection.id === 'sentence-analysis-section') {
                        category = 'analysis';
                    } else {
                        category = 'analysis'; // fallback
                    }
                } else {
                    category = 'issues'; // fallback for backwards compatibility
                }
                
                this.toggleStats(toggle, category);
            });
        });
    }

    toggleStats(toggle, category) {
        const content = toggle.nextElementSibling;
        const icon = toggle.querySelector('.material-symbols-outlined');
        
        if (this.statsVisible[category]) {
            // Hide stats
            content.classList.add('hidden');
            toggle.classList.remove('expanded');
            this.statsVisible[category] = false;
        } else {
            // Show stats - try to load real data first
            this.loadStats(category, content);
            content.classList.remove('hidden');
            toggle.classList.add('expanded');
            this.statsVisible[category] = true;
        }
    }

    async loadStats(category, container) {
        const statsList = container.querySelector('.stats-list');
        statsList.innerHTML = '<div style="text-align: center; padding: 10px;">Loading...</div>';
        
        try {
            // Try to fetch real stats from backend
            let endpoint;
            if (category === 'languages') {
                endpoint = 'languages';
            } else if (category === 'issues') {
                endpoint = 'issues';
            } else if (category === 'analysis') {
                endpoint = 'analysis';
            } else {
                endpoint = 'issues'; // fallback
            }
            
            const response = await fetch(`${this.API_BASE}/api/donation/stats/${endpoint}`);
            
            if (response.ok) {
                const data = await response.json();
                // Handle the response structure: { success: true, stats: { languages: [...] } }
                if (data.success && data.stats) {
                    let statsArray;
                    if (category === 'languages') {
                        statsArray = data.stats.languages;
                    } else if (category === 'issues') {
                        statsArray = data.stats.issues;
                    } else if (category === 'analysis') {
                        statsArray = data.stats.analysis;
                    } else {
                        statsArray = [];
                    }
                    this.displayStats(statsArray, statsList, category);
                } else {
                    this.loadMockStats(category, container);
                }
            } else {
                // Fallback to mock data
                this.loadMockStats(category, container);
            }
        } catch (error) {
            console.error('Failed to load stats:', error);
            // Fallback to mock data
            this.loadMockStats(category, container);
        }
    }

    displayStats(stats, statsList, category = 'unknown') {
        statsList.innerHTML = '';
        
        if (stats.length === 0) {
            const noSponsorshipsText = this.getLocalizedText('no_sponsorships_yet');
            statsList.innerHTML = `<div style="text-align: center; padding: 10px; opacity: 0.7;">${noSponsorshipsText}</div>`;
            return;
        }
        
        stats.forEach(stat => {
            const item = document.createElement('div');
            item.className = 'stats-item';
            
            // Handle different field names for different categories
            let name, amount;
            if (category === 'languages') {
                name = stat.language_name || 'Unknown Language';
                amount = stat.total_sponsored_usd || 0;
            } else if (category === 'issues') {
                name = stat.title || `Issue #${stat.issue_number}` || 'Unknown Issue';
                amount = stat.total_sponsored_usd || 0;
            } else if (category === 'analysis') {
                name = stat.analysis_name || 'Unknown Analysis';
                amount = stat.total_sponsored_usd || 0;
            } else {
                // Fallback for backwards compatibility
                name = stat.language_name || stat.title || stat.analysis_name || 'Unknown';
                amount = stat.total_sponsored_usd || 0;
            }
            
            item.innerHTML = `
                <span>${name}</span>
                <span>$${amount.toFixed(2)}</span>
            `;
            statsList.appendChild(item);
        });
    }

    loadMockStats(category, container) {
        const statsList = container.querySelector('.stats-list');
        statsList.innerHTML = '';
        
        // Show localized "No sponsorships yet" message instead of fake data
        const noSponsorshipsText = this.getLocalizedText('no_sponsorships_yet');
        statsList.innerHTML = `<div style="text-align: center; padding: 10px; opacity: 0.7;">${noSponsorshipsText}</div>`;
    }

    updateCurrency() {
        // Simple currency update based on current language
        this.currentCurrency = this.currentLanguage === 'Polski' ? 'PLN' : 'USD';
        
        // Update currency displays
        const currencyElements = document.querySelectorAll('#appreciation-currency');
        currencyElements.forEach(el => {
            el.textContent = this.currentCurrency;
        });
    }

    validateSponsorshipData() {
        const errors = [];
        
        // Get all selected sponsorships
        const sponsorships = this.getAllSelectedSponsorships();
        
        if (sponsorships.length === 0) {
            errors.push(this.currentLanguage === 'Polski' ? 
                'Proszę wybrać przynajmniej jedną opcję sponsoringu' : 
                'Please select at least one sponsorship option');
        }
        
        return errors;
    }

    getAllSelectedSponsorships() {
        const sponsorships = [];
        
        // Check translation sponsorship
        const translationLang = document.getElementById('translation-language')?.value || '';
        const translationAmount = document.getElementById('translation-amount')?.value || '';
        
        if (translationLang && translationAmount && parseFloat(translationAmount) > 0) {
            sponsorships.push({
                type: 'translation',
                data: {
                    language_code: translationLang,
                    amount: parseFloat(translationAmount)
                }
            });
        }
        
        // Check GitHub issue (only if section is visible and issues are available)
        const githubSection = document.getElementById('github-issue-section');
        const githubIssue = document.getElementById('github-issue')?.value || '';
        const githubAmount = document.getElementById('github-amount')?.value || '';
        
        if (githubSection && githubSection.style.display !== 'none' && 
            githubIssue && githubAmount && parseFloat(githubAmount) > 0) {
            sponsorships.push({
                type: 'github_issue',
                data: {
                    issue_number: parseInt(githubIssue),
                    amount: parseFloat(githubAmount)
                }
            });
        }
        
        // Check campaign sponsorships (dynamically rendered)
        const campaignSections = document.querySelectorAll('.campaign-section');
        campaignSections.forEach(section => {
            const campaignId = section.dataset.campaignId;
            const dropdown = section.querySelector(`#${campaignId}-amount`);
            const amount = dropdown?.value || '';
            
            if (amount && parseFloat(amount) > 0) {
                sponsorships.push({
                    type: campaignId,
                    data: {
                        amount: parseFloat(amount)
                    }
                });
            }
        });
        
        // Check free appreciation
        const appreciationAmount = document.getElementById('appreciation-amount')?.value || '';
        const appreciationMessage = document.getElementById('appreciation-message')?.value || '';
        
        if (appreciationAmount && parseFloat(appreciationAmount) > 0) {
            sponsorships.push({
                type: 'free_appreciation',
                data: {
                    amount: parseFloat(appreciationAmount),
                    message: appreciationMessage
                }
            });
        }
        
        return sponsorships;
    }

    getSelectedSponsorship() {
        // For PayPal, we need to combine all sponsorships into one payment
        const sponsorships = this.getAllSelectedSponsorships();
        if (sponsorships.length === 0) return null;
        
        const totalAmount = sponsorships.reduce((sum, s) => sum + s.data.amount, 0);
        
        return {
            type: 'combined',
            data: {
                amount: totalAmount,
                sponsorships: sponsorships
            }
        };
    }

    initializePayPal() {
        if (window.paypal) {
            this.renderPayPalButton();
        } else {
            this.loadPayPalSDK().then(() => {
                this.renderPayPalButton();
            });
        }
    }

    loadPayPalSDK() {
        return new Promise((resolve, reject) => {
            if (window.paypal) {
                resolve();
                return;
            }
            
            // Use client ID from backend (MUST be provided by server)
            if (!this.paypalClientId) {
                console.error('PayPal client ID not provided by backend');
                this.showError('Payment system not configured. Please contact support.', true);
                reject(new Error('PayPal client ID not configured'));
                return;
            }
            
            const clientId = this.paypalClientId;
            
            // Remove existing script if any
            const existingScript = document.querySelector('script[src*="paypal.com/sdk"]');
            if (existingScript) {
                existingScript.remove();
            }
            
            const script = document.createElement('script');
            script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${this.currentCurrency}`;
            script.onload = resolve;
            script.onerror = () => {
                console.error('Failed to load PayPal SDK');
                this.showError('Failed to load payment system. Please refresh the page.', true);
                reject(new Error('PayPal SDK load failed'));
            };
            document.head.appendChild(script);
        });
    }

    renderPayPalButton() {
        if (!this.paypalContainer || !window.paypal) return;
        
        this.paypalContainer.innerHTML = '';
        
        window.paypal.Buttons({
            style: {
                layout: 'vertical',
                color: 'blue',
                shape: 'rect',
                label: 'donate'
            },
            
            onClick: () => {
                const errors = this.validateSponsorshipData();
                if (errors.length > 0) {
                    this.showError(errors.join('<br>'), true);
                    return false;
                }
                this.clearError();
                return true;
            },

            createOrder: async (data, actions) => {
                try {
                    const errors = this.validateSponsorshipData();
                    if (errors.length > 0) {
                        this.showError(errors.join('<br>'), true);
                        return Promise.reject('Validation failed');
                    }
                    
                    const sponsorships = this.getAllSelectedSponsorships();
                    if (sponsorships.length === 0) {
                        this.showError('Please select at least one sponsorship option', true);
                        return Promise.reject('No sponsorship selected');
                    }
                    
                    // Call backend to create payment order
                    // For simplicity, process first sponsorship (or combine if multiple)
                    const sponsorship = sponsorships[0];
                    
                    // Generate idempotency key for this payment
                    if (!this.idempotencyKey) {
                        this.idempotencyKey = this.generateIdempotencyKey();
                    }
                    
                    const headers = {
                        'Content-Type': 'application/json'
                    };
                    
                    // Add session token if available (stored by user.js module)
                    let sessionToken = null;
                    try {
                        const userData = localStorage.getItem('githubUser');
                        if (userData) {
                            const parsed = JSON.parse(userData);
                            sessionToken = parsed.sessionToken;
                        }
                    } catch (e) {
                        console.warn('Failed to parse githubUser from localStorage:', e);
                    }
                    
                    if (sessionToken) {
                        headers['Authorization'] = `Bearer ${sessionToken}`;
                    }
                    
                    const response = await fetch(`${this.API_BASE}/api/donation/create-payment`, {
                        method: 'POST',
                        headers: headers,
                        body: JSON.stringify({
                            sponsorship_type: sponsorship.type,
                            amount: sponsorship.data.amount,
                            currency: this.currentCurrency,
                            language_code: sponsorship.data.language_code,
                            issue_number: sponsorship.data.issue_number,
                            message: sponsorship.data.message || '',
                            idempotency_key: this.idempotencyKey
                        })
                    });
                    
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }
                    
                    const result = await response.json();
                    
                    if (!result.success) {
                        throw new Error(result.error || 'Failed to create order');
                    }
                    
                    console.log(`Backend created order: ${result.order_id}`);
                    
                    // Return the order ID to PayPal SDK
                    return result.order_id;
                    
                } catch (error) {
                    console.error('Failed to create payment:', error);
                    this.showError('Failed to create payment: ' + error.message, true);
                    return Promise.reject(error);
                }
            },
            
            onApprove: async (data, actions) => {
                try {
                    // Call backend to capture the payment
                    const response = await fetch(`${this.API_BASE}/api/donation/execute-payment`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            order_id: data.orderID
                        })
                    });
                    
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        console.log('Payment completed successfully');
                        
                        // Close form immediately
                        this.closePanel();
                        
                        // Show success notification in top-right corner (unified with Stripe)
                        const message = this.currentLanguage === 'Polski' 
                            ? 'Dziękujemy za sponsoring! 🎉'
                            : 'Thank you for your sponsorship! 🎉';
                        this.showTemporaryMessage(message, 'success');
                    } else {
                        throw new Error(result.error || 'Payment capture failed');
                    }
                    
                } catch (error) {
                    console.error('Payment capture failed:', error);
                    // Keep form open and show error in-form
                    this.showError('Payment capture failed: ' + error.message, true);
                }
            },
            
            onError: (err) => {
                console.error('PayPal error:', err);
                // Keep form open and show error in-form
                this.showError('Payment failed. Please try again.', true);
            },

            onCancel: () => {
                // Clear any errors but keep form open
                this.clearError();
                console.log('Payment cancelled by user');
                
                // Optionally show info message
                const message = this.currentLanguage === 'Polski'
                    ? 'Płatność anulowana'
                    : 'Payment cancelled';
                this.showError(message, true);
            }
        }).render('#paypal-button-container').catch((err) => {
            console.error('PayPal render error:', err);
            this.showError('Failed to load PayPal buttons. Please refresh the page.', true);
        });
    }

    showError(message, isStage2 = false) {
        const errorDiv = isStage2 ? this.errorDivStage2 : this.errorDiv;
        if (errorDiv) {
            errorDiv.innerHTML = message;
        }
    }

    clearError() {
        if (this.errorDiv) {
            this.errorDiv.innerHTML = '';
        }
        if (this.errorDivStage2) {
            this.errorDivStage2.innerHTML = '';
        }
    }


}

// Initialize donation system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.donationSystem = new DonationManager();
    }, 500);
});

// Keep backward compatibility
window.DonationManager = DonationManager;

// Expose progress calculation functions for campaigns
window.calculateWordsProgress = function() {
    if (window.donationSystem) {
        return window.donationSystem.calculateWordsProgress();
    }
    return 0.0;
};

window.calculateSentencesProgress = function() {
    if (window.donationSystem) {
        return window.donationSystem.calculateVersesProgress();
    }
    return 0.0;
};