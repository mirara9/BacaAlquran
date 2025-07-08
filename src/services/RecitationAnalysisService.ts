import { AudioFeatures, RecordingData } from './AudioService';

export interface TajweedRule {
  id: string;
  name: string;
  description: string;
  pattern: string;
  severity: 'major' | 'moderate' | 'minor';
}

export interface TajweedError {
  rule: TajweedRule;
  position: number;
  duration: number;
  confidence: number;
  correction: string;
  audioExample?: string;
}

export interface PhonemeAnalysis {
  expected: string[];
  detected: string[];
  accuracy: number;
  errors: string[];
}

export interface RecitationScore {
  overall: number;
  timing: number;
  pronunciation: number;
  tajweed: number;
  fluency: number;
  breakdown: {
    correct: number;
    minor_errors: number;
    major_errors: number;
  };
}

export interface RecitationAnalysisResult {
  score: RecitationScore;
  tajweedErrors: TajweedError[];
  phonemeAnalysis: PhonemeAnalysis;
  timing: {
    totalDuration: number;
    speechDuration: number;
    pauseRatio: number;
    speechRate: number;
  };
  feedback: string[];
  recommendations: string[];
}

export class RecitationAnalysisService {
  private tajweedRules: TajweedRule[] = [
    {
      id: 'ghunna',
      name: 'Ghunna',
      description: 'Nasal sound with Noon Sakinah and Meem Sakinah',
      pattern: 'nasalization',
      severity: 'major'
    },
    {
      id: 'qalqalah',
      name: 'Qalqalah',
      description: 'Echoing sound with letters ق د ج ب ط',
      pattern: 'qalqalah_letters',
      severity: 'moderate'
    },
    {
      id: 'madd',
      name: 'Madd',
      description: 'Prolongation of vowels',
      pattern: 'elongation',
      severity: 'major'
    },
    {
      id: 'idgham',
      name: 'Idgham',
      description: 'Merging of similar sounds',
      pattern: 'merging',
      severity: 'moderate'
    },
    {
      id: 'ikhfa',
      name: 'Ikhfa',
      description: 'Concealment of Noon Sakinah',
      pattern: 'concealment',
      severity: 'moderate'
    }
  ];

  async analyzeRecitation(
    recordingData: RecordingData,
    expectedText: string,
    referenceAudio?: AudioBuffer
  ): Promise<RecitationAnalysisResult> {
    try {
      console.log('Starting recitation analysis...');
      
      // Parallel analysis of different aspects
      const [
        tajweedErrors,
        phonemeAnalysis,
        timingAnalysis,
        pronunciationScore
      ] = await Promise.all([
        this.analyzeTajweed(recordingData.features, expectedText),
        this.analyzePhonemes(recordingData.features, expectedText),
        this.analyzeTimingAndPacing(recordingData.features, recordingData.duration),
        this.analyzePronunciation(recordingData.features, referenceAudio)
      ]);

      // Calculate overall score
      const score = this.calculateScore(
        tajweedErrors,
        phonemeAnalysis,
        timingAnalysis,
        pronunciationScore
      );

      // Generate feedback and recommendations
      const feedback = this.generateFeedback(tajweedErrors, phonemeAnalysis, timingAnalysis);
      const recommendations = this.generateRecommendations(tajweedErrors, score);

      return {
        score,
        tajweedErrors,
        phonemeAnalysis,
        timing: timingAnalysis,
        feedback,
        recommendations
      };

    } catch (error) {
      console.error('Error in recitation analysis:', error);
      throw error;
    }
  }

