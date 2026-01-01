// Import Firebase modules
import { auth, db } from '../firebase.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// Filipino Alphabet A-Z (with example words)
// CHANGED: img property renamed to video, and paths point to .mp4 files with CAPITAL letter filenames
const alphabetData = [
    { letter: 'A', desc: `<strong>The first letter of the Filipino alphabet.</strong><br>—often used to begin words and names.<br>Ex. "A is for aso (dog)."`, video: '/PICTURES/fsl_alphabet/A.mp4' },
    { letter: 'B', desc: `<strong>The second letter of the Filipino alphabet.</strong><br>Ex. "B is for bata (child)."`, video: '/PICTURES/fsl_alphabet/B.mp4' },
    { letter: 'C', desc: `<strong>The third letter of the Filipino alphabet.</strong><br>Ex. "C is for cat (pusa)."`, video: '/PICTURES/fsl_alphabet/C.mp4' },
    { letter: 'D', desc: `<strong>The fourth letter of the Filipino alphabet.</strong><br>Ex. "D is for daga (rat)."`, video: '/PICTURES/fsl_alphabet/D.mp4' },
    { letter: 'E', desc: `<strong>The fifth letter of the Filipino alphabet.</strong><br>Ex. "E is for eroplano (airplane)."`, video: '/PICTURES/fsl_alphabet/E.mp4' },
    { letter: 'F', desc: `<strong>The sixth letter of the Filipino alphabet.</strong><br>Ex. "F is for pamilya (family, using the sound 'f' for foreign words)."`, video: '/PICTURES/fsl_alphabet/F.mp4' },
    { letter: 'G', desc: `<strong>The seventh letter of the Filipino alphabet.</strong><br>Ex. "G is for gabi (night)."`, video: '/PICTURES/fsl_alphabet/G.mp4' },
    { letter: 'H', desc: `<strong>The eighth letter of the Filipino alphabet.</strong><br>Ex. "H is for hayop (animal)."`, video: '/PICTURES/fsl_alphabet/H.mp4' },
    { letter: 'I', desc: `<strong>The ninth letter of the Filipino alphabet.</strong><br>Ex. "I is for isla (island)."`, video: '/PICTURES/fsl_alphabet/I.mp4' },
    { letter: 'J', desc: `<strong>The tenth letter of the Filipino alphabet.</strong><br>Ex. "J is for jeep."`, video: '/PICTURES/fsl_alphabet/J.mp4' },
    { letter: 'K', desc: `<strong>The eleventh letter of the Filipino alphabet.</strong><br>Ex. "K is for kabayo (horse)."`, video: '/PICTURES/fsl_alphabet/K.mp4' },
    { letter: 'L', desc: `<strong>The twelfth letter of the Filipino alphabet.</strong><br>Ex. "L is for langit (sky)."`, video: '/PICTURES/fsl_alphabet/L.mp4' },
    { letter: 'M', desc: `<strong>The thirteenth letter of the Filipino alphabet.</strong><br>Ex. "M is for mata (eye)."`, video: '/PICTURES/fsl_alphabet/M.mp4' },
    { letter: 'N', desc: `<strong>The fourteenth letter of the Filipino alphabet.</strong><br>Ex. "N is for ngipin (teeth)."`, video: '/PICTURES/fsl_alphabet/N.mp4' },
    { letter: 'O', desc: `<strong>The fifteenth letter of the Filipino alphabet.</strong><br>Ex. "O is for oso (bear)."`, video: '/PICTURES/fsl_alphabet/O.mp4' },
    { letter: 'P', desc: `<strong>The sixteenth letter of the Filipino alphabet.</strong><br>Ex. "P is for puno (tree)."`, video: '/PICTURES/fsl_alphabet/P.mp4' },
    { letter: 'Q', desc: `<strong>The seventeenth letter of the Filipino alphabet.</strong><br>Ex. "Q is for quwento (story, using 'q' for foreign words)."`, video: '/PICTURES/fsl_alphabet/Q.mp4' },
    { letter: 'R', desc: `<strong>The eighteenth letter of the Filipino alphabet.</strong><br>Ex. "R is for rosas (rose)."`, video: '/PICTURES/fsl_alphabet/R.mp4' },
    { letter: 'S', desc: `<strong>The nineteenth letter of the Filipino alphabet.</strong><br>Ex. "S is for saging (banana)."`, video: '/PICTURES/fsl_alphabet/S.mp4' },
    { letter: 'T', desc: `<strong>The twentieth letter of the Filipino alphabet.</strong><br>Ex. "T is for tubig (water)."`, video: '/PICTURES/fsl_alphabet/T.mp4' },
    { letter: 'U', desc: `<strong>The twenty-first letter of the Filipino alphabet.</strong><br>Ex. "U is for ulan (rain)."`, video: '/PICTURES/fsl_alphabet/U.mp4' },
    { letter: 'V', desc: `<strong>The twenty-second letter of the Filipino alphabet.</strong><br>Ex. "V is for van (using 'v' for foreign words)."`, video: '/PICTURES/fsl_alphabet/V.mp4' },
    { letter: 'W', desc: `<strong>The twenty-third letter of the Filipino alphabet.</strong><br>Ex. "W is for walis (broom)."`, video: '/PICTURES/fsl_alphabet/W.mp4' },
    { letter: 'X', desc: `<strong>The twenty-fourth letter of the Filipino alphabet.</strong><br>Ex. "X is for x-ray (using 'x' for foreign words)."`, video: '/PICTURES/fsl_alphabet/X.mp4' },
    { letter: 'Y', desc: `<strong>The twenty-fifth letter of the Filipino alphabet.</strong><br>Ex. "Y is for yelo (ice)."`, video: '/PICTURES/fsl_alphabet/Y.mp4' },
    { letter: 'Z', desc: `<strong>The last letter of the Filipino alphabet.</strong><br>Ex. "Z is for zebra."`, video: '/PICTURES/fsl_alphabet/Z.mp4' }
];

