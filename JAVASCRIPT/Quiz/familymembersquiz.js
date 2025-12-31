// Import Firebase modules from your existing firebase.js
import { auth, db } from '../firebase.js';
import { doc, getDoc, setDoc, deleteDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// Filipino Alphabet A-Z
const alphabetData = [
    { letter: 'A', video: '/PICTURES/fsl_alphabet/A.mp4' },
    { letter: 'B', video: '/PICTURES/fsl_alphabet/B.mp4' },
    { letter: 'C', video: '/PICTURES/fsl_alphabet/C.mp4' },
    { letter: 'D', video: '/PICTURES/fsl_alphabet/D.mp4' },
    { letter: 'E', video: '/PICTURES/fsl_alphabet/E.mp4' },
    { letter: 'F', video: '/PICTURES/fsl_alphabet/F.mp4' },
    { letter: 'G', video: '/PICTURES/fsl_alphabet/G.mp4' },
    { letter: 'H', video: '/PICTURES/fsl_alphabet/H.mp4' },
    { letter: 'I', video: '/PICTURES/fsl_alphabet/I.mp4' },
    { letter: 'J', video: '/PICTURES/fsl_alphabet/J.mp4' },
    { letter: 'K', video: '/PICTURES/fsl_alphabet/K.mp4' },
    { letter: 'L', video: '/PICTURES/fsl_alphabet/L.mp4' },
    { letter: 'M', video: '/PICTURES/fsl_alphabet/M.mp4' },
    { letter: 'N', video: '/PICTURES/fsl_alphabet/N.mp4' },
    { letter: 'O', video: '/PICTURES/fsl_alphabet/O.mp4' },
    { letter: 'P', video: '/PICTURES/fsl_alphabet/P.mp4' },
    { letter: 'Q', video: '/PICTURES/fsl_alphabet/Q.mp4' },
    { letter: 'R', video: '/PICTURES/fsl_alphabet/R.mp4' },
    { letter: 'S', video: '/PICTURES/fsl_alphabet/S.mp4' },
    { letter: 'T', video: '/PICTURES/fsl_alphabet/T.mp4' },
    { letter: 'U', video: '/PICTURES/fsl_alphabet/U.mp4' },
    { letter: 'V', video: '/PICTURES/fsl_alphabet/V.mp4' },
    { letter: 'W', video: '/PICTURES/fsl_alphabet/W.mp4' },
    { letter: 'X', video: '/PICTURES/fsl_alphabet/X.mp4' },
    { letter: 'Y', video: '/PICTURES/fsl_alphabet/Y.mp4' },
    { letter: 'Z', video: '/PICTURES/fsl_alphabet/Z.mp4' }
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

// ============================================================================
// HEARTBEAT SYSTEM - Indicates quiz page is open
// ============================================================================

let heartbeatInterval = null;
const QUIZ_ID = 'family-members-quiz';

// Start sending heartbeats to indicate quiz page is open
function startHeartbeat(userId) {
    // Clear any existing interval
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
    }
    
    // Send heartbeat every 15 seconds
    heartbeatInterval = setInterval(async () => {
        if (!navigator.onLine) {
            console.log('Offline - skipping heartbeat');
            return;
        }
        
        try {
            const activeQuizRef = doc(db, 'users', userId, 'activeQuiz', QUIZ_ID);
            await updateDoc(activeQuizRef, {
                lastHeartbeat: serverTimestamp()
            });
            console.log('💓 Heartbeat sent');
        } catch (error) {
            console.error('Error sending heartbeat:', error);
        }
    }, 15000); // Every 15 seconds
    
    console.log('✓ Heartbeat system started');
}

// Stop sending heartbeats
function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
        console.log('✓ Heartbeat system stopped');
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

// Generate quiz questions (10 random letters)
function generateQuestions() {
    const shuffled = shuffleArray([...alphabetData]);
    questions = shuffled.slice(0, 10).map(item => ({
        correctAnswer: item.letter,
        video: item.video,
        options: generateOptions(item.letter)
    }));
}

// Generate 4 options (1 correct + 3 random wrong answers)
function generateOptions(correctLetter) {
    const options = [correctLetter];
    const availableLetters = alphabetData.map(item => item.letter).filter(letter => letter !== correctLetter);
    const shuffled = shuffleArray(availableLetters);
    
    for (let i = 0; i < 3 && i < shuffled.length; i++) {
        options.push(shuffled[i]);
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
        const progressRef = doc(db, 'users', currentUser.uid, 'progress', 'family-members-quiz');
        const progressSnap = await getDoc(progressRef);

        if (progressSnap.exists()) {
            const data = progressSnap.data();
            attemptNumber = (data.attempts || 0) + 1;
        }
    } catch (error) {
        console.error('Error loading previous quiz data:', error);
    }
}

// Save final quiz results to Firebase (matching Firestore rules structure)
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

    // Reference to the user's progress document for alphabet-quiz
    const progressRef = doc(db, 'users', currentUser.uid, 'progress', 'family-members-quiz');
    
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
            currentQuestion: currentQuestion,
            score: score,
            questions: questions,
            tabSwitches: tabSwitchCount
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

// Check if user has an active quiz session
async function checkActiveQuizSession() {
    if (!currentUser || !navigator.onLine) return null;

    try {
        const sessionRef = doc(db, 'users', currentUser.uid, 'activeQuiz', QUIZ_ID);
        const sessionSnap = await getDoc(sessionRef);

        if (sessionSnap.exists()) {
            return sessionSnap.data();
        }
        return null;
    } catch (error) {
        console.error('Error checking active quiz session:', error);
        return null;
    }
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
        
        // Try to clear the session (may not complete before page closes)
        if (currentUser && navigator.onLine) {
            // Use sendBeacon for more reliable cleanup on page unload
            const sessionRef = doc(db, 'users', currentUser.uid, 'activeQuiz', QUIZ_ID);
            // Delete the session
            deleteDoc(sessionRef).catch(err => console.log('Cleanup failed:', err));
        }
        
        event.preventDefault();
        event.returnValue = 'You have an active quiz. If you leave, your progress will be lost and you will need to restart.';
        return event.returnValue;
    }
}

