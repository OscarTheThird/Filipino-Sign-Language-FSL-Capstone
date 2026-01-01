// Camera and detection functionality
let isDetecting = false;
let detectionInterval;
let holistic;
let camera;

// FPS tracking
let lastFrameTime = Date.now();
let fps = 0;
let frameCount = 0;

// DOM elements
const cameraFeed = document.getElementById("cameraFeed");
const trackingOverlay = document.getElementById("trackingOverlay");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const detectedText = document.getElementById("detectedText");
const confidenceScore = document.getElementById("confidenceScore");
const placeholderText = document.getElementById("placeholderText");
const fpsCounter = document.getElementById("fpsCounter");

// Sample detection data for demo
const sampleDetections = [
  { text: "Hello", confidence: 94 },
  { text: "Thank you", confidence: 89 },
  { text: "Good morning", confidence: 92 },
  { text: "How are you?", confidence: 87 },
  { text: "Nice to meet you", confidence: 91 },
  { text: "Please", confidence: 95 },
  { text: "Sorry", confidence: 88 },
  { text: "Yes", confidence: 96 },
];

let currentDetectionIndex = 0;

// Function to calculate and update FPS
function updateFPS() {
  frameCount++;
  const currentTime = Date.now();
  const elapsed = currentTime - lastFrameTime;
  
  // Update FPS every 500ms
  if (elapsed >= 500) {
    fps = Math.round((frameCount * 1000) / elapsed);
    if (fpsCounter) {
      fpsCounter.textContent = `FPS: ${fps}`;
    }
    frameCount = 0;
    lastFrameTime = currentTime;
  }
}

// Function to calculate average Z-depth of landmarks (closer = smaller z value)
function getAverageDepth(landmarks) {
  if (!landmarks || landmarks.length === 0) return Infinity;
  const sum = landmarks.reduce((acc, landmark) => acc + (landmark.z || 0), 0);
  return sum / landmarks.length;
}

// Function to calculate landmark size/scale (larger = closer to camera)
function getLandmarkScale(landmarks) {
  if (!landmarks || landmarks.length === 0) return 0;
  
  // Calculate bounding box
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  landmarks.forEach(landmark => {
    minX = Math.min(minX, landmark.x);
    maxX = Math.max(maxX, landmark.x);
    minY = Math.min(minY, landmark.y);
    maxY = Math.max(maxY, landmark.y);
  });
  
  // Return area of bounding box (larger = closer)
  return (maxX - minX) * (maxY - minY);
}

// Function to check if person is in front (primary detection)
function isPrimaryPerson(faceLandmarks, leftHandLandmarks, rightHandLandmarks) {
  // Check if face is detected (most important indicator)
  if (!faceLandmarks || faceLandmarks.length === 0) {
    return false;
  }
  
  // Calculate face depth and scale
  const faceDepth = getAverageDepth(faceLandmarks);
  const faceScale = getLandmarkScale(faceLandmarks);
  
  // Person is primary if:
  // 1. Face is detected
  // 2. Face has reasonable size (not too small/far away)
  // 3. Face depth indicates closeness to camera
  const isCloseEnough = faceScale > 0.01; // Minimum face size threshold
  const isFrontmost = faceDepth < 0.5; // Z-depth threshold
  
  return isCloseEnough && isFrontmost;
}

// MediaPipe Holistic callback
function onResults(results) {
  // Update FPS counter
  updateFPS();
  
  const canvasCtx = trackingOverlay.getContext("2d");
  
  // Clear canvas
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, trackingOverlay.width, trackingOverlay.height);
  
  // Check if this is the primary person (person in front)
  const isPrimary = isPrimaryPerson(
    results.faceLandmarks,
    results.leftHandLandmarks,
    results.rightHandLandmarks
  );
  
  // Only draw landmarks if this is the primary person
  if (!isPrimary) {
    canvasCtx.restore();
    return; // Skip drawing if not the primary person
  }
  
  // Draw face landmarks
  if (results.faceLandmarks) {
    drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_TESSELATION, {
      color: "#C0C0C070",
      lineWidth: 1,
    });
    drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_RIGHT_EYE, {
      color: "#FF3030",
      lineWidth: 2,
    });
    drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_RIGHT_EYEBROW, {
      color: "#FF3030",
      lineWidth: 2,
    });
    drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_LEFT_EYE, {
      color: "#30FF30",
      lineWidth: 2,
    });
    drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_LEFT_EYEBROW, {
      color: "#30FF30",
      lineWidth: 2,
    });
    drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_FACE_OVAL, {
      color: "#E0E0E0",
      lineWidth: 2,
    });
    drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_LIPS, {
      color: "#E0E0E0",
      lineWidth: 2,
    });
  }
  
  // Draw right hand landmarks
  if (results.rightHandLandmarks) {
    drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, {
      color: "#00FF00",
      lineWidth: 3,
    });
    drawLandmarks(canvasCtx, results.rightHandLandmarks, {
      color: "#00FF00",
      lineWidth: 1,
      radius: 3,
    });
  }
  
  // Draw left hand landmarks
  if (results.leftHandLandmarks) {
    drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, {
      color: "#FF0000",
      lineWidth: 3,
    });
    drawLandmarks(canvasCtx, results.leftHandLandmarks, {
      color: "#FF0000",
      lineWidth: 1,
      radius: 3,
    });
  }
  
  canvasCtx.restore();
}

