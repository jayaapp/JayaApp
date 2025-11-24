// Book selection panel functions
function initBookSelectionPanel(bookKeys) {
    const overlay = document.querySelector('.book-selection-overlay');
    const panel = document.querySelector('.book-selection-panel');
    const content = document.querySelector('.book-selection-content');
    const closeBtn = document.querySelector('.book-selection-close');

    // Clear current app language
    let currentLang = localStorage.getItem('appLang') || 'English';
    
    // Get book titles from locale data
    const bookTitles = window.localeData[currentLang].book_titles || {};
    
    // Populate the panel with book items
    content.innerHTML = bookKeys.map(key => {
        const title = bookTitles[key.toString()] || `Book ${key}`;
        return `
            <div class="book-item" data-book="${key}">
                <span class="book-number">${key}.</span>
                <span class="book-title">${title}</span>
            </div>
        `;
    }).join('');
    
    // Add event listeners
    overlay.addEventListener('click', hideBookSelectionPanel);
    closeBtn.addEventListener('click', hideBookSelectionPanel);
    
    // Add keyboard support
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && panel.classList.contains('active')) {
            hideBookSelectionPanel();
        }
    });
    
    // Add click handlers for book items
    content.addEventListener('click', function(e) {
        const bookItem = e.target.closest('.book-item');
        if (bookItem) {
            const bookNumber = bookItem.dataset.book;
            selectBook(bookNumber);
        }
    });
    
    // Update selected book highlighting
    updateBookSelection();
}

function showBookSelectionPanel() {
    const overlay = document.querySelector('.book-selection-overlay');
    const panel = document.querySelector('.book-selection-panel');
    
    updateBookSelection(); // Update highlighting
    overlay.classList.add('active');
    panel.classList.add('active');
}

function hideBookSelectionPanel() {
    const overlay = document.querySelector('.book-selection-overlay');
    const panel = document.querySelector('.book-selection-panel');
    
    overlay.classList.remove('active');
    panel.classList.remove('active');
}

function updateBookSelection() {
    const bookSelect = document.getElementById('book-select');
    const currentBook = bookSelect.value;
    
    // Update highlighting in the panel
    document.querySelectorAll('.book-item').forEach(item => {
        item.classList.remove('selected');
        if (item.dataset.book === currentBook) {
            item.classList.add('selected');
        }
    });
}

function selectBook(bookNumber) {
    const bookSelect = document.getElementById('book-select');
    bookSelect.value = bookNumber;
    
    // Trigger change event to update chapters
    bookSelect.dispatchEvent(new Event('change'));
    
    hideBookSelectionPanel();
}

// Listen for locale changes to update book panel
document.addEventListener('localeChanged', function() {
    const bookSelect = document.getElementById('book-select');
    if (bookSelect && bookSelect.options.length > 0) {
        const bookKeys = Array.from(bookSelect.options).map(option => parseInt(option.value));
        initBookSelectionPanel(bookKeys);
    }
});

async function updateChapters() {
    const bookIndex = document.getElementById('book-select').value;
    const chapterSelect = document.getElementById('chapter-select');

    if (!window.mahabharata || !window.mahabharata[bookIndex]) {
        console.error('[updateChapters] No data for bookIndex:', bookIndex);
        console.error('[updateChapters] Available book indices:', Object.keys(window.mahabharata || {}));
        return;
    }

    // Convert string keys to numbers and sort them in the ascending order
    const chapterKeys = Object.keys(window.mahabharata[bookIndex]).map(Number).sort((a, b) => a - b);
    chapterSelect.innerHTML = chapterKeys.map((key) => `<option value="${key}">${key}</option>`).join('');
}

async function loadJSON(file) {
    try {
        const response = await fetch(file);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Failed to load ${file}:`, error);
        throw error; // Re-throw so caller can handle it
    }
}

function initNavigation() {
    contentLoadedPromise = new Promise(async (resolve) => {
        // Load data based on current view settings
        try {
            // If init.js already loaded resources, avoid re-fetching them.
            if (!window.mahabharata) {
                try {
                    window.mahabharata = await loadJSON('data/maha_sa.json');
                } catch (e) {
                    console.error('Failed to load maha_sa.json in navigation init:', e);
                    window.mahabharata = window.mahabharata || {};
                }
            }

            // Ensure translation container exists
            window.translation = window.translation || {};
            // Load any missing translations in parallel
            const translationKeys = Object.keys(window.translations || {});
            const missing = translationKeys.filter(k => !window.translation[k]);
            if (missing.length > 0) {
                await Promise.all(missing.map(async (k) => {
                    try {
                        window.translation[k] = await loadJSON(`data/${k}.json`);
                    } catch (e) {
                        console.error(`Failed to load translation ${k}:`, e);
                        window.translation[k] = {};
                    }
                }));
            }

            // Initialize book selection (numbers only)
            const bookSelect = document.getElementById('book-select');
            const bookKeys = Object.keys(window.mahabharata).map(Number).sort((a, b) => a - b);
            
            // Populate with numbers only
            bookSelect.innerHTML = bookKeys.map((key) => {
                return `<option value="${key}">${key}</option>`;
            }).join('');
            
            // Initialize book selection panel
            initBookSelectionPanel(bookKeys);
            
            // Replace dropdown behavior with panel
            bookSelect.addEventListener('mousedown', function(e) {
                e.preventDefault();
                showBookSelectionPanel();
            });
            
            // Prevent the dropdown from opening on click
            bookSelect.addEventListener('click', function(e) {
                e.preventDefault();
            });
            
            bookSelect.addEventListener('change', function() {
                updateChapters(true);
            });
            
            await updateChapters(false);
            resolve();
        } catch (error) {
            console.error('Error loading data:', error);
            resolve();
        }
    });
    
    contentLoadedPromise.then(() => {
        console.log('Navigation module initialized');
    });
}