  private async analyzeTajweed(
    features: AudioFeatures[],
    expectedText: string
  ): Promise<TajweedError[]> {
    const errors: TajweedError[] = [];
    
    try {
      // Fast Tajweed error detection using audio features
      for (let i = 0; i < features.length; i++) {
        const feature = features[i];
        
        // Check for Ghunna (nasal sound detection)
        if (this.detectGhunnaError(feature, expectedText)) {
          errors.push({
            rule: this.tajweedRules.find(r => r.id === 'ghunna')!,
            position: feature.timestamp,
            duration: 0.5,
            confidence: 0.8,
            correction: 'Apply proper nasal sound for Noon Sakinah',
            audioExample: 'examples/ghunna.wav'
          });
        }
        
        // Check for Qalqalah (echoing sound detection)
        if (this.detectQalqalahError(feature, expectedText)) {
          errors.push({
            rule: this.tajweedRules.find(r => r.id === 'qalqalah')!,
            position: feature.timestamp,
            duration: 0.3,
            confidence: 0.7,
            correction: 'Add echoing sound for Qalqalah letters',
            audioExample: 'examples/qalqalah.wav'
          });
        }
        
        // Check for Madd (prolongation detection)
        if (this.detectMaddError(feature, expectedText)) {
          errors.push({
            rule: this.tajweedRules.find(r => r.id === 'madd')!,
            position: feature.timestamp,
            duration: 1.0,
            confidence: 0.85,
            correction: 'Extend vowel sound for proper Madd',
            audioExample: 'examples/madd.wav'
          });
        }
      }
    } catch (error) {
      console.error('Error in Tajweed analysis:', error);
    }
    
    return errors;
  }

  private detectGhunnaError(feature: AudioFeatures, expectedText: string): boolean {
    // Simple rule-based detection for demonstration
    // In production, this would use more sophisticated analysis
    return feature.spectralCentroid > 0 && 
           feature.energy > 0.1 && 
           feature.zeroCrossingRate < 0.5 &&
           expectedText.includes('ن') || expectedText.includes('م');
  }

  private detectQalqalahError(feature: AudioFeatures, expectedText: string): boolean {
    // Detect sharp energy peaks for Qalqalah letters
    const qalqalahLetters = ['ق', 'د', 'ج', 'ب', 'ط'];
    const hasQalqalahLetter = qalqalahLetters.some(letter => expectedText.includes(letter));
    
    return hasQalqalahLetter && 
           feature.energy > 0.2 && 
           feature.zeroCrossingRate > 0.3;
  }

  private detectMaddError(feature: AudioFeatures, expectedText: string): boolean {
    // Detect insufficient vowel prolongation
    const maddIndicators = ['ا', 'و', 'ي', 'آ'];
    const hasMaddLetter = maddIndicators.some(letter => expectedText.includes(letter));
    
    return hasMaddLetter && 
           feature.energy > 0.15 && 
           feature.spectralCentroid > 0;
  }

  private async analyzePhonemes(
    features: AudioFeatures[],
    expectedText: string
  ): Promise<PhonemeAnalysis> {
    try {
      // Extract phonemes from audio features
      const detectedPhonemes = this.extractPhonemes(features);
      const expectedPhonemes = this.textToPhonemes(expectedText);
      
      // Compare phonemes using simple matching
      const matches = this.comparePhonemes(expectedPhonemes, detectedPhonemes);
      const accuracy = matches.correct / Math.max(expectedPhonemes.length, detectedPhonemes.length);
      
      return {
        expected: expectedPhonemes,
        detected: detectedPhonemes,
        accuracy: accuracy,
        errors: matches.errors
      };
    } catch (error) {
      console.error('Error in phoneme analysis:', error);
      return {
        expected: [],
        detected: [],
        accuracy: 0,
        errors: []
      };
    }
  }

  private extractPhonemes(features: AudioFeatures[]): string[] {
    // Simplified phoneme extraction based on audio features
    const phonemes: string[] = [];
    
    for (const feature of features) {
      if (feature.energy > 0.1) {
        // Basic phoneme classification based on spectral features
        if (feature.spectralCentroid > 0.7) {
          phonemes.push('i'); // High frequency - vowel /i/
        } else if (feature.spectralCentroid > 0.5) {
          phonemes.push('a'); // Mid frequency - vowel /a/
        } else if (feature.spectralCentroid > 0.3) {
          phonemes.push('u'); // Low frequency - vowel /u/
        } else {
          phonemes.push('consonant'); // Very low frequency - consonant
        }
      }
    }
    
    return phonemes;
  }

