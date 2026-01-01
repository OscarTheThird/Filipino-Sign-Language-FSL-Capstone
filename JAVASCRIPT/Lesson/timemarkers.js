// Import Firebase modules
import { auth, db } from '../firebase.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// Filipino Sign Language Time Markers Data
const timeMarkersData = [
  {
    marker: "Now",
    desc: `<strong>Indicates the present time.</strong><br>Used to refer to the current moment or ongoing action.<br>Filipino: "Ngayon"`,
    video: "/PICTURES/fsl_time_markers/NGAYON.mp4",
  },
  {
    marker: "Tomorrow",
    desc: `<strong>Refers to the day after today.</strong><br>Used to talk about future plans or events happening the next day.<br>Filipino: "Bukas"`,
    video: "/PICTURES/fsl_time_markers/BUKAS.mp4",
  },
  {
    marker: "Later",
    desc: `<strong>Indicates a time in the near future.</strong><br>Used to refer to something happening soon, but not immediately.<br>Filipino: "Mamaya"`,
    video: "/PICTURES/fsl_time_markers/MAMAYA.mp4",
  },
];

let current = 0;
let isAnimating = false;
let currentUser = null;
let learnedItems = new Set();
let isInitialized = false;

// Get last position from sessionStorage immediately (synchronous)
function getLastPositionSync() {
    try {
        const cached = sessionStorage.getItem('timemarkers_position');
        if (cached) {
            const { marker, timestamp } = JSON.parse(cached);
            // Cache valid for 24 hours
            if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
                const index = timeMarkersData.findIndex(item => item.marker === marker);
                if (index !== -1) {
                    console.log(`⚡ Restored position from cache: ${marker} (index ${index})`);
                    return index;
                }
            }
        }
    } catch (error) {
        console.error('Error reading position cache:', error);
    }
    console.log('⚡ No valid cache, starting at Now (index 0)');
    return 0; // Default to 'Now'
}

// Save position to sessionStorage immediately (synchronous)
function savePositionSync(marker) {
    try {
        sessionStorage.setItem('timemarkers_position', JSON.stringify({
            marker,
            timestamp: Date.now()
        }));
        console.log(`💾 Saved position: ${marker}`);
    } catch (error) {
        console.error('Error saving position cache:', error);
    }
}

// Get learned time markers from sessionStorage
function getLearnedItemsSync() {
    try {
        const cached = sessionStorage.getItem('timemarkers_learned');
        if (cached) {
            const { items, timestamp } = JSON.parse(cached);
            // Cache valid for 1 hour
            if (Date.now() - timestamp < 60 * 60 * 1000) {
                console.log(`📚 Restored ${items.length} learned time markers from cache`);
                return new Set(items);
            }
        }
    } catch (error) {
        console.error('Error reading learned cache:', error);
    }
    return new Set();
}

// Save learned time markers to sessionStorage
function saveLearnedItemsSync(items) {
    try {
        sessionStorage.setItem('timemarkers_learned', JSON.stringify({
            items: Array.from(items),
            timestamp: Date.now()
        }));
    } catch (error) {
        console.error('Error saving learned cache:', error);
    }
}

// Preload videos for smoother transitions
function preloadVideos() {
    timeMarkersData.forEach(item => {
        const video = document.createElement('video');
        video.preload = 'metadata'; // Load metadata only to save bandwidth
        video.src = item.video;
    });
}

