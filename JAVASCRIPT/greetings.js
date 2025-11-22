// Import Firebase modules
import { auth, db } from './firebase.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// Filipino Sign Language Greetings Data
const greetingsData = [
  {
    greeting: "Good Morning",
    desc: `<strong>A warm greeting used in the morning.</strong><br>Used from early morning until around noon.<br>Filipino: "Magandang umaga"`,
    img: "/PICTURES/fsl_greetings/goodmorning.png",
  },
  {
    greeting: "Good Afternoon",
    desc: `<strong>A polite greeting used in the afternoon.</strong><br>Used from noon until early evening.<br>Filipino: "Magandang hapon"`,
    img: "/PICTURES/fsl_greetings/goodafternoon.png",
  },
  {
    greeting: "Good Evening",
    desc: `<strong>A courteous greeting used in the evening.</strong><br>Used from late afternoon until night.<br>Filipino: "Magandang gabi"`,
    img: "/PICTURES/fsl_greetings/goodeve.png",
  },
  {
    greeting: "Hello",
    desc: `<strong>A universal friendly greeting.</strong><br>Can be used at any time of the day.<br>Filipino: "Kumusta" or "Hello"`,
    img: "/PICTURES/fsl_greetings/hello.png",
  },
];

let current = 0;
let isAnimating = false;
let currentUser = null;
let learnedItems = new Set();
let isInitialized = false;

// OPTIMIZATION 1: Get last position from sessionStorage IMMEDIATELY (synchronous)
function getLastPositionSync() {
    try {
        const cached = sessionStorage.getItem('greetings_position');
        if (cached) {
            const { greeting, timestamp } = JSON.parse(cached);
            // Cache valid for 24 hours
            if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
                const index = greetingsData.findIndex(item => item.greeting === greeting);
                if (index !== -1) {
                    return index;
                }
            }
        }
    } catch (error) {
        console.error('Error reading position cache:', error);
    }
    return 0; // Default to 'Good Morning'
}

