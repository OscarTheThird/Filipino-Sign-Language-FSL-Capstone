// Import Firebase modules from your existing firebase.js
import { auth, db } from '../firebase.js';
import { doc, getDoc, setDoc, deleteDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// Filipino Sign Language Data
const timemarkersData = [
    { marker: "Now", video: '/PICTURES/fsl_time_markers/NGAYON.mp4' },
    { marker: "Tomorrow", video: '/PICTURES/fsl_time_markers/BUKAS.mp4' },
    { marker: "Later", video: '/PICTURES/fsl_time_markers/MAMAYA.mp4' }
];

let currentQuestion = 0;
let score = 0;
let questions = [];
let currentUser = null;
let selectedAnswer = null;
let isAnswered = false;
let quizStartTime = null;
let attemptNumber = 1;
let quizActive = false;
let tabSwitchCount = 0;
let isOnline = navigator.onLine;
let pendingSaves = [];
const MAX_TAB_SWITCHES = 3; // Maximum allowed tab switches before quiz reset

// ============================================================================
// HEARTBEAT SYSTEM - Indicates quiz page is open
// ============================================================================

let heartbeatInterval = null;
let heartbeatMonitorInterval = null; // 🔥 NEW: Monitor for other tabs' heartbeats
const QUIZ_ID = 'time-markers-quiz';
const HEARTBEAT_SEND_INTERVAL = 10000; // Send heartbeat every 10 seconds (reduced from 15)
const HEARTBEAT_CHECK_INTERVAL = 5000; // Check for stale heartbeat every 5 seconds
const HEARTBEAT_TIMEOUT = 25000; // Consider heartbeat stale after 25 seconds (reduced from 30)

// 🔥 NEW: Store this tab's unique ID in Firestore
const TAB_ID = `quiz-tab-${Date.now()}-${Math.random()}`;

// Start sending heartbeats to indicate quiz page is open
function startHeartbeat(userId) {
    // Clear any existing interval
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
    }
    
    // Send heartbeat every 10 seconds
    heartbeatInterval = setInterval(async () => {
        if (!navigator.onLine) {
            console.log('Offline - skipping heartbeat');
            return;
        }
        
        try {
            const activeQuizRef = doc(db, 'users', userId, 'activeQuiz', QUIZ_ID);
            await updateDoc(activeQuizRef, {
                lastHeartbeat: serverTimestamp(),
                tabId: TAB_ID, // 🔥 NEW: Store which tab is sending heartbeat
                lastActive: Date.now()
            });
            console.log('💓 Heartbeat sent');
        } catch (error) {
            console.error('Error sending heartbeat:', error);
        }
    }, HEARTBEAT_SEND_INTERVAL);
    
    console.log('✓ Heartbeat system started');
    
    // 🔥 NEW: Start monitoring for heartbeat changes (detect if quiz abandoned in another tab)
    startHeartbeatMonitor(userId);
}

// 🔥 NEW: Monitor Firestore for heartbeat changes from other tabs
function startHeartbeatMonitor(userId) {
    if (heartbeatMonitorInterval) {
        clearInterval(heartbeatMonitorInterval);
    }
    
    heartbeatMonitorInterval = setInterval(async () => {
        if (!navigator.onLine || !quizActive) {
            return;
        }
        
        try {
            const activeQuizRef = doc(db, 'users', userId, 'activeQuiz', QUIZ_ID);
            const sessionSnap = await getDoc(activeQuizRef);
            
            if (!sessionSnap.exists()) {
                // Quiz session was deleted in another tab
                console.log('🚨 Quiz session deleted in another tab!');
                handleQuizAbandonedInOtherTab();
                return;
            }
            
            const sessionData = sessionSnap.data();
            
            // Check if heartbeat is from a different tab
            if (sessionData.tabId && sessionData.tabId !== TAB_ID) {
                console.log(`👀 Detected another tab: ${sessionData.tabId}`);
                
                // Check if that other tab's heartbeat is fresh
                const lastHeartbeat = sessionData.lastHeartbeat?.toDate?.() || new Date(sessionData.lastActive || 0);
                const now = new Date();
                const timeSinceHeartbeat = now - lastHeartbeat;
                
                if (timeSinceHeartbeat < HEARTBEAT_TIMEOUT) {
                    // Another tab is actively running the quiz - this is the secondary tab
                    console.log(`⚠️ Another tab is actively running this quiz (heartbeat ${Math.round(timeSinceHeartbeat / 1000)}s ago)`);
                    // Don't close yet - let the heartbeat timeout handle it
                } else {
                    console.log(`✓ Other tab's heartbeat is stale (${Math.round(timeSinceHeartbeat / 1000)}s ago) - claiming session`);
                }
            }
            
            // 🔥 CRITICAL: Check if heartbeat is stale (quiz abandoned)
            const lastHeartbeat = sessionData.lastHeartbeat?.toDate?.() || new Date(sessionData.lastActive || 0);
            const now = new Date();
            const timeSinceHeartbeat = now - lastHeartbeat;
            
            if (timeSinceHeartbeat > HEARTBEAT_TIMEOUT) {
                console.log(`🚨 Heartbeat is stale (${Math.round(timeSinceHeartbeat / 1000)}s ago) - quiz was abandoned!`);
                handleQuizAbandonedInOtherTab();
            }
            
        } catch (error) {
            console.error('Error monitoring heartbeat:', error);
        }
    }, HEARTBEAT_CHECK_INTERVAL);
    
    console.log('✓ Heartbeat monitor started');
}

