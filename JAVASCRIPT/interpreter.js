import { auth as authInstance, db } from './firebase.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// ==========================================
// 1. CONFIGURATION & STATE
// ==========================================
const CONFIG = {
    SEQUENCE_LENGTH: 60,
    THRESHOLD: 0.6,
    WIDTH: 640,
    HEIGHT: 480
};

const MODEL_PATHS = {
    words: { 
        model: '/JAVASCRIPT/Model/words/model.json', 
        labels: '/JAVASCRIPT/Label/words_labels.json' 
    },
    alphabet: { 
        model: '/JAVASCRIPT/Model/alphabet/model.json', 
        labels: '/JAVASCRIPT/Label/alphabet_labels.json' 
    },
    numbers: { 
        model: '/JAVASCRIPT/Model/numbers/model.json', 
        labels: '/JAVASCRIPT/Label/numbers_labels.json' 
    }
};

const RAW_FACE_INDICES = [
    61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291,
    146, 91, 181, 84, 17, 314, 405, 321, 375,
    70, 63, 105, 66, 107, 336, 296, 334, 293, 300,
    33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7,
    362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382,
    151, 9, 8, 175, 199, 58, 132, 93, 234, 127, 162, 356, 454, 323, 361, 288, 389
];
const FACE_INDICES = [...new Set(RAW_FACE_INDICES)].sort((a, b) => a - b);

// DOM Elements
const videoElement = document.getElementById('videoElement');
const canvasElement = document.getElementById('canvasElement');
const ctx = canvasElement.getContext('2d');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const clearBtn = document.getElementById('clearBtn');
const speakBtn = document.getElementById('speakBtn');
const undoBtn = document.getElementById('undoBtn');
const spaceBtn = document.getElementById('spaceBtn');

const statusText = document.getElementById('statusText');
const statusDot = document.getElementById('statusDot');
const detectedText = document.getElementById('detectedText');
const confidenceScore = document.getElementById('confidenceScore');
const fpsCounter = document.getElementById('fpsCounter');
const placeholderText = document.getElementById('placeholderText');
const modelStatus = document.getElementById('model-status');

const progressBar = document.createElement('div');

// State Variables
let model = null;
let holistic = null;
let labels = [];
let sequence = [];
let isProcessing = false;
let isStreaming = false;
let activeModelType = '';
let lastFrameTime = Date.now();
let lastPredictionText = "";

// Phase Logic
const PHASE_DURATIONS = { READY: 2000, RECORDING: 2000, RESULT: 2000 };
let currentPhase = 'LOADING';
let phaseStartTime = 0;

// ==========================================
// 2. INITIALIZATION
// ==========================================

async function initApp() {
    try {
        await tf.setBackend('wasm');
        tf.wasm.setWasmPaths('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@latest/dist/');
        
        setupHolistic();
        setupProgressBar();
        
        // Load Default
        await switchModel('alphabet');
    } catch (err) {
        console.error("Init Error:", err);
        statusText.innerText = "Error Loading Engine";
    }
}

function setupProgressBar() {
    const statusContainer = document.querySelector('.status-indicator');
    const progressContainer = document.createElement('div');
    progressContainer.style.width = '100%';
    progressContainer.style.height = '8px';
    progressContainer.style.background = '#e2e8f0'; 
    progressContainer.style.borderRadius = '4px';
    progressContainer.style.marginTop = '10px'; 
    progressContainer.style.overflow = 'hidden';
    
    progressBar.style.width = '0%';
    progressBar.style.height = '100%';
    progressBar.style.background = '#FFD700'; 
    progressBar.style.transition = 'width 0.1s linear, background-color 0.2s';
    
    progressContainer.appendChild(progressBar);
    statusContainer.appendChild(progressContainer);
}