// OPTIMIZATION 2: Save position to sessionStorage immediately (synchronous)
function savePositionSync(greeting) {
    try {
        sessionStorage.setItem('greetings_position', JSON.stringify({
            greeting,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.error('Error saving position cache:', error);
    }
}

// OPTIMIZATION 3: Get learned greetings from sessionStorage
function getLearnedItemsSync() {
    try {
        const cached = sessionStorage.getItem('greetings_learned');
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

// OPTIMIZATION 4: Save learned greetings to sessionStorage
function saveLearnedItemsSync(items) {
    try {
        sessionStorage.setItem('greetings_learned', JSON.stringify({
            items: Array.from(items),
            timestamp: Date.now()
        }));
    } catch (error) {
        console.error('Error saving learned cache:', error);
    }
}

// Preload images for smoother transitions
function preloadImages() {
    greetingsData.forEach(item => {
        const img = new Image();
        img.src = item.img;
    });
}

// Load user progress from Firebase (background task)
async function loadUserProgress() {
    if (!currentUser) return;

    try {
        const progressRef = doc(db, 'users', currentUser.uid, 'progress', 'greetings');
        const progressSnap = await getDoc(progressRef);

        if (progressSnap.exists()) {
            const data = progressSnap.data();
            learnedItems = new Set(data.learnedItems || []);
            
            // Update sessionStorage with fresh data from Firebase
            saveLearnedItemsSync(learnedItems);
            
            // Update position if different from cached
            if (data.lastViewedItem) {
                const lastIndex = greetingsData.findIndex(item => item.greeting === data.lastViewedItem);
                if (lastIndex !== -1 && lastIndex !== current) {
                    current = lastIndex;
                    savePositionSync(data.lastViewedItem);
                    updateLesson('next', true); // Update display silently
                }
            }
            
            console.log('✓ Background sync complete:', learnedItems.size, 'greetings learned');
        } else {
            // Initialize progress document if it doesn't exist
            await setDoc(progressRef, {
                learnedItems: [],
                total: 4,
                lastViewedItem: greetingsData[current].greeting,
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
        const progressRef = doc(db, 'users', currentUser.uid, 'progress', 'greetings');
        const learnedArray = Array.from(learnedItems);
        const currentItem = greetingsData[current].greeting;
        
        // Save to sessionStorage immediately
        saveLearnedItemsSync(learnedItems);
        savePositionSync(currentItem);
        
        // Save to Firebase in background
        await setDoc(progressRef, {
            learnedItems: learnedArray,
            completed: learnedArray.length,
            total: 4,
            percentage: Math.round((learnedArray.length / 4) * 100),
            lastViewedItem: currentItem,
            lastUpdated: new Date()
        }, { merge: true });

        console.log('✓ Progress saved:', learnedArray.length, '/', 4, '- At:', currentItem);
    } catch (error) {
        console.error('Error saving progress:', error);
    }
}

// Mark current greeting as learned
function markItemAsLearned() {
    const currentItem = greetingsData[current].greeting;
    
    if (!learnedItems.has(currentItem)) {
        learnedItems.add(currentItem);
    }
    
    // Save progress (non-blocking)
    saveUserProgress();
}

function updateLesson(direction = 'next', skipAnimation = false) {
    if (isAnimating && !skipAnimation) return;
    
    if (!skipAnimation) {
        isAnimating = true;
    }
    
    const greetingEl = document.getElementById('greeting');
    const descEl = document.getElementById('desc');
    const imgEl = document.getElementById('signImg');
    const leftContent = document.querySelector('.lesson-left');
    const rightContent = document.querySelector('.lesson-right');
    
    if (skipAnimation) {
        // Immediate update without animation
        greetingEl.textContent = greetingsData[current].greeting;
        descEl.innerHTML = `<p>${greetingsData[current].desc}</p>`;
        imgEl.src = greetingsData[current].img;
        imgEl.alt = `Hand sign for ${greetingsData[current].greeting}`;
        updateNavButtons();
        updateTimeBasedStyling();
        
        // Mark as learned after initial display
        if (isInitialized) {
            markItemAsLearned();
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
        // Mark current greeting as learned before moving
        markItemAsLearned();
        
        // Update the content
        greetingEl.textContent = greetingsData[current].greeting;
        descEl.innerHTML = `<p>${greetingsData[current].desc}</p>`;
        imgEl.src = greetingsData[current].img;
        imgEl.alt = `Hand sign for ${greetingsData[current].greeting}`;
        
        // Remove old classes and add entrance animation
        leftContent.classList.remove(slideOutClass);
        rightContent.classList.remove(slideOutClass);
        leftContent.classList.add(slideInClass);
        rightContent.classList.add(slideInClass);
        
        // Update navigation button visibility
        updateNavButtons();
        
        // Update time-based styling
        updateTimeBasedStyling();
        
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

// Add time-based styling based on greeting type
function updateTimeBasedStyling() {
    const lessonCard = document.querySelector('.lesson-card');
    const currentGreeting = greetingsData[current].greeting.toLowerCase().replace(/\s+/g, '');
    
    // Remove existing time-based classes
    lessonCard.className = lessonCard.className.replace(/time-\w+/g, '');
    
    // Add current time-based class
    lessonCard.classList.add(`time-${currentGreeting}`);
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
        
        .lesson-image {
            transition: all 0.3s ease;
        }
        
        .lesson-image:hover {
            transform: scale(1.02);
        }
        
        #greeting {
            transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .lesson-card:not(.animating) #greeting:hover {
            transform: scale(1.05);
        }
        
        /* Time-based greeting colors */
        .time-goodmorning #greeting { 
            color: #FF6B35; 
            text-shadow: 0 2px 4px rgba(255, 107, 53, 0.3);
        }
        .time-goodafternoon #greeting { 
            color: #4ECDC4; 
            text-shadow: 0 2px 4px rgba(78, 205, 196, 0.3);
        }
        .time-goodevening #greeting { 
            color: #45B7D1; 
            text-shadow: 0 2px 4px rgba(69, 183, 209, 0.3);
        }
        .time-hello #greeting { 
            color: #96CEB4; 
            text-shadow: 0 2px 4px rgba(150, 206, 180, 0.3);
        }
        
        /* Add subtle background gradients based on time */
        .time-goodmorning {
            background: linear-gradient(135deg, #fff 0%, #fff8f4 100%);
        }
        .time-goodafternoon {
            background: linear-gradient(135deg, #fff 0%, #f4fffe 100%);
        }
        .time-goodevening {
            background: linear-gradient(135deg, #fff 0%, #f4f9ff 100%);
        }
        .time-hello {
            background: linear-gradient(135deg, #fff 0%, #f8fff9 100%);
        }
    `;
    document.head.appendChild(style);
}

// Enhanced navigation with direction awareness
function navigatePrevious() {
    if (isAnimating) return;
    
    const newIndex = (current === 0) ? greetingsData.length - 1 : current - 1;
    current = newIndex;
    updateLesson('prev');
}

function navigateNext() {
    if (isAnimating) return;
    
    const newIndex = (current === greetingsData.length - 1) ? 0 : current + 1;
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
        if (current !== greetingsData.length - 1) {
            current = greetingsData.length - 1;
            updateLesson('next');
        }
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
learnedItems = getLearnedItemsSync(); // Get cached learned greetings

console.log(`⚡ Instant resume at greeting: ${greetingsData[current].greeting}`);

// Initialize the lesson
document.addEventListener('DOMContentLoaded', function() {
    addAnimationStyles();
    preloadImages();
    
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
            // Mark current greeting as learned now that we're initialized
            markItemAsLearned();
        }, 600);
    }, 100);
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