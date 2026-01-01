// Import Firebase modules
import { auth, db } from '../firebase.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// Filipino Sign Language School/Educational Context Data
const educationalData = [
  {
    term: "Teacher",
    desc: `<strong>A person who educates and guides students.</strong><br>Used to refer to educators in schools and learning environments.<br>Filipino: "Guro"`,
    video: "/PICTURES/fsl_school_education/GURO.mp4",
  },
  {
    term: "Student",
    desc: `<strong>A person who is learning or studying.</strong><br>Used to refer to learners in educational institutions.<br>Filipino: "Estudyante"`,
    video: "/PICTURES/fsl_school_education/ESTUDYANTE.mp4",
  },
  {
    term: "Study",
    desc: `<strong>The act of learning or gaining knowledge.</strong><br>Used to describe the process of education and acquiring information.<br>Filipino: "Aral"`,
    video: "/PICTURES/fsl_school_education/ARAL.mp4",
  },
];

let current = 0;
let isAnimating = false;
let currentUser = null;
let learnedTerms = new Set();
let isInitialized = false;

// Get last position from sessionStorage immediately (synchronous)
function getLastPositionSync() {
    try {
        const cached = sessionStorage.getItem('educational_position');
        if (cached) {
            const { term, timestamp } = JSON.parse(cached);
            // Cache valid for 24 hours
            if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
                const index = educationalData.findIndex(item => item.term === term);
                if (index !== -1) {
                    console.log(`⚡ Restored position from cache: ${term} (index ${index})`);
                    return index;
                }
            }
        }
    } catch (error) {
        console.error('Error reading position cache:', error);
    }
    console.log('⚡ No valid cache, starting at Teacher (index 0)');
    return 0; // Default to 'Teacher'
}

// Save position to sessionStorage immediately (synchronous)
function savePositionSync(term) {
    try {
        sessionStorage.setItem('educational_position', JSON.stringify({
            term,
            timestamp: Date.now()
        }));
        console.log(`💾 Saved position: ${term}`);
    } catch (error) {
        console.error('Error saving position cache:', error);
    }
}

// Get learned educational terms from sessionStorage
function getLearnedTermsSync() {
    try {
        const cached = sessionStorage.getItem('educational_learned');
        if (cached) {
            const { items, timestamp } = JSON.parse(cached);
            // Cache valid for 1 hour
            if (Date.now() - timestamp < 60 * 60 * 1000) {
                console.log(`📚 Restored ${items.length} learned terms from cache`);
                return new Set(items);
            }
        }
    } catch (error) {
        console.error('Error reading learned cache:', error);
    }
    return new Set();
}

// Save learned educational terms to sessionStorage
function saveLearnedTermsSync(items) {
    try {
        sessionStorage.setItem('educational_learned', JSON.stringify({
            items: Array.from(items),
            timestamp: Date.now()
        }));
    } catch (error) {
        console.error('Error saving learned cache:', error);
    }
}

// Preload videos for smoother transitions
function preloadVideos() {
    educationalData.forEach(item => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = item.video;
    });
}