window.switchModel = async function(type) {
    if (activeModelType === type) return;
    
    activeModelType = type;
    model = null;
    labels = [];
    sequence = [];
    
    // 1. Handle Button Visibility based on Model
    // Words = Auto space (Hide Button)
    // Alphabet/Numbers = Manual space (Show Button)
    if (type === 'words') {
        spaceBtn.style.display = 'none'; 
    } else {
        spaceBtn.style.display = 'inline-flex'; 
    }

    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn${type.charAt(0).toUpperCase() + type.slice(1)}`).classList.add('active');
    
    modelStatus.innerText = `Loading ${type.toUpperCase()}...`;
    statusText.innerText = "Switching Model...";
    currentPhase = 'LOADING';

    try {
        const config = MODEL_PATHS[type];
        model = await tf.loadLayersModel(config.model);
        
        tf.tidy(() => model.predict(tf.zeros([1, CONFIG.SEQUENCE_LENGTH, 363])));
        
        const lblRes = await fetch(config.labels);
        labels = await lblRes.json();

        console.log(`✅ Loaded ${type}`);
        modelStatus.innerText = `Active Model: ${type.toUpperCase()}`;
        
        if(isStreaming) {
            currentPhase = 'READY';
            phaseStartTime = Date.now();
        } else {
            statusText.innerText = "Ready to Start";
        }

    } catch (e) {
        console.error(e);
        statusText.innerText = "Model Error";
    }
};

function setupHolistic() {
    holistic = new Holistic({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`});
    holistic.setOptions({
        modelComplexity: 0,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
    holistic.onResults(onResults);
}

// ==========================================
// 3. CAMERA & LOOP & CONTROLS
// ==========================================

startBtn.addEventListener('click', startCamera);
stopBtn.addEventListener('click', stopCamera);
clearBtn.addEventListener('click', clearSentence);
speakBtn.addEventListener('click', speakSentence);
undoBtn.addEventListener('click', undoLastEntry);
spaceBtn.addEventListener('click', addManualSpace);

async function startCamera() {
    if (!model) return alert("Please wait for model to load.");
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: CONFIG.WIDTH, height: CONFIG.HEIGHT, facingMode: "user" }
        });
        
        videoElement.srcObject = stream;
        videoElement.onloadedmetadata = () => {
            videoElement.play();
            canvasElement.width = CONFIG.WIDTH;
            canvasElement.height = CONFIG.HEIGHT;
            
            isStreaming = true;
            currentPhase = 'READY';
            phaseStartTime = Date.now();
            sequence = [];
            
            loop();
            
            startBtn.style.display = 'none';
            stopBtn.style.display = 'inline-flex';
            
            // Ensure detected text is visible when starting
            placeholderText.style.display = 'none';
            detectedText.style.display = 'block';
            confidenceScore.style.display = 'block';
        };
    } catch (e) {
        alert("Camera permission denied");
    }
}

function stopCamera() {
    isStreaming = false;
    const stream = videoElement.srcObject;
    if (stream) stream.getTracks().forEach(track => track.stop());
    
    startBtn.style.display = 'inline-flex';
    stopBtn.style.display = 'none';
    
    // --- CHANGED: Commented out so text stays visible ---
    // placeholderText.style.display = 'block';
    // detectedText.style.display = 'none';
    // confidenceScore.style.display = 'none';
    
    statusText.innerText = "Camera Stopped";
    statusDot.style.background = "#64748b";
    progressBar.style.width = '0%';
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
}

function loop() {
    if (!isStreaming) return;
    if (!videoElement.paused && !videoElement.ended) {
        ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        if (!isProcessing) {
            isProcessing = true;
            holistic.send({image: canvasElement}).then(() => { isProcessing = false; });
        }
    }
    requestAnimationFrame(loop);
}

// --- BUTTON LOGIC FUNCTIONS ---

function addManualSpace() {
    const currentText = detectedText.innerText;
    // use \u00A0 (Non-Breaking Space) so it is visible immediately
    if (currentText && currentText !== "..." && currentText.trim() !== "") {
        detectedText.innerText += "\u00A0";
    }
}

function undoLastEntry() {
    let text = detectedText.innerText;
    if (!text || text === "..." || text === "") return;

    // Logic: 
    // If 'Words' mode: Remove the last word (space separated)
    // If 'Alphabet/Number' mode: Remove the last character
    if (activeModelType === 'words') {
        let words = text.trim().split(" ");
        if (words.length > 0) {
            words.pop(); 
            detectedText.innerText = words.join(" ");
        }
    } else {
        // Remove the very last character (or space)
        detectedText.innerText = text.slice(0, -1);
    }

    // If empty after deletion, reset to placeholder
    if (detectedText.innerText.trim() === "") {
        detectedText.innerText = "...";
    }
}

function clearSentence() {
    detectedText.innerText = "...";
    sequence = [];
    lastPredictionText = "";
}

// ==========================================
// 4. ON RESULTS (PHASE LOGIC)
// ==========================================