// 🔥 NEW: Handle when quiz is abandoned in another tab (detected via heartbeat)
function handleQuizAbandonedInOtherTab() {
    // Stop both heartbeat systems
    stopHeartbeat();
    
    // Mark quiz as inactive
    quizActive = false;
    
    // Show message and redirect
    showAutoCloseMessage('Quiz was abandoned in another tab. Closing this tab...', () => {
        window.location.href = '/HTML/Lesson/timemarkers.html';
    });
}

// Stop sending heartbeats
function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
        console.log('✓ Heartbeat system stopped');
    }
    
    if (heartbeatMonitorInterval) {
        clearInterval(heartbeatMonitorInterval);
        heartbeatMonitorInterval = null;
        console.log('✓ Heartbeat monitor stopped');
    }
}

// ============================================================================
// CROSS-TAB COMMUNICATION - Close other tabs when quiz is abandoned
// ============================================================================

let broadcastChannel = null;
const BROADCAST_TAB_ID = `quiz-tab-${Date.now()}-${Math.random()}`;

// Initialize cross-tab communication
function initCrossTabCommunication() {
    try {
        // Create a BroadcastChannel for this quiz
        broadcastChannel = new BroadcastChannel(QUIZ_ID);
        
        // Listen for messages from other tabs
        broadcastChannel.onmessage = (event) => {
            const { type, tabId, timestamp } = event.data;
            
            // Ignore messages from this tab
            if (tabId === BROADCAST_TAB_ID) return;
            
            console.log(`📡 Received message from another tab: ${type}`);
            
            if (type === 'QUIZ_ABANDONED') {
                // Another tab abandoned the quiz - close this tab too
                console.log('🚪 Another tab abandoned the quiz. Closing this tab...');
                handleOtherTabAbandoned();
            } else if (type === 'QUIZ_COMPLETED') {
                // Another tab completed the quiz - close this tab
                console.log('✅ Another tab completed the quiz. Closing this tab...');
                handleOtherTabCompleted();
            } else if (type === 'QUIZ_ACTIVE') {
                // Another tab is still active - send acknowledgment
                console.log('👋 Another tab is active');
            }
        };
        
        // Announce this tab is active
        broadcastChannel.postMessage({
            type: 'QUIZ_ACTIVE',
            tabId: BROADCAST_TAB_ID,
            timestamp: Date.now()
        });
        
        console.log('✓ Cross-tab communication initialized');
    } catch (error) {
        console.error('BroadcastChannel not supported:', error);
        // Fallback to localStorage events for older browsers
        initLocalStorageFallback();
    }
}

// Fallback using localStorage for browsers that don't support BroadcastChannel
function initLocalStorageFallback() {
    window.addEventListener('storage', (event) => {
        if (event.key === `${QUIZ_ID}_status`) {
            const data = JSON.parse(event.newValue || '{}');
            
            if (data.tabId === BROADCAST_TAB_ID) return;
            
            if (data.type === 'QUIZ_ABANDONED' || data.type === 'QUIZ_COMPLETED') {
                console.log(`📡 [Storage] Received ${data.type} from another tab`);
                if (data.type === 'QUIZ_ABANDONED') {
                    handleOtherTabAbandoned();
                } else {
                    handleOtherTabCompleted();
                }
            }
        }
    });
    
    console.log('✓ localStorage fallback initialized');
}

// Notify other tabs that quiz was abandoned
function notifyQuizAbandoned() {
    const message = {
        type: 'QUIZ_ABANDONED',
        tabId: BROADCAST_TAB_ID,
        timestamp: Date.now()
    };
    
    if (broadcastChannel) {
        broadcastChannel.postMessage(message);
    }
    
    // Also use localStorage as fallback
    try {
        localStorage.setItem(`${QUIZ_ID}_status`, JSON.stringify(message));
        setTimeout(() => {
            localStorage.removeItem(`${QUIZ_ID}_status`);
        }, 1000);
    } catch (e) {
        console.error('localStorage write failed:', e);
    }
    
    console.log('📢 Notified other tabs: Quiz abandoned');
}

