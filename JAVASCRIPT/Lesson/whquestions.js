// Import Firebase modules
import { auth, db } from '../firebase.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// Filipino Sign Language Basic WH Questions Data
const whQuestionsData = [
    { 
        question: 'ANO', 
        desc: `<strong>What - Used to ask about things or information.</strong><br>Example: "Ano ang pangalan mo?" (What is your name?)<br>Filipino: "Ano"`, 
        video: '/PICTURES/fsl_basic_wh_questions/ANO.mp4' 
    },
    { 
        question: 'SINO', 
        desc: `<strong>Who - Used to ask about people or identity.</strong><br>Example: "Sino ang guro mo?" (Who is your teacher?)<br>Filipino: "Sino"`, 
        video: '/PICTURES/fsl_basic_wh_questions/SINO.mp4' 
    },
    { 
        question: 'SAAN', 
        desc: `<strong>Where - Used to ask about places or locations.</strong><br>Example: "Saan ka nakatira?" (Where do you live?)<br>Filipino: "Saan"`, 
        video: '/PICTURES/fsl_basic_wh_questions/SAAN.mp4' 
    },
    { 
        question: 'KAILAN', 
        desc: `<strong>When - Used to ask about time or date.</strong><br>Example: "Kailan ang birthday mo?" (When is your birthday?)<br>Filipino: "Kailan"`, 
        video: '/PICTURES/fsl_basic_wh_questions/KAILAN.mp4' 
    },
    { 
        question: 'BAKIT', 
        desc: `<strong>Why - Used to ask about reasons or causes.</strong><br>Example: "Bakit ka malungkot?" (Why are you sad?)<br>Filipino: "Bakit"`, 
        video: '/PICTURES/fsl_basic_wh_questions/BAKIT.mp4' 
    },
    { 
        question: 'PAANO', 
        desc: `<strong>How - Used to ask about methods or ways.</strong><br>Example: "Paano pumunta sa mall?" (How to go to the mall?)<br>Filipino: "Paano"`, 
        video: '/PICTURES/fsl_basic_wh_questions/PAANO.mp4' 
    }
];

let current = 0;
let isAnimating = false;
let currentUser = null;
let learnedQuestions = new Set();
let isInitialized = false;

// OPTIMIZATION 1: Get last position from sessionStorage IMMEDIATELY (synchronous)
function getLastPositionSync() {
    try {
        const cached = sessionStorage.getItem('whquestions_position');
        if (cached) {
            const { question, timestamp } = JSON.parse(cached);
            // Cache valid for 24 hours
            if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
                const index = whQuestionsData.findIndex(item => item.question === question);
                if (index !== -1) {
                    console.log(`⚡ Restored position from cache: ${question} (index ${index})`);
                    return index;
                }
            }
        }
    } catch (error) {
        console.error('Error reading position cache:', error);
    }
    console.log('⚡ No valid cache, starting at ANO (index 0)');
    return 0; // Default to 'ANO'
}

// OPTIMIZATION 2: Save position to sessionStorage immediately (synchronous)
function savePositionSync(question) {
    try {
        sessionStorage.setItem('whquestions_position', JSON.stringify({
            question,
            timestamp: Date.now()
        }));
        console.log(`💾 Saved position: ${question}`);
    } catch (error) {
        console.error('Error saving position cache:', error);
    }
}

// OPTIMIZATION 3: Get learned questions from sessionStorage
function getLearnedQuestionsSync() {
    try {
        const cached = sessionStorage.getItem('whquestions_learned');
        if (cached) {
            const { questions, timestamp } = JSON.parse(cached);
            // Cache valid for 1 hour
            if (Date.now() - timestamp < 60 * 60 * 1000) {
                console.log(`📚 Restored ${questions.length} learned questions from cache`);
                return new Set(questions);
            }
        }
    } catch (error) {
        console.error('Error reading learned cache:', error);
    }
    return new Set();
}

