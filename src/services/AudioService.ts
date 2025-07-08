import Meyda from 'meyda';

export interface AudioFeatures {
  timestamp: number;
  frameCount: number;
  energy: number;
  zeroCrossingRate: number;
  spectralCentroid: number;
  mfcc?: number[];
  pitch?: number;
  rms?: number;
}

export interface AudioServiceConfig {
  bufferSize?: number;
  hopSize?: number;
  sampleRate?: number;
  mfccCoefficients?: number;
  enableFeatureExtraction?: boolean;
  enableRealTimeProcessing?: boolean;
}

export interface RecordingData {
  id: string;
  audioBuffer: AudioBuffer;
  features: AudioFeatures[];
  duration: number;
  sampleRate: number;
  channels: number;
}

export class AudioService {
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private audioWorkletNode: AudioWorkletNode | null = null;
  private scriptProcessorNode: ScriptProcessorNode | null = null;
  private analyzer: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  
  private config: Required<AudioServiceConfig>;
  private isRecording = false;
  private recordedChunks: Blob[] = [];
  private features: AudioFeatures[] = [];
  private onFeaturesCallback?: (features: AudioFeatures) => void;
  private onAudioLevelCallback?: (level: number) => void;
  
  // Meyda analyzer for MFCC extraction
  private meydaAnalyzer: any = null;
  
  constructor(config: AudioServiceConfig = {}) {
    this.config = {
      bufferSize: 2048,
      hopSize: 512,
      sampleRate: 44100,
      mfccCoefficients: 13,
      enableFeatureExtraction: true,
      enableRealTimeProcessing: true,
      ...config
    };
  }
  
