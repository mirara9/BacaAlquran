#include <vector>
#include <cmath>
#include <algorithm>
#include <emscripten/bind.h>

// Advanced Audio Processing for Quran Recitation Analysis
// Based on QuranPOC implementation

const double PI = 3.14159265358979323846;

// MFCC Configuration
const int NUM_MEL_FILTERS = 26;
const int NUM_MFCC_COEFFS = 13;
const double SAMPLE_RATE = 44100.0;
const double PRE_EMPHASIS = 0.97;

// Apply Hamming window
std::vector<double> hamming_window(int length) {
    std::vector<double> window(length);
    for (int i = 0; i < length; i++) {
        window[i] = 0.54 - 0.46 * cos(2.0 * PI * i / (length - 1));
    }
    return window;
}

// Apply Hann window
std::vector<double> hann_window(int length) {
    std::vector<double> window(length);
    for (int i = 0; i < length; i++) {
        window[i] = 0.5 * (1.0 - cos(2.0 * PI * i / (length - 1)));
    }
    return window;
}

// Simple DFT implementation
std::vector<double> dft(const std::vector<double>& signal) {
    int N = signal.size();
    std::vector<double> magnitude(N / 2 + 1);
    
    for (int k = 0; k <= N / 2; k++) {
        double real = 0.0, imag = 0.0;
        for (int n = 0; n < N; n++) {
            double angle = -2.0 * PI * k * n / N;
            real += signal[n] * cos(angle);
            imag += signal[n] * sin(angle);
        }
        magnitude[k] = sqrt(real * real + imag * imag);
    }
    
    return magnitude;
}

// Create mel filter bank
std::vector<std::vector<double>> create_mel_filterbank(int nfft, double sample_rate) {
    int nfilters = NUM_MEL_FILTERS;
    std::vector<std::vector<double>> filterbank(nfilters, std::vector<double>(nfft / 2 + 1, 0.0));
    
    // Convert Hz to Mel
    auto hz_to_mel = [](double hz) {
        return 2595.0 * log10(1.0 + hz / 700.0);
    };
    
    // Convert Mel to Hz
    auto mel_to_hz = [](double mel) {
        return 700.0 * (pow(10.0, mel / 2595.0) - 1.0);
    };
    
    double low_freq_mel = hz_to_mel(0);
    double high_freq_mel = hz_to_mel(sample_rate / 2);
    
    std::vector<double> mel_points(nfilters + 2);
    for (int i = 0; i < nfilters + 2; i++) {
        mel_points[i] = low_freq_mel + i * (high_freq_mel - low_freq_mel) / (nfilters + 1);
    }
    
    std::vector<int> bin_points(nfilters + 2);
    for (int i = 0; i < nfilters + 2; i++) {
        bin_points[i] = static_cast<int>(floor((nfft + 1) * mel_to_hz(mel_points[i]) / sample_rate));
    }
    
    for (int m = 1; m <= nfilters; m++) {
        int f_m_minus = bin_points[m - 1];
        int f_m = bin_points[m];
        int f_m_plus = bin_points[m + 1];
        
        for (int k = f_m_minus; k < f_m; k++) {
            filterbank[m - 1][k] = static_cast<double>(k - f_m_minus) / (f_m - f_m_minus);
        }
        for (int k = f_m; k < f_m_plus; k++) {
            filterbank[m - 1][k] = static_cast<double>(f_m_plus - k) / (f_m_plus - f_m);
        }
    }
    
    return filterbank;
}

// DCT for MFCC
std::vector<double> dct(const std::vector<double>& signal, int num_coeffs) {
    int N = signal.size();
    std::vector<double> dct_coeffs(num_coeffs);
    
    for (int k = 0; k < num_coeffs; k++) {
        double sum = 0.0;
        for (int n = 0; n < N; n++) {
            sum += signal[n] * cos(PI * k * (2 * n + 1) / (2 * N));
        }
        dct_coeffs[k] = sum;
    }
    
    return dct_coeffs;
}

