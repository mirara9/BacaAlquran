#include <vector>
#include <cmath>
#include <algorithm>
#include <limits>
#include <emscripten/bind.h>

// Dynamic Time Warping for Audio Alignment
// Based on QuranPOC implementation

// Distance metrics
enum DistanceMetric {
    EUCLIDEAN,
    MANHATTAN,
    COSINE
};

// Calculate distance between two feature vectors
double calculateDistance(const std::vector<double>& vec1, const std::vector<double>& vec2, DistanceMetric metric = EUCLIDEAN) {
    if (vec1.size() != vec2.size()) {
        return std::numeric_limits<double>::infinity();
    }
    
    double distance = 0.0;
    
    switch (metric) {
        case EUCLIDEAN: {
            for (size_t i = 0; i < vec1.size(); i++) {
                double diff = vec1[i] - vec2[i];
                distance += diff * diff;
            }
            return sqrt(distance);
        }
        
        case MANHATTAN: {
            for (size_t i = 0; i < vec1.size(); i++) {
                distance += std::abs(vec1[i] - vec2[i]);
            }
            return distance;
        }
        
        case COSINE: {
            double dot_product = 0.0;
            double norm1 = 0.0;
            double norm2 = 0.0;
            
            for (size_t i = 0; i < vec1.size(); i++) {
                dot_product += vec1[i] * vec2[i];
                norm1 += vec1[i] * vec1[i];
                norm2 += vec2[i] * vec2[i];
            }
            
            if (norm1 == 0.0 || norm2 == 0.0) {
                return 1.0; // Maximum cosine distance
            }
            
            return 1.0 - (dot_product / (sqrt(norm1) * sqrt(norm2)));
        }
    }
    
    return distance;
}

// DTW with Sakoe-Chiba band constraint
struct DTWResult {
    double distance;
    std::vector<std::pair<int, int>> path;
    std::vector<std::vector<double>> cost_matrix;
};

DTWResult computeDTW(const std::vector<std::vector<double>>& sequence1,
                     const std::vector<std::vector<double>>& sequence2,
                     int band_width = -1,
                     DistanceMetric metric = EUCLIDEAN,
                     bool return_path = true) {
    
    int n = sequence1.size();
    int m = sequence2.size();
    
    if (n == 0 || m == 0) {
        return {std::numeric_limits<double>::infinity(), {}, {}};
    }
    
    // If no band width specified, use unconstrained DTW
    if (band_width <= 0) {
        band_width = std::max(n, m);
    }
    
    // Initialize cost matrix
    std::vector<std::vector<double>> cost_matrix(n, std::vector<double>(m, std::numeric_limits<double>::infinity()));
    
    // Compute local distance matrix
    std::vector<std::vector<double>> local_distances(n, std::vector<double>(m));
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < m; j++) {
            if (std::abs(i - j) <= band_width) {
                local_distances[i][j] = calculateDistance(sequence1[i], sequence2[j], metric);
            } else {
                local_distances[i][j] = std::numeric_limits<double>::infinity();
            }
        }
    }
    
    // Initialize first cell
    cost_matrix[0][0] = local_distances[0][0];
    
    // Fill first row
    for (int j = 1; j < m && j <= band_width; j++) {
        cost_matrix[0][j] = cost_matrix[0][j-1] + local_distances[0][j];
    }
    
    // Fill first column
    for (int i = 1; i < n && i <= band_width; i++) {
        cost_matrix[i][0] = cost_matrix[i-1][0] + local_distances[i][0];
    }
    
    // Fill the rest of the matrix
    for (int i = 1; i < n; i++) {
        int j_start = std::max(1, i - band_width);
        int j_end = std::min(m, i + band_width + 1);
        
        for (int j = j_start; j < j_end; j++) {
            if (local_distances[i][j] == std::numeric_limits<double>::infinity()) {
                continue;
            }
            
            double cost = local_distances[i][j];
            double min_prev = std::numeric_limits<double>::infinity();
            
            // Check three possible previous cells
            if (i > 0 && j > 0) {
                min_prev = std::min(min_prev, cost_matrix[i-1][j-1]); // diagonal
            }
            if (i > 0) {
                min_prev = std::min(min_prev, cost_matrix[i-1][j]); // vertical
            }
            if (j > 0) {
                min_prev = std::min(min_prev, cost_matrix[i][j-1]); // horizontal
            }
            
            cost_matrix[i][j] = cost + min_prev;
        }
    }
    
    DTWResult result;
    result.distance = cost_matrix[n-1][m-1];
    result.cost_matrix = cost_matrix;
    
    // Backtrack to find optimal path
    if (return_path && result.distance != std::numeric_limits<double>::infinity()) {
        std::vector<std::pair<int, int>> path;
        int i = n - 1;
        int j = m - 1;
        
        while (i > 0 || j > 0) {
            path.push_back({i, j});
            
            if (i == 0) {
                j--;
            } else if (j == 0) {
                i--;
            } else {
                double diag = cost_matrix[i-1][j-1];
                double up = cost_matrix[i-1][j];
                double left = cost_matrix[i][j-1];
                
                if (diag <= up && diag <= left) {
                    i--; j--;
                } else if (up <= left) {
                    i--;
                } else {
                    j--;
                }
            }
        }
        path.push_back({0, 0});
        
        std::reverse(path.begin(), path.end());
        result.path = path;
    }
    
    return result;
}