// Notify other tabs that quiz was completed
function notifyQuizCompleted() {
    const message = {
        type: 'QUIZ_COMPLETED',
        tabId: BROADCAST_TAB_ID,
        timestamp: Date.now()
    };
    
    if (broadcastChannel) {
        broadcastChannel.postMessage(message);
    }
    
    try {
        localStorage.setItem(`${QUIZ_ID}_status`, JSON.stringify(message));
        setTimeout(() => {
            localStorage.removeItem(`${QUIZ_ID}_status`);
        }, 1000);
    } catch (e) {
        console.error('localStorage write failed:', e);
    }
    
    console.log('📢 Notified other tabs: Quiz completed');
}

// Handle when another tab abandoned the quiz
function handleOtherTabAbandoned() {
    // Stop heartbeat
    stopHeartbeat();
    
    // Close the broadcast channel
    if (broadcastChannel) {
        broadcastChannel.close();
    }
    
    // Show message and redirect
    showAutoCloseMessage('Another tab abandoned this quiz. Redirecting...', () => {
        window.location.href = '/HTML/Lesson/timemarkers.html';
    });
}

// Handle when another tab completed the quiz
function handleOtherTabCompleted() {
    // Stop heartbeat
    stopHeartbeat();
    
    // Close the broadcast channel
    if (broadcastChannel) {
        broadcastChannel.close();
    }
    
    // Show message and redirect
    showAutoCloseMessage('Quiz completed in another tab. Redirecting...', () => {
        window.location.href = '/HTML/Lesson/timemarkers.html';
    });
}

// Show auto-close message overlay
function showAutoCloseMessage(message, callback) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 99999;
        animation: fadeIn 0.3s ease;
    `;
    
    overlay.innerHTML = `
        <div style="
            background: white;
            padding: 40px;
            border-radius: 16px;
            text-align: center;
            max-width: 400px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        ">
            <div style="font-size: 3rem; margin-bottom: 20px;">🚪</div>
            <h2 style="color: #ef4444; margin-bottom: 15px; font-size: 1.5rem;">Tab Closed</h2>
            <p style="color: #666; margin-bottom: 20px; font-size: 1.1rem;">${message}</p>
            <div style="
                width: 100%;
                height: 4px;
                background: #e5e7eb;
                border-radius: 2px;
                overflow: hidden;
                margin-top: 20px;
            ">
                <div style="
                    width: 0%;
                    height: 100%;
                    background: linear-gradient(90deg, #6d42c7, #8b5cf6);
                    animation: progressBar 2s ease-in-out;
                "></div>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Redirect after 2 seconds
    setTimeout(() => {
        if (callback) callback();
    }, 2000);
}

// Cleanup when page is closed/unloaded
function cleanupCrossTabCommunication() {
    if (broadcastChannel) {
        broadcastChannel.close();
        broadcastChannel = null;
    }
}

// ============================================================================
// NETWORK STATUS MONITORING
// ============================================================================

// Monitor network status
window.addEventListener('online', () => {
    isOnline = true;
    console.log('✓ Network connection restored');
    showNetworkStatus('Connection restored', 'success');
    
    // Restart heartbeat if quiz is active
    if (quizActive && currentUser) {
        startHeartbeat(currentUser.uid);
    }
    
    // Retry pending saves
    retryPendingSaves();
});

window.addEventListener('offline', () => {
    isOnline = false;
    console.log('⚠ Network connection lost');
    showNetworkStatus('No internet connection - progress will be saved when connection is restored', 'warning');
});

// Show network status notification to user
function showNetworkStatus(message, type) {
    const statusDiv = document.createElement('div');
    statusDiv.className = `network-status ${type}`;
    statusDiv.textContent = message;
    statusDiv.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : '#ff9800'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 9999;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(statusDiv);
    
    setTimeout(() => {
        statusDiv.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => statusDiv.remove(), 300);
    }, 4000);
}

// Retry pending saves when connection is restored
async function retryPendingSaves() {
    if (pendingSaves.length === 0) return;
    
    console.log(`Retrying ${pendingSaves.length} pending saves...`);
    
    const saves = [...pendingSaves];
    pendingSaves = [];
    
    for (const saveFn of saves) {
        try {
            await saveFn();
        } catch (error) {
            console.error('Failed to retry save:', error);
        }
    }
}

// Save with retry logic
async function saveWithRetry(saveFn, maxRetries = 3, description = 'data') {
    if (!navigator.onLine) {
        console.log(`Cannot save ${description} - offline. Adding to pending queue.`);
        pendingSaves.push(saveFn);
        return false;
    }
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            await saveFn();
            console.log(`✓ ${description} saved successfully`);
            return true;
        } catch (error) {
            console.log(`Save attempt ${i + 1}/${maxRetries} failed for ${description}:`, error.message);
            
            if (i < maxRetries - 1) {
                // Exponential backoff: wait 1s, 2s, 4s
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
            } else {
                console.error(`All retry attempts failed for ${description}`);
                // Add to pending queue for later retry
                pendingSaves.push(saveFn);
                return false;
            }
        }
    }
    return false;
}