let current = 0;
let isAnimating = false;
let currentUser = null;
let learnedLetters = new Set();
let isInitialized = false;

// OPTIMIZATION 1: Get last position from sessionStorage IMMEDIATELY (synchronous)
function getLastPositionSync() {
    try {
        const cached = sessionStorage.getItem('alphabet_position');
        if (cached) {
            const { letter, timestamp } = JSON.parse(cached);
            // Cache valid for 24 hours
            if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
                const index = alphabetData.findIndex(item => item.letter === letter);
                if (index !== -1) {
                    console.log(`⚡ Restored position from cache: ${letter} (index ${index})`);
                    return index;
                }
            }
        }
    } catch (error) {
        console.error('Error reading position cache:', error);
    }
    console.log('⚡ No valid cache, starting at A (index 0)');
    return 0; // Default to 'A'
}

// OPTIMIZATION 2: Save position to sessionStorage immediately (synchronous)
function savePositionSync(letter) {
    try {
        sessionStorage.setItem('alphabet_position', JSON.stringify({
            letter,
            timestamp: Date.now()
        }));
        console.log(`💾 Saved position: ${letter}`);
    } catch (error) {
        console.error('Error saving position cache:', error);
    }
}

// OPTIMIZATION 3: Get learned letters from sessionStorage
function getLearnedLettersSync() {
    try {
        const cached = sessionStorage.getItem('alphabet_learned');
        if (cached) {
            const { letters, timestamp } = JSON.parse(cached);
            // Cache valid for 1 hour
            if (Date.now() - timestamp < 60 * 60 * 1000) {
                console.log(`📚 Restored ${letters.length} learned letters from cache`);
                return new Set(letters);
            }
        }
    } catch (error) {
        console.error('Error reading learned cache:', error);
    }
    return new Set();
}

// OPTIMIZATION 4: Save learned letters to sessionStorage
function saveLearnedLettersSync(letters) {
    try {
        sessionStorage.setItem('alphabet_learned', JSON.stringify({
            letters: Array.from(letters),
            timestamp: Date.now()
        }));
    } catch (error) {
        console.error('Error saving learned cache:', error);
    }
}

// NEW: Preload videos for smoother transitions
function preloadVideos() {
    alphabetData.forEach(item => {
        const video = document.createElement('video');
        video.preload = 'metadata'; // Load metadata only to save bandwidth
        video.src = item.video;
    });
}