// Extract MFCC coefficients
std::vector<double> extractMFCC(const std::vector<double>& audio_frame, int frame_length, int num_coeffs = NUM_MFCC_COEFFS) {
    std::vector<double> frame = audio_frame;
    
    // Pre-emphasis
    for (int i = frame.size() - 1; i > 0; i--) {
        frame[i] -= PRE_EMPHASIS * frame[i - 1];
    }
    
    // Apply windowing
    auto window = hamming_window(frame_length);
    for (int i = 0; i < frame_length && i < frame.size(); i++) {
        frame[i] *= window[i];
    }
    
    // Compute DFT
    auto spectrum = dft(frame);
    
    // Apply mel filter bank
    auto filterbank = create_mel_filterbank(frame_length, SAMPLE_RATE);
    std::vector<double> mel_energies(NUM_MEL_FILTERS, 0.0);
    
    for (int i = 0; i < NUM_MEL_FILTERS; i++) {
        for (int j = 0; j < spectrum.size(); j++) {
            mel_energies[i] += spectrum[j] * filterbank[i][j];
        }
        mel_energies[i] = log(mel_energies[i] + 1e-10); // Add small epsilon to avoid log(0)
    }
    
    // Apply DCT
    auto mfcc = dct(mel_energies, num_coeffs);
    
    return mfcc;
}

// Process audio frames and extract features
emscripten::val processAudioFrames(const emscripten::val& audio_data, int frame_length, int hop_size) {
    std::vector<double> audio = emscripten::vecFromJSArray<double>(audio_data);
    std::vector<std::vector<double>> features;
    
    for (int i = 0; i + frame_length <= audio.size(); i += hop_size) {
        std::vector<double> frame(audio.begin() + i, audio.begin() + i + frame_length);
        auto mfcc = extractMFCC(frame, frame_length);
        features.push_back(mfcc);
    }
    
    return emscripten::val::array(features.begin(), features.end());
}

// Calculate pitch using autocorrelation
double calculatePitch(const std::vector<double>& audio_frame, double sample_rate, double min_freq = 80.0, double max_freq = 400.0) {
    int min_period = static_cast<int>(sample_rate / max_freq);
    int max_period = static_cast<int>(sample_rate / min_freq);
    
    double max_autocorr = 0.0;
    int best_period = 0;
    
    for (int period = min_period; period <= max_period && period < audio_frame.size(); period++) {
        double autocorr = 0.0;
        for (int i = 0; i < audio_frame.size() - period; i++) {
            autocorr += audio_frame[i] * audio_frame[i + period];
        }
        
        if (autocorr > max_autocorr) {
            max_autocorr = autocorr;
            best_period = period;
        }
    }
    
    return best_period > 0 ? sample_rate / best_period : 0.0;
}

// Calculate spectral centroid
double calculateSpectralCentroid(const std::vector<double>& audio_frame, double sample_rate) {
    auto spectrum = dft(audio_frame);
    
    double weighted_sum = 0.0;
    double magnitude_sum = 0.0;
    
    for (int i = 0; i < spectrum.size(); i++) {
        double frequency = i * sample_rate / (2 * (spectrum.size() - 1));
        weighted_sum += frequency * spectrum[i];
        magnitude_sum += spectrum[i];
    }
    
    return magnitude_sum > 0 ? weighted_sum / magnitude_sum : 0.0;
}

// Emscripten bindings
EMSCRIPTEN_BINDINGS(audio_processor) {
    emscripten::function("extractMFCC", &extractMFCC);
    emscripten::function("processAudioFrames", &processAudioFrames);
    emscripten::function("calculatePitch", &calculatePitch);
    emscripten::function("calculateSpectralCentroid", &calculateSpectralCentroid);
    
    emscripten::register_vector<double>("VectorDouble");
    emscripten::register_vector<std::vector<double>>("VectorVectorDouble");
}