// Handle tab visibility changes
function handleVisibilityChange() {
    if (quizActive && document.hidden) {
        tabSwitchCount++;
        console.log(`Tab switch detected. Count: ${tabSwitchCount}`);
        
        // Show warning
        showTabSwitchWarning();
        
        // Save updated session (only if online) - heartbeat runs automatically
        if (currentUser && navigator.onLine) {
            saveActiveQuizSession();
        }
    }
}

// Show tab switch warning
function showTabSwitchWarning() {
    const warningDiv = document.createElement('div');
    warningDiv.className = 'tab-switch-warning';
    warningDiv.innerHTML = `
        <div class="warning-content">
            <span class="warning-icon">⚠️</span>
            <span class="warning-text">Tab switch detected! This activity is being monitored.</span>
        </div>
    `;
    warningDiv.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: #ff9800;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 9999;
        animation: slideInRight 0.3s ease;
    `;

    document.body.appendChild(warningDiv);

    // Remove after 3 seconds
    setTimeout(() => {
        warningDiv.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => warningDiv.remove(), 300);
    }, 3000);
}

// Confirm navigation away from quiz
function confirmNavigationAway() {
    hideNavigationWarning();
    
    // Stop heartbeat
    stopHeartbeat();
    
    // Clear session and restart quiz
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

// Initialize quiz
async function initQuiz() {
    // Check if user has active quiz session
    if (currentUser && navigator.onLine) {
        const activeSession = await checkActiveQuizSession();
        if (activeSession && activeSession.active) {
            console.log('Resuming active quiz session');
            // Could optionally restore quiz state here
            // For now, we'll just start fresh but keep the session active
        }
    }

    generateQuestions();
    currentQuestion = 0;
    score = 0;
    tabSwitchCount = 0;
    quizStartTime = new Date();
    
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
        
        // Save progress (only if online) - heartbeat runs automatically
        if (currentUser && navigator.onLine) {
            await saveActiveQuizSession();
        }
        
        displayQuestion();
    };

    // Restart button handler (in results)
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
        
        // Check if user should be redirected to active quiz (only if online)
        if (navigator.onLine) {
            const activeSession = await checkActiveQuizSession();
            const currentPath = window.location.pathname;
            const isOnQuizPage = currentPath.includes('familymembersquiz.html');
            
            if (activeSession && activeSession.active && !isOnQuizPage) {
                console.log('Active quiz detected! Redirecting to quiz page...');
                // Get the base path and construct the quiz URL
                const basePath = window.location.origin;
                window.location.href = basePath + '/HTML/Quiz/familymembersquiz.html';
            }
        }
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
});

// Add CSS animations for warnings
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
    
    .warning-content {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .warning-icon {
        font-size: 1.5rem;
    }
    
    .warning-text {
        font-weight: 600;
    }
`;
document.head.appendChild(style);