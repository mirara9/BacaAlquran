/**
 * AudioWorklet processor for real-time audio feature extraction
 * Based on the QuranPOC implementation
 */

class FeatureExtractorProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    
    // Configuration from options
    this.bufferSize = options.processorOptions?.bufferSize || 2048;
    this.hopSize = options.processorOptions?.hopSize || 512;
    this.sampleRate = options.processorOptions?.sampleRate || 44100;
    this.mfccCoefficients = options.processorOptions?.mfccCoefficients || 13;
    
    // Audio processing buffers
    this.audioBuffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    
    // Feature extraction state
    this.frameCount = 0;
    this.isProcessing = false;
    
    // Listen for messages from main thread
    this.port.onmessage = (event) => {
      if (event.data.command === 'configure') {
        this.configure(event.data.config);
      } else if (event.data.command === 'reset') {
        this.reset();
      }
    };
  }
  
  configure(config) {
    this.bufferSize = config.bufferSize || this.bufferSize;
    this.hopSize = config.hopSize || this.hopSize;
    this.mfccCoefficients = config.mfccCoefficients || this.mfccCoefficients;
    
    // Resize buffer if needed
    if (this.audioBuffer.length !== this.bufferSize) {
      this.audioBuffer = new Float32Array(this.bufferSize);
      this.bufferIndex = 0;
    }
  }
  
  reset() {
    this.audioBuffer.fill(0);
    this.bufferIndex = 0;
    this.frameCount = 0;
  }
  
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    
    if (input.length > 0) {
      const inputChannel = input[0];
      
      // Copy input to output (pass-through)
      if (output.length > 0) {
        output[0].set(inputChannel);
      }
      
      // Process audio for feature extraction
      this.processAudioFrame(inputChannel);
    }
    
    return true;
  }
  
  processAudioFrame(audioData) {
    // Fill audio buffer
    for (let i = 0; i < audioData.length; i++) {
      this.audioBuffer[this.bufferIndex] = audioData[i];
      this.bufferIndex = (this.bufferIndex + 1) % this.bufferSize;
      
      // When we have enough samples, extract features
      if (this.bufferIndex === 0 && !this.isProcessing) {
        this.extractFeatures();
      }
    }
  }
  
  extractFeatures() {
    this.isProcessing = true;
    
    try {
      // Extract basic audio features
      const features = {
        timestamp: currentTime,
        frameCount: this.frameCount++,
        energy: this.calculateEnergy(),
        zeroCrossingRate: this.calculateZeroCrossingRate(),
        spectralCentroid: this.calculateSpectralCentroid(),
        // Note: MFCC will be calculated in main thread using Meyda
        audioData: Array.from(this.audioBuffer) // Send raw audio for MFCC
      };
      
      // Send features to main thread
      this.port.postMessage({
        type: 'features',
        data: features
      });
      
    } catch (error) {
      this.port.postMessage({
        type: 'error',
        error: error.message
      });
    } finally {
      this.isProcessing = false;
    }
  }
  
  calculateEnergy() {
    let energy = 0;
    for (let i = 0; i < this.audioBuffer.length; i++) {
      energy += this.audioBuffer[i] * this.audioBuffer[i];
    }
    return energy / this.audioBuffer.length;
  }
  
  calculateZeroCrossingRate() {
    let crossings = 0;
    for (let i = 1; i < this.audioBuffer.length; i++) {
      if ((this.audioBuffer[i] >= 0) !== (this.audioBuffer[i - 1] >= 0)) {
        crossings++;
      }
    }
    return crossings / (this.audioBuffer.length - 1);
  }
  
  calculateSpectralCentroid() {
    // Simple approximation - in practice, you'd use FFT
    // This is a placeholder implementation
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < this.audioBuffer.length; i++) {
      const magnitude = Math.abs(this.audioBuffer[i]);
      weightedSum += i * magnitude;
      magnitudeSum += magnitude;
    }
    
    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  }
}

// Register the processor
registerProcessor('feature-extractor', FeatureExtractorProcessor);