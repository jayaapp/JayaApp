function renderText(container) {
    container.innerHTML = '<h2>This is text window!</h2>';
}

async function updateContent(resetScroll = false) {
    
    return new Promise((resolve) => {
        const bookIndex = document.getElementById('book-select').value;
        const chapterIndex = document.getElementById('chapter-select').value;
        
        
        const leftView = document.getElementById('left-view');
        const middleView = document.getElementById('middle-view');
        const rightView = document.getElementById('right-view');

        // Restore default styles
        leftView.style = '';
        middleView.style = '';
        rightView.style = '';

        const bookKey = String(Number(bookIndex));
        const chapterKey = String(Number(chapterIndex));
        

        // Reset line elements
        lineElements = { left: [], middle: [], right: [] };

        // Update left view (Sanskrit)
        if (viewData.left && currentViews.original !== 'disable') {
            const devanagari = viewData.left[bookKey]?.[chapterKey]?.['devanagari'] || [];
            const iast = viewData.left[bookKey]?.[chapterKey]?.['iast'] || [];
            
            leftView.innerHTML = '';
            devanagari.forEach((phrase, index) => {
                const lineDiv = document.createElement('div');
                lineDiv.className = 'line-entry';
                
                // Add data attributes for notes
                lineDiv.setAttribute('data-source', 'original');
                lineDiv.setAttribute('data-book', bookKey);
                lineDiv.setAttribute('data-chapter', chapterKey);
                lineDiv.setAttribute('data-verse', index + 1);
                
                // Determine rendering mode based on current view setting
                const renderingMode = currentViews.original;
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
                
                // Add final spacing
                lineDiv.appendChild(document.createElement('br'));
                
                leftView.appendChild(lineDiv);
                lineElements.left.push(lineDiv);
            });
        }

        // Update middle view
        if (viewData.middle) {
            const translation = viewData.middle[bookKey]?.[chapterKey] || [];
            middleView.innerHTML = '';

            const keys = Object.keys(translation).map(Number).sort((a, b) => a - b);
            if (keys.length > 0) {
                keys.forEach((key) => {
                    const sentence = translation[key];
                    const lineDiv = document.createElement('div');
                    lineDiv.className = 'line-entry';
                    lineDiv.setAttribute('data-index', key);
                    
                    // Add data attributes for notes
                    lineDiv.setAttribute('data-source', currentViews.first);
                    lineDiv.setAttribute('data-book', bookKey);
                    lineDiv.setAttribute('data-chapter', chapterKey);
                    lineDiv.setAttribute('data-verse', key);
                    
                    lineDiv.innerHTML = `<span class="verse-number">${key}:</span><br><span class="verse-text">${sentence}</span><br><br>`;
                    middleView.appendChild(lineDiv);
                    lineElements.middle.push(lineDiv);
                });
            } else {
                middleView.textContent = localeData[currentLocale].missing_content;
            }
        }
        
        // Update right view
        if (viewData.right) {
            const translation = viewData.right[bookKey]?.[chapterKey] || [];
            rightView.innerHTML = '';

            const keys = Object.keys(translation).map(Number).sort((a, b) => a - b);
            if (keys.length > 0) {
                keys.forEach((key) => {
                    const sentence = translation[key];
                    const lineDiv = document.createElement('div');
                    lineDiv.className = 'line-entry';
                    lineDiv.setAttribute('data-index', key);
                    
                    // Add data attributes for notes
                    lineDiv.setAttribute('data-source', currentViews.second);
                    lineDiv.setAttribute('data-book', bookKey);
                    lineDiv.setAttribute('data-chapter', chapterKey);
                    lineDiv.setAttribute('data-verse', key);
                    
                    lineDiv.innerHTML = `<span class="verse-number">${key}:</span><br><span class="verse-text">${sentence}</span><br><br>`;
                    rightView.appendChild(lineDiv);
                    lineElements.right.push(lineDiv);
                });
            } else {
                rightView.textContent = localeData[currentLocale].missing_content;
            }
        }
        
        // Apply current font settings
        applyFontSettings();
        
        // Set up scroll synchronization only for visible views
        setupScrollListeners();
        
        // Determine which panel we should use for scrolling first
        const scrollPanel = currentViews.original !== 'disable' ? 'left' : 
                           currentViews.first !== 'disable' ? 'middle' : 
                           currentViews.second !== 'disable' ? 'right' : null;
                           
        if (!scrollPanel) {
            console.error('No visible panels to scroll');
            return resolve();
        }
        
        // Update layout before trying to restore scroll position
        updateViewVisibility(false); // Pass false to prevent scroll restoration in updateViewVisibility
        
        // After content and layout are updated, restore position if needed
        try {
            // Get the latest navigation state
            const storedNavState = JSON.parse(localStorage.getItem('navigationState')) || savedNavState;
            
            // Update in-memory copy
            savedNavState = storedNavState;
            
            // Check if we should restore the position or start from line 1
            // Force position restoration if we're reloading the page
            const shouldRestorePosition = (!resetScroll && 
                Number(bookIndex) === storedNavState.book && 
                Number(chapterIndex) === storedNavState.chapter) || 
                window.forcePositionRestore === true;
                
            // Clear the force restore flag
            window.forcePositionRestore = false;
                

            
            // Once the DOM is fully rendered, restore the position
            const lineToScrollTo = shouldRestorePosition 
                ? Math.min(Math.max(1, storedNavState.phraseNumber), lineElements[scrollPanel].length)
                : 1;
            
            // Simple direct scroll with a single animation frame
            requestAnimationFrame(() => {
                // Scroll to line and synchronize panels
                scrollPanelToLine(scrollPanel, lineToScrollTo);
                synchronizeScrolling(scrollPanel);
                
                
                // Trigger event for notes display
                document.dispatchEvent(new CustomEvent('versesRendered'));
                
                resolve();
            });
        } catch (e) {
            console.error('Error restoring scroll position:', e);
            
            // Fallback to line 1
            requestAnimationFrame(() => {
                scrollPanelToLine(scrollPanel, 1);
                synchronizeScrolling(scrollPanel);
                
                
                document.dispatchEvent(new CustomEvent('versesRendered'));
                resolve();
            });
        }
    });
}

