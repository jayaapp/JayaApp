/**
 * Word Formation Analyzer for detailed Sanskrit conjunct explanations
 * Provides component breakdown and pronunciation guidance
 */

class WordFormationAnalyzer {
    constructor() {
        this.setupMappings();
        this.setupCharacterDescriptions();
    }

    setupMappings() {
        // Consonant base mappings
        this.consonants = {
            'क': { iast: 'ka', group: 'velar', type: 'unaspirated', voice: 'unvoiced' },
            'ख': { iast: 'kha', group: 'velar', type: 'aspirated', voice: 'unvoiced' },
            'ग': { iast: 'ga', group: 'velar', type: 'unaspirated', voice: 'voiced' },
            'घ': { iast: 'gha', group: 'velar', type: 'aspirated', voice: 'voiced' },
            'ङ': { iast: 'ṅa', group: 'velar', type: 'nasal', voice: 'voiced' },
            'च': { iast: 'ca', group: 'palatal', type: 'unaspirated', voice: 'unvoiced' },
            'छ': { iast: 'cha', group: 'palatal', type: 'aspirated', voice: 'unvoiced' },
            'ज': { iast: 'ja', group: 'palatal', type: 'unaspirated', voice: 'voiced' },
            'झ': { iast: 'jha', group: 'palatal', type: 'aspirated', voice: 'voiced' },
            'ञ': { iast: 'ña', group: 'palatal', type: 'nasal', voice: 'voiced' },
            'ट': { iast: 'ṭa', group: 'retroflex', type: 'unaspirated', voice: 'unvoiced' },
            'ठ': { iast: 'ṭha', group: 'retroflex', type: 'aspirated', voice: 'unvoiced' },
            'ड': { iast: 'ḍa', group: 'retroflex', type: 'unaspirated', voice: 'voiced' },
            'ढ': { iast: 'ḍha', group: 'retroflex', type: 'aspirated', voice: 'voiced' },
            'ण': { iast: 'ṇa', group: 'retroflex', type: 'nasal', voice: 'voiced' },
            'त': { iast: 'ta', group: 'dental', type: 'unaspirated', voice: 'unvoiced' },
            'थ': { iast: 'tha', group: 'dental', type: 'aspirated', voice: 'unvoiced' },
            'द': { iast: 'da', group: 'dental', type: 'unaspirated', voice: 'voiced' },
            'ध': { iast: 'dha', group: 'dental', type: 'aspirated', voice: 'voiced' },
            'न': { iast: 'na', group: 'dental', type: 'nasal', voice: 'voiced' },
            'प': { iast: 'pa', group: 'labial', type: 'unaspirated', voice: 'unvoiced' },
            'फ': { iast: 'pha', group: 'labial', type: 'aspirated', voice: 'unvoiced' },
            'ब': { iast: 'ba', group: 'labial', type: 'unaspirated', voice: 'voiced' },
            'भ': { iast: 'bha', group: 'labial', type: 'aspirated', voice: 'voiced' },
            'म': { iast: 'ma', group: 'labial', type: 'nasal', voice: 'voiced' },
            'य': { iast: 'ya', group: 'semivowel', type: 'palatal', voice: 'voiced' },
            'र': { iast: 'ra', group: 'liquid', type: 'retroflex', voice: 'voiced' },
            'ल': { iast: 'la', group: 'liquid', type: 'dental', voice: 'voiced' },
            'व': { iast: 'va', group: 'semivowel', type: 'labial', voice: 'voiced' },
            'श': { iast: 'śa', group: 'fricative', type: 'palatal', voice: 'unvoiced' },
            'ष': { iast: 'ṣa', group: 'fricative', type: 'retroflex', voice: 'unvoiced' },
            'स': { iast: 'sa', group: 'fricative', type: 'dental', voice: 'unvoiced' },
            'ह': { iast: 'ha', group: 'fricative', type: 'glottal', voice: 'voiced' }
        };

        // Special conjunct formations - expanded with common patterns
        this.specialConjuncts = {
            'क्ष': {
                components: ['क्', 'ष'],
                explanation: 'Special ligature: क् (k) + ष (ṣa) → क्ष (kṣa)',
                formation: 'The क् loses its inherent vowel and fuses with ष to form a unique character',
                pronunciation: 'Pronounce as a single unit: /kṣa/ - not /ka-ṣa/',
                usage: 'Common in words related to divine power, warriors (क्षत्रिय), and imperishable things (अक्षर)'
            },
            'ज्ञ': {
                components: ['ज्', 'ञ'],
                explanation: 'Special ligature: ज् (j) + ञ (ña) → ज्ञ (jña)',
                formation: 'The ज् combines with ञ to form a distinctive character representing knowledge',
                pronunciation: 'Pronounce as /jña/ - the ञ gives a palatal nasal quality',
                usage: 'Appears in words related to knowledge: ज्ञान (knowledge), विज्ञान (science)'
            },
            'त्र': {
                components: ['त्', 'र'],
                explanation: 'Conjunct: त् (t) + र (ra) → त्र (tra)',
                formation: 'त् suppresses its vowel and combines with र, often written as a ligature',
                pronunciation: 'Quick /t/ followed by rolled /ra/ - practice: त्र त्रि त्रु',
                usage: 'Very common in words like त्रि (three), मित्र (friend), शास्त्र (scripture)'
            },
            'श्र': {
                components: ['श्', 'र'],
                explanation: 'Conjunct: श् (ś) + र (ra) → श्र (śra)',
                formation: 'श् combines with र in a characteristic hook formation',
                pronunciation: 'Palatal /ś/ blends smoothly into /ra/ - practice: श्र श्रि श्रु',
                usage: 'Found in auspicious words: श्री (prosperity), श्रुति (hearing/Vedas)'
            },
            'द्व': {
                components: ['द्', 'व'],
                explanation: 'Conjunct: द् (d) + व (va) → द्व (dva)',
                formation: 'द् loses its inherent vowel and combines with व',
                pronunciation: 'Quick /d/ followed by /va/ - practice: द्व द्वि द्वु',
                usage: 'Common in words like द्वार (door), द्विज (twice-born)'
            },
            'स्व': {
                components: ['स्', 'व'],
                explanation: 'Conjunct: स् (s) + व (va) → स्व (sva)',
                formation: 'स् combines with व to form the self/own concept',
                pronunciation: 'Dental /s/ followed by /va/',
                usage: 'Found in words like स्वयं (self), स्वर (note/vowel)'
            }
        };
        
        // Enhanced character type mappings for detailed analysis
        this.characterTypes = {
            // Vowels
            'अ': 'vowel', 'आ': 'vowel', 'इ': 'vowel', 'ई': 'vowel', 'उ': 'vowel', 'ऊ': 'vowel',
            'ऋ': 'vowel', 'ॠ': 'vowel', 'ऌ': 'vowel', 'ए': 'vowel', 'ऐ': 'vowel', 'ओ': 'vowel', 'औ': 'vowel',
            
            // Vowel marks (matras)
            'ा': 'vowel_mark', 'ि': 'vowel_mark', 'ी': 'vowel_mark', 'ु': 'vowel_mark', 'ू': 'vowel_mark',
            'ृ': 'vowel_mark', 'ॄ': 'vowel_mark', 'ॢ': 'vowel_mark', 'े': 'vowel_mark', 'ै': 'vowel_mark',
            'ो': 'vowel_mark', 'ौ': 'vowel_mark',
            
            // Special marks
            '्': 'halant', 'ं': 'anusvara', 'ः': 'visarga', 'ँ': 'candrabindu'
        };
    }
    