// ============================================================================
// QUIZ FUNCTIONS
// ============================================================================

// Shuffle array function
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// UPDATED: Generate quiz questions (dynamic length - max 10 or dataset size)
function generateQuestions() {
    // FEATURE 1: Dynamic quiz length - max 10 or dataset size
    const maxQuestions = Math.min(10, timemarkersData.length);
    const shuffled = shuffleArray([...timemarkersData]);
    questions = shuffled.slice(0, maxQuestions).map(item => ({
        correctAnswer: item.marker,
        video: item.video,
        options: generateOptions(item.marker)
    }));
}

// UPDATED: Generate 3 options (1 correct + 2 random wrong answers)
function generateOptions(correctAnswer) {
    const options = [correctAnswer];
    const availableOptions = timemarkersData.map(item => item.marker).filter(opt => opt !== correctAnswer);
    const shuffled = shuffleArray(availableOptions);
    
    // FEATURE 2: Changed to 3 total choices (1 correct + 2 wrong)
    for (let i = 0; i < 2 && i < shuffled.length; i++) {
        options.push(shuffled[i]);
    }
    
    // If we don't have enough options, repeat some
    while (options.length < 3 && shuffled.length > 0) {
        options.push(shuffled[0]);
    }
    
    return shuffleArray(options);
}

// Display current question
function displayQuestion() {
    if (currentQuestion >= questions.length) {
        showResults();
        return;
    }

    const question = questions[currentQuestion];
    const videoEl = document.getElementById('quizVideo');
    const videoSource = document.getElementById('videoSource');
    const optionsContainer = document.getElementById('quizOptions');
    const feedbackEl = document.getElementById('quizFeedback');
    const nextBtn = document.getElementById('nextBtn');
    const questionNumber = document.getElementById('questionNumber');
    const scoreEl = document.getElementById('score');

    // Reset state
    selectedAnswer = null;
    isAnswered = false;
    feedbackEl.textContent = '';
    feedbackEl.className = 'quiz-feedback';
    nextBtn.style.display = 'none';

    // Update question number and score
    questionNumber.textContent = `Question ${currentQuestion + 1} of ${questions.length}`;
    scoreEl.textContent = `Score: ${score}/${currentQuestion}`;

    // Set video
    videoSource.src = question.video;
    videoEl.load();
    videoEl.play().catch(error => {
        console.log('Video autoplay prevented:', error);
    });

    // Generate option buttons
    optionsContainer.innerHTML = '';
    question.options.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = option;
        btn.onclick = () => selectAnswer(option, question.correctAnswer, btn);
        optionsContainer.appendChild(btn);
    });

    // Allow video replay on click
    videoEl.onclick = () => {
        videoEl.currentTime = 0;
        videoEl.play();
    };
}

// Handle answer selection
function selectAnswer(selected, correct, buttonElement) {
    if (isAnswered) return;

    isAnswered = true;
    selectedAnswer = selected;

    const options = document.querySelectorAll('.option-btn');
    const feedbackEl = document.getElementById('quizFeedback');
    const nextBtn = document.getElementById('nextBtn');

    // Disable all buttons
    options.forEach(btn => {
        btn.disabled = true;
    });

    // Mark correct/incorrect
    options.forEach(btn => {
        if (btn.textContent === correct) {
            btn.classList.add('correct');
        } else if (btn.textContent === selected && selected !== correct) {
            btn.classList.add('incorrect');
        }
    });

    // Show feedback
    if (selected === correct) {
        score++;
        feedbackEl.textContent = 'Correct! ✓';
        feedbackEl.className = 'quiz-feedback correct';
    } else {
        feedbackEl.textContent = `Incorrect. The correct answer is ${correct}.`;
        feedbackEl.className = 'quiz-feedback incorrect';
    }

    // Show next button
    nextBtn.style.display = 'block';

    // Update score display
    const scoreEl = document.getElementById('score');
    scoreEl.textContent = `Score: ${score}/${currentQuestion + 1}`;
}

// Show results
async function showResults() {
    const quizCard = document.querySelector('.quiz-card');
    const resultsEl = document.getElementById('quizResults');
    const finalScoreEl = document.getElementById('finalScore');
    const percentage = Math.round((score / questions.length) * 100);

    quizCard.style.display = 'none';
    resultsEl.style.display = 'block';

    finalScoreEl.textContent = `You scored ${score} out of ${questions.length} (${percentage}%)`;

    // Mark quiz as completed
    quizActive = false;

    // Stop heartbeat system
    stopHeartbeat();

    // Notify other tabs that quiz is completed
    notifyQuizCompleted();

    // Clear active quiz session and save results
    if (currentUser) {
        await clearActiveQuizSession();
        await saveFinalQuizResults(score, questions.length, percentage);
    }

    // Re-enable navigation
    enableNavigation();
}

