/**
 * Help Panel - Loads and displays markdown help content based on app locale
 */
(function() {
    let overlay, panel, contentDiv, closeBtn;
    let markdownCache = null;

    function bind() {
        overlay = document.querySelector('.help-overlay');
        panel = document.querySelector('.help-panel');
        contentDiv = document.getElementById('help-content');
        closeBtn = panel?.querySelector('.help-close');

        if (!overlay || !panel || !contentDiv) return;

        // Close handlers
        closeBtn?.addEventListener('click', hidePanel);
        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay) hidePanel();
        });

        // ESC key handler
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay?.classList.contains('active')) {
                hidePanel();
            }
        });

        // Toggle button in toolbar
        const toggleBtn = document.getElementById('help-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', showPanel);
        }

        // Listen for locale changes to reload content
        document.addEventListener('localeChanged', () => {
            if (overlay?.classList.contains('active')) {
                loadHelpContent();
            }
        });
    }

    async function loadMarkdown() {
        if (markdownCache) return markdownCache;
        
        try {
            const response = await fetch('HELP.md');
            if (!response.ok) throw new Error('Failed to load HELP.md');
            markdownCache = await response.text();
            return markdownCache;
        } catch (e) {
            console.error('Error loading help markdown:', e);
            return '';
        }
    }

    function extractSection(markdown, language) {
        // Language mapping: 'English' -> 'English', 'Polski' -> 'Polski'
        const sectionMap = {
            'English': 'English',
            'Polski': 'Polski'
        };
        
        const sectionName = sectionMap[language] || 'English';
        
        // Split by # headers to find sections
        const sections = markdown.split(/^# /m);
        
        for (let section of sections) {
            if (section.trim().startsWith(sectionName)) {
                // Remove the language name line and return the rest
                const lines = section.split('\n');
                lines.shift(); // Remove first line (language name)
                return lines.join('\n').trim();
            }
        }
        
        // Fallback to English if section not found
        for (let section of sections) {
            if (section.trim().startsWith('English')) {
                const lines = section.split('\n');
                lines.shift();
                return lines.join('\n').trim();
            }
        }
        
        return markdown; // Last resort fallback
    }

    function parseMarkdown(markdown) {
        // Use marked.js if available, otherwise simple fallback
        if (typeof marked !== 'undefined' && marked.parse) {
            try {
                // Configure marked to open links in new tabs
                const renderer = new marked.Renderer();
                renderer.link = function(href, title, text) {
                    const link = marked.Renderer.prototype.link.call(this, href, title, text);
                    return link.replace('<a', '<a target="_blank" rel="noopener noreferrer"');
                };
                
                return marked.parse(markdown, {
                    breaks: true,
                    gfm: true,
                    renderer: renderer
                });
            } catch (e) {
                console.warn('Marked.js parse failed, using fallback:', e);
            }
        }
        
        // Simple fallback markdown parser
        let html = markdown
            // Headers
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            .replace(/^# (.+)$/gm, '<h1>$1</h1>')
            // Links
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
            // Bold
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            // Paragraphs
            .split('\n\n')
            .map(para => para.trim())
            .filter(para => para && !para.startsWith('<h'))
            .map(para => `<p>${para}</p>`)
            .join('\n');
        
        return html;
    }

    async function loadHelpContent() {
        if (!contentDiv) return;
        
        const currentLang = localStorage.getItem('appLang') || 'English';
        const markdown = await loadMarkdown();
        
        if (!markdown) {
            contentDiv.innerHTML = '<p>Failed to load help content.</p>';
            return;
        }
        
        const section = extractSection(markdown, currentLang);
        const html = parseMarkdown(section);
        contentDiv.innerHTML = html;
    }

    async function showPanel() {
        await loadHelpContent();
        overlay?.classList.add('active');
        panel?.classList.add('active');
    }

    function hidePanel() {
        overlay?.classList.remove('active');
        panel?.classList.remove('active');
    }

    function initHelp(attempts = 6) {
        try {
            bind();
            const ok = overlay && panel && contentDiv;
            if (!ok && attempts > 0) {
                setTimeout(() => initHelp(attempts - 1), 100);
            }
        } catch (e) {
            if (attempts > 0) {
                setTimeout(() => initHelp(attempts - 1), 100);
            }
        }
    }

    window.initHelp = initHelp;
})();