function onResults(results) {
    const now = Date.now();
    const delta = now - lastFrameTime;
    lastFrameTime = now;
    fpsCounter.innerText = `FPS: ${Math.round(1000 / delta)}`;

    ctx.save();
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    ctx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    
    if (results.faceLandmarks) {
        ctx.fillStyle = '#00FFFF'; 
        ctx.beginPath();
        for (const index of FACE_INDICES) {
            const lm = results.faceLandmarks[index];
            if (lm) {
                const x = lm.x * canvasElement.width;
                const y = lm.y * canvasElement.height;
                ctx.moveTo(x + 1.5, y); 
                ctx.arc(x, y, 1.5, 0, 2 * Math.PI); 
            }
        }
        ctx.fill();
    }

    drawConnectors(ctx, results.leftHandLandmarks, HAND_CONNECTIONS, {color: '#CC0000', lineWidth: 2});
    drawLandmarks(ctx, results.leftHandLandmarks, {color: '#FF0000', lineWidth: 1, radius: 2});
    drawConnectors(ctx, results.rightHandLandmarks, HAND_CONNECTIONS, {color: '#00CC00', lineWidth: 2});
    drawLandmarks(ctx, results.rightHandLandmarks, {color: '#00FF00', lineWidth: 1, radius: 2});
    ctx.restore();

    if (!model) return;

    const timeInPhase = now - phaseStartTime;
    let progress = 0;
    let barColor = "#333";

    if (currentPhase === 'READY') {
        progress = Math.min(100, (timeInPhase / PHASE_DURATIONS.READY) * 100);
        barColor = "#FFD700";
        updateUI("GET READY", "#FFD700");
        
        if (timeInPhase > PHASE_DURATIONS.READY) {
            currentPhase = 'RECORDING';
            phaseStartTime = now;
            sequence = [];
        }
    } 
    else if (currentPhase === 'RECORDING') {
        progress = Math.min(100, (timeInPhase / PHASE_DURATIONS.RECORDING) * 100);
        barColor = "#FF0000";
        updateUI("RECORDING...", "#FF0000");

        const keypoints = extractKeypoints(results);
        sequence.push(keypoints);

        if (timeInPhase > PHASE_DURATIONS.RECORDING) {
            performPrediction();
            currentPhase = 'RESULT';
            phaseStartTime = now;
        }
    } 
    else if (currentPhase === 'RESULT') {
        progress = 100;
        barColor = "#00FF00";
        updateUI(lastPredictionText || "...", "#00FF00");
        
        if (timeInPhase > PHASE_DURATIONS.RESULT) {
            currentPhase = 'READY';
            phaseStartTime = now;
            lastPredictionText = "";
        }
    } 
    else if (currentPhase === 'LOADING') {
        updateUI("LOADING MODEL...", "#3b82f6");
    }

    progressBar.style.width = progress + "%";
    progressBar.style.backgroundColor = barColor;
}

function updateUI(text, color) {
    statusText.innerText = text;
    statusDot.style.background = color;
}

// ==========================================
// 5. PREDICTION & EXTRACTION
// ==========================================

function extractKeypoints(results) {
    let face = [];
    if (results.faceLandmarks) {
        for (const i of FACE_INDICES) {
            const lm = results.faceLandmarks[i];
            face.push(lm.x, lm.y, lm.z);
        }
    } else {
        face = new Array(FACE_INDICES.length * 3).fill(0);
    }

    let lh = [];
    if (results.leftHandLandmarks) {
        for (const res of results.leftHandLandmarks) {
            lh.push(res.x, res.y, res.z);
        }
    } else {
        lh = new Array(21 * 3).fill(0);
    }

    let rh = [];
    if (results.rightHandLandmarks) {
        for (const res of results.rightHandLandmarks) {
            rh.push(res.x, res.y, res.z);
        }
    } else {
        rh = new Array(21 * 3).fill(0);
    }

    return [...face, ...lh, ...rh];
}

async function performPrediction() {
    if (!model || sequence.length === 0) return;

    let inputData = [...sequence];
    while (inputData.length < CONFIG.SEQUENCE_LENGTH) {
        inputData.push(inputData[inputData.length - 1]);
    }
    if (inputData.length > CONFIG.SEQUENCE_LENGTH) {
        inputData = inputData.slice(inputData.length - CONFIG.SEQUENCE_LENGTH);
    }

    tf.tidy(() => {
        const input = tf.tensor3d([inputData]); 
        const pred = model.predict(input);
        const values = pred.dataSync();
        const maxVal = Math.max(...values);
        const idx = values.indexOf(maxVal);

        const confidence = (maxVal * 100).toFixed(0);
        confidenceScore.innerText = `Confidence: ${confidence}%`;

        if (maxVal > CONFIG.THRESHOLD) {
            const word = labels[idx];
            
            if (word.toLowerCase() === "nothing") {
                lastPredictionText = "..."; 
                return; 
            }

            lastPredictionText = word.toUpperCase();
            addToSentence(word);
        } else {
            lastPredictionText = "UNCERTAIN";
        }
    });
}