    setupCharacterDescriptions() {
        // Vowel descriptions
        this.vowelDescriptions = {
            'अ': "Base vowel /a/ - inherent in consonants",
            'आ': "Long vowel /ā/ - twice the length of अ", 
            'इ': "Short vowel /i/ - as in 'bit'",
            'ई': "Long vowel /ī/ - as in 'see'",
            'उ': "Short vowel /u/ - as in 'put'",
            'ऊ': "Long vowel /ū/ - as in 'boot'",
            'ऋ': "Vocalic /ṛ/ - vowel-like 'r' sound",
            'ए': "Long vowel /e/ - as in 'hey'",
            'ऐ': "Diphthong /ai/ - as in 'kite'",
            'ओ': "Long vowel /o/ - as in 'go'", 
            'औ': "Diphthong /au/ - as in 'cow'"
        };
        
        // Vowel mark descriptions
        this.vowelMarkDescriptions = {
            'ा': "Lengthens to /ā/ - extends inherent 'a'",
            'ि': "Changes to /i/ - short 'i' sound",
            'ी': "Changes to /ī/ - long 'i' sound", 
            'ु': "Changes to /u/ - short 'u' sound",
            'ू': "Changes to /ū/ - long 'u' sound",
            'ृ': "Changes to /ṛ/ - vocalic 'r'",
            'ॄ': "Changes to /ṝ/ - long vocalic 'r'",
            'ॢ': "Changes to /ḷ/ - vocalic 'l'",
            'े': "Changes to /e/ - long 'e' sound",
            'ै': "Changes to /ai/ - diphthong",
            'ो': "Changes to /o/ - long 'o' sound",
            'ौ': "Changes to /au/ - diphthong"
        };
        
        // Special mark descriptions
        this.specialMarkDescriptions = {
            '्': "Removes inherent 'a' - forms consonant clusters",
            'ं': "Adds nasal quality - anusvara",
            'ः': "Echo-like aspiration - visarga",
            'ँ': "Nasal quality marker - candrabindu"
        };
        
        // Consonant group descriptions
        this.consonantGroupDescriptions = {
            'क': "Velar (क-वर्ग), Unaspirated, Unvoiced",
            'ख': "Velar (क-वर्ग), Aspirated, Unvoiced", 
            'ग': "Velar (क-वर्ग), Unaspirated, Voiced",
            'घ': "Velar (क-वर्ग), Aspirated, Voiced",
            'ङ': "Velar (क-वर्ग), Nasal",
            'च': "Palatal (च-वर्ग), Unaspirated, Unvoiced",
            'छ': "Palatal (च-वर्ग), Aspirated, Unvoiced",
            'ज': "Palatal (च-वर्ग), Unaspirated, Voiced",
            'झ': "Palatal (च-वर्ग), Aspirated, Voiced",
            'ञ': "Palatal (च-वर्ग), Nasal",
            'ट': "Retroflex (ट-वर्ग), Unaspirated, Unvoiced",
            'ठ': "Retroflex (ट-वर्ग), Aspirated, Unvoiced",
            'ड': "Retroflex (ट-वर्ग), Unaspirated, Voiced",
            'ढ': "Retroflex (ट-वर्ग), Aspirated, Voiced",
            'ण': "Retroflex (ट-वर्ग), Nasal",
            'त': "Dental (त-वर्ग), Unaspirated, Unvoiced",
            'थ': "Dental (त-वर्ग), Aspirated, Unvoiced",
            'द': "Dental (त-वर्ग), Unaspirated, Voiced",
            'ध': "Dental (त-वर्ग), Aspirated, Voiced",
            'न': "Dental (त-वर्ग), Nasal",
            'प': "Labial (प-वर्ग), Unaspirated, Unvoiced",
            'फ': "Labial (प-वर्ग), Aspirated, Unvoiced",
            'ब': "Labial (प-वर्ग), Unaspirated, Voiced",
            'भ': "Labial (प-वर्ग), Aspirated, Voiced",
            'म': "Labial (प-वर्ग), Nasal",
            'य': "Semivowel (Palatal)",
            'र': "Liquid (Retroflex)",
            'ल': "Liquid (Dental)",
            'व': "Semivowel (Labial)",
            'श': "Fricative (Palatal)",
            'ष': "Fricative (Retroflex)",
            'स': "Fricative (Dental)",
            'ह': "Fricative (Glottal)"
        };
    }

