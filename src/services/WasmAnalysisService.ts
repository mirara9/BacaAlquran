import { RecordingData } from './AudioService';

interface WasmModule {
  ready: Promise<any>;
  extractMFCC: (audioData: number[], frameLength: number, numCoeffs?: number) => number[];
  processAudioFrames: (audioData: number[], frameLength: number, hopSize: number) => number[][];
  calculatePitch: (audioData: number[], sampleRate: number) => number;
  calculateSpectralCentroid: (audioData: number[], sampleRate: number) => number;
  dtw_distance: (seq1: number[][], seq2: number[][], bandWidth?: number) => { distance: number; normalized_distance: number };
  dtw_align: (seq1: number[][], seq2: number[][], bandWidth?: number) => { distance: number; normalized_distance: number; path: number[][] };
  createHMM: (numStates: number, numObservations: number) => void;
  setTransition: (fromState: number, toState: number, prob: number) => void;
  setEmission: (state: number, observation: number, prob: number) => void;
  setInitial: (state: number, prob: number) => void;
  viterbi: (observations: number[]) => number[];
  forward: (observations: number[]) => number;
  backward: (observations: number[]) => number;
  cleanupHMM: () => void;
}

export interface WasmAnalysisConfig {
  bufferSize?: number;
  hopSize?: number;
  mfccCoefficients?: number;
  dtwBandWidth?: number;
  hmmStates?: number;
  hmmObservations?: number;
  loadTimeout?: number;
}

export class WasmAnalysisService {
  private audioProcessor: WasmModule | null = null;
  private dtwProcessor: WasmModule | null = null;
  private hmmProcessor: WasmModule | null = null;
  private isInitialized = false;
  private config: Required<WasmAnalysisConfig>;

  constructor(config: WasmAnalysisConfig = {}) {
    this.config = {
      bufferSize: 2048,
      hopSize: 512,
      mfccCoefficients: 13,
      dtwBandWidth: 50,
      hmmStates: 8,
      hmmObservations: 64,
      loadTimeout: 10000,
      ...config
    };
  }

  async initialize(): Promise<void> {
    try {
      console.log('Initializing WebAssembly modules...');
      
      // Load all WASM modules in parallel with timeout
      const loadPromises = [
        this.loadWasmModule('/wasm/audio_processor.js', 'AudioProcessor'),
        this.loadWasmModule('/wasm/dtw.js', 'DTWProcessor'),
        this.loadWasmModule('/wasm/hmm.js', 'HMMProcessor')
      ];

      const results = await Promise.allSettled(
        loadPromises.map(promise => 
          this.withTimeout(promise, this.config.loadTimeout)
        )
      );

      // Check results and set up fallbacks
      this.audioProcessor = results[0].status === 'fulfilled' ? results[0].value : null;
      this.dtwProcessor = results[1].status === 'fulfilled' ? results[1].value : null;
      this.hmmProcessor = results[2].status === 'fulfilled' ? results[2].value : null;

      if (results[0].status === 'rejected') {
        console.warn('Audio processor WASM failed to load:', results[0].reason);
      }
      if (results[1].status === 'rejected') {
        console.warn('DTW processor WASM failed to load:', results[1].reason);
      }
      if (results[2].status === 'rejected') {
        console.warn('HMM processor WASM failed to load:', results[2].reason);
      }

      // Initialize HMM if available
      if (this.hmmProcessor) {
        await this.initializeHMM();
      }

      this.isInitialized = true;
      console.log('WASM Analysis Service initialized');
      
    } catch (error) {
      console.error('Failed to initialize WASM modules:', error);
      // Continue with JavaScript fallback
      this.isInitialized = true;
    }
  }

