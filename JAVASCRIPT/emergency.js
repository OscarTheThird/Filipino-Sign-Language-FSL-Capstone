// Import Firebase modules
import { auth, db } from './firebase.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// Filipino Sign Language Emergency & Basic Needs Data
const emergencyData = [
  {
    need: "Help Me",
    desc: `<strong>An urgent request for assistance.</strong><br>Used in emergency situations when you need immediate help.<br>Filipino: "Tulungan mo ako"`,
    video: "/PICTURES/fsl_emergency/TULUNGAN.mp4",
  },
  {
    need: "Water",
    desc: `<strong>Requesting water to drink.</strong><br>A basic necessity for hydration and survival.<br>Filipino: "Tubig"`,
    video: "/PICTURES/fsl_emergency/TUBIG.mp4",
  },
  {
    need: "Eat",
    desc: `<strong>Expressing the action of eating.</strong><br>Used to indicate the need or desire to eat food.<br>Filipino: "Kain"`,
    video: "/PICTURES/fsl_emergency/KAIN.mp4",
  },
  {
    need: "Food",
    desc: `<strong>Requesting food or meals.</strong><br>A basic necessity for nourishment and energy.<br>Filipino: "Pagkain"`,
    video: "/PICTURES/fsl_emergency/PAGKAIN.mp4",
  },
  {
    need: "Stop",
    desc: `<strong>Commanding to halt or cease action.</strong><br>Used to signal someone to stop what they're doing immediately.<br>Filipino: "Hinto"`,
    video: "/PICTURES/fsl_emergency/HINTO.mp4",
  },
  {
    need: "Drink",
    desc: `<strong>Expressing the action of drinking.</strong><br>Used to indicate the need or desire to drink liquids.<br>Filipino: "Inom"`,
    video: "/PICTURES/fsl_emergency/INOM.mp4",
  },
];

let current = 0;
let isAnimating = false;
let currentUser = null;
let learnedNeeds = new Set();
let isInitialized = false;

// Get last position from sessionStorage immediately (synchronous)
function getLastPositionSync() {
    try {
        const cached = sessionStorage.getItem('emergency_position');
        if (cached) {
            const { need, timestamp } = JSON.parse(cached);
            // Cache valid for 24 hours
            if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
                const index = emergencyData.findIndex(item => item.need === need);
                if (index !== -1) {
                    return index;
                }
            }
        }
    } catch (error) {
        console.error('Error reading position cache:', error);
    }
    return 0; // Default to 'Help Me'
}

