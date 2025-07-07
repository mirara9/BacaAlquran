class QuranReader {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.currentPage = 1;
        this.totalPages = 2;
        this.currentWordIndex = 0;
        this.wordsOnCurrentPage = [];
        this.highlightedWords = new Set();
        this.currentVerseIndex = 0;
        this.expectedWordIndex = 0;
        this.tajweedEnabled = false;
        this.tajweedRules = this.initializeTajweedRules();
        this.audioContext = null;
        this.currentAudio = null;
        this.currentOscillator = null;
        this.qariDatabase = this.initializeQariDatabase();
        this.audioManifest = null;
        this.selectedQari = 'abdul_basit';
        this.audioCache = new Map();
        this.audioInitialized = false;
        this.initializeAudioSystem();
        
        console.log('🔧 Starting QuranReader initialization...');
        
        this.initializeElements();
        console.log('✓ Elements initialized');
        
        this.initializeSpeechRecognition();
        console.log('✓ Speech recognition initialized');
        
        this.loadCurrentPage();
        console.log('✓ Page loaded');
        
        this.bindEvents();
        console.log('✓ Events bound');
        
        console.log('🎉 QuranReader initialization complete');
    }
    
    initializeElements() {
        const elements = {
            startBtn: 'startBtn',
            stopBtn: 'stopBtn',
            nextPageBtn: 'nextPageBtn',
            prevPageBtn: 'prevPageBtn',
            quranText: 'quranText',
            listeningStatus: 'listeningStatus',
            progressFill: 'progressFill',
            currentPageSpan: 'currentPage',
            totalPagesSpan: 'totalPages',
            tajweedToggle: 'tajweedToggle',
            tajweedFeedback: 'tajweedFeedback',
            tajweedContent: 'tajweedContent',
            qariSelector: 'qariSelector',
            audioStatus: 'audioStatus',
            audioStatusIcon: 'audioStatusIcon',
            audioStatusText: 'audioStatusText'
        };
        
        let missingElements = [];
        
        for (const [property, elementId] of Object.entries(elements)) {
            const element = document.getElementById(elementId);
            if (element) {
                this[property] = element;
                console.log(`✓ Found ${property}: ${elementId}`);
            } else {
                missingElements.push(elementId);
                console.error(`✗ Missing element: ${elementId}`);
            }
        }
        
        if (missingElements.length > 0) {
            console.error(`❌ Missing ${missingElements.length} required elements:`, missingElements);
            throw new Error(`Missing required DOM elements: ${missingElements.join(', ')}`);
        }
        
        console.log('✅ All DOM elements found successfully');
    }
    
    initializeSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Speech recognition not supported in this browser. Please use Chrome or Edge.');
            return;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'ar-SA';
        
        this.recognition.onstart = () => {
            this.isListening = true;
            this.listeningStatus.textContent = 'Listening...';
            this.listeningStatus.classList.add('listening');
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
        };
        
        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }
            
            if (finalTranscript) {
                this.processSpokenText(finalTranscript.trim());
            }
            
            if (interimTranscript) {
                this.listeningStatus.textContent = 'Listening: ' + interimTranscript;
            }
        };
        
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.listeningStatus.textContent = 'Error: ' + event.error;
        };
        
        this.recognition.onend = () => {
            this.isListening = false;
            this.listeningStatus.textContent = 'Stopped listening';
            this.listeningStatus.classList.remove('listening');
            this.startBtn.disabled = false;
            this.stopBtn.disabled = true;
        };
    }
    
    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startListening());
        this.stopBtn.addEventListener('click', () => this.stopListening());
        this.nextPageBtn.addEventListener('click', () => this.nextPage());
        this.prevPageBtn.addEventListener('click', () => this.prevPage());
        this.tajweedToggle.addEventListener('click', () => this.toggleTajweed());
        this.qariSelector.addEventListener('change', (e) => this.changeQari(e.target.value));
    }
    
    startListening() {
        if (this.recognition) {
            this.recognition.start();
        }
    }
    
    stopListening() {
        if (this.recognition) {
            this.recognition.stop();
        }
    }
    
    loadCurrentPage() {
        const pages = this.getQuranPages();
        if (pages[this.currentPage - 1]) {
            this.displayPage(pages[this.currentPage - 1]);
        }
        this.currentPageSpan.textContent = this.currentPage;
        this.totalPagesSpan.textContent = this.totalPages;
        this.updateProgress();
    }
    
    displayPage(pageData) {
        this.quranText.innerHTML = '';
        this.wordsOnCurrentPage = [];
        this.highlightedWords.clear();
        this.currentWordIndex = 0;
        this.currentVerseIndex = 0;
        this.expectedWordIndex = 0;
        
        pageData.verses.forEach((verse, verseIndex) => {
            const verseDiv = document.createElement('div');
            verseDiv.className = 'verse';
            verseDiv.setAttribute('data-verse-number', `آية ${verseIndex + 1}`);
            
            const words = verse.arabic.split(' ');
            words.forEach((word, wordIndex) => {
                const wordSpan = document.createElement('span');
                wordSpan.className = 'word';
                wordSpan.textContent = word;
                wordSpan.dataset.verseIndex = verseIndex;
                wordSpan.dataset.wordIndex = wordIndex;
                wordSpan.dataset.globalIndex = this.wordsOnCurrentPage.length;
                
                // Add refresh button
                const refreshBtn = document.createElement('button');
                refreshBtn.className = 'word-refresh';
                refreshBtn.innerHTML = '↻';
                refreshBtn.title = 'Re-read this word';
                refreshBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const globalIndex = this.wordsOnCurrentPage.length;
                    this.resetWord(globalIndex);
                    
                    // Play audio immediately when refresh is clicked
                    console.log(`Refresh clicked for word: ${word}`);
                    this.playWordAudio(word, verseIndex, wordIndex);
                });
                wordSpan.appendChild(refreshBtn);
                
                this.wordsOnCurrentPage.push({
                    element: wordSpan,
                    text: word,
                    normalizedText: this.normalizeArabicText(word),
                    verseIndex: verseIndex,
                    wordIndex: wordIndex,
                    globalIndex: this.wordsOnCurrentPage.length
                });
                
                // Clear any existing highlights
                wordSpan.classList.remove('highlighted', 'incorrect', 'current');
                
                verseDiv.appendChild(wordSpan);
                verseDiv.appendChild(document.createTextNode(' '));
            });
            
            this.quranText.appendChild(verseDiv);
        });
    }
    
    normalizeArabicText(text) {
        return text
            // Remove all diacritics (harakat)
            .replace(/[ًٌٍَُِّْ]/g, '')
            // Remove additional diacritics
            .replace(/[ٰٱٲٳٴٵٶٷٸٹٺٻټٽپٿڀځڂڃڄڅچڇڈډڊڋڌڍڎڏڐڑڒړڔڕږڗژڙښڛڜڝڞڟڠڡڢڣڤڥڦڧڨکڪګڬڭڮگڰڱڲڳڴڵڶڷڸڹںڻڼڽھڿۀہۂۃۄۅۆۇۈۉۊۋیۍێۏېۑےۓ]/g, '')
            // Remove tatweel (kashida)
            .replace(/ـ/g, '')
            // Remove special symbols
            .replace(/[۩]/g, '')
            // Normalize common letter variations
            .replace(/آ/g, 'ا')
            .replace(/أ/g, 'ا')
            .replace(/إ/g, 'ا')
            .replace(/ؤ/g, 'و')
            .replace(/ئ/g, 'ي')
            .replace(/ى/g, 'ي')
            .replace(/ة/g, 'ه')
            // Remove extra spaces
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }
    
    processSpokenText(spokenText) {
        const normalizedSpoken = this.normalizeArabicText(spokenText);
        const spokenWords = normalizedSpoken.split(' ').filter(word => word.length > 0);
        
        console.log('Spoken text:', spokenText);
        console.log('Normalized spoken words:', spokenWords);
        
        spokenWords.forEach(spokenWord => {
            this.findAndHighlightWord(spokenWord);
        });
        
        this.updateProgress();
        this.checkPageCompletion();
    }
    
    findAndHighlightWord(spokenWord) {
        const normalizedSpoken = this.normalizeArabicText(spokenWord);
        
        console.log('Looking for word:', spokenWord, '→', normalizedSpoken);
        console.log('Current verse:', this.currentVerseIndex, 'Expected word:', this.expectedWordIndex);
        
        // Get words from current verse and next few words for context
        const searchScope = this.getWordsInSearchScope();
        
        for (let i = 0; i < searchScope.length; i++) {
            const wordData = searchScope[i];
            const globalIndex = wordData.globalIndex;
            
            console.log('Comparing with:', wordData.text, '→', wordData.normalizedText, 'in verse', wordData.verseIndex);
            
            // Multiple matching strategies
            const isMatch = 
                // Exact match
                normalizedSpoken === wordData.normalizedText ||
                // Contains match (either direction)
                normalizedSpoken.includes(wordData.normalizedText) ||
                wordData.normalizedText.includes(normalizedSpoken) ||
                // Similarity match (at least 70% similar)
                this.calculateSimilarity(normalizedSpoken, wordData.normalizedText) > 0.7 ||
                // Root-based matching (remove common prefixes/suffixes)
                this.rootMatch(normalizedSpoken, wordData.normalizedText);
            
            if (isMatch && !this.highlightedWords.has(globalIndex)) {
                this.highlightedWords.add(globalIndex);
                
                // Update current position tracking
                this.updateCurrentPosition(wordData);
                
                // Perform tajweed analysis if enabled
                if (this.tajweedEnabled) {
                    const mistakes = this.analyzeTajweed(spokenWord, wordData, globalIndex);
                    if (mistakes.length > 0) {
                        wordData.element.classList.add('incorrect');
                        this.showTajweedFeedback(mistakes);
                        console.log('❌ Tajweed mistakes found:', mistakes);
                    } else {
                        wordData.element.classList.add('highlighted');
                        console.log('✓ Correct tajweed pronunciation');
                    }
                } else {
                    wordData.element.classList.add('highlighted');
                }
                
                console.log('✓ Highlighted word:', wordData.text, 'matched with:', spokenWord);
                break;
            }
        }
    }
    
    getWordsInSearchScope() {
        // Get words from current verse and allow some flexibility for natural reading
        const scope = [];
        
        // First priority: words from current verse starting from expected position
        const currentVerseWords = this.wordsOnCurrentPage.filter(word => 
            word.verseIndex === this.currentVerseIndex
        );
        
        // Add words from expected position onwards in current verse
        for (let i = this.expectedWordIndex; i < currentVerseWords.length; i++) {
            scope.push(currentVerseWords[i]);
        }
        
        // If we haven't found enough words or reached end of verse, add from next verse
        if (scope.length < 3) {
            const nextVerseWords = this.wordsOnCurrentPage.filter(word => 
                word.verseIndex === this.currentVerseIndex + 1
            );
            scope.push(...nextVerseWords.slice(0, 5)); // Add first 5 words from next verse
        }
        
        // Fallback: if still not enough context, add some previous words for correction
        if (scope.length < 2 && this.expectedWordIndex > 0) {
            const prevWords = currentVerseWords.slice(Math.max(0, this.expectedWordIndex - 2), this.expectedWordIndex);
            scope.unshift(...prevWords);
        }
        
        console.log('Search scope:', scope.map(w => w.text).join(' '));
        return scope;
    }
    
    updateCurrentPosition(matchedWord) {
        // Update tracking based on the matched word
        const previousVerseIndex = this.currentVerseIndex;
        
        // If we're in the same verse, advance expected word index
        if (matchedWord.verseIndex === previousVerseIndex) {
            this.expectedWordIndex = Math.max(this.expectedWordIndex, matchedWord.wordIndex + 1);
        } else {
            // Moved to new verse
            this.currentVerseIndex = matchedWord.verseIndex;
            this.expectedWordIndex = matchedWord.wordIndex + 1;
        }
        
        // Always update current verse index
        this.currentVerseIndex = matchedWord.verseIndex;
        
        console.log('Updated position - Verse:', this.currentVerseIndex, 'Expected word:', this.expectedWordIndex);
    }
    
    updateProgress() {
        const progress = (this.highlightedWords.size / this.wordsOnCurrentPage.length) * 100;
        this.progressFill.style.width = progress + '%';
    }
    
    calculateSimilarity(str1, str2) {
        const len1 = str1.length;
        const len2 = str2.length;
        
        if (len1 === 0) return len2 === 0 ? 1 : 0;
        if (len2 === 0) return 0;
        
        const matrix = [];
        for (let i = 0; i <= len1; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= len2; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }
        
        const maxLen = Math.max(len1, len2);
        return (maxLen - matrix[len1][len2]) / maxLen;
    }
    
    rootMatch(spoken, text) {
        // Remove common Arabic prefixes and suffixes for root matching
        const removeAffixes = (word) => {
            return word
                .replace(/^(ال|و|ف|ب|ك|ل)/g, '') // Remove common prefixes
                .replace(/(ها|ان|ات|ون|ين|تم|تن|نا)$/g, '') // Remove common suffixes
                .replace(/^(است|ت|ن|ي|ا)/g, '') // Remove more prefixes
                .replace(/(ة|ه)$/g, ''); // Remove ending letters
        };
        
        const spokenRoot = removeAffixes(spoken);
        const textRoot = removeAffixes(text);
        
        return spokenRoot.length >= 2 && textRoot.length >= 2 && 
               (spokenRoot === textRoot || 
                spokenRoot.includes(textRoot) || 
                textRoot.includes(spokenRoot));
    }
    
    initializeTajweedRules() {
        return {
            // Noon Sakinah and Tanween rules
            'noon_sakinah': {
                'ikhfaa': {
                    letters: ['ت', 'ث', 'ج', 'د', 'ذ', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ف', 'ق', 'ك'],
                    rule: 'Ikhfaa (Concealment) - إخفاء',
                    description: 'Noon Sakinah (نْ) or Tanween (ً ٌ ٍ) should be hidden/concealed when followed by these letters',
                    pronunciation: 'Pronounce with a nasal sound without complete closure',
                    detailed: {
                        explanation: 'When Noon Sakinah or Tanween comes before any of the 15 Ikhfaa letters, the sound is concealed with ghunnah (nasal sound) for 2 counts.',
                        phonetic: '[n˜] - nasal sound between clear and merged',
                        steps: [
                            'Place tongue near the following letter\'s position',
                            'Allow air to flow through the nose',
                            'Create a humming sound for 2 counts',
                            'Do not fully pronounce the noon sound',
                            'Blend smoothly into the next letter'
                        ],
                        examples: [
                            {arabic: 'مِن تَحْتِهَا', transliteration: 'min tahtihaa', phonetic: '[mi˜n tactihaː]'},
                            {arabic: 'عَن قَرِيبٍ', transliteration: 'an qareebin', phonetic: '[a˜n qariːbin]'}
                        ],
                        common_mistakes: [
                            'Pronouncing noon clearly (should be concealed)',
                            'Not maintaining ghunnah for full 2 counts',
                            'Completely dropping the noon sound'
                        ]
                    }
                },
                'iqlab': {
                    letters: ['ب'],
                    rule: 'Iqlab (Conversion) - إقلاب',
                    description: 'Noon Sakinah (نْ) or Tanween (ً ٌ ٍ) converts to Meem (م) when followed by Ba (ب)',
                    pronunciation: 'Change the sound to "m" with nasal prolongation (ghunnah) for 2 counts',
                    detailed: {
                        explanation: 'The noon or tanween sound completely changes to a meem sound with ghunnah when followed by Ba.',
                        phonetic: '[m˜] - full meem sound with nasalization',
                        steps: [
                            'Close lips completely as if pronouncing Meem',
                            'Allow air to flow through nose',
                            'Create ghunnah (humming) for 2 counts',
                            'Release into the Ba sound',
                            'Maintain lip closure throughout'
                        ],
                        examples: [
                            {arabic: 'مِن بَعْدِ', transliteration: 'min ba\'di', phonetic: '[mim˜ ba\'di]'},
                            {arabic: 'سَمِيعٌ بَصِيرٌ', transliteration: 'samee\'un baseerun', phonetic: '[samiː\'um˜ basiːrun]'}
                        ],
                        common_mistakes: [
                            'Pronouncing noon instead of meem',
                            'Not maintaining ghunnah for 2 counts',
                            'Not fully closing lips for meem sound'
                        ]
                    }
                },
                'idgham': {
                    letters: ['ي', 'ر', 'م', 'ل', 'و', 'ن'],
                    rule: 'Idgham (Merging) - إدغام',
                    description: 'Noon Sakinah (نْ) or Tanween (ً ٌ ٍ) merges completely with these letters (يرملون)',
                    pronunciation: 'Merge completely with the following letter, with or without ghunnah',
                    detailed: {
                        explanation: 'The noon sound disappears and merges into the following letter. For ينمو (yarmaloon) there is ghunnah, for رل (raa-laam) there is no ghunnah.',
                        phonetic: 'With ghunnah: [letter˜] | Without ghunnah: [letter]',
                        steps: [
                            'Identify if the letter has ghunnah (ينمو) or not (رل)',
                            'If with ghunnah: merge with 2-count nasal sound',
                            'If without ghunnah: merge directly without nasal sound',
                            'Do not pronounce noon at all',
                            'Strengthen the following letter'
                        ],
                        examples: [
                            {arabic: 'مِن يَقُولُ', transliteration: 'min yaqoolu', phonetic: '[miyy˜aquːlu] - with ghunnah'},
                            {arabic: 'مِن رَبِّهِم', transliteration: 'min rabbihim', phonetic: '[mirrabbihim] - no ghunnah'}
                        ],
                        common_mistakes: [
                            'Pronouncing noon before merging',
                            'Adding ghunnah to raa and laam',
                            'Not strengthening the merged letter'
                        ]
                    }
                },
                'izhar': {
                    letters: ['ء', 'هـ', 'ع', 'ح', 'غ', 'خ'],
                    rule: 'Izhar (Clear pronunciation)',
                    description: 'Noon Sakinah or Tanween should be pronounced clearly',
                    pronunciation: 'Pronounce clearly and distinctly'
                }
            },
            // Meem Sakinah rules
            'meem_sakinah': {
                'ikhfaa': {
                    letters: ['ب'],
                    rule: 'Ikhfaa Shafawi (Labial concealment)',
                    description: 'Meem Sakinah should be concealed when followed by Ba',
                    pronunciation: 'Conceal with nasal sound using lips'
                },
                'idgham': {
                    letters: ['م'],
                    rule: 'Idgham Shafawi (Labial merging)',
                    description: 'Meem Sakinah merges with another Meem',
                    pronunciation: 'Merge with prolongation'
                },
                'izhar': {
                    letters: ['ء', 'هـ', 'ع', 'ح', 'غ', 'خ', 'ت', 'ث', 'ج', 'د', 'ذ', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ف', 'ق', 'ك', 'ل', 'ن', 'و', 'ي', 'ر'],
                    rule: 'Izhar Shafawi (Clear labial pronunciation)',
                    description: 'Meem Sakinah should be pronounced clearly',
                    pronunciation: 'Pronounce clearly using lips'
                }
            },
            // Madd (Elongation) rules
            'madd': {
                'madd_tabii': {
                    pattern: /[اوي][َُِ]/g,
                    rule: 'Madd Tabii (Natural elongation)',
                    description: 'Natural elongation for 2 counts',
                    pronunciation: 'Elongate for 2 counts naturally'
                },
                'madd_munfasil': {
                    pattern: /[اوي]\s+[ءأإ]/g,
                    rule: 'Madd Munfasil (Separated elongation)',
                    description: 'Elongation when hamza comes after alif/waw/ya in separate word',
                    pronunciation: 'Elongate for 4-5 counts'
                },
                'madd_muttasil': {
                    pattern: /[اوي][ءأإ]/g,
                    rule: 'Madd Muttasil (Connected elongation)',
                    description: 'Elongation when hamza comes after alif/waw/ya in same word',
                    pronunciation: 'Elongate for 4-5 counts'
                }
            },
            // Qalqalah (Echoing) rules
            'qalqalah': {
                'letters': ['ق', 'ط', 'ب', 'ج', 'د'],
                'rule': 'Qalqalah (Echoing)',
                'description': 'These letters should echo when they have sukun',
                'pronunciation': 'Pronounce with a slight echo/bounce'
            },
            // Ghunnah (Nasal sound) rules
            'ghunnah': {
                'letters': ['ن', 'م'],
                'rule': 'Ghunnah (Nasal sound)',
                'description': 'Nasal sound for Noon and Meem with certain rules',
                'pronunciation': 'Pronounce with nasal resonance'
            }
        };
    }
    
    toggleTajweed() {
        this.tajweedEnabled = !this.tajweedEnabled;
        if (this.tajweedEnabled) {
            this.tajweedToggle.textContent = 'Disable Tajweed';
            this.tajweedToggle.classList.add('active');
            this.listeningStatus.textContent = 'Tajweed mode enabled - Reading with pronunciation analysis';
        } else {
            this.tajweedToggle.textContent = 'Enable Tajweed';
            this.tajweedToggle.classList.remove('active');
            this.tajweedFeedback.classList.remove('show');
            this.listeningStatus.textContent = 'Tajweed mode disabled';
        }
    }
    
    analyzeTajweed(spokenText, wordData, wordIndex) {
        const mistakes = [];
        const word = wordData.text;
        const normalizedWord = wordData.normalizedText;
        
        // Check for Noon Sakinah/Tanween rules
        if (word.includes('ن') || word.includes('ً') || word.includes('ٌ') || word.includes('ٍ')) {
            const noonMistakes = this.checkNoonSakinahRules(spokenText, word, wordIndex);
            mistakes.push(...noonMistakes);
        }
        
        // Check for Meem Sakinah rules
        if (word.includes('م')) {
            const meemMistakes = this.checkMeemSakinahRules(spokenText, word, wordIndex);
            mistakes.push(...meemMistakes);
        }
        
        // Check for Madd rules
        const maddMistakes = this.checkMaddRules(spokenText, word);
        mistakes.push(...maddMistakes);
        
        // Check for Qalqalah
        const qalqalahMistakes = this.checkQalqalahRules(spokenText, word);
        mistakes.push(...qalqalahMistakes);
        
        return mistakes;
    }
    
    checkNoonSakinahRules(spokenText, word, wordIndex) {
        const mistakes = [];
        const nextWord = wordIndex + 1 < this.wordsOnCurrentPage.length ? 
            this.wordsOnCurrentPage[wordIndex + 1].text : '';
        
        if (nextWord) {
            const firstLetter = nextWord.charAt(0);
            const rules = this.tajweedRules.noon_sakinah;
            
            // Check which rule should apply
            let expectedRule = null;
            for (const [ruleName, ruleData] of Object.entries(rules)) {
                if (ruleData.letters.includes(firstLetter)) {
                    expectedRule = ruleData;
                    break;
                }
            }
            
            if (expectedRule) {
                // Simplified pronunciation check
                const hasCorrectPronunciation = this.checkPronunciationPattern(spokenText, expectedRule);
                if (!hasCorrectPronunciation) {
                    mistakes.push({
                        type: 'noon_sakinah',
                        rule: expectedRule.rule,
                        description: expectedRule.description,
                        correction: expectedRule.pronunciation,
                        word: word
                    });
                }
            }
        }
        
        return mistakes;
    }
    
    checkMeemSakinahRules(spokenText, word, wordIndex) {
        const mistakes = [];
        const nextWord = wordIndex + 1 < this.wordsOnCurrentPage.length ? 
            this.wordsOnCurrentPage[wordIndex + 1].text : '';
        
        if (nextWord) {
            const firstLetter = nextWord.charAt(0);
            const rules = this.tajweedRules.meem_sakinah;
            
            let expectedRule = null;
            for (const [ruleName, ruleData] of Object.entries(rules)) {
                if (ruleData.letters.includes(firstLetter)) {
                    expectedRule = ruleData;
                    break;
                }
            }
            
            if (expectedRule) {
                const hasCorrectPronunciation = this.checkPronunciationPattern(spokenText, expectedRule);
                if (!hasCorrectPronunciation) {
                    mistakes.push({
                        type: 'meem_sakinah',
                        rule: expectedRule.rule,
                        description: expectedRule.description,
                        correction: expectedRule.pronunciation,
                        word: word
                    });
                }
            }
        }
        
        return mistakes;
    }
    
    checkMaddRules(spokenText, word) {
        const mistakes = [];
        const maddRules = this.tajweedRules.madd;
        
        for (const [ruleType, ruleData] of Object.entries(maddRules)) {
            if (ruleData.pattern && word.match(ruleData.pattern)) {
                // Check if elongation is present in speech
                const hasElongation = this.checkElongation(spokenText, word);
                if (!hasElongation) {
                    mistakes.push({
                        type: 'madd',
                        rule: ruleData.rule,
                        description: ruleData.description,
                        correction: ruleData.pronunciation,
                        word: word
                    });
                }
            }
        }
        
        return mistakes;
    }
    
    checkQalqalahRules(spokenText, word) {
        const mistakes = [];
        const qalqalahLetters = this.tajweedRules.qalqalah.letters;
        
        for (const letter of qalqalahLetters) {
            // Check if the letter has sukun (is followed by sukun mark or is at the end)
            const letterIndex = word.indexOf(letter);
            if (letterIndex !== -1) {
                const nextChar = word.charAt(letterIndex + 1);
                const hasSukun = nextChar === '\u0652' || // sukun mark
                                letterIndex === word.length - 1 || // end of word
                                nextChar === '' || // also end of word
                                /\s/.test(nextChar); // followed by space
                
                // Only check qalqalah if the letter actually has sukun
                if (hasSukun) {
                    const hasQalqalah = this.checkQalqalahPronunciation(spokenText, letter);
                    if (!hasQalqalah) {
                        mistakes.push({
                            type: 'qalqalah',
                            rule: this.tajweedRules.qalqalah.rule,
                            description: `Letter ${letter} should echo when it has sukun`,
                            correction: this.tajweedRules.qalqalah.pronunciation,
                            word: word,
                            letter: letter
                        });
                    }
                }
            }
        }
        
        return mistakes;
    }
    
    checkPronunciationPattern(spokenText, rule) {
        // More lenient check to reduce false positives
        // In a real implementation, this would use advanced audio analysis
        
        // For now, be very lenient and only flag obvious issues
        const duration = spokenText.length;
        const hasNasalSound = spokenText.includes('n') || spokenText.includes('m');
        
        // Most rules default to correct unless there's a clear issue
        if (rule.rule.includes('Ikhfaa')) {
            // Only flag if completely missing nasal sound and very short
            return hasNasalSound || duration > 2;
        }
        if (rule.rule.includes('Idgham')) {
            // Only flag if extremely short
            return duration > 1;
        }
        if (rule.rule.includes('Iqlab')) {
            // Only flag if no nasal sound at all
            return hasNasalSound || duration > 2;
        }
        
        return true; // Default to correct to reduce false positives
    }
    
    getPhoneticPronunciation(arabicWord) {
        // Phonetic English pronunciations for Arabic Quran words
        const phoneticMap = {
            // Al-Fatiha - Verse 1
            'بِسْمِ': 'bis-mi',
            'اللَّهِ': 'al-lah-hi',
            'الرَّحْمَنِ': 'ar-rah-man-i',
            'الرَّحِيمِ': 'ar-ra-heem',
            
            // Al-Fatiha - Verse 2
            'الْحَمْدُ': 'al-ham-du',
            'لِلَّهِ': 'lil-lah-hi',
            'رَبِّ': 'rab-bi',
            'الْعَالَمِينَ': 'al-ah-la-meen',
            
            // Al-Fatiha - Verse 3
            // (الرَّحْمَنِ الرَّحِيمِ already mapped above)
            
            // Al-Fatiha - Verse 4
            'مَالِكِ': 'ma-li-ki',
            'يَوْمِ': 'yaw-mi',
            'الدِّينِ': 'ad-deen',
            
            // Al-Fatiha - Verse 5
            'إِيَّاكَ': 'iy-ya-ka',
            'نَعْبُدُ': 'nah-bu-du',
            'وَإِيَّاكَ': 'wa-iy-ya-ka',
            'نَسْتَعِينُ': 'nas-ta-een',
            
            // Al-Fatiha - Verse 6
            'اهْدِنَا': 'ih-di-na',
            'الصِّرَاطَ': 'as-si-rat',
            'الْمُسْتَقِيمَ': 'al-mus-ta-keem',
            
            // Al-Fatiha - Verse 7
            'صِرَاطَ': 'si-rat',
            'الَّذِينَ': 'al-la-dhee-na',
            'أَنْعَمْتَ': 'an-am-ta',
            'عَلَيْهِمْ': 'ah-lay-him',
            'غَيْرِ': 'ghay-ri',
            'الْمَغْضُوبِ': 'al-magh-doob',
            'وَلَا': 'wa-la',
            'الضَّالِّينَ': 'ad-dal-leen',
            
            // Common words
            'الله': 'al-lah',
            'محمد': 'mu-ham-mad',
            'السلام': 'as-sa-lam',
            'عليكم': 'ah-lay-kum',
            'وعليكم': 'wa-ah-lay-kum',
            'السلام عليكم': 'as-sa-la-mu ah-lay-kum',
            
            // Remove diacritics versions
            'بسم': 'bis-mi',
            'الله': 'al-lah',
            'الرحمن': 'ar-rah-man',
            'الرحيم': 'ar-ra-heem',
            'الحمد': 'al-ham-du',
            'لله': 'lil-lah',
            'رب': 'rab-bi',
            'العالمين': 'al-ah-la-meen'
        };
        
        // Try exact match first
        if (phoneticMap[arabicWord]) {
            return phoneticMap[arabicWord];
        }
        
        // Try normalized version (remove diacritics)
        const normalized = this.normalizeArabicText(arabicWord);
        if (phoneticMap[normalized]) {
            return phoneticMap[normalized];
        }
        
        // Return null if no phonetic mapping found
        return null;
    }
    
    initializeQariDatabase() {
        // TTS-based Qari simulation with different speech parameters
        return {
            'abdul_basit': {
                name: 'Sheikh Abdul Basit Abdul Samad',
                style: 'Mujawwad (Slow & Clear)',
                ttsConfig: {
                    rate: 0.4,
                    pitch: 0.9,
                    volume: 0.9,
                    preferredLang: 'ar-SA'
                },
                enabled: true
            },
            'mishary': {
                name: 'Sheikh Mishary Rashid Alafasy', 
                style: 'Murattal (Moderate)',
                ttsConfig: {
                    rate: 0.6,
                    pitch: 1.0,
                    volume: 0.8,
                    preferredLang: 'ar'
                },
                enabled: true
            },
            'sudais': {
                name: 'Sheikh Abdul Rahman Al-Sudais',
                style: 'Murattal (Clear)',
                ttsConfig: {
                    rate: 0.7,
                    pitch: 1.1,
                    volume: 0.85,
                    preferredLang: 'ar-SA'
                },
                enabled: true
            }
        };
    }
    
    async initializeAudioSystem() {
        console.log('🎵 Initializing audio system...');
        
        this.updateAudioStatus('🔧', 'Initializing audio system...', 'info');
        
        // Test TTS availability
        if ('speechSynthesis' in window) {
            console.log('✅ Text-to-Speech available');
            
            // Check for Arabic voices
            const checkArabicVoices = () => {
                const voices = speechSynthesis.getVoices();
                console.log(`🎤 Loaded ${voices.length} TTS voices`);
                const arabicVoices = voices.filter(v => v.lang.includes('ar'));
                if (arabicVoices.length > 0) {
                    console.log(`🔊 Found ${arabicVoices.length} Arabic voices:`, arabicVoices.map(v => v.name));
                    this.updateAudioStatus('🔊', `Arabic TTS Ready (${arabicVoices.length} voices)`, 'arabic-tts');
                } else {
                    console.log('⚠️ No Arabic voices found - will use phonetic pronunciation');
                    this.updateAudioStatus('🔤', 'Phonetic TTS Ready (No Arabic voices)', 'phonetic-tts');
                }
            };
            
            // Preload voices
            if (speechSynthesis.getVoices().length === 0) {
                speechSynthesis.onvoiceschanged = checkArabicVoices;
            } else {
                checkArabicVoices();
            }
        } else {
            console.log('❌ Text-to-Speech not available');
            this.updateAudioStatus('🎵', 'Musical Tones Only (No TTS)', 'musical-tone');
            this.listeningStatus.textContent = '❌ Text-to-Speech not supported in this browser';
        }
        
        // Test Web Audio API
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log(`✅ Web Audio API available (${this.audioContext.state})`);
        } catch (error) {
            console.log('❌ Web Audio API not available:', error);
            this.updateAudioStatus('❌', 'Audio Not Available', 'error');
        }
        
        // Add user interaction requirement notice
        this.addAudioActivationListener();
        
        this.audioInitialized = true;
        console.log('✅ Audio system initialized successfully');
        this.listeningStatus.textContent = '🎵 Audio system ready - click any button to activate';
    }
    
    updateAudioStatus(icon, text, type = 'info') {
        if (this.audioStatusIcon && this.audioStatusText && this.audioStatus) {
            this.audioStatusIcon.textContent = icon;
            this.audioStatusText.textContent = text;
            
            // Remove all previous classes
            this.audioStatus.className = 'audio-status';
            
            // Add new type class
            if (type !== 'info') {
                this.audioStatus.classList.add(type);
            }
        }
    }
    
    addAudioActivationListener() {
        // Audio requires user interaction in modern browsers
        const activateAudio = async () => {
            console.log('🎵 Activating audio system...');
            
            if (this.audioContext && this.audioContext.state === 'suspended') {
                try {
                    await this.audioContext.resume();
                    console.log('✅ Audio context resumed');
                } catch (error) {
                    console.error('Failed to resume audio context:', error);
                }
            }
            
            // Test if TTS is working
            if ('speechSynthesis' in window) {
                console.log('🎤 TTS system ready');
                this.listeningStatus.textContent = '✅ Audio activated - ready to play sounds';
            }
            
            // Remove listener after first activation
            document.removeEventListener('click', activateAudio);
        };
        
        document.addEventListener('click', activateAudio, { once: true });
    }
    
    createFallbackManifest() {
        // Fallback manifest if file is not found
        return {
            surah_1: {
                verses: [
                    {
                        verse_number: 1,
                        words: [
                            {word: "بِسْمِ", audio: "001_001_001.mp3", transliteration: "bismi"},
                            {word: "اللَّهِ", audio: "001_001_002.mp3", transliteration: "allahi"},
                            {word: "الرَّحْمَنِ", audio: "001_001_003.mp3", transliteration: "ar-rahmani"},
                            {word: "الرَّحِيمِ", audio: "001_001_004.mp3", transliteration: "ar-raheem"}
                        ]
                    },
                    {
                        verse_number: 2,
                        words: [
                            {word: "الْحَمْدُ", audio: "001_002_001.mp3", transliteration: "alhamdu"},
                            {word: "لِلَّهِ", audio: "001_002_002.mp3", transliteration: "lillahi"},
                            {word: "رَبِّ", audio: "001_002_003.mp3", transliteration: "rabbi"},
                            {word: "الْعَالَمِينَ", audio: "001_002_004.mp3", transliteration: "al-alameen"}
                        ]
                    }
                ]
            }
        };
    }
    
    async preloadCommonAudio() {
        // Preload audio for the first few words to improve performance
        if (!this.audioManifest || !this.audioManifest.surah_1) return;
        
        const firstVerse = this.audioManifest.surah_1.verses[0];
        if (firstVerse && firstVerse.words) {
            for (const wordData of firstVerse.words.slice(0, 4)) { // Preload first 4 words
                await this.preloadAudio(wordData.word, wordData.audio);
            }
        }
    }
    
    async preloadAudio(word, audioFilename) {
        try {
            const audioPath = `${this.qariDatabase[this.selectedQari].directory}${audioFilename}`;
            
            // Test if the audio file exists and is valid
            const testAudio = new Audio();
            
            return new Promise((resolve) => {
                testAudio.oncanplaythrough = () => {
                    console.log(`✅ Preloaded: ${word} (${audioFilename})`);
                    resolve();
                };
                
                testAudio.onerror = () => {
                    console.log(`⚠️  Could not preload ${word}: file not found or invalid`);
                    resolve(); // Don't fail, just log
                };
                
                testAudio.onabort = () => {
                    console.log(`⚠️  Preload aborted for ${word}`);
                    resolve();
                };
                
                // Set a timeout for preloading
                setTimeout(() => {
                    console.log(`⏰ Preload timeout for ${word}`);
                    resolve();
                }, 2000);
                
                testAudio.preload = 'metadata';
                testAudio.src = audioPath;
                testAudio.load();
            });
        } catch (error) {
            console.log(`Could not preload ${word}:`, error);
        }
    }
    
    async playWordAudio(word, verseIndex, wordIndex) {
        try {
            // Stop any currently playing audio
            this.stopCurrentAudio();
            
            // Always use TTS as primary method for now (most reliable)
            console.log(`Playing word: ${word}`);
            await this.playEnhancedTTS(word);
            
        } catch (error) {
            console.error('Error playing audio:', error);
            // Final fallback to beep sound
            await this.playBeepSound(440 + (wordIndex * 110), 400);
            this.listeningStatus.textContent = `Audio fallback used for "${word}"`;
        }
    }
    
    stopCurrentAudio() {
        // Stop any audio element
        if (this.currentAudio) {
            try {
                this.currentAudio.pause();
                this.currentAudio.currentTime = 0;
                this.currentAudio = null;
            } catch (e) {}
        }
        
        // Stop speech synthesis
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
        }
        
        // Stop Web Audio
        if (this.currentOscillator) {
            try {
                this.currentOscillator.stop();
                this.currentOscillator = null;
            } catch (e) {}
        }
    }
    
    findAudioForWord(word, verseIndex, wordIndex) {
        if (!this.audioManifest || !this.audioManifest.surah_1) return null;
        
        const verses = this.audioManifest.surah_1.verses;
        if (verseIndex < verses.length) {
            const verse = verses[verseIndex];
            if (verse.words && wordIndex < verse.words.length) {
                const wordData = verse.words[wordIndex];
                if (wordData.word === word || this.normalizeArabicText(wordData.word) === this.normalizeArabicText(word)) {
                    return wordData.audio;
                }
            }
        }
        
        // If not found by position, search by word text
        for (const verse of verses) {
            if (verse.words) {
                for (const wordData of verse.words) {
                    if (wordData.word === word || this.normalizeArabicText(wordData.word) === this.normalizeArabicText(word)) {
                        return wordData.audio;
                    }
                }
            }
        }
        
        return null;
    }
    
    async playLocalAudio(word, audioFilename) {
        return new Promise((resolve, reject) => {
            try {
                // Create new audio element each time to avoid caching issues
                const audioPath = `${this.qariDatabase[this.selectedQari].directory}${audioFilename}`;
                const audio = new Audio();
                
                // Set up error handling first
                audio.onerror = (error) => {
                    console.error(`Error loading ${audioFilename}:`, error);
                    this.listeningStatus.textContent = `Audio file not found, using TTS fallback...`;
                    
                    // Fallback to TTS
                    this.playDemoAudio(word).then(resolve).catch(reject);
                };
                
                audio.onloadstart = () => {
                    this.listeningStatus.textContent = `Loading "${word}" by ${this.qariDatabase[this.selectedQari].name}...`;
                };
                
                audio.oncanplaythrough = () => {
                    this.listeningStatus.textContent = `Playing "${word}" by ${this.qariDatabase[this.selectedQari].name}`;
                };
                
                audio.onended = () => {
                    this.currentAudio = null;
                    resolve();
                };
                
                audio.onloadeddata = () => {
                    // Check if audio has actual content
                    if (audio.duration && audio.duration > 0.1) {
                        console.log(`Successfully loaded ${audioFilename}, duration: ${audio.duration}s`);
                    } else {
                        console.warn(`Audio file ${audioFilename} seems to be empty or very short`);
                    }
                };
                
                // Store reference and set source
                this.currentAudio = audio;
                audio.src = audioPath;
                audio.load();
                
                // Try to play with better error handling
                audio.play().catch(error => {
                    console.error(`Playback failed for ${audioFilename}:`, error);
                    this.listeningStatus.textContent = `Playback failed, using TTS fallback...`;
                    
                    // Fallback to TTS
                    this.playDemoAudio(word).then(resolve).catch(reject);
                });
                
            } catch (error) {
                console.error(`Error in playLocalAudio:`, error);
                // Fallback to TTS
                this.playDemoAudio(word).then(resolve).catch(reject);
            }
        });
    }
    
    async playEnhancedTTS(word) {
        // Primary TTS method with improved reliability
        if ('speechSynthesis' in window) {
            return new Promise((resolve) => {
                console.log(`Starting TTS for: ${word}`);
                
                // Stop any current speech
                speechSynthesis.cancel();
                
                // Check if Arabic voices are available
                const voices = speechSynthesis.getVoices();
                const hasArabicVoice = voices.some(v => v.lang.includes('ar'));
                
                let textToSpeak = word;
                let languageToUse = 'ar-SA';
                
                // If no Arabic voices, use phonetic English pronunciation
                if (!hasArabicVoice) {
                    const phoneticText = this.getPhoneticPronunciation(word);
                    if (phoneticText) {
                        textToSpeak = phoneticText;
                        languageToUse = 'en-US';
                        console.log(`No Arabic voice found, using phonetic: "${phoneticText}" for "${word}"`);
                        this.updateAudioStatus('🔤', 'Using Phonetic Pronunciation', 'phonetic-tts');
                    } else {
                        console.log(`No phonetic mapping found for "${word}"`);
                    }
                } else {
                    this.updateAudioStatus('🔊', 'Using Arabic Voice', 'arabic-tts');
                }
                
                const utterance = new SpeechSynthesisUtterance(textToSpeak);
                
                // Configure using selected Qari's settings
                const qariConfig = this.qariDatabase[this.selectedQari].ttsConfig;
                utterance.lang = hasArabicVoice ? qariConfig.preferredLang : languageToUse;
                utterance.rate = qariConfig.rate * (hasArabicVoice ? 1 : 0.8); // Slightly slower for phonetic
                utterance.pitch = qariConfig.pitch;
                utterance.volume = qariConfig.volume;
                
                // Set up event handlers
                utterance.onstart = () => {
                    console.log(`TTS started for: ${word} (${hasArabicVoice ? 'Arabic voice' : 'Phonetic English'})`);
                    const voiceType = hasArabicVoice ? 'Arabic voice' : 'phonetic pronunciation';
                    this.listeningStatus.textContent = `🔊 Playing "${word}" using ${voiceType}`;
                };
                
                utterance.onend = () => {
                    console.log(`TTS completed for: ${word}`);
                    this.listeningStatus.textContent = `✅ Finished playing "${word}"`;
                    resolve();
                };
                
                utterance.onerror = (error) => {
                    console.error('TTS error:', error);
                    this.listeningStatus.textContent = `TTS failed, playing musical tone...`;
                    // Fallback to word-specific tone
                    this.playWordTone(word).then(resolve).catch(resolve);
                };
                
                // Enhanced voice selection
                const selectVoiceAndSpeak = () => {
                    const voices = speechSynthesis.getVoices();
                    console.log(`Available voices: ${voices.length}`);
                    
                    let selectedVoice = null;
                    
                    if (hasArabicVoice) {
                        // Priority order for Arabic voices
                        const voicePriority = [
                            v => v.lang === 'ar-SA',
                            v => v.lang === 'ar',
                            v => v.lang.startsWith('ar-'),
                            v => v.name.toLowerCase().includes('arabic'),
                            v => v.name.toLowerCase().includes('saudi'),
                            v => v.name.toLowerCase().includes('nural')
                        ];
                        
                        for (const criterion of voicePriority) {
                            selectedVoice = voices.find(criterion);
                            if (selectedVoice) break;
                        }
                    } else {
                        // Find best English voice for phonetic pronunciation
                        const englishVoices = voices.filter(v => 
                            v.lang.startsWith('en-') || v.lang === 'en'
                        );
                        
                        // Prefer US English, then UK English, then any English
                        selectedVoice = englishVoices.find(v => v.lang === 'en-US') ||
                                     englishVoices.find(v => v.lang === 'en-GB') ||
                                     englishVoices[0];
                    }
                    
                    if (selectedVoice) {
                        utterance.voice = selectedVoice;
                        console.log(`Selected voice: ${selectedVoice.name} (${selectedVoice.lang})`);
                    } else {
                        console.log('Using system default voice');
                    }
                    
                    // Speak the word
                    try {
                        speechSynthesis.speak(utterance);
                    } catch (error) {
                        console.error('Speech synthesis error:', error);
                        this.playBeepSound(440, 400).then(resolve).catch(resolve);
                    }
                };
                
                // Handle voice loading with improved timing
                if (speechSynthesis.getVoices().length > 0) {
                    selectVoiceAndSpeak();
                } else {
                    // Set up voice loading handler
                    let voicesLoaded = false;
                    const onVoicesChanged = () => {
                        if (!voicesLoaded && speechSynthesis.getVoices().length > 0) {
                            voicesLoaded = true;
                            speechSynthesis.onvoiceschanged = null;
                            selectVoiceAndSpeak();
                        }
                    };
                    
                    speechSynthesis.onvoiceschanged = onVoicesChanged;
                    
                    // Fallback timeout - try without waiting if voices don't load
                    setTimeout(() => {
                        if (!voicesLoaded) {
                            console.log('Voice loading timeout, proceeding without voice selection');
                            speechSynthesis.onvoiceschanged = null;
                            selectVoiceAndSpeak();
                        }
                    }, 500);
                }
            });
        } else {
            console.log('Speech synthesis not available, using beep sound');
            return this.playBeepSound(440, 400);
        }
    }
    
    async playDemoAudio(word) {
        // Backward compatibility method
        return this.playEnhancedTTS(word);
    }
    
    async playWordTone(word) {
        // Generate word-specific musical tone patterns
        console.log(`Playing word-specific tone for: ${word}`);
        this.updateAudioStatus('🎵', 'Generating Musical Tone', 'musical-tone');
        
        // Calculate tone pattern based on word characteristics
        const wordHash = this.hashWord(word);
        const baseFrequency = 220 + (wordHash % 400); // 220-620 Hz range
        const syllableCount = this.estimateSyllables(word);
        const toneDuration = Math.max(600, syllableCount * 300); // Longer words get longer tones
        
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // Create multiple oscillators for richer sound
            const oscillators = [];
            const gainNodes = [];
            
            for (let i = 0; i < syllableCount; i++) {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                const filterNode = this.audioContext.createBiquadFilter();
                
                oscillator.connect(filterNode);
                filterNode.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                // Each syllable gets a slightly different frequency
                const frequency = baseFrequency + (i * 55); // Musical fourth intervals
                oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
                oscillator.type = 'sine';
                
                // Configure filter
                filterNode.type = 'lowpass';
                filterNode.frequency.setValueAtTime(frequency * 1.5, this.audioContext.currentTime);
                
                // Staggered timing for syllable effect
                const startTime = this.audioContext.currentTime + (i * 0.2);
                const duration = (toneDuration - i * 100) / 1000;
                
                // Envelope for each syllable
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(0.08, startTime + 0.05);
                gainNode.gain.linearRampToValueAtTime(0.04, startTime + duration * 0.7);
                gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
                
                oscillator.start(startTime);
                oscillator.stop(startTime + duration);
                
                oscillators.push(oscillator);
                gainNodes.push(gainNode);
            }
            
            this.currentOscillator = oscillators[0]; // Store first for cleanup
            this.listeningStatus.textContent = `🎶 Playing melodic tone for "${word}" (${syllableCount} syllables)`;
            
            return new Promise(resolve => {
                let resolvedCount = 0;
                const totalOscillators = oscillators.length;
                
                oscillators.forEach((osc, index) => {
                    osc.onended = () => {
                        resolvedCount++;
                        if (resolvedCount === totalOscillators) {
                            this.currentOscillator = null;
                            this.listeningStatus.textContent = `✅ Finished melodic tone for "${word}"`;
                            resolve();
                        }
                    };
                });
                
                // Fallback timeout
                setTimeout(() => {
                    this.currentOscillator = null;
                    resolve();
                }, toneDuration + 500);
            });
            
        } catch (error) {
            console.error('Word tone generation error:', error);
            // Fallback to simple beep
            return this.playBeepSound(440, 400);
        }
    }
    
    hashWord(word) {
        // Simple hash function to generate consistent but varied numbers for each word
        let hash = 0;
        for (let i = 0; i < word.length; i++) {
            const char = word.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }
    
    estimateSyllables(arabicWord) {
        // Estimate syllable count for Arabic words based on vowel marks and structure
        const normalizedWord = this.normalizeArabicText(arabicWord);
        
        // Count vowel markers and estimate syllables
        const vowelMarkers = (arabicWord.match(/[\u064B-\u0652]/g) || []).length;
        const letterCount = normalizedWord.length;
        
        // Heuristic: Most Arabic words have 1-4 syllables
        let syllables;
        if (letterCount <= 2) syllables = 1;
        else if (letterCount <= 4) syllables = 2;
        else if (letterCount <= 6) syllables = 3;
        else syllables = 4;
        
        // Adjust based on vowel markers if present
        if (vowelMarkers > 0) {
            syllables = Math.max(syllables, Math.min(4, Math.ceil(vowelMarkers / 2)));
        }
        
        return syllables;
    }

    async playBeepSound(frequency = 440, duration = 300) {
        // Enhanced beep sound with better audio quality
        try {
            console.log(`Playing beep: ${frequency}Hz for ${duration}ms`);
            
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            // Resume audio context if suspended (required for user interaction)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filterNode = this.audioContext.createBiquadFilter();
            
            // Connect nodes for better sound quality
            oscillator.connect(filterNode);
            filterNode.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Configure oscillator
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = 'sine';
            
            // Configure filter for smoother sound
            filterNode.type = 'lowpass';
            filterNode.frequency.setValueAtTime(frequency * 2, this.audioContext.currentTime);
            
            // Configure envelope for smooth attack and decay
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.15, this.audioContext.currentTime + 0.05);
            gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + duration / 2000);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration / 1000);
            
            // Store reference for cleanup
            this.currentOscillator = oscillator;
            
            // Start and schedule stop
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration / 1000);
            
            this.listeningStatus.textContent = `🎵 Playing audio tone (${frequency}Hz) - Audio files not available`;
            
            return new Promise(resolve => {
                oscillator.onended = () => {
                    this.currentOscillator = null;
                    this.listeningStatus.textContent = `✅ Finished audio tone`;
                    resolve();
                };
                
                // Fallback timeout
                setTimeout(() => {
                    this.currentOscillator = null;
                    resolve();
                }, duration + 200);
            });
            
        } catch (error) {
            console.error('Web Audio API error:', error);
            this.listeningStatus.textContent = `❌ Audio not available - ${error.message}`;
            return Promise.resolve();
        }
    }
    
    checkElongation(spokenText, word) {
        // Check for elongation in speech - simplified implementation
        return spokenText.length > word.length * 0.8;
    }
    
    checkQalqalahPronunciation(spokenText, letter) {
        // More lenient check for qalqalah bounce - assume correct unless clearly wrong
        // In a real implementation, this would analyze audio for the bounce effect
        return true; // Default to correct for now to reduce false positives
    }
    
    resetWord(wordIndex) {
        if (wordIndex >= 0 && wordIndex < this.wordsOnCurrentPage.length) {
            const wordData = this.wordsOnCurrentPage[wordIndex];
            
            // Remove highlighting and incorrect classes
            wordData.element.classList.remove('highlighted', 'incorrect', 'current');
            
            // Remove from highlighted words set
            this.highlightedWords.delete(wordIndex);
            
            // Hide tajweed feedback
            this.tajweedFeedback.classList.remove('show');
            
            // Update progress
            this.updateProgress();
            
            // Update status
            this.listeningStatus.textContent = `Word "${wordData.text}" reset. You can re-read it now.`;
            
            console.log('Word reset:', wordData.text);
        }
    }
    
    showTajweedFeedback(mistakes) {
        if (mistakes.length === 0) {
            this.tajweedFeedback.classList.remove('show');
            return;
        }
        
        let feedbackHTML = '';
        mistakes.forEach((mistake, index) => {
            const detailed = this.getTajweedRuleDetails(mistake);
            
            feedbackHTML += `
                <div class="mistake">❌ ${mistake.rule}</div>
                <div class="rule">📜 ${mistake.description}</div>
                
                ${detailed ? `
                    <div class="pronunciation-guide">
                        <h4>🎤 Correct Pronunciation Guide</h4>
                        <p><strong>Explanation:</strong> ${detailed.explanation}</p>
                        <p><strong>Phonetic:</strong> <span class="phonetic">${detailed.phonetic}</span></p>
                    </div>
                    
                    <div class="step-by-step">
                        <h5>📝 Step-by-Step Instructions:</h5>
                        <ol>
                            ${detailed.steps.map(step => `<li>${step}</li>`).join('')}
                        </ol>
                    </div>
                    
                    ${detailed.examples ? `
                        <div class="tajweed-example">
                            <h5>📚 Examples:</h5>
                            ${detailed.examples.map(ex => `
                                <div class="arabic">${ex.arabic}</div>
                                <div class="transliteration">Transliteration: ${ex.transliteration}</div>
                                <div class="phonetic">Phonetic: ${ex.phonetic}</div>
                                <hr style="margin: 8px 0; opacity: 0.3;">
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    ${detailed.common_mistakes ? `
                        <div style="background: #ffebee; padding: 10px; border-radius: 6px; margin: 10px 0;">
                            <h5 style="color: #c62828; margin-bottom: 8px;">⚠️ Common Mistakes to Avoid:</h5>
                            <ul style="margin-left: 20px; color: #d32f2f;">
                                ${detailed.common_mistakes.map(mistake => `<li>${mistake}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                ` : `
                    <div class="correction">✅ ${mistake.correction}</div>
                `}
                
                <div class="audio-controls">
                    <button class="play-audio-btn" onclick="quranReader.playCorrectPronunciation('${mistake.word}')">
                        🔊 Play Correct Pronunciation
                    </button>
                    <span class="qari-name">${this.qariDatabase[this.selectedQari].name} (${this.qariDatabase[this.selectedQari].style})</span>
                    <select onchange="quranReader.changeQari(this.value)" style="margin-left: 10px; padding: 4px;">
                        ${Object.entries(this.qariDatabase).map(([id, qari]) => 
                            `<option value="${id}" ${id === this.selectedQari ? 'selected' : ''}>${qari.name}</option>`
                        ).join('')}
                    </select>
                </div>
                
                <hr style="margin: 15px 0; border: 1px solid #ddd;">
            `;
        });
        
        this.tajweedContent.innerHTML = feedbackHTML;
        this.tajweedFeedback.classList.add('show');
        
        // Auto-hide after 10 seconds (increased for detailed content)
        setTimeout(() => {
            this.tajweedFeedback.classList.remove('show');
        }, 10000);
    }
    
    getTajweedRuleDetails(mistake) {
        // Find detailed explanation for the mistake
        const rules = this.tajweedRules;
        
        // Search through all rule categories
        for (const category of Object.values(rules)) {
            if (typeof category === 'object' && category !== null) {
                for (const rule of Object.values(category)) {
                    if (rule.rule === mistake.rule && rule.detailed) {
                        return rule.detailed;
                    }
                }
            }
        }
        
        return null;
    }
    
    async playCorrectPronunciation(word) {
        const playBtn = event.target;
        playBtn.classList.add('playing');
        playBtn.disabled = true;
        playBtn.innerHTML = '🔊 Playing...';
        
        try {
            console.log(`Playing correct pronunciation for: ${word}`);
            
            // Always use TTS for reliable playback
            await this.playEnhancedTTS(word);
            
        } catch (error) {
            console.error('Error playing pronunciation:', error);
            // Final fallback to beep
            await this.playBeepSound(660, 500);
        } finally {
            playBtn.classList.remove('playing');
            playBtn.disabled = false;
            playBtn.innerHTML = '🔊 Play Correct Pronunciation';
        }
    }
    
    changeQari(qariId) {
        if (this.qariDatabase[qariId]) {
            this.selectedQari = qariId;
            const qari = this.qariDatabase[qariId];
            const config = qari.ttsConfig;
            
            this.listeningStatus.textContent = `✅ Switched to ${qari.name} - ${qari.style}`;
            console.log(`Switched to Qari: ${qari.name} (Rate: ${config.rate}, Pitch: ${config.pitch})`);
        }
    }
    
    checkPageCompletion() {
        if (this.highlightedWords.size >= this.wordsOnCurrentPage.length * 0.8) {
            setTimeout(() => {
                if (this.currentPage < this.totalPages) {
                    this.nextPage();
                } else {
                    this.listeningStatus.textContent = 'Congratulations! You have completed reading the Quran!';
                    this.stopListening();
                }
            }, 2000);
        }
    }
    
    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.loadCurrentPage();
        }
    }
    
    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.loadCurrentPage();
        }
    }
    
    getQuranPages() {
        return [
            {
                verses: [
                    {
                        arabic: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
                        translation: "In the name of Allah, the Most Gracious, the Most Merciful"
                    },
                    {
                        arabic: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
                        translation: "Praise be to Allah, the Lord of the worlds"
                    },
                    {
                        arabic: "الرَّحْمَنِ الرَّحِيمِ",
                        translation: "The Most Gracious, the Most Merciful"
                    },
                    {
                        arabic: "مَالِكِ يَوْمِ الدِّينِ",
                        translation: "Master of the Day of Judgment"
                    }
                ]
            },
            {
                verses: [
                    {
                        arabic: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
                        translation: "You alone we worship, and You alone we ask for help"
                    },
                    {
                        arabic: "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ",
                        translation: "Guide us to the straight path"
                    },
                    {
                        arabic: "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ",
                        translation: "The path of those You have blessed, not of those who have incurred Your wrath, nor of those who have gone astray"
                    }
                ]
            }
        ];
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.quranReader = new QuranReader();
});