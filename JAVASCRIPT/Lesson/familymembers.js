// Import Firebase modules
import { auth, db } from '../firebase.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// Filipino Sign Language Family Members Data
const familyMembersData = [
    { 
        member: 'TATAY', 
        desc: `<strong>Father - The male parent of a child.</strong><br>English: "Father" or "Dad"<br>Filipino: "Tatay" or "Ama"`, 
        video: '/PICTURES/fsl_family_members/TATAY.mp4' 
    },
    { 
        member: 'NANAY', 
        desc: `<strong>Mother - The female parent of a child.</strong><br>English: "Mother" or "Mom"<br>Filipino: "Nanay" or "Ina"`, 
        video: '/PICTURES/fsl_family_members/NANAY.mp4' 
    },
    { 
        member: 'KUYA', 
        desc: `<strong>Older Brother - An older male sibling.</strong><br>English: "Big Brother"<br>Filipino: "Kuya"`, 
        video: '/PICTURES/fsl_family_members/KUYA.mp4' 
    },
    { 
        member: 'ATE', 
        desc: `<strong>Older Sister - An older female sibling.</strong><br>English: "Big Sister"<br>Filipino: "Ate"`, 
        video: '/PICTURES/fsl_family_members/ATE.mp4' 
    }
];

let current = 0;
let isAnimating = false;
let currentUser = null;
let learnedMembers = new Set();
let isInitialized = false;

// OPTIMIZATION 1: Get last position from sessionStorage IMMEDIATELY (synchronous)
function getLastPositionSync() {
    try {
        const cached = sessionStorage.getItem('familymembers_position');
        if (cached) {
            const { member, timestamp } = JSON.parse(cached);
            // Cache valid for 24 hours
            if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
                const index = familyMembersData.findIndex(item => item.member === member);
                if (index !== -1) {
                    return index;
                }
            }
        }
    } catch (error) {
        console.error('Error reading position cache:', error);
    }
    return 0; // Default to 'TATAY'
}