// Save position to sessionStorage immediately (synchronous)
function savePositionSync(need) {
    try {
        sessionStorage.setItem('emergency_position', JSON.stringify({
            need,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.error('Error saving position cache:', error);
    }
}

// Get learned emergency needs from sessionStorage
function getLearnedNeedsSync() {
    try {
        const cached = sessionStorage.getItem('emergency_learned');
        if (cached) {
            const { items, timestamp } = JSON.parse(cached);
            // Cache valid for 1 hour
            if (Date.now() - timestamp < 60 * 60 * 1000) {
                return new Set(items);
            }
        }
    } catch (error) {
        console.error('Error reading learned cache:', error);
    }
    return new Set();
}

// Save learned emergency needs to sessionStorage
function saveLearnedNeedsSync(items) {
    try {
        sessionStorage.setItem('emergency_learned', JSON.stringify({
            items: Array.from(items),
            timestamp: Date.now()
        }));
    } catch (error) {
        console.error('Error saving learned cache:', error);
    }
}

// Preload videos for smoother transitions
function preloadVideos() {
    emergencyData.forEach(item => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = item.video;
    });
}

// Load user progress from Firebase (background task)
async function loadUserProgress() {
    if (!currentUser) return;

    try {
        const progressRef = doc(db, 'users', currentUser.uid, 'progress', 'emergency');
        const progressSnap = await getDoc(progressRef);

        if (progressSnap.exists()) {
            const data = progressSnap.data();
            learnedNeeds = new Set(data.learnedNeeds || []);
            
            // Update sessionStorage with fresh data from Firebase
            saveLearnedNeedsSync(learnedNeeds);
            
            // Update position if different from cached
            if (data.lastViewedNeed) {
                const lastIndex = emergencyData.findIndex(item => item.need === data.lastViewedNeed);
                if (lastIndex !== -1 && lastIndex !== current) {
                    current = lastIndex;
                    savePositionSync(data.lastViewedNeed);
                    updateLesson('next', true);
                }
            }
            
            console.log('✓ Background sync complete:', learnedNeeds.size, 'emergency needs learned');
        } else {
            // Initialize progress document if it doesn't exist
            await setDoc(progressRef, {
                learnedNeeds: [],
                total: 6,
                lastViewedNeed: emergencyData[current].need,
                lastUpdated: new Date()
            });
        }
    } catch (error) {
        console.error('Error loading progress:', error);
    }
}

// Save user progress to Firebase (async, non-blocking)
async function saveUserProgress() {
    if (!currentUser) return;

    try {
        const progressRef = doc(db, 'users', currentUser.uid, 'progress', 'emergency');
        const learnedArray = Array.from(learnedNeeds);
        const currentNeed = emergencyData[current].need;
        
        // Save to sessionStorage immediately
        saveLearnedNeedsSync(learnedNeeds);
        savePositionSync(currentNeed);
        
        // Save to Firebase in background
        await setDoc(progressRef, {
            learnedNeeds: learnedArray,
            completed: learnedArray.length,
            total: 6,
            percentage: Math.round((learnedArray.length / 6) * 100),
            lastViewedNeed: currentNeed,
            lastUpdated: new Date()
        }, { merge: true });

        console.log('✓ Progress saved:', learnedArray.length, '/', 6, '- At:', currentNeed);
    } catch (error) {
        console.error('Error saving progress:', error);
    }
}

// Mark current emergency need as learned
function markNeedAsLearned() {
    const currentNeed = emergencyData[current].need;
    
    if (!learnedNeeds.has(currentNeed)) {
        learnedNeeds.add(currentNeed);
    }
    
    // Save progress (non-blocking)
    saveUserProgress();
}

// Play video when loaded
function playVideo(videoElement) {
    videoElement.play().catch(error => {
        console.log('Video autoplay prevented:', error);
    });
}

// Reset and play video
function resetAndPlayVideo(videoElement) {
    videoElement.currentTime = 0;
    playVideo(videoElement);
}

function updateLesson(direction = 'next', skipAnimation = false) {
    if (isAnimating && !skipAnimation) return;
    
    if (!skipAnimation) {
        isAnimating = true;
    }
    
    const greetingEl = document.getElementById('greeting');
    const descEl = document.getElementById('desc');
    const videoEl = document.getElementById('signVideo');
    const leftContent = document.querySelector('.lesson-left');
    const rightContent = document.querySelector('.lesson-right');
    
    if (skipAnimation) {
        // Immediate update without animation
        greetingEl.textContent = emergencyData[current].need;
        descEl.innerHTML = `<p>${emergencyData[current].desc}</p>`;
        
        // Update video source and play
        videoEl.src = emergencyData[current].video;
        videoEl.load();
        playVideo(videoEl);
        
        updateNavButtons();
        updateEmergencyStyling();
        
        // Mark as learned after initial display
        if (isInitialized) {
            markNeedAsLearned();
        }
        return;
    }
    
    // Determine animation direction
    const slideOutClass = direction === 'next' ? 'slide-out-left' : 'slide-out-right';
    const slideInClass = direction === 'next' ? 'slide-in-right' : 'slide-in-left';
    
    // Add exit animation classes
    leftContent.classList.add(slideOutClass);
    rightContent.classList.add(slideOutClass);
    
    // Update content after a short delay for smooth transition
    setTimeout(() => {
        // Mark current need as learned before moving
        markNeedAsLearned();
        
        // Update the content
        greetingEl.textContent = emergencyData[current].need;
        descEl.innerHTML = `<p>${emergencyData[current].desc}</p>`;
        
        // Update video source and reset/play
        videoEl.src = emergencyData[current].video;
        videoEl.load();
        resetAndPlayVideo(videoEl);
        
        // Remove old classes and add entrance animation
        leftContent.classList.remove(slideOutClass);
        rightContent.classList.remove(slideOutClass);
        leftContent.classList.add(slideInClass);
        rightContent.classList.add(slideInClass);
        
        // Update navigation button visibility
        updateNavButtons();
        
        // Update emergency styling
        updateEmergencyStyling();
        
        // Clean up animation classes after animation completes
        setTimeout(() => {
            leftContent.classList.remove(slideInClass);
            rightContent.classList.remove(slideInClass);
            isAnimating = false;
        }, 400);
        
    }, 200);
}

function updateNavButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    // Update previous button
    if (current === 0) {
        prevBtn.style.opacity = '0.3';
        prevBtn.style.pointerEvents = 'none';
    } else {
        prevBtn.style.opacity = '1';
        prevBtn.style.pointerEvents = 'auto';
    }
    
    // Update next button
    if (current === emergencyData.length - 1) {
        nextBtn.style.opacity = '0.3';
        nextBtn.style.pointerEvents = 'none';
    } else {
        nextBtn.style.opacity = '1';
        nextBtn.style.pointerEvents = 'auto';
    }
}

// Add emergency-specific styling
function updateEmergencyStyling() {
    const lessonCard = document.querySelector('.lesson-card');
    const currentNeed = emergencyData[current].need.toLowerCase().replace(/\s+/g, '');
    
    // Remove existing need classes
    lessonCard.className = lessonCard.className.replace(/need-\w+/g, '');
    
    // Add current need class
    lessonCard.classList.add(`need-${currentNeed}`);
}

// Add CSS animations dynamically
function addAnimationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .lesson-left, .lesson-right {
            transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        
        .slide-out-left {
            transform: translateX(-50px);
            opacity: 0;
        }
        
        .slide-out-right {
            transform: translateX(50px);
            opacity: 0;
        }
        
        .slide-in-left {
            transform: translateX(50px);
            opacity: 0;
            animation: slideInLeft 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
        
        .slide-in-right {
            transform: translateX(-50px);
            opacity: 0;
            animation: slideInRight 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
        
        @keyframes slideInLeft {
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideInRight {
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        .nav-arrow {
            transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        
        .nav-arrow:active {
            transform: translateY(-50%) scale(0.95);
        }
        
        .nav-arrow:hover {
            transform: translateY(-50%) scale(1.1);
        }
        
        .lesson-video {
            transition: opacity 0.2s ease;
        }
        
        #greeting {
            transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .lesson-card:not(.animating) #greeting:hover {
            transform: scale(1.05);
        }
        
        /* Emergency & Basic Needs specific colors */
        .need-helpme #greeting { 
            color: #E74C3C; 
            text-shadow: 0 2px 4px rgba(231, 76, 60, 0.4);
        }
        .need-water #greeting { 
            color: #3498DB; 
            text-shadow: 0 2px 4px rgba(52, 152, 219, 0.4);
        }
        .need-eat #greeting { 
            color: #E67E22; 
            text-shadow: 0 2px 4px rgba(230, 126, 34, 0.4);
        }
        .need-food #greeting { 
            color: #27AE60; 
            text-shadow: 0 2px 4px rgba(39, 174, 96, 0.4);
        }
        .need-stop #greeting { 
            color: #C0392B; 
            text-shadow: 0 2px 4px rgba(192, 57, 43, 0.4);
        }
        .need-drink #greeting { 
            color: #16A085; 
            text-shadow: 0 2px 4px rgba(22, 160, 133, 0.4);
        }
        
        /* Add subtle background gradients based on emergency needs */
        .need-helpme {
            background: linear-gradient(135deg, #fff 0%, #ffebee 100%);
        }
        .need-water {
            background: linear-gradient(135deg, #fff 0%, #e3f2fd 100%);
        }
        .need-eat {
            background: linear-gradient(135deg, #fff 0%, #fff3e0 100%);
        }
        .need-food {
            background: linear-gradient(135deg, #fff 0%, #e8f5e9 100%);
        }
        .need-stop {
            background: linear-gradient(135deg, #fff 0%, #ffcdd2 100%);
        }
        .need-drink {
            background: linear-gradient(135deg, #fff 0%, #e0f2f1 100%);
        }
    `;
    document.head.appendChild(style);
}

// Enhanced navigation with direction awareness
function navigatePrevious() {
    if (isAnimating || current === 0) return;
    
    current--;
    updateLesson('prev');
}

function navigateNext() {
    if (isAnimating || current === emergencyData.length - 1) return;
    
    current++;
    updateLesson('next');
}

// Event listeners
document.getElementById('prevBtn').onclick = navigatePrevious;
document.getElementById('nextBtn').onclick = navigateNext;

// Enhanced keyboard navigation
document.addEventListener('keydown', function (e) {
    if (isAnimating) return;
    
    if (e.key === "ArrowLeft") {
        e.preventDefault();
        navigatePrevious();
    } else if (e.key === "ArrowRight") {
        e.preventDefault();
        navigateNext();
    } else if (e.key === "Home") {
        e.preventDefault();
        if (current !== 0) {
            current = 0;
            updateLesson('prev');
        }
    } else if (e.key === "End") {
        e.preventDefault();
        if (current !== emergencyData.length - 1) {
            current = emergencyData.length - 1;
            updateLesson('next');
        }
    } else if (e.key === " " || e.key === "Spacebar") {
        // Space bar to replay video
        e.preventDefault();
        const videoEl = document.getElementById('signVideo');
        resetAndPlayVideo(videoEl);
    }
});

// Touch/swipe support for mobile
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', function(e) {
    touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', function(e) {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    const swipeThreshold = 50;
    const swipeDistance = touchEndX - touchStartX;
    
    if (Math.abs(swipeDistance) > swipeThreshold && !isAnimating) {
        if (swipeDistance > 0) {
            navigatePrevious();
        } else {
            navigateNext();
        }
    }
}

// Auth state observer (runs in background)
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        // Load progress in background without blocking UI
        loadUserProgress();
    } else {
        console.warn('No user logged in. Progress will not be saved.');
        currentUser = null;
    }
});

// Initialize immediately with cached data
current = getLastPositionSync();
learnedNeeds = getLearnedNeedsSync();

console.log(`⚡ Instant resume at emergency need: ${emergencyData[current].need}`);

// Initialize the lesson
document.addEventListener('DOMContentLoaded', function() {
    addAnimationStyles();
    preloadVideos();
    
    // Instant display with cached position
    updateLesson('next', true);
    
    const lessonCard = document.querySelector('.lesson-card');
    lessonCard.style.opacity = '0';
    lessonCard.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        lessonCard.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        lessonCard.style.opacity = '1';
        lessonCard.style.transform = 'translateY(0)';
        
        // Mark as initialized after fade-in completes
        setTimeout(() => {
            isInitialized = true;
            // Mark current need as learned now that we're initialized
            markNeedAsLearned();
        }, 600);
    }, 100);
    
    // Add click-to-replay functionality on video
    const videoEl = document.getElementById('signVideo');
    if (videoEl) {
        videoEl.addEventListener('click', function() {
            resetAndPlayVideo(this);
        });
        
        // Loop video continuously
        videoEl.addEventListener('ended', function() {
            this.currentTime = 0;
            this.play();
        });
    }
});

// Add visual feedback for button presses
document.querySelectorAll('.nav-arrow').forEach(btn => {
    btn.addEventListener('mousedown', function() {
        this.style.transform = 'translateY(-50%) scale(0.95)';
    });
    
    btn.addEventListener('mouseup', function() {
        this.style.transform = 'translateY(-50%) scale(1)';
    });
    
    btn.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(-50%) scale(1)';
    });
});