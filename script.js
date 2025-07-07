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
                    rule: 'Ikhfaa (Concealment)',
                    description: 'Noon Sakinah or Tanween should be hidden/concealed when followed by these letters',
                    pronunciation: 'Pronounce with a nasal sound without complete closure'
                },
                'iqlab': {
                    letters: ['ب'],
                    rule: 'Iqlab (Conversion)',
                    description: 'Noon Sakinah or Tanween converts to Meem when followed by Ba',
                    pronunciation: 'Change the sound to "m" with nasal prolongation'
                },
                'idgham': {
                    letters: ['ي', 'ر', 'م', 'ل', 'و', 'ن'],
                    rule: 'Idgham (Merging)',
                    description: 'Noon Sakinah or Tanween merges with these letters',
                    pronunciation: 'Merge completely with the following letter'
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
        mistakes.forEach(mistake => {
            feedbackHTML += `
                <div class="mistake">❌ ${mistake.rule}</div>
                <div class="rule">📜 ${mistake.description}</div>
                <div class="correction">✅ ${mistake.correction}</div>
                <hr style="margin: 10px 0; border: 1px solid #ddd;">
            `;
        });
        
        this.tajweedContent.innerHTML = feedbackHTML;
        this.tajweedFeedback.classList.add('show');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.tajweedFeedback.classList.remove('show');
        }, 5000);
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
    new QuranReader();
});