  private textToPhonemes(text: string): string[] {
    // Simplified Arabic text to phoneme conversion
    // In production, this would use a proper Arabic phonetic dictionary
    const phonemeMap: { [key: string]: string } = {
      'ا': 'a',
      'ب': 'b',
      'ت': 't',
      'ث': 'θ',
      'ج': 'ʤ',
      'ح': 'ħ',
      'خ': 'x',
      'د': 'd',
      'ذ': 'ð',
      'ر': 'r',
      'ز': 'z',
      'س': 's',
      'ش': 'ʃ',
      'ص': 'sˤ',
      'ض': 'dˤ',
      'ط': 'tˤ',
      'ظ': 'ðˤ',
      'ع': 'ʕ',
      'غ': 'ɣ',
      'ف': 'f',
      'ق': 'q',
      'ك': 'k',
      'ل': 'l',
      'م': 'm',
      'ن': 'n',
      'ه': 'h',
      'و': 'w',
      'ي': 'j'
    };
    
    return text.split('').map(char => phonemeMap[char] || char);
  }

  private comparePhonemes(expected: string[], detected: string[]): {
    correct: number;
    errors: string[];
  } {
    let correct = 0;
    const errors: string[] = [];
    
    const minLength = Math.min(expected.length, detected.length);
    
    for (let i = 0; i < minLength; i++) {
      if (expected[i] === detected[i]) {
        correct++;
      } else {
        errors.push(`Expected '${expected[i]}' but detected '${detected[i]}' at position ${i}`);
      }
    }
    
    // Add errors for length mismatch
    if (expected.length !== detected.length) {
      errors.push(`Length mismatch: expected ${expected.length}, detected ${detected.length}`);
    }
    
    return { correct, errors };
  }

  private async analyzeTimingAndPacing(
    features: AudioFeatures[],
    totalDuration: number
  ): Promise<{
    totalDuration: number;
    speechDuration: number;
    pauseRatio: number;
    speechRate: number;
  }> {
    // Calculate speech vs pause durations
    const speechThreshold = 0.05; // Energy threshold for speech detection
    let speechDuration = 0;
    
    for (const feature of features) {
      if (feature.energy > speechThreshold) {
        speechDuration += 0.1; // Assuming 100ms per feature frame
      }
    }
    
    const pauseRatio = (totalDuration - speechDuration) / totalDuration;
    const speechRate = speechDuration > 0 ? features.length / speechDuration : 0;
    
    return {
      totalDuration,
      speechDuration,
      pauseRatio,
      speechRate
    };
  }

  private async analyzePronunciation(
    features: AudioFeatures[],
    referenceAudio?: AudioBuffer
  ): Promise<number> {
    // Simple pronunciation scoring based on audio features
    if (!referenceAudio) return 0.7; // Default score without reference
    
    // Calculate average features
    const avgEnergy = features.reduce((sum, f) => sum + f.energy, 0) / features.length;
    const avgSpectralCentroid = features.reduce((sum, f) => sum + f.spectralCentroid, 0) / features.length;
    const avgZCR = features.reduce((sum, f) => sum + f.zeroCrossingRate, 0) / features.length;
    
    // Simple scoring based on reasonable ranges
    let score = 0;
    
    // Energy score (0.05 - 0.3 is good range)
    if (avgEnergy >= 0.05 && avgEnergy <= 0.3) {
      score += 0.3;
    } else {
      score += 0.1;
    }
    
    // Spectral centroid score
    if (avgSpectralCentroid >= 0.3 && avgSpectralCentroid <= 0.7) {
      score += 0.3;
    } else {
      score += 0.1;
    }
    
    // Zero crossing rate score
    if (avgZCR >= 0.1 && avgZCR <= 0.5) {
      score += 0.4;
    } else {
      score += 0.2;
    }
    
    return Math.min(score, 1.0);
  }

