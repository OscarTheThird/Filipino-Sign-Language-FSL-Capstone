// Import Firebase modules from your existing firebase.js
import { auth, db } from '../firebase.js';
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// Filipino Sign Language School/Educational Context Data
const educationalData = [
    { term: "Teacher", video: "/PICTURES/fsl_school_education/GURO.mp4" },
    { term: "Student", video: "/PICTURES/fsl_school_education/ESTUDYANTE.mp4" },
    { term: "Study", video: "/PICTURES/fsl_school_education/ARAL.mp4" }
];

let currentQuestion = 0;
let score = 0;
let questions = [];
let currentUser = null;
let selectedAnswer = null;
let isAnswered = false;
let quizStartTime = null;

// Shuffle array function
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Generate quiz questions (all 3 terms)
function generateQuestions() {
    const shuffled = shuffleArray([...educationalData]);
    questions = shuffled.map(item => ({
        correctAnswer: item.term,
        video: item.video,
        options: generateOptions(item.term)
    }));
}

// Generate 4 options (1 correct + 3 random wrong answers)
function generateOptions(correctTerm) {
    const options = [correctTerm];
    const availableTerms = educationalData.map(item => item.term).filter(term => term !== correctTerm);
    const shuffled = shuffleArray(availableTerms);
    
    // Since we only have 3 items, we'll use all of them plus repeat one if needed
    for (let i = 0; i < 3 && i < shuffled.length; i++) {
        options.push(shuffled[i]);
    }
    
    // If we don't have enough options, repeat one
    while (options.length < 4 && shuffled.length > 0) {
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

    // Save final quiz results if user is logged in
    if (currentUser) {
        await saveFinalQuizResults(score, questions.length, percentage);
    }
}

// Save final quiz results to Firebase
async function saveFinalQuizResults(finalScore, total, percentage) {
    if (!currentUser) {
        console.log('User not authenticated, skipping save');
        return;
    }

    try {
        const quizEndTime = new Date();
        const durationSeconds = quizStartTime ? Math.floor((quizEndTime - quizStartTime) / 1000) : 0;

        const progressRef = doc(db, 'users', currentUser.uid, 'progress', 'educational-context-quiz');
        
        const progressSnap = await getDoc(progressRef);
        const existingData = progressSnap.exists() ? progressSnap.data() : {};
        const currentAttempts = existingData.attempts || 0;
        
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
            bestScore: Math.max(finalScore, existingData.bestScore || 0),
            bestPercentage: Math.max(percentage, existingData.bestPercentage || 0)
        };

        await setDoc(progressRef, progressData, { merge: true });
        console.log('Quiz results saved successfully!');
        showSaveConfirmation();
        
    } catch (error) {
        console.error('Error saving final quiz results:', error);
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

// Auth state observer
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        console.log('User authenticated:', user.uid);
    } else {
        currentUser = null;
        console.log('User not authenticated');
    }
});

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    setTimeout(async () => {
        await initQuiz();
    }, 500);
});