    analyzeConjunct(devanagari, iast) {
        // Check if it's a special conjunct first
        if (this.specialConjuncts[devanagari]) {
            const analysis = {...this.specialConjuncts[devanagari]}; // Create copy to avoid mutation
            analysis.characterBreakdown = this.getDetailedCharacterBreakdown(devanagari, iast);
            return analysis;
        }

        // For regular conjuncts, parse the components
        const analysis = this.parseRegularConjunct(devanagari, iast);
        analysis.characterBreakdown = this.getDetailedCharacterBreakdown(devanagari, iast);
        return analysis;
    }

    parseRegularConjunct(devanagari, iast) {
        const analysis = {
            components: [],
            explanation: '',
            formation: '',
            pronunciation: '',
            usage: ''
        };

        // Split into individual characters for analysis
        const chars = [...devanagari];
        let i = 0;
        const componentDetails = [];

        while (i < chars.length) {
            const char = chars[i];
            
            if (char === '्') {
                // Halant - suppresses vowel
                if (componentDetails.length > 0) {
                    componentDetails[componentDetails.length - 1].hasHalant = true;
                }
                i++;
            } else if (this.consonants[char]) {
                const consonantInfo = this.consonants[char];
                componentDetails.push({
                    char: char,
                    info: consonantInfo,
                    hasHalant: false
                });
                i++;
            } else {
                // Skip vowel marks and other characters for now
                i++;
            }
        }

        // Build component explanation
        for (let j = 0; j < componentDetails.length; j++) {
            const comp = componentDetails[j];
            const baseSound = comp.info.iast.slice(0, -1); // Remove 'a'
            
            if (j === componentDetails.length - 1) {
                // Last component keeps its vowel (unless explicitly suppressed)
                analysis.components.push(`${comp.char} (${comp.info.iast})`);
            } else {
                // Earlier components lose their 'a' vowel
                analysis.components.push(`${comp.char}् (${baseSound})`);
            }
        }

        // Generate explanation
        if (componentDetails.length >= 2) {
            const first = componentDetails[0];
            const last = componentDetails[componentDetails.length - 1];
            
            analysis.explanation = `Conjunct consonant: ${componentDetails.map(c => c.char + (c !== last ? '्' : '')).join('')} = ${devanagari} (${iast})`;
            
            analysis.formation = `The first consonant${componentDetails.length > 2 ? 's' : ''} ${componentDetails.slice(0, -1).map(c => c.char).join(', ')} lose${componentDetails.length === 2 ? 's' : ''} the inherent 'a' vowel and combine${componentDetails.length > 2 ? '' : 's'} with ${last.char}`;
            
            // Pronunciation guide
            const consonantSounds = componentDetails.map((c, idx) => {
                if (idx === componentDetails.length - 1) {
                    return c.info.iast;
                } else {
                    return c.info.iast.slice(0, -1);
                }
            }).join(' + ');
            
            analysis.pronunciation = `Pronounce as: ${consonantSounds} → /${iast}/. Practice: ${iast}, ${iast.slice(0, -1)}i, ${iast.slice(0, -1)}u`;
            
            // Usage patterns
            if (componentDetails.some(c => c.info.type === 'nasal')) {
                analysis.usage = 'Nasal conjuncts often appear in compound words and Sanskrit grammar';
            } else if (componentDetails.some(c => c.info.group === 'liquid' || c.info.group === 'semivowel')) {
                analysis.usage = 'Liquid/semivowel conjuncts are common in root words and derivatives';
            } else {
                analysis.usage = 'Consonant cluster following standard Sanskrit phonological rules';
            }
        }

        return analysis;
    }

