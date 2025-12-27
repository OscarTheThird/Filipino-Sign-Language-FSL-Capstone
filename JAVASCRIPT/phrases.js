// Import Firebase modules
import { auth, db } from './firebase.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// Filipino Sign Language Common Phrases Data
const phrasesData = [
    { 
        phrase: 'AKO SI', 
        desc: `<strong>I am - Used to introduce yourself.</strong><br>Example: "Ako si Juan" (I am Juan)<br>Filipino: "Ako si"`, 
        video: '/PICTURES/fsl_common_phrases/AKO SI.mp4' 
    },
    { 
        phrase: 'OO', 
        desc: `<strong>Yes - Used to agree or confirm.</strong><br>Example: "Oo, tama ka" (Yes, you are right)<br>Filipino: "Oo"`, 
        video: '/PICTURES/fsl_common_phrases/OO.mp4' 
    },
    { 
        phrase: 'HINDI', 
        desc: `<strong>No - Used to disagree or deny.</strong><br>Example: "Hindi, mali yan" (No, that's wrong)<br>Filipino: "Hindi"`, 
        video: '/PICTURES/fsl_common_phrases/HINDI.mp4' 
    },
    { 
        phrase: 'AKO AY MABUTI', 
        desc: `<strong>I am fine - Used to respond when asked how you are.</strong><br>Example: "Ako ay mabuti, salamat" (I am fine, thank you)<br>Filipino: "Ako ay mabuti"`, 
        video: '/PICTURES/fsl_common_phrases/AKO AY MABUTI.mp4' 
    }
];

let current = 0;
let isAnimating = false;
let currentUser = null;
let learnedPhrases = new Set();
let isInitialized = false;

// OPTIMIZATION 1: Get last position from sessionStorage IMMEDIATELY (synchronous)
function getLastPositionSync() {
    try {
        const cached = sessionStorage.getItem('phrases_position');
        if (cached) {
            const { phrase, timestamp } = JSON.parse(cached);
            // Cache valid for 24 hours
            if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
                const index = phrasesData.findIndex(item => item.phrase === phrase);
                if (index !== -1) {
                    return index;
                }
            }
        }
    } catch (error) {
        console.error('Error reading position cache:', error);
    }
    return 0; // Default to 'AKO SI'
}

