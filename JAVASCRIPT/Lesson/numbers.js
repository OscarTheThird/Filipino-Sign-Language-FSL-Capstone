// Import Firebase modules
import { auth, db } from '../firebase.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// Filipino Sign Language Numbers Data
const numbersData = [
    { number: '1', desc: `<strong>Number 1</strong><br>Ex. "Isa ang araw ng pahinga sa isang linggo."`, video: '/PICTURES/fsl_numbers/1.mp4' },
    { number: '2', desc: `<strong>Number 2</strong><br>Ex. "Dalawa ang mata ng tao."`, video: '/PICTURES/fsl_numbers/2.mp4' },
    { number: '3', desc: `<strong>Number 3</strong><br>Ex. "Tatlo ang pagkain sa isang araw: almusal, tanghalian, hapunan."`, video: '/PICTURES/fsl_numbers/3.mp4' },
    { number: '4', desc: `<strong>Number 4</strong><br>Ex. "Apat ang gulong ng kotse."`, video: '/PICTURES/fsl_numbers/4.mp4' },
    { number: '5', desc: `<strong>Number 5</strong><br>Ex. "Lima ang daliri sa isang kamay."`, video: '/PICTURES/fsl_numbers/5.mp4' },
    { number: '6', desc: `<strong>Number 6</strong><br>Ex. "Anim ang itlog sa lalagyan."`, video: '/PICTURES/fsl_numbers/6.mp4' },
    { number: '7', desc: `<strong>Number 7</strong><br>Ex. "Pito ang araw sa isang linggo."`, video: '/PICTURES/fsl_numbers/7.mp4' },
    { number: '8', desc: `<strong>Number 8</strong><br>Ex. "Walo ang paa ng gagamba."`, video: '/PICTURES/fsl_numbers/8.mp4' },
    { number: '9', desc: `<strong>Number 9</strong><br>Ex. "Siyam na bituin sa watawat ng Pilipinas."`, video: '/PICTURES/fsl_numbers/9.mp4' },
    { number: '10', desc: `<strong>Number 10</strong><br>Ex. "Sampu ang estudyante sa silid-aralan."`, video: '/PICTURES/fsl_numbers/10.mp4' }
];

let current = 0;
let isAnimating = false;
let currentUser = null;
let learnedNumbers = new Set();
let isInitialized = false;

// Get last position from sessionStorage immediately (synchronous)
function getLastPositionSync() {
    try {
        const cached = sessionStorage.getItem('numbers_position');
        if (cached) {
            const { number, timestamp } = JSON.parse(cached);
            // Cache valid for 24 hours
            if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
                const index = numbersData.findIndex(item => item.number === number);
                if (index !== -1) {
                    console.log(`⚡ Restored position from cache: ${number} (index ${index})`);
                    return index;
                }
            }
        }
    } catch (error) {
        console.error('Error reading position cache:', error);
    }
    console.log('⚡ No valid cache, starting at 1 (index 0)');
    return 0; // Default to '1'
}

// Save position to sessionStorage immediately (synchronous)
function savePositionSync(number) {
    try {
        sessionStorage.setItem('numbers_position', JSON.stringify({
            number,
            timestamp: Date.now()
        }));
        console.log(`💾 Saved position: ${number}`);
    } catch (error) {
        console.error('Error saving position cache:', error);
    }
}

// Get learned numbers from sessionStorage
function getLearnedNumbersSync() {
    try {
        const cached = sessionStorage.getItem('numbers_learned');
        if (cached) {
            const { numbers, timestamp } = JSON.parse(cached);
            // Cache valid for 1 hour
            if (Date.now() - timestamp < 60 * 60 * 1000) {
                console.log(`📚 Restored ${numbers.length} learned numbers from cache`);
                return new Set(numbers);
            }
        }
    } catch (error) {
        console.error('Error reading learned cache:', error);
    }
    return new Set();
}

// Save learned numbers to sessionStorage
function saveLearnedNumbersSync(numbers) {
    try {
        sessionStorage.setItem('numbers_learned', JSON.stringify({
            numbers: Array.from(numbers),
            timestamp: Date.now()
        }));
    } catch (error) {
        console.error('Error saving learned cache:', error);
    }
}

// Preload videos for smoother transitions
function preloadVideos() {
    numbersData.forEach(item => {
        const video = document.createElement('video');
        video.preload = 'metadata'; // Load metadata only to save bandwidth
        video.src = item.video;
    });
}

