class QuranReader {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.currentPage = 1;
        this.totalPages = 2;
        this.currentWordIndex = 0;
        this.wordsOnCurrentPage = [];
        this.highlightedWords = new Set();
        
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
                
                this.wordsOnCurrentPage.push({
                    element: wordSpan,
                    text: word,
                    normalizedText: this.normalizeArabicText(word)
                });
                
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
                wordData.element.classList.add('highlighted');
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