// OPTIMIZATION 2: Save position to sessionStorage immediately (synchronous)
function savePositionSync(member) {
    try {
        sessionStorage.setItem('familymembers_position', JSON.stringify({
            member,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.error('Error saving position cache:', error);
    }
}

// OPTIMIZATION 3: Get learned members from sessionStorage
function getLearnedMembersSync() {
    try {
        const cached = sessionStorage.getItem('familymembers_learned');
        if (cached) {
            const { members, timestamp } = JSON.parse(cached);
            // Cache valid for 1 hour
            if (Date.now() - timestamp < 60 * 60 * 1000) {
                return new Set(members);
            }
        }
    } catch (error) {
        console.error('Error reading learned cache:', error);
    }
    return new Set();
}

// OPTIMIZATION 4: Save learned members to sessionStorage
function saveLearnedMembersSync(members) {
    try {
        sessionStorage.setItem('familymembers_learned', JSON.stringify({
            members: Array.from(members),
            timestamp: Date.now()
        }));
    } catch (error) {
        console.error('Error saving learned cache:', error);
    }
}

// Preload videos for smoother transitions
function preloadVideos() {
    familyMembersData.forEach(item => {
        const video = document.createElement('video');
        video.preload = 'metadata'; // Load metadata only to save bandwidth
        video.src = item.video;
    });
}

// Load user progress from Firebase (background task)
async function loadUserProgress() {
    if (!currentUser) return;

    try {
        const progressRef = doc(db, 'users', currentUser.uid, 'progress', 'familymembers');
        const progressSnap = await getDoc(progressRef);

        if (progressSnap.exists()) {
            const data = progressSnap.data();
            learnedMembers = new Set(data.learnedMembers || []);
            
            // Update sessionStorage with fresh data from Firebase
            saveLearnedMembersSync(learnedMembers);
            
            // Update position if different from cached
            if (data.lastViewedMember) {
                const lastIndex = familyMembersData.findIndex(item => item.member === data.lastViewedMember);
                if (lastIndex !== -1 && lastIndex !== current) {
                    current = lastIndex;
                    savePositionSync(data.lastViewedMember);
                    updateLesson('next', true); // Update display silently
                }
            }
            
            console.log('✓ Background sync complete:', learnedMembers.size, 'family members learned');
        } else {
            // Initialize progress document if it doesn't exist
            await setDoc(progressRef, {
                learnedMembers: [],
                total: 4,
                lastViewedMember: familyMembersData[current].member,
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
        const progressRef = doc(db, 'users', currentUser.uid, 'progress', 'familymembers');
        const learnedArray = Array.from(learnedMembers);
        const currentMember = familyMembersData[current].member;
        
        // Save to sessionStorage immediately
        saveLearnedMembersSync(learnedMembers);
        savePositionSync(currentMember);
        
        // Save to Firebase in background
        await setDoc(progressRef, {
            learnedMembers: learnedArray,
            completed: learnedArray.length,
            total: 4,
            percentage: Math.round((learnedArray.length / 4) * 100),
            lastViewedMember: currentMember,
            lastUpdated: new Date()
        }, { merge: true });

        console.log('✓ Progress saved:', learnedArray.length, '/', 4, '- At:', currentMember);
    } catch (error) {
        console.error('Error saving progress:', error);
    }
}

// Mark current family member as learned
function markMemberAsLearned() {
    const currentMember = familyMembersData[current].member;
    
    if (!learnedMembers.has(currentMember)) {
        learnedMembers.add(currentMember);
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
    
    const memberEl = document.getElementById('letter');
    const descEl = document.getElementById('desc');
    const videoEl = document.getElementById('signVideo');
    const leftContent = document.querySelector('.lesson-left');
    const rightContent = document.querySelector('.lesson-right');
    
    if (skipAnimation) {
        // Immediate update without animation
        memberEl.textContent = familyMembersData[current].member;
        descEl.innerHTML = `<p>${familyMembersData[current].desc}</p>`;
        
        // Update video source and play
        videoEl.src = familyMembersData[current].video;
        videoEl.load(); // Load the new video
        playVideo(videoEl); // Auto-play
        
        updateNavButtons();
        updateMemberStyling();
        
        // Mark as learned after initial display
        if (isInitialized) {
            markMemberAsLearned();
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
        // Mark current family member as learned before moving
        markMemberAsLearned();
        
        // Update the content
        memberEl.textContent = familyMembersData[current].member;
        descEl.innerHTML = `<p>${familyMembersData[current].desc}</p>`;
        
        // Update video source and reset/play
        videoEl.src = familyMembersData[current].video;
        videoEl.load();
        resetAndPlayVideo(videoEl);
        
        // Remove old classes and add entrance animation
        leftContent.classList.remove(slideOutClass);
        rightContent.classList.remove(slideOutClass);
        leftContent.classList.add(slideInClass);
        rightContent.classList.add(slideInClass);
        
        // Update navigation button visibility
        updateNavButtons();
        
        // Update member-based styling
        updateMemberStyling();
        
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

// Add family member-based styling
function updateMemberStyling() {
    const lessonCard = document.querySelector('.lesson-card');
    const currentMember = familyMembersData[current].member.toLowerCase();
    
    // Remove existing member classes
    lessonCard.className = lessonCard.className.replace(/member-\w+/g, '');
    
    // Add current member class
    lessonCard.classList.add(`member-${currentMember}`);
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
        
        /* Family member-specific color scheme */
        .member-tatay #letter { 
            color: #2563EB; 
            text-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);
        }
        .member-nanay #letter { 
            color: #EC4899; 
            text-shadow: 0 2px 4px rgba(236, 72, 153, 0.3);
        }
        .member-kuya #letter { 
            color: #10B981; 
            text-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
        }
        .member-ate #letter { 
            color: #F59E0B; 
            text-shadow: 0 2px 4px rgba(245, 158, 11, 0.3);
        }
        
        /* Subtle background gradients based on family member */
        .member-tatay {
            background: linear-gradient(135deg, #fff 0%, #eff6ff 100%);
        }
        .member-nanay {
            background: linear-gradient(135deg, #fff 0%, #fdf2f8 100%);
        }
        .member-kuya {
            background: linear-gradient(135deg, #fff 0%, #ecfdf5 100%);
        }
        .member-ate {
            background: linear-gradient(135deg, #fff 0%, #fffbeb 100%);
        }
    `;
    document.head.appendChild(style);
}

// Enhanced navigation with direction awareness
function navigatePrevious() {
    if (isAnimating) return;
    
    const newIndex = (current === 0) ? familyMembersData.length - 1 : current - 1;
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
    if (current === familyMembersData.length - 1) {
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
        if (current !== familyMembersData.length - 1) {
            current = familyMembersData.length - 1;
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
learnedMembers = getLearnedMembersSync(); // Get cached learned family members

console.log(`⚡ Instant resume at family member: ${familyMembersData[current].member}`);

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
            // Mark current family member as learned now that we're initialized
            markMemberAsLearned();
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
            window.location.href = '/HTML/Quiz/familymembersquiz.html';
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