// Load previous quiz data to get attempt number
async function loadPreviousQuizData() {
    if (!currentUser || !navigator.onLine) return;

    try {
        const progressRef = doc(db, 'users', currentUser.uid, 'progress', 'time-markers-quiz');
        const progressSnap = await getDoc(progressRef);

        if (progressSnap.exists()) {
            const data = progressSnap.data();
            attemptNumber = (data.attempts || 0) + 1;
        }
    } catch (error) {
        console.error('Error loading previous quiz data:', error);
    }
}

// Save final quiz results to Firebase
async function saveFinalQuizResults(finalScore, total, percentage) {
    if (!currentUser) {
        console.log('User not authenticated, skipping save');
        return;
    }

    // Check network status
    if (!navigator.onLine) {
        showSaveError('No internet connection. Results will be saved when connection is restored.');
        
        // Add to pending saves
        const saveFn = async () => {
            await saveFinalQuizResultsToFirestore(finalScore, total, percentage);
        };
        pendingSaves.push(saveFn);
        return;
    }

    // Try to save with retry logic
    const success = await saveWithRetry(
        async () => await saveFinalQuizResultsToFirestore(finalScore, total, percentage),
        3,
        'quiz results'
    );

    if (success) {
        showSaveConfirmation();
    } else {
        showSaveError('Could not save progress. Will retry when connection improves.');
    }
}

// Actual Firestore save function
async function saveFinalQuizResultsToFirestore(finalScore, total, percentage) {
    // Calculate quiz duration
    const quizEndTime = new Date();
    const durationSeconds = quizStartTime ? Math.floor((quizEndTime - quizStartTime) / 1000) : 0;

    // Reference to the user's progress document
    const progressRef = doc(db, 'users', currentUser.uid, 'progress', 'time-markers-quiz');
    
    // Get existing data to preserve attempts count
    const progressSnap = await getDoc(progressRef);
    const existingData = progressSnap.exists() ? progressSnap.data() : {};
    const currentAttempts = existingData.attempts || 0;
    
    // Prepare data according to Firestore rules validation
    const progressData = {
        score: finalScore,
        totalQuestions: total,
        percentage: percentage,
        attempts: currentAttempts + 1,
        completedAt: serverTimestamp(),
        lastAttempt: {
            score: finalScore,
            total: total,
            percentage: percentage,
            completedAt: serverTimestamp(),
            duration: durationSeconds,
            tabSwitches: tabSwitchCount
        },
        // Keep best score
        bestScore: Math.max(finalScore, existingData.bestScore || 0),
        bestPercentage: Math.max(percentage, existingData.bestPercentage || 0)
    };

    // Save to Firestore
    await setDoc(progressRef, progressData, { merge: true });
}

// Show confirmation that data was saved
function showSaveConfirmation() {
    const resultsEl = document.getElementById('quizResults');
    
    // Remove any existing messages
    const existingMsg = resultsEl.querySelector('.save-confirmation, .save-error');
    if (existingMsg) existingMsg.remove();
    
    const confirmMsg = document.createElement('div');
    confirmMsg.className = 'save-confirmation';
    confirmMsg.textContent = '✓ Progress saved to your account';
    confirmMsg.style.cssText = 'color: #4CAF50; margin-top: 15px; font-weight: 500;';
    
    // Insert after final score
    const finalScoreEl = document.getElementById('finalScore');
    finalScoreEl.parentNode.insertBefore(confirmMsg, finalScoreEl.nextSibling);
}

// Show error message if save failed
function showSaveError(errorMsg) {
    const resultsEl = document.getElementById('quizResults');
    
    // Remove any existing messages
    const existingMsg = resultsEl.querySelector('.save-confirmation, .save-error');
    if (existingMsg) existingMsg.remove();
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'save-error';
    errorDiv.textContent = `⚠ ${errorMsg}`;
    errorDiv.style.cssText = 'color: #ff9800; margin-top: 15px; font-size: 14px;';
    
    const finalScoreEl = document.getElementById('finalScore');
    finalScoreEl.parentNode.insertBefore(errorDiv, finalScoreEl.nextSibling);
}

// ============================================================================
// QUIZ PROTECTION & ANTI-CHEATING FEATURES
// ============================================================================

// Save active quiz session to Firebase (with initial heartbeat)
async function saveActiveQuizSession() {
    if (!currentUser) return;

    // Check if online before attempting save
    if (!navigator.onLine) {
        console.log('Cannot save session - offline');
        return;
    }

    try {
        const sessionRef = doc(db, 'users', currentUser.uid, 'activeQuiz', QUIZ_ID);
        await setDoc(sessionRef, {
            active: true,
            startedAt: serverTimestamp(),
            lastHeartbeat: serverTimestamp(), // Initial heartbeat
            tabId: TAB_ID, // Store this tab's ID
            lastActive: Date.now(),
            currentQuestion: currentQuestion,
            score: score,
            questions: questions,
            tabSwitches: tabSwitchCount,
            quizStartTime: quizStartTime.toISOString()
        });
        console.log('Active quiz session saved with initial heartbeat');
        
        // Start the heartbeat system
        startHeartbeat(currentUser.uid);
    } catch (error) {
        console.error('Error saving active quiz session:', error);
        // Don't throw - allow quiz to continue even if save fails
    }
}