    getPhoneticDescription(consonant) {
        if (!this.consonants[consonant]) return '';
        
        const info = this.consonants[consonant];
        return `${info.group} ${info.type} ${info.voice}`;
    }

    getPronunciationTips(iast) {
        const tips = [];
        
        // Check for difficult sound combinations
        if (iast.includes('kṣ')) {
            tips.push('क्ष: Pronounce as a single unit /kṣa/, not /ka-ṣa/');
        }
        if (iast.includes('jñ')) {
            tips.push('ज्ञ: The ञ adds nasal quality - tongue touches soft palate');
        }
        if (iast.includes('ṣṭ')) {
            tips.push('ष्ट: Both sounds are retroflex - curl tongue tip back');
        }
        if (iast.includes('sth')) {
            tips.push('स्थ: Quick /s/ followed by aspirated /tha/');
        }
        
        return tips;
    }
    
    getDetailedCharacterBreakdown(devanagari, iast) {
        const breakdown = [];
        const chars = [...devanagari];
        let currentGroup = {
            characters: [],
            groupType: 'simple',
            explanation: '',
            components: []
        };
        
        for (let i = 0; i < chars.length; i++) {
            const char = chars[i];
            const charAnalysis = this.analyzeCharacter(char, i, chars);
            
            // Add to current group
            currentGroup.characters.push(charAnalysis);
            
            // Determine if this ends a group
            if (this.isGroupEndCharacter(char, i, chars)) {
                this.finalizeGroup(currentGroup, devanagari, iast);
                breakdown.push(currentGroup);
                
                // Start new group if there are more characters
                if (i < chars.length - 1) {
                    currentGroup = {
                        characters: [],
                        groupType: 'simple', 
                        explanation: '',
                        components: []
                    };
                }
            }
        }
        
        // Add final group if it has characters
        if (currentGroup.characters.length > 0 && !breakdown.includes(currentGroup)) {
            this.finalizeGroup(currentGroup, devanagari, iast);
            breakdown.push(currentGroup);
        }
        
        return breakdown;
    }
    
    analyzeCharacter(char, position, context) {
        let charType = 'unknown';
        let iast = char;
        let description = 'Unknown character';
        
        // Determine character type and function
        if (char === '्') {
            charType = 'Halant';
            iast = '[halant]';
            description = this.specialMarkDescriptions[char];
        } else if (this.vowelMarkDescriptions[char]) {
            charType = 'Vowel Mark';
            const baseIast = this.getVowelMarkIast(char);
            iast = baseIast;
            description = this.vowelMarkDescriptions[char];
        } else if (this.specialMarkDescriptions[char]) {
            charType = 'Special Mark';
            iast = this.getSpecialMarkIast(char);
            description = this.specialMarkDescriptions[char];
        } else if (this.consonants[char]) {
            charType = 'Consonant';
            const consonantData = this.consonants[char];
            const consonantIast = consonantData.iast;
            
            // Check if followed by halant
            if (position + 1 < context.length && context[position + 1] === '्') {
                iast = consonantIast.slice(0, -1); // Remove 'a'
                description = `Base consonant '${consonantIast.slice(0, -1)}' (${this.consonantGroupDescriptions[char]})`;
            } else {
                iast = consonantIast;
                description = `Base consonant with 'a' (${this.consonantGroupDescriptions[char]})`;
            }
        }
        
        return {
            char: char,
            iast: iast,
            type: charType,
            function: description
        };
    }
    
    getVowelMarkIast(mark) {
        const mapping = {
            'ा': 'ā', 'ि': 'i', 'ी': 'ī', 'ु': 'u', 'ू': 'ū',
            'ृ': 'ṛ', 'ॄ': 'ṝ', 'ॢ': 'ḷ', 'े': 'e', 'ै': 'ai',
            'ो': 'o', 'ौ': 'au'
        };
        return mapping[mark] || mark;
    }
    
    getSpecialMarkIast(mark) {
        const mapping = {
            '्': '[halant]', 'ं': 'ṃ', 'ः': 'ḥ', 'ँ': '̃'
        };
        return mapping[mark] || mark;
    }
    
    isGroupEndCharacter(char, position, context) {
        // For conjuncts, we always have one logical group
        return position === context.length - 1;
    }
    
    finalizeGroup(group, devanagari, iast) {
        // Determine group type
        const hasHalant = group.characters.some(c => c.char === '्');
        const hasMultipleConsonants = group.characters.filter(c => c.type === 'Consonant').length > 1;
        
        if (hasHalant && hasMultipleConsonants) {
            group.groupType = 'conjunct';
            group.explanation = 'Consonant cluster formed by halant';
        } else if (group.characters.length > 1) {
            group.groupType = 'modified';
            group.explanation = 'Consonant with modifiers';
        } else {
            group.groupType = 'simple';
            group.explanation = 'Single character';
        }
        
        // Build component list
        for (const charAnalysis of group.characters) {
            let displayChar = charAnalysis.char;
            
            // Add circle for dependent marks
            if (['्', 'ा', 'ि', 'ी', 'ु', 'ू', 'ृ', 'े', 'ै', 'ो', 'ौ', 'ं', 'ः', 'ँ'].includes(charAnalysis.char)) {
                displayChar = `◌${charAnalysis.char}`;
            }
            
            group.components.push(`${displayChar} (${charAnalysis.iast}) - ${charAnalysis.function}`);
        }
    }

