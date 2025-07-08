#include <vector>
#include <cmath>
#include <algorithm>
#include <limits>
#include <emscripten/bind.h>

// Hidden Markov Model for Phoneme Recognition
// Based on QuranPOC implementation

const double LOG_ZERO = -1e30; // Very small log probability to represent zero

// Log-sum-exp trick for numerical stability
double log_sum_exp(const std::vector<double>& log_values) {
    if (log_values.empty()) return LOG_ZERO;
    
    double max_val = *std::max_element(log_values.begin(), log_values.end());
    if (max_val == LOG_ZERO) return LOG_ZERO;
    
    double sum = 0.0;
    for (double val : log_values) {
        if (val != LOG_ZERO) {
            sum += exp(val - max_val);
        }
    }
    
    return max_val + log(sum);
}

class HMM {
private:
    int num_states;
    int num_observations;
    std::vector<std::vector<double>> transition_probs; // log probabilities
    std::vector<std::vector<double>> emission_probs;   // log probabilities
    std::vector<double> initial_probs;                 // log probabilities
    
public:
    HMM(int states, int observations) : num_states(states), num_observations(observations) {
        transition_probs.resize(num_states, std::vector<double>(num_states, LOG_ZERO));
        emission_probs.resize(num_states, std::vector<double>(num_observations, LOG_ZERO));
        initial_probs.resize(num_states, LOG_ZERO);
    }
    
    // Set transition probability (converts to log)
    void setTransitionProb(int from_state, int to_state, double prob) {
        if (prob > 0 && from_state < num_states && to_state < num_states) {
            transition_probs[from_state][to_state] = log(prob);
        }
    }
    
    // Set emission probability (converts to log)
    void setEmissionProb(int state, int observation, double prob) {
        if (prob > 0 && state < num_states && observation < num_observations) {
            emission_probs[state][observation] = log(prob);
        }
    }
    
    // Set initial probability (converts to log)
    void setInitialProb(int state, double prob) {
        if (prob > 0 && state < num_states) {
            initial_probs[state] = log(prob);
        }
    }
    
    // Viterbi algorithm - find most likely sequence of hidden states
    std::vector<int> viterbi(const std::vector<int>& observations) {
        int T = observations.size();
        if (T == 0) return {};
        
        // Initialize Viterbi table
        std::vector<std::vector<double>> viterbi_table(T, std::vector<double>(num_states, LOG_ZERO));
        std::vector<std::vector<int>> path(T, std::vector<int>(num_states, -1));
        
        // Initialize first column
        for (int s = 0; s < num_states; s++) {
            if (observations[0] < num_observations) {
                viterbi_table[0][s] = initial_probs[s] + emission_probs[s][observations[0]];
            }
        }
        
        // Fill the table
        for (int t = 1; t < T; t++) {
            if (observations[t] >= num_observations) continue;
            
            for (int s = 0; s < num_states; s++) {
                double max_prob = LOG_ZERO;
                int best_prev_state = -1;
                
                for (int prev_s = 0; prev_s < num_states; prev_s++) {
                    double prob = viterbi_table[t-1][prev_s] + 
                                  transition_probs[prev_s][s] + 
                                  emission_probs[s][observations[t]];
                    
                    if (prob > max_prob) {
                        max_prob = prob;
                        best_prev_state = prev_s;
                    }
                }
                
                viterbi_table[t][s] = max_prob;
                path[t][s] = best_prev_state;
            }
        }
        
        // Backtrack to find the best path
        std::vector<int> best_path(T);
        
        // Find the best final state
        double max_final_prob = LOG_ZERO;
        int best_final_state = 0;
        for (int s = 0; s < num_states; s++) {
            if (viterbi_table[T-1][s] > max_final_prob) {
                max_final_prob = viterbi_table[T-1][s];
                best_final_state = s;
            }
        }
        
        // Backtrack
        best_path[T-1] = best_final_state;
        for (int t = T-2; t >= 0; t--) {
            best_path[t] = path[t+1][best_path[t+1]];
        }
        
        return best_path;
    }
    