// Clear active quiz session from Firebase
async function clearActiveQuizSession() {
    if (!currentUser) return;

    // Stop heartbeat first
    stopHeartbeat();

    // Check if online before attempting delete
    if (!navigator.onLine) {
        console.log('Cannot clear session - offline');
        return;
    }

    try {
        const sessionRef = doc(db, 'users', currentUser.uid, 'activeQuiz', QUIZ_ID);
        await deleteDoc(sessionRef);
        console.log('Active quiz session cleared');
    } catch (error) {
        console.error('Error clearing active quiz session:', error);
    }
}

// UPDATED: Check if user has an active quiz session with heartbeat freshness check
async function checkActiveQuizSession() {
    if (!currentUser || !navigator.onLine) return null;

    try {
        const sessionRef = doc(db, 'users', currentUser.uid, 'activeQuiz', QUIZ_ID);
        const sessionSnap = await getDoc(sessionRef);

        if (sessionSnap.exists()) {
            const sessionData = sessionSnap.data();
            
            // Check if heartbeat is recent (within last 25 seconds)
            if (sessionData.lastHeartbeat) {
                const lastHeartbeatTime = sessionData.lastHeartbeat.toDate();
                const now = new Date();
                const secondsSinceLastHeartbeat = (now - lastHeartbeatTime) / 1000;
                
                // If heartbeat is older than 25 seconds, quiz is NOT actively open
                if (secondsSinceLastHeartbeat > (HEARTBEAT_TIMEOUT / 1000)) {
                    console.log(`⚠ Quiz session exists but heartbeat is stale (${Math.round(secondsSinceLastHeartbeat)}s ago)`);
                    console.log('Quiz is not actively open - clearing stale session');
                    
                    // Clear the stale session
                    await deleteDoc(sessionRef);
                    return null;
                }
                
                console.log(`✓ Quiz session is active (heartbeat ${Math.round(secondsSinceLastHeartbeat)}s ago)`);
            }
            
            return sessionData;
        }
        return null;
    } catch (error) {
        console.error('Error checking active quiz session:', error);
        return null;
    }
}

// FEATURE 3: Restore quiz state from saved session
function restoreQuizState(sessionData) {
    currentQuestion = sessionData.currentQuestion || 0;
    score = sessionData.score || 0;
    tabSwitchCount = sessionData.tabSwitches || 0;
    
    // Restore questions array with exact same options
    if (sessionData.questions && sessionData.questions.length > 0) {
        questions = sessionData.questions;
    }
    
    // Restore start time for accurate duration tracking
    if (sessionData.quizStartTime) {
        quizStartTime = new Date(sessionData.quizStartTime);
    }
    
    console.log(`Restored quiz state: Question ${currentQuestion + 1}, Score ${score}/${currentQuestion}`);
}

// NEW: Reset quiz with new randomized questions
async function resetQuizDueToTabSwitches() {
    console.log('🔄 Resetting quiz due to exceeding maximum tab switches');
    
    // Stop heartbeat
    stopHeartbeat();
    
    // Notify other tabs that quiz is abandoned
    notifyQuizAbandoned();
    
    // Clear active session
    if (currentUser && navigator.onLine) {
        await clearActiveQuizSession();
    }
    
    // Show reset notification
    showQuizResetNotification();
    
    // Wait 3 seconds to show notification, then reload page
    setTimeout(() => {
        location.reload();
    }, 3000);
}

// NEW: Show quiz reset notification
function showQuizResetNotification() {
    const notification = document.createElement('div');
    notification.className = 'quiz-reset-notification';
    notification.innerHTML = `
        <div class="reset-content">
            <div class="reset-icon">🔄</div>
            <h2>Quiz Reset!</h2>
            <p>You have exceeded the maximum number of tab switches (${MAX_TAB_SWITCHES}).</p>
            <p>The quiz will restart with new randomized questions...</p>
        </div>
    `;
    notification.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
}

// Show navigation warning modal
function showNavigationWarning() {
    const modal = document.getElementById('navigationWarningModal');
    if (modal) {
        modal.classList.add('show');
    }
}

