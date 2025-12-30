// Import Firebase modules
import { auth, db } from './firebase.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// Filipino Sign Language Common Phrases Data
const phrasesData = [
    { phrase: 'AKO SI', video: '/PICTURES/fsl_common_phrases/AKO SI.mp4' },
    { phrase: 'OO', video: '/PICTURES/fsl_common_phrases/OO.mp4' },
    { phrase: 'HINDI', video: '/PICTURES/fsl_common_phrases/HINDI.mp4' },
    { phrase: 'AKO AY MABUTI', video: '/PICTURES/fsl_common_phrases/AKO AY MABUTI.mp4' }
];

let currentQuestion = 0;
let score = 0;
let questions = [];
let currentUser = null;
let selectedAnswer = null;
let isAnswered = false;

// Shuffle array function
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Generate quiz questions (all 4 phrases)
function generateQuestions() {
    const shuffled = shuffleArray([...phrasesData]);
    questions = shuffled.map(item => ({
        correctAnswer: item.phrase,
        video: item.video,
        options: generateOptions(item.phrase)
    }));
}

// Generate 4 options (1 correct + 3 random wrong answers)
function generateOptions(correctPhrase) {
    const options = [correctPhrase];
    const availablePhrases = phrasesData.map(item => item.phrase).filter(phrase => phrase !== correctPhrase);
    const shuffled = shuffleArray(availablePhrases);
    
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

    // Save progress if user is logged in
    if (currentUser) {
        saveQuizProgress();
    }
}

// Show results
function showResults() {
    const quizCard = document.querySelector('.quiz-card');
    const resultsEl = document.getElementById('quizResults');
    const finalScoreEl = document.getElementById('finalScore');
    const percentage = Math.round((score / questions.length) * 100);

    quizCard.style.display = 'none';
    resultsEl.style.display = 'block';

    finalScoreEl.textContent = `You scored ${score} out of ${questions.length} (${percentage}%)`;

    // Save final quiz results if user is logged in
    if (currentUser) {
        saveFinalQuizResults(score, questions.length, percentage);
    }
}

// Save quiz progress to Firebase
async function saveQuizProgress() {
    if (!currentUser) return;

    try {
        const quizRef = doc(db, 'users', currentUser.uid, 'quizzes', 'phrases');
        const quizSnap = await getDoc(quizRef);

        const progressData = {
            currentQuestion: currentQuestion + 1,
            currentScore: score,
            totalQuestions: questions.length,
            lastUpdated: new Date()
        };

        if (quizSnap.exists()) {
            await setDoc(quizRef, progressData, { merge: true });
        } else {
            await setDoc(quizRef, progressData);
        }
    } catch (error) {
        console.error('Error saving quiz progress:', error);
    }
}

// Save final quiz results to Firebase
async function saveFinalQuizResults(score, total, percentage) {
    if (!currentUser) return;

    try {
        const quizRef = doc(db, 'users', currentUser.uid, 'quizzes', 'phrases');
        await setDoc(quizRef, {
            score: score,
            total: total,
            percentage: percentage,
            completed: true,
            completedAt: new Date(),
            lastUpdated: new Date()
        }, { merge: true });
    } catch (error) {
        console.error('Error saving final quiz results:', error);
    }
}

// Initialize quiz
function initQuiz() {
    generateQuestions();
    currentQuestion = 0;
    score = 0;
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
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
    } else {
        currentUser = null;
    }
});

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initQuiz();
});

