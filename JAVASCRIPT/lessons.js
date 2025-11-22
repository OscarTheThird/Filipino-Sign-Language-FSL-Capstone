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
        title: 'Continue to Greetings Lesson?',
        msg: 'Are you sure you want to proceed to the Greetings lesson?'
    },
    whquestionsCard: {
        href: 'whquestions.html',
        title: 'Continue to WH Questions Lesson?',
        msg: 'Are you sure you want to proceed to the Basic WH Questions lesson?'
    },
    familyCard: {
        href: 'family.html',
        title: 'Continue to Family Members Lesson?',
        msg: 'Are you sure you want to proceed to the Family Members lesson?'
    },
    phrasesCard: {
        href: 'phrases.html',
        title: 'Continue to Common Phrases Lesson?',
        msg: 'Are you sure you want to proceed to the Common Phrases lesson?'
    },
    daysCard: {
        href: 'days.html',
        title: 'Continue to Days of the Week Lesson?',
        msg: 'Are you sure you want to proceed to the Days of the Week lesson?'
    }
};

// Default progress data structure
const defaultProgressData = {
    alphabetCard: { completed: 0, total: 26, percentage: 0 },
    numbersCard: { completed: 0, total: 10, percentage: 0 },
    greetingsCard: { completed: 0, total: 15, percentage: 0 },
    whquestionsCard: { completed: 0, total: 8, percentage: 0 },
    familyCard: { completed: 0, total: 12, percentage: 0 },
    phrasesCard: { completed: 0, total: 20, percentage: 0 },
    daysCard: { completed: 0, total: 7, percentage: 0 }
};

let progressData = { ...defaultProgressData };
let currentUser = null;

// OPTIMIZATION 1: Get progress from sessionStorage IMMEDIATELY (synchronous)
// This reads from the individual lesson caches that each lesson page creates
function getCachedProgressSync() {
    try {
        // Map of card IDs to their sessionStorage keys
        const lessonCacheKeys = {
            alphabetCard: 'alphabet_learned',
            numbersCard: 'numbers_learned',
            greetingsCard: 'greetings_learned',
            whquestionsCard: 'whquestions_learned',
            familyCard: 'family_learned',
            phrasesCard: 'phrases_learned',
            daysCard: 'days_learned'
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
                        // Get the learned items array (could be letters, numbers, items, etc.)
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

        // Fall back to combined cache if individual caches not found
        const combinedCache = sessionStorage.getItem('progress_all');
        if (combinedCache) {
            const { data, timestamp } = JSON.parse(combinedCache);
            // Cache valid for 5 minutes
            if (Date.now() - timestamp < 5 * 60 * 1000) {
                return data;
            }
        }
    } catch (error) {
        console.error('Error reading cache:', error);
    }
    return null;
}

function setCachedProgress(data) {
    try {
        sessionStorage.setItem('progress_all', JSON.stringify({
            data,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.error('Error setting cache:', error);
    }
}

// OPTIMIZATION 2: Load all progress in a single batch read using getDocs
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
            familyCard: 'family',
            phrasesCard: 'phrases',
            daysCard: 'days'
        };

        // BATCH READ: Get all progress documents at once
        const progressRef = collection(db, 'users', currentUser.uid, 'progress');
        const querySnapshot = await getDocs(progressRef);
        
        querySnapshot.forEach((doc) => {
            const progressId = doc.id;
            const data = doc.data();
            
            // Find the corresponding card ID
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
        
        updateAllProgress();
        console.log('✓ Progress synced from Firestore for all lessons');
    } catch (error) {
        console.error('Error loading progress:', error);
    }
}

// OPTIMIZATION 3: Use requestAnimationFrame for smooth UI updates
function updateAllProgress() {
    requestAnimationFrame(() => {
        Object.keys(progressData).forEach(cardId => {
            const card = document.getElementById(cardId);
            if (card) {
                const progressBar = card.querySelector('.progress-fill');
                const progressText = card.querySelector('.progress-text');
                const data = progressData[cardId];
                
                if (progressBar && progressText) {
                    // Update progress bar width
                    progressBar.style.width = `${data.percentage}%`;
                    
                    // Update progress text
                    progressText.textContent = `${data.completed}/${data.total} completed`;
                    
                    // Add visual feedback based on progress
                    if (data.percentage === 100) {
                        progressBar.style.background = 'linear-gradient(90deg, #10b981, #059669)';
                        card.classList.add('completed-lesson');
                    } else if (data.percentage >= 50) {
                        progressBar.style.background = 'linear-gradient(90deg, #3b82f6, #8b5cf6)';
                    } else if (data.percentage > 0) {
                        progressBar.style.background = 'linear-gradient(90deg, #f59e0b, #f97316)';
                    } else {
                        progressBar.style.background = '#e2e8f0';
                    }
                }
            }
        });
    });
}

let selectedLessonHref = '';

// OPTIMIZATION 4: Show loading state
function showLoadingState() {
    Object.keys(progressData).forEach(cardId => {
        const card = document.getElementById(cardId);
        if (card) {
            const progressText = card.querySelector('.progress-text');
            if (progressText) {
                progressText.textContent = 'Loading...';
                progressText.style.opacity = '0.6';
            }
        }
    });
}

function hideLoadingState() {
    Object.keys(progressData).forEach(cardId => {
        const card = document.getElementById(cardId);
        if (card) {
            const progressText = card.querySelector('.progress-text');
            if (progressText) {
                progressText.style.opacity = '1';
            }
        }
    });
}

// CRITICAL: Load cached progress IMMEDIATELY (before auth)
const cachedProgressData = getCachedProgressSync();
if (cachedProgressData) {
    progressData = cachedProgressData;
    console.log('⚡ Instant progress display from cache');
}

// Auth state observer
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        
        // Show cached data immediately if available
        if (cachedProgressData) {
            updateAllProgress();
        } else {
            showLoadingState();
        }
        
        // Load fresh data from Firestore in background
        await loadAllProgress();
        hideLoadingState();
    } else {
        console.warn('No user logged in. Showing default progress.');
        currentUser = null;
        progressData = { ...defaultProgressData };
        updateAllProgress();
    }
});

// Initialize progress when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Show cached progress immediately
    updateAllProgress();
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