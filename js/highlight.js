// Highlighting utilities: non-intrusive whole-word and whole-verse highlights
// Exposes global functions: highlightWord(verse_index, word_index, lang),
// highlightVerse(verse_index, lang), dehighlightAll()

(function(){
	const WORD_CLASS = 'jaya-word-highlight';
	const VERSE_STYLE_PREFIX = 'jaya-verse-highlight-';
	const WORD_STYLE_ID = 'jaya-word-highlight-style';

	// Keep track of created style elements and wrapped nodes so we can undo
	const createdStyleIds = new Set();

	function ensureWordStyle() {
		if (document.getElementById(WORD_STYLE_ID)) return;
		const s = document.createElement('style');
		s.id = WORD_STYLE_ID;
		s.textContent = `.${WORD_CLASS} { background: rgba(56,161,255,0.18) !important; border-radius: 3px; padding: 0 2px; }`;
		document.head.appendChild(s);
	}

	function dehighlightAll() {
		// remove verse styles
		for (const id of Array.from(createdStyleIds)) {
			const el = document.getElementById(id);
			if (el) el.remove();
			createdStyleIds.delete(id);
		}
		// remove any wrapped word spans we created
		const nodes = Array.from(document.querySelectorAll('.' + WORD_CLASS));
		for (const sp of nodes) {
			try {
				const txt = document.createTextNode(sp.textContent || '');
				sp.parentNode.replaceChild(txt, sp);
			} catch (e) { /* ignore */ }
		}
	}

	// highlight entire verse text element for given verse index and language
	function highlightVerse(verse_index, lang) {
		try {
			const safeLang = String(lang || '').replace(/"/g,'');
			const id = VERSE_STYLE_PREFIX + String(verse_index) + '-' + safeLang;
			// Avoid creating duplicate style elements for the same verse+lang
			if (document.getElementById(id)) return;
			// create style rule that targets the verse-text span for that language
			const style = document.createElement('style');
			style.id = id;
			// Build selector: if requesting 'sa' match both 'sa' and 'sa-Latn' (lang starts with sa).
			let selectorLang;
			if (safeLang === 'sa') {
				selectorLang = '[lang^="sa"]';
			} else {
				selectorLang = `[lang="${safeLang}"]`;
			}
			// apply a subtle background similar to gotToBookChapterVerse
			// Prefer highlighting the specific language span; if that span isn't present
			// (because rendering mode hid it) fall back to highlighting the whole line-entry
			let cssSelector = `.line-entry[data-verse="${verse_index}"] .verse-text${selectorLang}`;
			if (!document.querySelector(cssSelector)) {
				cssSelector = `.line-entry[data-verse="${verse_index}"]`;
			}
			style.textContent = `${cssSelector} { background: rgba(56,161,255,0.12) !important; transition: background 0.4s ease; }`;
			document.head.appendChild(style);
			createdStyleIds.add(id);
		} catch (e) { console.error('highlightVerse error', e); }
	}

	// highlight a specific whole word inside a verse for given language
	// verse_index: number or string; word_index: 1-based index; lang: language code like 'sa','sa-Latn','en','pl'
	function highlightWord(verse_index, word_index, lang) {
		try {
			ensureWordStyle();
			const panels = ['text-panel-horizontal', 'text-panel-vertical'];
			const targetWordIndex = Number(word_index);
			if (!targetWordIndex || targetWordIndex < 1) return;
			const safeLang = String(lang || '');

			for (const pid of panels) {
				const panel = document.getElementById(pid);
				if (!panel) continue;
				const verseEl = panel.querySelector(`.line-entry[data-verse="${verse_index}"]`);
				if (!verseEl) continue;
				const span = verseEl.querySelector(`.verse-text[lang="${safeLang}"]`);
				if (!span) continue;

				// Walk text nodes to find the Nth word (words separated by \S+ as in clicks.js)
				const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT, null, false);
				let node;
				let wordCounter = 0;
				while ((node = walker.nextNode())) {
					const text = node.textContent || '';
					// Skip text nodes already inside our highlight wrapper to avoid double-wrapping
					if (node.parentNode && node.parentNode.classList && node.parentNode.classList.contains(WORD_CLASS)) continue;
					let offset = 0;
					while (true) {
						const m = text.substring(offset).match(/\S+/);
						if (!m) break;
						const word = m[0];
						const idxInNode = offset + m.index;
						wordCounter += 1;
						if (wordCounter === targetWordIndex) {
							// Found the word inside this text node at idxInNode
							// Split the text node into three parts: before, word, after
							const before = node;
							const after = before.splitText(idxInNode);
							const rest = after.splitText(word.length);
							// create span wrapper
							const wrap = document.createElement('span');
							wrap.className = WORD_CLASS;
							wrap.textContent = after.textContent;
							// Replace the text node 'after' with our span
							after.parentNode.replaceChild(wrap, after);
							// We only highlighted inside this panel's verse; continue to next panel
							break;
						}
						offset = idxInNode + word.length;
					}
					if (wordCounter >= targetWordIndex) break;
				}
			}
		} catch (e) { console.error('highlightWord error', e); }
	}

	// Export to global
	window.highlightWord = highlightWord;
	window.highlightVerse = highlightVerse;
	window.dehighlightAll = dehighlightAll;

})();

