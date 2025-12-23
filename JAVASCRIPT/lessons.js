import { auth, db } from './firebase.js';
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

const lessonMap = {
    alphabetCard: {
        href: 'alphabet.html',
        title: 'Continue to Alphabet Lesson?',
        msg: 'Are you sure you want to proceed to the Alphabet lesson?'
    },
    numbersCard: {
        href: 'numbers.html',
        title: 'Continue to Numbers Lesson?',
        msg: 'Are you sure you want to proceed to the Numbers lesson?'
    },
    greetingsCard: {
        href: 'greetings.html',
        title: 'Continue to Greetings & Courtesies Lesson?',
        msg: 'Are you sure you want to proceed to the Greetings & Courtesies lesson?'
    },
    whquestionsCard: {
        href: 'whquestions.html',
        title: 'Continue to WH Questions Lesson?',
        msg: 'Are you sure you want to proceed to the Basic WH Questions lesson?'
    },
    familyCard: {
        href: 'familymembers.html',
        title: 'Continue to Family Members Lesson?',
        msg: 'Are you sure you want to proceed to the Family Members lesson?'
    },
    phrasesCard: {
        href: 'phrases.html',
        title: 'Continue to Common Phrases Lesson?',
        msg: 'Are you sure you want to proceed to the Common Phrases lesson?'
    },
    emergencyCard: {
        href: 'emergency.html',
        title: 'Continue to Emergency & Basic Needs Lesson?',
        msg: 'Are you sure you want to proceed to the Emergency & Basic Needs lesson?'
    },
    educationalCard: {
        href: 'educationalcontext.html',
        title: 'Continue to School/Educational Context Lesson?',
        msg: 'Are you sure you want to proceed to the School/Educational Context lesson?'
    },
    timemarkersCard: {
        href: 'timemarkers.html',
        title: 'Continue to Time Markers Lesson?',
        msg: 'Are you sure you want to proceed to the Time Markers lesson?'
    }
};

// Default progress data structure with corrected totals
const defaultProgressData = {
    alphabetCard: { completed: 0, total: 26, percentage: 0 },
    numbersCard: { completed: 0, total: 10, percentage: 0 },
    greetingsCard: { completed: 0, total: 8, percentage: 0 },
    whquestionsCard: { completed: 0, total: 6, percentage: 0 },
    familyCard: { completed: 0, total: 4, percentage: 0 },
    phrasesCard: { completed: 0, total: 4, percentage: 0 },
    emergencyCard: { completed: 0, total: 6, percentage: 0 },
    educationalCard: { completed: 0, total: 3, percentage: 0 },
    timemarkersCard: { completed: 0, total: 3, percentage: 0 }
};

let progressData = { ...defaultProgressData };
let currentUser = null;
let domElementsCache = null;
let selectedLessonHref = '';

// OPTIMIZATION 1: Synchronous cache loading from individual lesson caches
function getCachedProgressSync() {
    try {
        // Check if we have a current user ID to validate cache
        const cachedUserId = sessionStorage.getItem('cached_user_id');
        const currentUserId = currentUser?.uid;
        
        // If user has changed, clear all caches
        if (cachedUserId && currentUserId && cachedUserId !== currentUserId) {
            console.log('🔄 User changed, clearing old cache');
            clearAllCaches();
            return null;
        }
        
        const lessonCacheKeys = {
            alphabetCard: 'alphabet_learned',
            numbersCard: 'numbers_learned',
            greetingsCard: 'greetings_learned',
            whquestionsCard: 'whquestions_learned',
            familyCard: 'family_learned',
            phrasesCard: 'phrases_learned',
            emergencyCard: 'emergency_learned',
            educationalCard: 'educational_learned',
            timemarkersCard: 'timemarkers_learned'
        };

        const syncedData = { ...defaultProgressData };
        let hasAnyCache = false;

        // Read from each lesson's individual cache
        Object.keys(lessonCacheKeys).forEach(cardId => {
            const cacheKey = lessonCacheKeys[cardId];
            const cache = sessionStorage.getItem(cacheKey);
            
            if (cache) {
                try {
                    const parsed = JSON.parse(cache);
                    // Check if cache is still valid (1 hour)
                    if (parsed.timestamp && Date.now() - parsed.timestamp < 60 * 60 * 1000) {
                        const learned = parsed.letters || parsed.numbers || parsed.items || [];
                        syncedData[cardId] = {
                            completed: learned.length,
                            total: defaultProgressData[cardId].total,
                            percentage: Math.round((learned.length / defaultProgressData[cardId].total) * 100)
                        };
                        hasAnyCache = true;
                    }
                } catch (e) {
                    console.error(`Error parsing ${cardId} cache:`, e);
                }
            }
        });

        if (hasAnyCache) {
            console.log('⚡ Loaded progress from sessionStorage cache');
            return syncedData;
        }

        // Fall back to combined cache
        const combinedCache = sessionStorage.getItem('progress_all');
        if (combinedCache) {
            const { data, timestamp } = JSON.parse(combinedCache);
            if (Date.now() - timestamp < 5 * 60 * 1000) {
                return data;
            }
        }
    } catch (error) {
        console.error('Error reading cache:', error);
    }
    return null;
}

