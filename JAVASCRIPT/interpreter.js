// Camera and detection functionality
let isDetecting = false;
let detectionInterval;

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

// Initialize camera
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
    });
    cameraFeed.srcObject = stream;

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
  const stream = cameraFeed.srcObject;
  if (stream) {
    const tracks = stream.getTracks();
    tracks.forEach((track) => track.stop());
    cameraFeed.srcObject = null;
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

// Canvas setup for hand tracking visualization (placeholder)
function setupCanvas() {
  const canvas = trackingOverlay;
  const video = cameraFeed;

  // Resize canvas to match video
  const resizeCanvas = () => {
    canvas.width = video.videoWidth || video.clientWidth;
    canvas.height = video.videoHeight || video.clientHeight;
  };

  video.addEventListener("loadedmetadata", resizeCanvas);
  window.addEventListener("resize", resizeCanvas);
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