// Wrapper function for JavaScript interface
emscripten::val dtw_distance(const emscripten::val& seq1_js, const emscripten::val& seq2_js, int band_width = -1) {
    // Convert JavaScript arrays to C++ vectors
    std::vector<std::vector<double>> seq1;
    std::vector<std::vector<double>> seq2;
    
    int len1 = seq1_js["length"].as<int>();
    for (int i = 0; i < len1; i++) {
        auto frame = emscripten::vecFromJSArray<double>(seq1_js[i]);
        seq1.push_back(frame);
    }
    
    int len2 = seq2_js["length"].as<int>();
    for (int i = 0; i < len2; i++) {
        auto frame = emscripten::vecFromJSArray<double>(seq2_js[i]);
        seq2.push_back(frame);
    }
    
    // Compute DTW
    auto result = computeDTW(seq1, seq2, band_width, EUCLIDEAN, false);
    
    // Return result as JavaScript object
    emscripten::val js_result = emscripten::val::object();
    js_result.set("distance", result.distance);
    js_result.set("normalized_distance", result.distance / std::max(seq1.size(), seq2.size()));
    
    return js_result;
}

// Advanced DTW with path tracking
emscripten::val dtw_align(const emscripten::val& seq1_js, const emscripten::val& seq2_js, int band_width = -1) {
    std::vector<std::vector<double>> seq1;
    std::vector<std::vector<double>> seq2;
    
    int len1 = seq1_js["length"].as<int>();
    for (int i = 0; i < len1; i++) {
        auto frame = emscripten::vecFromJSArray<double>(seq1_js[i]);
        seq1.push_back(frame);
    }
    
    int len2 = seq2_js["length"].as<int>();
    for (int i = 0; i < len2; i++) {
        auto frame = emscripten::vecFromJSArray<double>(seq2_js[i]);
        seq2.push_back(frame);
    }
    
    auto result = computeDTW(seq1, seq2, band_width, EUCLIDEAN, true);
    
    emscripten::val js_result = emscripten::val::object();
    js_result.set("distance", result.distance);
    js_result.set("normalized_distance", result.distance / std::max(seq1.size(), seq2.size()));
    
    // Convert path to JavaScript array
    emscripten::val path_array = emscripten::val::array();
    for (size_t i = 0; i < result.path.size(); i++) {
        emscripten::val point = emscripten::val::array();
        point.set(0, result.path[i].first);
        point.set(1, result.path[i].second);
        path_array.set(i, point);
    }
    js_result.set("path", path_array);
    
    return js_result;
}

// Emscripten bindings
EMSCRIPTEN_BINDINGS(dtw_processor) {
    emscripten::function("dtw_distance", &dtw_distance);
    emscripten::function("dtw_align", &dtw_align);
    
    emscripten::register_vector<double>("VectorDouble");
    emscripten::register_vector<std::vector<double>>("VectorVectorDouble");
}