  private async loadWasmModule(path: string, moduleName: string): Promise<WasmModule> {
    try {
      // Dynamically import the WASM module
      const moduleFactory = await import(/* webpackIgnore: true */ path);
      const module = await moduleFactory.default();
      
      return {
        ready: Promise.resolve(module),
        ...module
      };
    } catch (error) {
      throw new Error(`Failed to load ${moduleName}: ${error}`);
    }
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('WASM module load timeout')), timeoutMs)
      )
    ]);
  }

  private async initializeHMM(): Promise<void> {
    if (!this.hmmProcessor) return;

    try {
      // Create HMM with phoneme states
      this.hmmProcessor.createHMM(this.config.hmmStates, this.config.hmmObservations);

      // Initialize with simple phoneme model
      // This is a simplified example - in production, you'd load trained parameters
      
      // Set initial probabilities (uniform distribution)
      for (let i = 0; i < this.config.hmmStates; i++) {
        this.hmmProcessor.setInitial(i, 1.0 / this.config.hmmStates);
      }

      // Set transition probabilities (simple left-to-right model)
      for (let i = 0; i < this.config.hmmStates; i++) {
        for (let j = 0; j < this.config.hmmStates; j++) {
          if (i === j) {
            this.hmmProcessor.setTransition(i, j, 0.7); // Self-transition
          } else if (j === i + 1) {
            this.hmmProcessor.setTransition(i, j, 0.3); // Forward transition
          } else {
            this.hmmProcessor.setTransition(i, j, 0.0); // No other transitions
          }
        }
      }

      // Set emission probabilities (simplified Gaussian-like distribution)
      for (let state = 0; state < this.config.hmmStates; state++) {
        for (let obs = 0; obs < this.config.hmmObservations; obs++) {
          // Simple Gaussian-like emission probability
          const mean = (state / this.config.hmmStates) * this.config.hmmObservations;
          const variance = 10.0;
          const prob = Math.exp(-0.5 * Math.pow(obs - mean, 2) / variance) / Math.sqrt(2 * Math.PI * variance);
          this.hmmProcessor.setEmission(state, obs, Math.max(prob, 1e-10));
        }
      }

      console.log('HMM initialized successfully');
    } catch (error) {
      console.error('Failed to initialize HMM:', error);
    }
  }

  async extractAdvancedFeatures(audioBuffer: AudioBuffer): Promise<{
    mfcc: number[][];
    pitch: number[];
    spectralCentroid: number[];
  }> {
    const audioData = audioBuffer.getChannelData(0);
    const features = {
      mfcc: [] as number[][],
      pitch: [] as number[],
      spectralCentroid: [] as number[]
    };

    try {
      if (this.audioProcessor) {
        // Use WASM for high-performance feature extraction
        const audioArray = Array.from(audioData);
        
        // Extract MFCC features
        features.mfcc = this.audioProcessor.processAudioFrames(
          audioArray,
          this.config.bufferSize,
          this.config.hopSize
        );

        // Extract pitch and spectral centroid for each frame
        for (let i = 0; i < audioData.length - this.config.bufferSize; i += this.config.hopSize) {
          const frame = Array.from(audioData.slice(i, i + this.config.bufferSize));
          
          features.pitch.push(
            this.audioProcessor.calculatePitch(frame, audioBuffer.sampleRate)
          );
          
          features.spectralCentroid.push(
            this.audioProcessor.calculateSpectralCentroid(frame, audioBuffer.sampleRate)
          );
        }
      } else {
        // JavaScript fallback for basic feature extraction
        features.mfcc = this.extractMFCCFallback(audioData, audioBuffer.sampleRate);
        features.pitch = this.extractPitchFallback(audioData, audioBuffer.sampleRate);
        features.spectralCentroid = this.extractSpectralCentroidFallback(audioData, audioBuffer.sampleRate);
      }
    } catch (error) {
      console.error('Error in feature extraction:', error);
      // Return empty features on error
    }

    return features;
  }

  async alignAudioSequences(sequence1: number[][], sequence2: number[][]): Promise<{
    distance: number;
    normalizedDistance: number;
    alignment?: number[][];
  }> {
    try {
      if (this.dtwProcessor) {
        // Use WASM DTW for high performance
        const result = this.dtwProcessor.dtw_align(sequence1, sequence2, this.config.dtwBandWidth);
        return {
          distance: result.distance,
          normalizedDistance: result.normalized_distance,
          alignment: result.path
        };
      } else {
        // JavaScript fallback for DTW
        return this.dtwFallback(sequence1, sequence2);
      }
    } catch (error) {
      console.error('Error in DTW alignment:', error);
      return {
        distance: Infinity,
        normalizedDistance: Infinity
      };
    }
  }

  async recognizePhonemes(observations: number[]): Promise<{
    states: number[];
    probability: number;
  }> {
    try {
      if (this.hmmProcessor) {
        // Quantize observations to discrete values
        const discreteObs = observations.map(obs => 
          Math.max(0, Math.min(this.config.hmmObservations - 1, Math.floor(obs * this.config.hmmObservations)))
        );

        const states = this.hmmProcessor.viterbi(discreteObs);
        const probability = Math.exp(this.hmmProcessor.forward(discreteObs));

        return { states, probability };
      } else {
        // Simple fallback phoneme recognition
        return this.phonemeRecognitionFallback(observations);
      }
    } catch (error) {
      console.error('Error in phoneme recognition:', error);
      return {
        states: [],
        probability: 0
      };
    }
  }

  async analyzeRecitationWithWasm(
    recordingData: RecordingData,
    referenceFeatures?: number[][]
  ): Promise<{
    alignment?: { distance: number; normalizedDistance: number };
    phonemes?: { states: number[]; probability: number };
    advancedFeatures?: { mfcc: number[][]; pitch: number[]; spectralCentroid: number[] };
  }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const results: any = {};

    try {
      // Extract advanced features
      results.advancedFeatures = await this.extractAdvancedFeatures(recordingData.audioBuffer);

      // Align with reference if provided
      if (referenceFeatures && results.advancedFeatures.mfcc.length > 0) {
        results.alignment = await this.alignAudioSequences(
          results.advancedFeatures.mfcc,
          referenceFeatures
        );
      }

      // Phoneme recognition
      if (results.advancedFeatures.spectralCentroid.length > 0) {
        results.phonemes = await this.recognizePhonemes(results.advancedFeatures.spectralCentroid);
      }

    } catch (error) {
      console.error('Error in WASM analysis:', error);
    }

    return results;
  }

  // JavaScript fallback implementations
  private extractMFCCFallback(audioData: Float32Array, _sampleRate: number): number[][] {
    // Simplified MFCC extraction
    const features: number[][] = [];
    const frameSize = this.config.bufferSize;
    const hopSize = this.config.hopSize;

    for (let i = 0; i < audioData.length - frameSize; i += hopSize) {
      const frame = audioData.slice(i, i + frameSize);
      
      // Simple energy-based features as MFCC approximation
      const energy = Array.from(frame).reduce((sum, val) => sum + val * val, 0) / frame.length;
      const zcr = this.calculateZeroCrossingRate(frame);
      
      // Create simplified MFCC-like features
      const mfccFrame = new Array(this.config.mfccCoefficients).fill(0);
      mfccFrame[0] = Math.log(energy + 1e-10);
      mfccFrame[1] = zcr;
      
      // Fill remaining coefficients with noise (placeholder)
      for (let j = 2; j < this.config.mfccCoefficients; j++) {
        mfccFrame[j] = Math.random() * 0.1;
      }
      
      features.push(mfccFrame);
    }

    return features;
  }

  private extractPitchFallback(audioData: Float32Array, _sampleRate: number): number[] {
    const features: number[] = [];
    const frameSize = this.config.bufferSize;
    const hopSize = this.config.hopSize;

    for (let i = 0; i < audioData.length - frameSize; i += hopSize) {
      const frame = audioData.slice(i, i + frameSize);
      
      // Simple autocorrelation-based pitch estimation
      let maxCorr = 0;
      let bestLag = 0;
      
      for (let lag = Math.floor(_sampleRate / 400); lag < Math.floor(_sampleRate / 80); lag++) {
        if (lag >= frame.length) break;
        
        let corr = 0;
        for (let j = 0; j < frame.length - lag; j++) {
          corr += frame[j] * frame[j + lag];
        }
        
        if (corr > maxCorr) {
          maxCorr = corr;
          bestLag = lag;
        }
      }
      
      const pitch = bestLag > 0 ? _sampleRate / bestLag : 0;
      features.push(pitch);
    }

    return features;
  }

  private extractSpectralCentroidFallback(audioData: Float32Array, _sampleRate: number): number[] {
    const features: number[] = [];
    const frameSize = this.config.bufferSize;
    const hopSize = this.config.hopSize;

    for (let i = 0; i < audioData.length - frameSize; i += hopSize) {
      const frame = audioData.slice(i, i + frameSize);
      
      // Simple spectral centroid approximation
      let weightedSum = 0;
      let magnitudeSum = 0;
      
      for (let j = 0; j < frame.length; j++) {
        const magnitude = Math.abs(frame[j]);
        const frequency = j * _sampleRate / (2 * frame.length);
        weightedSum += frequency * magnitude;
        magnitudeSum += magnitude;
      }
      
      const centroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
      features.push(centroid);
    }

    return features;
  }

  private calculateZeroCrossingRate(frame: Float32Array): number {
    let crossings = 0;
    for (let i = 1; i < frame.length; i++) {
      if ((frame[i] >= 0) !== (frame[i - 1] >= 0)) {
        crossings++;
      }
    }
    return crossings / (frame.length - 1);
  }

  private dtwFallback(seq1: number[][], seq2: number[][]): {
    distance: number;
    normalizedDistance: number;
  } {
    // Simple DTW implementation
    const n = seq1.length;
    const m = seq2.length;
    
    if (n === 0 || m === 0) {
      return { distance: Infinity, normalizedDistance: Infinity };
    }
    
    const costMatrix = Array(n).fill(null).map(() => Array(m).fill(Infinity));
    
    // Calculate Euclidean distances
    const distance = (a: number[], b: number[]): number => {
      let sum = 0;
      for (let i = 0; i < Math.min(a.length, b.length); i++) {
        sum += (a[i] - b[i]) ** 2;
      }
      return Math.sqrt(sum);
    };
    
    costMatrix[0][0] = distance(seq1[0], seq2[0]);
    
    // Fill first row and column
    for (let i = 1; i < n; i++) {
      costMatrix[i][0] = costMatrix[i-1][0] + distance(seq1[i], seq2[0]);
    }
    for (let j = 1; j < m; j++) {
      costMatrix[0][j] = costMatrix[0][j-1] + distance(seq1[0], seq2[j]);
    }
    
    // Fill the rest
    for (let i = 1; i < n; i++) {
      for (let j = 1; j < m; j++) {
        const cost = distance(seq1[i], seq2[j]);
        costMatrix[i][j] = cost + Math.min(
          costMatrix[i-1][j],     // insertion
          costMatrix[i][j-1],     // deletion
          costMatrix[i-1][j-1]    // match
        );
      }
    }
    
    const totalDistance = costMatrix[n-1][m-1];
    return {
      distance: totalDistance,
      normalizedDistance: totalDistance / Math.max(n, m)
    };
  }

  private phonemeRecognitionFallback(observations: number[]): {
    states: number[];
    probability: number;
  } {
    // Simple state assignment based on observation values
    const states = observations.map(obs => {
      const normalized = Math.max(0, Math.min(1, obs));
      return Math.floor(normalized * this.config.hmmStates);
    });
    
    return {
      states,
      probability: 0.5 // Dummy probability
    };
  }

  dispose(): void {
    if (this.hmmProcessor) {
      try {
        this.hmmProcessor.cleanupHMM();
      } catch (error) {
        console.error('Error cleaning up HMM:', error);
      }
    }
    
    this.audioProcessor = null;
    this.dtwProcessor = null;
    this.hmmProcessor = null;
    this.isInitialized = false;
  }
}