// OPTIMIZATION 4: Save learned questions to sessionStorage
function saveLearnedQuestionsSync(questions) {
    try {
        sessionStorage.setItem('whquestions_learned', JSON.stringify({
            questions: Array.from(questions),
            timestamp: Date.now()
        }));
    } catch (error) {
        console.error('Error saving learned cache:', error);
    }
}

// Preload videos for smoother transitions
function preloadVideos() {
    whQuestionsData.forEach(item => {
        const video = document.createElement('video');
        video.preload = 'metadata'; // Load metadata only to save bandwidth
        video.src = item.video;
    });
}

// Load user progress from Firebase (background task)
async function loadUserProgress() {
    if (!currentUser) return;

    try {
        const progressRef = doc(db, 'users', currentUser.uid, 'progress', 'whquestions');
        const progressSnap = await getDoc(progressRef);

        if (progressSnap.exists()) {
            const data = progressSnap.data();
            learnedQuestions = new Set(data.learnedQuestions || []);
            
            // Update sessionStorage with fresh data from Firebase
            saveLearnedQuestionsSync(learnedQuestions);
            
            // 🔥 FIX: Update position if different from cached AND update display
            if (data.lastViewedQuestion) {
                const lastIndex = whQuestionsData.findIndex(item => item.question === data.lastViewedQuestion);
                if (lastIndex !== -1 && lastIndex !== current) {
                    console.log(`🔄 Firebase has different position: ${data.lastViewedQuestion} (index ${lastIndex})`);
                    current = lastIndex;
                    savePositionSync(data.lastViewedQuestion);
                    // Update the display to show the correct question
                    updateLesson('next', true);
                }
            }
            
            console.log('✓ Background sync complete:', learnedQuestions.size, 'questions learned');
        } else {
            // Initialize progress document if it doesn't exist
            await setDoc(progressRef, {
                learnedQuestions: [],
                total: 6,
                lastViewedQuestion: whQuestionsData[current].question,
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
        const progressRef = doc(db, 'users', currentUser.uid, 'progress', 'whquestions');
        const learnedArray = Array.from(learnedQuestions);
        const currentQuestion = whQuestionsData[current].question;
        
        // Save to sessionStorage immediately
        saveLearnedQuestionsSync(learnedQuestions);
        savePositionSync(currentQuestion);
        
        // Save to Firebase in background
        await setDoc(progressRef, {
            learnedQuestions: learnedArray,
            completed: learnedArray.length,
            total: 6,
            percentage: Math.round((learnedArray.length / 6) * 100),
            lastViewedQuestion: currentQuestion,
            lastUpdated: new Date()
        }, { merge: true });

        console.log('✓ Progress saved:', learnedArray.length, '/', 6, '- At:', currentQuestion);
    } catch (error) {
        console.error('Error saving progress:', error);
    }
}

// Mark current question as learned
function markQuestionAsLearned() {
    const currentQuestion = whQuestionsData[current].question;
    
    if (!learnedQuestions.has(currentQuestion)) {
        learnedQuestions.add(currentQuestion);
        console.log(`✓ Marked ${currentQuestion} as learned`);
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
    
    const questionEl = document.getElementById('letter');
    const descEl = document.getElementById('desc');
    const videoEl = document.getElementById('signVideo');
    const leftContent = document.querySelector('.lesson-left');
    const rightContent = document.querySelector('.lesson-right');
    
    if (skipAnimation) {
        // Immediate update without animation
        questionEl.textContent = whQuestionsData[current].question;
        descEl.innerHTML = `<p>${whQuestionsData[current].desc}</p>`;
        
        // Update video source and play
        videoEl.src = whQuestionsData[current].video;
        videoEl.load(); // Load the new video
        playVideo(videoEl); // Auto-play
        
        updateNavButtons();
        updateQuestionStyling();
        
        // 🔥 FIX: Don't mark as learned on initial display - wait for user interaction
        // The question is already learned if it's in the cache
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
        // Mark current question as learned before moving
        markQuestionAsLearned();
        
        // Update the content
        questionEl.textContent = whQuestionsData[current].question;
        descEl.innerHTML = `<p>${whQuestionsData[current].desc}</p>`;
        
        // Update video source and reset/play
        videoEl.src = whQuestionsData[current].video;
        videoEl.load();
        resetAndPlayVideo(videoEl);
        
        // Remove old classes and add entrance animation
        leftContent.classList.remove(slideOutClass);
        rightContent.classList.remove(slideOutClass);
        leftContent.classList.add(slideInClass);
        rightContent.classList.add(slideInClass);
        
        // Update navigation button visibility
        updateNavButtons();
        
        // Update question-based styling
        updateQuestionStyling();
        
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

// Add question-based styling
function updateQuestionStyling() {
    const lessonCard = document.querySelector('.lesson-card');
    const currentQuestion = whQuestionsData[current].question.toLowerCase();
    
    // Remove existing question classes
    lessonCard.className = lessonCard.className.replace(/question-\w+/g, '');
    
    // Add current question class
    lessonCard.classList.add(`question-${currentQuestion}`);
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
        
        /* Question-specific color scheme */
        .question-ano #letter { 
            color: #3B82F6; 
            text-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
        }
        .question-sino #letter { 
            color: #8B5CF6; 
            text-shadow: 0 2px 4px rgba(139, 92, 246, 0.3);
        }
        .question-saan #letter { 
            color: #10B981; 
            text-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
        }
        .question-kailan #letter { 
            color: #F59E0B; 
            text-shadow: 0 2px 4px rgba(245, 158, 11, 0.3);
        }
        .question-bakit #letter { 
            color: #EF4444; 
            text-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
        }
        .question-paano #letter { 
            color: #06B6D4; 
            text-shadow: 0 2px 4px rgba(6, 182, 212, 0.3);
        }
        
        /* Subtle background gradients based on question */
        .question-ano {
            background: linear-gradient(135deg, #fff 0%, #eff6ff 100%);
        }
        .question-sino {
            background: linear-gradient(135deg, #fff 0%, #f5f3ff 100%);
        }
        .question-saan {
            background: linear-gradient(135deg, #fff 0%, #ecfdf5 100%);
        }
        .question-kailan {
            background: linear-gradient(135deg, #fff 0%, #fffbeb 100%);
        }
        .question-bakit {
            background: linear-gradient(135deg, #fff 0%, #fef2f2 100%);
        }
        .question-paano {
            background: linear-gradient(135deg, #fff 0%, #ecfeff 100%);
        }
    `;
    document.head.appendChild(style);
}

// Enhanced navigation with direction awareness
function navigatePrevious() {
    if (isAnimating) return;
    
    const newIndex = (current === 0) ? whQuestionsData.length - 1 : current - 1;
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
    if (current === whQuestionsData.length - 1) {
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
        if (current !== whQuestionsData.length - 1) {
            current = whQuestionsData.length - 1;
            updateLesson('next');
        }
    } else if (e.key === "Enter" && current === whQuestionsData.length - 1) {
        // Allow Enter key to trigger quiz prompt when on last question
        e.preventDefault();
        navigateNext();
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
learnedQuestions = getLearnedQuestionsSync(); // Get cached learned questions

console.log(`⚡ Instant resume at question: ${whQuestionsData[current].question} (index ${current})`);

// Initialize the lesson
document.addEventListener('DOMContentLoaded', function() {
    addAnimationStyles();
    preloadVideos();
    
    // 🔥 CRITICAL FIX: Display at the CORRECT cached position immediately
    // The 'current' variable is already set from cache before this runs
    console.log(`🎯 Displaying question at index ${current}: ${whQuestionsData[current].question}`);
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
            window.location.href = '/HTML/Quiz/whquestionsquiz.html';
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