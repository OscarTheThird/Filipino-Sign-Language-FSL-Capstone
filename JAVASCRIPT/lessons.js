import { auth, db } from './firebase.js';
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

const lessonMap = {
    alphabetCard: {
        href: 'Lesson/alphabet.html',
        title: 'Continue to Alphabet Lesson?',
        msg: 'Are you sure you want to proceed to the Alphabet lesson?'
    },
    numbersCard: {
        href: 'Lesson/numbers.html',
        title: 'Continue to Numbers Lesson?',
        msg: 'Are you sure you want to proceed to the Numbers lesson?'
    },
    greetingsCard: {
        href: 'Lesson/greetings.html',
        title: 'Continue to Greetings & Courtesies Lesson?',
        msg: 'Are you sure you want to proceed to the Greetings & Courtesies lesson?'
    },
    whquestionsCard: {
        href: 'Lesson/whquestions.html',
        title: 'Continue to WH Questions Lesson?',
        msg: 'Are you sure you want to proceed to the Basic WH Questions lesson?'
    },
    familyCard: {
        href: 'Lesson/familymembers.html',
        title: 'Continue to Family Members Lesson?',
        msg: 'Are you sure you want to proceed to the Family Members lesson?'
    },
    phrasesCard: {
        href: 'Lesson/phrases.html',
        title: 'Continue to Common Phrases Lesson?',
        msg: 'Are you sure you want to proceed to the Common Phrases lesson?'
    },
    emergencyCard: {
        href: 'Lesson/emergency.html',
        title: 'Continue to Emergency & Basic Needs Lesson?',
        msg: 'Are you sure you want to proceed to the Emergency & Basic Needs lesson?'
    },
    educationalCard: {
        href: 'Lesson/educationalcontext.html',
        title: 'Continue to School/Educational Context Lesson?',
        msg: 'Are you sure you want to proceed to the School/Educational Context lesson?'
    },
    timemarkersCard: {
        href: 'Lesson/timemarkers.html',
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

// 🚀 NEW: Get preloaded progress data (from home.js or interpreter.js)
function getPreloadedProgress() {
    try {
        const preloaded = sessionStorage.getItem('progress_preloaded');
        if (preloaded) {
            const { data, timestamp, userId } = JSON.parse(preloaded);
            
            // Check if preload is recent (within 5 minutes) and for same user
            if (Date.now() - timestamp < 5 * 60 * 1000 && userId === currentUser?.uid) {
                console.log('⚡ [LESSON] Using preloaded progress from home/interpreter page!');
                
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
                
                const syncedData = { ...defaultProgressData };
                Object.keys(progressMapping).forEach(cardId => {
                    const progressId = progressMapping[cardId];
                    if (data[progressId]) {
                        syncedData[cardId] = {
                            completed: data[progressId].completed || 0,
                            total: data[progressId].total || defaultProgressData[cardId].total,
                            percentage: data[progressId].percentage || 0
                        };
                    }
                });
                
                return syncedData;
            }
        }
    } catch (error) {
        console.error('Error reading preload:', error);
    }
    return null;
}

// OPTIMIZATION 1: Synchronous cache loading from individual lesson caches - PARALLEL PROCESSING
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

        // 🚀 CRITICAL FIX: Pre-allocate final data object to avoid sequential updates
        const syncedData = { ...defaultProgressData };
        let hasAnyCache = false;
        const currentTime = Date.now();

        // 🚀 Read ALL caches in a single synchronous pass - NO delays between lessons
        for (const cardId in lessonCacheKeys) {
            const cacheKey = lessonCacheKeys[cardId];
            
            try {
                const cache = sessionStorage.getItem(cacheKey);
                
                if (cache) {
                    const parsed = JSON.parse(cache);
                    
                    // Check if cache is still valid (1 hour)
                    if (parsed.timestamp && currentTime - parsed.timestamp < 60 * 60 * 1000) {
                        const learned = parsed.letters || parsed.numbers || parsed.items || [];
                        const completed = learned.length;
                        const total = defaultProgressData[cardId].total;
                        
                        syncedData[cardId] = {
                            completed: completed,
                            total: total,
                            percentage: Math.round((completed / total) * 100)
                        };
                        hasAnyCache = true;
                    }
                }
            } catch (e) {
                console.error(`Error parsing ${cardId} cache:`, e);
            }
        }

        if (hasAnyCache) {
            console.log('⚡ Loaded progress from sessionStorage cache for ALL lessons simultaneously');
            return syncedData;
        }

        // Fall back to combined cache
        const combinedCache = sessionStorage.getItem('progress_all');
        if (combinedCache) {
            const { data, timestamp } = JSON.parse(combinedCache);
            if (currentTime - timestamp < 5 * 60 * 1000) {
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
            'progress_preloaded',
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

// 🔥 NEW: Update preloaded cache when individual lesson cache changes
function updatePreloadedCache() {
    try {
        if (!currentUser) return;
        
        // Read current preloaded cache
        const preloaded = sessionStorage.getItem('progress_preloaded');
        if (!preloaded) {
            console.log('⚠️ No preloaded cache to update');
            return;
        }
        
        const { data: preloadedData, userId } = JSON.parse(preloaded);
        
        // Only update if same user
        if (userId !== currentUser.uid) return;
        
        // Update preloaded cache with fresh lesson cache data
        const lessonCacheKeys = {
            alphabet: 'alphabet_learned',
            numbers: 'numbers_learned',
            greetings: 'greetings_learned',
            whquestions: 'whquestions_learned',
            familymembers: 'family_learned',
            phrases: 'phrases_learned',
            emergency: 'emergency_learned',
            educational: 'educational_learned',
            timemarkers: 'timemarkers_learned'
        };
        
        let wasUpdated = false;
        
        Object.keys(lessonCacheKeys).forEach(progressId => {
            const cacheKey = lessonCacheKeys[progressId];
            const cache = sessionStorage.getItem(cacheKey);
            
            if (cache) {
                try {
                    const parsed = JSON.parse(cache);
                    const learned = parsed.letters || parsed.numbers || parsed.items || [];
                    const total = defaultProgressData[Object.keys(lessonMap).find(k => 
                        lessonMap[k].href.includes(progressId.replace('familymembers', 'familymembers').replace('whquestions', 'whquestions'))
                    )]?.total || learned.length;
                    
                    const cardId = Object.keys(lessonMap).find(k => {
                        const mapping = {
                            alphabet: 'alphabetCard',
                            numbers: 'numbersCard',
                            greetings: 'greetingsCard',
                            whquestions: 'whquestionsCard',
                            familymembers: 'familyCard',
                            phrases: 'phrasesCard',
                            emergency: 'emergencyCard',
                            educational: 'educationalCard',
                            timemarkers: 'timemarkersCard'
                        };
                        return mapping[progressId] && lessonMap[mapping[progressId]];
                    });
                    
                    // Get the correct total from defaultProgressData
                    const progressMapping = {
                        alphabet: 'alphabetCard',
                        numbers: 'numbersCard',
                        greetings: 'greetingsCard',
                        whquestions: 'whquestionsCard',
                        familymembers: 'familyCard',
                        phrases: 'phrasesCard',
                        emergency: 'emergencyCard',
                        educational: 'educationalCard',
                        timemarkers: 'timemarkersCard'
                    };
                    
                    const mappedCardId = progressMapping[progressId];
                    const correctTotal = defaultProgressData[mappedCardId]?.total || total;
                    
                    // Update preloaded data
                    preloadedData[progressId] = {
                        completed: learned.length,
                        total: correctTotal,
                        percentage: Math.round((learned.length / correctTotal) * 100)
                    };
                    wasUpdated = true;
                } catch (e) {
                    console.error(`Error updating preload for ${progressId}:`, e);
                }
            }
        });
        
        if (wasUpdated) {
            // Save updated preloaded cache
            sessionStorage.setItem('progress_preloaded', JSON.stringify({
                data: preloadedData,
                timestamp: Date.now(),
                userId: currentUser.uid
            }));
            console.log('✅ Preloaded cache updated with latest progress!');
        }
    } catch (error) {
        console.error('Error updating preloaded cache:', error);
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
    
    // 🚀 CRITICAL: Prepare ALL data in memory BEFORE touching DOM
    const updates = [];
    const progressKeys = Object.keys(progressData);
    
    // Pre-calculate everything before DOM manipulation
    for (let i = 0; i < progressKeys.length; i++) {
        const cardId = progressKeys[i];
        const el = elements[cardId];
        const data = progressData[cardId];
        
        if (el && el.progressBar && el.progressText && data) {
            // Pre-calculate all values
            const percentage = data.percentage;
            const width = `${percentage}%`;
            const text = `${data.completed}/${data.total} completed`;
            
            // Pre-determine background color
            let background;
            if (percentage === 100) {
                background = 'linear-gradient(90deg, #10b981, #059669)';
            } else if (percentage >= 50) {
                background = 'linear-gradient(90deg, #3b82f6, #8b5cf6)';
            } else if (percentage > 0) {
                background = 'linear-gradient(90deg, #f59e0b, #f97316)';
            } else {
                background = '#e2e8f0';
            }
            
            updates.push({
                progressBar: el.progressBar,
                progressText: el.progressText,
                card: el.card,
                width: width,
                text: text,
                background: background,
                isCompleted: percentage === 100
            });
        }
    }
    
    // Only proceed if we have elements ready
    if (updates.length === 0) {
        console.warn('No DOM elements ready yet');
        return;
    }
    
    // 🚀 Disable transitions for instant rendering
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
    
    const oldStyle = document.getElementById('progress-instant-load');
    if (oldStyle) oldStyle.remove();
    
    document.head.appendChild(tempStyle);
    
    // Force style application
    void document.body.offsetHeight;
    
    // 🔥 APPLY ALL UPDATES IN ONE ATOMIC OPERATION - No loops, direct assignment
    // This ensures browser paints everything in a single frame
    const len = updates.length;
    for (let i = 0; i < len; i++) {
        const update = updates[i];
        
        // Batch write all properties at once
        update.progressBar.style.cssText = `width: ${update.width}; background: ${update.background};`;
        update.progressText.textContent = update.text;
        update.progressText.style.opacity = '1';
        
        if (update.isCompleted && !update.card.classList.contains('completed-lesson')) {
            update.card.classList.add('completed-lesson');
        }
    }
    
    // Force immediate paint - ALL bars appear simultaneously
    void document.body.offsetHeight;
    
    // Re-enable transitions after rendering
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
        
        // 🚀 PRIORITY LOADING ORDER:
        let finalProgressData = { ...defaultProgressData };
        let dataSource = 'default';
        
        // PRIORITY 1: Check cache from individual lessons (MOST RECENT)
        const validCache = getCachedProgressSync();
        if (validCache) {
            finalProgressData = validCache;
            dataSource = 'cache';
            progressData = finalProgressData;
            updateAllProgressInstantlySync();
            console.log('📦 [LESSON] Loaded from lesson cache (most recent)');
            
            // 🔥 Update preloaded cache with fresh lesson cache data
            updatePreloadedCache();
            
            // Don't skip Firestore - do background refresh
        } else {
            // PRIORITY 2: Check preloaded data from home/interpreter page
            const preloaded = getPreloadedProgress();
            if (preloaded) {
                finalProgressData = preloaded;
                dataSource = 'preload';
                progressData = finalProgressData;
                updateAllProgressInstantlySync();
                console.log('⚡ [LESSON] Used preloaded data from home/interpreter');
                // Continue to Firestore for fresh data
            }
        }
        
        // PRIORITY 3: Fetch from Firestore (always refresh in background)
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
            
            const firestoreData = { ...defaultProgressData };
            
            querySnapshot.forEach((doc) => {
                const progressId = doc.id;
                const data = doc.data();
                
                const cardId = Object.keys(progressMapping).find(
                    key => progressMapping[key] === progressId
                );
                
                if (cardId) {
                    firestoreData[cardId] = {
                        completed: data.completed || 0,
                        total: data.total || defaultProgressData[cardId].total,
                        percentage: data.percentage || 0
                    };
                }
            });
            
            console.log('✓ [LESSON] Firestore data loaded');
            
            // Update with Firestore data (most authoritative)
            progressData = firestoreData;
            setCachedProgress(progressData);
            updatePreloadedCache();
            updateAllProgressInstantlySync();
            
        } catch (error) {
            console.error('Error loading from Firestore:', error);
            
            // If Firestore fails but we have cache, keep using cache
            if (dataSource !== 'default') {
                console.log('⚠️ Using cached data due to Firestore error');
            }
        }
        
        console.log('✅ All progress updated');
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