  private calculateScore(
    tajweedErrors: TajweedError[],
    phonemeAnalysis: PhonemeAnalysis,
    timingAnalysis: any,
    pronunciationScore: number
  ): RecitationScore {
    const majorErrors = tajweedErrors.filter(e => e.rule.severity === 'major').length;
    const moderateErrors = tajweedErrors.filter(e => e.rule.severity === 'moderate').length;
    const minorErrors = tajweedErrors.filter(e => e.rule.severity === 'minor').length;
    
    // Calculate component scores
    const tajweedScore = Math.max(0, 1 - (majorErrors * 0.2 + moderateErrors * 0.1 + minorErrors * 0.05));
    const phonemeScore = phonemeAnalysis.accuracy;
    const timingScore = Math.max(0, 1 - Math.abs(timingAnalysis.pauseRatio - 0.2)); // Optimal pause ratio ~20%
    
    // Weighted overall score
    const overall = (
      tajweedScore * 0.4 +
      phonemeScore * 0.3 +
      pronunciationScore * 0.2 +
      timingScore * 0.1
    );
    
    return {
      overall: Math.round(overall * 100),
      timing: Math.round(timingScore * 100),
      pronunciation: Math.round(pronunciationScore * 100),
      tajweed: Math.round(tajweedScore * 100),
      fluency: Math.round(phonemeScore * 100),
      breakdown: {
        correct: Math.max(0, 100 - majorErrors * 10 - moderateErrors * 5 - minorErrors * 2),
        minor_errors: minorErrors,
        major_errors: majorErrors + moderateErrors
      }
    };
  }

  private generateFeedback(
    tajweedErrors: TajweedError[],
    phonemeAnalysis: PhonemeAnalysis,
    timingAnalysis: any
  ): string[] {
    const feedback: string[] = [];
    
    // Tajweed feedback
    if (tajweedErrors.length > 0) {
      const majorErrors = tajweedErrors.filter(e => e.rule.severity === 'major');
      if (majorErrors.length > 0) {
        feedback.push(`Found ${majorErrors.length} major Tajweed errors. Focus on proper pronunciation rules.`);
      }
      
      const ghunnaErrors = tajweedErrors.filter(e => e.rule.id === 'ghunna');
      if (ghunnaErrors.length > 0) {
        feedback.push('Work on nasal sounds (Ghunna) with Noon and Meem Sakinah.');
      }
      
      const maddErrors = tajweedErrors.filter(e => e.rule.id === 'madd');
      if (maddErrors.length > 0) {
        feedback.push('Pay attention to vowel prolongation (Madd) rules.');
      }
    }
    
    // Phoneme feedback
    if (phonemeAnalysis.accuracy < 0.8) {
      feedback.push('Work on clear pronunciation of individual sounds.');
    }
    
    // Timing feedback
    if (timingAnalysis.pauseRatio > 0.4) {
      feedback.push('Try to reduce excessive pauses between words.');
    } else if (timingAnalysis.pauseRatio < 0.1) {
      feedback.push('Add appropriate pauses for better rhythm.');
    }
    
    return feedback;
  }

  private generateRecommendations(
    tajweedErrors: TajweedError[],
    score: RecitationScore
  ): string[] {
    const recommendations: string[] = [];
    
    if (score.overall < 60) {
      recommendations.push('Practice basic Arabic pronunciation with a qualified teacher.');
      recommendations.push('Focus on individual letter sounds before attempting full verses.');
    } else if (score.overall < 80) {
      recommendations.push('Work on specific Tajweed rules that need improvement.');
      recommendations.push('Practice with audio examples for correct pronunciation.');
    } else {
      recommendations.push('Excellent recitation! Continue practicing to maintain quality.');
      recommendations.push('Consider learning more advanced Tajweed rules.');
    }
    
    // Specific recommendations based on errors
    const errorTypes = [...new Set(tajweedErrors.map(e => e.rule.id))];
    for (const errorType of errorTypes) {
      const rule = this.tajweedRules.find(r => r.id === errorType);
      if (rule) {
        recommendations.push(`Study and practice ${rule.name}: ${rule.description}`);
      }
    }
    
    return recommendations;
  }
}