// Load user progress from Firebase (background task)
async function loadUserProgress() {
    if (!currentUser) return;

    try {
        const progressRef = doc(db, 'users', currentUser.uid, 'progress', 'numbers');
        const progressSnap = await getDoc(progressRef);

        if (progressSnap.exists()) {
            const data = progressSnap.data();
            learnedNumbers = new Set(data.learnedNumbers || []);
            
            // Update sessionStorage with fresh data from Firebase
            saveLearnedNumbersSync(learnedNumbers);
            
            // 🔥 FIX: Update position if different from cached AND update display
            if (data.lastViewedNumber) {
                const lastIndex = numbersData.findIndex(item => item.number === data.lastViewedNumber);
                if (lastIndex !== -1 && lastIndex !== current) {
                    console.log(`🔄 Firebase has different position: ${data.lastViewedNumber} (index ${lastIndex})`);
                    current = lastIndex;
                    savePositionSync(data.lastViewedNumber);
                    // Update the display to show the correct number
                    updateLesson('next', true);
                }
            }
            
            console.log('✓ Background sync complete:', learnedNumbers.size, 'numbers learned');
        } else {
            // Initialize progress document if it doesn't exist
            await setDoc(progressRef, {
                learnedNumbers: [],
                total: 10,
                lastViewedNumber: numbersData[current].number,
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
        const progressRef = doc(db, 'users', currentUser.uid, 'progress', 'numbers');
        const learnedArray = Array.from(learnedNumbers);
        const currentNumber = numbersData[current].number;
        
        // Save to sessionStorage immediately
        saveLearnedNumbersSync(learnedNumbers);
        savePositionSync(currentNumber);
        
        // Save to Firebase in background
        await setDoc(progressRef, {
            learnedNumbers: learnedArray,
            completed: learnedArray.length,
            total: 10,
            percentage: Math.round((learnedArray.length / 10) * 100),
            lastViewedNumber: currentNumber,
            lastUpdated: new Date()
        }, { merge: true });

        console.log('✓ Progress saved:', learnedArray.length, '/', 10, '- At:', currentNumber);
    } catch (error) {
        console.error('Error saving progress:', error);
    }
}

// Mark current number as learned
function markNumberAsLearned() {
    const currentNumber = numbersData[current].number;
    
    if (!learnedNumbers.has(currentNumber)) {
        learnedNumbers.add(currentNumber);
        console.log(`✓ Marked ${currentNumber} as learned`);
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
    
    const numberEl = document.getElementById('letter');
    const descEl = document.getElementById('desc');
    const videoEl = document.getElementById('signVideo');
    const leftContent = document.querySelector('.lesson-left');
    const rightContent = document.querySelector('.lesson-right');
    
    if (skipAnimation) {
        // Immediate update without animation
        numberEl.innerHTML = numbersData[current].number + 
            ` <span class="number-visual" style="font-size:0.7em; color:#6d42c7; margin-left:8px;">${'●'.repeat(parseInt(numbersData[current].number) <= 5 ? parseInt(numbersData[current].number) : 5)}${parseInt(numbersData[current].number) > 5 ? '...' : ''}</span>`;
        descEl.innerHTML = `<p>${numbersData[current].desc}</p>`;
        
        // Update video source and play
        videoEl.src = numbersData[current].video;
        videoEl.load(); // Load the new video
        playVideo(videoEl); // Auto-play
        
        updateNavButtons();
        updateNumberStyling();
        
        // 🔥 FIX: Don't mark as learned on initial display - wait for user interaction
        // The number is already learned if it's in the cache
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
        // Mark current number as learned before moving
        markNumberAsLearned();
        
        // Update the content
        numberEl.innerHTML = numbersData[current].number + 
            ` <span class="number-visual" style="font-size:0.7em; color:#6d42c7; margin-left:8px;">${'●'.repeat(parseInt(numbersData[current].number) <= 5 ? parseInt(numbersData[current].number) : 5)}${parseInt(numbersData[current].number) > 5 ? '...' : ''}</span>`;
        descEl.innerHTML = `<p>${numbersData[current].desc}</p>`;
        
        // Update video source and reset/play
        videoEl.src = numbersData[current].video;
        videoEl.load();
        resetAndPlayVideo(videoEl);
        
        // Remove old classes and add entrance animation
        leftContent.classList.remove(slideOutClass);
        rightContent.classList.remove(slideOutClass);
        leftContent.classList.add(slideInClass);
        rightContent.classList.add(slideInClass);
        
        // Update navigation button visibility
        updateNavButtons();
        
        // Update number-based styling
        updateNumberStyling();
        
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
    
    if (current === 0) {
        prevBtn.style.opacity = '0.3';
        prevBtn.style.pointerEvents = 'none';
    } else {
        prevBtn.style.opacity = '1';
        prevBtn.style.pointerEvents = 'auto';
    }
}

// Add number-based styling
function updateNumberStyling() {
    const lessonCard = document.querySelector('.lesson-card');
    const currentNumber = numbersData[current].number;
    
    // Remove existing number classes
    lessonCard.className = lessonCard.className.replace(/number-\d+/g, '');
    
    // Add current number class
    lessonCard.classList.add(`number-${currentNumber}`);
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
        
        #letter {
            transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .lesson-card:not(.animating) #letter:hover {
            transform: scale(1.05);
        }
        
        .number-visual {
            transition: all 0.3s ease;
            display: inline-block;
        }
        
        .number-visual:hover {
            transform: scale(1.2);
            color: #9333ea !important;
        }
        
        /* Progressive color scheme based on numbers */
        .number-1 #letter { color: #ef4444; }
        .number-2 #letter { color: #f97316; }
        .number-3 #letter { color: #eab308; }
        .number-4 #letter { color: #22c55e; }
        .number-5 #letter { color: #06b6d4; }
        .number-6 #letter { color: #3b82f6; }
        .number-7 #letter { color: #8b5cf6; }
        .number-8 #letter { color: #a855f7; }
        .number-9 #letter { color: #ec4899; }
        .number-10 #letter { color: #f59e0b; }
        
        /* Animated counting effect */
        .number-visual {
            animation: countPulse 0.6s ease-in-out;
        }
        
        @keyframes countPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; transform: scale(1.1); }
        }
        
        /* Special effects for milestone numbers */
        .number-5 .lesson-card,
        .number-10 .lesson-card {
            box-shadow: 0 15px 40px rgba(109, 66, 199, 0.15);
        }
        
        .number-10 #letter {
            background: linear-gradient(45deg, #f59e0b, #dc2626);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
    `;
    document.head.appendChild(style);
}

// Enhanced navigation with direction awareness
function navigatePrevious() {
    if (isAnimating) return;
    
    const newIndex = (current === 0) ? numbersData.length - 1 : current - 1;
    current = newIndex;
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
    
    // Check if we're on the last item
    if (current === numbersData.length - 1) {
        // Show custom popup modal asking if ready for quiz
        showQuizModal();
        return;
    }
    
    const newIndex = current + 1;
    current = newIndex;
    updateLesson('next');
}

// Event listeners
document.getElementById('prevBtn').onclick = navigatePrevious;
document.getElementById('nextBtn').onclick = navigateNext;

// Enhanced keyboard navigation with number keys
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
        if (current !== numbersData.length - 1) {
            current = numbersData.length - 1;
            updateLesson('next');
        }
    }
    // Number key shortcuts
    else if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const targetIndex = parseInt(e.key) - 1;
        if (targetIndex < numbersData.length && targetIndex !== current) {
            const direction = targetIndex > current ? 'next' : 'prev';
            current = targetIndex;
            updateLesson(direction);
        }
    } else if (e.key === '0') {
        e.preventDefault();
        if (current !== 9) { // Index 9 is number 10
            current = 9;
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
learnedNumbers = getLearnedNumbersSync(); // Get cached learned numbers

console.log(`⚡ Instant resume at number: ${numbersData[current].number} (index ${current})`);

// Initialize the lesson
document.addEventListener('DOMContentLoaded', function() {
    addAnimationStyles();
    preloadVideos();
    
    // 🔥 CRITICAL FIX: Display at the CORRECT cached position immediately
    // The 'current' variable is already set from cache before this runs
    console.log(`🎯 Displaying number at index ${current}: ${numbersData[current].number}`);
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
            // Navigate to numbers quiz page
            window.location.href = '/HTML/Quiz/numbersquiz.html';
        });
    }
    
    if (cancelQuizBtn) {
        cancelQuizBtn.addEventListener('click', function() {
            hideQuizModal();
        });
    }
    
    // Close modal when clicking outside of it
    if (quizModal) {
        quizModal.addEventListener('click', function(e) {
            if (e.target === quizModal) {
                hideQuizModal();
            }
        });
    }
    
    // Close modal with Escape key
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