    /**
     * Extract conjuncts from Devanagari text - enhanced algorithm
     */
    extractConjunctsFromText(devanagariText, iastText) {
        const conjuncts = [];
        if (!devanagariText) return conjuncts;

        const chars = [...devanagariText];
        let i = 0;

        while (i < chars.length) {
            const currentChar = chars[i];

            // Check for special conjuncts first (multi-character)
            let foundSpecial = false;
            for (const specialConjunct in this.specialConjuncts) {
                if (devanagariText.startsWith(specialConjunct, i)) {
                    const iastEquivalent = this.getIastForConjunct(specialConjunct, iastText, i);
                    conjuncts.push({
                        deva: specialConjunct,
                        iast: iastEquivalent,
                        position: i
                    });
                    i += specialConjunct.length;
                    foundSpecial = true;
                    break;
                }
            }
            if (foundSpecial) continue;

            // Check for consonant + halant + consonant pattern
            if (this.consonants[currentChar] && i + 1 < chars.length && chars[i + 1] === '्') {
                let conjunctText = currentChar + '्';
                let j = i + 2;

                // Collect all consecutive consonants joined by halants
                while (j < chars.length && this.consonants[chars[j]]) {
                    conjunctText += chars[j];

                    // Check if there's another halant after this consonant
                    if (j + 1 < chars.length && chars[j + 1] === '्') {
                        conjunctText += '्';
                        j += 2;
                    } else {
                        j++;
                        break;
                    }
                }

                // Only add if we have at least consonant + halant + consonant
                if (conjunctText.length >= 3 && conjunctText.includes('्')) {
                    const iastEquivalent = this.getIastForConjunct(conjunctText, iastText, i);
                    conjuncts.push({
                        deva: conjunctText,
                        iast: iastEquivalent,
                        position: i
                    });
                }

                i = j;
            } else {
                i++;
            }
        }

        return conjuncts;
    }

    /**
     * Helper to extract corresponding IAST for a conjunct
     */
    getIastForConjunct(devaConjunct, iastText, position) {
        // For special conjuncts, we have mappings
        const specialMappings = {
            'क्ष': 'kṣa',
            'ज्ञ': 'jña',
            'त्र': 'tra',
            'श्र': 'śra',
            'द्व': 'dva',
            'स्व': 'sva'
        };

        if (specialMappings[devaConjunct]) {
            return specialMappings[devaConjunct];
        }

        // For regular conjuncts, try to extract from IAST text
        // This is a simplified approach - in a more sophisticated system,
        // we'd align the Devanagari and IAST more precisely
        const chars = [...devaConjunct];
        let result = '';

        for (let i = 0; i < chars.length; i++) {
            const char = chars[i];
            if (char === '्') continue;

            if (this.consonants[char]) {
                const consonantIast = this.consonants[char].iast;
                // If this consonant is followed by halant, remove the 'a'
                if (i + 1 < chars.length && chars[i + 1] === '्') {
                    result += consonantIast.slice(0, -1);
                } else {
                    result += consonantIast;
                }
            }
        }

        return result || devaConjunct;
    }