  async initialize(): Promise<void> {
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        latencyHint: 'interactive',
        sampleRate: this.config.sampleRate
      });
      
      // Try to load AudioWorklet processor
      if (this.config.enableRealTimeProcessing) {
        await this.loadAudioWorklet();
      }
      
      console.log('AudioService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AudioService:', error);
      throw error;
    }
  }
  
  private async loadAudioWorklet(): Promise<void> {
    try {
      if (!this.audioContext) throw new Error('AudioContext not initialized');
      
      // Load AudioWorklet processor
      await this.audioContext.audioWorklet.addModule('/worklets/feature-extractor.js');
      console.log('AudioWorklet loaded successfully');
    } catch (error) {
      console.warn('AudioWorklet not supported, falling back to ScriptProcessor:', error);
    }
  }
  
  async startRecording(): Promise<void> {
    if (this.isRecording) return;
    
    try {
      // Get user media
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: this.config.sampleRate
        }
      });
      
      // Set up MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: this.getSupportedMimeType()
      });
      
      this.recordedChunks = [];
      this.features = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };
      
      // Set up audio processing
      if (this.config.enableFeatureExtraction) {
        await this.setupAudioProcessing();
      }
      
      // Start recording
      this.mediaRecorder.start(100); // Collect data every 100ms
      this.isRecording = true;
      
      console.log('Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }
  
  private async setupAudioProcessing(): Promise<void> {
    if (!this.audioContext || !this.stream) return;
    
    try {
      // Create source node from stream
      this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
      
      // Create analyzer for audio level
      this.analyzer = this.audioContext.createAnalyser();
      this.analyzer.fftSize = 256;
      this.analyzer.smoothingTimeConstant = 0.3;
      
      // Try to create AudioWorklet node
      if (this.audioContext.audioWorklet) {
        try {
          this.audioWorkletNode = new AudioWorkletNode(this.audioContext, 'feature-extractor', {
            processorOptions: {
              bufferSize: this.config.bufferSize,
              hopSize: this.config.hopSize,
              sampleRate: this.config.sampleRate,
              mfccCoefficients: this.config.mfccCoefficients
            }
          });
          
          // Listen for features from AudioWorklet
          this.audioWorkletNode.port.onmessage = (event) => {
            if (event.data.type === 'features') {
              this.processFeatures(event.data.data);
            }
          };
          
          // Connect nodes
          this.sourceNode.connect(this.audioWorkletNode);
          this.audioWorkletNode.connect(this.analyzer);
          this.analyzer.connect(this.audioContext.destination);
          
        } catch (error) {
          console.warn('AudioWorklet failed, using ScriptProcessor:', error);
          this.setupScriptProcessor();
        }
      } else {
        this.setupScriptProcessor();
      }
      
      // Set up Meyda for MFCC extraction
      this.setupMeyda();
      
      // Start audio level monitoring
      this.startAudioLevelMonitoring();
      
    } catch (error) {
      console.error('Failed to setup audio processing:', error);
    }
  }
  
  private setupScriptProcessor(): void {
    if (!this.audioContext || !this.sourceNode || !this.analyzer) return;
    
    try {
      // Create script processor as fallback
      this.scriptProcessorNode = this.audioContext.createScriptProcessor(
        this.config.bufferSize, 1, 1
      );
      
      this.scriptProcessorNode.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer;
        const audioData = inputBuffer.getChannelData(0);
        
        // Extract basic features
        const features: AudioFeatures = {
          timestamp: this.audioContext!.currentTime,
          frameCount: 0,
          energy: this.calculateEnergy(audioData),
          zeroCrossingRate: this.calculateZeroCrossingRate(audioData),
          spectralCentroid: 0 // Placeholder
        };
        
        this.processFeatures(features);
      };
      
      // Connect nodes
      this.sourceNode.connect(this.scriptProcessorNode);
      this.scriptProcessorNode.connect(this.analyzer);
      this.analyzer.connect(this.audioContext.destination);
      
    } catch (error) {
      console.error('Failed to setup ScriptProcessor:', error);
    }
  }
  
  private setupMeyda(): void {
    if (!this.audioContext || !this.sourceNode) return;
    
    try {
      // Initialize Meyda
      this.meydaAnalyzer = Meyda.createMeydaAnalyzer({
        audioContext: this.audioContext,
        source: this.sourceNode,
        bufferSize: this.config.bufferSize,
        hopSize: this.config.hopSize,
        featureExtractors: ['mfcc', 'pitch', 'rms', 'spectralCentroid'],
        numberOfMFCCCoefficients: this.config.mfccCoefficients,
        callback: (features: any) => {
          // Add MFCC features to the current feature set
          if (this.features.length > 0) {
            const lastFeature = this.features[this.features.length - 1];
            lastFeature.mfcc = features.mfcc;
            lastFeature.pitch = features.pitch;
            lastFeature.rms = features.rms;
            lastFeature.spectralCentroid = features.spectralCentroid;
          }
        }
      });
      
      // Start Meyda analyzer
      this.meydaAnalyzer.start();
      
    } catch (error) {
      console.error('Failed to setup Meyda:', error);
    }
  }
  
  private startAudioLevelMonitoring(): void {
    if (!this.analyzer) return;
    
    const bufferLength = this.analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const updateLevel = () => {
      if (!this.isRecording || !this.analyzer) return;
      
      this.analyzer.getByteFrequencyData(dataArray);
      
      // Calculate average level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const averageLevel = sum / bufferLength;
      const normalizedLevel = (averageLevel / 255) * 100;
      
      if (this.onAudioLevelCallback) {
        this.onAudioLevelCallback(normalizedLevel);
      }
      
      requestAnimationFrame(updateLevel);
    };
    
    requestAnimationFrame(updateLevel);
  }
  
  private processFeatures(features: AudioFeatures): void {
    this.features.push(features);
    
    if (this.onFeaturesCallback) {
      this.onFeaturesCallback(features);
    }
  }
  
  private calculateEnergy(audioData: Float32Array): number {
    let energy = 0;
    for (let i = 0; i < audioData.length; i++) {
      energy += audioData[i] * audioData[i];
    }
    return energy / audioData.length;
  }
  
  private calculateZeroCrossingRate(audioData: Float32Array): number {
    let crossings = 0;
    for (let i = 1; i < audioData.length; i++) {
      if ((audioData[i] >= 0) !== (audioData[i - 1] >= 0)) {
        crossings++;
      }
    }
    return crossings / (audioData.length - 1);
  }
  
  async stopRecording(): Promise<RecordingData> {
    if (!this.isRecording || !this.mediaRecorder) {
      throw new Error('Not currently recording');
    }
    
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        this.isRecording = false;
        
        // Stop Meyda analyzer
        if (this.meydaAnalyzer) {
          this.meydaAnalyzer.stop();
        }
        
        // Cleanup audio nodes
        if (this.audioWorkletNode) {
          this.audioWorkletNode.disconnect();
          this.audioWorkletNode = null;
        }
        
        if (this.scriptProcessorNode) {
          this.scriptProcessorNode.disconnect();
          this.scriptProcessorNode = null;
        }
        
        if (this.sourceNode) {
          this.sourceNode.disconnect();
          this.sourceNode = null;
        }
        
        if (this.analyzer) {
          this.analyzer.disconnect();
          this.analyzer = null;
        }
        
        // Stop stream
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
          this.stream = null;
        }
      };
      
      this.mediaRecorder!.onstop = async () => {
        try {
          cleanup();
          
          // Create audio blob
          const audioBlob = new Blob(this.recordedChunks, { type: 'audio/wav' });
          
          // Convert to AudioBuffer
          const arrayBuffer = await audioBlob.arrayBuffer();
          const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
          
          const recordingData: RecordingData = {
            id: crypto.randomUUID(),
            audioBuffer,
            features: this.features,
            duration: audioBuffer.duration,
            sampleRate: audioBuffer.sampleRate,
            channels: audioBuffer.numberOfChannels
          };
          
          resolve(recordingData);
        } catch (error) {
          reject(error);
        }
      };
      
      this.mediaRecorder!.onerror = (error) => {
        cleanup();
        reject(error);
      };
      
      this.mediaRecorder!.stop();
    });
  }
  
  pauseRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.pause();
    }
  }
  
  resumeRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.resume();
    }
  }
  
  setOnFeaturesCallback(callback: (features: AudioFeatures) => void): void {
    this.onFeaturesCallback = callback;
  }
  
  setOnAudioLevelCallback(callback: (level: number) => void): void {
    this.onAudioLevelCallback = callback;
  }
  
  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/mp4;codecs=mp4a.40.2',
      'audio/wav',
      'audio/ogg;codecs=opus'
    ];
    
    return types.find(type => MediaRecorder.isTypeSupported(type)) || 'audio/wav';
  }
  
  dispose(): void {
    if (this.isRecording) {
      this.stopRecording().catch(console.error);
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}