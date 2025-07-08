#!/bin/bash

# WebAssembly Build Script for Advanced Audio Processing
# Based on QuranPOC implementation

set -e

echo "Building WebAssembly modules for advanced audio processing..."

# Check if Emscripten is available
if ! command -v emcc &> /dev/null; then
    echo "Error: Emscripten not found. Please install Emscripten first."
    echo "Visit: https://emscripten.org/docs/getting_started/downloads.html"
    exit 1
fi

# Create output directory
mkdir -p ../public/wasm

# Compile audio processor
echo "Compiling audio_processor.cpp..."
emcc audio_processor.cpp \
    -o ../public/wasm/audio_processor.js \
    -s EXPORTED_FUNCTIONS="['_extractMFCC', '_processAudioFrames', '_calculatePitch', '_calculateSpectralCentroid']" \
    -s EXPORTED_RUNTIME_METHODS="['ccall', 'cwrap']" \
    -s MODULARIZE=1 \
    -s EXPORT_NAME="AudioProcessor" \
    -s ENVIRONMENT='web' \
    -s SINGLE_FILE=1 \
    -O3 \
    --bind

# Compile DTW algorithm
echo "Compiling dtw.cpp..."
emcc dtw.cpp \
    -o ../public/wasm/dtw.js \
    -s EXPORTED_FUNCTIONS="['_computeDTW', '_dtw_distance']" \
    -s EXPORTED_RUNTIME_METHODS="['ccall', 'cwrap']" \
    -s MODULARIZE=1 \
    -s EXPORT_NAME="DTWProcessor" \
    -s ENVIRONMENT='web' \
    -s SINGLE_FILE=1 \
    -O3 \
    --bind

# Compile HMM algorithm
echo "Compiling hmm.cpp..."
emcc hmm.cpp \
    -o ../public/wasm/hmm.js \
    -s EXPORTED_FUNCTIONS="['_viterbi', '_forward', '_backward']" \
    -s EXPORTED_RUNTIME_METHODS="['ccall', 'cwrap']" \
    -s MODULARIZE=1 \
    -s EXPORT_NAME="HMMProcessor" \
    -s ENVIRONMENT='web' \
    -s SINGLE_FILE=1 \
    -O3 \
    --bind

echo "WebAssembly modules built successfully!"
echo "Output files:"
echo "  - ../public/wasm/audio_processor.js"
echo "  - ../public/wasm/dtw.js"
echo "  - ../public/wasm/hmm.js"