    /**
     * Analyze word formation - character by character breakdown with conjunct integration
     */
    analyzeWordFormation(devanagariText, iastText) {
        const breakdown = [];
        const chars = [...devanagariText];
        const conjuncts = this.extractConjunctsFromText(devanagariText, iastText);
        let step = 1;
        let i = 0;

        while (i < chars.length) {
            const currentChar = chars[i];

            // Check if we're starting a conjunct at this position
            const conjunctAtPosition = conjuncts.find(c => c.position === i);

            if (conjunctAtPosition) {
                // Add the conjunct as a main step
                const conjunctAnalysis = this.analyzeConjunct(conjunctAtPosition.deva, conjunctAtPosition.iast);
                breakdown.push({
                    step: step++,
                    char: conjunctAtPosition.deva,
                    explanation: `${conjunctAtPosition.deva} (${conjunctAtPosition.iast}) - ${conjunctAnalysis.explanation}`,
                    type: 'conjunct',
                    isConjunct: true
                });

                // Add sub-steps for the individual components
                const conjunctChars = [...conjunctAtPosition.deva];
                let subStep = 1;
                for (let j = 0; j < conjunctChars.length; j++) {
                    const subChar = conjunctChars[j];
                    let subExplanation = '';

                    if (subChar === '्') {
                        subExplanation = `Halant (्) - suppresses the inherent 'a' vowel of the previous consonant`;
                    } else if (this.consonants[subChar]) {
                        const consonantInfo = this.consonants[subChar];
                        const nextIsHalant = j + 1 < conjunctChars.length && conjunctChars[j + 1] === '्';

                        if (nextIsHalant) {
                            subExplanation = `${subChar} (${consonantInfo.iast.slice(0, -1)}) - ${this.consonantGroupDescriptions[subChar]}, loses inherent 'a'`;
                        } else {
                            subExplanation = `${subChar} (${consonantInfo.iast}) - ${this.consonantGroupDescriptions[subChar]}`;
                        }
                    }

                    breakdown.push({
                        step: `${step - 1}.${subStep++}`,
                        char: subChar,
                        explanation: subExplanation,
                        type: 'conjunct_component',
                        isSubStep: true
                    });
                }

                // Skip ahead past the conjunct
                i += conjunctAtPosition.deva.length;
                continue;
            }

            // Regular character processing
            let explanation = '';
            let charDisplay = currentChar;
            let charType = 'regular';

            if (currentChar === '्') {
                explanation = `Halant (्) - suppresses the inherent 'a' vowel of the previous consonant`;
                charType = 'halant';
            } else if (this.consonants[currentChar]) {
                const consonantInfo = this.consonants[currentChar];
                explanation = `${currentChar} (${consonantInfo.iast}) - ${this.consonantGroupDescriptions[currentChar]}`;
                charType = 'consonant';
            } else if (this.characterTypes[currentChar] === 'vowel_mark') {
                const vowelDesc = this.vowelMarkDescriptions[currentChar] || 'vowel mark';
                explanation = `${currentChar} - ${vowelDesc}`;
                charType = 'vowel_mark';
            } else if (this.characterTypes[currentChar] === 'anusvara') {
                explanation = `${currentChar} (anusvara) - adds nasal quality to the preceding vowel`;
                charType = 'anusvara';
            } else if (this.characterTypes[currentChar] === 'visarga') {
                explanation = `${currentChar} (visarga) - adds echo-like aspiration at the end`;
                charType = 'visarga';
            } else if (this.characterTypes[currentChar] === 'candrabindu') {
                explanation = `${currentChar} (candrabindu) - nasal quality marker`;
                charType = 'candrabindu';
            } else {
                // Independent vowels or other characters
                const vowelDesc = this.vowelDescriptions[currentChar] || 'character';
                explanation = `${currentChar} - ${vowelDesc}`;
                charType = 'vowel';
            }

            breakdown.push({
                step: step++,
                char: charDisplay,
                explanation: explanation,
                type: charType,
                isConjunct: false,
                isSubStep: false
            });
            i++;
        }

        return breakdown;
    }

    /**
     * Format word formation breakdown for display
     */
    formatWordFormationBreakdown(devanagariText, iastText) {
        let wordBreakdown = this.analyzeWordFormation(devanagariText, iastText);

        let html = `<div class="word-formation">`;
        html += `<h4>Word Formation</h4>`;
        html += `<div class="formation-steps">`;

        wordBreakdown.forEach(step => {
            const stepClass = step.isSubStep ? 'formation-substep' : 'formation-step';
            const indentClass = step.isSubStep ? ' substep-indent' : '';

            // Remove redundant Devanagari character from explanation if it starts with the same character
            let cleanExplanation = step.explanation;
            if (cleanExplanation.startsWith(step.char + ' ')) {
                cleanExplanation = cleanExplanation.slice(step.char.length + 1);
            } else if (cleanExplanation.startsWith(step.char)) {
                cleanExplanation = cleanExplanation.slice(step.char.length);
            }

            html += `<div class="${stepClass}${indentClass}">`;
            html += `<span class="step-number">${step.step}.</span> `;
            html += `<span class="step-char"><strong>${step.char}</strong></span> `;
            html += `<span class="step-explanation">${cleanExplanation}</span>`;
            html += `</div>`;
        });

        html += `</div>`;
        html += `</div>`;

        return html;
    }
}

class LexiconManager {
    constructor() {
        this.lexiconData = {};
        this.uniqueWords = window.uniqueWords || {};
        this.wordOccurrences = window.wordsOccurrences || {};
        this.currentWord = null;
        this.currentCount = 0;
        this.currentOccurrences = [];
        this.iastToDevanagariMap = {};
        this.initLexiconData();
    }
    
    initLexiconData() {
        // Convert array to object keyed by IAST word for fast lookup
        if (window.lexiconData && Array.isArray(window.lexiconData)) {
            for (const entry of window.lexiconData) {
                if (entry.word) {
                    this.lexiconData[entry.word] = entry;
                }
            }
        }
        this.createIeastToDevanagariMap();
    }

    createIeastToDevanagariMap() {
        // uniqueWords structure: { "devanagariWord": { "iast": "iastWord", "count": number } }
        this.iastToDevanagariMap = {};
        for (const devaWord in this.uniqueWords) {
            const wordData = this.uniqueWords[devaWord];
            if (wordData && wordData.iast) {
                this.iastToDevanagariMap[wordData.iast] = devaWord;
            }
        }
    }