function clearAllCaches() {
    try {
        // Clear all lesson-specific caches
        const cacheKeys = [
            'alphabet_learned',
            'numbers_learned',
            'greetings_learned',
            'whquestions_learned',
            'family_learned',
            'phrases_learned',
            'emergency_learned',
            'educational_learned',
            'timemarkers_learned',
            'progress_all',
            'cached_user_id'
        ];
        
        cacheKeys.forEach(key => {
            sessionStorage.removeItem(key);
        });
        
        console.log('🗑️ All caches cleared');
    } catch (error) {
        console.error('Error clearing caches:', error);
    }
}

function setCachedProgress(data) {
    try {
        // Store the current user ID with the cache
        if (currentUser) {
            sessionStorage.setItem('cached_user_id', currentUser.uid);
        }
        
        sessionStorage.setItem('progress_all', JSON.stringify({
            data,
            timestamp: Date.now(),
            userId: currentUser?.uid
        }));
    } catch (error) {
        console.error('Error setting cache:', error);
    }
}

// Pre-load DOM elements and prepare for instant update
function cacheDOMElements() {
    const elements = {};
    Object.keys(progressData).forEach(cardId => {
        const card = document.getElementById(cardId);
        if (card) {
            elements[cardId] = {
                card,
                progressBar: card.querySelector('.progress-fill'),
                progressText: card.querySelector('.progress-text')
            };
        }
    });
    domElementsCache = elements;
    return elements;
}

// OPTIMIZATION 2: Ultra-fast synchronous batch update - ALL PROGRESS LOADS SIMULTANEOUSLY
function updateAllProgressInstantlySync() {
    const elements = domElementsCache || cacheDOMElements();
    
    // CRITICAL FIX: Collect all data FIRST before any DOM manipulation
    // This ensures we have all progress data ready before rendering
    const updates = [];
    
    for (const cardId of Object.keys(progressData)) {
        const el = elements[cardId];
        if (el && el.progressBar && el.progressText) {
            updates.push({
                progressBar: el.progressBar,
                progressText: el.progressText,
                card: el.card,
                data: progressData[cardId]
            });
        }
    }
    
    // Only proceed if we have ALL elements ready
    if (updates.length !== Object.keys(progressData).length) {
        console.warn('Not all DOM elements ready yet');
        return;
    }
    
    // CRITICAL: Use a single synchronous operation with CSS variable trick
    // This forces the browser to render all changes in one paint cycle
    const fragment = document.createDocumentFragment();
    const tempStyle = document.createElement('style');
    tempStyle.id = 'progress-instant-load';
    tempStyle.textContent = `
        .progress-fill { 
            transition: none !important;
            will-change: width, background;
        }
        .progress-text {
            will-change: contents;
        }
    `;
    
    // Remove old style if exists
    const oldStyle = document.getElementById('progress-instant-load');
    if (oldStyle) oldStyle.remove();
    
    fragment.appendChild(tempStyle);
    document.head.appendChild(fragment);
    
    // Force a reflow to ensure style is applied
    void document.body.offsetHeight;
    
    // BATCH ALL DOM WRITES - Apply ALL updates in one synchronous loop
    for (let i = 0; i < updates.length; i++) {
        const { progressBar, progressText, data, card } = updates[i];
        
        // Set all properties at once
        progressBar.style.cssText = `width: ${data.percentage}%;`;
        progressText.textContent = `${data.completed}/${data.total} completed`;
        progressText.style.opacity = '1';
        
        // Set color based on progress
        if (data.percentage === 100) {
            progressBar.style.background = 'linear-gradient(90deg, #10b981, #059669)';
            if (!card.classList.contains('completed-lesson')) {
                card.classList.add('completed-lesson');
            }
        } else if (data.percentage >= 50) {
            progressBar.style.background = 'linear-gradient(90deg, #3b82f6, #8b5cf6)';
        } else if (data.percentage > 0) {
            progressBar.style.background = 'linear-gradient(90deg, #f59e0b, #f97316)';
        } else {
            progressBar.style.background = '#e2e8f0';
        }
    }
    
    // Force immediate paint - ALL bars render at once
    void document.body.offsetHeight;
    
    // Re-enable transitions after paint
    requestAnimationFrame(() => {
        if (tempStyle && tempStyle.parentNode) {
            tempStyle.remove();
        }
    });
}