// Load user progress from Firebase (background task)
async function loadUserProgress() {
    if (!currentUser) return;

    try {
        const progressRef = doc(db, 'users', currentUser.uid, 'progress', 'educational');
        const progressSnap = await getDoc(progressRef);

        if (progressSnap.exists()) {
            const data = progressSnap.data();
            learnedTerms = new Set(data.learnedTerms || []);
            
            // Update sessionStorage with fresh data from Firebase
            saveLearnedTermsSync(learnedTerms);
            
            // 🔥 FIX: Update position if different from cached AND update display
            if (data.lastViewedTerm) {
                const lastIndex = educationalData.findIndex(item => item.term === data.lastViewedTerm);
                if (lastIndex !== -1 && lastIndex !== current) {
                    console.log(`🔄 Firebase has different position: ${data.lastViewedTerm} (index ${lastIndex})`);
                    current = lastIndex;
                    savePositionSync(data.lastViewedTerm);
                    // Update the display to show the correct term
                    updateLesson('next', true);
                }
            }
            
            console.log('✓ Background sync complete:', learnedTerms.size, 'educational terms learned');
        } else {
            // Initialize progress document if it doesn't exist
            await setDoc(progressRef, {
                learnedTerms: [],
                total: 3,
                lastViewedTerm: educationalData[current].term,
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
        const progressRef = doc(db, 'users', currentUser.uid, 'progress', 'educational');
        const learnedArray = Array.from(learnedTerms);
        const currentTerm = educationalData[current].term;
        
        // Save to sessionStorage immediately
        saveLearnedTermsSync(learnedTerms);
        savePositionSync(currentTerm);
        
        // Save to Firebase in background
        await setDoc(progressRef, {
            learnedTerms: learnedArray,
            completed: learnedArray.length,
            total: 3,
            percentage: Math.round((learnedArray.length / 3) * 100),
            lastViewedTerm: currentTerm,
            lastUpdated: new Date()
        }, { merge: true });

        console.log('✓ Progress saved:', learnedArray.length, '/', 3, '- At:', currentTerm);
    } catch (error) {
        console.error('Error saving progress:', error);
    }
}

// Mark current educational term as learned
function markTermAsLearned() {
    const currentTerm = educationalData[current].term;
    
    if (!learnedTerms.has(currentTerm)) {
        learnedTerms.add(currentTerm);
        console.log(`✓ Marked ${currentTerm} as learned`);
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
        greetingEl.textContent = educationalData[current].term;
        descEl.innerHTML = `<p>${educationalData[current].desc}</p>`;
        
        // Update video source and play
        videoEl.src = educationalData[current].video;
        videoEl.load();
        playVideo(videoEl);
        
        updateNavButtons();
        updateEducationalStyling();
        
        // 🔥 FIX: Don't mark as learned on initial display - wait for user interaction
        // The term is already learned if it's in the cache
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
        // Mark current term as learned before moving
        markTermAsLearned();
        
        // Update the content
        greetingEl.textContent = educationalData[current].term;
        descEl.innerHTML = `<p>${educationalData[current].desc}</p>`;
        
        // Update video source and reset/play
        videoEl.src = educationalData[current].video;
        videoEl.load();
        resetAndPlayVideo(videoEl);
        
        // Remove old classes and add entrance animation
        leftContent.classList.remove(slideOutClass);
        rightContent.classList.remove(slideOutClass);
        leftContent.classList.add(slideInClass);
        rightContent.classList.add(slideInClass);
        
        // Update navigation button visibility
        updateNavButtons();
        
        // Update educational styling
        updateEducationalStyling();
        
        // Check if we're on the last slide and show quiz modal
        if (current === educationalData.length - 1) {
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

// Add educational-specific styling
function updateEducationalStyling() {
    const lessonCard = document.querySelector('.lesson-card');
    const currentTerm = educationalData[current].term.toLowerCase().replace(/\s+/g, '');
    
    // Remove existing term classes
    lessonCard.className = lessonCard.className.replace(/term-\w+/g, '');
    
    // Add current term class
    lessonCard.classList.add(`term-${currentTerm}`);
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
        
        /* School/Educational Context specific colors */
        .term-teacher #greeting { 
            color: #8E44AD; 
            text-shadow: 0 2px 4px rgba(142, 68, 173, 0.4);
        }
        .term-student #greeting { 
            color: #3498DB; 
            text-shadow: 0 2px 4px rgba(52, 152, 219, 0.4);
        }
        .term-study #greeting { 
            color: #E67E22; 
            text-shadow: 0 2px 4px rgba(230, 126, 34, 0.4);
        }
        
        /* Add subtle background gradients based on educational terms */
        .term-teacher {
            background: linear-gradient(135deg, #fff 0%, #f3e5f5 100%);
        }
        .term-student {
            background: linear-gradient(135deg, #fff 0%, #e3f2fd 100%);
        }
        .term-study {
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
    if (current === educationalData.length - 1) {
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
        if (current !== educationalData.length - 1) {
            current = educationalData.length - 1;
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
learnedTerms = getLearnedTermsSync(); // Get cached learned terms

console.log(`⚡ Instant resume at term: ${educationalData[current].term} (index ${current})`);

// Initialize the lesson
document.addEventListener('DOMContentLoaded', function() {
    addAnimationStyles();
    preloadVideos();
    
    // 🔥 CRITICAL FIX: Display at the CORRECT cached position immediately
    // The 'current' variable is already set from cache before this runs
    console.log(`🎯 Displaying term at index ${current}: ${educationalData[current].term}`);
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
            window.location.href = '/HTML/Quiz/educationalcontextquiz.html';
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