// OPTIMIZATION 2: Save position to sessionStorage immediately (synchronous)
function savePositionSync(phrase) {
    try {
        sessionStorage.setItem('phrases_position', JSON.stringify({
            phrase,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.error('Error saving position cache:', error);
    }
}

// OPTIMIZATION 3: Get learned phrases from sessionStorage
function getLearnedPhrasesSync() {
    try {
        const cached = sessionStorage.getItem('phrases_learned');
        if (cached) {
            const { phrases, timestamp } = JSON.parse(cached);
            // Cache valid for 1 hour
            if (Date.now() - timestamp < 60 * 60 * 1000) {
                return new Set(phrases);
            }
        }
    } catch (error) {
        console.error('Error reading learned cache:', error);
    }
    return new Set();
}

// OPTIMIZATION 4: Save learned phrases to sessionStorage
function saveLearnedPhrasesSync(phrases) {
    try {
        sessionStorage.setItem('phrases_learned', JSON.stringify({
            phrases: Array.from(phrases),
            timestamp: Date.now()
        }));
    } catch (error) {
        console.error('Error saving learned cache:', error);
    }
}

// Preload videos for smoother transitions
function preloadVideos() {
    phrasesData.forEach(item => {
        const video = document.createElement('video');
        video.preload = 'metadata'; // Load metadata only to save bandwidth
        video.src = item.video;
    });
}

// Load user progress from Firebase (background task)
async function loadUserProgress() {
    if (!currentUser) return;

    try {
        const progressRef = doc(db, 'users', currentUser.uid, 'progress', 'phrases');
        const progressSnap = await getDoc(progressRef);

        if (progressSnap.exists()) {
            const data = progressSnap.data();
            learnedPhrases = new Set(data.learnedPhrases || []);
            
            // Update sessionStorage with fresh data from Firebase
            saveLearnedPhrasesSync(learnedPhrases);
            
            // Update position if different from cached
            if (data.lastViewedPhrase) {
                const lastIndex = phrasesData.findIndex(item => item.phrase === data.lastViewedPhrase);
                if (lastIndex !== -1 && lastIndex !== current) {
                    current = lastIndex;
                    savePositionSync(data.lastViewedPhrase);
                    updateLesson('next', true); // Update display silently
                }
            }
            
            console.log('✓ Background sync complete:', learnedPhrases.size, 'phrases learned');
        } else {
            // Initialize progress document if it doesn't exist
            await setDoc(progressRef, {
                learnedPhrases: [],
                total: 4,
                lastViewedPhrase: phrasesData[current].phrase,
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
        const progressRef = doc(db, 'users', currentUser.uid, 'progress', 'phrases');
        const learnedArray = Array.from(learnedPhrases);
        const currentPhrase = phrasesData[current].phrase;
        
        // Save to sessionStorage immediately
        saveLearnedPhrasesSync(learnedPhrases);
        savePositionSync(currentPhrase);
        
        // Save to Firebase in background
        await setDoc(progressRef, {
            learnedPhrases: learnedArray,
            completed: learnedArray.length,
            total: 4,
            percentage: Math.round((learnedArray.length / 4) * 100),
            lastViewedPhrase: currentPhrase,
            lastUpdated: new Date()
        }, { merge: true });

        console.log('✓ Progress saved:', learnedArray.length, '/', 4, '- At:', currentPhrase);
    } catch (error) {
        console.error('Error saving progress:', error);
    }
}

// Mark current phrase as learned
function markPhraseAsLearned() {
    const currentPhrase = phrasesData[current].phrase;
    
    if (!learnedPhrases.has(currentPhrase)) {
        learnedPhrases.add(currentPhrase);
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
    
    const phraseEl = document.getElementById('letter');
    const descEl = document.getElementById('desc');
    const videoEl = document.getElementById('signVideo');
    const leftContent = document.querySelector('.lesson-left');
    const rightContent = document.querySelector('.lesson-right');
    
    if (skipAnimation) {
        // Immediate update without animation
        phraseEl.textContent = phrasesData[current].phrase;
        descEl.innerHTML = `<p>${phrasesData[current].desc}</p>`;
        
        // Update video source and play
        videoEl.src = phrasesData[current].video;
        videoEl.load(); // Load the new video
        playVideo(videoEl); // Auto-play
        
        updateNavButtons();
        updatePhraseStyling();
        
        // Mark as learned after initial display
        if (isInitialized) {
            markPhraseAsLearned();
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
        // Mark current phrase as learned before moving
        markPhraseAsLearned();
        
        // Update the content
        phraseEl.textContent = phrasesData[current].phrase;
        descEl.innerHTML = `<p>${phrasesData[current].desc}</p>`;
        
        // Update video source and reset/play
        videoEl.src = phrasesData[current].video;
        videoEl.load();
        resetAndPlayVideo(videoEl);
        
        // Remove old classes and add entrance animation
        leftContent.classList.remove(slideOutClass);
        rightContent.classList.remove(slideOutClass);
        leftContent.classList.add(slideInClass);
        rightContent.classList.add(slideInClass);
        
        // Update navigation button visibility
        updateNavButtons();
        
        // Update phrase-based styling
        updatePhraseStyling();
        
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

// Add phrase-based styling
function updatePhraseStyling() {
    const lessonCard = document.querySelector('.lesson-card');
    const currentPhrase = phrasesData[current].phrase.toLowerCase().replace(/\s+/g, '');
    
    // Remove existing phrase classes
    lessonCard.className = lessonCard.className.replace(/phrase-\w+/g, '');
    
    // Add current phrase class
    lessonCard.classList.add(`phrase-${currentPhrase}`);
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
        
        /* Phrase-specific color scheme */
        .phrase-akosi #letter { 
            color: #3B82F6; 
            text-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
        }
        .phrase-oo #letter { 
            color: #10B981; 
            text-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
        }
        .phrase-hindi #letter { 
            color: #EF4444; 
            text-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
        }
        .phrase-akoaymabuti #letter { 
            color: #F59E0B; 
            text-shadow: 0 2px 4px rgba(245, 158, 11, 0.3);
        }
        
        /* Subtle background gradients based on phrase */
        .phrase-akosi {
            background: linear-gradient(135deg, #fff 0%, #eff6ff 100%);
        }
        .phrase-oo {
            background: linear-gradient(135deg, #fff 0%, #ecfdf5 100%);
        }
        .phrase-hindi {
            background: linear-gradient(135deg, #fff 0%, #fef2f2 100%);
        }
        .phrase-akoaymabuti {
            background: linear-gradient(135deg, #fff 0%, #fffbeb 100%);
        }
    `;
    document.head.appendChild(style);
}

// Enhanced navigation with direction awareness
function navigatePrevious() {
    if (isAnimating) return;
    
    const newIndex = (current === 0) ? phrasesData.length - 1 : current - 1;
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
    if (current === phrasesData.length - 1) {
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
        if (current !== phrasesData.length - 1) {
            current = phrasesData.length - 1;
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

// CRITICAL: Initialize IMMEDIATELY with cached data
current = getLastPositionSync(); // Get cached position synchronously
learnedPhrases = getLearnedPhrasesSync(); // Get cached learned phrases

console.log(`⚡ Instant resume at phrase: ${phrasesData[current].phrase}`);

// Initialize the lesson
document.addEventListener('DOMContentLoaded', function() {
    addAnimationStyles();
    preloadVideos();
    
    // INSTANT display with cached position - NO LOADING DELAY
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
            // Mark current phrase as learned now that we're initialized
            markPhraseAsLearned();
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
            window.location.href = 'phrasesquiz.html';
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