// Initialize MediaPipe Holistic
function initializeMediaPipe() {
  holistic = new Holistic({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
    },
  });
  
  holistic.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: false,
    refineFaceLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
  
  holistic.onResults(onResults);
}

// Initialize camera
async function startCamera() {
  try {
    // Initialize MediaPipe if not already done
    if (!holistic) {
      initializeMediaPipe();
    }
    
    // Setup camera
    camera = new Camera(cameraFeed, {
      onFrame: async () => {
        await holistic.send({ image: cameraFeed });
      },
      width: 640,
      height: 480,
    });
    
    await camera.start();

    // Update UI
    startBtn.style.display = "none";
    stopBtn.style.display = "inline-flex";
    statusText.textContent = "Detecting sign language...";
    statusDot.style.background = "#10b981";

    // Hide placeholder and show detection
    placeholderText.style.display = "none";
    detectedText.style.display = "block";
    confidenceScore.style.display = "block";

    // Start detection simulation
    startDetection();
  } catch (error) {
    console.error("Error accessing camera:", error);
    statusText.textContent = "Camera access denied";
    statusDot.style.background = "#ef4444";
  }
}

// Stop camera
function stopCamera() {
  if (camera) {
    camera.stop();
  }

  // Reset FPS counter
  fps = 0;
  frameCount = 0;
  if (fpsCounter) {
    fpsCounter.textContent = "FPS: 0";
  }

  // Update UI
  startBtn.style.display = "inline-flex";
  stopBtn.style.display = "none";
  statusText.textContent = "Ready to start detection";
  statusDot.style.background = "#64748b";

  // Show placeholder and hide detection
  placeholderText.style.display = "block";
  detectedText.style.display = "none";
  confidenceScore.style.display = "none";

  // Clear canvas
  const canvasCtx = trackingOverlay.getContext("2d");
  canvasCtx.clearRect(0, 0, trackingOverlay.width, trackingOverlay.height);

  // Stop detection
  stopDetection();
}

// Start detection simulation
function startDetection() {
  isDetecting = true;
  detectionInterval = setInterval(() => {
    if (isDetecting) {
      const detection = sampleDetections[currentDetectionIndex];
      updateDetection(detection.text, detection.confidence);
      currentDetectionIndex =
        (currentDetectionIndex + 1) % sampleDetections.length;

      // Add to history occasionally
      if (Math.random() > 0.7) {
        addToHistory(detection.text);
      }
    }
  }, 2000);
}

// Stop detection
function stopDetection() {
  isDetecting = false;
  if (detectionInterval) {
    clearInterval(detectionInterval);
  }
}

// Update detection display
function updateDetection(text, confidence) {
  detectedText.textContent = text;
  confidenceScore.textContent = `Confidence: ${confidence}%`;

  // Trigger animation
  detectedText.style.animation = "none";
  setTimeout(() => {
    detectedText.style.animation = "fadeIn 0.5s ease-in";
  }, 10);
}

// Add detection to history
function addToHistory(text) {
  const historyContainer = document.querySelector(".message-history");
  const existingItems = historyContainer.querySelectorAll(".history-item");

  // Create new history item
  const historyItem = document.createElement("div");
  historyItem.className = "history-item";
  const currentTime = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  historyItem.innerHTML = `
                ${text}
                <span class="history-time">${currentTime}</span>
            `;

  // Insert at the beginning (after title)
  const historyTitle = historyContainer.querySelector(".history-title");
  historyTitle.parentNode.insertBefore(historyItem, historyTitle.nextSibling);

  // Keep only last 5 items
  if (existingItems.length >= 5) {
    existingItems[existingItems.length - 1].remove();
  }
}

// Canvas setup for hand tracking visualization
function setupCanvas() {
  const canvas = trackingOverlay;
  const video = cameraFeed;

  // Resize canvas to match video
  const resizeCanvas = () => {
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
  };

  video.addEventListener("loadedmetadata", resizeCanvas);
  window.addEventListener("resize", resizeCanvas);
  
  // Initial resize
  resizeCanvas();
}

// Event listeners
startBtn.addEventListener("click", startCamera);
stopBtn.addEventListener("click", stopCamera);

// Initialize
setupCanvas();

// Auto-resize video feed
cameraFeed.addEventListener("loadedmetadata", () => {
  setupCanvas();
});

// 🚀 PROGRESS PRELOADER - Also preload on interpreter page
import { auth as authInstance, db } from './firebase.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

onAuthStateChanged(authInstance, async (user) => {
  if (user) {
    try {
      console.log('🚀 [INTERPRETER] Preloading progress data in background...');
      
      const progressRef = collection(db, 'users', user.uid, 'progress');
      const querySnapshot = await getDocs(progressRef);
      
      const cachedData = {};
      querySnapshot.forEach((doc) => {
        cachedData[doc.id] = doc.data();
      });
      
      sessionStorage.setItem('progress_preloaded', JSON.stringify({
        data: cachedData,
        timestamp: Date.now(),
        userId: user.uid
      }));
      
      console.log('✅ [INTERPRETER] Progress preloaded and cached!');
    } catch (error) {
      console.error('[INTERPRETER] Preload error:', error);
    }
  }
});