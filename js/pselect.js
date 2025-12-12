/**
 * Prompt Selection Panel for submitting user-defined prompts
 */
(function() {
    let overlay, panel, dropdown, closeBtn, cancelBtn, submitBtn;
    let selectedPrompt = null;
    let resolveCallback = null;

    function bind() {
        overlay = document.querySelector('.pselect-overlay');
        panel = document.querySelector('.pselect-panel');
        dropdown = document.getElementById('pselect-dropdown');
        closeBtn = panel?.querySelector('.pselect-close');
        cancelBtn = panel?.querySelector('.pselect-cancel-btn');
        submitBtn = panel?.querySelector('.pselect-submit-btn');

        if (!overlay || !panel || !dropdown) return;

        // Close handlers
        closeBtn?.addEventListener('click', () => closePanel(null));
        cancelBtn?.addEventListener('click', () => closePanel(null));
        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay) closePanel(null);
        });

        // Submit handler
        submitBtn?.addEventListener('click', () => {
            const selectedIndex = dropdown.selectedIndex;
            if (selectedIndex >= 0) {
                closePanel(selectedPrompt);
            }
        });

        // Dropdown change handler
        dropdown?.addEventListener('change', (e) => {
            const index = e.target.selectedIndex;
            const prompts = getUserPrompts();
            selectedPrompt = prompts[index] || null;
        });

        // ESC key handler
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay?.classList.contains('active')) {
                closePanel(null);
            }
        });
    }

    function getUserPrompts() {
        if (!window.promptsAPI || typeof window.promptsAPI.getAllPrompts !== 'function') {
            return [];
        }
        const allPrompts = window.promptsAPI.getAllPrompts();
        // Filter to only user-defined prompts (not predefined or overridden)
        return allPrompts.filter(p => !p.predefined || p.overridden);
    }

    function populateDropdown() {
        if (!dropdown) return;
        
        dropdown.innerHTML = '';
        const prompts = getUserPrompts();
        
        if (prompts.length === 0) {
            const option = document.createElement('option');
            option.textContent = window.getLocale ? 
                (window.getLocale('no_user_prompts') || 'No user prompts available') : 
                'No user prompts available';
            option.disabled = true;
            dropdown.appendChild(option);
            if (submitBtn) submitBtn.disabled = true;
            return;
        }

        prompts.forEach((prompt, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${prompt.name} (${prompt.type} - ${prompt.language})`;
            dropdown.appendChild(option);
        });

        // Set first prompt as selected
        selectedPrompt = prompts[0] || null;
        if (submitBtn) submitBtn.disabled = false;
    }

    function openPanel() {
        return new Promise((resolve) => {
            resolveCallback = resolve;
            populateDropdown();
            updateLocaleTexts();
            overlay?.classList.add('active');
        });
    }

    function closePanel(result) {
        overlay?.classList.remove('active');
        if (resolveCallback) {
            resolveCallback(result);
            resolveCallback = null;
        }
        selectedPrompt = null;
    }

    function updateLocaleTexts() {
        if (!window.getLocale) return;
        
        try {
            const header = panel?.querySelector('.pselect-header h3');
            if (header) header.textContent = window.getLocale('select_prompt_to_submit') || 'Select a prompt to submit';
            
            if (cancelBtn) cancelBtn.textContent = window.getLocale('cancel') || 'Cancel';
            if (submitBtn) submitBtn.textContent = window.getLocale('submit') || 'Submit';
        } catch (e) {
            console.error('Error updating locale texts:', e);
        }
    }

    function initPromptSelect(attempts = 6) {
        try {
            bind();
            const ok = overlay && panel && dropdown;
            if (!ok && attempts > 0) {
                setTimeout(() => initPromptSelect(attempts - 1), 100);
            }
        } catch (e) {
            if (attempts > 0) {
                setTimeout(() => initPromptSelect(attempts - 1), 100);
            }
        }

        // Listen for locale changes
        document.addEventListener('localeChanged', updateLocaleTexts);
    }

    // Export API
    window.promptSelectAPI = {
        openPanel,
        closePanel
    };

    window.initPromptSelect = initPromptSelect;
})();
