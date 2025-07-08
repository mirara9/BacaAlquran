export interface Word {
  id: string
  arabic: string
  transliteration: string
  translation: string
  audioUrl?: string
  alternativePronunciations?: string[]
}

export interface Verse {
  id: number
  words: Word[]
  transliteration: string
  translation: string
  audioUrl?: string
}

export interface Surah {
  id: number
  name: string
  englishName: string
  verses: Verse[]
  totalWords: number
}

// Al-Fatiha word-by-word data
export const AL_FATIHA_WORD_BY_WORD: Surah = {
  id: 1,
  name: 'الفاتحة',
  englishName: 'Al-Fatiha',
  totalWords: 29,
  verses: [
    {
      id: 1,
      transliteration: 'Bismillāhi r-raḥmāni r-raḥīm',
      translation: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.',
      words: [
        {
          id: '1-1',
          arabic: 'بِسْمِ',
          transliteration: 'Bismi',
          translation: 'In the name of',
          alternativePronunciations: ['بسم', 'بسمي']
        },
        {
          id: '1-2',
          arabic: 'ٱللَّهِ',
          transliteration: 'Allāhi',
          translation: 'Allah',
          alternativePronunciations: ['الله', 'اللهي']
        },
        {
          id: '1-3',
          arabic: 'ٱلرَّحْمَـٰنِ',
          transliteration: 'ar-Raḥmāni',
          translation: 'the Entirely Merciful',
          alternativePronunciations: ['الرحمن', 'الرحماني']
        },
        {
          id: '1-4',
          arabic: 'ٱلرَّحِيمِ',
          transliteration: 'ar-Raḥīmi',
          translation: 'the Especially Merciful',
          alternativePronunciations: ['الرحيم', 'الرحيمي']
        }
      ]
    },
    {
      id: 2,
      transliteration: 'Al-ḥamdu lillāhi rabbi l-ʿālamīn',
      translation: 'All praise is due to Allah, Lord of the worlds.',
      words: [
        {
          id: '2-1',
          arabic: 'ٱلْحَمْدُ',
          transliteration: 'Al-ḥamdu',
          translation: 'All praise',
          alternativePronunciations: ['الحمد', 'الحمدو']
        },
        {
          id: '2-2',
          arabic: 'لِلَّهِ',
          transliteration: 'lillāhi',
          translation: 'to Allah',
          alternativePronunciations: ['لله', 'للهي']
        },
        {
          id: '2-3',
          arabic: 'رَبِّ',
          transliteration: 'rabbi',
          translation: 'Lord',
          alternativePronunciations: ['رب', 'ربي']
        },
        {
          id: '2-4',
          arabic: 'ٱلْعَـٰلَمِينَ',
          transliteration: 'al-ʿālamīn',
          translation: 'of the worlds',
          alternativePronunciations: ['العالمين', 'العالمن']
        }
      ]
    },
    {
      id: 3,
      transliteration: 'Ar-raḥmāni r-raḥīm',
      translation: 'The Entirely Merciful, the Especially Merciful.',
      words: [
        {
          id: '3-1',
          arabic: 'ٱلرَّحْمَـٰنِ',
          transliteration: 'Ar-raḥmāni',
          translation: 'The Entirely Merciful',
          alternativePronunciations: ['الرحمن', 'الرحماني']
        },
        {
          id: '3-2',
          arabic: 'ٱلرَّحِيمِ',
          transliteration: 'ar-raḥīmi',
          translation: 'the Especially Merciful',
          alternativePronunciations: ['الرحيم', 'الرحيمي']
        }
      ]
    },
    {
      id: 4,
      transliteration: 'Māliki yawmi d-dīn',
      translation: 'Sovereign of the Day of Recompense.',
      words: [
        {
          id: '4-1',
          arabic: 'مَالِكِ',
          transliteration: 'Māliki',
          translation: 'Sovereign',
          alternativePronunciations: ['مالك', 'مالكي', 'ملك']
        },
        {
          id: '4-2',
          arabic: 'يَوْمِ',
          transliteration: 'yawmi',
          translation: 'Day',
          alternativePronunciations: ['يوم', 'يومي']
        },
        {
          id: '4-3',
          arabic: 'الدِّينِ',
          transliteration: 'ad-dīni',
          translation: 'of Recompense',
          alternativePronunciations: ['الدين', 'الديني']
        }
      ]
    },
    {
      id: 5,
      transliteration: 'Iyyāka naʿbudu wa-iyyāka nastaʿīn',
      translation: 'It is You we worship and You we ask for help.',
      words: [
        {
          id: '5-1',
          arabic: 'إِيَّاكَ',
          transliteration: 'Iyyāka',
          translation: 'You alone',
          alternativePronunciations: ['اياك', 'إياك']
        },
        {
          id: '5-2',
          arabic: 'نَعْبُدُ',
          transliteration: 'naʿbudu',
          translation: 'we worship',
          alternativePronunciations: ['نعبد', 'نعبدو']
        },
        {
          id: '5-3',
          arabic: 'وَإِيَّاكَ',
          transliteration: 'wa-iyyāka',
          translation: 'and You alone',
          alternativePronunciations: ['واياك', 'وإياك']
        },
        {
          id: '5-4',
          arabic: 'نَسْتَعِينُ',
          transliteration: 'nastaʿīnu',
          translation: 'we ask for help',
          alternativePronunciations: ['نستعين', 'نستعن']
        }
      ]
    },
    {
      id: 6,
      transliteration: 'Ihdinā ṣ-ṣirāṭa l-mustaqīm',
      translation: 'Guide us to the straight path.',
      words: [
        {
          id: '6-1',
          arabic: 'ٱهْدِنَا',
          transliteration: 'Ihdinā',
          translation: 'Guide us',
          alternativePronunciations: ['اهدنا', 'اهدن']
        },
        {
          id: '6-2',
          arabic: 'ٱلصِّرَٰطَ',
          transliteration: 'aṣ-ṣirāṭa',
          translation: 'the path',
          alternativePronunciations: ['الصراط', 'الصرط']
        },
        {
          id: '6-3',
          arabic: 'ٱلْمُسْتَقِيمَ',
          transliteration: 'al-mustaqīma',
          translation: 'the straight',
          alternativePronunciations: ['المستقيم', 'المستقم']
        }
      ]
    },
    {
      id: 7,
      transliteration: 'Ṣirāṭa lladhīna anʿamta ʿalayhim ghayri l-maghḍūbi ʿalayhim wa-lā ḍ-ḍāllīn',
      translation: 'The path of those upon whom You have bestowed favor, not of those who have evoked [Your] anger or of those who are astray.',
      words: [
        {
          id: '7-1',
          arabic: 'صِرَٰطَ',
          transliteration: 'Ṣirāṭa',
          translation: 'The path',
          alternativePronunciations: ['صراط', 'صرط']
        },
        {
          id: '7-2',
          arabic: 'ٱلَّذِينَ',
          transliteration: 'alladhīna',
          translation: 'of those',
          alternativePronunciations: ['الذين', 'الذن']
        },
        {
          id: '7-3',
          arabic: 'أَنْعَمْتَ',
          transliteration: 'anʿamta',
          translation: 'You have bestowed favor',
          alternativePronunciations: ['انعمت', 'أنعمت']
        },
        {
          id: '7-4',
          arabic: 'عَلَيْهِمْ',
          transliteration: 'ʿalayhim',
          translation: 'upon them',
          alternativePronunciations: ['عليهم', 'عليهن']
        },
        {
          id: '7-5',
          arabic: 'غَيْرِ',
          transliteration: 'ghayri',
          translation: 'not',
          alternativePronunciations: ['غير', 'غري']
        },
        {
          id: '7-6',
          arabic: 'ٱلْمَغْضُوبِ',
          transliteration: 'al-maghḍūbi',
          translation: 'those who have evoked [Your] anger',
          alternativePronunciations: ['المغضوب', 'المغضب']
        },
        {
          id: '7-7',
          arabic: 'عَلَيْهِمْ',
          transliteration: 'ʿalayhim',
          translation: 'upon them',
          alternativePronunciations: ['عليهم', 'عليهن']
        },
        {
          id: '7-8',
          arabic: 'وَلَا',
          transliteration: 'wa-lā',
          translation: 'and not',
          alternativePronunciations: ['ولا', 'ولى']
        },
        {
          id: '7-9',
          arabic: 'ٱلضَّآلِّينَ',
          transliteration: 'aḍ-ḍāllīn',
          translation: 'those who are astray',
          alternativePronunciations: ['الضالين', 'الضالن']
        }
      ]
    }
  ]
}