function addToSentence(word) {
    const cleanWord = word.replace(/_/g, ' ').toUpperCase();
    let currentText = detectedText.innerText;

    // 1. If it's the very first word, just set it
    if (currentText === "..." || currentText === "") {
        detectedText.innerText = cleanWord;
    } 
    else {
        // 2. Simple Logic:
        if (activeModelType === 'words') {
            // Words Mode: AUTOMATICALLY add a space before the new word
            detectedText.innerText += " " + cleanWord;
        } else {
            // Alphabet/Numbers Mode: NO automatic space.
            // Just attach the letter to the end.
            detectedText.innerText += cleanWord;
        }
    }
    
    // Reset Animation
    detectedText.style.animation = "none";
    setTimeout(() => { detectedText.style.animation = "fadeIn 0.5s ease-in"; }, 10);
}

// ==========================================
// 6. SPEECH SYNTHESIS & TRANSLATION
// ==========================================

async function speakSentence() {
    // 1. Get raw text (converting special spaces back to normal)
    let text = detectedText.innerText.replace(/\u00A0/g, " ");
    
    // Validation
    if (!text || text === "..." || text.trim() === "") return;

    // 2. Visual feedback: Show user we are working
    const originalText = text; // Keep backup
    statusText.innerText = "Translating..."; 
    statusDot.style.background = "#3b82f6"; // Blue loading color
    speakBtn.disabled = true; // Prevent double clicks
    speakBtn.style.opacity = "0.7";

    // 3. Call the Gemini API to get the natural sentence
    const naturalText = await correctGrammarToFilipino(text);
    
    // 4. Update the Message Display with the TRANSLATED text
    detectedText.innerText = naturalText;
    
    // Optional: Add a visual effect to show the text changed
    detectedText.style.color = "#16a34a"; // Green color to indicate success
    setTimeout(() => { detectedText.style.color = "#1e40af"; }, 1000); // Revert to blue

    console.log(`Original: "${originalText}" -> Translated: "${naturalText}"`);

    // 5. Cancel previous speech (if any)
    if (responsiveVoice.isPlaying()) {
        responsiveVoice.cancel();
    }

    // 6. Speak the NEW translated text
    responsiveVoice.speak(naturalText, "Filipino Female", {
        pitch: 1.0, 
        rate: 0.9, 
        volume: 1.0,
        onstart: function() {
            statusText.innerText = "Speaking...";
        },
        onend: function() {
            statusText.innerText = "Ready"; 
            statusDot.style.background = "#64748b"; // Restore gray color
            speakBtn.disabled = false; // Re-enable button
            speakBtn.style.opacity = "1";
        }
    });
}

// ==========================================
// 7. FIREBASE PRELOADER & INIT
// ==========================================

onAuthStateChanged(authInstance, async (user) => {
  if (user) {
    try {
      const progressRef = collection(db, 'users', user.uid, 'progress');
      const querySnapshot = await getDocs(progressRef);
      const cachedData = {};
      querySnapshot.forEach((doc) => { cachedData[doc.id] = doc.data(); });
      sessionStorage.setItem('progress_preloaded', JSON.stringify({
        data: cachedData,
        timestamp: Date.now(),
        userId: user.uid
      }));
    } catch (error) {
      console.error('[INTERPRETER] Preload error:', error);
    }
  }
});

initApp();

// ==========================================
// 8. AI GRAMMAR CORRECTION (Gemini API)
// ==========================================



async function correctGrammarToFilipino(text) {
    // Cloudflare will serve the function at this URL
    const url = '/api/translate'; 

    try {
        const response = await fetch(url, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text })
        });

        const data = await response.json();
        
        if (data.candidates && data.candidates.length > 0) {
            return data.candidates[0].content.parts[0].text.trim();
        } else {
            return text;
        }
    } catch (error) {
        console.error("Translation failed:", error);
        return text;
    }
}