// Hide navigation warning modal
function hideNavigationWarning() {
    const modal = document.getElementById('navigationWarningModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Store intended navigation URL
let intendedNavigationUrl = null;

// Handle navigation click when quiz is active
function handleNavigationClick(event) {
    if (quizActive) {
        event.preventDefault();
        // Store the URL the user wants to navigate to
        intendedNavigationUrl = event.currentTarget.href;
        showNavigationWarning();
        return false;
    }
}

// Block navigation during quiz
function blockNavigation() {
    quizActive = true;

    // Add click event listeners to navigation links (keep visual appearance normal)
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', handleNavigationClick);
    });

    // Prevent browser back button
    window.history.pushState(null, null, window.location.href);
    window.addEventListener('popstate', handleBackButton);

    // Warn before page unload
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Track tab visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    console.log('Quiz protection activated');
}

// Enable navigation after quiz completion
function enableNavigation() {
    quizActive = false;

    // Remove event listeners from navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.removeEventListener('click', handleNavigationClick);
    });

    // Remove event listeners
    window.removeEventListener('popstate', handleBackButton);
    window.removeEventListener('beforeunload', handleBeforeUnload);
    document.removeEventListener('visibilitychange', handleVisibilityChange);

    console.log('Quiz protection deactivated');
}

// Handle browser back button
function handleBackButton(event) {
    if (quizActive) {
        event.preventDefault();
        window.history.pushState(null, null, window.location.href);
        showNavigationWarning();
    }
}

// Handle before unload (closing tab/browser)
function handleBeforeUnload(event) {
    if (quizActive) {
        // Stop heartbeat when user tries to close
        stopHeartbeat();
        
        // Notify other tabs that quiz is abandoned
        notifyQuizAbandoned();
        
        // Try to clear the session (may not complete before page closes)
        if (currentUser && navigator.onLine) {
            const sessionRef = doc(db, 'users', currentUser.uid, 'activeQuiz', QUIZ_ID);
            deleteDoc(sessionRef).catch(err => console.log('Cleanup failed:', err));
        }
        
        event.preventDefault();
        event.returnValue = 'You have an active quiz. If you leave, your progress will be lost and you will need to restart.';
        return event.returnValue;
    }
}

// IMPROVED: Handle tab visibility changes - ONLY count when leaving tab and still on quiz page
async function handleVisibilityChange() {
    // Only process if quiz is active
    if (!quizActive) return;
    
    // Check if we're still on the quiz page URL
    const currentPath = window.location.pathname;
    const isOnQuizPage = currentPath.includes('timemarkersquiz.html');
    
    if (!isOnQuizPage) {
        console.log('Not on quiz page anymore - stopping visibility tracking');
        quizActive = false;
        stopHeartbeat();
        return;
    }
    
    // Only count tab switches when user LEAVES the tab (hidden = true)
    if (document.hidden) {
        tabSwitchCount++;
        console.log(`Tab switch detected (leaving tab). Count: ${tabSwitchCount}/${MAX_TAB_SWITCHES}`);
        
        // Check if exceeded maximum
        if (tabSwitchCount > MAX_TAB_SWITCHES) {
            console.log(`⚠️ Exceeded maximum tab switches! Resetting quiz...`);
            await resetQuizDueToTabSwitches();
            return;
        }
        
        // Show warning with remaining attempts
        showTabSwitchWarning();
        
        // Save updated session (only if online)
        if (currentUser && navigator.onLine) {
            saveActiveQuizSession();
        }
    }
}

