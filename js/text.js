function renderWhenReady(container) {
    let bookSelect = document.getElementById('book-select')
    let chapterSelect = document.getElementById('chapter-select')
    let originalText = document.getElementById('original-text');
    let firstTranslation = document.getElementById('first-translation');
    let secondTranslation = document.getElementById('second-translation');

    // Reset line elements
    lineElements = [];
    const bookIndex = bookSelect.value;
    const chapterIndex = chapterSelect.value;
    const bookKey = String(Number(bookIndex));
    const chapterKey = String(Number(chapterIndex));

    // Render verses only if at least one view is enabled
    if (originalText.value !== 'disable' || firstTranslation.value !== 'disable' || secondTranslation.value !== 'disable') {
        const devanagari = window.mahabharata[bookKey]?.[chapterKey]?.['devanagari'] || [];
        const iast = window.mahabharata[bookKey]?.[chapterKey]?.['iast'] || [];
        const firstTr = firstTranslation.value !== 'disable' ? 
                    window.translation[firstTranslation.value][bookKey]?.[chapterKey] : null;
        const secondTr = secondTranslation.value !== 'disable' ? 
                    window.translation[secondTranslation.value][bookKey]?.[chapterKey] : null;
        
        container.innerHTML = '';
        devanagari.forEach((phrase, index) => {
            const lineDiv = document.createElement('div');
            lineDiv.className = 'line-entry';
            
            // Add data attributes for notes
            lineDiv.setAttribute('data-source', 'original');
            lineDiv.setAttribute('data-book', bookKey);
            lineDiv.setAttribute('data-chapter', chapterKey);
            lineDiv.setAttribute('data-verse', index + 1);
            
            // Determine rendering mode based on current view setting
            const renderingMode = originalText.value;
            const useMultiLine = renderingMode.includes('multi');
            const showDevanagari = renderingMode.includes('sanskrit') || renderingMode.includes('devanagari');
            const showIAST = renderingMode.includes('sanskrit') || renderingMode.includes('iast');
            
            // Process text based on single-line/multi-line setting
            const processedDevanagari = useMultiLine ? 
                phrase.replace(/\n/g, '<br>') : 
                phrase.replace(/\n/g, ' ');
            const processedIAST = iast[index] ? 
                (useMultiLine ? 
                    iast[index].replace(/\n/g, '<br>') : 
                    iast[index].replace(/\n/g, ' ')) : 
                '';
            
            // Create span elements with appropriate language attributes
            const verseNumberSpan = document.createElement('span');
            verseNumberSpan.className = 'verse-number';
            verseNumberSpan.textContent = `${index + 1}:`;
            
            // Add verse number
            lineDiv.appendChild(verseNumberSpan);
            lineDiv.appendChild(document.createElement('br'));
            
            // Add Devanagari if enabled
            if (showDevanagari) {
                const sanskritSpan = document.createElement('span');
                sanskritSpan.className = 'verse-text';
                sanskritSpan.lang = 'sa'; // Mark as Sanskrit language
                sanskritSpan.innerHTML = processedDevanagari;
                lineDiv.appendChild(sanskritSpan);
                lineDiv.appendChild(document.createElement('br'));
            }
            
            // Add IAST if enabled
            if (showIAST) {
                const iastSpan = document.createElement('span');
                iastSpan.className = 'verse-text';
                iastSpan.lang = 'sa-Latn'; // Sanskrit in Latin script (IAST)
                iastSpan.innerHTML = processedIAST;
                lineDiv.appendChild(iastSpan);
                lineDiv.appendChild(document.createElement('br'));
            }

            if ((showDevanagari || showIAST) && (firstTr !== null || secondTr !== null)) {
                // Add extra spacing between original and translations
                lineDiv.appendChild(document.createElement('br'));
            }

            // Add first translation if available
            if (firstTr !== null) {
                const trSpan = document.createElement('span');
                trSpan.className = 'verse-text';
                trSpan.lang = (firstTranslation.value || '').slice(-2); // Last two letters indicate language code
                trSpan.innerHTML = firstTr[String(index + 1)] || '';
                lineDiv.appendChild(trSpan);
                lineDiv.appendChild(document.createElement('br'));
            }

            if (firstTr !== null && secondTr !== null) {
                // Add extra spacing between translations
                lineDiv.appendChild(document.createElement('br'));
            }

            // Add second translation if available
            if (secondTr !== null) {
                const trSpan = document.createElement('span');
                trSpan.className = 'verse-text';
                trSpan.lang = (secondTranslation.value || '').slice(-2); // Last two letters indicate language code
                trSpan.innerHTML = secondTr[String(index + 1)] || '';
                lineDiv.appendChild(trSpan);
                lineDiv.appendChild(document.createElement('br'));
            }
            
            // Add final spacing
            lineDiv.appendChild(document.createElement('br'));
            // Append verse container
            container.appendChild(lineDiv);
            // If a note exists for this verse, render a small icon (minimal DOM change)
            try {
                if (window.notesAPI) {
                    const note = window.notesAPI.getNote(bookKey, chapterKey, index + 1);
                    if (note) {
                        // ensure verse container is positioned so absolute icon can be placed
                        lineDiv.style.position = lineDiv.style.position || 'relative';
                        const noteIcon = document.createElement('span');
                        noteIcon.className = 'verse-note-icon';
                        noteIcon.title = 'Open note';
                        noteIcon.textContent = '📝';
                        noteIcon.setAttribute('data-book', bookKey);
                        noteIcon.setAttribute('data-chapter', chapterKey);
                        noteIcon.setAttribute('data-verse', String(index + 1));
                        noteIcon.style.position = 'absolute';
                        noteIcon.style.right = '6px';
                        noteIcon.style.bottom = '6px';
                        noteIcon.style.zIndex = '3';
                        noteIcon.style.cursor = 'pointer';
                        noteIcon.style.fontSize = '14px';
                        lineDiv.appendChild(noteIcon);
                    }
                }
            } catch (e) { /* ignore notes errors */ }
            lineElements.push(lineDiv);
        });
    }

    // Notify background module that verses have been rendered
    document.dispatchEvent(new Event('versesRendered'));
}

function renderText(container) {
    let bookSelect = document.getElementById('book-select')
    let chapterSelect = document.getElementById('chapter-select')
    let originalText = document.getElementById('original-text');
    let firstTranslation = document.getElementById('first-translation');
    let secondTranslation = document.getElementById('second-translation');

    // loop over sleep periods until all variables are defined
    setTimeout(() => {
        if (bookSelect === null || chapterSelect === null || originalText === null ||
            firstTranslation === null || secondTranslation === null) {
            renderText(container); // Retry after delay
            }
        else {
            renderWhenReady(container);
            window.currentTextContainer = container;
        }
    }, 355);
}

function updateText() {
    for (const orientation of ['-horizontal', '-vertical']) {
        renderText(document.getElementById('text-panel' + orientation));
    }
}

document.addEventListener('bookChapterChanged', () => {
    updateText();
});

document.addEventListener('textRenderingChanged', () => {
    updateText();
});

document.addEventListener('backgroundSettingsChanged', () => {
    updateText();
});