    renderLexiconEntry(devanagariWord, iastWord) {
        if (!devanagariWord && !iastWord) {
            return `<div class="lexicon-entry"><em>No word provided for lexicon lookup.</em></div>`;
        }
        
        // Determine IAST key for lexicon lookup and track current word
        this.currentWord = devanagariWord || null;
        
        if (!iastWord && this.uniqueWords[devanagariWord]) {
            iastWord = this.uniqueWords[devanagariWord].iast;
            this.currentCount = this.uniqueWords[devanagariWord].count || 0;
            this.currentWord = devanagariWord;
        } else if (iastWord && !devanagariWord) {
            // Try to find occurrence count from IAST
            devanagariWord = this.iastToDevanagariMap[iastWord];
            if (devanagariWord && this.uniqueWords[devanagariWord]) {
                this.currentCount = this.uniqueWords[devanagariWord].count || 0;
                this.currentWord = devanagariWord;
            }
        }
        
        // Get occurrences list for this word
        if (this.currentWord && this.wordOccurrences[this.currentWord]) {
            this.currentOccurrences = this.wordOccurrences[this.currentWord];
        } else {
            this.currentOccurrences = [];
        }

        const entry = this.lexiconData[iastWord];


        let html = `<div class="lexicon-entry">`;
        html += `<div class="lexicon-word"><strong>${devanagariWord} - ${iastWord}</strong></div>`;
        if (entry)
        {
            html += `<div class="lexicon-meaning">${entry.meaning}</div>`;
            if (entry.roots && entry.roots.length > 0) {
                html += `<div class="lexicon-roots"><em>Roots:</em> ${entry.roots.join(', ')}</div>`;
            }
            if (entry.partOfSpeech) {
                html += `<div class="lexicon-grammar"><em>${entry.partOfSpeech}</em>`;
                if (entry.grammaticalAnalysis) {
                    html += ` — ${entry.grammaticalAnalysis}`;
                }
                html += `</div>`;
            }
            if (entry.compoundStructure) {
                html += `<div class="lexicon-compound"><em>Structure:</em> ${entry.compoundStructure}</div>`;
            }
        }
        else {
            html += `<div class="lexicon-meaning"><em>No lexicon entry found.</em></div>`;
        }
        html += `</div>`;
        return html;
    }

    localizedOrccurrenceText(count) {
        const appLang = localStorage.getItem('appLang') || 'English';
        if (appLang === 'English') {
            return count === 1 ? 'occurrence' : 'occurrences';
        }
        else if (appLang === 'Polski') {
            const set = new Set(['2','3','4']);
            if (count === 1) return 'wystąpienie';
            // check the last digit is in the set and not in the teens
            else if (set.has(String(count).slice(-1)) &&
                   !(count % 100 >= 12 && count % 100 <= 14)) return 'wystąpienia';
            else return 'wystąpień';
        }
    }

    renderLexionFooter(book, chapter, verse) {
        if (!this.currentCount || this.currentCount === 0) {
            return '';
        }
        
        let html = `<div class="lexicon-footer">`;
        const occurencesText = this.localizedOrccurrenceText(this.currentCount);
        html += `<div class="occurrence-count">${this.currentCount} ${occurencesText}</div>`;
        html += `<div class="occurrence-location">`;
        
        // Create dropdown with all occurrences
        if (this.currentOccurrences && this.currentOccurrences.length > 0) {
            html += `<select class="location-dropdown" id="word-occurrence-select">`;
            
            // Add options for each occurrence
            for (let i = 0; i < this.currentOccurrences.length; i++) {
                const occ = this.currentOccurrences[i];
                // Format: [book, chapter, verse] or [book, chapter, verse, wordIndex]
                const occBook = occ[0];
                const occChapter = occ[1];
                const occVerse = occ[2] + 1; // Convert to 1-based index
                
                // Check if this is the current location
                const isCurrentLocation = (occBook == book && occChapter == chapter && occVerse == verse);

                let BookString = `Book ${occBook}`;
                let ChapterString = `Chapter ${occChapter}`;
                let VerseString = `Verse ${occVerse}`;
                if (window.getLocale && typeof window.getLocale === 'function') {
                    BookString = window.getLocale('book') + ` ${occBook}`;
                    ChapterString = window.getLocale('chapter') + ` ${occChapter}`;
                    VerseString = window.getLocale('verse') + ` ${occVerse}`;
                }

                const optionText = `${BookString}, ${ChapterString}, ${VerseString}`;
                html += `<option value="${i}" ${isCurrentLocation ? 'selected' : ''}>${optionText}</option>`;
            }
            
            html += `</select>`;
        } else {
            // Fallback to static text if no occurrences data
            html += `<span class="location-text">Book ${book}, Ch. ${chapter}, Verse ${verse}</span>`;
        }
        
        html += `</div>`;
        html += `</div>`;
        return html;
    }
}

class WordInfoPanel {
    constructor() {
        this.lexiconManager = new LexiconManager();
        this.wordAnalyzer = new  WordFormationAnalyzer();
    }