// OPTIMIZATION 3: Batch load all progress in one Firestore query
async function loadAllProgress() {
    if (!currentUser) {
        console.warn('No user logged in');
        return;
    }

    try {
        const progressMapping = {
            alphabetCard: 'alphabet',
            numbersCard: 'numbers',
            greetingsCard: 'greetings',
            whquestionsCard: 'whquestions',
            familyCard: 'familymembers',
            phrasesCard: 'phrases',
            emergencyCard: 'emergency',
            educationalCard: 'educational',
            timemarkersCard: 'timemarkers'
        };

        // Single batch read for all progress documents
        const progressRef = collection(db, 'users', currentUser.uid, 'progress');
        const querySnapshot = await getDocs(progressRef);
        
        querySnapshot.forEach((doc) => {
            const progressId = doc.id;
            const data = doc.data();
            
            const cardId = Object.keys(progressMapping).find(
                key => progressMapping[key] === progressId
            );
            
            if (cardId) {
                progressData[cardId] = {
                    completed: data.completed || 0,
                    total: data.total || defaultProgressData[cardId].total,
                    percentage: data.percentage || 0
                };
            }
        });

        // Cache the loaded data
        setCachedProgress(progressData);
        
        // Update UI with fresh data
        updateAllProgressInstantlySync();
        console.log('✓ Progress synced from Firestore for all lessons');
    } catch (error) {
        console.error('Error loading progress:', error);
    }
}

// CRITICAL: Initialize with cached data BEFORE anything else
// DON'T load cache here - wait for auth to verify user first
let cachedProgressData = null;

// ULTRA-FAST: Execute immediately without waiting for any events
// This runs the moment the script loads
(function immediateInit() {
    const runUpdate = () => {
        if (document.body) {
            cacheDOMElements();
            // Show default progress initially (will update when auth loads)
            updateAllProgressInstantlySync();
        } else {
            // If body not ready, try again in 1ms
            setTimeout(runUpdate, 1);
        }
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runUpdate);
    } else {
        runUpdate();
    }
})();

// Auth state observer
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Check if this is a different user than cached
        const cachedUserId = sessionStorage.getItem('cached_user_id');
        if (cachedUserId && cachedUserId !== user.uid) {
            console.log('🔄 Different user detected, clearing cache and resetting');
            clearAllCaches();
            progressData = { ...defaultProgressData };
            domElementsCache = null;
        }
        
        currentUser = user;
        
        // Store current user ID
        sessionStorage.setItem('cached_user_id', user.uid);
        
        // Ensure DOM is cached
        if (!domElementsCache) cacheDOMElements();
        
        // CRITICAL FIX: Load cache and Firestore data FIRST, then update UI ONCE
        let finalProgressData = { ...defaultProgressData };
        
        // Check for valid cached data
        const validCache = getCachedProgressSync();
        if (validCache) {
            finalProgressData = validCache;
            console.log('📦 Using cached progress');
        }
        
        // Load fresh data from Firestore (this overwrites cache if different)
        try {
            const progressMapping = {
                alphabetCard: 'alphabet',
                numbersCard: 'numbers',
                greetingsCard: 'greetings',
                whquestionsCard: 'whquestions',
                familyCard: 'familymembers',
                phrasesCard: 'phrases',
                emergencyCard: 'emergency',
                educationalCard: 'educational',
                timemarkersCard: 'timemarkers'
            };

            const progressRef = collection(db, 'users', currentUser.uid, 'progress');
            const querySnapshot = await getDocs(progressRef);
            
            querySnapshot.forEach((doc) => {
                const progressId = doc.id;
                const data = doc.data();
                
                const cardId = Object.keys(progressMapping).find(
                    key => progressMapping[key] === progressId
                );
                
                if (cardId) {
                    finalProgressData[cardId] = {
                        completed: data.completed || 0,
                        total: data.total || defaultProgressData[cardId].total,
                        percentage: data.percentage || 0
                    };
                }
            });
            
            console.log('✓ Firestore data loaded');
        } catch (error) {
            console.error('Error loading from Firestore:', error);
        }
        
        // NOW update progressData and render ALL at once
        progressData = finalProgressData;
        setCachedProgress(progressData);
        updateAllProgressInstantlySync();
        
        console.log('✅ All progress updated simultaneously');
    } else {
        console.warn('No user logged in. Showing default progress.');
        clearAllCaches();
        currentUser = null;
        progressData = { ...defaultProgressData };
        updateAllProgressInstantlySync();
    }
});

// Event listeners for lesson cards
Object.keys(lessonMap).forEach(cardId => {
    const card = document.getElementById(cardId);
    if (card) {
        card.addEventListener('click', function () {
            selectedLessonHref = lessonMap[cardId].href;
            document.getElementById('modalTitle').textContent = lessonMap[cardId].title;
            document.getElementById('modalMessage').textContent = lessonMap[cardId].msg;
            document.getElementById('confirmModal').style.display = 'flex';
        });
    }
});

document.getElementById('modalContinueBtn').addEventListener('click', function () {
    window.location.href = selectedLessonHref;
});

document.getElementById('modalCancelBtn').addEventListener('click', function () {
    document.getElementById('confirmModal').style.display = 'none';
    selectedLessonHref = '';
});

document.getElementById('confirmModal').addEventListener('click', function (e) {
    if (e.target === this) {
        this.style.display = 'none';
        selectedLessonHref = '';
    }
});