    // Forward algorithm - compute the probability of observations
    double forward(const std::vector<int>& observations) {
        int T = observations.size();
        if (T == 0) return LOG_ZERO;
        
        std::vector<std::vector<double>> alpha(T, std::vector<double>(num_states, LOG_ZERO));
        
        // Initialize
        for (int s = 0; s < num_states; s++) {
            if (observations[0] < num_observations) {
                alpha[0][s] = initial_probs[s] + emission_probs[s][observations[0]];
            }
        }
        
        // Forward pass
        for (int t = 1; t < T; t++) {
            if (observations[t] >= num_observations) continue;
            
            for (int s = 0; s < num_states; s++) {
                std::vector<double> log_probs;
                
                for (int prev_s = 0; prev_s < num_states; prev_s++) {
                    double prob = alpha[t-1][prev_s] + transition_probs[prev_s][s];
                    log_probs.push_back(prob);
                }
                
                alpha[t][s] = log_sum_exp(log_probs) + emission_probs[s][observations[t]];
            }
        }
        
        // Sum final probabilities
        std::vector<double> final_probs;
        for (int s = 0; s < num_states; s++) {
            final_probs.push_back(alpha[T-1][s]);
        }
        
        return log_sum_exp(final_probs);
    }
    
    // Backward algorithm
    double backward(const std::vector<int>& observations) {
        int T = observations.size();
        if (T == 0) return LOG_ZERO;
        
        std::vector<std::vector<double>> beta(T, std::vector<double>(num_states, LOG_ZERO));
        
        // Initialize - all final states have probability 1 (log(1) = 0)
        for (int s = 0; s < num_states; s++) {
            beta[T-1][s] = 0.0;
        }
        
        // Backward pass
        for (int t = T-2; t >= 0; t--) {
            if (observations[t+1] >= num_observations) continue;
            
            for (int s = 0; s < num_states; s++) {
                std::vector<double> log_probs;
                
                for (int next_s = 0; next_s < num_states; next_s++) {
                    double prob = transition_probs[s][next_s] + 
                                  emission_probs[next_s][observations[t+1]] + 
                                  beta[t+1][next_s];
                    log_probs.push_back(prob);
                }
                
                beta[t][s] = log_sum_exp(log_probs);
            }
        }
        
        // Compute initial probability
        std::vector<double> initial_backward_probs;
        for (int s = 0; s < num_states; s++) {
            if (observations[0] < num_observations) {
                double prob = initial_probs[s] + 
                              emission_probs[s][observations[0]] + 
                              beta[0][s];
                initial_backward_probs.push_back(prob);
            }
        }
        
        return log_sum_exp(initial_backward_probs);
    }
};

// Global HMM instance for JavaScript interface
static HMM* global_hmm = nullptr;

// JavaScript interface functions
void createHMM(int num_states, int num_observations) {
    if (global_hmm) {
        delete global_hmm;
    }
    global_hmm = new HMM(num_states, num_observations);
}

void setTransition(int from_state, int to_state, double prob) {
    if (global_hmm) {
        global_hmm->setTransitionProb(from_state, to_state, prob);
    }
}

void setEmission(int state, int observation, double prob) {
    if (global_hmm) {
        global_hmm->setEmissionProb(state, observation, prob);
    }
}

void setInitial(int state, double prob) {
    if (global_hmm) {
        global_hmm->setInitialProb(state, prob);
    }
}

emscripten::val viterbi(const emscripten::val& observations_js) {
    if (!global_hmm) {
        return emscripten::val::array();
    }
    
    std::vector<int> observations = emscripten::vecFromJSArray<int>(observations_js);
    auto result = global_hmm->viterbi(observations);
    
    return emscripten::val::array(result.begin(), result.end());
}

double forward(const emscripten::val& observations_js) {
    if (!global_hmm) {
        return -std::numeric_limits<double>::infinity();
    }
    
    std::vector<int> observations = emscripten::vecFromJSArray<int>(observations_js);
    return global_hmm->forward(observations);
}

double backward(const emscripten::val& observations_js) {
    if (!global_hmm) {
        return -std::numeric_limits<double>::infinity();
    }
    
    std::vector<int> observations = emscripten::vecFromJSArray<int>(observations_js);
    return global_hmm->backward(observations);
}

void cleanupHMM() {
    if (global_hmm) {
        delete global_hmm;
        global_hmm = nullptr;
    }
}

// Emscripten bindings
EMSCRIPTEN_BINDINGS(hmm_processor) {
    emscripten::function("createHMM", &createHMM);
    emscripten::function("setTransition", &setTransition);
    emscripten::function("setEmission", &setEmission);
    emscripten::function("setInitial", &setInitial);
    emscripten::function("viterbi", &viterbi);
    emscripten::function("forward", &forward);
    emscripten::function("backward", &backward);
    emscripten::function("cleanupHMM", &cleanupHMM);
    
    emscripten::register_vector<int>("VectorInt");
    emscripten::register_vector<double>("VectorDouble");
}