    showPanelAt(devanagariWord, iastWord, click_point, book, chapter, verse) {
        // Remove existing panel if any
        this.closePanel();
        
        // Create panel element
        const panel = document.createElement('div');
        panel.id = 'word-info-panel';
        panel.className = 'word-info-panel';
        
        // Build content
        let content = '';
        
        // 1. Lexicon entry
        const lexiconHtml = this.lexiconManager.renderLexiconEntry(devanagariWord, iastWord);
        if (lexiconHtml) {
            content += lexiconHtml;
        }
        
        // 2. Word formation analysis (only for Devanagari)
        if (devanagariWord || this.lexiconManager.currentWord) {
            devanagariWord = devanagariWord || this.lexiconManager.currentWord;
            const wordAnalysis = this.wordAnalyzer.formatWordFormationBreakdown(devanagariWord, iastWord);
            if (wordAnalysis) {
                content += wordAnalysis;
            }
        }
        
        // 3. Footer with occurrences
        const footerHtml = this.lexiconManager.renderLexionFooter(book, chapter, verse);
        if (footerHtml) {
            content += footerHtml;
        }
        
        panel.innerHTML = content;
        document.body.appendChild(panel);
        
        // Position the panel first so it has proper dimensions for background
        this.positionPanel(panel, click_point);
        
        // Apply ornamented background if enabled
        if (window.ornamentedBackground && window.ornamentedBackground.isEnabled()) {
            panel.classList.add('ornamented-background');
            // Apply background using the same logic as text panels
            try {
                // Use setTimeout to ensure panel is rendered before applying background
                setTimeout(() => {
                    if (document.body.contains(panel)) {
                        window.ornamentedBackground.applyTiledBackground(panel);
                    }
                }, 50);
            } catch (e) {
                console.warn('Failed to apply ornamented background to word info panel:', e);
            }
        }
        
        // Setup event handlers for location dropdown
        this.setupLocationDropdownHandler(panel);
        
        // Setup close handlers
        this.setupCloseHandlers(panel);
    }
    
    setupLocationDropdownHandler(panel) {
        const dropdown = panel.querySelector('#word-occurrence-select');
        if (dropdown) {
            dropdown.addEventListener('change', (e) => {
                const selectedIndex = parseInt(e.target.value);
                const occurrences = this.lexiconManager.currentOccurrences;
                
                if (occurrences && occurrences[selectedIndex]) {
                    const occ = occurrences[selectedIndex];
                    const targetBook = occ[0];
                    const targetChapter = occ[1];
                    const targetVerse = occ[2] + 1; // Convert to 1-based index
                    
                    // Close the panel
                    this.closePanel();
                    
                    // Navigate to the selected location
                    if (gotToBookChapterVerse && typeof gotToBookChapterVerse === 'function') {
                        gotToBookChapterVerse(targetBook, targetChapter, targetVerse);
                    }
                }
            });
        }
    }
    
    positionPanel(panel, click_point) {
        // Get panel dimensions
        const panelRect = panel.getBoundingClientRect();
        const panelWidth = panelRect.width;
        const panelHeight = panelRect.height;
        
        // Get viewport dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Determine if we're in horizontal (landscape) or vertical (portrait) mode
        const isHorizontal = !window.matchMedia('(orientation: portrait)').matches;
        
        // Try to get text panel bounds to constrain within
        const textPanel = document.querySelector(isHorizontal ? '.left-panel' : '.top-panel');
        const textPanelRect = textPanel ? textPanel.getBoundingClientRect() : null;
        
        // Calculate horizontal position (centered on click point)
        let left = click_point.x - (panelWidth / 2);
        
        // Constrain horizontally within viewport or text panel
        const minLeft = textPanelRect ? textPanelRect.left + 10 : 10;
        const maxLeft = (textPanelRect ? textPanelRect.right : viewportWidth) - panelWidth - 10;
        left = Math.max(minLeft, Math.min(left, maxLeft));
        
        // Calculate vertical position (prefer below, fallback to above)
        let top = click_point.y + 10; // 10px below click point
        
        // Check if it fits below
        if (top + panelHeight > viewportHeight - 10) {
            // Try above instead
            top = click_point.y - panelHeight - 10;
            
            // If still doesn't fit, position at bottom of viewport
            if (top < 10) {
                top = viewportHeight - panelHeight - 10;
            }
        }
        
        panel.style.left = `${left}px`;
        panel.style.top = `${top}px`;
    }
    
    setupCloseHandlers(panel) {
        // Close on ESC key
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.closePanel();
            }
        };
        document.addEventListener('keydown', escHandler);
        panel._escHandler = escHandler;
        
        // Close on click outside
        const clickHandler = (e) => {
            if (!panel.contains(e.target)) {
                this.closePanel();
            }
        };
        // Use setTimeout to avoid immediate closure from the same click that opened it
        setTimeout(() => {
            document.addEventListener('click', clickHandler);
            panel._clickHandler = clickHandler;
        }, 100);
    }
    
    closePanel() {
        const panel = document.getElementById('word-info-panel');
        if (panel) {
            // Remove event listeners
            if (panel._escHandler) {
                document.removeEventListener('keydown', panel._escHandler);
            }
            if (panel._clickHandler) {
                document.removeEventListener('click', panel._clickHandler);
            }
            panel.remove();
        }
    }
}

function initWordInfoPanel() {
    // Initialization logic if needed
    window.wordInfoPanel = new WordInfoPanel();

    document.addEventListener('wordClicked', (e) => {
        const detail = e.detail;
        const devanagariWord = detail.lang === 'sa' ? detail.text : '';
        const iastWord = detail.lang === 'sa-Latn' ? detail.text : '';
        if (!window.isHelpMePanelOpen && (devanagariWord || iastWord)) {
            if (window.wordInfoPanel) {
                window.wordInfoPanel.showPanelAt(devanagariWord, iastWord,
                    detail.click_point, detail.book, detail.chapter, detail.verse);
            }
        }
    });
}