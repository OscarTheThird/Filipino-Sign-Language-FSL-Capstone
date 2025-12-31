// Import Firebase modules from your existing firebase.js
import { auth, db } from '../firebase.js';
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
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

    // Save final quiz results if user is logged in
    if (currentUser) {
        await saveFinalQuizResults(score, questions.length, percentage);
    }
}

// Load previous quiz data to get attempt number
async function loadPreviousQuizData() {
    if (!currentUser) return;

    try {
        const progressRef = doc(db, 'users', currentUser.uid, 'progress', 'alphabet-quiz');
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

    try {
        // Calculate quiz duration
        const quizEndTime = new Date();
        const durationSeconds = quizStartTime ? Math.floor((quizEndTime - quizStartTime) / 1000) : 0;

        // Reference to the user's progress document for alphabet-quiz
        const progressRef = doc(db, 'users', currentUser.uid, 'progress', 'alphabet-quiz');
        
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
                duration: durationSeconds
            },
            // Keep best score
            bestScore: Math.max(finalScore, existingData.bestScore || 0),
            bestPercentage: Math.max(percentage, existingData.bestPercentage || 0)
        };

        // Save to Firestore
        await setDoc(progressRef, progressData, { merge: true });
        
        console.log('Quiz results saved successfully!');
        
        // Show success message to user
        showSaveConfirmation();
        
    } catch (error) {
        console.error('Error saving final quiz results:', error);
        
        // Show error message to user
        showSaveError(error.message);
    }
}

// Show confirmation that data was saved
function showSaveConfirmation() {
    const resultsEl = document.getElementById('quizResults');
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
    const errorDiv = document.createElement('div');
    errorDiv.className = 'save-error';
    errorDiv.textContent = '⚠ Could not save progress. Please check your connection.';
    errorDiv.style.cssText = 'color: #f44336; margin-top: 15px; font-size: 14px;';
    
    const finalScoreEl = document.getElementById('finalScore');
    finalScoreEl.parentNode.insertBefore(errorDiv, finalScoreEl.nextSibling);
    
    console.error('Save error details:', errorMsg);
}

// Initialize quiz
async function initQuiz() {
    generateQuestions();
    currentQuestion = 0;
    score = 0;
    quizStartTime = new Date();
    
    // Load previous data if user is logged in
    if (currentUser) {
        await loadPreviousQuizData();
    }
    
    displayQuestion();

    // Next button handler
    document.getElementById('nextBtn').onclick = () => {
        currentQuestion++;
        displayQuestion();
    };

    // Restart button handler
    document.getElementById('restartBtn').onclick = () => {
        location.reload();
    };
}

// Show auth status to user (hidden - only logs to console)
function updateAuthStatus() {
    // Auth status is now silent - only logged to console for debugging
    if (currentUser) {
        console.log('✓ User authenticated:', currentUser.email || currentUser.uid);
        console.log('Progress will be saved');
    } else {
        console.log('⚠ User not authenticated');
        console.log('Progress will not be saved');
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
    
    // Update UI to show auth status
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