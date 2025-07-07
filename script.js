class QuranReader {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.currentPage = 1;
        this.totalPages = 2;
        this.currentWordIndex = 0;
        this.wordsOnCurrentPage = [];
        this.highlightedWords = new Set();
        this.tajweedEnabled = false;
        this.tajweedRules = this.initializeTajweedRules();
        this.audioContext = null;
        this.currentAudio = null;
        this.qariDatabase = this.initializeQariDatabase();
        this.audioManifest = null;
        this.selectedQari = 'abdul_basit';
        this.audioCache = new Map();
        this.loadAudioManifest();
        
        this.initializeElements();
        this.initializeSpeechRecognition();
        this.loadCurrentPage();
        this.bindEvents();
    }
    
    initializeElements() {
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.nextPageBtn = document.getElementById('nextPageBtn');
        this.prevPageBtn = document.getElementById('prevPageBtn');
        this.quranText = document.getElementById('quranText');
        this.listeningStatus = document.getElementById('listeningStatus');
        this.progressFill = document.getElementById('progressFill');
        this.currentPageSpan = document.getElementById('currentPage');
        this.totalPagesSpan = document.getElementById('totalPages');
        this.tajweedToggle = document.getElementById('tajweedToggle');
        this.tajweedFeedback = document.getElementById('tajweedFeedback');
        this.tajweedContent = document.getElementById('tajweedContent');
        this.qariSelector = document.getElementById('qariSelector');
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
        
        pageData.verses.forEach((verse, verseIndex) => {
            const verseDiv = document.createElement('div');
            verseDiv.className = 'verse';
            
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
                    this.resetWord(this.wordsOnCurrentPage.length);
                    this.playWordAudio(word, verseIndex, wordIndex);
                });
                wordSpan.appendChild(refreshBtn);
                
                this.wordsOnCurrentPage.push({
                    element: wordSpan,
                    text: word,
                    normalizedText: this.normalizeArabicText(word)
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
        
        for (let i = 0; i < this.wordsOnCurrentPage.length; i++) {
            const wordData = this.wordsOnCurrentPage[i];
            
            console.log('Comparing with:', wordData.text, '→', wordData.normalizedText);
            
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
            
            if (isMatch && !this.highlightedWords.has(i)) {
                this.highlightedWords.add(i);
                
                // Perform tajweed analysis if enabled
                if (this.tajweedEnabled) {
                    const mistakes = this.analyzeTajweed(spokenWord, wordData, i);
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
    
    initializeQariDatabase() {
        // Local Qari database pointing to local audio files
        return {
            'abdul_basit': {
                name: 'Sheikh Abdul Basit Abdul Samad',
                style: 'Mujawwad (Slow & Clear)',
                directory: 'audio/qaris/abdul_basit/',
                enabled: true
            },
            'mishary': {
                name: 'Sheikh Mishary Rashid Alafasy', 
                style: 'Murattal (Moderate)',
                directory: 'audio/qaris/mishary/',
                enabled: true
            },
            'sudais': {
                name: 'Sheikh Abdul Rahman Al-Sudais',
                style: 'Murattal (Clear)',
                directory: 'audio/qaris/sudais/',
                enabled: true
            }
        };
    }
    
    async loadAudioManifest() {
        try {
            const response = await fetch('audio/audio_manifest.json');
            this.audioManifest = await response.json();
            console.log('Audio manifest loaded successfully');
            this.preloadCommonAudio();
        } catch (error) {
            console.error('Error loading audio manifest:', error);
            this.audioManifest = this.createFallbackManifest();
        }
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
            const audio = new Audio(audioPath);
            
            // Preload the audio
            audio.preload = 'auto';
            audio.load();
            
            // Cache it
            this.audioCache.set(word, audio);
            
            console.log(`Preloaded: ${word}`);
        } catch (error) {
            console.log(`Could not preload ${word}:`, error);
        }
    }
    
    async playWordAudio(word, verseIndex, wordIndex) {
        try {
            // Stop any currently playing audio
            if (this.currentAudio) {
                this.currentAudio.pause();
                this.currentAudio.currentTime = 0;
                this.currentAudio = null;
            }
            
            // Find the audio file for this word
            const audioFilename = this.findAudioForWord(word, verseIndex, wordIndex);
            
            if (audioFilename) {
                await this.playLocalAudio(word, audioFilename);
            } else {
                // Fallback to TTS
                await this.playDemoAudio(word);
                this.listeningStatus.textContent = `Playing TTS pronunciation of "${word}" (no local audio found)`;
            }
            
        } catch (error) {
            console.error('Error playing audio:', error);
            // Fallback to TTS on error
            await this.playDemoAudio(word);
            this.listeningStatus.textContent = `Playing fallback pronunciation of "${word}"`;
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
                // Check if audio is already cached
                let audio = this.audioCache.get(word);
                
                if (!audio) {
                    // Create new audio element
                    const audioPath = `${this.qariDatabase[this.selectedQari].directory}${audioFilename}`;
                    audio = new Audio(audioPath);
                    
                    // Cache it for next time
                    this.audioCache.set(word, audio);
                }
                
                // Reset audio to beginning
                audio.currentTime = 0;
                
                // Set up event listeners
                audio.onended = () => {
                    this.currentAudio = null;
                    resolve();
                };
                
                audio.onerror = (error) => {
                    console.error(`Error playing ${audioFilename}:`, error);
                    reject(error);
                };
                
                audio.onloadstart = () => {
                    this.listeningStatus.textContent = `Loading "${word}" by ${this.qariDatabase[this.selectedQari].name}...`;
                };
                
                audio.oncanplaythrough = () => {
                    this.listeningStatus.textContent = `Playing "${word}" by ${this.qariDatabase[this.selectedQari].name}`;
                };
                
                // Store reference and play
                this.currentAudio = audio;
                audio.play().catch(reject);
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    async playDemoAudio(word) {
        // Demo using Web Speech API for text-to-speech
        // In production, replace with actual Qari audio files
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = 'ar-SA';
            utterance.rate = 0.6;
            utterance.pitch = 1.0;
            
            // Try to find an Arabic voice
            const voices = speechSynthesis.getVoices();
            const arabicVoice = voices.find(voice => 
                voice.lang.includes('ar') || voice.name.includes('Arabic')
            );
            
            if (arabicVoice) {
                utterance.voice = arabicVoice;
            }
            
            return new Promise((resolve) => {
                utterance.onend = resolve;
                utterance.onerror = resolve;
                speechSynthesis.speak(utterance);
            });
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
            // Find the word in current page and play its audio
            const wordData = this.wordsOnCurrentPage.find(w => 
                w.text === word || this.normalizeArabicText(w.text) === this.normalizeArabicText(word)
            );
            
            if (wordData) {
                const globalIndex = parseInt(wordData.element.dataset.globalIndex);
                const verseIndex = parseInt(wordData.element.dataset.verseIndex);
                const wordIndex = parseInt(wordData.element.dataset.wordIndex);
                
                await this.playWordAudio(word, verseIndex, wordIndex);
            } else {
                // Fallback to TTS
                await this.playDemoAudio(word);
            }
        } catch (error) {
            console.error('Error playing pronunciation:', error);
            // Fallback to TTS
            await this.playDemoAudio(word);
        } finally {
            playBtn.classList.remove('playing');
            playBtn.disabled = false;
            playBtn.innerHTML = '🔊 Play Correct Pronunciation';
        }
    }
    
    changeQari(qariId) {
        if (this.qariDatabase[qariId]) {
            this.selectedQari = qariId;
            
            // Clear audio cache to reload with new qari
            this.audioCache.clear();
            
            // Preload some audio with new qari
            this.preloadCommonAudio();
            
            this.listeningStatus.textContent = `Switched to ${this.qariDatabase[qariId].name}`;
            console.log(`Switched to Qari: ${this.qariDatabase[qariId].name}`);
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