// Load user progress from Firebase (background task)
async function loadUserProgress() {
    if (!currentUser) return;

    try {
        const progressRef = doc(db, 'users', currentUser.uid, 'progress', 'timemarkers');
        const progressSnap = await getDoc(progressRef);

        if (progressSnap.exists()) {
            const data = progressSnap.data();
            learnedItems = new Set(data.learnedItems || []);
            
            // Update sessionStorage with fresh data from Firebase
            saveLearnedItemsSync(learnedItems);
            
            // 🔥 FIX: Update position if different from cached AND update display
            if (data.lastViewedItem) {
                const lastIndex = timeMarkersData.findIndex(item => item.marker === data.lastViewedItem);
                if (lastIndex !== -1 && lastIndex !== current) {
                    console.log(`🔄 Firebase has different position: ${data.lastViewedItem} (index ${lastIndex})`);
                    current = lastIndex;
                    savePositionSync(data.lastViewedItem);
                    // Update the display to show the correct marker
                    updateLesson('next', true);
                }
            }
            
            console.log('✓ Background sync complete:', learnedItems.size, 'time markers learned');
        } else {
            // Initialize progress document if it doesn't exist
            await setDoc(progressRef, {
                learnedItems: [],
                total: 3,
                lastViewedItem: timeMarkersData[current].marker,
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
        const progressRef = doc(db, 'users', currentUser.uid, 'progress', 'timemarkers');
        const learnedArray = Array.from(learnedItems);
        const currentItem = timeMarkersData[current].marker;
        
        // Save to sessionStorage immediately
        saveLearnedItemsSync(learnedItems);
        savePositionSync(currentItem);
        
        // Save to Firebase in background
        await setDoc(progressRef, {
            learnedItems: learnedArray,
            completed: learnedArray.length,
            total: 3,
            percentage: Math.round((learnedArray.length / 3) * 100),
            lastViewedItem: currentItem,
            lastUpdated: new Date()
        }, { merge: true });

        console.log('✓ Progress saved:', learnedArray.length, '/', 3, '- At:', currentItem);
    } catch (error) {
        console.error('Error saving progress:', error);
    }
}

// Mark current time marker as learned
function markItemAsLearned() {
    const currentItem = timeMarkersData[current].marker;
    
    if (!learnedItems.has(currentItem)) {
        learnedItems.add(currentItem);
        console.log(`✓ Marked ${currentItem} as learned`);
    }
    
    // Save progress (non-blocking)
    saveUserProgress();
}

// Play video when loaded
function playVideo(videoElement) {
    videoElement.play().catch(error => {
        console.log('Video autoplay prevented:', error);
        // Autoplay was prevented, video will play on user interaction
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
        greetingEl.textContent = timeMarkersData[current].marker;
        descEl.innerHTML = `<p>${timeMarkersData[current].desc}</p>`;
        
        // Update video source and play
        videoEl.src = timeMarkersData[current].video;
        videoEl.load(); // Load the new video
        playVideo(videoEl); // Auto-play
        
        updateNavButtons();
        updateTimeMarkerStyling();
        
        // 🔥 FIX: Don't mark as learned on initial display - wait for user interaction
        // The marker is already learned if it's in the cache
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
        // Mark current time marker as learned before moving
        markItemAsLearned();
        
        // Update the content
        greetingEl.textContent = timeMarkersData[current].marker;
        descEl.innerHTML = `<p>${timeMarkersData[current].desc}</p>`;
        
        // Update video source and reset/play
        videoEl.src = timeMarkersData[current].video;
        videoEl.load();
        resetAndPlayVideo(videoEl);
        
        // Remove old classes and add entrance animation
        leftContent.classList.remove(slideOutClass);
        rightContent.classList.remove(slideOutClass);
        leftContent.classList.add(slideInClass);
        rightContent.classList.add(slideInClass);
        
        // Update navigation button visibility
        updateNavButtons();
        
        // Update time marker styling
        updateTimeMarkerStyling();
        
        // Check if we're on the last slide and show quiz modal
        if (current === timeMarkersData.length - 1) {
            setTimeout(() => {
                showQuizModal();
            }, 500); // Show modal after animation completes
        }
        
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
    
    // Next button always enabled for looping
    nextBtn.style.opacity = '1';
    nextBtn.style.pointerEvents = 'auto';
}

// Add time marker specific styling
function updateTimeMarkerStyling() {
    const lessonCard = document.querySelector('.lesson-card');
    const currentMarker = timeMarkersData[current].marker.toLowerCase().replace(/\s+/g, '');
    
    // Remove existing marker classes
    lessonCard.className = lessonCard.className.replace(/marker-\w+/g, '');
    
    // Add current marker class
    lessonCard.classList.add(`marker-${currentMarker}`);
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
        
        /* Time marker specific colors */
        .marker-now #greeting { 
            color: #3498DB; 
            text-shadow: 0 2px 4px rgba(52, 152, 219, 0.3);
        }
        .marker-tomorrow #greeting { 
            color: #2ECC71; 
            text-shadow: 0 2px 4px rgba(46, 204, 113, 0.3);
        }
        .marker-later #greeting { 
            color: #F39C12; 
            text-shadow: 0 2px 4px rgba(243, 156, 18, 0.3);
        }
        
        /* Add subtle background gradients based on time marker */
        .marker-now {
            background: linear-gradient(135deg, #fff 0%, #e3f2fd 100%);
        }
        .marker-tomorrow {
            background: linear-gradient(135deg, #fff 0%, #e8f5e9 100%);
        }
        .marker-later {
            background: linear-gradient(135deg, #fff 0%, #fff3e0 100%);
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

// Show quiz confirmation modal
function showQuizModal() {
    const modal = document.getElementById('quizModal');
    if (modal) {
        modal.classList.add('show');
    }
}

// Hide quiz confirmation modal
function hideQuizModal() {
    const modal = document.getElementById('quizModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function navigateNext() {
    if (isAnimating) return;
    
    // Check if we're on the last slide
    if (current === timeMarkersData.length - 1) {
        // Show quiz modal instead of looping
        showQuizModal();
        return;
    }
    
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
        if (current !== timeMarkersData.length - 1) {
            current = timeMarkersData.length - 1;
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
        // This will update the position if Firebase has a more recent one
        loadUserProgress();
    } else {
        console.warn('No user logged in. Progress will not be saved.');
        currentUser = null;
    }
});

// 🔥 CRITICAL FIX: Initialize with cached position BEFORE DOMContentLoaded
// This ensures the correct position is set before any UI updates
current = getLastPositionSync(); // Get cached position synchronously
learnedItems = getLearnedItemsSync(); // Get cached learned time markers

console.log(`⚡ Instant resume at time marker: ${timeMarkersData[current].marker} (index ${current})`);

// Initialize the lesson
document.addEventListener('DOMContentLoaded', function() {
    addAnimationStyles();
    preloadVideos();
    
    // 🔥 CRITICAL FIX: Display at the CORRECT cached position immediately
    // The 'current' variable is already set from cache before this runs
    console.log(`🎯 Displaying time marker at index ${current}: ${timeMarkersData[current].marker}`);
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
            // Don't auto-mark as learned on page load - only when user navigates
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
    
    // Quiz modal event listeners
    const startQuizBtn = document.getElementById('startQuizBtn');
    const cancelQuizBtn = document.getElementById('cancelQuizBtn');
    const quizModal = document.getElementById('quizModal');
    
    if (startQuizBtn) {
        startQuizBtn.addEventListener('click', function() {
            window.location.href = '/HTML/Quiz/timemarkersquiz.html';
        });
    }
    
    if (cancelQuizBtn) {
        cancelQuizBtn.addEventListener('click', function() {
            hideQuizModal();
        });
    }
    
    if (quizModal) {
        quizModal.addEventListener('click', function(e) {
            if (e.target === quizModal) {
                hideQuizModal();
            }
        });
    }
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('quizModal');
            if (modal && modal.classList.contains('show')) {
                hideQuizModal();
            }
        }
    });
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