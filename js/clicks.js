function initClicks() {
    for (const id of ['text-panel-horizontal', 'text-panel-vertical']) {
        const el = document.getElementById(id);
        if (!el) continue;
        el.addEventListener('click', (e) => handleWordClick(e, el));
    }
}

/**
 * Handle click on Sanskrit panel to select word (non-intrusive approach)
 * Finds the closest word to click coordinates without modifying DOM
 */
function handleWordClick(e, container) {
    // Get click coordinates
    const clickX = e.clientX;
    const clickY = e.clientY;

    // Find the closest word to the click point within the container that received the event
    const result = findClosestWord(clickX, clickY, container);
    
    if (result) {
        const { verseNumber, wordIndex, wordText, lang, book, chapter } = result;
        console.log(`Book ${book}, Chapter ${chapter}:`);
        if (wordIndex === null) {
            console.log(`Clicked verse ${verseNumber} (no specific word)`);

            // Dispatch custom event with verse and word information
            const event = new CustomEvent('verseClicked', {
                detail: {
                    book: book,
                    chapter: chapter,
                    verse: verseNumber
                }
            });
            document.dispatchEvent(event);

        } else {
            console.log(`Clicked word ${wordIndex} in verse ${verseNumber}: ${wordText} in ${lang}`);

            // Dispatch custom event with verse and word information
            const event = new CustomEvent('wordClicked', {
                detail: {
                    book: book,
                    chapter: chapter,
                    verse: verseNumber,
                    word: wordIndex,
                    text: wordText,
                    lang: lang
                }
            });
            document.dispatchEvent(event);
        }
    }
}

/**
 * Find the closest word to given screen coordinates
 * Uses a non-intrusive approach by analyzing text node positions
 * @param {number} x - Screen X coordinate
 * @param {number} y - Screen Y coordinate
 * @returns {object|null} - {verseNumber, wordIndex} or null if not found
 */
function findClosestWord(x, y, container) {
    // container should be the panel element where the click occurred
    if (!container) return null;

    // Ensure original text element is available and rendering is enabled
    const originalText = document.getElementById('original-text');
    if (!originalText) return null;
    const renderingMode = originalText.value;
    if (renderingMode === 'disable') return null;

    // Helper: find the word inside a given text span at the point (px,py).
    // Returns an object {verseNumber, wordIndex, wordText, lang, book, chapter} or null.
    // (using the helper defined earlier)
    function findWordInSpanAtPoint(span, px, py, verseNumber, book, chapter) {
        const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT, null, false);
        const range = document.createRange();
        let wordIndex = 0;
        let node;
        while (node = walker.nextNode()) {
            const nodeText = node.textContent || '';
            let search = nodeText;
            let offsetInNode = 0;
            while (true) {
                const m = search.match(/\S+/);
                if (!m) break;
                const word = m[0];
                const start = offsetInNode + m.index;
                const end = start + word.length;
                try {
                    range.setStart(node, start);
                    range.setEnd(node, end);
                    const rects = range.getClientRects();
                    for (let ri = 0; ri < rects.length; ri++) {
                        const r = rects[ri];
                        if (px >= r.left && px <= r.right && py >= r.top && py <= r.bottom) {
                            return {
                                verseNumber: verseNumber,
                                wordIndex: wordIndex + 1,
                                wordText: range.toString(),
                                lang: span.getAttribute('lang') || null,
                                book: book,
                                chapter: chapter
                            };
                        }
                    }
                } catch (e) { /* ignore range errors */ }
                wordIndex += 1;
                const adv = m.index + m[0].length;
                offsetInNode += adv;
                search = search.substring(adv);
            }
        }
        return null;
    }

    // If the pointer is over a translation span (non-Sanskrit), try to resolve the exact
    // translation word under the pointer and return that information. This prevents
    // falling back to a nearest Sanskrit word when the user actually clicked a translation.
    let verseElements = null;
    let foundVerse = null;
    try {
        const elAt = document.elementFromPoint(x, y);
        if (elAt) {
            // If the element at point is inside a `.verse-text` with a language attribute
            const textSpan = elAt.closest('.verse-text');
            if (textSpan && container.contains(textSpan)) {
                const lang = textSpan.getAttribute('lang') || '';
                // treat non-sanskrit langs as translations (lang codes like 'en', 'pl', etc.)
                if (lang && lang !== 'sa' && lang !== 'sa-Latn') {
                    // find the verse ancestor
                    const verseElem = textSpan.closest('[data-verse]');
                    const verseNumber = verseElem ? parseInt(verseElem.dataset.verse) : null;
                    const book = verseElem ? verseElem.dataset.book || null : null;
                    const chapter = verseElem ? verseElem.dataset.chapter || null : null;
                    // Try to find the exact word inside this translation span at the point
                    const transResult = findWordInSpanAtPoint(textSpan, x, y, verseNumber, book, chapter);
                    if (transResult) return transResult;
                    // If clicked inside translation area but no word matched (e.g., whitespace),
                    // treat as no-hit and return null to avoid mapping to Sanskrit.
                    return null;
                }
            }
            // Otherwise, if elementFromPoint gives a verse element, prefer searching only that verse
            const found = elAt.closest('[data-verse]');
            if (found && container.contains(found)) {
                // Use only the verse that contains the pointer
                foundVerse = found;
                verseElements = [foundVerse];
            }
        }
    } catch (e) {
        // elementFromPoint could throw in weird contexts; fall back to scanning all verses
    }

    if (!verseElements) {
        verseElements = container.querySelectorAll('[data-verse]');
    }
    
    // Unified per-span containment-based search for exact word detection.
    // For each verse, examine its visible text spans (Devanagari / IAST) and for each
    // text node use Range.getClientRects() for each word to see if the click point
    // falls inside that word's bounding rect. Return the first exact match found.
    const showDevanagari = renderingMode.includes('sanskrit') || renderingMode.includes('devanagari');
    const showIAST = renderingMode.includes('sanskrit') || renderingMode.includes('iast');

    for (const verseElement of verseElements) {
        const verseNumber = parseInt(verseElement.dataset.verse);
        const book = verseElement.dataset.book || null;
        const chapter = verseElement.dataset.chapter || null;

        const textSpansToCheck = [];
        if (showDevanagari) {
            const devanagariSpan = verseElement.querySelector('.verse-text[lang="sa"]');
            if (devanagariSpan) textSpansToCheck.push(devanagariSpan);
        }
        if (showIAST) {
            const iastSpan = verseElement.querySelector('.verse-text[lang="sa-Latn"]');
            if (iastSpan) textSpansToCheck.push(iastSpan);
        }

        for (const textSpan of textSpansToCheck) {
            const match = findWordInSpanAtPoint(textSpan, x, y, verseNumber, book, chapter);
            if (match) return match;
        }
    }

    // No exact match found
    // If the click was inside a verse container but not on any word, return a partial result
    if (foundVerse) {
        const verseNumber = parseInt(foundVerse.dataset.verse);
        const book = foundVerse.dataset.book || null;
        const chapter = foundVerse.dataset.chapter || null;
        return { verseNumber: verseNumber, wordIndex: null, wordText: null, lang: null, book: book, chapter: chapter };
    }
    return null;
}