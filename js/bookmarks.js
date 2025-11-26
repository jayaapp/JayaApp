// Bookmarks module: simple per-verse bookmarks stored in localStorage
(function () {
    const STORAGE_KEY = 'jayaapp:bookmarks';
    let bookmarkMode = false;

    function loadBookmarks() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            console.error('Failed to parse bookmarks storage', e);
            return {};
        }
    }

    function saveBookmarks(obj) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
        } catch (e) {
            console.error('Failed to save bookmarks', e);
        }
    }

    function getBookmark(book, chapter, verse) {
        const b = loadBookmarks();
        return Boolean((b?.[String(book)]?.[String(chapter)] || {})[String(verse)]);
    }

    function setBookmark(book, chapter, verse) {
        const b = loadBookmarks();
        const B = String(book), C = String(chapter), V = String(verse);
        if (!b[B]) b[B] = {};
        if (!b[B][C]) b[B][C] = {};
        b[B][C][V] = true;
        saveBookmarks(b);
    }

    function removeBookmark(book, chapter, verse) {
        const b = loadBookmarks();
        const B = String(book), C = String(chapter), V = String(verse);
        if (b[B] && b[B][C] && b[B][C][V]) {
            delete b[B][C][V];
            if (Object.keys(b[B][C]).length === 0) delete b[B][C];
            if (Object.keys(b[B]).length === 0) delete b[B];
            saveBookmarks(b);
        }
    }

    window.bookmarksAPI = {
        getBookmark,
        setBookmark,
        removeBookmark,
        loadBookmarks
    };

    function bind() {
        // toggle button
        const toggle = document.getElementById('bookmark-toggle');
        if (toggle) {
            toggle.addEventListener('click', () => {
                bookmarkMode = !bookmarkMode;
                document.body.classList.toggle('bookmark-mode', bookmarkMode);
            });
        }

        // clicking a verse while in bookmark mode toggles a bookmark for that verse
        document.addEventListener('click', (e) => {
            if (!bookmarkMode) return;
            const verseEl = e.target.closest('[data-verse]');
            if (!verseEl) return;
            const book = verseEl.dataset.book;
            const chapter = verseEl.dataset.chapter;
            const verse = verseEl.dataset.verse;
            if (getBookmark(book, chapter, verse)) {
                removeBookmark(book, chapter, verse);
            } else {
                setBookmark(book, chapter, verse);
            }
            bookmarkMode = false;
            document.body.classList.remove('bookmark-mode');
            if (window.updateText) window.updateText();
        }, true);

        // clicking a bookmark icon removes it
        document.addEventListener('click', (e) => {
            const icon = e.target.closest('.verse-bookmark-icon');
            if (!icon) return;
            const book = icon.dataset.book;
            const chapter = icon.dataset.chapter;
            const verse = icon.dataset.verse;
            removeBookmark(book, chapter, verse);
            if (window.updateText) window.updateText();
        });
    }

    function initBookmarks(attempts = 6) {
        bind();
        if (attempts > 0 && !document.body) setTimeout(() => initBookmarks(attempts - 1), 100);
    }

    window.initBookmarks = initBookmarks;

})();