// UPDATED: Show tab switch warning with remaining attempts
function showTabSwitchWarning() {
    const remainingAttempts = MAX_TAB_SWITCHES - tabSwitchCount;
    const isLastWarning = remainingAttempts === 0;
    
    const warningDiv = document.createElement('div');
    warningDiv.className = 'tab-switch-warning';
    warningDiv.innerHTML = `
        <div class="warning-content">
            <span class="warning-icon">${isLastWarning ? '🚨' : '⚠️'}</span>
            <div class="warning-text">
                <strong>${isLastWarning ? 'FINAL WARNING!' : `Tab Switch Detected! (${tabSwitchCount}/${MAX_TAB_SWITCHES})`}</strong>
                <p style="margin: 5px 0 0 0; font-size: 0.9em;">
                    ${isLastWarning 
                        ? 'One more tab switch will reset your quiz!' 
                        : `${remainingAttempts} warning${remainingAttempts !== 1 ? 's' : ''} remaining before quiz reset`}
                </p>
            </div>
        </div>
    `;
    warningDiv.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${isLastWarning ? '#ef4444' : '#ff9800'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 9999;
        animation: slideInRight 0.3s ease;
        min-width: 300px;
    `;

    document.body.appendChild(warningDiv);

    // Remove after 4 seconds (longer for final warning)
    setTimeout(() => {
        warningDiv.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => warningDiv.remove(), 300);
    }, isLastWarning ? 5000 : 4000);
}

// Confirm navigation away from quiz
function confirmNavigationAway() {
    hideNavigationWarning();
    
    // Stop heartbeat
    stopHeartbeat();
    
    // Notify other tabs that quiz is abandoned
    notifyQuizAbandoned();
    
    // Clear session
    if (currentUser && navigator.onLine) {
        clearActiveQuizSession();
    }

    // Reset quiz state
    quizActive = false;
    enableNavigation();

    // Navigate to the intended page if URL was stored, otherwise reload
    if (intendedNavigationUrl) {
        window.location.href = intendedNavigationUrl;
    } else {
        location.reload();
    }
}

// Cancel navigation (stay on quiz)
function cancelNavigationAway() {
    hideNavigationWarning();
}

// UPDATED: Initialize quiz with state restoration
async function initQuiz() {
    // Initialize cross-tab communication
    initCrossTabCommunication();
    
    let activeSession = null;
    
    // Check if user has active quiz session WITH RECENT HEARTBEAT
    if (currentUser && navigator.onLine) {
        activeSession = await checkActiveQuizSession(); // Returns null if heartbeat is stale
        if (activeSession && activeSession.active) {
            console.log('Active quiz session found with recent heartbeat! Restoring state...');
            restoreQuizState(activeSession);
        } else if (!activeSession) {
            console.log('No active session or heartbeat is stale - starting fresh quiz');
        }
    }

    // Only generate new questions if we don't have a saved session with recent heartbeat
    if (!activeSession || !activeSession.questions || activeSession.questions.length === 0) {
        generateQuestions();
        currentQuestion = 0;
        score = 0;
        tabSwitchCount = 0;
        quizStartTime = new Date();
    }
    
    // Load previous data if user is logged in
    if (currentUser) {
        await loadPreviousQuizData();
        if (navigator.onLine) {
            await saveActiveQuizSession(); // This will start heartbeat
        }
    }
    
    // Activate quiz protection
    blockNavigation();
    
    displayQuestion();

    // Next button handler
    document.getElementById('nextBtn').onclick = async () => {
        currentQuestion++;
        
        // Save progress (only if online)
        if (currentUser && navigator.onLine) {
            await saveActiveQuizSession();
        }
        
        displayQuestion();
    };

    // Restart button handler
    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) {
        restartBtn.onclick = () => {
            location.reload();
        };
    }

    // Set up modal button handlers
    setupModalHandlers();
}

// Setup modal button handlers
function setupModalHandlers() {
    const confirmBtn = document.getElementById('confirmNavigationBtn');
    const cancelBtn = document.getElementById('cancelNavigationBtn');

    if (confirmBtn) {
        confirmBtn.onclick = confirmNavigationAway;
    }

    if (cancelBtn) {
        cancelBtn.onclick = cancelNavigationAway;
    }
}

// Show auth status to user (hidden - only logs to console)
function updateAuthStatus() {
    if (currentUser) {
        console.log('✓ User authenticated:', currentUser.email || currentUser.uid);
        console.log('Progress will be saved');
    } else {
        console.log('⚠ User not authenticated');
        console.log('Progress will not be saved');
    }
    
    // Also log network status
    if (!navigator.onLine) {
        console.log('⚠ Currently offline - saves will be queued');
    }
}

// Auth state observer
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        console.log('User authenticated:', user.uid);
    } else {
        currentUser = null;
        console.log('User not authenticated');
    }
    
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        updateAuthStatus();
    }
});

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    // Wait a moment for auth state to be determined
    setTimeout(async () => {
        updateAuthStatus();
        await initQuiz();
    }, 500);
});

// Cleanup on page unload
window.addEventListener('unload', () => {
    stopHeartbeat();
    cleanupCrossTabCommunication();
});

// Also cleanup when page visibility changes to hidden (tab closed)
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && quizActive) {
        // Notify other tabs before this tab closes
        notifyQuizAbandoned();
    }
});

// UPDATED: Add CSS animations for warnings, reset notification, and auto-close
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
    
    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }
    
    @keyframes progressBar {
        from {
            width: 0%;
        }
        to {
            width: 100%;
        }
    }
    
    .warning-content {
        display: flex;
        align-items: flex-start;
        gap: 12px;
    }
    
    .warning-icon {
        font-size: 1.5rem;
        flex-shrink: 0;
    }
    
    .warning-text {
        flex: 1;
    }
    
    .warning-text strong {
        display: block;
        font-size: 1.1em;
        margin-bottom: 5px;
    }
    
    .reset-content {
        background: white;
        padding: 40px;
        border-radius: 16px;
        text-align: center;
        max-width: 500px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    }
    
    .reset-icon {
        font-size: 4rem;
        margin-bottom: 20px;
        animation: spin 2s linear infinite;
    }
    
    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }
    
    .reset-content h2 {
        color: #963c3cffff;
        margin-bottom: 15px;
        font-size: 2rem;
    }
    
    .reset-content p {
        color: #666;
        margin: 10px 0;
        font-size: 1.1rem;
    }
`;
document.head.appendChild(style); 