// Load user progress from Firebase (background task)
async function loadUserProgress() {
    if (!currentUser) return;

    try {
        const progressRef = doc(db, 'users', currentUser.uid, 'progress', 'alphabet');
        const progressSnap = await getDoc(progressRef);

        if (progressSnap.exists()) {
            const data = progressSnap.data();
            learnedLetters = new Set(data.learnedLetters || []);
            
            // Update sessionStorage with fresh data from Firebase
            saveLearnedLettersSync(learnedLetters);
            
            // 🔥 FIX: Update position if different from cached AND update display
            if (data.lastViewedLetter) {
                const lastIndex = alphabetData.findIndex(item => item.letter === data.lastViewedLetter);
                if (lastIndex !== -1 && lastIndex !== current) {
                    console.log(`🔄 Firebase has different position: ${data.lastViewedLetter} (index ${lastIndex})`);
                    current = lastIndex;
                    savePositionSync(data.lastViewedLetter);
                    // Update the display to show the correct letter
                    updateLesson('next', true);
                }
            }
            
            console.log('✓ Background sync complete:', learnedLetters.size, 'letters learned');
        } else {
            // Initialize progress document if it doesn't exist
            await setDoc(progressRef, {
                learnedLetters: [],
                total: 26,
                lastViewedLetter: alphabetData[current].letter,
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
        const progressRef = doc(db, 'users', currentUser.uid, 'progress', 'alphabet');
        const learnedArray = Array.from(learnedLetters);
        const currentLetter = alphabetData[current].letter;
        
        // Save to sessionStorage immediately
        saveLearnedLettersSync(learnedLetters);
        savePositionSync(currentLetter);
        
        // Save to Firebase in background
        await setDoc(progressRef, {
            learnedLetters: learnedArray,
            completed: learnedArray.length,
            total: 26,
            percentage: Math.round((learnedArray.length / 26) * 100),
            lastViewedLetter: currentLetter,
            lastUpdated: new Date()
        }, { merge: true });

        console.log('✓ Progress saved:', learnedArray.length, '/', 26, '- At:', currentLetter);
    } catch (error) {
        console.error('Error saving progress:', error);
    }
}

// Mark current letter as learned
function markLetterAsLearned() {
    const currentLetter = alphabetData[current].letter;
    
    if (!learnedLetters.has(currentLetter)) {
        learnedLetters.add(currentLetter);
        console.log(`✓ Marked ${currentLetter} as learned`);
    }
    
    // Save progress (non-blocking)
    saveUserProgress();
}

// NEW: Play video when loaded
function playVideo(videoElement) {
    videoElement.play().catch(error => {
        console.log('Video autoplay prevented:', error);
        // Autoplay was prevented, video will play on user interaction
    });
}

// NEW: Reset and play video
function resetAndPlayVideo(videoElement) {
    videoElement.currentTime = 0;
    playVideo(videoElement);
}

function updateLesson(direction = 'next', skipAnimation = false) {
    if (isAnimating && !skipAnimation) return;
    
    if (!skipAnimation) {
        isAnimating = true;
    }
    
    const letterEl = document.getElementById('letter');
    const descEl = document.getElementById('desc');
    const videoEl = document.getElementById('signVideo'); // CHANGED: from signImg to signVideo
    const leftContent = document.querySelector('.lesson-left');
    const rightContent = document.querySelector('.lesson-right');
    
    if (skipAnimation) {
        // Immediate update without animation
        letterEl.textContent = alphabetData[current].letter;
        descEl.innerHTML = `<p>${alphabetData[current].desc}</p>`;
        
        // CHANGED: Update video source and play
        videoEl.src = alphabetData[current].video;
        videoEl.load(); // Load the new video
        playVideo(videoEl); // Auto-play
        
        updateNavButtons();
        
        // 🔥 FIX: Don't mark as learned on initial display - wait for user interaction
        // The letter is already learned if it's in the cache
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
        // Mark current letter as learned before moving
        markLetterAsLearned();
        
        // Update the content
        letterEl.textContent = alphabetData[current].letter;
        descEl.innerHTML = `<p>${alphabetData[current].desc}</p>`;
        
        // CHANGED: Update video source and reset/play
        videoEl.src = alphabetData[current].video;
        videoEl.load();
        resetAndPlayVideo(videoEl);
        
        // Remove old classes and add entrance animation
        leftContent.classList.remove(slideOutClass);
        rightContent.classList.remove(slideOutClass);
        leftContent.classList.add(slideInClass);
        rightContent.classList.add(slideInClass);
        
        // Update navigation button visibility
        updateNavButtons();
        
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
    
    // Hide the left arrow if on the first slide, show otherwise
    if (current === 0) {
        prevBtn.style.opacity = '0.3';
        prevBtn.style.pointerEvents = 'none';
    } else {
        prevBtn.style.opacity = '1';
        prevBtn.style.pointerEvents = 'auto';
    }
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
        
        /* CHANGED: Video styles instead of image */
        .lesson-video {
            transition: opacity 0.2s ease;
        }
        
        .lesson-letter {
            transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .lesson-card:not(.animating) .lesson-letter:hover {
            transform: scale(1.05);
        }
        
        .nav-arrow:hover {
            transform: translateY(-50%) scale(1.1);
        }
    `;
    document.head.appendChild(style);
}

// Enhanced navigation with direction awareness
function navigatePrevious() {
    if (isAnimating) return;
    
    const newIndex = (current === 0) ? alphabetData.length - 1 : current - 1;
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
    
    // Check if we're on the last letter (Z)
    if (current === alphabetData.length - 1) {
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
        if (current !== alphabetData.length - 1) {
            current = alphabetData.length - 1;
            updateLesson('next');
        }
    } else if (e.key === "Enter" && current === alphabetData.length - 1) {
        // Allow Enter key to trigger quiz prompt when on last letter
        e.preventDefault();
        navigateNext();
    } else if (e.key === " " || e.key === "Spacebar") {
        // NEW: Space bar to replay video
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
learnedLetters = getLearnedLettersSync(); // Get cached learned letters

console.log(`⚡ Instant resume at letter: ${alphabetData[current].letter} (index ${current})`);

// Initialize the lesson
document.addEventListener('DOMContentLoaded', function() {
    addAnimationStyles();
    preloadVideos(); // CHANGED: preload videos instead of images
    
    // 🔥 CRITICAL FIX: Display at the CORRECT cached position immediately
    // The 'current' variable is already set from cache before this runs
    console.log(`🎯 Displaying letter at index ${current}: ${alphabetData[current].letter}`);
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
    
    // NEW: Add click-to-replay functionality on video
    const videoEl = document.getElementById('signVideo');
    if (videoEl) {
        videoEl.addEventListener('click', function() {
            resetAndPlayVideo(this);
        });
        
        // NEW: Loop video continuously
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
            // Navigate to alphabet quiz page
            window.location.href = '/HTML/Quiz/alphabetquiz.html';
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